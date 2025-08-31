import { describe, it, expect } from 'vitest'

describe('Keystore Basic Tests', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('should have environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.ENCRYPTION_MASTER_KEY).toBeDefined()
  })
})