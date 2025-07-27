import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, uuid, timestamp, jsonb, pgEnum, boolean, inet, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const txnTypeEnum = pgEnum("txn_type", ["topup", "charge", "void", "adjustment"]);
export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);
export const adminRoleEnum = pgEnum("admin_role", ["manager", "staff"]);
export const actorTypeEnum = pgEnum("actor_type", ["user", "admin", "system"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // Optional for Google OAuth users
  googleId: text("google_id").unique(), // For Google OAuth
  profileImageUrl: text("profile_image_url"), // From Google profile
  status: userStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  lastLoginAt: timestamp("last_login_at")
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balanceCents: integer("balance_cents").default(0).notNull(),
  bonusGrantedTotalCents: integer("bonus_granted_total_cents").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at")
});

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // Optional for Google OAuth users
  googleId: text("google_id").unique(), // For Google OAuth
  profileImageUrl: text("profile_image_url"), // From Google profile
  role: adminRoleEnum("role").default("manager").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  lastLoginAt: timestamp("last_login_at")
});

// Refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  userAgent: text("user_agent"),
  ip: inet("ip"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at")
});

// Admin sessions table
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").references(() => adminUsers.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  ip: inet("ip"),
  userAgent: text("user_agent")
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  meta: jsonb("meta").default({}).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull()
});

// Transactions table (immutable ledger)
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: txnTypeEnum("type").notNull(),
  amountCents: integer("amount_cents").notNull(), // + credit, - debit
  relatedId: uuid("related_id"), // e.g. charge_id or topup_id
  idempotencyKey: text("idempotency_key"),
  createdBy: text("created_by").notNull(), // 'user' | 'admin' | 'system'
  meta: jsonb("meta").default({}).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull()
}, (table) => ({
  idempotencyKeyIdx: unique("idx_txn_idem").on(table.idempotencyKey),
  userTimeIdx: index("idx_txn_user_time").on(table.userId, table.createdAt)
}));

// Idempotency keys table
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  firstSeenAt: timestamp("first_seen_at").default(sql`now()`).notNull(),
  requestHash: text("request_hash").notNull()
});

// Metrics daily table (optional)
export const metricsDaily = pgTable("metrics_daily", {
  date: text("date").primaryKey(), // YYYY-MM-DD format
  membersCount: integer("members_count").notNull(),
  liabilityCents: integer("liability_cents").notNull(),
  bonusGrantedCents: integer("bonus_granted_cents").notNull(),
  spendCents: integer("spend_cents").notNull()
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets),
  refreshTokens: many(refreshTokens),
  transactions: many(transactions)
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id]
  })
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions)
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminSessions.adminId],
    references: [adminUsers.id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  passwordHash: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;

// Top-up package constants
export const TOP_UP_PACKAGES = {
  MINI: { pay: 39000, bonus: 3000, total: 42000 }, // amounts in cents
  STANDARD: { pay: 89000, bonus: 9000, total: 98000 },
  MAXI: { pay: 159000, bonus: 23000, total: 182000 },
  ULTRA: { pay: 209000, bonus: 40000, total: 249000 }
} as const;

export type PackageCode = keyof typeof TOP_UP_PACKAGES;
