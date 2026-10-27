-- ============================================================================
-- VTM MARKETS PLATFORM — COMPLETE AUTHORITATIVE SQL SCHEMA & MIGRATION SCRIPT
-- ============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Synchronized with database/schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Registered Users Table
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

-- 2. User Financials & Live/Demo Accounts Table
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

-- 3. User Activities & Cloud State Store
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User Devices Registry
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

-- 5. Closed Trades Table
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

-- 6. Immutable Financial Ledger Table
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  previous_balance NUMERIC(15, 2) NOT NULL,
  new_balance NUMERIC(15, 2) NOT NULL CHECK (new_balance >= 0),
  reference_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_email, account_number, entry_type, reference_id)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_vtm_registered_users_email ON public.vtm_registered_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_vtm_user_finances_email ON public.vtm_user_finances (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_vtm_user_finances_updated ON public.vtm_user_finances (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_email_type ON public.user_activities (LOWER(user_email), activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_closed_trades_user_email ON public.closed_trades (LOWER(user_email), close_time DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_user_acc ON public.financial_ledger (LOWER(user_email), account_number, created_at DESC);

-- 8. Row Level Security (Full CRUD with Validated Non-Empty Keys)
ALTER TABLE public.vtm_registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

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
        'financial_ledger'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

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

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 9. REFERRAL & AFFILIATE PROGRAM TABLES (5% Commission, $20 Claim Threshold)
-- ============================================================================

-- 9.1 Referrals Registry
CREATE TABLE IF NOT EXISTS public.vtm_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  referrer_code TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referred_name TEXT DEFAULT 'Referred Trader',
  referred_account_number TEXT,
  total_deposited_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited_usd >= 0),
  total_commission_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_commission_usd >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_email, referred_email)
);

-- 9.2 Referral Commissions Ledger (5% on every deposit)
CREATE TABLE IF NOT EXISTS public.vtm_referral_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  deposit_amount_usd NUMERIC(15, 2) NOT NULL CHECK (deposit_amount_usd > 0),
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500 CHECK (commission_rate = 0.0500),
  commission_earned_usd NUMERIC(15, 2) NOT NULL CHECK (commission_earned_usd > 0),
  deposit_reference TEXT,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9.3 Referral Payout / Claims (Minimum $20.00 threshold)
CREATE TABLE IF NOT EXISTS public.vtm_referral_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  amount_claimed_usd NUMERIC(15, 2) NOT NULL CHECK (amount_claimed_usd >= 20.00),
  wallet_tx_reference TEXT NOT NULL UNIQUE,
  wallet_credited BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referrer_email ON public.vtm_referrals (LOWER(referrer_email));
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referrer_code ON public.vtm_referrals (referrer_code);
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referred_email ON public.vtm_referrals (LOWER(referred_email));
CREATE INDEX IF NOT EXISTS idx_vtm_ref_comm_referrer ON public.vtm_referral_commissions (LOWER(referrer_email), claimed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtm_ref_claims_referrer ON public.vtm_referral_claims (LOWER(referrer_email), claimed_at DESC);

-- Enable RLS
ALTER TABLE public.vtm_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_referral_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vtm_referrals_access" ON public.vtm_referrals;
CREATE POLICY "vtm_referrals_access" ON public.vtm_referrals
  FOR ALL TO anon, authenticated, service_role
  USING (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0)
  WITH CHECK (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0);

DROP POLICY IF EXISTS "vtm_referral_commissions_access" ON public.vtm_referral_commissions;
CREATE POLICY "vtm_referral_commissions_access" ON public.vtm_referral_commissions
  FOR ALL TO anon, authenticated, service_role
  USING (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0)
  WITH CHECK (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0);

DROP POLICY IF EXISTS "vtm_referral_claims_access" ON public.vtm_referral_claims;
CREATE POLICY "vtm_referral_claims_access" ON public.vtm_referral_claims
  FOR ALL TO anon, authenticated, service_role
  USING (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0)
  WITH CHECK (referrer_email IS NOT NULL AND length(trim(referrer_email)) > 0);

-- Trigger to guarantee exactly 5% commission math on insert
CREATE OR REPLACE FUNCTION public.fn_calculate_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_rate := 0.0500;
  NEW.commission_earned_usd := ROUND(NEW.deposit_amount_usd * 0.05, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_referral_commission ON public.vtm_referral_commissions;
CREATE TRIGGER trg_calc_referral_commission
BEFORE INSERT ON public.vtm_referral_commissions
FOR EACH ROW
EXECUTE FUNCTION public.fn_calculate_referral_commission();

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
