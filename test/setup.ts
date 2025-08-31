// Test setup pro keystore systém
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  // Nastav test environment variables
  process.env.NODE_ENV = 'test'
  process.env.ENCRYPTION_MASTER_KEY = 'dGVzdF9lbmNyeXB0aW9uX2tleV8zMl9ieXRlc19sb25n' // test key base64
  process.env.ENABLE_METRICS = 'true'
  process.env.ENABLE_AUDIT = 'true'
})

afterAll(async () => {
  // Cleanup po testech
})