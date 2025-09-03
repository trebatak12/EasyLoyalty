-- Ledger schema migration
-- Creates the double-entry accounting system tables

-- Create enums for ledger
CREATE TYPE ledger_transaction_type AS ENUM ('topup', 'charge', 'bonus', 'reversal');
CREATE TYPE ledger_entry_side AS ENUM ('debit', 'credit');
CREATE TYPE trial_balance_status AS ENUM ('ok', 'mismatch');

-- Ledger transactions table
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type ledger_transaction_type NOT NULL,
    origin_ref TEXT,
    reversal_of UUID REFERENCES ledger_transactions(id),
    created_by UUID,
    context JSONB NOT NULL DEFAULT '{}'
);

-- Unique constraint to enforce max 1 reversal per origin
CREATE UNIQUE INDEX ledger_tx_reversal_of_unique ON ledger_transactions(reversal_of) WHERE reversal_of IS NOT NULL;

-- Index on created_at for ordering
CREATE INDEX idx_ledger_tx_created_at ON ledger_transactions(created_at);

-- Ledger entries table
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_code INTEGER NOT NULL,
    user_id UUID,
    side ledger_entry_side NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0)
);

-- Indexes for ledger entries
CREATE INDEX idx_ledger_entries_tx_id ON ledger_entries(tx_id);
CREATE INDEX idx_ledger_entries_user_account_tx ON ledger_entries(user_id, account_code, tx_id);

-- Account balances table (cache)
CREATE TABLE account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code INTEGER NOT NULL,
    user_id UUID,
    balance_minor BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on account_code
CREATE INDEX idx_account_balances_account_code ON account_balances(account_code);

-- Partial unique constraints for account types
-- One row per global account (1000/4000/5000)
CREATE UNIQUE INDEX account_balances_global_unique ON account_balances(account_code) WHERE user_id IS NULL;
-- One row per user for account 2000
CREATE UNIQUE INDEX account_balances_user_unique ON account_balances(account_code, user_id) WHERE user_id IS NOT NULL;

-- Check constraints for account/user relationships
-- Customer Credits (2000) must have user_id
ALTER TABLE account_balances ADD CONSTRAINT customer_credits_user_required 
    CHECK ((account_code = 2000 AND user_id IS NOT NULL) OR account_code != 2000);

-- Global accounts (1000, 4000, 5000) must have user_id = NULL
ALTER TABLE account_balances ADD CONSTRAINT global_accounts_user_null 
    CHECK ((account_code IN (1000, 4000, 5000) AND user_id IS NULL) OR account_code NOT IN (1000, 4000, 5000));

-- Customer Credits balance cannot be negative
ALTER TABLE account_balances ADD CONSTRAINT customer_credits_balance_non_negative 
    CHECK ((account_code != 2000) OR (account_code = 2000 AND balance_minor >= 0));

-- Trial balance daily table
CREATE TABLE trial_balance_daily (
    as_of_date DATE PRIMARY KEY, -- UTC date in YYYY-MM-DD format
    sum_debit BIGINT NOT NULL,
    sum_credit BIGINT NOT NULL,
    delta BIGINT NOT NULL,
    status trial_balance_status NOT NULL,
    details JSONB
);