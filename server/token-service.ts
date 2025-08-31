import { SignJWT, jwtVerify, importJWK, type JWTPayload } from "jose";
import { keyManager, KeystoreError, type KeyPurpose } from "./key-manager";
import { config } from "./config";
import { metrics } from "./metrics";
import jwt from "jsonwebtoken";

export interface SignOptions {
  purpose: KeyPurpose;
  ttl: string | number; // "2h" nebo počet sekund
}

export interface VerifyOptions {
  acceptFallbackEnvKey?: boolean;
}

export interface TokenPayload extends JWTPayload {
  sub: string;
  type: string;
  kid?: string;
  [key: string]: any;
}


export class TokenService {
  private static instance: TokenService;

  private constructor() {}

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Podepsání JWT tokenu s ES256 a kid
   */
  async sign(payload: Record<string, any>, options: SignOptions): Promise<string> {
    try {
      // Získej aktivní klíč pro daný účel
      const activeKey = await keyManager.getActiveKey(options.purpose);
      
      if (activeKey.alg !== "ES256") {
        throw new KeystoreError("UNSUPPORTED_ALG", `Key algorithm ${activeKey.alg} not supported for signing`);
      }

      // Import privátního klíče
      const privateJWK = JSON.parse(activeKey.privateMaterial);
      const privateKey = await importJWK(privateJWK, "ES256");

      // Vytvoř JWT s kid v headeru
      const jwt = new SignJWT(payload)
        .setProtectedHeader({ 
          alg: "ES256", 
          kid: activeKey.kid 
        })
        .setIssuedAt()
        .setIssuer("easyloyalty-api")
        .setAudience("easyloyalty-client");

      // Nastav expiraci
      if (typeof options.ttl === "string") {
        jwt.setExpirationTime(options.ttl);
      } else {
        jwt.setExpirationTime(Date.now() + options.ttl * 1000);
      }

      const token = await jwt.sign(privateKey);

      // Audit záznam
      await keyManager.auditEvent(activeKey.kid, options.purpose, "sign_ok", {
        alg: activeKey.alg,
        ttl: options.ttl
      });

      // Metriky
      metrics.recordSignSuccess(options.purpose, activeKey.kid);

      return token;
    } catch (error) {
      // Audit selhání
      try {
        const activeKey = await keyManager.getActiveKey(options.purpose);
        await keyManager.auditEvent(activeKey.kid, options.purpose, "sign_fail", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      } catch {
        // Ignoruj audit chyby
      }

      metrics.recordSignFailure((error as any).code || "UNKNOWN");
      throw error;
    }
  }

  /**
   * Ověření JWT tokenu s podporou více kid + fallback
   */
  async verify(token: string, options: VerifyOptions = {}): Promise<TokenPayload> {
    // Nejprve zkus parsovat header pro kid
    const [headerB64] = token.split(".");
    if (!headerB64) {
      throw new KeystoreError("INVALID_TOKEN", "Invalid token format");
    }

    let header: any;
    try {
      header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    } catch {
      throw new KeystoreError("INVALID_TOKEN", "Invalid token header");
    }

    try {
      // Zkontroluj algoritmus
      if (header.alg !== "ES256") {
        throw new KeystoreError("UNSUPPORTED_ALG", `Unsupported algorithm: ${header.alg}`);
      }

      let verificationKey;
      const kid = header.kid;

      if (kid) {
        // Token má kid - zkus najít klíč v keystore
        try {
          const key = await keyManager.getKeyByKid(kid);
          if (key.alg !== "ES256") {
            throw new KeystoreError("UNSUPPORTED_ALG", `Key algorithm ${key.alg} not supported`);
          }

          const publicJWK = JSON.parse(key.publicMaterial!);
          verificationKey = await importJWK(publicJWK, "ES256");
        } catch (error) {
          if (error instanceof KeystoreError && error.code === "KEY_NOT_FOUND") {
            // Kid neexistuje - zkus fallback pokud je povolen
            if (options.acceptFallbackEnvKey && config.getLegacyJwtKey()) {
              return this.verifyWithLegacyKey(token, "access");
            }
          }
          throw error;
        }
      } else {
        // Token nemá kid - zkus fallback pokud je povolen
        if (options.acceptFallbackEnvKey && config.getLegacyJwtKey()) {
          return this.verifyWithLegacyKey(token, "access");
        } else {
          throw new KeystoreError("INVALID_KID", "Token missing kid and fallback not allowed");
        }
      }

      // Ověř token pomocí jose
      const { payload } = await jwtVerify(token, verificationKey!, {
        issuer: "easyloyalty-api",
        audience: "easyloyalty-client"
      });

      // Audit úspěšné verifikace
      if (header.kid) {
        const key = await keyManager.getKeyByKid(header.kid);
        await keyManager.auditEvent(header.kid, key.purpose as KeyPurpose, "verify_ok");
        metrics.recordVerifySuccess(header.kid);
      }

      return payload as TokenPayload;
    } catch (error) {
      // Audit selhání
      if (header.kid) {
        try {
          const key = await keyManager.getKeyByKid(header.kid);
          await keyManager.auditEvent(header.kid, key.purpose as KeyPurpose, "verify_fail", {
            error: error instanceof Error ? error.message : "Unknown error"
          });
        } catch {
          // Ignoruj audit chyby
        }
      }

      metrics.recordVerifyFailure((error as any).code || "UNKNOWN");
      throw error;
    }
  }

  /**
   * Fallback verifikace pomocí legacy klíče z ENV
   */
  private verifyWithLegacyKey(token: string, type: string): TokenPayload {
    const legacyKey = config.getLegacyJwtKey();
    if (!legacyKey) {
      throw new KeystoreError("KEY_NOT_FOUND", "Legacy key not available");
    }

    try {
      const secret = type === "refresh" ? config.getConfig().jwtRefreshSecret : config.getConfig().jwtAccessSecret;
      if (!secret) {
        throw new KeystoreError("KEY_NOT_FOUND", "Legacy secret not available");
      }

      const payload = jwt.verify(token, secret, {
        issuer: "easyloyalty-api",
        audience: "easyloyalty-client"
      }) as TokenPayload;

      return payload;
    } catch (error) {
      throw new KeystoreError("TOKEN_EXPIRED", `Legacy token verification failed: ${error}`);
    }
  }

}

export const tokenService = TokenService.getInstance();