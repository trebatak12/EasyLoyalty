import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, uuid, timestamp, jsonb, pgEnum, boolean, inet, unique, index, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const txnTypeEnum = pgEnum("txn_type", ["topup", "charge", "void", "adjustment"]);
export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);
export const adminRoleEnum = pgEnum("admin_role", ["manager", "staff"]);
export const actorTypeEnum = pgEnum("actor_type", ["user", "admin", "system"]);
export const resetTokenStatusEnum = pgEnum("reset_token_status", ["active", "used", "revoked", "expired"]);

// Keystore enums
export const keyPurposeEnum = pgEnum("key_purpose", ["access_jwt", "refresh_jwt", "qr_jwt", "webhook_hmac"]);
export const keyStatusEnum = pgEnum("key_status", ["active", "retiring", "retired", "revoked"]);
export const keyEventEnum = pgEnum("key_event", ["sign_ok", "sign_fail", "verify_ok", "verify_fail", "jwks_served"]);

// Ledger enums
export const ledgerTransactionTypeEnum = pgEnum("ledger_transaction_type", ["topup", "charge", "bonus", "reversal"]);
export const ledgerEntrySideEnum = pgEnum("ledger_entry_side", ["debit", "credit"]);
export const trialBalanceStatusEnum = pgEnum("trial_balance_status", ["ok", "mismatch"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // Optional for Google OAuth users
  googleId: text("google_id").unique(), // For Google OAuth
  profileImageUrl: text("profile_image_url"), // From Google profile
  status: userStatusEnum("status").default("active").notNull(),
  passwordChangedAt: timestamp("password_changed_at"),
  tokenVersion: integer("token_version").default(0).notNull(),
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
  passwordChangedAt: timestamp("password_changed_at"),
  tokenVersion: integer("token_version").default(0).notNull(),
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

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: resetTokenStatusEnum("status").default("active").notNull(),
  ipRequest: inet("ip_request"),
  uaRequest: text("ua_request"),
  ipConsume: inet("ip_consume"),
  uaConsume: text("ua_consume"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull()
}, (table) => ({
  userIdIdx: index("idx_password_reset_user_id").on(table.userId),
  expiresAtIdx: index("idx_password_reset_expires_at").on(table.expiresAt),
  statusIdx: index("idx_password_reset_status").on(table.status)
}));

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

// Keys table (keystore)
export const keys = pgTable("keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kid: text("kid").notNull().unique(),
  purpose: keyPurposeEnum("purpose").notNull(),
  alg: text("alg").notNull(), // ES256 pro JWS; HMAC pro webhook
  status: keyStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  notAfter: timestamp("not_after"), // plán pro vyřazení
  publicMaterial: text("public_material"), // u ES256 public JWK; u HMAC NULL
  privateMaterialEncrypted: text("private_material_encrypted").notNull(), // šifrovaný privátní JWK/secret
  notes: text("notes")
}, (table) => ({
  purposeStatusIdx: index("idx_keys_purpose_status").on(table.purpose, table.status)
}));

// Key audit table (lehké auditování bez PII)
export const keyAudit = pgTable("key_audit", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kid: text("kid").notNull(),
  purpose: keyPurposeEnum("purpose").notNull(),
  event: keyEventEnum("event").notNull(),
  at: timestamp("at").default(sql`now()`).notNull(),
  context: jsonb("context").default({}).notNull()
});

// Ledger transactions table
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  type: ledgerTransactionTypeEnum("type").notNull(),
  originRef: text("origin_ref"),
  reversalOf: uuid("reversal_of"),
  createdBy: uuid("created_by"),
  context: jsonb("context").default({}).notNull()
}, (table) => ({
  reversalOfUnique: unique("ledger_tx_reversal_of_unique").on(table.reversalOf),
  createdAtIdx: index("idx_ledger_tx_created_at").on(table.createdAt),
  reversalOfFk: sql`FOREIGN KEY (reversal_of) REFERENCES ledger_transactions(id)`
}));

