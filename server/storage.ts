import { users, wallets, adminUsers, refreshTokens, adminSessions, transactions, auditLogs, idempotencyKeys, type User, type InsertUser, type Wallet, type AdminUser, type InsertAdminUser, type Transaction, type InsertTransaction, type AuditLog, type InsertAuditLog, type RefreshToken, type AdminSession } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, sum, gte, lt, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { passwordHash: string }): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;

  // Wallet operations
  getWalletByUserId(userId: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, balanceCents: number, bonusCents?: number): Promise<Wallet>;

  // Admin operations
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser & { passwordHash: string }): Promise<AdminUser>;
  updateAdminLastLogin(id: string): Promise<void>;

  // Refresh token operations
  createRefreshToken(token: Omit<RefreshToken, "id" | "createdAt">): Promise<RefreshToken>;
  storeRefreshToken(data: { userId: string; tokenId: string; deviceId: string; ip: string; userAgent: string; expiresAt: Date }): Promise<void>;
  getRefreshToken(tokenHash: string): Promise<RefreshToken | undefined>;
  markRefreshTokenUsed(tokenId: string): Promise<void>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;

  // Token blacklisting operations
  isTokenBlacklisted(jti: string): Promise<boolean>;
  blacklistToken(jti: string, expiresAt: Date): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;

  // Admin session operations
  createAdminSession(session: Omit<AdminSession, "id" | "createdAt">): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  revokeAdminSession(sessionId: string): Promise<void>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number, cursor?: string): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;

  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<void>;

  // Idempotency operations
  checkIdempotency(key: string, requestHash: string): Promise<boolean>;
  setIdempotency(key: string, requestHash: string): Promise<void>;

  // Admin queries
  getCustomersList(search?: string, limit?: number, offset?: number): Promise<{ users: (User & { wallet: Wallet })[], total: number }>;
  getSummaryStats(): Promise<{
    membersCount: number;
    liabilityCents: number;
    bonusGrantedTotalCents: number;
    spendTodayCents: number;
    spendWeekCents: number;
  }>;
  getDashboardStats(): Promise<{
    todayTotalCents: number;
    todayCount: number;
    membersCount: number;
  }>;
  getRecentTransactions(limit?: number): Promise<(Transaction & { user: { name: string } })[]>;
}

export class DatabaseStorage implements IStorage {
  private db = db;

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(user: InsertUser & { passwordHash?: string | null }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();

    // Create wallet for new user
    await this.createWallet(newUser.id);

    return newUser;
  }

