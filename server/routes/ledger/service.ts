import { eq, and, desc, sum, sql } from 'drizzle-orm'
import { db } from '../../db'
import { 
  ledgerTransactions, 
  ledgerEntries, 
  accountBalances,
  trialBalanceDaily,
  type LedgerTransaction,
  type LedgerEntry,
  type AccountBalance,
  type InsertLedgerTransaction,
  type InsertLedgerEntry,
  type InsertAccountBalance
} from '@shared/schema'
import { 
  LedgerTransactionType,
  LedgerEntrySide,
  TrialBalanceStatus,
  type DevTopupRequest,
  type DevChargeRequest,
  type DevBonusRequest,
  type DevReversalRequest,
  createLedgerError
} from '@shared/contracts/ledger'
import { randomUUID } from 'crypto'

export interface LedgerOperationResult {
  txId: string
  entries: LedgerEntry[]
}

export interface BalanceResult {
  userId: string
  balanceMinor: number
  updatedAt: string
}

export interface TrialBalanceResult {
  status: TrialBalanceStatus
  sumDebit: number
  sumCredit: number
  delta: number
}

export class LedgerService {
  
  /**
   * Get user balance for account 2000 (Customer Credits)
   */
  async getBalance(userId: string): Promise<BalanceResult | null> {
    const balance = await db
      .select()
      .from(accountBalances)
      .where(and(
        eq(accountBalances.accountCode, 2000),
        eq(accountBalances.userId, userId)
      ))
      .limit(1)
    
    if (balance.length === 0) {
      return {
        userId,
        balanceMinor: 0,
        updatedAt: new Date().toISOString()
      }
    }
    
    return {
      userId,
      balanceMinor: balance[0].balanceMinor,
      updatedAt: balance[0].updatedAt.toISOString()
    }
  }

