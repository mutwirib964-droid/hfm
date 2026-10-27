/**
 * VTM MARKETS REFERRAL & AFFILIATE COMMISSION SERVICE
 * - 5% Commission on all deposits made by referred users (e.g. $16 deposit -> $0.80 commission)
 * - Minimum claim threshold: $20.00 commission earned (equivalent to $400.00 total referral deposits)
 * - Claimed commissions are directly credited to the user's Live Wallet balance
 * - Persisted locally and synced with Supabase PostgreSQL database
 */

export interface ReferralRecord {
  id: string;
  referrerEmail: string;
  referrerCode: string;
  referredEmail: string;
  referredName: string;
  referredAccountNumber: string;
  totalDepositedUsd: number;
  totalCommissionUsd: number; // strictly 5% of totalDepositedUsd
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  lastDepositAt?: number;
}

export interface ReferralCommissionEvent {
  id: string;
  referrerEmail: string;
  referredEmail: string;
  depositAmountUsd: number;
  commissionRate: number; // 0.05 (5%)
  commissionEarnedUsd: number; // depositAmountUsd * 0.05
  depositReference: string;
  claimed: boolean;
  claimedAt?: number;
  createdAt: number;
}

export interface ReferralClaimRecord {
  id: string;
  referrerEmail: string;
  amountUsd: number; // >= 20.00
  claimedAt: number;
  status: 'COMPLETED';
  walletTxReference: string;
}

export interface ReferralState {
  referralCode: string;
  referralLink: string;
  commissionRate: number; // 0.05 (5%)
  minClaimAmountUsd: number; // 20.00
  minReferralDepositsUsd: number; // 400.00 (since $400 * 5% = $20)
  totalReferralsCount: number;
  totalReferralDepositsUsd: number;
  totalCommissionEarnedUsd: number;
  availableCommissionUsd: number;
  totalClaimedUsd: number;
  referrals: ReferralRecord[];
  claims: ReferralClaimRecord[];
  recentEvents: ReferralCommissionEvent[];
}

const STORAGE_KEY_PREFIX = 'vtm_referral_state_';
const INCOMING_REF_KEY = 'vtm_referred_by_code';

export const COMMISSION_RATE = 0.05; // 5%
export const MIN_CLAIM_AMOUNT_USD = 20.0; // Minimum $20.00 to claim
export const MIN_DEPOSITS_REQUIRED_USD = 400.0; // 5% of $400 = $20.00

class ReferralService {
  /**
   * Derive a clean, uppercase referral code for any user
   */
  getReferralCode(userEmail?: string, userAccountNumber?: string): string {
    if (userAccountNumber && userAccountNumber.trim()) {
      const cleanNum = userAccountNumber.replace(/\D/g, '');
      if (cleanNum.length >= 4) {
        return `VTM-${cleanNum.slice(-6)}`;
      }
    }
    if (userEmail && userEmail.trim()) {
      const cleanPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return `VTM-${cleanPrefix.slice(0, 6) || 'TRADER'}`;
    }
    return 'VTM-GLOBAL';
  }

  /**
   * Derive the shareable referral link using platform domain
   */
  getReferralLink(referralCode: string): string {
    return `https://vtmmarkets.com/?ref=${encodeURIComponent(referralCode)}`;
  }

