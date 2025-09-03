import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { setupLedgerRoutes } from "./routes/ledger/index";
import { ledgerService } from "./routes/ledger/service";
import { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  generateAdminAccessToken,
  generateRefreshToken, 
  generateQRToken, 
  generateShortCode, 
  verifyQRToken,
  authenticate,
  checkRateLimit,
  verifyGoogleToken,
  verifyRefreshToken,
  blacklistToken,
  logoutEverywhere,
  logAuthEvent,
  getSecureCookieOptions,
  REFRESH_COOKIE_PATH,
  generatePasswordResetToken,
  hashPasswordResetToken
} from "./auth";
import { 
  generateKeystoreAccessToken,
  generateKeystoreRefreshToken,
  generateKeystoreQRToken,
  verifyKeystoreToken,
  authenticateWithKeystore,
  authenticateAdminWithKeystore
} from "./keystore-auth";
import { auditLog, createErrorResponse, validateEmail, validatePassword, formatCZK, parseCZK, addRequestId, getClientIP, getUserAgent } from "./utils";
import { sendPasswordResetEmail } from "./email";
import { keyManager } from "./key-manager";
import { metrics } from "./metrics";

// Production flag for cookie security
const isProd = process.env.NODE_ENV === "production";

// Ledger integration feature flag
const LEDGER_POS_INTEGRATION = process.env.LEDGER_POS_INTEGRATION === 'true';
import { TOP_UP_PACKAGES, type PackageCode, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

// Token lifetimes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const topupSchema = z.object({
  packageCode: z.enum(["MINI", "STANDARD", "MAXI", "ULTRA"])
});

const chargeInitSchema = z.object({
  tokenOrCode: z.string().min(1)
});

const chargeConfirmSchema = z.object({
  chargeId: z.string().uuid(),
  amountCZK: z.number().positive(),
  idempotencyKey: z.string().min(1)
});

const chargeVoidSchema = z.object({
  chargeId: z.string().uuid()
});

const adjustmentSchema = z.object({
  userId: z.string().uuid(),
  amountCZK: z.number(),
  reason: z.string().min(1),
  idempotencyKey: z.string().min(1)
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1)
});

