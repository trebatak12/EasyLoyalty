import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "crypto";
import { generateKeyPair, exportJWK, importJWK } from "jose";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { keys, keyAudit, type Key, type InsertKey, type InsertKeyAudit } from "@shared/schema";
import { config } from "./config";

// Error codes
export class KeystoreError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "KeystoreError";
  }
}

export type KeyPurpose = "access_jwt" | "refresh_jwt" | "qr_jwt" | "webhook_hmac";
export type KeyStatus = "active" | "retiring" | "retired" | "revoked";

export interface DecryptedKey {
  id: string;
  kid: string;
  purpose: KeyPurpose;
  alg: string;
  status: KeyStatus;
  publicMaterial?: string;
  privateMaterial: string; // Dešifrovaný privátní JWK nebo HMAC secret
  createdAt: Date;
  notAfter?: Date;
  notes?: string;
}

export interface JWKSet {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    alg: string;
    x: string;
    y: string;
  }>;
}

export class KeyManager {
  private static instance: KeyManager;
  private encryptionKey: Buffer;

  private constructor() {
    // Odvození šifrovacího klíče z ENCRYPTION_MASTER_KEY
    const masterKey = config.getEncryptionKey();
    this.encryptionKey = pbkdf2Sync(masterKey, "keystore-salt", 100000, 32, "sha256");
  }

  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * Envelope šifrování privátního materiálu
   */
  private encryptPrivateMaterial(material: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    
    let encrypted = cipher.update(material, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    // Formát: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  /**
   * Envelope dešifrování privátního materiálu
   */
  private decryptPrivateMaterial(encryptedMaterial: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedMaterial.split(":");
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error("Invalid encrypted material format");
      }

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      
      const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    } catch (error) {
      throw new KeystoreError("DECRYPTION_FAILED", `Failed to decrypt private material: ${error}`);
    }
  }

  /**
   * Generování nového ES256 klíče
   */
  private async generateES256KeyPair(): Promise<{ publicJWK: string; privateJWK: string }> {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    
    const publicJWK = await exportJWK(publicKey);
    const privateJWK = await exportJWK(privateKey);
    
    return {
      publicJWK: JSON.stringify(publicJWK),
      privateJWK: JSON.stringify(privateJWK)
    };
  }

  /**
   * Generování nového HMAC secretu
   */
  private generateHMACSecret(): string {
    return randomBytes(32).toString("base64");
  }

