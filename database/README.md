# VTM Markets — Full Platform Database, SQL, Backend, Persistence & Security Audit

## 1. Live Supabase vs. Repository Schema Inventory

### Connected Supabase Project Inspection
Using the connected Supabase PostgREST OpenAPI introspection endpoint (`/rest/v1/` with `Accept: application/openapi+json`), the live deployed schema on the connected Supabase project (`seycwqpozegjwpxuewbf.supabase.co`) was inspected directly and compared against the repository SQL files (`supabase_schema.sql` and `database/schema.sql`).

#### A. Tables Currently Deployed in Live Supabase (`public` schema)

| Table Name | Primary Key | Columns & Data Types (Live PostgREST Introspection) | Purpose |
| :--- | :--- | :--- | :--- |
| `public.vtm_registered_users` | `email` (`TEXT`) | `email` (`TEXT NOT NULL`), `password_hash` (`TEXT NOT NULL DEFAULT ''`), `name` (`TEXT NOT NULL`), `phone_number` (`TEXT`), `country_code` (`TEXT DEFAULT '+1'`), `country_name` (`TEXT DEFAULT 'United States'`), `account_number` (`TEXT`), `role` (`TEXT DEFAULT 'normal'`), `created_at` (`TIMESTAMPTZ DEFAULT now()`), `last_login_at` (`TIMESTAMPTZ DEFAULT now()`), `updated_at` (`TIMESTAMPTZ DEFAULT now()`) | Authoritative user registry, UID mapping (`uid:<uuid>\|...`), and role enforcement (`normal`, `marketer`, `admin`). |
| `public.vtm_user_finances` | `user_key` (`TEXT`) | `user_key` (`TEXT NOT NULL`), `user_email` (`TEXT`), `user_name` (`TEXT`), `wallet_balance` (`NUMERIC DEFAULT 0.00`), `accounts` (`JSONB DEFAULT '[]'::jsonb`), `selected_account_id` (`TEXT`), `transactions` (`JSONB DEFAULT '[]'::jsonb`), `last_updated` (`TIMESTAMPTZ DEFAULT now()`) | Authoritative financial store for user wallet balances, Live & Demo trading accounts (`balance`, `equity`, `margin`, `freeMargin`, `leverage`, `accountNumber`), active selected account (`selected_account_id`), and financial transactions. |
| `public.user_activities` | `id` (`UUID`) | `id` (`UUID DEFAULT gen_random_uuid()`), `user_email` (`TEXT NOT NULL`), `activity_type` (`TEXT NOT NULL`), `description` (`TEXT`), `device_id` (`TEXT`), `metadata` (`JSONB DEFAULT '{}'::jsonb`), `created_at` (`TIMESTAMPTZ DEFAULT now()`) | Stores immutable audit logs (`TRADE_OPENED`, `TRADE_CLOSED`, `LEDGER_ENTRY`, `DEPOSIT`, `WITHDRAWAL`, `TRANSFER`, `SETTINGS_UPDATED`) AND cross-device state snapshots (`STATE_SETTINGS`, `STATE_BOTS`, `STATE_TRADES`, `STATE_EXTRAS`, `STATE_NOTIFICATIONS`). |
| `public.user_devices` | `id` (`UUID`) | `id` (`UUID DEFAULT gen_random_uuid()`), `user_email` (`TEXT NOT NULL`), `device_id` (`TEXT NOT NULL`), `device_type` (`TEXT`), `browser` (`TEXT`), `os` (`TEXT`), `last_active_at` (`TIMESTAMPTZ DEFAULT now()`), `created_at` (`TIMESTAMPTZ DEFAULT now()`) | Tracks active user sessions and connected devices. |

#### B. Additional Normalized Tables in `database/schema.sql` (Ready for SQL Editor Migration)
In addition to the 4 live tables above, `database/schema.sql` defines the complete set of normalized relational tables, triggers, and atomic RPCs:
- `public.closed_trades`: Immutable realized trade history (`id`, `user_email`, `ticket`, `account_number`, `symbol`, `side`, `lots`, `open_price`, `close_price`, `pnl`, `swap`, `commission`, `open_time`, `close_time`, `reason`).
- `public.financial_ledger`: Double-entry immutable ledger (`id`, `user_email`, `account_number`, `entry_type`, `amount`, `previous_balance`, `new_balance`, `reference_id`, `reason`, `metadata`, `created_at`) with unique constraint `UNIQUE (user_email, account_number, entry_type, reference_id)` to guarantee idempotency.
- `public.vtm_trading_accounts`: Normalized mirror of trading accounts.
- `public.vtm_trades`: Normalized active & closed manual/bot orders.
- `public.vtm_deposits`, `public.vtm_withdrawals`, `public.vtm_transfers`, `public.vtm_transactions`: Normalized funding and settlement records.
- `public.vtm_user_settings`: Normalized user platform preferences (`is_dark_mode`, `one_click_trading`, `slippage`, `sound_enabled`, `show_spread_brackets`, `drawdown_protection`, `two_factor_enabled`, `active_account_id`).

