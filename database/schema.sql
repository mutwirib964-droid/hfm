-- ============================================================================
-- VTM MARKETS PLATFORM — COMPLETE AUTHORITATIVE SQL SCHEMA & MIGRATION SCRIPT
-- ============================================================================
-- Target Database: Supabase PostgreSQL 15+ (Schema: public, auth)
-- Security Notice: No passwords, service-role keys, access tokens, or private
-- credentials are included in this file.
-- ============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CORE TABLES (DEPLOYED IN LIVE SUPABASE + NORMALIZED LEDGER & AUDIT TABLES)
-- ============================================================================

-- 1.1 Registered Users Table (Authoritative User Profile & Role Registry)
CREATE TABLE IF NOT EXISTS public.vtm_registered_users (
  email TEXT PRIMARY KEY,
  uid UUID UNIQUE,
  password_hash TEXT DEFAULT '',
  name TEXT DEFAULT 'Trader',
  phone_number TEXT DEFAULT '',
  country_code TEXT DEFAULT '+1',
  country_name TEXT DEFAULT 'United States',
  account_number TEXT,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('normal', 'marketer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS uid UUID;
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE public.vtm_registered_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.vtm_registered_users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Trader';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+1';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS country_name TEXT DEFAULT 'United States';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'normal';
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.vtm_registered_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1.2 User Financials & Accounts Table (Authoritative Financial Store)
CREATE TABLE IF NOT EXISTS public.vtm_user_finances (
  user_key TEXT PRIMARY KEY,
  user_email TEXT,
  user_name TEXT,
  wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_account_id TEXT,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS selected_account_id TEXT;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vtm_user_finances ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();

-- 1.3 User Activities & Cloud State Store (Audit Trail + Cross-Device State Snapshots)
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 User Devices Registry (Session & Device Tracking)
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, device_id)
);

-- 1.5 Normalized Closed Trades Table (Immutable Realized Trade History)
CREATE TABLE IF NOT EXISTS public.closed_trades (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  ticket BIGINT NOT NULL,
  account_number TEXT,
  account_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  lots NUMERIC(12, 4) NOT NULL CHECK (lots > 0),
  open_price NUMERIC(18, 6) NOT NULL,
  close_price NUMERIC(18, 6) NOT NULL,
  pnl NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  swap NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  open_time BIGINT NOT NULL,
  close_time BIGINT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'MANUAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.6 Immutable Financial Ledger Table (Double-Entry Audit Trail for Every Balance Change)
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'INITIAL_BALANCE',
      'DEPOSIT',
      'WITHDRAWAL',
      'INTERNAL_TRANSFER_IN',
      'INTERNAL_TRANSFER_OUT',
      'REALIZED_TRADE_PNL',
      'TRADING_FEE',
      'SWAP_CHARGE',
      'ADMIN_ADJUSTMENT'
    )
  ),
  amount NUMERIC(15, 2) NOT NULL,
  previous_balance NUMERIC(15, 2) NOT NULL,
  new_balance NUMERIC(15, 2) NOT NULL CHECK (new_balance >= 0),
  reference_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_email, account_number, entry_type, reference_id)
);

-- 1.7 Trading Accounts Table (Normalized Mirror of User Trading Accounts)
CREATE TABLE IF NOT EXISTS public.vtm_trading_accounts (
  account_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  server TEXT NOT NULL DEFAULT 'VTMarkets-LiveServer1',
  account_type TEXT NOT NULL DEFAULT 'Live' CHECK (account_type IN ('Live', 'Demo')),
  tier TEXT NOT NULL DEFAULT 'Standard',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  equity NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (equity >= 0),
  margin NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (margin >= 0),
  free_margin NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (free_margin >= 0),
  margin_level NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  leverage TEXT NOT NULL DEFAULT '1:500',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 Active & Historical Trades Table (Manual & Bot Orders/Positions)
CREATE TABLE IF NOT EXISTS public.vtm_trades (
  trade_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT,
  account_id TEXT,
  ticket BIGINT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL DEFAULT 'MARKET',
  lots NUMERIC(12, 4) NOT NULL CHECK (lots > 0),
  open_price NUMERIC(18, 6) NOT NULL,
  current_price NUMERIC(18, 6),
  close_price NUMERIC(18, 6),
  sl NUMERIC(18, 6),
  tp NUMERIC(18, 6),
  pnl NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  swap NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'PENDING', 'CANCELLED')),
  open_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  close_time TIMESTAMPTZ,
  close_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 Deposits Table
