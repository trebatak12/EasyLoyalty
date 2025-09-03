import type { Express, Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { authenticateAdminWithKeystore } from '../../keystore-auth'
import { 
  HealthResponse,
  GetBalanceResponse, 
  GetTransactionResponse,
  GetTransactionsResponse,
  GetTransactionsQuery,
  DevTopupRequest,
  DevChargeRequest,
  DevBonusRequest,
  DevReversalRequest,
  DevOperationResponse,
  DevReversalResponse,
  CustomerSearchQuery,
  CustomerSearchResponse,
  CustomerInfo,
  TrialBalanceRunResponse,
  LedgerErrorResponse,
  createLedgerError,
  getHttpStatusForError
} from '@shared/contracts/ledger'
import { ledgerService } from './service'
import { storage } from '../../storage'

const router = Router()

// Feature flags from environment
const LEDGER_ENABLED = process.env.LEDGER_ENABLED === 'true'
const LEDGER_DEV_ENDPOINTS_ENABLED = process.env.LEDGER_DEV_ENDPOINTS_ENABLED !== 'false'

// Helper to check dev endpoints access
function checkDevEndpointAccess(req: Request, res: Response): boolean {
  if (!LEDGER_DEV_ENDPOINTS_ENABLED) {
    const error = createLedgerError('FORBIDDEN_DEV_ENDPOINT', 'Dev endpoints are disabled')
    res.status(getHttpStatusForError('FORBIDDEN_DEV_ENDPOINT')).json(error)
    return false
  }
  
  // Admin auth is handled by middleware before this point
  return true
}

// Admin auth middleware for dev endpoints
function requireAdminForDev(req: Request, res: Response, next: NextFunction) {
  if (!LEDGER_DEV_ENDPOINTS_ENABLED) {
    const error = createLedgerError('FORBIDDEN_DEV_ENDPOINT', 'Dev endpoints are disabled')
    return res.status(getHttpStatusForError('FORBIDDEN_DEV_ENDPOINT')).json(error)
  }
  
  authenticateAdminWithKeystore(req, res, next)
}

// Admin auth middleware for trial balance
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  authenticateAdminWithKeystore(req, res, next)
}

// 4.1 Health endpoint
router.get('/health', (req, res) => {
  const response: HealthResponse = {
    ok: true,
    version: '1.0.0',
    accounts: ['1000', '2000', '4000', '5000'],
    featureFlags: {
      LEDGER_ENABLED,
      LEDGER_DEV_ENDPOINTS_ENABLED
    }
  }
  res.json(response)
})