// In-memory stores for demo (should be Redis in production)
const qrCodes = new Map<string, { userId: string; expiresAt: number; used: boolean }>();
const pendingCharges = new Map<string, { userId: string; amountCents: number; createdAt: number; adminId: string; ledgerTxId?: string }>();

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(addRequestId);

  // Health endpoints
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.get("/ready", async (req, res) => {
    try {
      await storage.getUser("test");
      res.json({ db: "ok" });
    } catch (error) {
      res.status(503).json({ db: "down" });
    }
  });

  app.get("/version", (req, res) => {
    res.json({
      commit: process.env.GIT_SHA || "unknown",
      builtAt: new Date().toISOString()
    });
  });

  // Setup ledger routes
  setupLedgerRoutes(app);

  // Metrics endpoint (pouze development)
  app.get("/api/metrics", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    try {
      const allMetrics = metrics.getAllMetrics();
      const activeKeysGauge = await metrics.getActiveKeysPerPurpose();
      
      res.json({
        counters: allMetrics,
        gauges: {
          active_keys_per_purpose: activeKeysGauge
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Metrics endpoint error:", error);
      res.status(500).json({ error: "Metrics unavailable" });
    }
  });

  // JWKS endpoint
  app.get("/.well-known/jwks.json", async (req, res) => {
    try {
      const jwks = await keyManager.listJWKS();
      
      // Audit JWKS přístup
      await keyManager.auditEvent("*", "access_jwt", "jwks_served", {
        ip: getClientIP(req),
        userAgent: getUserAgent(req)
      });

      // Metrics
      metrics.recordJWKSServed();

      // HTTP cache hlavičky
      res.set({
        "Cache-Control": "public, max-age=300", // 5 minut cache
        "Content-Type": "application/json"
      });

      res.json(jwks);
    } catch (error) {
      console.error("JWKS endpoint error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "JWKS unavailable", "JWKS_UNAVAILABLE"));
    }
  });

  // Customer Authentication Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const body = signupSchema.parse(req.body);
      const ip = getClientIP(req);

      // Rate limiting
      const rateLimit = checkRateLimit(`signup:${ip}`, 5, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many signup attempts", "E_RATE_LIMIT"));
      }

      // Validate email uniqueness
      const existingUser = await storage.getUserByEmail(body.email);
      if (existingUser) {
        return res.status(400).json(createErrorResponse("BadRequest", "Email already registered", "E_INPUT"));
      }

      // Validate password
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return res.status(400).json(createErrorResponse("BadRequest", passwordValidation.message!, "E_INPUT"));
      }

      // Create user (wallet is created automatically in createUser method)
      const passwordHash = await hashPassword(body.password);
      const user = await storage.createUser({
        email: body.email,
        name: body.name,
        passwordHash
      });

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Generate keystore tokens with current token version
      const accessToken = await generateKeystoreAccessToken(user.id, ["user"], user.tokenVersion || 0, user.passwordChangedAt || undefined);
      const deviceId = `${ip}_${getUserAgent(req).substring(0, 50)}`;
      const refreshToken = await generateKeystoreRefreshToken(user.id, deviceId, user.tokenVersion || 0, user.passwordChangedAt || undefined);

      // Dekóduj keystore token pro jti
      const decodedRefresh = await verifyKeystoreToken(refreshToken, false);
      await storage.storeRefreshToken({
        userId: user.id,
        tokenId: (decodedRefresh as any).jti || 'unknown',
        deviceId,
        ip,
        userAgent: getUserAgent(req),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Set secure refresh token cookie
      res.cookie("refresh_token", refreshToken, getSecureCookieOptions());

      // Audit log
      await auditLog("user", user.id, "signup", { email: body.email }, getUserAgent(req), ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const ip = getClientIP(req);
      const userAgent = getUserAgent(req);

      // Rate limiting
      const ipLimit = checkRateLimit(`login:ip:${ip}`, 5, 5 * 60 * 1000);
      const emailLimit = checkRateLimit(`login:email:${body.email}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);

      if (!ipLimit.allowed || !emailLimit.allowed) {
        await logAuthEvent("login_rate_limited", null, ip, userAgent, { email: body.email });
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many login attempts", "E_RATE_LIMIT"));
      }

      // Find user
      const user = await storage.getUserByEmail(body.email);
      if (!user) {
        await logAuthEvent("login_failed", null, ip, userAgent, { email: body.email, reason: "user_not_found" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Check if blocked
      if (user.status === "blocked") {
        await logAuthEvent("login_blocked", user.id, ip, userAgent, { email: body.email });
        return res.status(403).json(createErrorResponse("Forbidden", "Account is blocked", "E_FORBIDDEN"));
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.passwordHash || '');
      if (!isValid) {
        await logAuthEvent("login_failed", user.id, ip, userAgent, { email: body.email, reason: "invalid_password" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Generate keystore tokens with current token version
      const deviceId = `${ip}_${userAgent.substring(0, 50)}`;
      const accessToken = await generateKeystoreAccessToken(user.id, ["user"], user.tokenVersion || 0, user.passwordChangedAt || undefined);
      const refreshToken = await generateKeystoreRefreshToken(user.id, deviceId, user.tokenVersion || 0, user.passwordChangedAt || undefined);

      // Store keystore refresh token in database for rotation detection
      const decodedRefresh = await verifyKeystoreToken(refreshToken, false);
      await storage.storeRefreshToken({
        userId: user.id,
        tokenId: decodedRefresh.jti!,
        deviceId,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
      });

      // Set secure refresh token cookie
      res.cookie("refresh_token", refreshToken, getSecureCookieOptions());

      // Audit log
      await logAuthEvent("login_success", user.id, ip, userAgent, { email: body.email });

      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Refresh access token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      // Get refresh token from HTTP-only cookie
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Refresh token missing", "E_AUTH_NO_REFRESH_TOKEN"));
      }

      let payload;
      try {
        // Try keystore first
        payload = await verifyKeystoreToken(refreshToken, false);
      } catch (error: any) {
        if (error.code === 'UNSUPPORTED_ALG') {
          // Fallback to legacy HS256 for gradual migration
          payload = verifyRefreshToken(refreshToken);
          if (!payload) {
            return res.status(401).json(createErrorResponse("Unauthorized", "Invalid refresh token", "E_AUTH_INVALID_REFRESH_TOKEN"));
          }
        } else {
          throw error;
        }
      }

      if (!payload || (payload.type && payload.type !== "refresh")) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid refresh token", "E_AUTH_INVALID_REFRESH_TOKEN"));
      }

      // Check if token was already used (rotation detection)  
      const jti = (payload as any).jti || "";
      if (!jti) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Token missing jti", "E_AUTH_INVALID_REFRESH_TOKEN"));
      }
      
      const storedToken = await storage.getRefreshToken(jti);
      if (!storedToken || storedToken.revokedAt) {
        // Token reuse detected - security breach!
        await logAuthEvent("token_reuse_detected", payload.sub, getClientIP(req), getUserAgent(req), { 
          tokenId: jti
        });

        // Revoke all tokens for this user
        await logoutEverywhere(payload.sub);

        return res.status(401).json(createErrorResponse("Unauthorized", "Token reuse detected - all sessions revoked", "E_AUTH_TOKEN_REUSE"));
      }

      // Mark old token as used
      await storage.markRefreshTokenUsed(jti);

      // Get user's current tokenVersion and passwordChangedAt for new tokens
      const user = await storage.getUser(payload.sub);
      if (!user) {
        return res.status(401).json(createErrorResponse("Unauthorized", "User not found", "E_AUTH_USER_NOT_FOUND"));
      }

      // Generate new keystore access token with current tokenVersion
      const newAccessToken = await generateKeystoreAccessToken(
        payload.sub, 
        ["user"], 
        user.tokenVersion, 
        user.passwordChangedAt || undefined
      );

      // Rotate keystore refresh token with current tokenVersion
      const newRefreshToken = await generateKeystoreRefreshToken(
        payload.sub, 
        (payload as any).deviceId || "unknown", 
        user.tokenVersion, 
        user.passwordChangedAt || undefined
      );
      const decodedNewRefresh = await verifyKeystoreToken(newRefreshToken, false);
      await storage.storeRefreshToken({
        userId: payload.sub,
        tokenId: (decodedNewRefresh as any).jti!,
        deviceId: (payload as any).deviceId,
        ip: getClientIP(req),
        userAgent: getUserAgent(req),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
      });

      // Set new refresh token cookie
      res.cookie("refresh_token", newRefreshToken, getSecureCookieOptions());

      // Audit log
      await logAuthEvent("token_refresh", payload.sub, getClientIP(req), getUserAgent(req), {});

      res.json({ accessToken: newAccessToken });

    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/auth/logout", authenticateWithKeystore, async (req, res) => {
    try {
      const userId = req.user.id;
      const tokenPayload = req.tokenPayload;

      // Blacklist current access token
      if (tokenPayload?.jti) {
        await blacklistToken(tokenPayload.jti, 15 * 60); // 15 minutes
      }

      // Revoke refresh token from cookie
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        const payload = verifyRefreshToken(refreshToken);
        if (payload) {
          await storage.revokeRefreshToken(payload.jti);
        }
      }

      // FIX: Clear refresh token cookie with consistent path
      res.clearCookie("refresh_token", { 
        path: REFRESH_COOKIE_PATH,
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });
      
      // Also clear old path cookies for backward compatibility
      res.clearCookie("refresh_token", { 
        path: "/api/auth/refresh",
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });

      // Audit log
      await logAuthEvent("logout", userId, getClientIP(req), getUserAgent(req), {});

      res.status(204).send();
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Logout from all devices
  app.post("/api/auth/logout-everywhere", authenticateWithKeystore, async (req, res) => {
    try {
      const userId = req.user.id;

      // Revoke all refresh tokens for user
      await logoutEverywhere(userId);

      // Clear current refresh token cookie
      res.clearCookie("refresh_token", { 
        path: REFRESH_COOKIE_PATH,
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });
      
      // Also clear old path cookies for backward compatibility
      res.clearCookie("refresh_token", { 
        path: "/api/auth/refresh",
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });

      // Audit log
      await logAuthEvent("logout_everywhere", userId, getClientIP(req), getUserAgent(req), {});

      res.json({ message: "Logged out from all devices" });
    } catch (error) {
      console.error("Logout everywhere error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Password reset endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const ip = getClientIP(req);
      const userAgent = getUserAgent(req);
      
      // Normalize email
      const email = body.email.toLowerCase().trim();
      
      // Rate limiting - IP and email based
      const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 min per IP
      const emailLimit = checkRateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000); // 3 attempts per hour per email
      
      if (!ipLimit.allowed || !emailLimit.allowed) {
        await logAuthEvent("forgot_password_rate_limited", null, ip, userAgent, { email });
        // Always return same neutral response for security
        return res.json({ message: "If this email exists, you will receive password reset instructions." });
      }
      
      // Find user - neutral response regardless of existence
      const user = await storage.getUserByEmail(email);
      
      if (user && user.status === "active" && user.passwordHash) {
        // User exists and has password auth (not OAuth-only)
        
        // Revoke any existing active reset tokens
        await storage.revokeUserPasswordResetTokens(user.id);
        
        // Generate new reset token
        const { token, hash } = generatePasswordResetToken();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        
        // Store token hash
        await storage.createPasswordResetToken({
          userId: user.id,
          tokenHash: hash,
          expiresAt,
          status: "active",
          ipRequest: ip,
          uaRequest: userAgent
        });
        
        // Send password reset email
        try {
          await sendPasswordResetEmail(email, token);
          console.log(`Password reset email sent to ${email}`);
        } catch (emailError) {
          console.error(`Failed to send reset email to ${email}:`, emailError);
          // Don't log reset URLs even in development for security
        }
        
        await logAuthEvent("forgot_password_requested", user.id, ip, userAgent, { email });
      } else {
        // Log attempt for non-existent user or OAuth-only user
        await logAuthEvent("forgot_password_invalid_user", null, ip, userAgent, { email });
      }
      
      // Always return neutral response
      res.json({ message: "If this email exists, you will receive password reset instructions." });
      
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid email address", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });
  
  // Optional token validation endpoint
  app.get("/api/auth/reset-password/validate", async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json(createErrorResponse("BadRequest", "Token is required", "E_INPUT"));
      }
      
      const tokenHash = hashPasswordResetToken(token);
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      
      if (!resetToken || 
          resetToken.status !== "active" || 
          resetToken.expiresAt < new Date()) {
        return res.status(400).json({
          valid: false,
          error: "Token is invalid or expired"
        });
      }
      
      res.json({ valid: true });
      
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });
  
  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const body = resetPasswordSchema.parse(req.body);
      const ip = getClientIP(req);
      const userAgent = getUserAgent(req);
      
      // Rate limiting
      const ipLimit = checkRateLimit(`reset-password:ip:${ip}`, 5, 15 * 60 * 1000);
      if (!ipLimit.allowed) {
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many reset attempts", "E_RATE_LIMIT"));
      }
      
      // Validate password strength
      const passwordValidation = validatePassword(body.newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json(createErrorResponse("BadRequest", passwordValidation.message!, "E_INPUT"));
      }
      
      // Find and validate token
      const tokenHash = hashPasswordResetToken(body.token);
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      
      if (!resetToken || 
          resetToken.status !== "active" || 
          resetToken.expiresAt < new Date()) {
        await logAuthEvent("password_reset_invalid_token", null, ip, userAgent, { tokenHash: tokenHash.substring(0, 8) });
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid or expired reset token", "E_AUTH_INVALID_TOKEN"));
      }
      
      // Get user
      const user = await storage.getUser(resetToken.userId);
      if (!user || user.status !== "active") {
        return res.status(400).json(createErrorResponse("BadRequest", "User account not found or blocked", "E_AUTH_USER_BLOCKED"));
      }
      
      // Update password and security fields
      const newPasswordHash = await hashPassword(body.newPassword);
      
      // Execute atomically
      await Promise.all([
        storage.updateUserPassword(user.id, newPasswordHash),
        storage.incrementUserTokenVersion(user.id),
        storage.markPasswordResetTokenUsed(resetToken.id, ip, userAgent),
        storage.revokeUserPasswordResetTokens(user.id), // Revoke other tokens
        storage.revokeAllUserRefreshTokens(user.id) // Invalidate all sessions
      ]);
      
      await logAuthEvent("password_reset_success", user.id, ip, userAgent, { email: user.email });
      
      // Optional silent login - generate new tokens
      const updatedUser = await storage.getUser(user.id);
      if (updatedUser) {
        const accessToken = generateAccessToken(user.id, ["user"], updatedUser.tokenVersion, updatedUser.passwordChangedAt || undefined);
        const deviceId = `${ip}_${userAgent.substring(0, 50)}`;
        const refreshToken = generateRefreshToken(user.id, deviceId, updatedUser.tokenVersion, updatedUser.passwordChangedAt || undefined);
        
        // Store new refresh token
        await storage.storeRefreshToken({
          userId: user.id,
          tokenId: (jwt.decode(refreshToken) as any)?.jti || 'unknown',
          deviceId,
          ip,
          userAgent,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        
        // Set secure refresh token cookie
        res.cookie("refresh_token", refreshToken, getSecureCookieOptions());
        
        return res.json({
          message: "Password reset successful",
          silentLogin: true,
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      }
      
      res.json({ message: "Password reset successful" });
      
    } catch (error) {
      console.error("Reset password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Google OAuth login/signup
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);
      const ip = getClientIP(req);

      // Rate limiting
      const rateLimit = checkRateLimit(`google-auth:${ip}`, 10, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many authentication attempts", "E_RATE_LIMIT"));
      }

      // Verify Google ID token
      const googleData = await verifyGoogleToken(idToken);
      if (!googleData) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid Google ID token", "E_AUTH"));
      }

      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleData.googleId);

      if (!user) {
        // Check if user exists by email
        user = await storage.getUserByEmail(googleData.email);

        if (user && user.passwordHash) {
          // User has password auth - create new account to avoid conflicts
          user = await storage.createUserWithGoogle({
            googleId: googleData.googleId,
            email: `google.${googleData.email}`, // Add prefix to avoid email conflicts
            name: googleData.name,
            profileImageUrl: googleData.picture
          });
        } else if (!user) {
          // Create new user
          user = await storage.createUserWithGoogle({
            googleId: googleData.googleId,
            email: googleData.email,
            name: googleData.name,
            profileImageUrl: googleData.picture
          });
        }
      }

      if (user.status === "blocked") {
        return res.status(403).json(createErrorResponse("Forbidden", "User account is blocked", "E_AUTH"));
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Generate tokens with current token version
      const accessToken = generateAccessToken(user.id, ["user"], user.tokenVersion || 0, user.passwordChangedAt || undefined);
      const deviceId = `${ip}_${getUserAgent(req).substring(0, 50)}`;
      const refreshToken = generateRefreshToken(user.id, deviceId, user.tokenVersion || 0, user.passwordChangedAt || undefined);

      // Store refresh token
      await storage.storeRefreshToken({
        userId: user.id,
        tokenId: (jwt.decode(refreshToken) as any)?.jti || 'unknown',
        deviceId,
        ip,
        userAgent: getUserAgent(req),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Set secure refresh token cookie
      res.cookie("refresh_token", refreshToken, getSecureCookieOptions());

      // Audit log
      await auditLog("user", user.id, "google_login", { email: user.email }, getUserAgent(req), ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImageUrl: user.profileImageUrl
        },
        accessToken
      });
    } catch (error) {
      console.error("Google auth error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Authentication failed", "E_AUTH"));
    }
  });

  // Customer Routes (JWT Protected)
  app.get("/api/me", authenticateWithKeystore, async (req, res) => {
    try {
      const user = req.user;
      const wallet = await storage.getWalletByUserId(user.id);
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        wallet: wallet ? {
          balanceCZK: formatCZK(wallet.balanceCents),
          balanceCents: wallet.balanceCents,
          bonusGrantedTotalCZK: formatCZK(wallet.bonusGrantedTotalCents),
          bonusGrantedTotalCents: wallet.bonusGrantedTotalCents
        } : null
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Wallet routes
  app.get("/api/me/wallet", authenticateWithKeystore, async (req, res) => {
    try {
      const wallet = await storage.getWalletByUserId(req.user!.id);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_WALLET"));
      }

      res.json({
        balanceCZK: formatCZK(wallet.balanceCents),
        balanceCents: wallet.balanceCents,
        bonusGrantedTotalCZK: formatCZK(wallet.bonusGrantedTotalCents),
        bonusGrantedTotalCents: wallet.bonusGrantedTotalCents,
        lastActivity: wallet.lastActivityAt
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });



  // Transaction history route
  app.get("/api/me/history", authenticateWithKeystore, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string;

      const transactions = await storage.getUserTransactions(userId, limit, cursor);

      res.json({
        transactions,
        nextCursor: transactions.length === limit ? transactions[transactions.length - 1].id : null
      });
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // QR payment generation route
  app.post("/api/me/qr", authenticateWithKeystore, async (req, res) => {
    try {
      const userId = req.user!.id;
      const nonce = Math.random().toString(36).substring(2, 15);

      // Generate JWT token for QR code (expires in 60 seconds)
      const qrToken = generateQRToken(userId, nonce);

      // Generate short code as backup
      const shortCode = generateShortCode();

      res.json({
        qrPayload: qrToken,
        shortCode,
        expiresIn: 60, // seconds
        userId
      });
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Robust Top-up endpoint with atomic transactions and idempotency
  app.post("/api/me/topup", authenticateWithKeystore, async (req, res) => {
    try {
      const body = topupSchema.parse(req.body);
      const userId = req.user.id;
      const ip = getClientIP(req);
      
      // Get idempotency key from header or generate one
      const idempotencyKey = req.headers['idempotency-key'] as string || randomUUID();

      const packageData = TOP_UP_PACKAGES[body.packageCode];
      if (!packageData) {
        return res.status(400).json(createErrorResponse("BadRequest", "Neplatný packageCode", "E_INPUT"));
      }

      // Check if this idempotency key was already processed
      const existingTransaction = await storage.getTransactionByIdempotencyKey(idempotencyKey);
      if (existingTransaction) {
        console.log(`Idempotent topup request detected: ${idempotencyKey}`);
        
        // Return the existing wallet state without making changes
        const wallet = await storage.getWalletByUserId(userId);
        return res.json({
          balanceCZK: formatCZK(wallet!.balanceCents),
          balanceCents: wallet!.balanceCents,
          bonusGrantedTotalCZK: formatCZK(wallet!.bonusGrantedTotalCents),
          bonusGrantedTotalCents: wallet!.bonusGrantedTotalCents,
          idempotent: true
        });
      }

      // Execute atomic top-up transaction
      const updatedWallet = await storage.executeAtomicTopup({
        userId,
        packageCode: body.packageCode,
        packageData,
        idempotencyKey,
        createdBy: "user"
      });

      // Audit log
      await auditLog("user", userId, "topup", {
        packageCode: body.packageCode,
        amount: packageData.total,
        bonus: packageData.bonus,
        idempotencyKey
      }, getUserAgent(req), ip);

      console.log(`Topup successful for user ${userId}: ${body.packageCode}, amount: ${packageData.total}, bonus: ${packageData.bonus}`);

      res.json({
        balanceCZK: formatCZK(updatedWallet.balanceCents),
        balanceCents: updatedWallet.balanceCents,
        bonusGrantedTotalCZK: formatCZK(updatedWallet.bonusGrantedTotalCents),
        bonusGrantedTotalCents: updatedWallet.bonusGrantedTotalCents
      });
    } catch (error) {
      console.error("Topup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/me/qr", authenticateWithKeystore, async (req, res) => {
    try {
      const userId = req.user.id;
      const nonce = randomUUID();
      const shortCode = generateShortCode();
      const expiresAt = Date.now() + 60000; // 60 seconds

      const qrPayload = generateQRToken(userId, nonce);

      // Store QR code data
      qrCodes.set(shortCode, { userId, expiresAt, used: false });
      qrCodes.set(qrPayload, { userId, expiresAt, used: false });

      res.json({
        qrPayload,
        shortCode,
        expiresAt: new Date(expiresAt).toISOString()
      });
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.get("/api/me/history", authenticateWithKeystore, async (req, res) => {
    try {
      const { type = "all", cursor } = req.query;
      const transactions = await storage.getUserTransactions(req.user.id, 20, cursor as string);

      const filteredTransactions = type === "all" ? transactions : 
        transactions.filter(t => {
          if (type === "topups") return t.type === "topup";
          if (type === "transactions") return t.type === "charge" || t.type === "void";
          return true;
        });

      res.json({
        transactions: filteredTransactions.map(t => ({
          id: t.id,
          type: t.type,
          amountCZK: formatCZK(Math.abs(t.amountCents)),
          amountCents: t.amountCents,
          meta: t.meta,
          createdAt: t.createdAt
        })),
        nextCursor: transactions.length === 20 ? transactions[19].createdAt : null
      });
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const ip = getClientIP(req);
      const userAgent = getUserAgent(req);

      // Rate limiting
      const ipLimit = checkRateLimit(`admin_login:ip:${ip}`, 3, 5 * 60 * 1000);
      const emailLimit = checkRateLimit(`admin_login:email:${body.email}`, 5, 15 * 60 * 1000, 15 * 60 * 1000);

      if (!ipLimit.allowed || !emailLimit.allowed) {
        await logAuthEvent("admin_login_rate_limited", null, ip, userAgent, { email: body.email });
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many login attempts", "E_RATE_LIMIT"));
      }

      // Find admin
      const admin = await storage.getAdminUserByEmail(body.email);
      if (!admin) {
        await logAuthEvent("admin_login_failed", null, ip, userAgent, { email: body.email, reason: "admin_not_found" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Check if blocked
      if (admin.status !== "active") {
        await logAuthEvent("admin_login_blocked", admin.id, ip, userAgent, { email: body.email });
        return res.status(403).json(createErrorResponse("Forbidden", "Account is blocked", "E_FORBIDDEN"));
      }

      // Verify password
      const isValid = await verifyPassword(body.password, admin.passwordHash || '');
      if (!isValid) {
        await logAuthEvent("admin_login_failed", admin.id, ip, userAgent, { email: body.email, reason: "invalid_password" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Update last login
      await storage.updateAdminLastLogin(admin.id);

      // Generate secure tokens with version info
      const deviceId = `admin_${ip}_${userAgent.substring(0, 50)}`;
      const accessToken = generateAdminAccessToken(admin.id, admin.tokenVersion, admin.passwordChangedAt || undefined);
      const refreshToken = generateRefreshToken(admin.id, deviceId, admin.tokenVersion, admin.passwordChangedAt || undefined);

      // Store refresh token in database for rotation detection
      try {
        await storage.storeRefreshToken({
          userId: admin.id,
          tokenId: (jwt.decode(refreshToken) as any)?.jti || 'unknown',
          deviceId,
          ip,
          userAgent,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        });
      } catch (tokenError) {
        console.error("Failed to store admin refresh token:", tokenError);
        // Continue with login even if token storage fails
      }

      // Set secure refresh token cookie
      res.cookie("refresh_token", refreshToken, getSecureCookieOptions());

      // Audit log
      await logAuthEvent("admin_login_success", admin.id, ip, userAgent, { email: body.email });

      res.json({
        accessToken,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          status: admin.status,
          lastLoginAt: admin.lastLoginAt
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Admin refresh access token
  app.post("/api/admin/refresh", async (req, res) => {
    try {
      // Get refresh token from HTTP-only cookie
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Refresh token missing", "E_AUTH_NO_REFRESH_TOKEN"));
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid refresh token", "E_AUTH_INVALID_REFRESH_TOKEN"));
      }

      // Check if token was already used (rotation detection)
      const storedToken = await storage.getRefreshToken(payload.jti);
      if (!storedToken || storedToken.revokedAt) {
        // Token reuse detected - security breach!
        await logAuthEvent("admin_token_reuse_detected", payload.sub, getClientIP(req), getUserAgent(req), { 
          tokenId: payload.jti 
        });

        // Revoke all tokens for this admin
        await storage.revokeAllUserRefreshTokens(payload.sub);

        return res.status(401).json(createErrorResponse("Unauthorized", "Token reuse detected - all sessions revoked", "E_AUTH_TOKEN_REUSE"));
      }

      // Mark old token as used
      await storage.markRefreshTokenUsed(payload.jti);

      // Verify this is for an admin user  
      const admin = await storage.getAdminUser(payload.sub);
      if (!admin || admin.status !== "active") {
        console.log("Admin not found or inactive:", payload.sub, admin?.status);
        return res.status(403).json(createErrorResponse("Forbidden", "Admin account not found or blocked", "E_FORBIDDEN"));
      }

      // Validate token version and password change timestamp
      if (payload.token_version !== admin.tokenVersion) {
        await logAuthEvent("admin_token_version_mismatch", admin.id, getClientIP(req), getUserAgent(req), {
          tokenVersion: payload.token_version,
          currentVersion: admin.tokenVersion
        });
        return res.status(401).json({
          error: "Unauthorized",
          message: "Token version mismatch - please re-authenticate",
          code: "E_AUTH_TOKEN_VERSION_MISMATCH"
        });
      }

      if (payload.pwd_ts && admin.passwordChangedAt) {
        const adminPwdTs = Math.floor(admin.passwordChangedAt.getTime() / 1000);
        if (payload.pwd_ts < adminPwdTs) {
          await logAuthEvent("admin_password_changed_during_session", admin.id, getClientIP(req), getUserAgent(req), {
            tokenPwdTs: payload.pwd_ts,
            currentPwdTs: adminPwdTs
          });
          return res.status(401).json({
            error: "Unauthorized",
            message: "Token issued before password change - please re-authenticate",
            code: "E_AUTH_PASSWORD_CHANGED"
          });
        }
      }

      // Generate new access token with version info
      const newAccessToken = generateAdminAccessToken(admin.id, admin.tokenVersion, admin.passwordChangedAt || undefined);

      // Rotate refresh token with version info
      const newRefreshToken = generateRefreshToken(admin.id, payload.deviceId, admin.tokenVersion, admin.passwordChangedAt || undefined);
      
      // Store the new refresh token
      await storage.storeRefreshToken({
        userId: payload.sub,
        tokenId: (jwt.decode(newRefreshToken) as any)?.jti || 'unknown',
        deviceId: payload.deviceId,
        ip: getClientIP(req),
        userAgent: getUserAgent(req),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
      });

      // Set new refresh token cookie with consistent settings
      res.cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        maxAge: REFRESH_TOKEN_TTL // 30 days
      });

      // Audit log
      await logAuthEvent("admin_token_refresh", payload.sub, getClientIP(req), getUserAgent(req), {});

      res.json({ accessToken: newAccessToken });

    } catch (error) {
      console.error("Admin refresh error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/logout", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const adminId = req.admin.id;
      const tokenPayload = req.tokenPayload;

      // Blacklist current access token
      if (tokenPayload?.jti) {
        await blacklistToken(tokenPayload.jti, 15 * 60); // 15 minutes
      }

      // Revoke refresh token from cookie
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        const payload = verifyRefreshToken(refreshToken);
        if (payload) {
          await storage.revokeRefreshToken(payload.jti);
        }
      }

      // FIX: Clear refresh token cookie with consistent path
      res.clearCookie("refresh_token", { 
        path: REFRESH_COOKIE_PATH,
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });
      
      // Also clear old path cookies for backward compatibility
      res.clearCookie("refresh_token", { 
        path: "/api/admin/refresh",
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
      });

      // Audit log
      await logAuthEvent("admin_logout", adminId, getClientIP(req), getUserAgent(req), {});

      res.status(204).send();
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Admin Routes (Session Protected)
  app.get("/api/admin/me", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const admin = req.admin;
      res.json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        status: admin.status,
        lastLoginAt: admin.lastLoginAt
      });
    } catch (error) {
      console.error("Get admin me error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/charge/init", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const body = chargeInitSchema.parse(req.body);
      const { tokenOrCode } = body;

      let userId: string;
      let qrData = qrCodes.get(tokenOrCode);

      if (qrData) {
        // QR code or short code
        if (Date.now() > qrData.expiresAt) {
          return res.status(410).json(createErrorResponse("GoneTokenExpired", "QR code has expired", "E_EXPIRED_TOKEN"));
        }
        if (qrData.used) {
          return res.status(409).json(createErrorResponse("ConflictTokenUsed", "QR code already used", "E_IDEMPOTENCY_CONFLICT"));
        }
        userId = qrData.userId;
      } else {
        // Try to verify as JWT token
        const payload = verifyQRToken(tokenOrCode);
        if (!payload) {
          return res.status(404).json(createErrorResponse("NotFound", "Invalid or expired token", "E_NOT_FOUND"));
        }
        userId = payload.sub;

        // Check if token was already used
        qrData = qrCodes.get(tokenOrCode);
        if (qrData?.used) {
          return res.status(409).json(createErrorResponse("ConflictTokenUsed", "QR code already used", "E_IDEMPOTENCY_CONFLICT"));
        }
      }

      // Mark as used
      qrCodes.set(tokenOrCode, { ...qrData!, used: true });

      // Get user and wallet info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json(createErrorResponse("NotFound", "User not found", "E_NOT_FOUND"));
      }

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      const chargeId = randomUUID();
      
      // Store charge initialization for later confirmation
      pendingCharges.set(chargeId, {
        userId,
        amountCents: 0, // Will be set during confirmation
        createdAt: Date.now(),
        adminId: req.admin.id
      });
      
      res.json({
        userId: user.id,
        customerName: user.name,
        balanceCZK: formatCZK(wallet.balanceCents),
        balanceCents: wallet.balanceCents,
        chargeId
      });
    } catch (error) {
      console.error("Charge init error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/charge/confirm", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const body = chargeConfirmSchema.parse(req.body);
      const { chargeId, amountCZK, idempotencyKey } = body;
      const amountCents = amountCZK * 100;

      // Check idempotency
      const isIdempotent = await storage.checkIdempotency(idempotencyKey, JSON.stringify(body));
      if (isIdempotent) {
        return res.status(409).json(createErrorResponse("IdempotencyConflict", "Request already processed", "E_IDEMPOTENCY_CONFLICT"));
      }
      await storage.setIdempotency(idempotencyKey, JSON.stringify(body));

      // Get the pending charge that was initialized
      const pendingCharge = pendingCharges.get(chargeId);
      if (!pendingCharge) {
        return res.status(404).json(createErrorResponse("NotFound", "Charge session not found", "E_NOT_FOUND"));
      }

      // Update the pending charge with the amount
      const userId = pendingCharge.userId;
      pendingCharge.amountCents = amountCents;

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      // Check sufficient funds
      if (wallet.balanceCents < amountCents) {
        return res.status(422).json(createErrorResponse("InsufficientFunds", "Insufficient balance", "E_INSUFFICIENT_FUNDS"));
      }

      // Create charge transaction (legacy system)
      const transaction = await storage.createTransaction({
        userId,
        type: "charge",
        amountCents: -amountCents, // Debit
        relatedId: chargeId,
        idempotencyKey,
        createdBy: "admin",
        meta: {
          adminId: req.admin.id,
          chargeId
        }
      });

      // Update wallet balance (legacy system)
      const newBalance = wallet.balanceCents - amountCents;
      await storage.updateWalletBalance(userId, newBalance);

      // LEDGER INTEGRATION: If enabled, also record in ledger system
      let ledgerTxId: string | null = null;
      if (LEDGER_POS_INTEGRATION) {
        try {
          const ledgerResult = await ledgerService.charge({
            userId,
            amountMinor: amountCents, // Convert cents to minor currency units
            note: `POS charge ${chargeId}`
          });
          ledgerTxId = ledgerResult.txId;
          console.log(`[LEDGER] POS charge recorded: ${ledgerTxId} for user ${userId}, amount ${amountCents}`);
        } catch (ledgerError) {
          console.warn(`[LEDGER] Failed to record POS charge in ledger: ${ledgerError}`);
          // Continue with legacy system - don't fail the entire transaction
        }
      }

      // Store charge for void window (include ledger transaction ID if available)
      pendingCharges.set(chargeId, {
        userId,
        amountCents,
        createdAt: Date.now(),
        adminId: req.admin.id,
        ledgerTxId: ledgerTxId || undefined // Store ledger transaction ID for void support
      });

      // Audit log
      await auditLog("admin", req.admin.id, "charge_confirmed", {
        userId,
        amountCents,
        chargeId,
        transactionId: transaction.id
      });

      res.json({
        newBalanceCZK: formatCZK(newBalance),
        newBalanceCents: newBalance
      });
    } catch (error) {
      console.error("Charge confirm error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/charge/void", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const body = chargeVoidSchema.parse(req.body);
      const { chargeId } = body;

      const pendingCharge = pendingCharges.get(chargeId);
      if (!pendingCharge) {
        return res.status(404).json(createErrorResponse("NotFound", "Charge not found", "E_NOT_FOUND"));
      }

      // Check void window (120 seconds)
      if (Date.now() - pendingCharge.createdAt > 120000) {
        return res.status(422).json(createErrorResponse("VoidWindowExpired", "Void window has expired", "E_VOID_EXPIRED"));
      }

      // Create void transaction (legacy system)
      const transaction = await storage.createTransaction({
        userId: pendingCharge.userId,
        type: "void",
        amountCents: pendingCharge.amountCents, // Credit back
        relatedId: chargeId,
        idempotencyKey: randomUUID(),
        createdBy: "admin",
        meta: {
          adminId: req.admin.id,
          originalChargeId: chargeId
        }
      });

      // Restore wallet balance (legacy system)
      const wallet = await storage.getWalletByUserId(pendingCharge.userId);
      if (wallet) {
        const newBalance = wallet.balanceCents + pendingCharge.amountCents;
        await storage.updateWalletBalance(pendingCharge.userId, newBalance);
      }

      // LEDGER INTEGRATION: If enabled and we have a ledger transaction, also reverse in ledger
      if (LEDGER_POS_INTEGRATION && pendingCharge.ledgerTxId) {
        try {
          const reversalResult = await ledgerService.reversal({
            txId: pendingCharge.ledgerTxId
          });
          console.log(`[LEDGER] POS void recorded: ${reversalResult.txId} for original tx ${pendingCharge.ledgerTxId}`);
        } catch (ledgerError) {
          console.warn(`[LEDGER] Failed to reverse transaction in ledger: ${ledgerError}`);
          // Continue with legacy system - don't fail the void operation
        }
      }

      // Remove from pending charges
      pendingCharges.delete(chargeId);

      // Audit log
      await auditLog("admin", req.admin.id, "charge_voided", {
        userId: pendingCharge.userId,
        amountCents: pendingCharge.amountCents,
        chargeId,
        transactionId: transaction.id
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Charge void error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.get("/api/admin/customers", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const { query, cursor } = req.query;
      const limit = 50;
      const offset = cursor ? parseInt(cursor as string) : 0;

      const result = await storage.getCustomersList(query as string, limit, offset);

      res.json({
        customers: result.users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          balanceCZK: formatCZK(user.wallet.balanceCents),
          balanceCents: user.wallet.balanceCents,
          bonusGrantedTotalCZK: formatCZK(user.wallet.bonusGrantedTotalCents),
          bonusGrantedTotalCents: user.wallet.bonusGrantedTotalCents,
          lastActivity: user.wallet.lastActivityAt
        })),
        total: result.total,
        nextCursor: result.users.length === limit ? offset + limit : null
      });
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Admin dashboard stats
  app.get("/api/admin/dashboard", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      res.json({
        totalCustomers: stats.membersCount || 0,
        totalBalance: Math.floor((stats.todayTotalCents || 0) / 100), // Use available data
        totalTransactions: stats.todayCount || 0,
        monthlyStats: {
          newCustomers: 0, // TODO: Implement monthly stats
          totalSpent: Math.floor((stats.todayTotalCents || 0) / 100),  
          transactions: stats.todayCount || 0
        }
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/summary", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const stats = await storage.getSummaryStats();

      res.json({
        membersCount: stats.membersCount,
        liabilityCZK: formatCZK(stats.liabilityCents),
        liabilityCents: stats.liabilityCents,
        bonusGrantedTotalCZK: formatCZK(stats.bonusGrantedTotalCents),
        bonusGrantedTotalCents: stats.bonusGrantedTotalCents,
        spendTodayCZK: formatCZK(stats.spendTodayCents),
        spendTodayCents: stats.spendTodayCents,
        spendWeekCZK: formatCZK(stats.spendWeekCents),
        spendWeekCents: stats.spendWeekCents
      });
    } catch (error) {
      console.error("Get summary error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/adjustment", authenticateAdminWithKeystore, async (req, res) => {
    try {
      const body = adjustmentSchema.parse(req.body);
      const { userId, amountCZK, reason, idempotencyKey } = body;
      const amountCents = amountCZK * 100;

      // Check idempotency
      const isIdempotent = await storage.checkIdempotency(idempotencyKey, JSON.stringify(body));
      if (isIdempotent) {
        return res.status(409).json(createErrorResponse("IdempotencyConflict", "Request already processed", "E_IDEMPOTENCY_CONFLICT"));
      }
      await storage.setIdempotency(idempotencyKey, JSON.stringify(body));

      // Get user and wallet
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json(createErrorResponse("NotFound", "User not found", "E_NOT_FOUND"));
      }

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      // Create adjustment transaction
      const transaction = await storage.createTransaction({
        userId,
        type: "adjustment",
        amountCents,
        relatedId: null,
        idempotencyKey,
        createdBy: "admin",
        meta: {
          adminId: req.admin.id,
          reason
        }
      });

      // Update wallet balance
      const newBalance = wallet.balanceCents + amountCents;
      await storage.updateWalletBalance(userId, newBalance);

      // Audit log
      await auditLog("admin", req.admin.id, "adjustment_created", {
        userId,
        amountCents,
        reason,
        transactionId: transaction.id
      });

      res.json({
        newBalanceCZK: formatCZK(newBalance),
        newBalanceCents: newBalance
      });
    } catch (error) {
      console.error("Adjustment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // ===== POS (Point of Sale) ROUTES =====

  // POS authentication middleware - separate from admin auth for different session handling
  const authenticatePOS = async (req: any, res: any, next: any) => {
    const sessionId = req.cookies.pos_session;
    if (!sessionId) {
      return res.status(401).json(createErrorResponse("Unauthorized", "Nepřihlášen", "E_AUTH"));
    }

    const session = await storage.getAdminSession(sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json(createErrorResponse("Unauthorized", "Platnost sezení vypršela", "E_AUTH"));
    }

    const admin = await storage.getAdminUser(session.adminId);
    if (!admin || admin.status !== "active") {
      return res.status(401).json(createErrorResponse("Unauthorized", "Účet není aktivní", "E_AUTH"));
    }

    req.admin = admin;
    req.sessionId = sessionId;
    next();
  };

  app.post("/api/pos/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ip = getClientIP(req);

      const rateLimit = checkRateLimit(`pos_login:${ip}`, 5, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json(createErrorResponse("TooManyRequests", "Příliš mnoho pokusů o přihlášení", "E_RATE_LIMIT"));
      }

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin || !admin.passwordHash) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Neplatné přihlašovací údaje", "E_AUTH"));
      }

      const isValidPassword = await verifyPassword(password, admin.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Neplatné přihlašovací údaje", "E_AUTH"));
      }

      if (admin.status !== "active") {
        return res.status(401).json(createErrorResponse("Unauthorized", "Účet je zablokován", "E_AUTH"));
      }

      // Create session
      const newSession = await storage.createAdminSession({
        adminId: admin.id,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        ip: ip,
        userAgent: getUserAgent(req),
        revokedAt: null
      });

      await storage.updateAdminLastLogin(admin.id);

      // Set session cookie
      res.cookie("pos_session", newSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 8 * 60 * 60 * 1000
      });

      await auditLog("admin", admin.id, "pos_login", { email });

      res.json({ 
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });

    } catch (error) {
      console.error("POS login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/pos/logout", async (req, res) => {
    try {
      const sessionId = req.cookies.pos_session;
      if (sessionId) {
        await storage.revokeAdminSession(sessionId);
      }

      res.clearCookie("pos_session");
      res.json({ success: true });
    } catch (error) {
      console.error("POS logout error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Chyba při odhlašování", "E_SERVER"));
    }
  });

  app.get("/api/pos/me", authenticatePOS, async (req, res) => {
    try {
      const admin = req.admin;
      res.json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
    } catch (error) {
      console.error("POS me error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // POS charge flow
  app.post("/api/pos/charge/init", authenticatePOS, async (req, res) => {
    try {
      const { tokenOrCode } = chargeInitSchema.parse(req.body);

      let userId: string;

      // Try QR token first
      if (tokenOrCode.length > 10) {
        try {
          const payload = verifyQRToken(tokenOrCode);
          if (!payload?.sub) {
            return res.status(400).json(createErrorResponse("BadRequest", "Neplatný QR kód", "E_INPUT"));
          }
          userId = payload.sub;
        } catch {
          return res.status(400).json(createErrorResponse("BadRequest", "Neplatný QR kód", "E_INPUT"));
        }
      } else {
        // Try short code
        const qrData = qrCodes.get(tokenOrCode);
        if (!qrData || qrData.used || qrData.expiresAt < Date.now()) {
          return res.status(400).json(createErrorResponse("BadRequest", "Neplatný nebo použitý kód", "E_INPUT"));
        }
        userId = qrData.userId;
        // Mark as used
        qrCodes.set(tokenOrCode, { ...qrData, used: true });
      }

      const user = await storage.getUser(userId);
      if (!user || user.status !== "active") {
        return res.status(400).json(createErrorResponse("BadRequest", "Uživatel není aktivní", "E_INPUT"));
      }

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(400).json(createErrorResponse("BadRequest", "Peněženka nenalezena", "E_INPUT"));
      }

      res.json({
        userId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        balanceCZK: formatCZK(wallet.balanceCents),
        balanceCents: wallet.balanceCents
      });

    } catch (error) {
      console.error("POS charge init error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/pos/charge/confirm", authenticatePOS, async (req, res) => {
    try {
      const { userId, amountCZK, idempotencyKey } = z.object({
        userId: z.string().uuid(),
        amountCZK: z.number().positive(),
        idempotencyKey: z.string().min(1)
      }).parse(req.body);

      const amountCents = Math.round(amountCZK * 100);

      // Check idempotency
      const isIdempotent = await storage.checkIdempotency(idempotencyKey, JSON.stringify(req.body));
      if (isIdempotent) {
        return res.status(409).json(createErrorResponse("IdempotencyConflict", "Request already processed", "E_IDEMPOTENCY_CONFLICT"));
      }
      await storage.setIdempotency(idempotencyKey, JSON.stringify(req.body));

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet || wallet.balanceCents < amountCents) {
        return res.status(400).json(createErrorResponse("BadRequest", "Nedostatečný zůstatek", "E_INSUFFICIENT_FUNDS"));
      }

      // Create charge transaction
      const transaction = await storage.createTransaction({
        userId,
        type: "charge",
        amountCents: -amountCents, // Negative for charge
        relatedId: null,
        idempotencyKey,
        createdBy: "admin",
        meta: {
          adminId: req.admin.id,
          posCharge: true
        }
      });

      // Update wallet balance
      const newBalance = wallet.balanceCents - amountCents;
      await storage.updateWalletBalance(userId, newBalance);

      // Store for void tracking (120 seconds)
      const chargeId = randomUUID();
      pendingCharges.set(chargeId, {
        userId,
        amountCents,
        createdAt: Date.now(),
        adminId: req.admin.id
      });

      // Clean up after 120 seconds
      setTimeout(() => {
        pendingCharges.delete(chargeId);
      }, 120000);

      await auditLog("admin", req.admin.id, "pos_charge", { 
        userId, 
        amountCents, 
        transactionId: transaction.id 
      });

      res.json({ 
        success: true, 
        transactionId: transaction.id,
        chargeId,
        voidExpiresAt: Date.now() + 120000,
        newBalanceCZK: formatCZK(newBalance),
        newBalanceCents: newBalance
      });

    } catch (error) {
      console.error("POS charge confirm error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Chyba při zpracování platby", "E_SERVER"));
    }
  });

  app.post("/api/pos/void", authenticatePOS, async (req, res) => {
    try {
      const { chargeId } = z.object({
        chargeId: z.string().uuid()
      }).parse(req.body);

      const charge = pendingCharges.get(chargeId);
      if (!charge) {
        return res.status(400).json(createErrorResponse("BadRequest", "Platba nenalezena nebo již nelze stornovat", "E_INPUT"));
      }

      // Check if within 120 seconds
      if (Date.now() - charge.createdAt > 120000) {
        pendingCharges.delete(chargeId);
        return res.status(400).json(createErrorResponse("BadRequest", "Platba již nelze stornovat", "E_INPUT"));
      }

      // Process void
      const voidIdempotencyKey = `void-${chargeId}-${Date.now()}`;

      // Create void transaction
      const transaction = await storage.createTransaction({
        userId: charge.userId,
        type: "void",
        amountCents: charge.amountCents, // Positive to restore balance
        relatedId: null,
        idempotencyKey: voidIdempotencyKey,
        createdBy: "admin",
        meta: {
          adminId: req.admin.id,
          originalChargeId: chargeId,
          posVoid: true
        }
      });

      // Update wallet balance
      const wallet = await storage.getWalletByUserId(charge.userId);
      if (wallet) {
        const newBalance = wallet.balanceCents + charge.amountCents;
        await storage.updateWalletBalance(charge.userId, newBalance);
      }

      pendingCharges.delete(chargeId);

      await auditLog("admin", req.admin.id, "pos_void", { 
        chargeId, 
        userId: charge.userId, 
        amountCents: charge.amountCents,
        transactionId: transaction.id
      });

      res.json({ success: true });

    } catch (error) {
      console.error("POS void error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Chyba při stornování platby", "E_SERVER"));
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}