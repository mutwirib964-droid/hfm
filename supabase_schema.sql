-- ============================================================================
-- VTM MARKETS - COMPLETE SUPABASE PRODUCTION DATABASE SCHEMA
-- Multi-Asset Trading, Central Wallet, Bot Automation, Copy Trading & Settings
-- Compatible with Supabase PostgreSQL (run in Supabase Dashboard -> SQL Editor)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('normal', 'marketer', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('Live', 'Demo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE account_tier AS ENUM ('Premium', 'Pro', 'Zero Spread', 'Cent', 'HFcopy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE pending_order_type AS ENUM ('BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE pending_order_status AS ENUM ('PENDING', 'TRIGGERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trade_close_reason AS ENUM ('TP', 'SL', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bot_type AS ENUM ('INBUILT', 'IMPORTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bot_status AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bot_trade_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bot_close_reason AS ENUM ('TAKE_PROFIT', 'STOP_LOSS', 'MANUAL_CLOSE', 'TP', 'SL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. USER PROFILES & AUTH SYNCHRONIZATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(64),
  country_code VARCHAR(16) DEFAULT '+1',
  country_name VARCHAR(128) DEFAULT 'United States',
  role user_role DEFAULT 'normal'::user_role,
  wallet_balance NUMERIC(16, 2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
  currency VARCHAR(8) DEFAULT 'USD',
  kyc_status VARCHAR(32) DEFAULT 'VERIFIED',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_account_number ON public.profiles(account_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. USER SETTINGS & PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_dark_mode BOOLEAN DEFAULT TRUE,
  default_leverage VARCHAR(16) DEFAULT '1:500',
  default_symbol VARCHAR(32) DEFAULT 'EURUSD',
  default_timeframe VARCHAR(8) DEFAULT '15M',
  chart_type VARCHAR(16) DEFAULT 'candles',
  one_click_trading BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  favorite_symbols TEXT[] DEFAULT ARRAY['EURUSD', 'XAUUSD', 'BTCUSD', 'US500', 'GBPUSD'],
  custom_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. TRADING ACCOUNTS (LIVE & DEMO ACCOUNTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_number VARCHAR(32) UNIQUE NOT NULL,
  server VARCHAR(128) NOT NULL DEFAULT 'VTMarkets-LiveServer1',
  type account_type NOT NULL DEFAULT 'Live'::account_type,
  tier account_tier NOT NULL DEFAULT 'Zero Spread'::account_tier,
  balance NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  equity NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  margin NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  free_margin NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  margin_level NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  leverage VARCHAR(16) NOT NULL DEFAULT '1:500',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_number ON public.trading_accounts(account_number);

DROP TRIGGER IF EXISTS trg_trading_accounts_updated_at ON public.trading_accounts;
CREATE TRIGGER trg_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. TRANSACTIONS & WALLET LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  method VARCHAR(128) NOT NULL,
  amount NUMERIC(16, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status transaction_status NOT NULL DEFAULT 'COMPLETED'::transaction_status,
  reference VARCHAR(64) UNIQUE NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================================================
-- 8. OPEN POSITIONS (ACTIVE TRADES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  ticket BIGINT NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side order_side NOT NULL,
  lots NUMERIC(10, 2) NOT NULL CHECK (lots > 0),
  open_price NUMERIC(16, 5) NOT NULL,
  current_price NUMERIC(16, 5) NOT NULL,
  sl NUMERIC(16, 5),
  tp NUMERIC(16, 5),
  pnl NUMERIC(16, 2) DEFAULT 0.00,
  swap NUMERIC(16, 2) DEFAULT 0.00,
  commission NUMERIC(16, 2) DEFAULT 0.00,
  open_time TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_account_id ON public.positions(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_positions_ticket ON public.positions(ticket);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);

DROP TRIGGER IF EXISTS trg_positions_updated_at ON public.positions;
CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. PENDING ORDERS (LIMIT & STOP ORDERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  ticket BIGINT NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side order_side NOT NULL,
  type pending_order_type NOT NULL,
  target_price NUMERIC(16, 5) NOT NULL,
  lots NUMERIC(10, 2) NOT NULL CHECK (lots > 0),
  sl NUMERIC(16, 5),
  tp NUMERIC(16, 5),
  status pending_order_status NOT NULL DEFAULT 'PENDING'::pending_order_status,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON public.pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_account_id ON public.pending_orders(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON public.pending_orders(status);

-- ============================================================================
-- 10. CLOSED TRADES (REALIZED PROFITS & LOSSES HISTORY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.closed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  ticket BIGINT NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side order_side NOT NULL,
  lots NUMERIC(10, 2) NOT NULL,
  open_price NUMERIC(16, 5) NOT NULL,
  close_price NUMERIC(16, 5) NOT NULL,
  pnl NUMERIC(16, 2) NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ DEFAULT NOW(),
  reason trade_close_reason NOT NULL DEFAULT 'MANUAL'::trade_close_reason,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closed_trades_user_id ON public.closed_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_closed_trades_account_id ON public.closed_trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_closed_trades_close_time ON public.closed_trades(close_time DESC);

-- ============================================================================
-- 11. STRATEGY PROVIDERS (MASTER COPY TRADERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.strategy_providers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  avatar TEXT NOT NULL,
  country VARCHAR(64) NOT NULL,
  flag VARCHAR(8) NOT NULL,
  return_percent NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  max_drawdown NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  followers INT NOT NULL DEFAULT 0,
  performance_fee NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  risk_score INT NOT NULL DEFAULT 2 CHECK (risk_score BETWEEN 1 AND 5),
  equity_history JSONB DEFAULT '[]'::jsonb,
  win_rate NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
  total_trades INT NOT NULL DEFAULT 0,
  strategy_description TEXT,
  experience_months INT DEFAULT 12,
  min_deposit NUMERIC(12, 2) DEFAULT 100.00,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. FOLLOWED STRATEGIES (USER COPY TRADING SUBSCRIPTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.followed_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  provider_id VARCHAR(64) NOT NULL REFERENCES public.strategy_providers(id) ON DELETE CASCADE,
  provider_name VARCHAR(128) NOT NULL,
  allocated_amount NUMERIC(16, 2) NOT NULL CHECK (allocated_amount > 0),
  current_profit NUMERIC(16, 2) DEFAULT 0.00,
  profit_percent NUMERIC(8, 2) DEFAULT 0.00,
  volume_allocation NUMERIC(5, 2) DEFAULT 100.00,
  rescue_level NUMERIC(5, 2) DEFAULT 30.00,
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followed_strategies_user_id ON public.followed_strategies(user_id);

-- ============================================================================
-- 13. BOT STRATEGY CONFIGS (INBUILT & IMPORTED ALGORITHMS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bot_strategy_configs (
  id VARCHAR(64) PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global system preset
  name VARCHAR(128) NOT NULL,
  type bot_type NOT NULL DEFAULT 'INBUILT'::bot_type,
  description TEXT,
  tag VARCHAR(64),
  recommended_instruments TEXT[] DEFAULT ARRAY['EURUSD', 'XAUUSD', 'US500'],
  default_lot_size NUMERIC(6, 2) DEFAULT 0.10,
  default_tp_pips INT DEFAULT 40,
  default_sl_pips INT DEFAULT 25,
  author VARCHAR(128) DEFAULT 'VTM Institutional Research',
  version VARCHAR(32) DEFAULT 'v2.4',
  strategy_logic TEXT,
  indicator_triggers TEXT[] DEFAULT ARRAY['EMA Ribbon (20/50/200)', 'RSI Divergence (14)'],
  timeframe VARCHAR(16) DEFAULT '15M / 1H',
  imported_file_name VARCHAR(255),
  custom_code_snippet TEXT,
  claimed_win_rate VARCHAR(32) DEFAULT '74% - 82%',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_configs_user_id ON public.bot_strategy_configs(user_id);

-- ============================================================================
-- 14. BOT RUN INSTANCES (ACTIVE ALGORITHMIC RUNNERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bot_run_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  bot_id VARCHAR(64) NOT NULL REFERENCES public.bot_strategy_configs(id) ON DELETE CASCADE,
  bot_name VARCHAR(128) NOT NULL,
  bot_type bot_type NOT NULL DEFAULT 'INBUILT'::bot_type,
  symbol VARCHAR(32) NOT NULL,
  lot_size NUMERIC(6, 2) NOT NULL DEFAULT 0.10,
  tp_pips INT NOT NULL DEFAULT 40,
  sl_pips INT NOT NULL DEFAULT 25,
  status bot_status NOT NULL DEFAULT 'RUNNING'::bot_status,
  user_role_at_start user_role DEFAULT 'normal'::user_role,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  total_profit_usd NUMERIC(16, 2) DEFAULT 0.00,
  last_signal VARCHAR(255),
  last_signal_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_run_user_id ON public.bot_run_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_run_status ON public.bot_run_instances(status);

DROP TRIGGER IF EXISTS trg_bot_run_instances_updated_at ON public.bot_run_instances;
CREATE TRIGGER trg_bot_run_instances_updated_at
  BEFORE UPDATE ON public.bot_run_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 15. BOT TRADES (BOT-EXECUTED ORDERS & OUTCOMES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_instance_id UUID REFERENCES public.bot_run_instances(id) ON DELETE CASCADE,
  ticket BIGINT,
  bot_id VARCHAR(64),
  bot_name VARCHAR(128) NOT NULL,
  bot_type bot_type DEFAULT 'INBUILT'::bot_type,
  symbol VARCHAR(32) NOT NULL,
  side order_side NOT NULL,
  lot_size NUMERIC(6, 2) NOT NULL,
  open_price NUMERIC(16, 5) NOT NULL,
  current_price NUMERIC(16, 5) NOT NULL,
  close_price NUMERIC(16, 5),
  tp_price NUMERIC(16, 5),
  sl_price NUMERIC(16, 5),
  tp_pips INT,
  sl_pips INT,
  open_time TIMESTAMPTZ DEFAULT NOW(),
  close_time TIMESTAMPTZ,
  status bot_trade_status NOT NULL DEFAULT 'OPEN'::bot_trade_status,
  profit_usd NUMERIC(16, 2) DEFAULT 0.00,
  exit_reason VARCHAR(64),
  target_outcome VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_trades_user_id ON public.bot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_trades_run_id ON public.bot_trades(run_instance_id);

-- ============================================================================
-- 16. SUPPORT CHAT & DESK MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender VARCHAR(32) NOT NULL CHECK (sender IN ('user', 'support', 'system')),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_timestamp ON public.support_messages(timestamp ASC);

-- ============================================================================
-- 17. AUTOMATIC USER ONBOARDING TRIGGER (auth.users -> public.profiles)
-- Runs whenever a trader signs up via Supabase Auth
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_vtm_user()
RETURNS TRIGGER AS $$
DECLARE
  new_acc_no VARCHAR(32);
  v_country_code VARCHAR(16);
  v_country_name VARCHAR(128);
  v_name VARCHAR(255);
  v_phone VARCHAR(64);
  v_role user_role;
BEGIN
  -- Generate unique VTM account number
  new_acc_no := 'VTM-' || FLOOR(1000000 + RANDOM() * 9000000)::TEXT;
  
  -- Extract metadata if passed during sign up
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_country_code := COALESCE(NEW.raw_user_meta_data->>'country_code', '+1');
  v_country_name := COALESCE(NEW.raw_user_meta_data->>'country_name', 'United States');
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'normal'::user_role);

  -- 1. Create Profile
  INSERT INTO public.profiles (
    id,
    account_number,
    name,
    email,
    phone_number,
    country_code,
    country_name,
    role,
    wallet_balance,
    currency
  ) VALUES (
    NEW.id,
    new_acc_no,
    v_name,
    NEW.email,
    v_phone,
    v_country_code,
    v_country_name,
    v_role,
    0.00,
    'USD'
  );

  -- 2. Create User Settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  -- 3. Create Default Zero Spread Live Account
  INSERT INTO public.trading_accounts (
    user_id,
    account_number,
    server,
    type,
    tier,
    balance,
    equity,
    free_margin,
    leverage,
    is_default
  ) VALUES (
    NEW.id,
    '7' || FLOOR(100000 + RANDOM() * 900000)::TEXT,
    'VTMarkets-LiveServer1',
    'Live'::account_type,
    'Zero Spread'::account_tier,
    0.00,
    0.00,
    0.00,
    '1:500',
    TRUE
  );

  -- 4. Create Default Practice Demo Account ($100,000)
  INSERT INTO public.trading_accounts (
    user_id,
    account_number,
    server,
    type,
    tier,
    balance,
    equity,
    free_margin,
    leverage,
    is_default
  ) VALUES (
    NEW.id,
    '3' || FLOOR(100000 + RANDOM() * 900000)::TEXT,
    'VTMarkets-DemoServer',
    'Demo'::account_type,
    'Pro'::account_tier,
    100000.00,
    100000.00,
    100000.00,
    '1:500',
    FALSE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vtm_user();

-- ============================================================================
-- 18. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Each trader can ONLY access their own data
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_strategy_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_run_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- SETTINGS
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- TRADING ACCOUNTS
CREATE POLICY "Users can view own trading accounts" ON public.trading_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading accounts" ON public.trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading accounts" ON public.trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POSITIONS (OPEN TRADES)
CREATE POLICY "Users manage own positions" ON public.positions
  FOR ALL USING (auth.uid() = user_id);

-- PENDING ORDERS
CREATE POLICY "Users manage own pending orders" ON public.pending_orders
  FOR ALL USING (auth.uid() = user_id);

-- CLOSED TRADES (P&L HISTORY)
CREATE POLICY "Users manage own closed trades" ON public.closed_trades
  FOR ALL USING (auth.uid() = user_id);

-- STRATEGY PROVIDERS (PUBLIC DIRECTORY)
CREATE POLICY "Anyone can view strategy providers" ON public.strategy_providers
  FOR SELECT USING (true);

-- FOLLOWED STRATEGIES
CREATE POLICY "Users manage own followed copy strategies" ON public.followed_strategies
  FOR ALL USING (auth.uid() = user_id);

-- BOT STRATEGY CONFIGS
CREATE POLICY "Users view public configs or own custom configs" ON public.bot_strategy_configs
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users manage own custom bot configs" ON public.bot_strategy_configs
  FOR ALL USING (auth.uid() = user_id);

-- BOT RUN INSTANCES
CREATE POLICY "Users manage own bot run instances" ON public.bot_run_instances
  FOR ALL USING (auth.uid() = user_id);

-- BOT TRADES
CREATE POLICY "Users manage own bot trades" ON public.bot_trades
  FOR ALL USING (auth.uid() = user_id);

-- SUPPORT MESSAGES
CREATE POLICY "Users manage own support messages" ON public.support_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 19. REALTIME REPLICATION (Instant Live Updates in UI)
-- ============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.profiles,
    public.user_settings,
    public.trading_accounts,
    public.transactions,
    public.positions,
    public.pending_orders,
    public.closed_trades,
    public.followed_strategies,
    public.bot_run_instances,
    public.bot_trades,
    public.support_messages;
COMMIT;

-- ============================================================================
-- 20. SEED DEFAULT STRATEGY PROVIDERS & INBUILT BOTS
-- ============================================================================
INSERT INTO public.strategy_providers (
  id, name, avatar, country, flag, return_percent, max_drawdown, followers, performance_fee, risk_score, equity_history, win_rate, total_trades, strategy_description, experience_months, min_deposit
) VALUES
  ('sp-1', 'Apex Trend Alpha', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces', 'United Kingdom', '🇬🇧', 284.40, 11.20, 1420, 20.00, 2, '[100, 115, 128, 142, 138, 160, 185, 210, 240, 284]'::jsonb, 78.50, 680, 'Systematic trend-following on major forex pairs and precious metals with strict stop-loss rules.', 38, 250.00),
  ('sp-2', 'Nexus Quantum HFT', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces', 'Switzerland', '🇨🇭', 412.10, 14.60, 2180, 25.00, 3, '[100, 125, 140, 175, 210, 260, 310, 370, 412]'::jsonb, 84.20, 1450, 'High-frequency statistical arbitrage capturing micro-inefficiencies in USD pairs during London & NY overlaps.', 46, 500.00),
  ('sp-3', 'Gold Horizon Scalp', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces', 'United Arab Emirates', '🇦🇪', 198.80, 9.40, 985, 18.00, 1, '[100, 110, 122, 135, 145, 162, 178, 198]'::jsonb, 81.00, 520, 'Conservative low-drawdown gold breakout strategy utilizing volume profile and order block confirmation.', 28, 100.00),
  ('sp-4', 'Vanguard Macro Pro', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces', 'Singapore', '🇸🇬', 325.60, 12.80, 1640, 20.00, 2, '[100, 118, 135, 155, 190, 225, 270, 325]'::jsonb, 76.80, 890, 'Global macro CFD strategy trading global equity indices, crude oil, and major bond yields.', 52, 300.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bot_strategy_configs (
  id, name, type, description, tag, recommended_instruments, default_lot_size, default_tp_pips, default_sl_pips, author, version, strategy_logic, indicator_triggers, timeframe, claimed_win_rate, is_public
) VALUES
  ('bot-vtm-quant', 'VTM Quantum Scalper', 'INBUILT'::bot_type, 'High-frequency institutional scalping targeting micro volatility bursts during London and New York overlaps with adaptive trailing stop-loss.', 'High Frequency', ARRAY['EURUSD', 'GBPUSD', 'USDJPY'], 0.20, 25, 15, 'VTM Quantitative Research Desk', 'v4.2', 'Identifies micro-liquidity imbalances using dynamic order book delta and EMA ribbon compression. Enters on volume expansion.', ARRAY['Order Flow Delta > 2.5x', 'EMA Ribbon 20/50 Squeeze', 'RSI 14 Dynamic Threshold'], '5M / 15M', '82.4%', TRUE),
  ('bot-gold-trend', 'Gold Titan Trend Rider', 'INBUILT'::bot_type, 'Institutional trend-following algorithm for XAUUSD capturing multi-day momentum swings with proprietary volatility expansion filters.', 'Precious Metals', ARRAY['XAUUSD', 'XAGUSD'], 0.10, 80, 45, 'VTM Metals Desk', 'v3.8', 'Filters false breakouts using Average True Range (ATR) expansion and Multi-Timeframe MACD zero-line crossovers.', ARRAY['ATR Volatility Expansion > 1.8', 'MTF MACD Momentum Cross', 'Supertrend 10/3 Confirmation'], '1H / 4H', '78.9%', TRUE),
  ('bot-index-momentum', 'WallStreet Index Momentum', 'INBUILT'::bot_type, 'Engineered exclusively for US500, NAS100, and GER40 index CFDs. Capitalizes on cash open surges and VWAP mean-reversion pullbacks.', 'Indices', ARRAY['US500', 'NAS100', 'GER40'], 0.15, 60, 35, 'Institutional CFD Division', 'v2.9', 'Monitors NYSE/NASDAQ cash session opening auctions and establishes positions aligned with institutional block flow above/below VWAP.', ARRAY['VWAP Band Deviation 2.0', 'Volume Weighted Momentum', 'Market Breadth Signal'], '15M / 1H', '75.6%', TRUE)
ON CONFLICT (id) DO NOTHING;
