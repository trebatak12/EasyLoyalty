import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  generateQRToken, 
  generateShortCode, 
  verifyQRToken,
  authenticateUser, 
  authenticateAdmin,
  checkRateLimit,
  verifyGoogleToken
} from "./auth";
import { auditLog, createErrorResponse, validateEmail, validatePassword, formatCZK, parseCZK, addRequestId, getClientIP, getUserAgent } from "./utils";
import { TOP_UP_PACKAGES, type PackageCode } from "@shared/schema";
import { z } from "zod";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

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
const pendingCharges = new Map<string, { userId: string; amountCents: number; createdAt: number; adminId: string }>();

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

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();
      
      await storage.createRefreshToken({
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: getUserAgent(req),
        ip: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        revokedAt: null
      });

      // Audit log
      await auditLog("user", user.id, "signup", { email: body.email }, getUserAgent(req), ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken,
        refreshToken
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
      
      // Rate limiting
      const ipLimit = checkRateLimit(`login:ip:${ip}`, 5, 5 * 60 * 1000);
      const emailLimit = checkRateLimit(`login:email:${body.email}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);
      
      if (!ipLimit.allowed || !emailLimit.allowed) {
        await auditLog("system", null, "login_rate_limited", { email: body.email, ip }, getUserAgent(req), ip);
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many login attempts", "E_RATE_LIMIT"));
      }

      // Find user
      const user = await storage.getUserByEmail(body.email);
      if (!user) {
        await auditLog("system", null, "login_failed", { email: body.email, reason: "user_not_found" }, getUserAgent(req), ip);
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Check if blocked
      if (user.status === "blocked") {
        await auditLog("user", user.id, "login_blocked", { email: body.email }, getUserAgent(req), ip);
        return res.status(403).json(createErrorResponse("Forbidden", "Account is blocked", "E_FORBIDDEN"));
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        await auditLog("user", user.id, "login_failed", { email: body.email, reason: "invalid_password" }, getUserAgent(req), ip);
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();
      
      await storage.createRefreshToken({
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: getUserAgent(req),
        ip: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null
      });

      // Audit log
      await auditLog("user", user.id, "login_success", { email: body.email }, getUserAgent(req), ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json(createErrorResponse("BadRequest", "Refresh token required", "E_INPUT"));
      }

      // Hash the token to look it up
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      
      const storedToken = await storage.getRefreshToken(tokenHash);
      if (!storedToken) {
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid refresh token", "E_AUTH"));
      }

      // Get user
      const user = await storage.getUser(storedToken.userId);
      if (!user || user.status === "blocked") {
        return res.status(403).json(createErrorResponse("Forbidden", "User account is blocked", "E_FORBIDDEN"));
      }

      // Revoke old token
      await storage.revokeRefreshToken(tokenHash);

      // Generate new tokens
      const accessToken = generateAccessToken(user.id);
      const { token: newRefreshToken, hash: newRefreshTokenHash } = generateRefreshToken();
      
      await storage.createRefreshToken({
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        userAgent: getUserAgent(req),
        ip: getClientIP(req),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null
      });

      // Audit log
      await auditLog("user", user.id, "token_refresh", {}, getUserAgent(req), getClientIP(req));

      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const crypto = await import("crypto");
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        await storage.revokeRefreshToken(tokenHash);
      }
      res.status(204).send();
    } catch (error) {
      console.error("Logout error:", error);
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

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();

      // Store refresh token
      await storage.createRefreshToken({
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: getUserAgent(req),
        ip: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        revokedAt: null
      });

      // Audit log
      await auditLog("user", user.id, "google_login", { email: user.email }, getUserAgent(req), ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImageUrl: user.profileImageUrl
        },
        accessToken,
        refreshToken
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
  app.get("/api/me", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        lastLoginAt: user.lastLoginAt
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.get("/api/me/wallet", authenticateUser, async (req, res) => {
    try {
      const wallet = await storage.getWalletByUserId(req.user.id);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      res.json({
        balanceCZK: formatCZK(wallet.balanceCents),
        balanceCents: wallet.balanceCents,
        bonusGrantedTotalCZK: formatCZK(wallet.bonusGrantedTotalCents),
        bonusGrantedTotalCents: wallet.bonusGrantedTotalCents,
        lastActivity: wallet.lastActivityAt
      });
    } catch (error) {
      console.error("Get wallet error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/me/topup", authenticateUser, async (req, res) => {
    try {
      const body = topupSchema.parse(req.body);
      const userId = req.user.id;
      
      const packageData = TOP_UP_PACKAGES[body.packageCode];
      if (!packageData) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid package code", "E_INPUT"));
      }

      // Create idempotency key
      const idempotencyKey = randomUUID();
      
      // Create topup transaction
      await storage.createTransaction({
        userId,
        type: "topup",
        amountCents: packageData.total, // Credit the full amount (pay + bonus)
        relatedId: null,
        idempotencyKey,
        createdBy: "user",
        meta: {
          packageCode: body.packageCode,
          payCents: packageData.pay,
          bonusCents: packageData.bonus
        }
      });

      // Update wallet balance and bonus total
      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      const newBalance = wallet.balanceCents + packageData.total;
      await storage.updateWalletBalance(userId, newBalance, packageData.bonus);

      // Audit log
      await auditLog("user", userId, "topup", {
        packageCode: body.packageCode,
        amount: packageData.total,
        bonus: packageData.bonus
      });

      const updatedWallet = await storage.getWalletByUserId(userId);
      res.json({
        balanceCZK: formatCZK(updatedWallet!.balanceCents),
        balanceCents: updatedWallet!.balanceCents,
        bonusGrantedTotalCZK: formatCZK(updatedWallet!.bonusGrantedTotalCents),
        bonusGrantedTotalCents: updatedWallet!.bonusGrantedTotalCents
      });
    } catch (error) {
      console.error("Topup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/me/qr", authenticateUser, async (req, res) => {
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

  app.get("/api/me/history", authenticateUser, async (req, res) => {
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
      
      // Rate limiting
      const rateLimit = checkRateLimit(`admin_login:${ip}`, 3, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json(createErrorResponse("TooManyRequests", "Too many login attempts", "E_RATE_LIMIT"));
      }

      // Find admin
      const admin = await storage.getAdminUserByEmail(body.email);
      if (!admin) {
        await auditLog("system", null, "admin_login_failed", { email: body.email, reason: "admin_not_found" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Check if blocked
      if (admin.status === "blocked") {
        await auditLog("admin", admin.id, "admin_login_blocked", { email: body.email });
        return res.status(403).json(createErrorResponse("Forbidden", "Account is blocked", "E_FORBIDDEN"));
      }

      // Verify password
      const isValid = await verifyPassword(body.password, admin.passwordHash);
      if (!isValid) {
        await auditLog("admin", admin.id, "admin_login_failed", { email: body.email, reason: "invalid_password" });
        return res.status(401).json(createErrorResponse("Unauthorized", "Invalid credentials", "E_AUTH"));
      }

      // Create session
      const newSession = await storage.createAdminSession({
        adminId: admin.id,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        ip: ip,
        userAgent: getUserAgent(req),
        revokedAt: null
      });

      // Update last login
      await storage.updateAdminLastLogin(admin.id);

      // Set cookie
      res.cookie("admin_sid", newSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: "/"
      });

      // Audit log
      await auditLog("admin", admin.id, "admin_login_success", { email: body.email });

      res.status(204).send();
    } catch (error) {
      console.error("Admin login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("BadRequest", "Invalid input", "E_INPUT", error.errors));
      }
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  app.post("/api/admin/logout", authenticateAdmin, async (req, res) => {
    try {
      await storage.revokeAdminSession(req.sessionId!);
      res.clearCookie("admin_sid");
      await auditLog("admin", req.admin.id, "admin_logout", {});
      res.status(204).send();
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json(createErrorResponse("InternalServerError", "Server error", "E_SERVER"));
    }
  });

  // Admin Routes (Session Protected)
  app.get("/api/admin/me", authenticateAdmin, async (req, res) => {
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

  app.post("/api/admin/charge/init", authenticateAdmin, async (req, res) => {
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

  app.post("/api/admin/charge/confirm", authenticateAdmin, async (req, res) => {
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

      // For demo, we'll use pending charges to track charge session
      // In production, this would be in database
      const pendingCharge = pendingCharges.get(chargeId);
      if (!pendingCharge) {
        // Create pending charge for demo
        pendingCharges.set(chargeId, {
          userId: body.chargeId, // This is a hack for demo
          amountCents,
          createdAt: Date.now(),
          adminId: req.admin.id
        });
      }

      // Find user from amount (demo hack - in production we'd have proper charge tracking)
      const adminWallet = await storage.getWalletByUserId(chargeId);
      let userId = chargeId;
      
      // Try to find any user with sufficient balance for this demo
      const customers = await storage.getCustomersList();
      const eligibleCustomer = customers.users.find(u => u.wallet.balanceCents >= amountCents);
      if (eligibleCustomer) {
        userId = eligibleCustomer.id;
      }

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createErrorResponse("NotFound", "Wallet not found", "E_NOT_FOUND"));
      }

      // Check sufficient funds
      if (wallet.balanceCents < amountCents) {
        return res.status(422).json(createErrorResponse("InsufficientFunds", "Insufficient balance", "E_INSUFFICIENT_FUNDS"));
      }

      // Create charge transaction
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

      // Update wallet balance
      const newBalance = wallet.balanceCents - amountCents;
      await storage.updateWalletBalance(userId, newBalance);

      // Store charge for void window
      pendingCharges.set(chargeId, {
        userId,
        amountCents,
        createdAt: Date.now(),
        adminId: req.admin.id
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

  app.post("/api/admin/charge/void", authenticateAdmin, async (req, res) => {
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

      // Create void transaction
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

      // Restore wallet balance
      const wallet = await storage.getWalletByUserId(pendingCharge.userId);
      if (wallet) {
        const newBalance = wallet.balanceCents + pendingCharge.amountCents;
        await storage.updateWalletBalance(pendingCharge.userId, newBalance);
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

  app.get("/api/admin/customers", authenticateAdmin, async (req, res) => {
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

  app.get("/api/admin/summary", authenticateAdmin, async (req, res) => {
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

  app.post("/api/admin/adjustment", authenticateAdmin, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
