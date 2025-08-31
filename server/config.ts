import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  ENCRYPTION_MASTER_KEY: z.string().min(32, "Encryption master key must be at least 32 characters"),
  LEGACY_JWT_PRIVATE_KEY_PEM: z.string().optional(),
  FEATURE_FLAGS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional()
});

// Feature flags schema
const featureFlagsSchema = z.object({
  SAFE_MODE: z.boolean().default(false),
  ENABLE_KEY_ROTATION: z.boolean().default(false),
  ENABLE_METRICS: z.boolean().default(true),
  ENABLE_AUDIT: z.boolean().default(true)
});

export interface Config {
  environment: "development" | "staging" | "production";
  encryptionMasterKey: string;
  legacyJwtPrivateKeyPem?: string;
  featureFlags: {
    SAFE_MODE: boolean;
    ENABLE_KEY_ROTATION: boolean;
    ENABLE_METRICS: boolean;
    ENABLE_AUDIT: boolean;
  };
  jwtAccessSecret?: string;
  jwtRefreshSecret?: string;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    this.config = this.validateAndParseConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private validateAndParseConfig(): Config {
    const env = process.env;
    
    // Validate environment variables
    let validatedEnv;
    try {
      validatedEnv = envSchema.parse(env);
    } catch (error) {
      // In development, allow missing ENCRYPTION_MASTER_KEY for testing
      if (env.NODE_ENV === "development" && !env.ENCRYPTION_MASTER_KEY) {
        console.warn("⚠️  ENCRYPTION_MASTER_KEY missing in development - using default (NOT SECURE)");
        validatedEnv = envSchema.parse({
          ...env,
          ENCRYPTION_MASTER_KEY: "dev-key-not-secure-32-chars-minimum!"
        });
      } else {
        throw new Error(`Configuration validation failed: ${error}`);
      }
    }

    // Production safety check
    if (validatedEnv.NODE_ENV === "production" && !validatedEnv.ENCRYPTION_MASTER_KEY) {
      throw new Error("ENCRYPTION_MASTER_KEY is required in production");
    }

    // Parse feature flags
    let featureFlags;
    try {
      if (validatedEnv.FEATURE_FLAGS) {
        const parsed = JSON.parse(validatedEnv.FEATURE_FLAGS);
        featureFlags = featureFlagsSchema.parse(parsed);
      } else {
        featureFlags = featureFlagsSchema.parse({});
      }
    } catch (error) {
      console.warn("Invalid FEATURE_FLAGS JSON, using defaults:", error);
      featureFlags = featureFlagsSchema.parse({});
    }

    return {
      environment: validatedEnv.NODE_ENV,
      encryptionMasterKey: validatedEnv.ENCRYPTION_MASTER_KEY,
      legacyJwtPrivateKeyPem: validatedEnv.LEGACY_JWT_PRIVATE_KEY_PEM,
      featureFlags,
      jwtAccessSecret: validatedEnv.JWT_ACCESS_SECRET,
      jwtRefreshSecret: validatedEnv.JWT_REFRESH_SECRET
    };
  }

  public getConfig(): Config {
    return this.config;
  }

  public getEncryptionKey(): string {
    return this.config.encryptionMasterKey;
  }

  public getLegacyJwtKey(): string | undefined {
    return this.config.legacyJwtPrivateKeyPem;
  }

  public isFeatureEnabled(flag: keyof Config["featureFlags"]): boolean {
    return this.config.featureFlags[flag];
  }

  public isProd(): boolean {
    return this.config.environment === "production";
  }

  public isDev(): boolean {
    return this.config.environment === "development";
  }
}

export const config = ConfigService.getInstance();