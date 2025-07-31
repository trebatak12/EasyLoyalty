import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { OAuth2Client } from "google-auth-library";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Enhanced JWT configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "change_me_access";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change_me_refresh";
const AUTH_PEPPER = process.env.AUTH_PEPPER || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Secure token lifetimes
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_IDLE_TTL = 30 * 60 * 60 * 1000; // 30 minutes

// Security flags
const isProd = process.env.NODE_ENV === "production";

// Initialize Google OAuth client
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export async function hashPassword(password: string): Promise<string> {
  const saltedPassword = password + AUTH_PEPPER;
  return await bcrypt.hash(saltedPassword, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const saltedPassword = password + AUTH_PEPPER;
  return await bcrypt.compare(saltedPassword, hash);
}

export function generateAccessToken(userId: string, roles: string[] = ["user"]): string {
  const jti = randomBytes(16).toString("hex"); // Unique token ID for blacklisting
  return jwt.sign({ 
    sub: userId, 
    type: "access",
    roles,
    jti
  }, JWT_ACCESS_SECRET, { 
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: "easyloyalty-api",
    audience: "easyloyalty-client"
  });
}

export function generateRefreshToken(userId: string, deviceId?: string): string {
  const jti = randomBytes(16).toString("hex");
  return jwt.sign({
    sub: userId,
    type: "refresh", 
    jti,
    deviceId: deviceId || "unknown"
  }, JWT_REFRESH_SECRET, {
    expiresIn: "30d",
    issuer: "easyloyalty-api",
    audience: "easyloyalty-client"
  });
}

export function generateQRToken(userId: string, nonce: string): string {
  return jwt.sign({ 
    sub: userId, 
    nonce,
    type: "qr" 
  }, JWT_ACCESS_SECRET, { 
    expiresIn: "60s" 
  });
}

export function generateShortCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.match(/.{1,4}/g)?.join("-") || code;
}

export function verifyAccessToken(token: string): { sub: string; type: string; roles: string[]; jti: string } | null {
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET, {
      issuer: "easyloyalty-api",
      audience: "easyloyalty-client"
    }) as { sub: string; type: string; roles: string[]; jti: string };
    
    if (payload.type !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string; type: string; jti: string; deviceId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: "easyloyalty-api", 
      audience: "easyloyalty-client"
    }) as { sub: string; type: string; jti: string; deviceId: string };
    
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyQRToken(token: string): { sub: string; nonce: string; type: string } | null {
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { sub: string; nonce: string; type: string };
    if (payload.type !== "qr") return null;
    return payload;
  } catch {
    return null;
  }
}

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

// Enhanced JWT authentication middleware with blacklist check
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing or invalid authorization header",
      code: "E_AUTH_MISSING_TOKEN"
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired token",
      code: "E_AUTH_INVALID_TOKEN"
    });
  }

  // Check token blacklist (for logout everywhere feature)
  const isBlacklisted = await storage.isTokenBlacklisted(payload.jti);
  if (isBlacklisted) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token has been revoked", 
      code: "E_AUTH_TOKEN_REVOKED"
    });
  }

  // Get user and validate status
  const user = await storage.getUser(payload.sub);
  if (!user || user.status === "blocked") {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "User account is blocked or not found",
      code: "E_FORBIDDEN"
    });
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
}

// Backward compatibility wrapper
export const authenticateUser = authenticate;

// Role-based authentication
export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      const userRoles = req.tokenPayload?.roles || ["user"];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Insufficient permissions",
          code: "E_INSUFFICIENT_PERMISSIONS"
        });
      }
      
      next();
    });
  };
}

// Admin authentication using JWT (unified system)
export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  // Try JWT first (new system)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    
    if (payload && payload.roles.includes("admin")) {
      const admin = await storage.getAdminUser(payload.sub);
      if (admin && admin.status === "active") {
        req.admin = admin;
        req.tokenPayload = payload;
        return next();
      }
    }
  }

  // Fallback to legacy session system (temporary)
  const sessionId = req.cookies?.admin_sid;
  if (sessionId) {
    const session = await storage.getAdminSession(sessionId);
    if (session && session.expiresAt > new Date()) {
      const admin = await storage.getAdminUser(session.adminId);
      if (admin && admin.status === "active") {
        req.admin = admin;
        req.sessionId = sessionId;
        return next();
      }
    }
  }

  return res.status(401).json({ 
    error: "Unauthorized", 
    message: "Missing or invalid admin authentication",
    code: "E_AUTH_ADMIN_REQUIRED"
  });
}

// Rate limiting store (simple in-memory for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number; lockoutUntil?: number }>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number, lockoutMs: number = 0): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
  }

  if (entry.lockoutUntil && now < entry.lockoutUntil) {
    return { allowed: false, remaining: 0, resetTime: entry.lockoutUntil };
  }

  if (entry.count >= maxAttempts) {
    if (lockoutMs > 0) {
      entry.lockoutUntil = now + lockoutMs;
    }
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, resetTime: entry.resetTime };
}

// Google OAuth verification
export async function verifyGoogleToken(idToken: string): Promise<{ 
  googleId: string; 
  email: string; 
  name: string; 
  picture?: string 
} | null> {
  if (!googleClient) {
    throw new Error("Google OAuth not configured");
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      googleId: payload.sub,
      email: payload.email || "",
      name: payload.name || "",
      picture: payload.picture
    };
  } catch (error) {
    console.error("Google token verification failed:", error);
    return null;
  }
}

// Secure cookie configuration
export function getSecureCookieOptions(path: string = "/") {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path,
    maxAge: REFRESH_TOKEN_TTL
  };
}

// CSRF protection cookie for non-strict SameSite scenarios
export function getCSRFCookieOptions() {
  return {
    httpOnly: false, // Needs to be readable by JS for CSRF header
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL
  };
}

// Token blacklist operations
export async function blacklistToken(jti: string, ttlSeconds: number = 15 * 60) {
  await storage.blacklistToken(jti, ttlSeconds);
}

export async function logoutEverywhere(userId: string) {
  // Blacklist all current refresh tokens for user
  await storage.revokeAllUserTokens(userId);
}

// Enhanced audit logging
export async function logAuthEvent(
  event: string, 
  userId: string | null, 
  ip: string, 
  userAgent: string, 
  meta: Record<string, any> = {}
) {
  await storage.createEnhancedAuditLog({
    event,
    userId,
    ip,
    userAgent,
    meta,
    timestamp: new Date()
  });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: any;
      sessionId?: string;
      tokenPayload?: {
        sub: string;
        type: string;
        roles: string[];
        jti: string;
      };
    }
  }
}
