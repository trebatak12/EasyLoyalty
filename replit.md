# EasyLoyalty Café System

## Overview

EasyLoyalty is a single-tenant loyalty program system designed for one café. The system allows customers to top up prepaid wallets with bonus incentives and make payments via QR codes. It features separate customer and admin interfaces with a 120-second void window for transactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon serverless)
- **Authentication**: JWT tokens for customers, session cookies for admins

### Project Structure
- **Monorepo Layout**: Single repository with shared code
- **Client**: Frontend React application (`/client`)
- **Server**: Backend Express API (`/server`)
- **Shared**: Common types and schemas (`/shared`)

## Key Components

### Authentication System
- **Customer Auth**: JWT-based with access/refresh token rotation
- **Admin Auth**: Session-based authentication with secure cookies
- **Password Security**: BCrypt hashing with pepper for enhanced security
- **Rate Limiting**: Built-in protection against brute force attacks

### Database Schema
- **Users**: Customer accounts with email/password authentication
- **Wallets**: Balance tracking with bonus accumulation
- **Admin Users**: Staff accounts with role-based access
- **Transactions**: Complete transaction history with audit trail
- **Audit Logs**: Security and operational logging
- **Idempotency**: Request deduplication for payment safety

### Payment System
- **Top-up Packages**: Four predefined packages (MINI, STANDARD, MAXI, ULTRA)
- **QR Code Generation**: Dynamic QR codes with 60-second expiration
- **Short Code Fallback**: 8-character alphanumeric codes for manual entry
- **Void Window**: 120-second transaction reversal capability
- **Idempotency**: Prevents duplicate charges using request keys

### Business Rules
- **Currency**: All amounts stored in cents, displayed as whole CZK
- **Bonus Structure**: One-time bonuses ranging from 7.7% to 19.1%
- **No Split Payments**: Transactions must be fully covered by wallet balance
- **No Balance Expiration**: Credits remain valid indefinitely
- **Refunds**: Manual adjustments only (in-person)

## Data Flow

### Customer Flow
1. **Registration/Login**: Email/password with JWT token generation
2. **Wallet Management**: View balance and bonus totals
3. **Top-up Process**: Select package → External payment → Bonus credit
4. **QR Generation**: Create payment codes for café transactions
5. **Transaction History**: View all top-ups and payments

### Admin Flow
1. **Session Login**: Email/password with secure session cookies
2. **Payment Acceptance**: Amount entry → QR/code scan → Charge confirmation
3. **Void Management**: 120-second window for transaction reversal
4. **Customer Management**: View members, balances, and transaction history
5. **Summary Reports**: Total liability, member counts, bonus distributions

### Transaction Processing
1. **Idempotency Check**: Prevent duplicate requests
2. **Balance Validation**: Ensure sufficient funds
3. **Charge Execution**: Atomic balance deduction
4. **Audit Logging**: Record all actions with metadata
5. **Real-time Updates**: Immediate balance reflection

## External Dependencies

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Vite**: Frontend build tooling with HMR
- **ESBuild**: Server-side bundling for production
- **TypeScript**: Type safety across the entire stack

### Production Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Database Connection**: Connection pooling via @neondatabase/serverless
- **WebSocket Support**: Real-time capabilities through ws library

### UI Components
- **Radix UI**: Accessible component primitives
- **Shadcn/ui**: Pre-built component library
- **QR Code Generation**: qrcode.react for payment codes
- **Icons**: Lucide React for consistent iconography

### Security Libraries
- **BCrypt**: Password hashing with salt rounds
- **JWT**: Token-based authentication
- **Crypto**: Secure random generation for tokens and codes

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite HMR for frontend, tsx for backend
- **Database**: Development instance with seed data
- **Environment Variables**: Separate .env configuration
- **Debugging**: Runtime error overlays and source maps

### Production Build
- **Frontend**: Static asset generation via Vite
- **Backend**: ESBuild bundling with external package handling
- **Database**: Migration-based schema deployment
- **Security**: Environment-based configuration isolation

### Environment Configuration
- **Database URL**: PostgreSQL connection string
- **JWT Secrets**: Secure token signing keys
- **Auth Pepper**: Additional password security layer
- **Session Configuration**: Secure cookie settings

### Monitoring and Logging
- **Audit Trail**: Complete action logging with actor tracking
- **Request Logging**: API endpoint monitoring with timing
- **Error Handling**: Structured error responses with safety
- **Rate Limiting**: Request throttling for abuse prevention