---

## 2. Root Causes Identified & Fixed During Audit

### Bug 1: Account Switcher ("Shift Account") Reverting Back After 1–2 Seconds
1. **Unpersisted Selection & Stale Ref**: `<Header />`, `<AccountTab />`, and `<WalletTab />` previously invoked raw `setSelectedAccount(acc)` instead of an authoritative account-selection handler. Raw `setSelectedAccount(acc)` did not update `selectedAccountRef.current`, did not update `lastLocalFinancialUpdateRef.current`, and did not persist `selectedAccountId` to `localStorage` or `vtm_user_finances.selected_account_id` in Supabase.
2. **Early Return in Equity Effect**: In `src/App.tsx`, the equity/margin recalculation effect returned `prev` early when `prev.equity === newEquity` without updating `selectedAccountRef.current`. Consequently, `selectedAccountRef.current` stayed pointed at the previous account (e.g., Demo `#7821884`).
3. **Background Bot / Poll Overwrite**: Within 1–2 seconds, either a background bot trade closing on the previous account (`commitAccountBalanceChange`) or the 2-second Supabase sync poll (`syncUserWithSupabase`) read `selectedAccountRef.current` or the unupdated `selected_account_id` from Supabase and snapped `selectedAccount` back to the old account.
4. **Fix Implemented**: Added an authoritative `handleSelectAccount(acc)` handler in `src/App.tsx` wired to `Header`, `AccountTab`, and `WalletTab` that immediately updates `selectedAccountRef.current`, sets `lastLocalFinancialUpdateRef.current = Date.now()`, stores the selected account per user (`vtm_selected_account_<email>`), and persists `selectedAccountId` to `vtm_user_finances` in Supabase.

### Bug 2: Light / Dark Mode Toggle Reverting Back After 2 Seconds
1. **Bypassed Settings Handler**: `<Header />` and `<AccountTab />` previously called `() => setIsDarkMode(!isDarkMode)` directly instead of `handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })`. Because `lastLocalSettingsUpdateRef.current` remained `0`, the 2-second `syncUserWithSupabase` poll immediately overwrote `isDarkMode` with the stale `STATE_SETTINGS` record from Supabase.
2. **Silent RLS No-Op on `PATCH /rest/v1/user_activities`**: In the live Supabase database, `public.user_activities` had `FOR SELECT` and `FOR INSERT` RLS policies, but no `FOR UPDATE` policy. When `saveCloudStateRecord` sent a `PATCH` request without `Prefer: return=representation`, PostgREST returned `204 No Content` (`patchRes.ok === true`) while updating `0` rows. `saveCloudStateRecord` assumed the `PATCH` succeeded and never `POST`ed the updated `STATE_SETTINGS` (or `STATE_BOTS` / `STATE_TRADES`) record.
3. **Fix Implemented**:
   - Wired all `onToggleTheme` props (`Header`, `AccountTab`, `MoreTab`, `MenuDrawer`) to `handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })`.
   - Persisted user settings locally with an authoritative `updatedAt` timestamp (`vtm_user_settings_<email>`) and compared `remoteSettings.updatedAt > localSettings.updatedAt` before applying remote settings in `syncUserWithSupabase`.
   - Updated `saveCloudStateRecord` in `src/services/supabaseService.ts` to request `Prefer: return=representation` on `PATCH`, verify `updatedRows.length > 0`, and automatically `POST` a fresh state row when `PATCH` affects `0` rows (since `fetchCloudStateRecord` queries `order=created_at.desc&limit=1`).

### Bug 3: Bot Deployment & Per-Account Isolation on Demo and Live Accounts
1. **Cross-Account Duplicate Check**: `handleStartBotRun` previously checked `botRunsRef.current.find((r) => r.botId === bot.id)` globally across all accounts instead of checking `belongsToAccount(r, deployAcc)`. If a bot had previously been deployed on an old or deleted Demo account, deploying it on the active Demo or Live account silently returned early without adding it to the active account's `Active Bots`.
2. **Inbuilt Bot Filtering**: Removed the filter in `src/App.tsx` that hid `vtm-trend-matrix` on Demo accounts so all inbuilt bots are available on both Demo and Live accounts.
3. **Deduplication Key**: Updated `sanitizeAndFilterBotRuns` in `src/services/botTradingService.ts` to deduplicate by `${botId}:${accountId || accountNumber}` rather than global `botId`.

---

## 3. SQL Inspection & Verification Queries

To inspect live tables, columns, triggers, functions, and RLS policies directly inside the Supabase SQL Editor, run:

```sql
-- 1. Inspect all tables and columns in public schema
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Inspect all active RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Inspect all triggers and security-definer functions
SELECT p.proname AS function_name, p.prosecdef AS security_definer, p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```
