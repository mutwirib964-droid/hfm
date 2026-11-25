-- =========================================================================
-- VTM MARKETS STRICT RLS LOCKDOWN SCRIPT (OPTION A)
-- =========================================================================
-- IMPORTANT ROLLOUT ORDER (ZERO DOWNTIME):
--   1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Netlify Environment Variables.
--   2. Deploy this updated codebase to Netlify first and wait for live build success.
--   3. ONLY AFTER Netlify deploy succeeds, paste and run this entire script in
--      Supabase -> SQL Editor -> New Query.
--
-- What this does:
--   - Enables Row Level Security (RLS) on every public VTM table.
--   - Removes all legacy permissive anon/public policies.
--   - Blocks direct browser access using the public anon/publishable key.
--   - Preserves full access for your Netlify Functions / server backend using
--     SUPABASE_SERVICE_ROLE_KEY (service_role bypasses RLS securely).
-- =========================================================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'vtm_registered_users',
    'vtm_user_finances',
    'vtm_trading_accounts',
    'vtm_trades',
    'vtm_deposits',
    'vtm_withdrawals',
    'vtm_transfers',
    'vtm_user_settings',
    'vtm_transactions',
    'user_activities',
    'user_devices',
    'vtm_cloud_states',
    'financial_ledger',
    'closed_trades',
    'vtm_followed_strategies',
    'vtm_referrals',
    'vtm_referral_commissions',
    'vtm_referral_claims',
    'profiles',
    'trading_accounts'
  ];
  pol RECORD;
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table
    ) THEN
      -- 1. Enable and force RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      -- 2. Drop all existing policies on the table
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, v_table);
      END LOOP;

      -- 3. Explicitly deny all direct anon/authenticated PostgREST queries
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        'deny_direct_client_' || v_table,
        v_table
      );

      -- 4. Revoke direct table privileges from anon and authenticated roles
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
    END IF;
  END LOOP;
END $$;

-- Lock down sequences and helper trigger functions from direct anon/authenticated execution
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'enforce_strict_uid_and_single_admin'
  ) THEN
    REVOKE ALL ON FUNCTION public.enforce_strict_uid_and_single_admin() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_sync_vtm'
  ) THEN
    REVOKE ALL ON FUNCTION public.handle_auth_user_sync_vtm() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'protect_vtm_user_finances_accounts'
  ) THEN
    REVOKE ALL ON FUNCTION public.protect_vtm_user_finances_accounts() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_vtm_user'
  ) THEN
    REVOKE ALL ON FUNCTION public.handle_new_vtm_user() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
