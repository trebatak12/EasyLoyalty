# EasyLoyalty Café System

## Overview
Single-tenant věrnostní systém pro kavárnu: zákazníci si dobíjejí peněženky (bonus 7 – 19 %), platí přes QR kód; void okno 60 s. Dva UI: zákazník / admin.

## Tech Stack
- **Client**  React + TypeScript · Tailwind + shadcn/ui · TanStack Query · Vite
- **Server**  Express (ESM) + TypeScript · Drizzle ORM · PostgreSQL @ Neon
- **Auth**    JWT (customers) · session cookies (admins)

## Commands
| Task | Command |
|------|---------|
| Dev  | `pnpm dev` |
| Test | `pnpm test` |
| Build| `pnpm build` |

## Project Layout
client/   # React front-end
server/   # Express API
shared/   # Zod typy & schémata

## Code Style
- TS `strict`, Prettier 100 zn./řádek, single quotes, no semicolons
- React FC + hooks, absolutní importy `@/…`
- Styly výhradně Tailwind

## Testing
- Vitest + React Testing Library
- Souborový pattern `*.test.ts`

## Communication
- **Plan:** (kroky) → **Changes:** (shrnutí diffu)
- Piš česky, běžným jazykem

## Recent Changes (2025-08-31)
### JWT Keystore System ✅ COMPLETED
- **Database schema:** Extended with `keys` and `key_audit` tables with proper constraints
- **ConfigService:** ENV validation and feature flags management implemented
- **KeyManager:** Envelope encryption using ENCRYPTION_MASTER_KEY for secure private key storage
- **TokenService:** ES256 JWS signing/verification with kid headers using `jose` library  
- **JWKS endpoint:** `/.well-known/jwks.json` returning public keys for active/retiring ES256 keys
- **Bootstrap:** Auto-generates initial keys for access_jwt, refresh_jwt, and qr_jwt purposes
- **Metrics:** Telemetry tracking sign/verify operations and JWKS endpoint usage via `/api/metrics`
- **Audit logging:** Complete audit trail of all keystore operations without PII
- **Backward compatibility:** Legacy token verification via LEGACY_JWT_PRIVATE_KEY_PEM
- **Tests:** 11 integration tests covering JWKS, metrics, health, and auth endpoints

### Security Features
- **Envelope encryption:** Private keys encrypted in database using master key
- **Kid-based verification:** Each token has unique key identifier in header
- **One active key constraint:** Maximum one active key per purpose enforced by DB
- **Fail-fast production:** App throws error on startup if encryption key missing
- **Secure endpoints:** JWKS cached 5min, metrics only in development

## Current Sprint (2025-W31)
1. Dokončit 120 s void logiku `/server/src/void.ts`
2. Přidat unit testy na edge-case zůstatku peněženky

> **Business rules** a ERD → `/docs/business-rules.md`  
> **Security & secrets** → `/docs/security.md`