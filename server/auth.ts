import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { OAuth2Client } from "google-auth-library";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "change_me_access";
const AUTH_PEPPER = process.env.AUTH_PEPPER || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_IDLE_TTL = 30 * 60 * 1000; // 30 minutes

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

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, JWT_ACCESS_SECRET, { 
    expiresIn: ACCESS_TOKEN_TTL 
  });
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
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

export function verifyAccessToken(token: string): { sub: string; type: string } | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as { sub: string; type: string };
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

// Middleware for JWT authentication
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing or invalid authorization header",
      code: "E_AUTH"
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  
  if (!payload || payload.type !== "access") {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired token",
      code: "E_AUTH"
    });
  }

  const user = await storage.getUser(payload.sub);
  if (!user || user.status === "blocked") {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "User account is blocked or not found",
      code: "E_FORBIDDEN"
    });
  }

  req.user = user;
  next();
}

// Middleware for admin session authentication
export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.admin_sid;
  if (!sessionId) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing admin session",
      code: "E_AUTH"
    });
  }

  const session = await storage.getAdminSession(sessionId);
  if (!session) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired session",
      code: "E_AUTH"
    });
  }

  const admin = await storage.getAdminUser(session.adminId);
  if (!admin || admin.status === "blocked") {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Admin account is blocked or not found",
      code: "E_FORBIDDEN"
    });
  }

  req.admin = admin;
  req.sessionId = sessionId;
  next();
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

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: any;
      sessionId?: string;
    }
  }
}
