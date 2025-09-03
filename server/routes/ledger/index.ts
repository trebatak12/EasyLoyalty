import type { Express } from 'express'
import { Router } from 'express'
import { z } from 'zod'
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
  TrialBalanceRunResponse,
  LedgerErrorResponse,
  createLedgerError,
  getHttpStatusForError
} from '@shared/contracts/ledger'
import { ledgerService } from './service'

const router = Router()

// Feature flags from environment
const LEDGER_ENABLED = process.env.LEDGER_ENABLED === 'true'
const LEDGER_DEV_ENDPOINTS_ENABLED = process.env.LEDGER_DEV_ENDPOINTS_ENABLED !== 'false'

// Helper to check dev endpoints access
function checkDevEndpointAccess(req: any, res: any): boolean {
  if (!LEDGER_DEV_ENDPOINTS_ENABLED) {
    const error = createLedgerError('FORBIDDEN_DEV_ENDPOINT', 'Dev endpoints are disabled')
    res.status(getHttpStatusForError('FORBIDDEN_DEV_ENDPOINT')).json(error)
    return false
  }
  
  // TODO: Check admin auth here using existing AdminAuthProvider
  // For now, just allow if dev endpoints are enabled
  return true
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
    
    const response: GetTransactionResponse = result
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
    
    const response: GetTransactionsResponse = result
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
router.post('/dev/topup', async (req, res) => {
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

router.post('/dev/charge', async (req, res) => {
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

router.post('/dev/bonus', async (req, res) => {
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

router.post('/dev/reversal', async (req, res) => {
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

// 4.4 Trial balance
router.post('/trial-balance/run', async (req, res) => {
  // TODO: Check admin auth here using existing AdminAuthProvider
  
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