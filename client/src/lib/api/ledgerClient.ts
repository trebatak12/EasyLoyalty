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
  TrialBalanceRunResponse,
  LedgerErrorResponse
} from '@shared/contracts/ledger'

/**
 * Typed client for the Ledger API
 * All methods return promises and use the shared contracts
 */
export class LedgerClient {
  private baseUrl: string

  constructor(baseUrl = '/api/v1/ledger') {
    this.baseUrl = baseUrl
  }

  // 4.1 Health endpoint
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  // 4.2 Balances & transactions
  async getBalance(userId: string): Promise<GetBalanceResponse> {
    const response = await fetch(`${this.baseUrl}/balances/${userId}`)
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  async getTransaction(txId: string): Promise<GetTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/tx/${txId}`)
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  async getTransactions(query: GetTransactionsQuery = {}): Promise<GetTransactionsResponse> {
    const params = new URLSearchParams()
    if (query.userId) params.append('userId', query.userId)
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.cursor) params.append('cursor', query.cursor)

    const url = `${this.baseUrl}/tx${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  // 4.3 Dev-only operations
  async devTopup(request: DevTopupRequest): Promise<DevOperationResponse> {
    const response = await fetch(`${this.baseUrl}/dev/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  async devCharge(request: DevChargeRequest): Promise<DevOperationResponse> {
    const response = await fetch(`${this.baseUrl}/dev/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  async devBonus(request: DevBonusRequest): Promise<DevOperationResponse> {
    const response = await fetch(`${this.baseUrl}/dev/bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  async devReversal(request: DevReversalRequest): Promise<DevReversalResponse> {
    const response = await fetch(`${this.baseUrl}/dev/reversal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  // 4.4 Customer search
  async searchCustomers(query: CustomerSearchQuery = {}): Promise<CustomerSearchResponse> {
    const params = new URLSearchParams()
    if (query.q) params.append('q', query.q)
    if (query.limit) params.append('limit', query.limit.toString())

    const url = `${this.baseUrl}/customers${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }

  // 4.5 Trial balance
  async runTrialBalance(): Promise<TrialBalanceRunResponse> {
    const response = await fetch(`${this.baseUrl}/trial-balance/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      const error: LedgerErrorResponse = await response.json()
      throw new Error(`${error.error}: ${error.message}`)
    }
    return response.json()
  }
}

// Export singleton instance
export const ledgerClient = new LedgerClient()