import { randomUUID } from "crypto";
import { storage } from "./storage";

export function generateIdempotencyKey(): string {
  return randomUUID();
}

export function formatCZK(cents: number): string {
  const czk = Math.floor(cents / 100);
  return czk.toLocaleString("cs-CZ").replace(/\s/g, "\u00A0") + "\u00A0CZK";
}

export function parseCZK(czkString: string): number {
  const number = parseInt(czkString.replace(/[^\d]/g, ""));
  return isNaN(number) ? 0 : number * 100;
}

export async function auditLog(
  actorType: "user" | "admin" | "system",
  actorId: string | null,
  action: string,
  meta: Record<string, any> = {}
) {
  await storage.createAuditLog({
    actorType,
    actorId,
    action,
    meta
  });
}

export function createErrorResponse(error: string, message: string, code: string, details?: any) {
  return { error, message, code, ...(details && { details }) };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
}

export function addRequestId(req: any, res: any, next: any) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Version', process.env.npm_package_version || 'unknown');
  next();
}

export function getClientIP(req: any): string {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : '127.0.0.1');
}

export function getUserAgent(req: any): string {
  return req.headers['user-agent'] || 'unknown';
}
