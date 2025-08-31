import { tokenService } from "./token-service";
import { keyManager, type KeyPurpose } from "./key-manager";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { createErrorResponse, getClientIP, getUserAgent } from "./utils";

/**
 * Nové auth funkce používající keystore
 */

export async function generateKeystoreAccessToken(
  userId: string, 
  roles: string[] = ["user"], 
  tokenVersion: number = 0, 
  passwordChangedAt?: Date
): Promise<string> {
  const { randomBytes } = await import("crypto");
  const payload = {
    jti: randomBytes(16).toString("hex"),
    sub: userId,
    type: "access",
    roles,
    token_version: tokenVersion,
    ...(passwordChangedAt && { pwd_ts: Math.floor(passwordChangedAt.getTime() / 1000) })
  };

  return await tokenService.sign(payload, { purpose: "access_jwt", ttl: "2h" });
}

export async function generateKeystoreRefreshToken(
  userId: string, 
  deviceId?: string, 
  tokenVersion: number = 0, 
  passwordChangedAt?: Date
): Promise<string> {
  const { randomBytes } = await import("crypto");
  const payload = {
    jti: randomBytes(16).toString("hex"),
    sub: userId,
    type: "refresh",
    deviceId: deviceId || "unknown",
    token_version: tokenVersion,
    ...(passwordChangedAt && { pwd_ts: Math.floor(passwordChangedAt.getTime() / 1000) })
  };

  return await tokenService.sign(payload, { purpose: "refresh_jwt", ttl: "30d" });
}

export async function generateKeystoreQRToken(userId: string, nonce: string): Promise<string> {
  const payload = {
    sub: userId,
    type: "qr",
    nonce
  };

  return await tokenService.sign(payload, { purpose: "qr_jwt", ttl: "60s" });
}

export async function verifyKeystoreToken(token: string, acceptFallback: boolean = true) {
  try {
    return await tokenService.verify(token, { acceptFallbackEnvKey: acceptFallback });
  } catch (error: any) {
    if (acceptFallback && error.code === 'UNSUPPORTED_ALG') {
      // Fallback to legacy verification for HS256 tokens during migration
      const { verifyAccessToken, verifyRefreshToken, verifyQRToken } = await import('./auth');
      
      // Try different token types based on expected signature
      try {
        const accessPayload = verifyAccessToken(token);
        if (accessPayload) return accessPayload;
      } catch { /* ignore */ }
      
      try {
        const refreshPayload = verifyRefreshToken(token);
        if (refreshPayload) return refreshPayload;
      } catch { /* ignore */ }
      
      try {
        const qrPayload = verifyQRToken(token);
        if (qrPayload) return qrPayload;
      } catch { /* ignore */ }
    }
    
    throw error;
  }
}

/**
 * Middleware pro autentifikaci s keystore
 */
export async function authenticateWithKeystore(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing or invalid authorization header",
      code: "E_AUTH_MISSING_TOKEN"
    });
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verifyKeystoreToken(token, true);
    
    if (!payload || payload.type !== "access") {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid token type",
        code: "E_AUTH_INVALID_TOKEN"
      });
    }

    // Type-safe payload handling with fallback support
    const safePayload = payload as any;
    
    // Zkontroluj blacklist
    const isBlacklisted = await storage.isTokenBlacklisted(safePayload.jti || "");
    if (isBlacklisted) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token has been revoked", 
        code: "E_AUTH_TOKEN_REVOKED"
      });
    }

    // Získej a validuj uživatele
    const user = await storage.getUser(safePayload.sub);
    if (!user || user.status === "blocked") {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "User account is blocked or not found",
        code: "E_FORBIDDEN"
      });
    }

    // Validuj token version
    if (safePayload.token_version !== user.tokenVersion) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token version mismatch - please re-authenticate",
        code: "E_AUTH_TOKEN_VERSION_MISMATCH"
      });
    }

    // Validuj password change timestamp
    if (safePayload.pwd_ts && user.passwordChangedAt) {
      const userPwdTs = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (safePayload.pwd_ts < userPwdTs) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Token issued before password change - please re-authenticate",
          code: "E_AUTH_PASSWORD_CHANGED"
        });
      }
    }

    req.user = user;
    req.tokenPayload = {
      sub: safePayload.sub,
      type: safePayload.type || "access",
      roles: safePayload.roles || ["user"],
      jti: safePayload.jti || "",
      token_version: safePayload.token_version || 0,
      pwd_ts: safePayload.pwd_ts
    };
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired token",
      code: "E_AUTH_INVALID_TOKEN"
    });
  }
}

/**
 * Admin middleware s keystore
 */
export async function authenticateAdminWithKeystore(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing or invalid authorization header",
      code: "E_AUTH_MISSING_TOKEN"
    });
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verifyKeystoreToken(token, true);
    
    if (!payload || payload.type !== "access") {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid token type",
        code: "E_AUTH_INVALID_TOKEN"
      });
    }

    // Type-safe payload handling with fallback support
    const safePayload = payload as any;
    
    // Zkontroluj admin roli
    if (!safePayload.roles?.includes("admin")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required",
        code: "E_AUTH_ADMIN_REQUIRED"
      });
    }

    // Zbytek validace...
    const admin = await storage.getAdminUser(safePayload.sub);
    if (!admin || admin.status !== "active") {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Admin account is blocked or not found",
        code: "E_FORBIDDEN"
      });
    }

    req.admin = admin;
    req.tokenPayload = {
      sub: safePayload.sub,
      type: safePayload.type || "access",
      roles: safePayload.roles || ["admin"],
      jti: safePayload.jti || "",
      token_version: safePayload.token_version || 0,
      pwd_ts: safePayload.pwd_ts
    };
    next();
  } catch (error) {
    console.error("Admin token verification failed:", error);
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired token",
      code: "E_AUTH_INVALID_TOKEN"
    });
  }
}