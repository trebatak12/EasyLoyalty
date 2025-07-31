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
  getRefreshToken(tokenHash: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;

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

  async getRefreshToken(tokenHash: string): Promise<RefreshToken | undefined> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gte(refreshTokens.expiresAt, sql`now()`)
      ));
    return token || undefined;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(eq(refreshTokens.userId, userId));
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



  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createAuditLog(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(log);
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

  async getDashboardStats(): Promise<{
    todayTotalCents: number;
    todayCount: number;
    membersCount: number;
  }>;

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

  // 🔒 Secure token management
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.db.execute(sql`
      INSERT INTO token_blacklist (jti, expires_at) 
      VALUES (${jti}, ${expiresAt})
      ON CONFLICT (jti) DO NOTHING
    `);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 FROM token_blacklist 
      WHERE jti = ${jti} AND expires_at > NOW()
      LIMIT 1
    `);
    return result.rowCount > 0;
  }

  // Enhanced refresh token management with rotation
  async storeRefreshToken(data: {
    userId: string;
    tokenId: string;
    deviceId: string;
    ip: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO refresh_tokens_v2 
      (user_id, token_id, device_id, ip_address, user_agent, expires_at)
      VALUES (${data.userId}, ${data.tokenId}, ${data.deviceId}, ${data.ip}, ${data.userAgent}, ${data.expiresAt})
    `);
  }

  async getRefreshToken(tokenId: string): Promise<{ userId: string; used: boolean } | null> {
    const result = await this.db.execute(sql`
      SELECT user_id, used FROM refresh_tokens_v2 
      WHERE token_id = ${tokenId} AND expires_at > NOW()
      LIMIT 1
    `);

    return result.rows[0] ? {
      userId: result.rows[0].user_id as string,
      used: result.rows[0].used as boolean
    } : null;
  }

  async markRefreshTokenUsed(tokenId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE refresh_tokens_v2 
      SET used = TRUE 
      WHERE token_id = ${tokenId}
    `);
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM refresh_tokens_v2 
      WHERE token_id = ${tokenId}
    `);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM refresh_tokens_v2 
      WHERE user_id = ${userId}
    `);
  }

  // User roles management
  async getUserRoles(userId: string): Promise<string[]> {
    const result = await this.db.execute(sql`
      SELECT role FROM user_roles 
      WHERE user_id = ${userId}
    `);
    return result.rows.map(row => row.role as string);
  }

  // Enhanced audit logging
  async createAuditLog(data: {
    event: string;
    userId: string | null;
    ip: string;
    userAgent: string;
    meta: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO auth_audit_log 
      (event, user_id, ip_address, user_agent, metadata, created_at)
      VALUES (${data.event}, ${data.userId}, ${data.ip}, ${data.userAgent}, ${JSON.stringify(data.meta)}, ${data.timestamp})
    `);
  }
}

export const storage = new DatabaseStorage();