  async createUserWithGoogle(googleData: {
    googleId: string;
    email: string;
    name: string;
    profileImageUrl?: string;
  }): Promise<User> {
    return this.createUser({
      email: googleData.email,
      name: googleData.name,
      googleId: googleData.googleId,
      profileImageUrl: googleData.profileImageUrl,
      passwordHash: null,
      status: "active"
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(userId: string): Promise<Wallet> {
    try {
      const [wallet] = await db
        .insert(wallets)
        .values({ userId, balanceCents: 0, bonusGrantedTotalCents: 0 })
        .returning();
      return wallet;
    } catch (error: any) {
      // If wallet already exists, return the existing one
      if (error.code === '23505' && error.constraint === 'wallets_user_id_unique') {
        const existingWallet = await this.getWalletByUserId(userId);
        if (existingWallet) {
          return existingWallet;
        }
      }
      throw error;
    }
  }

  async updateWalletBalance(userId: string, newBalanceCents: number, bonusCents?: number): Promise<Wallet> {
    const updateData: any = {
      balanceCents: newBalanceCents,
      lastActivityAt: new Date()
    };

    if (bonusCents !== undefined) {
      updateData.bonusGrantedTotalCents = sql`${wallets.bonusGrantedTotalCents} + ${bonusCents}`;
    }

    const [wallet] = await db
      .update(wallets)
      .set(updateData)
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string, limit: number = 20, cursor?: string): Promise<Transaction[]> {
    let whereConditions = [eq(transactions.userId, userId)];

    if (cursor) {
      whereConditions.push(lt(transactions.createdAt, new Date(cursor)));
    }

    return await db
      .select()
      .from(transactions)
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin || undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin || undefined;
  }

  async createAdminUser(admin: InsertAdminUser & { passwordHash: string }): Promise<AdminUser> {
    const [newAdmin] = await db
      .insert(adminUsers)
      .values(admin)
      .returning();
    return newAdmin;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, id));
  }

  async createRefreshToken(token: Omit<RefreshToken, "id" | "createdAt">): Promise<RefreshToken> {
    const [newToken] = await db
      .insert(refreshTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async storeRefreshToken(data: {
    userId: string;
    tokenId: string;
    deviceId: string;
    ip: string;
    userAgent: string;
    expiresAt: Date;
  }) {
    // Check if this is an admin user
    const isAdmin = await this.getAdminUser(data.userId);
    
    if (isAdmin) {
      // For admin users, store token but with a special marker to avoid FK constraint
      // We'll use a placeholder user ID that exists in users table or skip FK validation
      // Remove any existing admin tokens for this device
      await db.delete(refreshTokens)
        .where(and(
          eq(refreshTokens.userId, data.userId),
          eq(refreshTokens.userAgent, data.userAgent)
        ));

      // Insert new refresh token with admin flag in userAgent field
      await db.insert(refreshTokens).values({
        userId: data.userId,
        tokenHash: data.tokenId,
        userAgent: `ADMIN:${data.userAgent}`, // Mark as admin token
        ip: data.ip,
        expiresAt: data.expiresAt
      });
    } else {
      // Regular user tokens
      // Remove any existing tokens for this device to prevent accumulation
      await db.delete(refreshTokens)
        .where(and(
          eq(refreshTokens.userId, data.userId),
          eq(refreshTokens.userAgent, data.userAgent)
        ));

      // Insert new refresh token
      await db.insert(refreshTokens).values({
        userId: data.userId,
        tokenHash: data.tokenId, // Store token ID as hash
        userAgent: data.userAgent,
        ip: data.ip,
        expiresAt: data.expiresAt
      });
    }
  }

  async markRefreshTokenUsed(tokenId: string) {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenId));
  }

  async revokeRefreshToken(tokenId: string) {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenId));
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(eq(refreshTokens.userId, userId));
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    // For now, disable blacklisting since we don't have a dedicated blacklist table
    // TODO: Implement proper blacklist table for access tokens in production
    return false;
  }

  async blacklistToken(jti: string, expiresAt: Date): Promise<void> {
    // Mark token as revoked to blacklist it
    await db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(eq(refreshTokens.tokenHash, jti));
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.revokeAllUserRefreshTokens(userId);
  }

  async createAdminSession(session: Omit<AdminSession, "id" | "createdAt">): Promise<AdminSession> {
    const [newSession] = await db
      .insert(adminSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(and(
        eq(adminSessions.id, sessionId),
        isNull(adminSessions.revokedAt),
        gte(adminSessions.expiresAt, sql`now()`)
      ));
    return session || undefined;
  }

  async revokeAdminSession(sessionId: string): Promise<void> {
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.id, sessionId));
  }

  async getRefreshToken(tokenId: string): Promise<RefreshToken | undefined> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenId));
    return token || undefined;
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createAuditLog(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(log);
  }

  // Enhanced audit logging for new auth system
  async createEnhancedAuditLog(data: {
    event: string;
    userId: string | null;
    ip: string;
    userAgent: string;
    meta: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      actorType: data.userId ? "user" : "system",
      actorId: data.userId,
      action: data.event,
      meta: data.meta
    });
  }

  async checkIdempotency(key: string, requestHash: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key));

    if (!existing) return false;
    return existing.requestHash === requestHash;
  }

  async setIdempotency(key: string, requestHash: string): Promise<void> {
    await db
      .insert(idempotencyKeys)
      .values({ key, requestHash })
      .onConflictDoNothing();
  }

  async getCustomersList(search?: string, limit: number = 50, offset: number = 0): Promise<{ users: (User & { wallet: Wallet })[], total: number }> {
    let whereCondition = undefined;

    if (search) {
      whereCondition = sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`;
    }

    const results = await db
      .select({
        user: users,
        wallet: wallets
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(whereCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    const [totalResult] = await db
      .select({ count: count() })
      .from(users);

    return {
      users: results.map(r => ({ ...r.user, wallet: r.wallet! })),
      total: totalResult.count
    };
  }



  async getSummaryStats(): Promise<{
    membersCount: number;
    liabilityCents: number;
    bonusGrantedTotalCents: number;
    spendTodayCents: number;
    spendWeekCents: number;
  }> {
    const [membersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"));

    const [liabilityResult] = await db
      .select({ 
        total: sum(wallets.balanceCents),
        bonusTotal: sum(wallets.bonusGrantedTotalCents)
      })
      .from(wallets);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todaySpendResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, "charge"),
        gte(transactions.createdAt, today)
      ));

    const [weekSpendResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, "charge"),
        gte(transactions.createdAt, weekAgo)
      ));

    return {
      membersCount: membersResult.count,
      liabilityCents: Number(liabilityResult.total || 0),
      bonusGrantedTotalCents: Number(liabilityResult.bonusTotal || 0),
      spendTodayCents: Number(todaySpendResult.total || 0),
      spendWeekCents: Number(weekSpendResult.total || 0)
    };
  }

  async getDashboardStats(): Promise<{
    todayTotalCents: number;
    todayCount: number;
    membersCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [membersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"));

    const [todayStatsResult] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
        count: count()
      })
      .from(transactions)
      .where(and(
        eq(transactions.type, "charge"),
        gte(transactions.createdAt, today)
      ));

    return {
      todayTotalCents: Number(todayStatsResult.total || 0),
      todayCount: Number(todayStatsResult.count || 0),
      membersCount: membersResult.count
    };
  }

  async getRecentTransactions(limit: number = 10): Promise<(Transaction & { user: { name: string } })[]> {
    return await db
      .select({
        transaction: transactions,
        user: { name: users.name }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .then(results => results.map(r => ({ ...r.transaction, user: r.user! })));
  }




}

export const storage = new DatabaseStorage();