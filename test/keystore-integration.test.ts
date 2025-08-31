import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('Keystore Integration Tests', () => {
  const baseUrl = 'http://localhost:5000'

  beforeAll(async () => {
    // Počkej než server nastartuje
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  describe('JWKS Endpoint', () => {
    it('should serve JWKS with valid structure', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/.well-known/jwks.json"`)
      const jwks = JSON.parse(stdout)
      
      expect(jwks).toHaveProperty('keys')
      expect(Array.isArray(jwks.keys)).toBe(true)
      expect(jwks.keys.length).toBeGreaterThanOrEqual(3)
      
      // Ověř strukturu prvního klíče
      const key = jwks.keys[0]
      expect(key).toHaveProperty('kty', 'EC')
      expect(key).toHaveProperty('alg', 'ES256') 
      expect(key).toHaveProperty('crv', 'P-256')
      expect(key).toHaveProperty('kid')
      expect(key).toHaveProperty('x')
      expect(key).toHaveProperty('y')
      expect(key).toHaveProperty('use', 'sig')
      
      // Nesmí obsahovat private material
      expect(key).not.toHaveProperty('d')
    })

    it('should return proper HTTP headers', async () => {
      const { stdout } = await execAsync(`curl -s -I "${baseUrl}/.well-known/jwks.json"`)
      
      expect(stdout).toContain('Content-Type: application/json')
      expect(stdout).toContain('Cache-Control: public, max-age=300')
      expect(stdout).toContain('200 OK')
    })
  })

  describe('Metrics Endpoint', () => {
    it('should serve metrics in development', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/api/metrics"`)
      const metrics = JSON.parse(stdout)
      
      expect(metrics).toHaveProperty('counters')
      expect(metrics).toHaveProperty('gauges')
      expect(metrics).toHaveProperty('timestamp')
      
      // Ověř counter strukturu
      expect(metrics.counters).toHaveProperty('key_sign_total')
      expect(metrics.counters).toHaveProperty('key_verify_total')
      expect(metrics.counters).toHaveProperty('jwks_served_total')
      
      // Ověř gauge strukturu
      expect(metrics.gauges).toHaveProperty('active_keys_per_purpose')
      expect(metrics.gauges.active_keys_per_purpose).toHaveProperty('access_jwt')
      expect(metrics.gauges.active_keys_per_purpose).toHaveProperty('refresh_jwt')
      expect(metrics.gauges.active_keys_per_purpose).toHaveProperty('qr_jwt')
    })
  })

  describe('Health Endpoints', () => {
    it('should respond to health check', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/health"`)
      const health = JSON.parse(stdout)
      
      expect(health).toEqual({ ok: true })
    })

    it('should respond to readiness check', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/ready"`)
      const ready = JSON.parse(stdout)
      
      expect(ready).toHaveProperty('db')
      expect(['ok', 'down']).toContain(ready.db)
    })
  })

  describe('Auth Integration', () => {
    it('should handle auth requests with proper error codes', async () => {
      // Test invalid token
      const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer invalid" "${baseUrl}/api/me"`)
      const error = JSON.parse(stdout)
      
      expect(error).toHaveProperty('error', 'Unauthorized')
      expect(error).toHaveProperty('code')
    })

    it('should handle missing token', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/api/me"`)
      const error = JSON.parse(stdout)
      
      expect(error).toHaveProperty('error', 'Unauthorized')
      expect(error.message).toContain('authorization header')
    })
  })

  describe('JWKS Metrics', () => {
    it('should increment JWKS counter when accessed', async () => {
      // Reset metrik
      await execAsync(`curl -s "${baseUrl}/api/metrics"`)
      
      // Přistup k JWKS
      await execAsync(`curl -s "${baseUrl}/.well-known/jwks.json"`)
      await execAsync(`curl -s "${baseUrl}/.well-known/jwks.json"`)
      
      // Zkontroluj metriky
      const { stdout } = await execAsync(`curl -s "${baseUrl}/api/metrics"`)
      const metrics = JSON.parse(stdout)
      
      expect(metrics.counters.jwks_served_total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Database Constraints', () => {
    it('should have exactly 3 active keys initially', async () => {
      const { stdout } = await execAsync(`curl -s "${baseUrl}/api/metrics"`)
      const metrics = JSON.parse(stdout)
      
      const purposes = metrics.gauges.active_keys_per_purpose
      expect(purposes.access_jwt).toBe(1)
      expect(purposes.refresh_jwt).toBe(1)
      expect(purposes.qr_jwt).toBe(1)
    })
  })
})