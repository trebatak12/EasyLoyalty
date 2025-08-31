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
  const payload = {
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
  const payload = {
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
  return await tokenService.verify(token, { acceptFallbackEnvKey: acceptFallback });
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

    // Zkontroluj blacklist
    const isBlacklisted = await storage.isTokenBlacklisted(payload.jti || "");
    if (isBlacklisted) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token has been revoked", 
        code: "E_AUTH_TOKEN_REVOKED"
      });
    }

    // Získej a validuj uživatele
    const user = await storage.getUser(payload.sub);
    if (!user || user.status === "blocked") {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "User account is blocked or not found",
        code: "E_FORBIDDEN"
      });
    }

    // Validuj token version
    if (payload.token_version !== user.tokenVersion) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token version mismatch - please re-authenticate",
        code: "E_AUTH_TOKEN_VERSION_MISMATCH"
      });
    }

    // Validuj password change timestamp
    if (payload.pwd_ts && user.passwordChangedAt) {
      const userPwdTs = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.pwd_ts < userPwdTs) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Token issued before password change - please re-authenticate",
          code: "E_AUTH_PASSWORD_CHANGED"
        });
      }
    }

    req.user = user;
    req.tokenPayload = {
      sub: payload.sub,
      type: payload.type || "access",
      roles: payload.roles || ["user"],
      jti: payload.jti || "",
      token_version: payload.token_version || 0,
      pwd_ts: payload.pwd_ts
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

    // Zkontroluj admin roli
    if (!payload.roles?.includes("admin")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required",
        code: "E_AUTH_ADMIN_REQUIRED"
      });
    }

    // Zbytek validace...
    const admin = await storage.getAdminUser(payload.sub);
    if (!admin || admin.status !== "active") {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Admin account is blocked or not found",
        code: "E_FORBIDDEN"
      });
    }

    req.admin = admin;
    req.tokenPayload = {
      sub: payload.sub,
      type: payload.type || "access",
      roles: payload.roles || ["admin"],
      jti: payload.jti || "",
      token_version: payload.token_version || 0,
      pwd_ts: payload.pwd_ts
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