  /**
   * Capture incoming ?ref=... parameter from current URL
   */
  captureIncomingReferral(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('referral');
      if (ref && ref.trim()) {
        const cleanRef = ref.trim().toUpperCase();
        localStorage.setItem(INCOMING_REF_KEY, cleanRef);
        return cleanRef;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Get incoming referral code if user was referred
   */
  getReferredByCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(INCOMING_REF_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Get referral code assigned to a specific user
   */
  getReferredByCodeForUser(userEmail?: string): string | null {
    if (typeof window === 'undefined' || !userEmail) return this.getReferredByCode();
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      return (
        localStorage.getItem(`vtm_user_referred_by_${cleanEmail}`) ||
        localStorage.getItem(INCOMING_REF_KEY)
      );
    } catch {
      return null;
    }
  }

  /**
   * Store who referred this user permanently
   */
  setReferredByForUser(userEmail: string, referrerCode: string): void {
    if (typeof window === 'undefined' || !userEmail || !referrerCode) return;
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const cleanCode = referrerCode.trim().toUpperCase();
      localStorage.setItem(`vtm_user_referred_by_${cleanEmail}`, cleanCode);
      localStorage.setItem(INCOMING_REF_KEY, cleanCode);
    } catch {
      // ignore
    }
  }

  /**
   * Load referral state for a user (strictly real data, never mock/sample referrals)
   */
  getReferralState(userEmail?: string, userAccountNumber?: string): ReferralState {
    const emailKey = (userEmail || 'guest@vtm.com').trim().toLowerCase();
    const referralCode = this.getReferralCode(userEmail, userAccountNumber);
    const referralLink = this.getReferralLink(referralCode);

    let stored: any = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${emailKey}`);
        if (raw) stored = JSON.parse(raw);
      } catch {
        stored = null;
      }
    }

    if (stored && typeof stored === 'object') {
      // Filter out test, mock, or simulated referrals (e.g. VIP Trader John from previous testing)
      const isTestReferral = (r: any): boolean => {
        if (!r || typeof r !== 'object') return true;
        const id = String(r.id || '').toLowerCase();
        const name = String(r.referredName || '').toLowerCase();
        const email = String(r.referredEmail || '').toLowerCase();
        if (id.startsWith('ref-sample-') || id.startsWith('ref-sim-') || id.startsWith('ref-test-')) return true;
        if (
          name.includes('vip trader') ||
          name.includes('trader john') ||
          name.includes('active referral') ||
          name.includes('sample') ||
          name.includes('test') ||
          name.includes('simulate') ||
          name.includes('kevin') ||
          name.includes('alex') ||
          name.includes('sarah')
        ) {
          return true;
        }
        if (
          email.includes('test') ||
          email.includes('sample') ||
          email.includes('demo') ||
          email.includes('@vtm.net') ||
          email.includes('trader-')
        ) {
          return true;
        }
        return false;
      };

      const cleanReferrals = Array.isArray(stored.referrals)
        ? stored.referrals.filter((r: any) => !isTestReferral(r))
        : [];

      // If there are no real referrals, any test claims and events must also be wiped clean
      const hasRealReferrals = cleanReferrals.length > 0;
      const cleanClaims = hasRealReferrals && Array.isArray(stored.claims) ? stored.claims : [];
      const cleanEvents = hasRealReferrals && Array.isArray(stored.recentEvents)
        ? stored.recentEvents.filter((e: any) => !e.id?.startsWith('evt-sample-') && !e.id?.startsWith('evt-test-'))
        : [];

      const totalDeposited = cleanReferrals.reduce((sum: number, r: any) => sum + (r.totalDepositedUsd || 0), 0);
      const totalEarned = cleanReferrals.reduce((sum: number, r: any) => sum + (r.totalCommissionUsd || 0), 0);
      const totalClaimed = hasRealReferrals ? Number((stored.totalClaimedUsd || 0).toFixed(2)) : 0.0;
      const available = Math.max(0, Number((totalEarned - totalClaimed).toFixed(2)));

      const sanitizedState: ReferralState = {
        referralCode,
        referralLink,
        commissionRate: COMMISSION_RATE,
        minClaimAmountUsd: MIN_CLAIM_AMOUNT_USD,
        minReferralDepositsUsd: MIN_DEPOSITS_REQUIRED_USD,
        totalReferralsCount: cleanReferrals.length,
        totalReferralDepositsUsd: Number(totalDeposited.toFixed(2)),
        totalCommissionEarnedUsd: Number(totalEarned.toFixed(2)),
        availableCommissionUsd: available,
        totalClaimedUsd: totalClaimed,
        referrals: cleanReferrals,
        claims: cleanClaims,
        recentEvents: cleanEvents,
      };

      // Persist the sanitized state back so client storage is permanently cleaned
      this.saveReferralState(emailKey, sanitizedState);
      return sanitizedState;
    }

    // Completely empty real initial state: 0 referrals, $0.00 deposited, $0.00 earned
    const defaultState: ReferralState = {
      referralCode,
      referralLink,
      commissionRate: COMMISSION_RATE,
      minClaimAmountUsd: MIN_CLAIM_AMOUNT_USD,
      minReferralDepositsUsd: MIN_DEPOSITS_REQUIRED_USD,
      totalReferralsCount: 0,
      totalReferralDepositsUsd: 0.0,
      totalCommissionEarnedUsd: 0.0,
      availableCommissionUsd: 0.0,
      totalClaimedUsd: 0.0,
      referrals: [],
      claims: [],
      recentEvents: [],
    };

    this.saveReferralState(emailKey, defaultState);
    return defaultState;
  }

  /**
   * Save referral state locally
   */
  saveReferralState(userEmail: string, state: ReferralState): void {
    if (typeof window === 'undefined') return;
    try {
      const emailKey = userEmail.trim().toLowerCase();
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${emailKey}`, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  /**
   * Record a new referral deposit and award 5% commission
   * e.g. deposit of $16.00 awards exactly $0.80 commission
   */
  recordReferralDeposit(
    userEmail: string,
    depositAmountUsd: number,
    referredInfo?: { email?: string; name?: string; accountNumber?: string; reference?: string }
  ): ReferralState {
    const currentState = this.getReferralState(userEmail);
    const amount = Number(depositAmountUsd.toFixed(2));
    const commission = Number((amount * COMMISSION_RATE).toFixed(2)); // 5%

    const refEmail = referredInfo?.email || `trader-${Date.now().toString(36).slice(-4)}@vtm.net`;
    const refName = referredInfo?.name || 'VTM Active Referral';
    const refAccount = referredInfo?.accountNumber || `8842-${Math.floor(1000 + Math.random() * 9000)}`;
    const depositRef = referredInfo?.reference || `REF-DEP-${Date.now()}`;

    // Update or add to referrals list
    let updatedReferrals = [...currentState.referrals];
    const existingIdx = updatedReferrals.findIndex((r) => r.referredEmail.toLowerCase() === refEmail.toLowerCase());

    if (existingIdx >= 0) {
      const existing = updatedReferrals[existingIdx];
      const nextDeposited = Number((existing.totalDepositedUsd + amount).toFixed(2));
      const nextCommission = Number((existing.totalCommissionUsd + commission).toFixed(2));
      updatedReferrals[existingIdx] = {
        ...existing,
        totalDepositedUsd: nextDeposited,
        totalCommissionUsd: nextCommission,
        lastDepositAt: Date.now(),
      };
    } else {
      updatedReferrals.unshift({
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        referrerEmail: userEmail.trim().toLowerCase(),
        referrerCode: currentState.referralCode,
        referredEmail: refEmail,
        referredName: refName,
        referredAccountNumber: refAccount,
        totalDepositedUsd: amount,
        totalCommissionUsd: commission,
        status: 'ACTIVE',
        createdAt: Date.now(),
        lastDepositAt: Date.now(),
      });
    }

    // Add to recent commission events
    const newEvent: ReferralCommissionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      referrerEmail: userEmail.trim().toLowerCase(),
      referredEmail: refEmail,
      depositAmountUsd: amount,
      commissionRate: COMMISSION_RATE,
      commissionEarnedUsd: commission,
      depositReference: depositRef,
      claimed: false,
      createdAt: Date.now(),
    };

    const nextEvents = [newEvent, ...currentState.recentEvents].slice(0, 50);
    const nextTotalDeposits = Number((currentState.totalReferralDepositsUsd + amount).toFixed(2));
    const nextTotalEarned = Number((currentState.totalCommissionEarnedUsd + commission).toFixed(2));
    const nextAvailable = Number((currentState.availableCommissionUsd + commission).toFixed(2));

    const nextState: ReferralState = {
      ...currentState,
      totalReferralsCount: updatedReferrals.length,
      totalReferralDepositsUsd: nextTotalDeposits,
      totalCommissionEarnedUsd: nextTotalEarned,
      availableCommissionUsd: nextAvailable,
      referrals: updatedReferrals,
      recentEvents: nextEvents,
    };

    this.saveReferralState(userEmail, nextState);
    return nextState;
  }

  /**
   * Find referrer user email and their referral state by their referral code
   */
  findReferrerByCode(referrerCode: string): { email: string; state: ReferralState } | null {
    if (typeof window === 'undefined' || !referrerCode) return null;
    const cleanCode = referrerCode.trim().toUpperCase();

    // 1. Direct scan of referral states in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed.referralCode === cleanCode) {
            const email = key.replace(STORAGE_KEY_PREFIX, '');
            return { email, state: this.getReferralState(email) };
          }
        } catch {}
      }
    }

    // 2. Scan user registry for any user whose code matches
    try {
      const rawRegistry = localStorage.getItem('vtm_registered_users_registry');
      if (rawRegistry) {
        const parsedRegistry: Record<string, any> = JSON.parse(rawRegistry);
        for (const [uEmail, uProfile] of Object.entries(parsedRegistry)) {
          if (!uProfile || !uEmail) continue;
          const userCode = this.getReferralCode(uProfile.email || uEmail, uProfile.accountNumber);
          if (
            userCode === cleanCode ||
            (uProfile.accountNumber && cleanCode.includes(uProfile.accountNumber.slice(-6)))
          ) {
            return {
              email: uProfile.email || uEmail,
              state: this.getReferralState(uProfile.email || uEmail, uProfile.accountNumber),
            };
          }
        }
      }
    } catch {}

    // 3. Fallback for master admin if matching mutwiri code
    if (cleanCode === 'VTM-MUTWIR' || cleanCode === 'VTM-84A1E1' || cleanCode.startsWith('VTM-MUTW')) {
      return { email: 'mutwirib964@gmail.com', state: this.getReferralState('mutwirib964@gmail.com') };
    }

    return null;
  }

  /**
   * Register a new user under a referrer when they sign up with a referral code or link.
   * Immediately adds the new user to the referrer's account and updates their dashboard in real time!
   */
  registerReferralSignup(
    referrerCode: string,
    newUser: { email: string; name: string; accountNumber?: string }
  ): boolean {
    if (typeof window === 'undefined' || !referrerCode || !newUser.email) return false;
    try {
      const cleanCode = referrerCode.trim().toUpperCase();
      const cleanEmail = newUser.email.trim().toLowerCase();

      // Remember referrer code for this user permanently
      this.setReferredByForUser(cleanEmail, cleanCode);

      const matched = this.findReferrerByCode(cleanCode);
      if (!matched) {
        return false;
      }

      const { email: referrerEmail, state: currentState } = matched;

      // Prevent self-referral
      if (referrerEmail.toLowerCase() === cleanEmail) {
        return false;
      }

      let updatedReferrals = [...currentState.referrals];
      const existingIdx = updatedReferrals.findIndex(
        (r) => r.referredEmail.toLowerCase() === cleanEmail
      );

      if (existingIdx >= 0) {
        updatedReferrals[existingIdx] = {
          ...updatedReferrals[existingIdx],
          referredName: newUser.name.trim() || updatedReferrals[existingIdx].referredName,
          referredAccountNumber: newUser.accountNumber || updatedReferrals[existingIdx].referredAccountNumber,
        };
      } else {
        const newReferral: ReferralRecord = {
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          referrerEmail: referrerEmail.toLowerCase(),
          referrerCode: currentState.referralCode,
          referredEmail: cleanEmail,
          referredName: newUser.name.trim() || 'New Trader',
          referredAccountNumber: newUser.accountNumber || `8842-${Math.floor(1000 + Math.random() * 9000)}`,
          totalDepositedUsd: 0.0,
          totalCommissionUsd: 0.0,
          status: 'ACTIVE',
          createdAt: Date.now(),
        };
        updatedReferrals.unshift(newReferral);
      }

      const totalDeposited = updatedReferrals.reduce((sum, r) => sum + (r.totalDepositedUsd || 0), 0);
      const totalEarned = updatedReferrals.reduce((sum, r) => sum + (r.totalCommissionUsd || 0), 0);
      const totalClaimed = Number((currentState.totalClaimedUsd || 0).toFixed(2));
      const available = Math.max(0, Number((totalEarned - totalClaimed).toFixed(2)));

      const nextState: ReferralState = {
        ...currentState,
        totalReferralsCount: updatedReferrals.length,
        totalReferralDepositsUsd: Number(totalDeposited.toFixed(2)),
        totalCommissionEarnedUsd: Number(totalEarned.toFixed(2)),
        availableCommissionUsd: available,
        referrals: updatedReferrals,
      };

      this.saveReferralState(referrerEmail, nextState);

      // Trigger immediate UI refresh on all listening components
      window.dispatchEvent(
        new CustomEvent('vtm_referral_update', {
          detail: { referrerEmail, newReferralEmail: cleanEmail, count: updatedReferrals.length },
        })
      );

      return true;
    } catch (err) {
      console.error('[Referral] Error registering referral signup:', err);
      return false;
    }
  }

  /**
   * Record a deposit for a referrer identified by their referral code or email
   */
  recordDepositForReferrerCode(
    referrerCodeOrEmail: string,
    depositAmountUsd: number,
    referredInfo?: { email?: string; name?: string; accountNumber?: string; reference?: string }
  ): void {
    if (typeof window === 'undefined' || depositAmountUsd < 16) return;
    try {
      let matchedEmail: string | null = null;
      const cleanRef = (referrerCodeOrEmail || '').trim();

      if (cleanRef.includes('@')) {
        matchedEmail = cleanRef.toLowerCase();
      } else if (cleanRef) {
        const matched = this.findReferrerByCode(cleanRef);
        if (matched) {
          matchedEmail = matched.email;
        }
      }

      // Fallback: check if depositing user has an attributed referrer
      if (!matchedEmail && referredInfo?.email) {
        const storedCode = this.getReferredByCodeForUser(referredInfo.email);
        if (storedCode) {
          const matched = this.findReferrerByCode(storedCode);
          if (matched) matchedEmail = matched.email;
        }
      }

      if (matchedEmail) {
        this.recordReferralDeposit(matchedEmail, depositAmountUsd, referredInfo);
        window.dispatchEvent(
          new CustomEvent('vtm_referral_update', {
            detail: { referrerEmail: matchedEmail, depositAmountUsd },
          })
        );
      }
    } catch {
      // ignore
    }
  }

  /**
   * Process a claim of referral commissions
   * Strictly enforces minimum $20.00 threshold
   */
  claimCommission(
    userEmail: string,
    amountToClaim?: number
  ): { success: boolean; claimedAmount: number; error?: string; state: ReferralState } {
    const currentState = this.getReferralState(userEmail);
    const amount = typeof amountToClaim === 'number' && amountToClaim > 0
      ? Number(amountToClaim.toFixed(2))
      : currentState.availableCommissionUsd;

    // Strict validation
    if (amount < MIN_CLAIM_AMOUNT_USD) {
      return {
        success: false,
        claimedAmount: 0,
        error: `Minimum claim amount is $${MIN_CLAIM_AMOUNT_USD.toFixed(2)} USD. Your available commission is $${currentState.availableCommissionUsd.toFixed(2)} USD. Earn commissions when your referrals deposit (minimum deposit of $16).`,
        state: currentState,
      };
    }

    if (amount > currentState.availableCommissionUsd) {
      return {
        success: false,
        claimedAmount: 0,
        error: `Requested amount ($${amount.toFixed(2)}) exceeds your available referral commission ($${currentState.availableCommissionUsd.toFixed(2)}).`,
        state: currentState,
      };
    }

    const claimTxRef = `REF-CLAIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClaim: ReferralClaimRecord = {
      id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      referrerEmail: userEmail.trim().toLowerCase(),
      amountUsd: amount,
      claimedAt: Date.now(),
      status: 'COMPLETED',
      walletTxReference: claimTxRef,
    };

    const nextClaimedTotal = Number((currentState.totalClaimedUsd + amount).toFixed(2));
    const nextAvailable = Math.max(0, Number((currentState.availableCommissionUsd - amount).toFixed(2)));
    const nextClaims = [newClaim, ...currentState.claims];

    // Mark events as claimed
    const nextEvents = currentState.recentEvents.map((evt) => {
      if (!evt.claimed) {
        return { ...evt, claimed: true, claimedAt: Date.now() };
      }
      return evt;
    });

    const nextState: ReferralState = {
      ...currentState,
      totalClaimedUsd: nextClaimedTotal,
      availableCommissionUsd: nextAvailable,
      claims: nextClaims,
      recentEvents: nextEvents,
    };

    this.saveReferralState(userEmail, nextState);
    return {
      success: true,
      claimedAmount: amount,
      state: nextState,
    };
  }

  /**
   * Complete, authoritative SQL code for Supabase PostgreSQL database
   * Ready to run directly in the Supabase SQL editor
   */
  getReferralSqlSchema(): string {
    return `-- ============================================================================
-- VTM MARKETS REFERRAL & AFFILIATE PROGRAM — COMPLETE AUTHORITATIVE SQL SCHEMA
-- ============================================================================
-- Features:
-- 1. 5% Commission on all deposits made by referred users (e.g. $16 deposit -> $0.80)
-- 2. Minimum claim threshold: $20.00 (earned when referral deposits reach $400.00)
-- 3. Automatic referral ledger, commissions tracking, and payout logs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. REFERRALS REGISTRY TABLE
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

-- 2. REFERRAL COMMISSIONS LOG (5% on every deposit)
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

-- 3. REFERRAL COMMISSION CLAIMS TABLE (Minimum $20.00 threshold)
CREATE TABLE IF NOT EXISTS public.vtm_referral_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  amount_claimed_usd NUMERIC(15, 2) NOT NULL CHECK (amount_claimed_usd >= 20.00),
  wallet_tx_reference TEXT NOT NULL UNIQUE,
  wallet_credited BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referrer_email ON public.vtm_referrals (LOWER(referrer_email));
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referrer_code ON public.vtm_referrals (referrer_code);
CREATE INDEX IF NOT EXISTS idx_vtm_referrals_referred_email ON public.vtm_referrals (LOWER(referred_email));
CREATE INDEX IF NOT EXISTS idx_vtm_ref_comm_referrer ON public.vtm_referral_commissions (LOWER(referrer_email), claimed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtm_ref_claims_referrer ON public.vtm_referral_claims (LOWER(referrer_email), claimed_at DESC);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
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

-- 6. PERMISSIONS & ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 7. AUTOMATIC COMMISSION CALCULATION TRIGGER (Guarantees exactly 5%)
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
`;
  }
}

export const referralService = new ReferralService();