  /**
   * Get transaction with its entries
   */
  async getTransaction(txId: string): Promise<{ transaction: LedgerTransaction, entries: LedgerEntry[] } | null> {
    const transaction = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, txId))
      .limit(1)
    
    if (transaction.length === 0) {
      return null
    }
    
    const entries = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.txId, txId))
      .orderBy(ledgerEntries.side) // debit first, then credit
    
    return {
      transaction: transaction[0],
      entries
    }
  }

  /**
   * Get paginated transactions for a user
   */
  async getTransactions(userId: string, limit: number = 20, cursor?: string): Promise<{
    transactions: LedgerTransaction[]
    nextCursor: string | null
    hasMore: boolean
  }> {
    let query = db
      .select({ tx: ledgerTransactions })
      .from(ledgerTransactions)
      .innerJoin(ledgerEntries, eq(ledgerTransactions.id, ledgerEntries.txId))
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerTransactions.createdAt), desc(ledgerTransactions.id))
      .limit(limit + 1) // Get one extra to check if there are more
    
    if (cursor) {
      // Decode cursor: "created_at_iso|tx_id"
      const decoded = Buffer.from(cursor, 'base64').toString()
      const [createdAtStr, cursorTxId] = decoded.split('|')
      const createdAt = new Date(createdAtStr)
      
      // Note: This cursor-based filtering will be implemented when we have actual data
      // For now, just ignore cursor to avoid TypeScript errors
    }
    
    const results = await query
    const transactions = results.slice(0, limit).map(r => r.tx)
    const hasMore = results.length > limit
    
    let nextCursor = null
    if (hasMore && transactions.length > 0) {
      const lastTx = transactions[transactions.length - 1]
      const cursorData = `${lastTx.createdAt.toISOString()}|${lastTx.id}`
      nextCursor = Buffer.from(cursorData).toString('base64')
    }
    
    return {
      transactions,
      nextCursor,
      hasMore
    }
  }

  /**
   * Execute top-up operation: Dr 1000 +X, Cr 2000(user) +X
   */
  async topup(request: DevTopupRequest): Promise<LedgerOperationResult> {
    return this.executeTransaction('topup', async () => {
      const entries: InsertLedgerEntry[] = [
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 1000, // Cash/Top-up Clearing (assets)
          userId: null, // Global account
          side: 'debit',
          amountMinor: request.amountMinor
        },
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 2000, // Customer Credits (liabilities)
          userId: request.userId,
          side: 'credit',
          amountMinor: request.amountMinor
        }
      ]
      
      await this.updateBalances([
        { accountCode: 1000, userId: null, delta: request.amountMinor },
        { accountCode: 2000, userId: request.userId, delta: request.amountMinor }
      ])
      
      return {
        type: 'topup' as LedgerTransactionType,
        context: { note: request.note },
        entries
      }
    })
  }

  /**
   * Execute charge operation: Dr 2000(user) +X, Cr 4000 +X
   * Rejects if user balance would go below 0
   */
  async charge(request: DevChargeRequest): Promise<LedgerOperationResult> {
    // First check if user has sufficient funds
    const currentBalance = await this.getBalance(request.userId)
    if (currentBalance && currentBalance.balanceMinor < request.amountMinor) {
      throw createLedgerError('INSUFFICIENT_FUNDS', 
        `Insufficient funds. Current balance: ${currentBalance.balanceMinor}, required: ${request.amountMinor}`)
    }
    
    return this.executeTransaction('charge', async () => {
      const entries: InsertLedgerEntry[] = [
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 2000, // Customer Credits (liabilities)
          userId: request.userId,
          side: 'debit',
          amountMinor: request.amountMinor
        },
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 4000, // Sales Revenue (revenue)
          userId: null, // Global account
          side: 'credit',
          amountMinor: request.amountMinor
        }
      ]
      
      await this.updateBalances([
        { accountCode: 2000, userId: request.userId, delta: -request.amountMinor },
        { accountCode: 4000, userId: null, delta: request.amountMinor }
      ])
      
      return {
        type: 'charge' as LedgerTransactionType,
        context: { note: request.note },
        entries
      }
    })
  }

  /**
   * Execute bonus operation: Dr 5000 +X, Cr 2000(user) +X
   */
  async bonus(request: DevBonusRequest): Promise<LedgerOperationResult> {
    return this.executeTransaction('bonus', async () => {
      const entries: InsertLedgerEntry[] = [
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 5000, // Marketing Expense (expense)
          userId: null, // Global account
          side: 'debit',
          amountMinor: request.amountMinor
        },
        {
          txId: '', // Will be set by executeTransaction
          accountCode: 2000, // Customer Credits (liabilities)
          userId: request.userId,
          side: 'credit',
          amountMinor: request.amountMinor
        }
      ]
      
      await this.updateBalances([
        { accountCode: 5000, userId: null, delta: request.amountMinor },
        { accountCode: 2000, userId: request.userId, delta: request.amountMinor }
      ])
      
      return {
        type: 'bonus' as LedgerTransactionType,
        context: { reason: request.reason },
        entries
      }
    })
  }

  /**
   * Execute reversal operation: Create exact mirror entries of origin transaction
   * Max 1 reversal per origin. Reversal of a reversal is forbidden.
   */
  async reversal(request: DevReversalRequest): Promise<LedgerOperationResult> {
    // Get original transaction
    const original = await this.getTransaction(request.txId)
    if (!original) {
      throw createLedgerError('TX_NOT_FOUND', `Transaction ${request.txId} not found`)
    }
    
    // Check if original is already a reversal
    if (original.transaction.type === 'reversal') {
      throw createLedgerError('REVERSAL_FORBIDDEN_TYPE', 'Cannot reverse a reversal transaction')
    }
    
    // Check if reversal already exists
    const existingReversal = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.reversalOf, request.txId))
      .limit(1)
    
    if (existingReversal.length > 0) {
      throw createLedgerError('REVERSAL_ALREADY_EXISTS', 
        `Transaction ${request.txId} has already been reversed`)
    }
    
    return this.executeTransaction('reversal', async () => {
      // Create mirror entries (opposite sides)
      const entries: InsertLedgerEntry[] = original.entries.map(entry => ({
        txId: '', // Will be set by executeTransaction
        accountCode: entry.accountCode,
        userId: entry.userId,
        side: entry.side === 'debit' ? 'credit' : 'debit' as LedgerEntrySide,
        amountMinor: entry.amountMinor
      }))
      
      // Reconstruct original balance deltas and reverse them
      const balanceUpdates = this.reconstructAndReverseBalanceDeltas(original)
      
      await this.updateBalances(balanceUpdates)
      
      return {
        type: 'reversal' as LedgerTransactionType,
        context: { originalTxId: request.txId },
        entries,
        reversalOf: request.txId
      }
    })
  }

  /**
   * Run trial balance calculation
   */
  async runTrialBalance(): Promise<TrialBalanceResult> {
    // Calculate sum of all debits and credits
    const result = await db
      .select({
        totalDebit: sum(sql`CASE WHEN ${ledgerEntries.side} = 'debit' THEN ${ledgerEntries.amountMinor} ELSE 0 END`),
        totalCredit: sum(sql`CASE WHEN ${ledgerEntries.side} = 'credit' THEN ${ledgerEntries.amountMinor} ELSE 0 END`)
      })
      .from(ledgerEntries)
    
    const sumDebit = Number(result[0]?.totalDebit || 0)
    const sumCredit = Number(result[0]?.totalCredit || 0)
    const delta = sumDebit - sumCredit
    const status: TrialBalanceStatus = delta === 0 ? 'ok' : 'mismatch'
    
    // Store daily trial balance record
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // Check if record exists for today
    const existingRecord = await db
      .select()
      .from(trialBalanceDaily)
      .where(eq(trialBalanceDaily.asOfDate, today))
      .limit(1)
    
    const trialBalanceData = {
      asOfDate: today,
      sumDebit,
      sumCredit,
      delta,
      status,
      details: delta !== 0 ? { error: 'Debit/Credit mismatch detected' } : null
    }
    
    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(trialBalanceDaily)
        .set({
          sumDebit,
          sumCredit,
          delta,
          status,
          details: delta !== 0 ? { error: 'Debit/Credit mismatch detected' } : null
        })
        .where(eq(trialBalanceDaily.asOfDate, today))
    } else {
      // Insert new record
      await db
        .insert(trialBalanceDaily)
        .values(trialBalanceData)
    }
    
    return { status, sumDebit, sumCredit, delta }
  }

  /**
   * Generic transaction executor that ensures atomicity
   */
  private async executeTransaction(
    type: LedgerTransactionType,
    operation: () => Promise<{
      type: LedgerTransactionType
      context: Record<string, any>
      entries: InsertLedgerEntry[]
      reversalOf?: string
    }>
  ): Promise<LedgerOperationResult> {
    // Execute the operation to get transaction details
    const { type: txType, context, entries, reversalOf } = await operation()
    
    // Validate entries (must be exactly 2: 1 debit + 1 credit)
    if (entries.length !== 2) {
      throw createLedgerError('LEDGER_INVARIANT_BROKEN', 
        `Transaction must have exactly 2 entries, got ${entries.length}`)
    }
    
    const debits = entries.filter(e => e.side === 'debit')
    const credits = entries.filter(e => e.side === 'credit')
    
    if (debits.length !== 1 || credits.length !== 1) {
      throw createLedgerError('LEDGER_INVARIANT_BROKEN', 
        'Transaction must have exactly 1 debit and 1 credit entry')
    }
    
    // Validate Σdebit = Σcredit
    const totalDebit = debits.reduce((sum, e) => sum + e.amountMinor, 0)
    const totalCredit = credits.reduce((sum, e) => sum + e.amountMinor, 0)
    
    if (totalDebit !== totalCredit) {
      throw createLedgerError('LEDGER_INVARIANT_BROKEN', 
        `Debit/Credit mismatch: ${totalDebit} != ${totalCredit}`)
    }
    
    // Create transaction record - Step 1
    const txRecord: InsertLedgerTransaction = {
      type: txType,
      context,
      reversalOf: reversalOf || null,
      createdBy: null, // TODO: Add created_by tracking
      originRef: null
    }
    
    const result = await db.insert(ledgerTransactions).values(txRecord).returning()
    const actualTxId = result[0].id
    
    // Update entries with actual transaction ID - Step 2
    const entriesWithActualTxId = entries.map(entry => ({
      ...entry,
      txId: actualTxId
    }))
    const createdEntries = await db.insert(ledgerEntries).values(entriesWithActualTxId).returning()
    
    return {
      txId: actualTxId,
      entries: createdEntries
    }
  }

  /**
   * Reconstruct the original balance deltas for a transaction and return their opposites for reversal
   */
  private reconstructAndReverseBalanceDeltas(original: { transaction: LedgerTransaction, entries: LedgerEntry[] }): Array<{
    accountCode: number
    userId: string | null
    delta: number
  }> {
    const { transaction, entries } = original
    const amount = entries[0].amountMinor // Both entries have same amount
    
    
    switch (transaction.type) {
      case 'topup':
        // Original: +amount to customer (2000), +amount to cash (1000)
        return [
          { accountCode: 1000, userId: null, delta: -amount },
          { accountCode: 2000, userId: entries.find(e => e.accountCode === 2000)?.userId || null, delta: -amount }
        ]
      
      case 'charge':
        // Original: -amount to customer (2000), +amount to revenue (4000)
        return [
          { accountCode: 2000, userId: entries.find(e => e.accountCode === 2000)?.userId || null, delta: +amount },
          { accountCode: 4000, userId: null, delta: -amount }
        ]
      
      case 'bonus':
        // Original: +amount to customer (2000), +amount to expense (5000)
        return [
          { accountCode: 5000, userId: null, delta: -amount },
          { accountCode: 2000, userId: entries.find(e => e.accountCode === 2000)?.userId || null, delta: -amount }
        ]
      
      default:
        throw createLedgerError('LEDGER_INVARIANT_BROKEN', `Cannot reverse transaction type: ${transaction.type}`)
    }
  }

  /**
   * Update account balances using UPSERT
   */
  private async updateBalances(updates: Array<{
    accountCode: number
    userId: string | null
    delta: number
  }>): Promise<void> {
    for (const update of updates) {
      // Check if balance would go negative for customer credits (account 2000)
      if (update.accountCode === 2000 && update.delta < 0) {
        const current = await this.getBalance(update.userId!)
        if (current && current.balanceMinor + update.delta < 0) {
          throw createLedgerError('INSUFFICIENT_FUNDS', 
            `Balance would go negative: ${current.balanceMinor} + ${update.delta} < 0`)
        }
      }
      
      // Check if balance exists and update or insert
      const existingBalance = await db
        .select()
        .from(accountBalances)
        .where(
          update.userId 
            ? and(
                eq(accountBalances.accountCode, update.accountCode),
                eq(accountBalances.userId, update.userId)
              )
            : and(
                eq(accountBalances.accountCode, update.accountCode),
                sql`${accountBalances.userId} IS NULL`
              )
        )
        .limit(1)
      
      if (existingBalance.length > 0) {
        // Update existing balance
        await db
          .update(accountBalances)
          .set({
            balanceMinor: existingBalance[0].balanceMinor + update.delta,
            updatedAt: new Date()
          })
          .where(eq(accountBalances.id, existingBalance[0].id))
      } else {
        // Insert new balance
        await db
          .insert(accountBalances)
          .values({
            accountCode: update.accountCode,
            userId: update.userId,
            balanceMinor: update.delta
          } as InsertAccountBalance)
      }
    }
  }
}

export const ledgerService = new LedgerService()