/**
 * Robust HTTP client with single-flight refresh mechanism
 * Addresses the infinite 401 loop issue with proper auth interceptor lifecycle
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

// Debug flag - can be toggled via environment
const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === 'true'

function debugLog(...args: any[]) {
  if (DEBUG_AUTH) {
    console.log('[AUTH DEBUG]', ...args)
  }
}

// Protected endpoint predicate
function isProtectedRequest(config: AxiosRequestConfig): boolean {
  const url = config.url || ''
  
  // Include protected endpoints
  const protectedPatterns = [
    '/api/me',
    '/api/v1/ledger/',
    '/api/customer/', 
    '/api/transactions/',
    '/api/admin/' // Admin endpoints are also protected but handled separately
  ]
  
  // Exclude auth endpoints and health checks
  const excludedPatterns = [
    '/api/auth/',
    '/api/health',
    '/api/admin/login', // Admin login is not protected
    '/api/admin/refresh' // Admin refresh is not protected
  ]
  
  // Check exclusions first
  for (const pattern of excludedPatterns) {
    if (url.includes(pattern)) {
      return false
    }
  }
  
  // Check if it matches protected patterns
  for (const pattern of protectedPatterns) {
    if (url.includes(pattern)) {
      return true
    }
  }
  
  return false
}

interface RefreshState {
  isRefreshing: boolean
  refreshPromise: Promise<string> | null
  subscribers: Array<(token: string | null) => void>
}

class HttpClient {
  private instance: AxiosInstance
  private interceptorIds: number[] = []
  private refreshState: RefreshState = {
    isRefreshing: false,
    refreshPromise: null,
    subscribers: []
  }

  constructor() {
    this.instance = axios.create({
      baseURL: '',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Single-flight refresh mechanism
  private async performRefresh(): Promise<string> {
    if (this.refreshState.isRefreshing && this.refreshState.refreshPromise) {
      debugLog('Refresh already in progress, waiting...')
      return this.refreshState.refreshPromise
    }

    debugLog('Starting new refresh...')
    this.refreshState.isRefreshing = true
    
    const refreshPromise = (async (): Promise<string> => {
      try {
        // Call refresh endpoint WITHOUT auth header to avoid recursion
        const response = await this.instance.post('/api/auth/refresh', {}, {
          headers: {
            // Explicitly remove auth header for refresh call
            Authorization: undefined
          }
        })
        
        const { accessToken } = response.data
        if (!accessToken) {
          throw new Error('No access token received from refresh')
        }
        
        debugLog('Refresh successful, got new token')
        
        // Update the default auth header
        this.setAuthToken(accessToken)
        
        // Notify all waiting subscribers
        this.refreshState.subscribers.forEach(callback => callback(accessToken))
        
        return accessToken
      } catch (error) {
        debugLog('Refresh failed:', error)
        
        // Clear auth state on refresh failure
        this.setAuthToken(null)
        
        // Notify all waiting subscribers of failure
        this.refreshState.subscribers.forEach(callback => callback(null))
        
        throw error
      } finally {
        // Reset refresh state
        this.refreshState.isRefreshing = false
        this.refreshState.refreshPromise = null
        this.refreshState.subscribers = []
      }
    })()
    
    this.refreshState.refreshPromise = refreshPromise
    return refreshPromise
  }

  // Queue requests during refresh
  private queueRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      this.refreshState.subscribers.push((token) => {
        if (token) {
          // Retry with new token
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${token}`
          config._retry = true
          
          this.instance(config)
            .then(resolve)
            .catch(reject)
        } else {
          // Refresh failed, reject the request
          reject(new Error('Token refresh failed'))
        }
      })
    })
  }

  // Install interceptors with proper lifecycle management
  installAuthInterceptors(getAuthToken: () => string | null, onLogout: () => void): { eject: () => void } {
    debugLog('Installing auth interceptors...')
    
    // Request interceptor - add auth header
    const requestInterceptorId = this.instance.interceptors.request.use(
      (config) => {
        const token = getAuthToken()
        if (token && isProtectedRequest(config)) {
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle 401s with single-flight refresh
    const responseInterceptorId = this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalConfig = error.config as any
        
        debugLog('Response error:', {
          status: error.response?.status,
          url: originalConfig?.url,
          isRetry: originalConfig?._retry,
          isProtected: isProtectedRequest(originalConfig)
        })

        // Handle 401 on protected endpoints (not retries)
        if (
          error.response?.status === 401 && 
          originalConfig && 
          !originalConfig._retry &&
          isProtectedRequest(originalConfig)
        ) {
          debugLog('401 on protected endpoint, attempting refresh...')
          
          try {
            // If refresh is already in progress, queue this request
            if (this.refreshState.isRefreshing) {
              return this.queueRequest(originalConfig)
            }
            
            // Attempt refresh
            const newToken = await this.performRefresh()
            
            // Retry original request with new token
            originalConfig.headers = originalConfig.headers || {}
            originalConfig.headers.Authorization = `Bearer ${newToken}`
            originalConfig._retry = true
            
            debugLog('Retrying original request with new token')
            return this.instance(originalConfig)
            
          } catch (refreshError) {
            debugLog('Refresh failed, triggering logout')
            
            // Refresh failed - trigger logout
            onLogout()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )

    this.interceptorIds.push(requestInterceptorId, responseInterceptorId)

    // Return eject function
    return {
      eject: () => {
        debugLog('Ejecting auth interceptors...')
        this.instance.interceptors.request.eject(requestInterceptorId)
        this.instance.interceptors.response.eject(responseInterceptorId)
        
        // Remove from tracking
        this.interceptorIds = this.interceptorIds.filter(
          id => id !== requestInterceptorId && id !== responseInterceptorId
        )
      }
    }
  }

  // Token management
  setAuthToken(token: string | null) {
    if (token) {
      this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`
      debugLog('Auth token set')
    } else {
      delete this.instance.defaults.headers.common['Authorization']
      debugLog('Auth token cleared')
    }
  }

  get authToken(): string | null {
    const authHeader = this.instance.defaults.headers.common['Authorization'] as string
    return authHeader ? authHeader.replace('Bearer ', '') : null
  }

  // HTTP methods
  async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.instance.get(url, config)
    return response.data
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.instance.post(url, data, config)
    return response.data
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.instance.put(url, data, config)
    return response.data
  }

  async patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.instance.patch(url, data, config)
    return response.data
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.instance.delete(url, config)
    return response.data
  }

  // Direct access to axios instance for special cases
  get axios(): AxiosInstance {
    return this.instance
  }
}

// Export singleton instance
export const httpClient = new HttpClient()