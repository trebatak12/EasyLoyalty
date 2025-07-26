-- Create enums
CREATE TYPE txn_type AS ENUM ('topup','charge','void','adjustment');
CREATE TYPE user_status AS ENUM ('active','blocked');
CREATE TYPE admin_role AS ENUM ('manager','staff');
CREATE TYPE actor_type AS ENUM ('user','admin','system');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  status user_status DEFAULT 'active' NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_cents integer DEFAULT 0 NOT NULL,
  bonus_granted_total_cents integer DEFAULT 0 NOT NULL,
  last_activity_at timestamptz
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role admin_role DEFAULT 'manager' NOT NULL,
  status user_status DEFAULT 'active' NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  user_agent text,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip inet,
  user_agent text
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type actor_type NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Transactions table (immutable ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type txn_type NOT NULL,
  amount_cents integer NOT NULL, -- + credit, - debit
  related_id uuid NULL,          -- e.g. charge_id or topup_id
  idempotency_key text NULL,
  created_by text NOT NULL,      -- 'user' | 'admin' | 'system'
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  request_hash text NOT NULL
);

-- Metrics daily table (optional)
CREATE TABLE IF NOT EXISTS metrics_daily (
  date text PRIMARY KEY, -- YYYY-MM-DD format
  members_count integer NOT NULL,
  liability_cents integer NOT NULL,
  bonus_granted_cents integer NOT NULL,
  spend_cents integer NOT NULL
);
