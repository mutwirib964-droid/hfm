-- ============================================================================
-- VTM MARKETS PROFESSIONAL SUPABASE DATABASE SCHEMA
-- Run this complete SQL script in your Supabase SQL Editor to initialize
-- all tables, indexes, security policies, and triggers for professional trading.
-- ============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Users Table (Stores trader registration profiles, roles, and KYC metadata)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null default 'normal', -- 'normal' or 'marketer' or 'admin'
  phone text,
  country text,
  country_code text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Trading Accounts Table (Live & Demo accounts per user)
create table if not exists public.accounts (
  id text primary key,
  user_email text not null references public.users(email) on delete cascade,
  account_number text not null,
  type text not null default 'Live', -- 'Live' or 'Demo'
  tier text not null default 'Standard', -- 'Standard', 'Pro', 'VIP'
  currency text not null default 'USD',
  balance numeric(15, 2) not null default 0.00,
  equity numeric(15, 2) not null default 0.00,
  free_margin numeric(15, 2) not null default 0.00,
  leverage text not null default '1:500',
  last_trade_at bigint,
  last_activity_at bigint,
  created_at timestamptz not null default now()
);

-- 4. Transactions Table (Deposits, Withdrawals, Transfers)
create table if not exists public.transactions (
  id text primary key,
  user_email text not null references public.users(email) on delete cascade,
  type text not null, -- 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
  method text not null,
  amount numeric(15, 2) not null,
  currency text not null default 'USD',
  status text not null default 'COMPLETED', -- 'COMPLETED', 'PENDING', 'FAILED'
  reference text,
  account_number text,
  details text,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

-- 5. Open Positions Table (Manual & Automated active market positions)
create table if not exists public.positions (
  id text primary key,
  user_email text not null references public.users(email) on delete cascade,
  ticket bigint not null,
  account_number text,
  symbol text not null,
  side text not null, -- 'BUY' or 'SELL'
  lots numeric(10, 2) not null,
  open_price numeric(15, 6) not null,
  current_price numeric(15, 6) not null,
  sl numeric(15, 6),
  tp numeric(15, 6),
  sl_usd numeric(15, 2),
  tp_usd numeric(15, 2),
  pnl numeric(15, 2) not null default 0.00,
  swap numeric(15, 2) not null default 0.00,
  commission numeric(15, 2) not null default 0.00,
  open_time bigint not null,
  target_outcome text,
  created_at timestamptz not null default now()
);

-- 6. Closed Trades Table (Execution history for manual and bot trades)
create table if not exists public.closed_trades (
  id text primary key,
  user_email text not null references public.users(email) on delete cascade,
  ticket bigint not null,
  account_number text,
  symbol text not null,
  side text not null,
  lots numeric(10, 2) not null,
  open_price numeric(15, 6) not null,
  close_price numeric(15, 6) not null,
  pnl numeric(15, 2) not null,
  open_time bigint not null,
  close_time bigint not null,
  reason text not null, -- 'MANUAL', 'TP', 'SL'
  created_at timestamptz not null default now()
);

-- 7. Bot Runs Table (Deployed EA / Trading Bot instances)
create table if not exists public.bot_runs (
  id text primary key,
  user_email text not null references public.users(email) on delete cascade,
  bot_id text not null,
  bot_name text not null,
  bot_type text not null,
  symbol text not null,
  lot_size numeric(10, 2) not null,
  tp_pips integer not null,
  sl_pips integer not null,
  status text not null default 'PAUSED', -- 'RUNNING', 'PAUSED'
  started_at bigint not null,
  total_trades integer not null default 0,
  winning_trades integer not null default 0,
  losing_trades integer not null default 0,
  total_profit_usd numeric(15, 2) not null default 0.00,
  last_signal text,
  account_number text,
  created_at timestamptz not null default now()
);

-- 8. Bot Trades Table (Individual trades opened by algorithmic bots)
create table if not exists public.bot_trades (
  id text primary key,
  run_id text not null,
  user_email text not null references public.users(email) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  side text not null,
  lot_size numeric(10, 2) not null,
  open_price numeric(15, 6) not null,
  current_price numeric(15, 6) not null,
  tp numeric(15, 6) not null,
  sl numeric(15, 6) not null,
  profit_usd numeric(15, 2) not null default 0.00,
  status text not null default 'OPEN', -- 'OPEN', 'CLOSED'
  open_time bigint not null,
  close_time bigint,
  close_reason text,
  account_number text,
  created_at timestamptz not null default now()
);

-- 9. User Settings Table (Platform preferences, dark mode, 2FA secrets)
create table if not exists public.user_settings (
  user_email text primary key references public.users(email) on delete cascade,
  is_dark_mode boolean not null default true,
  one_click_trading boolean not null default true,
  slippage numeric(5, 2) not null default 0.5,
  sound_enabled boolean not null default true,
  show_spread_brackets boolean not null default true,
  drawdown_protection boolean not null default true,
  two_factor_enabled boolean not null default false,
  two_factor_secret text,
  updated_at timestamptz not null default now()
);

-- 10. Activity Logs Table (Audit trail of platform activities and transactions)
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null references public.users(email) on delete cascade,
  type text not null,
  description text not null,
  metadata jsonb,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================================

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.positions enable row level security;
alter table public.closed_trades enable row level security;
alter table public.bot_runs enable row level security;
alter table public.bot_trades enable row level security;
alter table public.user_settings enable row level security;
alter table public.activity_logs enable row level security;

-- Allow public anonymous/authenticated read/write access for seamless platform preview operation
create policy "Allow all operations on users" on public.users for all using (true) with check (true);
create policy "Allow all operations on accounts" on public.accounts for all using (true) with check (true);
create policy "Allow all operations on transactions" on public.transactions for all using (true) with check (true);
create policy "Allow all operations on positions" on public.positions for all using (true) with check (true);
create policy "Allow all operations on closed_trades" on public.closed_trades for all using (true) with check (true);
create policy "Allow all operations on bot_runs" on public.bot_runs for all using (true) with check (true);
create policy "Allow all operations on bot_trades" on public.bot_trades for all using (true) with check (true);
create policy "Allow all operations on user_settings" on public.user_settings for all using (true) with check (true);
create policy "Allow all operations on activity_logs" on public.activity_logs for all using (true) with check (true);

-- ============================================================================
-- END OF SQL SCHEMA
-- ============================================================================