  /**
   * Generování unique kid
   */
  private generateKid(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * Získání aktivního klíče pro daný účel
   */
  async getActiveKey(purpose: KeyPurpose): Promise<DecryptedKey> {
    const [key] = await db
      .select()
      .from(keys)
      .where(and(
        eq(keys.purpose, purpose),
        eq(keys.status, "active")
      ))
      .limit(1);

    if (!key) {
      throw new KeystoreError("KEY_NOT_ACTIVE", `No active key found for purpose: ${purpose}`);
    }

    return this.decryptKey(key);
  }

  /**
   * Získání klíče podle kid (pro verifikaci)
   */
  async getKeyByKid(kid: string): Promise<DecryptedKey> {
    const [key] = await db
      .select()
      .from(keys)
      .where(eq(keys.kid, kid))
      .limit(1);

    if (!key) {
      throw new KeystoreError("KEY_NOT_FOUND", `Key not found: ${kid}`);
    }

    return this.decryptKey(key);
  }

  /**
   * Dešifrování klíče z databáze
   */
  private decryptKey(key: Key): DecryptedKey {
    const privateMaterial = this.decryptPrivateMaterial(key.privateMaterialEncrypted);
    
    return {
      id: key.id,
      kid: key.kid,
      purpose: key.purpose as KeyPurpose,
      alg: key.alg,
      status: key.status as KeyStatus,
      publicMaterial: key.publicMaterial || undefined,
      privateMaterial,
      createdAt: key.createdAt,
      notAfter: key.notAfter || undefined,
      notes: key.notes || undefined
    };
  }

  /**
   * Seznam public JWKs pro JWKS endpoint
   */
  async listJWKS(): Promise<JWKSet> {
    const activeKeys = await db
      .select()
      .from(keys)
      .where(and(
        eq(keys.alg, "ES256"),
        // active OR retiring
        sql`${keys.status} IN ('active', 'retiring')`
      ));

    const jwks = activeKeys
      .filter(key => key.publicMaterial)
      .map(key => {
        const publicJWK = JSON.parse(key.publicMaterial!);
        return {
          ...publicJWK,
          kid: key.kid,
          alg: key.alg,
          use: "sig"
        };
      });

    return { keys: jwks };
  }

  /**
   * Bootstrap - vytvoření výchozích klíčů při startu
   */
  async bootstrapIfEmpty(): Promise<void> {
    const existingKeys = await db.select().from(keys).limit(1);
    
    if (existingKeys.length > 0) {
      console.log("Keys already exist, skipping bootstrap");
      return;
    }

    console.log("Bootstrapping keystore with default keys...");

    const purposes: Array<{ purpose: KeyPurpose; alg: string }> = [
      { purpose: "access_jwt", alg: "ES256" },
      { purpose: "refresh_jwt", alg: "ES256" },
      { purpose: "qr_jwt", alg: "ES256" }
    ];

    for (const { purpose, alg } of purposes) {
      if (alg === "ES256") {
        const { publicJWK, privateJWK } = await this.generateES256KeyPair();
        
        await db.insert(keys).values({
          kid: this.generateKid(),
          purpose,
          alg,
          status: "active",
          publicMaterial: publicJWK,
          privateMaterialEncrypted: this.encryptPrivateMaterial(privateJWK),
          notes: `Bootstrap key for ${purpose}`
        });
      }
    }

    console.log("✅ Keystore bootstrap completed");
  }

  /**
   * Kontrola invarianty - max jeden active klíč per purpose
   */
  async validateInvariant(): Promise<void> {
    const violations = await db
      .select({
        purpose: keys.purpose,
        count: sql<number>`count(*)`
      })
      .from(keys)
      .where(eq(keys.status, "active"))
      .groupBy(keys.purpose)
      .having(sql`count(*) > 1`);

    if (violations.length > 0) {
      const violatedPurposes = violations.map(v => v.purpose).join(", ");
      throw new KeystoreError(
        "INVARIANT_VIOLATION", 
        `Multiple active keys found for purposes: ${violatedPurposes}`
      );
    }
  }

  /**
   * Vytvoření nového klíče
   */
  async createKey(purpose: KeyPurpose, alg: string = "ES256", notes?: string): Promise<string> {
    // Zkontroluj invariantu před vytvořením
    if (alg === "ES256") {
      const { publicJWK, privateJWK } = await this.generateES256KeyPair();
      
      const kid = this.generateKid();
      
      await db.insert(keys).values({
        kid,
        purpose,
        alg,
        status: "active",
        publicMaterial: publicJWK,
        privateMaterialEncrypted: this.encryptPrivateMaterial(privateJWK),
        notes
      });

      return kid;
    } else if (alg === "HMAC") {
      const secret = this.generateHMACSecret();
      const kid = this.generateKid();
      
      await db.insert(keys).values({
        kid,
        purpose,
        alg,
        status: "active",
        publicMaterial: null,
        privateMaterialEncrypted: this.encryptPrivateMaterial(secret),
        notes
      });

      return kid;
    } else {
      throw new KeystoreError("UNSUPPORTED_ALG", `Unsupported algorithm: ${alg}`);
    }
  }

  /**
   * Zápis audit záznamu
   */
  async auditEvent(
    kid: string, 
    purpose: KeyPurpose, 
    event: "sign_ok" | "sign_fail" | "verify_ok" | "verify_fail" | "jwks_served",
    context: Record<string, any> = {}
  ): Promise<void> {
    if (!config.isFeatureEnabled("ENABLE_AUDIT")) {
      return;
    }

    try {
      await db.insert(keyAudit).values({
        kid,
        purpose,
        event,
        context
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      // Nespadni kvůli audit chybě
    }
  }
}

export const keyManager = KeyManager.getInstance();