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

## Current Sprint (2025-W31)
1. Dokončit 120 s void logiku `/server/src/void.ts`
2. Přidat unit testy na edge-case zůstatku peněženky

> **Business rules** a ERD → `/docs/business-rules.md`  
> **Security & secrets** → `/docs/security.md`