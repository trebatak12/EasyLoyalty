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

## Recent Changes (2025-01-12)
### Security & Stability Fixes ✅
- **Fixed production secrets check:** App now throws error on startup if JWT secrets missing in production
- **Fixed TTL calculation:** SESSION_IDLE_TTL corrected from 30 hours to 30 minutes
- **Unified cookie paths:** All refresh tokens use consistent `/api/auth` path for proper deletion
- **SameSite strategy:** Configurable via COOKIE_SAMESITE env var (strict/lax/none)
- **Fixed CSRF maxAge:** Changed from string to number in milliseconds
- **Race condition fix:** Frontend refresh now uses useRef to prevent multiple simultaneous refreshes
- **Logout improvement:** Always calls API to clear refresh cookie, even without access token
- **HTTP-only cookies:** All auth routes now properly set refresh tokens as secure cookies

## Current Sprint (2025-W31)
1. Dokončit 120 s void logiku `/server/src/void.ts`
2. Přidat unit testy na edge-case zůstatku peněženky

> **Business rules** a ERD → `/docs/business-rules.md`  
> **Security & secrets** → `/docs/security.md`