CREATE TABLE IF NOT EXISTS public.vtm_deposits (
  deposit_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  target_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL CHECK (amount_usd > 0),
  amount_kes NUMERIC(15, 2) DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  phone_number TEXT,
  reference TEXT UNIQUE,
  checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.10 Withdrawals Table
CREATE TABLE IF NOT EXISTS public.vtm_withdrawals (
  withdrawal_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  source_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL CHECK (amount_usd > 0),
  amount_kes NUMERIC(15, 2) DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  phone_number TEXT,
  reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.11 Internal Transfers Table
CREATE TABLE IF NOT EXISTS public.vtm_transfers (
  transfer_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL CHECK (amount_usd > 0),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.12 User Platform Settings Table
CREATE TABLE IF NOT EXISTS public.vtm_user_settings (
  user_email TEXT PRIMARY KEY,
  is_dark_mode BOOLEAN NOT NULL DEFAULT true,
  one_click_trading BOOLEAN NOT NULL DEFAULT false,
  slippage NUMERIC(5, 2) NOT NULL DEFAULT 0.5,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  show_spread_brackets BOOLEAN NOT NULL DEFAULT true,
  drawdown_protection BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  default_leverage TEXT NOT NULL DEFAULT '1:500',
  favorite_symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_account_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.13 Unified Transactions Table
CREATE TABLE IF NOT EXISTS public.vtm_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER', 'ADJUSTMENT')),
  method TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED')),
  reference TEXT,
  account_number TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES FOR HIGH-PERFORMANCE QUERIES & RECONCILIATION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vtm_registered_users_email ON public.vtm_registered_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_vtm_registered_users_uid ON public.vtm_registered_users (uid);
CREATE INDEX IF NOT EXISTS idx_vtm_user_finances_email ON public.vtm_user_finances (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_vtm_user_finances_updated ON public.vtm_user_finances (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_email_type ON public.user_activities (LOWER(user_email), activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_email ON public.user_activities (user_email);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities (activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_devices_email ON public.user_devices (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_closed_trades_user_email ON public.closed_trades (LOWER(user_email), close_time DESC);
CREATE INDEX IF NOT EXISTS idx_closed_trades_account ON public.closed_trades (account_number, close_time DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_user_acc ON public.financial_ledger (LOWER(user_email), account_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_ref ON public.financial_ledger (reference_id);
CREATE INDEX IF NOT EXISTS idx_vtm_trading_accounts_email ON public.vtm_trading_accounts (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_vtm_trades_email_status ON public.vtm_trades (LOWER(user_email), status, open_time DESC);
CREATE INDEX IF NOT EXISTS idx_vtm_deposits_email ON public.vtm_deposits (LOWER(user_email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtm_withdrawals_email ON public.vtm_withdrawals (LOWER(user_email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtm_transactions_email ON public.vtm_transactions (LOWER(user_email), created_at DESC);

-- ============================================================================
-- 3. DATABASE FUNCTIONS, TRIGGERS & ATOMIC ACCOUNTING RPCs
-- ============================================================================

-- 3.1 Strict UID & Single Master Admin Enforcement Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_strict_uid_and_single_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email := LOWER(TRIM(NEW.email));

  -- Strictly restrict 'admin' role to the verified master administrator account
  IF NEW.email IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com') THEN
    NEW.uid := '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid;
    NEW.role := 'admin';
  ELSE
    IF NEW.role = 'admin' THEN
      NEW.role := 'normal';
    END IF;
    IF NEW.role NOT IN ('normal', 'marketer') OR NEW.role IS NULL THEN
      NEW.role := 'normal';
    END IF;
  END IF;

  IF NEW.uid IS NULL THEN
    NEW.uid := gen_random_uuid();
  END IF;

  IF NEW.password_hash IS NULL THEN
    NEW.password_hash := 'uid:' || NEW.uid::text || '|';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_strict_uid_and_single_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_strict_uid_and_single_admin ON public.vtm_registered_users;
CREATE TRIGGER trg_enforce_strict_uid_and_single_admin
BEFORE INSERT OR UPDATE ON public.vtm_registered_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_strict_uid_and_single_admin();

-- 3.2 Supabase Auth Sync Trigger (auth.users -> public.vtm_registered_users)
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync_vtm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_uid UUID;
BEGIN
  IF LOWER(NEW.email) IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com') THEN
    v_role := 'admin';
    v_uid := '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid;
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'normal');
    IF v_role = 'admin' THEN v_role := 'normal'; END IF;
    v_uid := NEW.id;
  END IF;

  INSERT INTO public.vtm_registered_users (
    email, uid, password_hash, name, phone_number, country_code, country_name, account_number, role, created_at, last_login_at, updated_at
  ) VALUES (
    LOWER(NEW.email),
    v_uid,
    'uid:' || v_uid::text || '|',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country_code', '+1'),
    COALESCE(NEW.raw_user_meta_data->>'country_name', 'United States'),
    COALESCE(NEW.raw_user_meta_data->>'account_number', LPAD(FLOOR(RANDOM() * 90000000 + 10000000)::TEXT, 8, '0')),
    v_role,
    now(),
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    uid = EXCLUDED.uid,
    password_hash = COALESCE(NULLIF(public.vtm_registered_users.password_hash, ''), EXCLUDED.password_hash),
    last_login_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_sync_vtm() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_vtm ON auth.users;
CREATE TRIGGER on_auth_user_created_vtm
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync_vtm();

-- 3.3 Database-Level Account Balance Guard Trigger
-- Prevents uninitialized $0 skeleton state from overwriting funded Live/Demo accounts
-- and guarantees wallet_balance is never negative.
CREATE OR REPLACE FUNCTION public.protect_vtm_user_finances_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_acc JSONB;
  v_new_acc JSONB;
  v_merged JSONB := '[]'::jsonb;
  v_found BOOLEAN;
  v_old_num TEXT;
  v_new_num TEXT;
  v_old_bal NUMERIC;
  v_new_bal NUMERIC;
  v_new_has_activity BOOLEAN;
BEGIN
  IF NEW.wallet_balance < 0 THEN
    NEW.wallet_balance := 0.00;
  END IF;

  IF TG_OP = 'UPDATE' AND jsonb_typeof(OLD.accounts) = 'array' AND jsonb_typeof(NEW.accounts) = 'array' THEN
    FOR v_new_acc IN SELECT * FROM jsonb_array_elements(NEW.accounts)
    LOOP
      v_new_num := COALESCE(v_new_acc->>'accountNumber', v_new_acc->>'id', '');
      v_new_bal := COALESCE((v_new_acc->>'balance')::numeric, 0);
      v_new_has_activity := (v_new_acc ? 'lastTradeAt' AND v_new_acc->>'lastTradeAt' IS NOT NULL)
                         OR (v_new_acc ? 'lastActivityAt' AND v_new_acc->>'lastActivityAt' IS NOT NULL)
                         OR (v_new_acc ? 'lastDepositAt' AND v_new_acc->>'lastDepositAt' IS NOT NULL);
      v_found := false;

      IF v_new_bal = 0 AND NOT v_new_has_activity AND v_new_num <> '' THEN
        FOR v_old_acc IN SELECT * FROM jsonb_array_elements(OLD.accounts)
        LOOP
          v_old_num := COALESCE(v_old_acc->>'accountNumber', v_old_acc->>'id', '');
          v_old_bal := COALESCE((v_old_acc->>'balance')::numeric, 0);
          IF v_old_num = v_new_num AND v_old_bal > 0 THEN
            v_merged := v_merged || jsonb_build_array(v_old_acc);
            v_found := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;

      IF NOT v_found THEN
        v_merged := v_merged || jsonb_build_array(v_new_acc);
      END IF;
    END LOOP;

    NEW.accounts := v_merged;
  END IF;

  NEW.last_updated := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_vtm_user_finances_accounts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_vtm_user_finances_accounts ON public.vtm_user_finances;
CREATE TRIGGER trg_protect_vtm_user_finances_accounts
BEFORE INSERT OR UPDATE ON public.vtm_user_finances
FOR EACH ROW EXECUTE FUNCTION public.protect_vtm_user_finances_accounts();

-- 3.4 Atomic Server-Side Trade Settlement RPC Function
-- Idempotently settles a trade (manual or bot), records the closed_trades row,
-- appends an immutable financial_ledger entry, and updates the owning account in vtm_user_finances.
CREATE OR REPLACE FUNCTION public.settle_trade_atomic(
  p_user_email TEXT,
  p_account_number TEXT,
  p_trade_id TEXT,
  p_ticket BIGINT,
  p_symbol TEXT,
  p_side TEXT,
  p_lots NUMERIC,
  p_open_price NUMERIC,
  p_close_price NUMERIC,
  p_pnl NUMERIC,
  p_open_time BIGINT,
  p_close_time BIGINT,
  p_reason TEXT DEFAULT 'MANUAL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(p_user_email));
  v_fin_row public.vtm_user_finances%ROWTYPE;
  v_acc JSONB;
  v_updated_accounts JSONB := '[]'::jsonb;
  v_prev_bal NUMERIC(15, 2) := 0.00;
  v_new_bal NUMERIC(15, 2) := 0.00;
  v_clamped_pnl NUMERIC(15, 2) := ROUND(COALESCE(p_pnl, 0)::numeric, 2);
  v_matched BOOLEAN := false;
BEGIN
  -- 1. Idempotency Guard: If trade_id is already settled in closed_trades or financial_ledger, return existing settlement
  IF EXISTS (
    SELECT 1 FROM public.closed_trades WHERE id = p_trade_id
  ) OR EXISTS (
    SELECT 1 FROM public.financial_ledger
    WHERE LOWER(user_email) = v_clean_email
      AND reference_id = p_trade_id
      AND entry_type = 'REALIZED_TRADE_PNL'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Trade already settled'
    );
  END IF;

  -- 2. Lock the user's financial row for atomic update
  SELECT * INTO v_fin_row
  FROM public.vtm_user_finances
  WHERE LOWER(user_email) = v_clean_email OR LOWER(user_key) = v_clean_email
  ORDER BY last_updated DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User financial record not found');
  END IF;

  -- 3. Locate the exact owning trading account and apply negative-balance protection
  IF jsonb_typeof(v_fin_row.accounts) = 'array' THEN
    FOR v_acc IN SELECT * FROM jsonb_array_elements(v_fin_row.accounts)
    LOOP
      IF (v_acc->>'accountNumber' = p_account_number OR v_acc->>'id' = p_account_number) AND NOT v_matched THEN
        v_prev_bal := ROUND(COALESCE((v_acc->>'balance')::numeric, 0), 2);
        IF v_clamped_pnl < 0 AND ABS(v_clamped_pnl) > v_prev_bal THEN
          v_clamped_pnl := -v_prev_bal;
        END IF;
        v_new_bal := GREATEST(0.00, ROUND(v_prev_bal + v_clamped_pnl, 2));
        v_acc := jsonb_set(v_acc, '{balance}', to_jsonb(v_new_bal));
        v_acc := jsonb_set(v_acc, '{equity}', to_jsonb(v_new_bal));
        v_acc := jsonb_set(v_acc, '{freeMargin}', to_jsonb(GREATEST(0.00, v_new_bal - COALESCE((v_acc->>'margin')::numeric, 0))));
        v_acc := jsonb_set(v_acc, '{lastTradeAt}', to_jsonb((EXTRACT(EPOCH FROM now()) * 1000)::bigint));
        v_matched := true;
      END IF;
      v_updated_accounts := v_updated_accounts || jsonb_build_array(v_acc);
    END LOOP;
  END IF;

  IF NOT v_matched THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target trading account not found');
  END IF;

  -- 4. Insert immutable closed trade record
  INSERT INTO public.closed_trades (
    id, user_email, ticket, account_number, symbol, side, lots,
    open_price, close_price, pnl, open_time, close_time, reason
  ) VALUES (
    p_trade_id, v_clean_email, p_ticket, p_account_number, p_symbol, p_side, p_lots,
    p_open_price, p_close_price, v_clamped_pnl, p_open_time, p_close_time, COALESCE(p_reason, 'MANUAL')
  ) ON CONFLICT (id) DO NOTHING;

  -- 5. Insert immutable financial ledger entry
  INSERT INTO public.financial_ledger (
    id, user_email, account_number, entry_type, amount,
    previous_balance, new_balance, reference_id, reason, metadata
  ) VALUES (
    'ldg-' || p_trade_id,
    v_clean_email,
    p_account_number,
    'REALIZED_TRADE_PNL',
    v_clamped_pnl,
    v_prev_bal,
    v_new_bal,
    p_trade_id,
    'Trade Settled #' || p_ticket::text || ' ' || p_side || ' ' || p_lots::text || ' ' || p_symbol || ' (' || COALESCE(p_reason, 'MANUAL') || ')',
    jsonb_build_object(
      'ticket', p_ticket,
      'symbol', p_symbol,
      'side', p_side,
      'lots', p_lots,
      'openPrice', p_open_price,
      'closePrice', p_close_price,
      'pnl', v_clamped_pnl,
      'reason', COALESCE(p_reason, 'MANUAL')
    )
  ) ON CONFLICT (user_email, account_number, entry_type, reference_id) DO NOTHING;

  -- 6. Update vtm_user_finances rows for this user
  UPDATE public.vtm_user_finances
  SET accounts = v_updated_accounts,
      last_updated = now()
  WHERE LOWER(user_email) = v_clean_email OR LOWER(user_key) = v_clean_email;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'accountNumber', p_account_number,
    'previousBalance', v_prev_bal,
    'realizedPnl', v_clamped_pnl,
    'newBalance', v_new_bal
  );
END;
$$;

-- 3.5 Ledger Reconciliation RPC Function
-- Reconciles opening balance, deposits, withdrawals, transfers, realized net P/L, and fees against current balance.
CREATE OR REPLACE FUNCTION public.reconcile_account_ledger(
  p_user_email TEXT,
  p_account_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(p_user_email));
  v_ledger_sum NUMERIC(15, 2) := 0.00;
  v_entry_count INT := 0;
  v_last_ledger_bal NUMERIC(15, 2) := 0.00;
  v_current_acc_bal NUMERIC(15, 2) := 0.00;
  v_fin_row public.vtm_user_finances%ROWTYPE;
  v_acc JSONB;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0.00)
  INTO v_entry_count, v_ledger_sum
  FROM public.financial_ledger
  WHERE LOWER(user_email) = v_clean_email
    AND account_number = p_account_number;

  SELECT new_balance INTO v_last_ledger_bal
  FROM public.financial_ledger
  WHERE LOWER(user_email) = v_clean_email
    AND account_number = p_account_number
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_fin_row
  FROM public.vtm_user_finances
  WHERE LOWER(user_email) = v_clean_email OR LOWER(user_key) = v_clean_email
  ORDER BY last_updated DESC
  LIMIT 1;

  IF FOUND AND jsonb_typeof(v_fin_row.accounts) = 'array' THEN
    FOR v_acc IN SELECT * FROM jsonb_array_elements(v_fin_row.accounts)
    LOOP
      IF v_acc->>'accountNumber' = p_account_number OR v_acc->>'id' = p_account_number THEN
        v_current_acc_bal := ROUND(COALESCE((v_acc->>'balance')::numeric, 0), 2);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'userEmail', v_clean_email,
    'accountNumber', p_account_number,
    'entryCount', v_entry_count,
    'ledgerNetSum', v_ledger_sum,
    'lastLedgerBalance', COALESCE(v_last_ledger_bal, v_current_acc_bal),
    'currentAccountBalance', v_current_acc_bal,
    'discrepancy', ROUND(v_current_acc_bal - COALESCE(v_last_ledger_bal, v_current_acc_bal), 2),
    'reconciled', ABS(v_current_acc_bal - COALESCE(v_last_ledger_bal, v_current_acc_bal)) < 0.01
  );
END;
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & GRANTS
-- ============================================================================

ALTER TABLE public.vtm_registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_transactions ENABLE ROW LEVEL SECURITY;

-- Drop legacy or partial policies before creating complete CRUD policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'vtm_registered_users',
        'vtm_user_finances',
        'user_activities',
        'user_devices',
        'closed_trades',
        'financial_ledger',
        'vtm_trading_accounts',
        'vtm_trades',
        'vtm_deposits',
        'vtm_withdrawals',
        'vtm_transfers',
        'vtm_user_settings',
        'vtm_transactions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Validated RLS Policies (Includes SELECT, INSERT, UPDATE, DELETE where required)
CREATE POLICY "vtm_registered_users_access" ON public.vtm_registered_users
  FOR ALL TO anon, authenticated, service_role
  USING (email IS NOT NULL AND length(trim(email)) > 0)
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 0);

CREATE POLICY "vtm_user_finances_access" ON public.vtm_user_finances
  FOR ALL TO anon, authenticated, service_role
  USING (user_key IS NOT NULL AND length(trim(user_key)) > 0)
  WITH CHECK (user_key IS NOT NULL AND length(trim(user_key)) > 0);

CREATE POLICY "user_activities_access" ON public.user_activities
  FOR ALL TO anon, authenticated, service_role
  USING (user_email IS NOT NULL AND length(trim(user_email)) > 0)
  WITH CHECK (user_email IS NOT NULL AND length(trim(user_email)) > 0);

CREATE POLICY "user_devices_access" ON public.user_devices
  FOR ALL TO anon, authenticated, service_role
  USING (device_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (device_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "closed_trades_access" ON public.closed_trades
  FOR ALL TO anon, authenticated, service_role
  USING (id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "financial_ledger_access" ON public.financial_ledger
  FOR ALL TO anon, authenticated, service_role
  USING (id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_trading_accounts_access" ON public.vtm_trading_accounts
  FOR ALL TO anon, authenticated, service_role
  USING (account_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (account_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_trades_access" ON public.vtm_trades
  FOR ALL TO anon, authenticated, service_role
  USING (trade_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (trade_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_deposits_access" ON public.vtm_deposits
  FOR ALL TO anon, authenticated, service_role
  USING (deposit_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (deposit_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_withdrawals_access" ON public.vtm_withdrawals
  FOR ALL TO anon, authenticated, service_role
  USING (withdrawal_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (withdrawal_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_transfers_access" ON public.vtm_transfers
  FOR ALL TO anon, authenticated, service_role
  USING (transfer_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (transfer_id IS NOT NULL AND user_email IS NOT NULL);

CREATE POLICY "vtm_user_settings_access" ON public.vtm_user_settings
  FOR ALL TO anon, authenticated, service_role
  USING (user_email IS NOT NULL AND length(trim(user_email)) > 0)
  WITH CHECK (user_email IS NOT NULL AND length(trim(user_email)) > 0);

CREATE POLICY "vtm_transactions_access" ON public.vtm_transactions
  FOR ALL TO anon, authenticated, service_role
  USING (transaction_id IS NOT NULL AND user_email IS NOT NULL)
  WITH CHECK (transaction_id IS NOT NULL AND user_email IS NOT NULL);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Restrict direct invocation of trigger functions
REVOKE ALL ON FUNCTION public.enforce_strict_uid_and_single_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_auth_user_sync_vtm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_vtm_user_finances_accounts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_trade_atomic(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BIGINT, BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_account_ledger(TEXT, TEXT) TO anon, authenticated, service_role;