// 4.2 Balances & transactions
router.get('/balances/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(userId).success) {
      const error = createLedgerError('VALIDATION_FAILED', 'Invalid user ID format')
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(error)
    }
    
    const balance = await ledgerService.getBalance(userId)
    if (!balance) {
      const error = createLedgerError('TX_NOT_FOUND', 'User balance not found')
      return res.status(getHttpStatusForError('TX_NOT_FOUND')).json(error)
    }
    
    const response: GetBalanceResponse = balance
    res.json(response)
  } catch (error: any) {
    console.error('Balance lookup error:', error)
    
    if (error.error) {
      // Already a ledger error
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during balance lookup')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

router.get('/tx/:txId', async (req, res) => {
  try {
    const txId = req.params.txId
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(txId).success) {
      const error = createLedgerError('VALIDATION_FAILED', 'Invalid transaction ID format')
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(error)
    }
    
    const result = await ledgerService.getTransaction(txId)
    if (!result) {
      const error = createLedgerError('TX_NOT_FOUND', 'Transaction not found')
      return res.status(getHttpStatusForError('TX_NOT_FOUND')).json(error)
    }
    
    const response: GetTransactionResponse = {
      transaction: {
        ...result.transaction,
        createdAt: result.transaction.createdAt.toISOString(),
        context: result.transaction.context as Record<string, any>
      },
      entries: result.entries
    }
    res.json(response)
  } catch (error: any) {
    console.error('Transaction lookup error:', error)
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during transaction lookup')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

router.get('/tx', async (req, res) => {
  try {
    const query = GetTransactionsQuery.parse(req.query)
    
    if (!query.userId) {
      const error = createLedgerError('VALIDATION_FAILED', 'userId is required')
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(error)
    }
    
    const result = await ledgerService.getTransactions(
      query.userId,
      query.limit || 20,
      query.cursor
    )
    
    const response: GetTransactionsResponse = {
      ...result,
      transactions: result.transactions.map(tx => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
        context: tx.context as Record<string, any>
      }))
    }
    res.json(response)
  } catch (error: any) {
    console.error('Transaction listing error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid query parameters', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during transaction listing')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

// 4.3 Dev-only operations
router.post('/dev/topup', requireAdminForDev, async (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  try {
    const request = DevTopupRequest.parse(req.body)
    const result = await ledgerService.topup(request)
    
    const response: DevOperationResponse = {
      txId: result.txId
    }
    res.status(201).json(response)
  } catch (error: any) {
    console.error('Topup error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid request body', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    if (error.error) {
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during topup')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

router.post('/dev/charge', requireAdminForDev, async (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  try {
    const request = DevChargeRequest.parse(req.body)
    const result = await ledgerService.charge(request)
    
    const response: DevOperationResponse = {
      txId: result.txId
    }
    res.status(201).json(response)
  } catch (error: any) {
    console.error('Charge error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid request body', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    if (error.error) {
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during charge')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

router.post('/dev/bonus', requireAdminForDev, async (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  try {
    const request = DevBonusRequest.parse(req.body)
    const result = await ledgerService.bonus(request)
    
    const response: DevOperationResponse = {
      txId: result.txId
    }
    res.status(201).json(response)
  } catch (error: any) {
    console.error('Bonus error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid request body', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    if (error.error) {
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during bonus')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

router.post('/dev/reversal', requireAdminForDev, async (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  try {
    const request = DevReversalRequest.parse(req.body)
    const result = await ledgerService.reversal(request)
    
    const response: DevReversalResponse = {
      reversalTxId: result.txId
    }
    res.status(201).json(response)
  } catch (error: any) {
    console.error('Reversal error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid request body', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    if (error.error) {
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during reversal')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

// 4.4 Customer search
router.get('/customers', requireAdmin, async (req, res) => {
  // Admin auth is handled by middleware
  
  try {
    const query = CustomerSearchQuery.parse(req.query)
    
    // Get customers from existing storage system
    const { users } = await storage.getCustomersList(query.q, query.limit || 20, 0)
    
    // Get ledger balances for all users in parallel
    const customerInfoPromises = users.map(async (userRecord): Promise<CustomerInfo> => {
      const ledgerBalance = await ledgerService.getBalance(userRecord.id)
      
      return {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        ledgerBalance: ledgerBalance?.balanceMinor || 0,
        legacyBalance: userRecord.wallet?.balanceCents || 0
      }
    })
    
    const customers = await Promise.all(customerInfoPromises)
    
    const response: CustomerSearchResponse = {
      customers
    }
    res.json(response)
  } catch (error: any) {
    console.error('Customer search error:', error)
    
    if (error instanceof z.ZodError) {
      const ledgerError = createLedgerError('VALIDATION_FAILED', 'Invalid search parameters', error.errors)
      return res.status(getHttpStatusForError('VALIDATION_FAILED')).json(ledgerError)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during customer search')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

// 4.5 Trial balance
router.post('/trial-balance/run', requireAdmin, async (req, res) => {
  // Admin auth is handled by middleware
  
  try {
    const result = await ledgerService.runTrialBalance()
    
    const response: TrialBalanceRunResponse = result
    res.json(response)
  } catch (error: any) {
    console.error('Trial balance error:', error)
    
    if (error.error) {
      return res.status(getHttpStatusForError(error.error)).json(error)
    }
    
    const ledgerError = createLedgerError('LEDGER_INVARIANT_BROKEN', 'Internal error during trial balance calculation')
    res.status(getHttpStatusForError('LEDGER_INVARIANT_BROKEN')).json(ledgerError)
  }
})

export function setupLedgerRoutes(app: Express) {
  app.use('/api/v1/ledger', router)
}