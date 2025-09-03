import { z } from 'zod'

// Error codes as specified in section 4.5
export const LedgerErrorCode = z.enum([
  'INSUFFICIENT_FUNDS',
  'TX_NOT_FOUND', 
  'REVERSAL_ALREADY_EXISTS',
  'REVERSAL_FORBIDDEN_TYPE',
  'VALIDATION_FAILED',
  'LEDGER_INVARIANT_BROKEN',
  'FORBIDDEN_DEV_ENDPOINT'
])
export type LedgerErrorCode = z.infer<typeof LedgerErrorCode>

// Base error response envelope
export const LedgerErrorResponse = z.object({
  error: LedgerErrorCode,
  message: z.string(),
  details: z.any().optional()
})
export type LedgerErrorResponse = z.infer<typeof LedgerErrorResponse>

// Transaction types
export const LedgerTransactionType = z.enum(['topup', 'charge', 'bonus', 'reversal'])
export type LedgerTransactionType = z.infer<typeof LedgerTransactionType>

// Entry sides  
export const LedgerEntrySide = z.enum(['debit', 'credit'])
export type LedgerEntrySide = z.infer<typeof LedgerEntrySide>

// Account codes
export const AccountCode = z.enum(['1000', '2000', '4000', '5000'])
export type AccountCode = z.infer<typeof AccountCode>

// Trial balance status
export const TrialBalanceStatus = z.enum(['ok', 'mismatch'])
export type TrialBalanceStatus = z.infer<typeof TrialBalanceStatus>

// Core data types
export const LedgerTransaction = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  type: LedgerTransactionType,
  originRef: z.string().nullable(),
  reversalOf: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  context: z.record(z.any()).default({})
})
export type LedgerTransaction = z.infer<typeof LedgerTransaction>

export const LedgerEntry = z.object({
  id: z.string().uuid(),
  txId: z.string().uuid(),
  accountCode: z.number().int(),
  userId: z.string().uuid().nullable(),
  side: LedgerEntrySide,
  amountMinor: z.number().int().positive()
})
export type LedgerEntry = z.infer<typeof LedgerEntry>

export const AccountBalance = z.object({
  id: z.string().uuid(),
  accountCode: z.number().int(),
  userId: z.string().uuid().nullable(),
  balanceMinor: z.number().int(),
  updatedAt: z.string()
})
export type AccountBalance = z.infer<typeof AccountBalance>

export const TrialBalanceDaily = z.object({
  asOfDate: z.string(),
  sumDebit: z.number().int(),
  sumCredit: z.number().int(),
  delta: z.number().int(),
  status: TrialBalanceStatus,
  details: z.record(z.any()).optional()
})
export type TrialBalanceDaily = z.infer<typeof TrialBalanceDaily>

// 4.1 Health endpoint
export const HealthResponse = z.object({
  ok: z.literal(true),
  version: z.string(),
  accounts: z.array(z.string()).length(4),
  featureFlags: z.object({
    LEDGER_ENABLED: z.boolean(),
    LEDGER_DEV_ENDPOINTS_ENABLED: z.boolean()
  })
})
export type HealthResponse = z.infer<typeof HealthResponse>

// 4.2 Balances & transactions
export const GetBalanceResponse = z.object({
  userId: z.string().uuid(),
  balanceMinor: z.number().int(),
  updatedAt: z.string()
})
export type GetBalanceResponse = z.infer<typeof GetBalanceResponse>

export const GetTransactionResponse = z.object({
  transaction: LedgerTransaction,
  entries: z.array(LedgerEntry).length(2)
})
export type GetTransactionResponse = z.infer<typeof GetTransactionResponse>

// Query parameters for transaction list
export const GetTransactionsQuery = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  cursor: z.string().optional()
})
export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuery>

export const GetTransactionsResponse = z.object({
  transactions: z.array(LedgerTransaction),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean()
})
export type GetTransactionsResponse = z.infer<typeof GetTransactionsResponse>

// 4.3 Dev-only operations
export const DevTopupRequest = z.object({
  userId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  note: z.string().optional()
})
export type DevTopupRequest = z.infer<typeof DevTopupRequest>

export const DevChargeRequest = z.object({
  userId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  note: z.string().optional()
})
export type DevChargeRequest = z.infer<typeof DevChargeRequest>

export const DevBonusRequest = z.object({
  userId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  reason: z.string()
})
export type DevBonusRequest = z.infer<typeof DevBonusRequest>

export const DevReversalRequest = z.object({
  txId: z.string().uuid()
})
export type DevReversalRequest = z.infer<typeof DevReversalRequest>

export const DevOperationResponse = z.object({
  txId: z.string().uuid()
})
export type DevOperationResponse = z.infer<typeof DevOperationResponse>

export const DevReversalResponse = z.object({
  reversalTxId: z.string().uuid()
})
export type DevReversalResponse = z.infer<typeof DevReversalResponse>

// 4.4 Customer search
export const CustomerSearchQuery = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional()
})
export type CustomerSearchQuery = z.infer<typeof CustomerSearchQuery>

export const CustomerInfo = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  ledgerBalance: z.number().int(),
  legacyBalance: z.number().int()
})
export type CustomerInfo = z.infer<typeof CustomerInfo>

export const CustomerSearchResponse = z.object({
  customers: z.array(CustomerInfo)
})
export type CustomerSearchResponse = z.infer<typeof CustomerSearchResponse>

// 4.5 Trial balance
export const TrialBalanceRunResponse = z.object({
  status: TrialBalanceStatus,
  sumDebit: z.number().int(),
  sumCredit: z.number().int(),
  delta: z.number().int()
})
export type TrialBalanceRunResponse = z.infer<typeof TrialBalanceRunResponse>

// HTTP status code mappings for error codes
export const ERROR_HTTP_MAPPING = {
  INSUFFICIENT_FUNDS: 409,
  TX_NOT_FOUND: 404,
  REVERSAL_ALREADY_EXISTS: 409,
  REVERSAL_FORBIDDEN_TYPE: 409,
  VALIDATION_FAILED: 422,
  LEDGER_INVARIANT_BROKEN: 500,
  FORBIDDEN_DEV_ENDPOINT: 403
} as const

// Helper to create error response
export function createLedgerError(
  code: LedgerErrorCode,
  message: string,
  details?: any
): LedgerErrorResponse {
  return { error: code, message, details }
}

// Helper to get HTTP status for error code
export function getHttpStatusForError(code: LedgerErrorCode): number {
  return ERROR_HTTP_MAPPING[code]
}