// Ledger entries table
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  txId: uuid("tx_id").references(() => ledgerTransactions.id, { onDelete: "cascade" }).notNull(),
  accountCode: integer("account_code").notNull(),
  userId: uuid("user_id"),
  side: ledgerEntrySideEnum("side").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull()
}, (table) => ({
  txIdIdx: index("idx_ledger_entries_tx_id").on(table.txId),
  userAccountTxIdx: index("idx_ledger_entries_user_account_tx").on(table.userId, table.accountCode, table.txId),
  amountPositiveCheck: sql`CHECK (amount_minor > 0)`
}));

// Account balances table (cache)
export const accountBalances = pgTable("account_balances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountCode: integer("account_code").notNull(),
  userId: uuid("user_id"),
  balanceMinor: bigint("balance_minor", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull()
}, (table) => ({
  accountCodeIdx: index("idx_account_balances_account_code").on(table.accountCode),
  // Check constraints for account/user relationships
  customerCreditsUserRequired: sql`CHECK ((account_code = 2000 AND user_id IS NOT NULL) OR account_code != 2000)`,
  globalAccountsUserNull: sql`CHECK ((account_code IN (1000, 4000, 5000) AND user_id IS NULL) OR account_code NOT IN (1000, 4000, 5000))`,
  customerCreditsBalanceNonNegative: sql`CHECK ((account_code != 2000) OR (account_code = 2000 AND balance_minor >= 0))`
}));

// Trial balance daily table
export const trialBalanceDaily = pgTable("trial_balance_daily", {
  asOfDate: text("as_of_date").primaryKey(), // YYYY-MM-DD format (UTC date)
  sumDebit: bigint("sum_debit", { mode: "number" }).notNull(),
  sumCredit: bigint("sum_credit", { mode: "number" }).notNull(),
  delta: bigint("delta", { mode: "number" }).notNull(),
  status: trialBalanceStatusEnum("status").notNull(),
  details: jsonb("details")
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets),
  refreshTokens: many(refreshTokens),
  transactions: many(transactions),
  passwordResetTokens: many(passwordResetTokens)
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
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

export const ledgerTransactionsRelations = relations(ledgerTransactions, ({ many, one }) => ({
  entries: many(ledgerEntries),
  reversals: many(ledgerTransactions, {
    relationName: "reversals"
  }),
  original: one(ledgerTransactions, {
    fields: [ledgerTransactions.reversalOf],
    references: [ledgerTransactions.id],
    relationName: "reversals"
  })
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  transaction: one(ledgerTransactions, {
    fields: [ledgerEntries.txId],
    references: [ledgerTransactions.id]
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
  passwordHash: true,
  passwordChangedAt: true,
  tokenVersion: true
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

export const insertKeySchema = createInsertSchema(keys).omit({
  id: true,
  createdAt: true
});

export const insertKeyAuditSchema = createInsertSchema(keyAudit).omit({
  id: true,
  at: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});

export const insertLedgerTransactionSchema = createInsertSchema(ledgerTransactions).omit({
  id: true,
  createdAt: true
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({
  id: true
});

export const insertAccountBalanceSchema = createInsertSchema(accountBalances).omit({
  id: true,
  updatedAt: true
});

export const insertTrialBalanceDailySchema = createInsertSchema(trialBalanceDaily);

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
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type Key = typeof keys.$inferSelect;
export type InsertKey = z.infer<typeof insertKeySchema>;
export type KeyAudit = typeof keyAudit.$inferSelect;
export type InsertKeyAudit = z.infer<typeof insertKeyAuditSchema>;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type InsertLedgerTransaction = z.infer<typeof insertLedgerTransactionSchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type AccountBalance = typeof accountBalances.$inferSelect;
export type InsertAccountBalance = z.infer<typeof insertAccountBalanceSchema>;
export type TrialBalanceDaily = typeof trialBalanceDaily.$inferSelect;
export type InsertTrialBalanceDaily = z.infer<typeof insertTrialBalanceDailySchema>;

// Top-up package constants
export const TOP_UP_PACKAGES = {
  MINI: { pay: 39000, bonus: 3000, total: 42000 }, // amounts in cents
  STANDARD: { pay: 89000, bonus: 9000, total: 98000 },
  MAXI: { pay: 159000, bonus: 23000, total: 182000 },
  ULTRA: { pay: 209000, bonus: 40000, total: 249000 }
} as const;

export type PackageCode = keyof typeof TOP_UP_PACKAGES;
