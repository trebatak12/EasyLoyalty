import { randomUUID } from "crypto";

/**
 * Generate a unique idempotency key for API requests
 * @returns UUID string for idempotency
 */
export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback to manual UUID generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a hash for request deduplication
 * @param data Request data to hash
 * @returns Simple hash string
 */
export function createRequestHash(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Store idempotency key in session storage for retry scenarios
 * @param key Idempotency key
 * @param operation Operation identifier
 */
export function storeIdempotencyKey(key: string, operation: string): void {
  try {
    sessionStorage.setItem(`idem_${operation}`, key);
  } catch (error) {
    // Ignore storage errors
  }
}

/**
 * Retrieve stored idempotency key
 * @param operation Operation identifier
 * @returns Stored key or null
 */
export function getStoredIdempotencyKey(operation: string): string | null {
  try {
    return sessionStorage.getItem(`idem_${operation}`);
  } catch (error) {
    return null;
  }
}

/**
 * Clear stored idempotency key after successful operation
 * @param operation Operation identifier
 */
export function clearIdempotencyKey(operation: string): void {
  try {
    sessionStorage.removeItem(`idem_${operation}`);
  } catch (error) {
    // Ignore storage errors
  }
}
