import type { Express } from 'express'
import { Router } from 'express'
import { 
  HealthResponse,
  GetBalanceResponse, 
  GetTransactionResponse,
  GetTransactionsResponse,
  DevOperationResponse,
  DevReversalResponse,
  TrialBalanceRunResponse,
  LedgerErrorResponse,
  createLedgerError,
  getHttpStatusForError
} from '@shared/contracts/ledger'

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
router.get('/balances/:userId', (req, res) => {
  // TODO: Implement balance lookup
  const response: GetBalanceResponse = {
    userId: req.params.userId,
    balanceMinor: 0,
    updatedAt: new Date().toISOString()
  }
  res.json(response)
})

router.get('/tx/:txId', (req, res) => {
  // TODO: Implement transaction lookup
  const error = createLedgerError('TX_NOT_FOUND', 'Transaction not found')
  res.status(getHttpStatusForError('TX_NOT_FOUND')).json(error)
})

router.get('/tx', (req, res) => {
  // TODO: Implement transaction listing with pagination
  const response: GetTransactionsResponse = {
    transactions: [],
    nextCursor: null,
    hasMore: false
  }
  res.json(response)
})

// 4.3 Dev-only operations
router.post('/dev/topup', (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  // TODO: Implement topup operation
  const response: DevOperationResponse = {
    txId: 'stub-tx-id'
  }
  res.status(201).json(response)
})

router.post('/dev/charge', (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  // TODO: Implement charge operation
  const response: DevOperationResponse = {
    txId: 'stub-tx-id'
  }
  res.status(201).json(response)
})

router.post('/dev/bonus', (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  // TODO: Implement bonus operation
  const response: DevOperationResponse = {
    txId: 'stub-tx-id'
  }
  res.status(201).json(response)
})

router.post('/dev/reversal', (req, res) => {
  if (!checkDevEndpointAccess(req, res)) return
  
  // TODO: Implement reversal operation
  const response: DevReversalResponse = {
    reversalTxId: 'stub-reversal-tx-id'
  }
  res.status(201).json(response)
})

// 4.4 Trial balance
router.post('/trial-balance/run', (req, res) => {
  // TODO: Check admin auth here using existing AdminAuthProvider
  
  // TODO: Implement trial balance calculation
  const response: TrialBalanceRunResponse = {
    status: 'ok',
    sumDebit: 0,
    sumCredit: 0,
    delta: 0
  }
  res.json(response)
})

export function setupLedgerRoutes(app: Express) {
  app.use('/api/v1/ledger', router)
}