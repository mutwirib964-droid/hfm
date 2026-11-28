import { supabaseService } from './supabaseService';

/**
 * VTM MARKETS REFERRAL & AFFILIATE COMMISSION SERVICE
 * - 5% Commission on first deposits made by referred users (e.g. $16 deposit -> $0.80 commission)
 * - Minimum claim threshold: $20.00 commission earned (equivalent to $400.00 total referral deposits)
 * - Claimed commissions are directly credited to the user's Live Wallet balance
 * - Persisted locally and synced with Supabase PostgreSQL database across all devices
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

const claimingEmailsLock = new Set<string>();
const inflightCloudRefresh = new Map<string, Promise<ReferralState>>();

class ReferralService {
  /**
   * Derive a clean, uppercase referral code for any user
   */
  getReferralCode(userEmail?: string, userAccountNumber?: string): string {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (userAccountNumber && userAccountNumber.trim()) {
      const cleanNum = userAccountNumber.replace(/\D/g, '');
      if (cleanNum.length >= 4) {
        return `VTM-${cleanNum.slice(-6)}`;
      }
    }
    if (cleanEmail) {
      const cleanPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return `VTM-${cleanPrefix.slice(0, 6) || 'TRADER'}`;
    }
    return 'VTM-GLOBAL';
  }

  /**
   * Collect all valid referral code aliases belonging strictly to this user
   * (e.g. original registration account code + current trading/profile account code)
   */
  getAcceptedReferralCodes(
    userEmail?: string,
    userAccountNumber?: string,
    extraCodesOrAccountNumbers?: string[]
  ): string[] {
    const codes = new Set<string>();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    const addFromAccountOrCode = (val?: string | null) => {
      if (!val || !String(val).trim()) return;
      const upper = String(val).trim().toUpperCase();
      if (upper.startsWith('VTM-') && upper.length >= 7) {
        codes.add(upper);
        return;
      }
      const digits = upper.replace(/\D/g, '');
      if (digits.length >= 4) {
        codes.add(`VTM-${digits.slice(-6)}`);
      }
    };

    addFromAccountOrCode(this.getReferralCode(userEmail, userAccountNumber));
    addFromAccountOrCode(userAccountNumber);

    if (Array.isArray(extraCodesOrAccountNumbers)) {
      extraCodesOrAccountNumbers.forEach((v) => addFromAccountOrCode(v));
    }

    if (typeof window !== 'undefined' && cleanEmail) {
      try {
        const rawAuth = localStorage.getItem('vtm_auth_user');
        if (rawAuth) {
          const parsedAuth = JSON.parse(rawAuth);
          if (String(parsedAuth?.email || '').trim().toLowerCase() === cleanEmail) {
            addFromAccountOrCode(parsedAuth.accountNumber);
          }
        }
        const rawMainReg = localStorage.getItem('vtm_user_registry');
        if (rawMainReg) {
          const parsedReg = JSON.parse(rawMainReg);
          if (parsedReg?.[cleanEmail]?.accountNumber) {
            addFromAccountOrCode(parsedReg[cleanEmail].accountNumber);
          }
        }
        const rawState = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanEmail}`);
        if (rawState) {
          const parsedState = JSON.parse(rawState);
          if (parsedState?.referralCode && parsedState.referralCode !== 'VTM-GLOBAL') {
            addFromAccountOrCode(parsedState.referralCode);
          }
        }
      } catch {
        // ignore
      }
    }

    return Array.from(codes);
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
   * Get referral code assigned to a specific user (never falls back to global incoming link code)
   */
  getReferredByCodeForUser(userEmail?: string): string | null {
    if (typeof window === 'undefined' || !userEmail) return null;
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      return localStorage.getItem(`vtm_user_referred_by_${cleanEmail}`) || null;
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
      localStorage.removeItem(INCOMING_REF_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Compute currently available commission using chronological ledger replay:
   * A claim at time T only consumes commissions earned at or before time T,
   * so historical claims can never reduce commissions earned from later referral deposits.
   */
  private computeAvailableCommissionChronological(
    referrals: ReferralRecord[],
    claims: ReferralClaimRecord[]
  ): number {
    if (!Array.isArray(referrals) || referrals.length === 0) return 0;

    type LedgerEvt = { ts: number; kind: 'EARN' | 'CLAIM'; amount: number };
    const events: LedgerEvt[] = [];

    for (const r of referrals) {
      const comm = Number(Number(r?.totalCommissionUsd || 0).toFixed(2));
      if (comm <= 0) continue;
      const ts = Number(r?.lastDepositAt || r?.createdAt || 0);
      events.push({ ts, kind: 'EARN', amount: comm });
    }

    for (const c of claims || []) {
      const amt = Number(Number(c?.amountUsd || 0).toFixed(2));
      if (amt <= 0) continue;
      const ts = Number(c?.claimedAt || 0);
      events.push({ ts, kind: 'CLAIM', amount: amt });
    }

    events.sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts;
      // Credits settle before debits on identical millisecond
      return a.kind === b.kind ? 0 : a.kind === 'EARN' ? -1 : 1;
    });

    let running = 0;
    for (const evt of events) {
      if (evt.kind === 'EARN') {
        running = Number((running + evt.amount).toFixed(2));
      } else {
        running = Math.max(0, Number((running - evt.amount).toFixed(2)));
      }
    }
    return Math.max(0, Number(running.toFixed(2)));
  }

  /**
   * Helper: inspect local financial storage for a referred user and return ONLY their first completed deposit amount in USD.
   */
  getFirstDepositForUser(referredEmail?: string): number {
    if (typeof window === 'undefined' || !referredEmail) return 0;
    try {
      const cleanEmail = referredEmail.trim().toLowerCase();
      const rawFin = localStorage.getItem(`vtm_finances_${cleanEmail}`);
      if (!rawFin) return 0;
      const parsed = JSON.parse(rawFin);
      if (!parsed || !Array.isArray(parsed.transactions)) return 0;

      const completedDeposits = parsed.transactions
        .filter(
          (tx: any) =>
            tx &&
            tx.type === 'DEPOSIT' &&
            String(tx.status || 'COMPLETED').toUpperCase() === 'COMPLETED' &&
            Number(tx.amount) > 0 &&
            !/referral/i.test(String(tx.method || ''))
        )
        .sort((a: any, b: any) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));

      if (completedDeposits.length > 0) {
        return Number(Number(completedDeposits[0].amount).toFixed(2));
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Load referral state for a user from local cache + local registry
   * (call refreshReferralStateFromCloud to hydrate live cross-device Supabase data)
   */
  getReferralState(
    userEmail?: string,
    userAccountNumber?: string,
    extraCodesOrAccountNumbers?: string[]
  ): ReferralState {
    const emailKey = (userEmail || 'guest@vtm.com').trim().toLowerCase();
    const acceptedCodes = this.getAcceptedReferralCodes(
      userEmail,
      userAccountNumber,
      extraCodesOrAccountNumbers
    );
    const acceptedCodesSet = new Set(acceptedCodes.map((c) => c.trim().toUpperCase()));
    const referralCode = acceptedCodes[0] || this.getReferralCode(userEmail, userAccountNumber);
    const referralLink = this.getReferralLink(referralCode);

    let stored: any = null;
    let registryMap: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${emailKey}`);
        if (raw) stored = JSON.parse(raw);
      } catch {
        stored = null;
      }
      try {
        const rawMainReg = localStorage.getItem('vtm_user_registry');
        const rawLegacyReg = localStorage.getItem('vtm_registered_users_registry');
        const mainReg = rawMainReg ? JSON.parse(rawMainReg) : {};
        const legacyReg = rawLegacyReg ? JSON.parse(rawLegacyReg) : {};
        registryMap = { ...legacyReg, ...mainReg };
      } catch {
        registryMap = {};
      }
    }

    // Filter out synthetic/mock entries, while honoring all valid aliases for this referrer
    const isTestOrInvalidReferral = (r: any): boolean => {
      if (!r || typeof r !== 'object') return true;
      const id = String(r.id || '').toLowerCase();
      const name = String(r.referredName || '').toLowerCase();
      const email = String(r.referredEmail || '').trim().toLowerCase();
      if (id.startsWith('ref-sample-') || id.startsWith('ref-sim-') || id.startsWith('ref-test-')) return true;
      if (
        name.includes('vip trader') ||
        name.includes('trader john') ||
        name.includes('active referral') ||
        name.includes('sample') ||
        name.includes('simulate')
      ) {
        return true;
      }
      if (
        email.includes('sample') ||
        email.includes('demo') ||
        email.includes('@vtm.net') ||
        email.includes('trader-')
      ) {
        return true;
      }

      // Only reject if local registry explicitly points to a DIFFERENT referrer code
      const regUser = email ? registryMap[email] : null;
      if (regUser) {
        const verifiedCode = (
          regUser.referredByCode ||
          this.getReferredByCodeForUser(email) ||
          ''
        )
          .trim()
          .toUpperCase();
        if (verifiedCode && !acceptedCodesSet.has(verifiedCode)) {
          return true;
        }
      }
      return false;
    };

    const rawReferralsMap = new Map<string, ReferralRecord>();
    if (stored && Array.isArray(stored.referrals)) {
      for (const r of stored.referrals) {
        if (isTestOrInvalidReferral(r)) continue;
        const refEmail = String(r.referredEmail || '').trim().toLowerCase();
        if (!refEmail || refEmail === emailKey) continue;
        rawReferralsMap.set(refEmail, r);
      }
    }

    // Reconcile any registered users in local registry who signed up with any accepted code
    if (typeof window !== 'undefined' && acceptedCodesSet.size > 0) {
      try {
        for (const [uEmail, uProfile] of Object.entries(registryMap)) {
          if (!uProfile || !uEmail) continue;
          const cleanUEmail = (uProfile.email || uEmail).trim().toLowerCase();
          if (cleanUEmail === emailKey) continue;
          const userRefCode = (
            uProfile.referredByCode ||
            this.getReferredByCodeForUser(cleanUEmail) ||
            ''
          )
            .trim()
            .toUpperCase();
          if (userRefCode && acceptedCodesSet.has(userRefCode)) {
            if (!rawReferralsMap.has(cleanUEmail)) {
              rawReferralsMap.set(cleanUEmail, {
                id: `ref-${uProfile.id || Date.now()}`,
                referrerEmail: emailKey,
                referrerCode: userRefCode,
                referredEmail: cleanUEmail,
                referredName: uProfile.name || cleanUEmail.split('@')[0],
                referredAccountNumber: uProfile.accountNumber || '8842-1001',
                totalDepositedUsd: 0,
                totalCommissionUsd: 0,
                status: 'ACTIVE',
                createdAt: uProfile.createdAt ? new Date(uProfile.createdAt).getTime() : Date.now(),
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const rawReferrals = Array.from(rawReferralsMap.values());

    // Deduplicate Events so at most ONE (the earliest/first) deposit commission event exists per referredEmail
    const validRefEmailSet = new Set(
      rawReferrals.map((r) => (r.referredEmail || '').trim().toLowerCase()).filter(Boolean)
    );
    const rawEvents: ReferralCommissionEvent[] =
      stored && Array.isArray(stored.recentEvents)
        ? stored.recentEvents.filter(
            (e: any) =>
              !e.id?.startsWith('evt-sample-') &&
              !e.id?.startsWith('evt-test-') &&
              validRefEmailSet.has(String(e.referredEmail || '').trim().toLowerCase())
          )
        : [];

    const firstEventByEmail = new Map<string, ReferralCommissionEvent>();
    const sortedAscEvents = [...rawEvents].sort(
      (a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)
    );
    for (const evt of sortedAscEvents) {
      const eKey = (evt.referredEmail || '').trim().toLowerCase();
      if (eKey && !firstEventByEmail.has(eKey)) {
        firstEventByEmail.set(eKey, evt);
      }
    }

    // Enforce FIRST DEPOSIT ONLY for every referred user
    const cleanReferrals: ReferralRecord[] = rawReferrals
      .map((r) => {
        const refEmailKey = (r.referredEmail || '').trim().toLowerCase();
        const firstDepositFromFinances = this.getFirstDepositForUser(refEmailKey);
        const firstEvent = firstEventByEmail.get(refEmailKey);

        let firstDepositUsd = Number(r.totalDepositedUsd || 0);
        if (firstDepositFromFinances > 0) {
          firstDepositUsd = firstDepositFromFinances;
        } else if (firstEvent && Number(firstEvent.depositAmountUsd) > 0 && firstDepositUsd <= 0) {
          firstDepositUsd = Number(Number(firstEvent.depositAmountUsd).toFixed(2));
        }

        const firstCommissionUsd = Number((firstDepositUsd * COMMISSION_RATE).toFixed(2));

        return {
          ...r,
          totalDepositedUsd: Number(firstDepositUsd.toFixed(2)),
          totalCommissionUsd: firstCommissionUsd,
        };
      })
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    // Preserve & deduplicate claims reliably across refreshes
    const claimsMap = new Map<string, ReferralClaimRecord>();
    if (stored && Array.isArray(stored.claims)) {
      for (const c of stored.claims) {
        const refKey = String(c?.walletTxReference || c?.id || '').trim();
        const amt = Number(Number(c?.amountUsd || 0).toFixed(2));
        if (!refKey || amt <= 0) continue;
        claimsMap.set(refKey, {
          id: String(c?.id || `claim-${refKey}`),
          referrerEmail: emailKey,
          amountUsd: amt,
          claimedAt: Number(c?.claimedAt) || Date.now(),
          status: 'COMPLETED',
          walletTxReference: refKey,
        });
      }
    }
    const cleanClaims = Array.from(claimsMap.values()).sort((a, b) => b.claimedAt - a.claimedAt);
    const cleanEvents =
      cleanReferrals.length > 0
        ? Array.from(firstEventByEmail.values()).sort(
            (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
          )
        : [];

    const totalDeposited = cleanReferrals.reduce((sum: number, r: any) => sum + (r.totalDepositedUsd || 0), 0);
    const totalEarned = cleanReferrals.reduce((sum: number, r: any) => sum + (r.totalCommissionUsd || 0), 0);
    const claimsSum = cleanClaims.reduce((sum, c) => sum + (Number(c.amountUsd) || 0), 0);
    const totalClaimed = Number(
      (cleanClaims.length > 0 ? claimsSum : stored ? Number(stored.totalClaimedUsd || 0) : 0).toFixed(2)
    );
    const available =
      cleanClaims.length > 0
        ? this.computeAvailableCommissionChronological(cleanReferrals, cleanClaims)
        : Math.max(0, Number((totalEarned - totalClaimed).toFixed(2)));

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

    this.saveReferralState(emailKey, sanitizedState);
    return sanitizedState;
  }

  /**
   * Hydrate referral count, referred users, first deposits, and claims from live Supabase cloud tables.
   * Deduplicates concurrent refreshes per user and writes normalized state to localStorage + vtm_referrals.
   */
  async refreshReferralStateFromCloud(
    userEmail?: string,
    userAccountNumber?: string,
    extraCodesOrAccountNumbers?: string[]
  ): Promise<ReferralState> {
    const cleanEmail = (userEmail || 'guest@vtm.com').trim().toLowerCase();
    const localState = this.getReferralState(cleanEmail, userAccountNumber, extraCodesOrAccountNumbers);

    if (!cleanEmail || cleanEmail === 'guest@vtm.com' || !supabaseService.isConfigured()) {
      return localState;
    }

    const existingPromise = inflightCloudRefresh.get(cleanEmail);
    if (existingPromise) {
      return await existingPromise;
    }

    const runPromise = (async (): Promise<ReferralState> => {
      try {
        const acceptedCodes = this.getAcceptedReferralCodes(
          cleanEmail,
          userAccountNumber,
          extraCodesOrAccountNumbers
        );
        const cloud = await supabaseService.fetchCloudReferralsForUser(cleanEmail, acceptedCodes);
        if (!cloud) {
          return localState;
        }

        const expandedCodes = this.getAcceptedReferralCodes(cleanEmail, userAccountNumber, [
          ...(extraCodesOrAccountNumbers || []),
          ...(cloud.referrerAccountNumber ? [cloud.referrerAccountNumber] : []),
        ]);
        const primaryCode = cloud.referrerAccountNumber
          ? this.getReferralCode(cleanEmail, cloud.referrerAccountNumber)
          : localState.referralCode;
        const primaryLink = this.getReferralLink(primaryCode);

        // Merge cloud referrals + any local referrals (never drop valid referrals)
        const mergedReferralsMap = new Map<string, ReferralRecord>();

        for (const r of localState.referrals) {
          const rEmail = (r.referredEmail || '').trim().toLowerCase();
          if (!rEmail || rEmail === cleanEmail) continue;
          mergedReferralsMap.set(rEmail, {
            ...r,
            referrerEmail: cleanEmail,
            referrerCode: r.referrerCode || primaryCode,
          });
        }

        for (const cr of cloud.cloudReferrals) {
          const rEmail = (cr.referredEmail || '').trim().toLowerCase();
          if (!rEmail || rEmail === cleanEmail) continue;
          const prev = mergedReferralsMap.get(rEmail);
          const depUsd =
            cr.totalDepositedUsd > 0
              ? cr.totalDepositedUsd
              : prev?.totalDepositedUsd || this.getFirstDepositForUser(rEmail);
          const safeDep = Number(Number(depUsd || 0).toFixed(2));
          const safeComm = Number((safeDep * COMMISSION_RATE).toFixed(2));

          mergedReferralsMap.set(rEmail, {
            id: cr.id || prev?.id || `ref-${rEmail}`,
            referrerEmail: cleanEmail,
            referrerCode: cr.referrerCode || prev?.referrerCode || expandedCodes[0] || primaryCode,
            referredEmail: rEmail,
            referredName: cr.referredName || prev?.referredName || rEmail.split('@')[0],
            referredAccountNumber:
              cr.referredAccountNumber && cr.referredAccountNumber !== '8842-1001'
                ? cr.referredAccountNumber
                : prev?.referredAccountNumber || cr.referredAccountNumber || '8842-1001',
            totalDepositedUsd: safeDep,
            totalCommissionUsd: safeComm,
            status: cr.status || prev?.status || 'ACTIVE',
            createdAt:
              cr.createdAt && prev?.createdAt
                ? Math.min(cr.createdAt, prev.createdAt)
                : cr.createdAt || prev?.createdAt || Date.now(),
            lastDepositAt: cr.lastDepositAt || prev?.lastDepositAt,
          });
        }

        const mergedReferrals = Array.from(mergedReferralsMap.values()).sort(
          (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
        );

        // Merge & deduplicate claims across local cache, STATE_REFERRALS, vtm_referral_claims, and wallet transactions
        const mergedClaimsMap = new Map<string, ReferralClaimRecord>();
        for (const c of localState.claims) {
          const key = String(c.walletTxReference || c.id || '').trim();
          if (!key || c.amountUsd <= 0) continue;
          mergedClaimsMap.set(key, c);
        }
        for (const cc of cloud.cloudClaims) {
          const key = String(cc.walletTxReference || cc.id || '').trim();
          if (!key || cc.amountUsd <= 0) continue;
          mergedClaimsMap.set(key, cc);
        }
        const mergedClaims = Array.from(mergedClaimsMap.values()).sort(
          (a, b) => b.claimedAt - a.claimedAt
        );

        const totalDeposits = Number(
          mergedReferrals.reduce((s, r) => s + (r.totalDepositedUsd || 0), 0).toFixed(2)
        );
        const totalEarned = Number(
          mergedReferrals.reduce((s, r) => s + (r.totalCommissionUsd || 0), 0).toFixed(2)
        );
        const claimsSum = mergedClaims.reduce((s, c) => s + (c.amountUsd || 0), 0);
        const cloudStateClaimed = Number(cloud.cloudStateData?.totalClaimedUsd || 0);
        const totalClaimed = Number(
          (mergedClaims.length > 0
            ? Math.max(claimsSum, cloudStateClaimed)
            : Math.max(localState.totalClaimedUsd || 0, cloudStateClaimed)
          ).toFixed(2)
        );
        const available =
          mergedClaims.length > 0
            ? this.computeAvailableCommissionChronological(mergedReferrals, mergedClaims)
            : Math.max(0, Number((totalEarned - totalClaimed).toFixed(2)));

        // Rebuild events cleanly for depositing referrals
        const eventsMap = new Map<string, ReferralCommissionEvent>();
        for (const evt of localState.recentEvents) {
          const eKey = (evt.referredEmail || '').trim().toLowerCase();
          if (eKey && mergedReferralsMap.has(eKey)) {
            eventsMap.set(eKey, evt);
          }
        }
        for (const r of mergedReferrals) {
          if (r.totalDepositedUsd > 0 && !eventsMap.has(r.referredEmail)) {
            eventsMap.set(r.referredEmail, {
              id: `evt-${r.referredEmail}`,
              referrerEmail: cleanEmail,
              referredEmail: r.referredEmail,
              depositAmountUsd: r.totalDepositedUsd,
              commissionRate: COMMISSION_RATE,
              commissionEarnedUsd: r.totalCommissionUsd,
              depositReference: `REF-DEP-${r.referredAccountNumber || 'LIVE'}`,
              claimed: available <= 0.01 && totalClaimed >= totalEarned,
              createdAt: r.lastDepositAt || r.createdAt || Date.now(),
            });
          }
        }

        const nextState: ReferralState = {
          referralCode: primaryCode,
          referralLink: primaryLink,
          commissionRate: COMMISSION_RATE,
          minClaimAmountUsd: MIN_CLAIM_AMOUNT_USD,
          minReferralDepositsUsd: MIN_DEPOSITS_REQUIRED_USD,
          totalReferralsCount: mergedReferrals.length,
          totalReferralDepositsUsd: totalDeposits,
          totalCommissionEarnedUsd: totalEarned,
          availableCommissionUsd: available,
          totalClaimedUsd: totalClaimed,
          referrals: mergedReferrals,
          claims: mergedClaims,
          recentEvents: Array.from(eventsMap.values()).sort((a, b) => b.createdAt - a.createdAt),
        };

        this.saveReferralState(cleanEmail, nextState);

        // Keep vtm_referrals + STATE_REFERRALS synchronized in Supabase when we discovered referrals
        if (mergedReferrals.length > 0 || mergedClaims.length > 0) {
          supabaseService
            .syncCloudReferralsBatch(cleanEmail, primaryCode, mergedReferrals, nextState)
            .catch(() => {});
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('vtm_referral_update', {
              detail: {
                referrerEmail: cleanEmail,
                count: nextState.totalReferralsCount,
                availableCommissionUsd: nextState.availableCommissionUsd,
              },
            })
          );
        }

        return nextState;
      } catch {
        return localState;
      } finally {
        inflightCloudRefresh.delete(cleanEmail);
      }
    })();

    inflightCloudRefresh.set(cleanEmail, runPromise);
    return await runPromise;
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
   * Record a new referral deposit and award 5% commission ONLY on the referred user's FIRST deposit.
   * Subsequent deposits by the same referred user are ignored on the user/marketer referral dashboard.
   */
  recordReferralDeposit(
    userEmail: string,
    depositAmountUsd: number,
    referredInfo?: { email?: string; name?: string; accountNumber?: string; reference?: string }
  ): ReferralState {
    const cleanEmail = userEmail.trim().toLowerCase();
    const currentState = this.getReferralState(cleanEmail);
    const amount = Number(depositAmountUsd.toFixed(2));
    if (amount <= 0) return currentState;
    const commission = Number((amount * COMMISSION_RATE).toFixed(2)); // 5%

    const refEmail = (referredInfo?.email || `trader-${Date.now().toString(36).slice(-4)}@vtm.net`)
      .trim()
      .toLowerCase();
    const refName = referredInfo?.name || 'VTM Active Referral';
    const refAccount =
      referredInfo?.accountNumber || `8842-${Math.floor(1000 + Math.random() * 9000)}`;
    const depositRef = referredInfo?.reference || `REF-DEP-${Date.now()}`;

    let updatedReferrals = [...currentState.referrals];
    const existingIdx = updatedReferrals.findIndex(
      (r) => r.referredEmail.toLowerCase() === refEmail
    );

    if (existingIdx >= 0) {
      const existing = updatedReferrals[existingIdx];
      // Strictly count ONLY the first deposit of the referred user
      if ((existing.totalDepositedUsd || 0) > 0) {
        return currentState;
      }
      updatedReferrals[existingIdx] = {
        ...existing,
        totalDepositedUsd: amount,
        totalCommissionUsd: commission,
        lastDepositAt: Date.now(),
      };
    } else {
      updatedReferrals.unshift({
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        referrerEmail: cleanEmail,
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

    const hasExistingEvent = currentState.recentEvents.some(
      (e) => (e.referredEmail || '').toLowerCase() === refEmail
    );
    const newEvent: ReferralCommissionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      referrerEmail: cleanEmail,
      referredEmail: refEmail,
      depositAmountUsd: amount,
      commissionRate: COMMISSION_RATE,
      commissionEarnedUsd: commission,
      depositReference: depositRef,
      claimed: false,
      createdAt: Date.now(),
    };

    const nextEvents = hasExistingEvent
      ? currentState.recentEvents
      : [newEvent, ...currentState.recentEvents].slice(0, 50);

    const nextTotalDeposits = Number(
      updatedReferrals.reduce((sum, r) => sum + (r.totalDepositedUsd || 0), 0).toFixed(2)
    );
    const nextTotalEarned = Number(
      updatedReferrals.reduce((sum, r) => sum + (r.totalCommissionUsd || 0), 0).toFixed(2)
    );
    const totalClaimed = Number((currentState.totalClaimedUsd || 0).toFixed(2));
    const nextAvailable = Math.max(0, Number((nextTotalEarned - totalClaimed).toFixed(2)));

    const nextState: ReferralState = {
      ...currentState,
      totalReferralsCount: updatedReferrals.length,
      totalReferralDepositsUsd: nextTotalDeposits,
      totalCommissionEarnedUsd: nextTotalEarned,
      availableCommissionUsd: nextAvailable,
      referrals: updatedReferrals,
      recentEvents: nextEvents,
    };

    this.saveReferralState(cleanEmail, nextState);
    if (supabaseService.isConfigured()) {
      supabaseService
        .syncCloudReferralsBatch(cleanEmail, nextState.referralCode, updatedReferrals, nextState)
        .catch(() => {});
    }
    return nextState;
  }

  /**
   * Find referrer user email and their referral state by their referral code (local caches + canonical pins)
   */
  findReferrerByCode(referrerCode: string): { email: string; state: ReferralState } | null {
    if (!referrerCode) return null;
    const cleanCode = referrerCode.trim().toUpperCase();

    if (typeof window === 'undefined') return null;

    // 1. Direct scan of referral states in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          const email = key.replace(STORAGE_KEY_PREFIX, '');
          const accepted = this.getAcceptedReferralCodes(email);
          if (parsed.referralCode === cleanCode || accepted.includes(cleanCode)) {
            return { email, state: this.getReferralState(email) };
          }
        } catch {}
      }
    }

    // 2. Scan user registries for any user whose code matches
    try {
      for (const regKey of ['vtm_user_registry', 'vtm_registered_users_registry']) {
        const rawRegistry = localStorage.getItem(regKey);
        if (!rawRegistry) continue;
        const parsedRegistry: Record<string, any> = JSON.parse(rawRegistry);
        for (const [uEmail, uProfile] of Object.entries(parsedRegistry)) {
          if (!uProfile || !uEmail) continue;
          const targetEmail = (uProfile.email || uEmail).trim().toLowerCase();
          const accepted = this.getAcceptedReferralCodes(targetEmail, uProfile.accountNumber);
          if (
            accepted.includes(cleanCode) ||
            (uProfile.accountNumber && cleanCode.includes(String(uProfile.accountNumber).slice(-6)))
          ) {
            return {
              email: targetEmail,
              state: this.getReferralState(targetEmail, uProfile.accountNumber),
            };
          }
        }
      }
    } catch {}

    return null;
  }

  /**
   * Register a new user under a referrer when they sign up with a referral code or link.
   * Updates both local cache and Supabase vtm_referrals table so cross-device referrals always appear!
   */
  registerReferralSignup(
    referrerCode: string,
    newUser: { email: string; name: string; accountNumber?: string }
  ): boolean {
    if (!referrerCode || !newUser.email) return false;
    try {
      const cleanCode = referrerCode.trim().toUpperCase();
      const cleanEmail = newUser.email.trim().toLowerCase();

      if (typeof window !== 'undefined') {
        this.setReferredByForUser(cleanEmail, cleanCode);
      }

      const matched = this.findReferrerByCode(cleanCode);

      // Always persist signup attribution to Supabase cloud even if referrer isn't cached on this device
      if (supabaseService.isConfigured()) {
        supabaseService
          .recordReferralSignupInCloud(cleanCode, matched?.email || null, newUser)
          .catch(() => {});
      }

      if (!matched) {
        return true;
      }

      const { email: referrerEmail, state: currentState } = matched;

      // Prevent self-referral
      if (referrerEmail.toLowerCase() === cleanEmail) {
        return false;
      }

      const updatedReferrals = [...currentState.referrals];
      const existingIdx = updatedReferrals.findIndex(
        (r) => r.referredEmail.toLowerCase() === cleanEmail
      );

      if (existingIdx >= 0) {
        updatedReferrals[existingIdx] = {
          ...updatedReferrals[existingIdx],
          referredName: newUser.name.trim() || updatedReferrals[existingIdx].referredName,
          referredAccountNumber:
            newUser.accountNumber || updatedReferrals[existingIdx].referredAccountNumber,
        };
      } else {
        const newReferral: ReferralRecord = {
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          referrerEmail: referrerEmail.toLowerCase(),
          referrerCode: cleanCode,
          referredEmail: cleanEmail,
          referredName: newUser.name.trim() || 'New Trader',
          referredAccountNumber:
            newUser.accountNumber || `8842-${Math.floor(1000 + Math.random() * 9000)}`,
          totalDepositedUsd: 0.0,
          totalCommissionUsd: 0.0,
          status: 'ACTIVE',
          createdAt: Date.now(),
        };
        updatedReferrals.unshift(newReferral);
      }

      const totalDeposited = updatedReferrals.reduce(
        (sum, r) => sum + (r.totalDepositedUsd || 0),
        0
      );
      const totalEarned = updatedReferrals.reduce(
        (sum, r) => sum + (r.totalCommissionUsd || 0),
        0
      );
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vtm_referral_update', {
            detail: { referrerEmail, newReferralEmail: cleanEmail, count: updatedReferrals.length },
          })
        );
      }

      return true;
    } catch (err) {
      console.error('[Referral] Error registering referral signup:', err);
      return false;
    }
  }

  /**
   * Record a deposit for a referrer identified by their referral code or email (local + cloud resolution)
   */
  recordDepositForReferrerCode(
    referrerCodeOrEmail: string,
    depositAmountUsd: number,
    referredInfo?: { email?: string; name?: string; accountNumber?: string; reference?: string }
  ): void {
    if (depositAmountUsd < 16) return;
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

      if (!matchedEmail && referredInfo?.email) {
        const storedCode = this.getReferredByCodeForUser(referredInfo.email);
        if (storedCode) {
          const matched = this.findReferrerByCode(storedCode);
          if (matched) matchedEmail = matched.email;
        }
      }

      if (matchedEmail) {
        this.recordReferralDeposit(matchedEmail, depositAmountUsd, referredInfo);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('vtm_referral_update', {
              detail: { referrerEmail: matchedEmail, depositAmountUsd },
            })
          );
        }
        return;
      }

      // Cross-device cloud lookup if referrer was not in local browser cache
      if (cleanRef && supabaseService.isConfigured()) {
        supabaseService
          .resolveReferrerByCodeFromCloud(cleanRef)
          .then((resolved) => {
            if (!resolved?.email) return;
            this.recordReferralDeposit(resolved.email, depositAmountUsd, referredInfo);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('vtm_referral_update', {
                  detail: { referrerEmail: resolved.email, depositAmountUsd },
                })
              );
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  /**
   * Authoritative, cloud-synced commission claim with duplicate-click lock & minimum $20.00 enforcement.
   * Refreshes latest cloud referrals & claims first so cross-device balances are always exact.
   */
  async claimCommissionAsync(
    userEmail: string,
    userAccountNumber?: string,
    amountToClaim?: number
  ): Promise<{
    success: boolean;
    claimedAmount: number;
    walletTxReference?: string;
    error?: string;
    state: ReferralState;
  }> {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanEmail || cleanEmail === 'guest@vtm.com') {
      const fallbackState = this.getReferralState(userEmail, userAccountNumber);
      return {
        success: false,
        claimedAmount: 0,
        error: 'Please sign in to your account before claiming referral commissions.',
        state: fallbackState,
      };
    }

    if (claimingEmailsLock.has(cleanEmail)) {
      const current = this.getReferralState(cleanEmail, userAccountNumber);
      return {
        success: false,
        claimedAmount: 0,
        error: 'A commission claim is already being processed. Please wait a moment.',
        state: current,
      };
    }

    claimingEmailsLock.add(cleanEmail);
    try {
      const currentState = await this.refreshReferralStateFromCloud(cleanEmail, userAccountNumber);
      const rawAvailable = Number(currentState.availableCommissionUsd || 0);
      const requested =
        typeof amountToClaim === 'number' && amountToClaim > 0
          ? Number(amountToClaim.toFixed(2))
          : rawAvailable;
      const amount = requested > rawAvailable && requested - rawAvailable <= 0.01 ? rawAvailable : requested;

      if (amount < MIN_CLAIM_AMOUNT_USD) {
        return {
          success: false,
          claimedAmount: 0,
          error: `Minimum claim amount is $${MIN_CLAIM_AMOUNT_USD.toFixed(2)} USD. Your available commission is $${rawAvailable.toFixed(2)} USD.`,
          state: currentState,
        };
      }

      if (amount > rawAvailable) {
        return {
          success: false,
          claimedAmount: 0,
          error: `Requested amount ($${amount.toFixed(2)}) exceeds your available referral commission ($${rawAvailable.toFixed(2)}).`,
          state: currentState,
        };
      }

      const nowTs = Date.now();
      const claimTxRef = `REF-CLAIM-${nowTs}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newClaim: ReferralClaimRecord = {
        id: `claim-${nowTs}-${Math.random().toString(36).slice(2, 6)}`,
        referrerEmail: cleanEmail,
        amountUsd: amount,
        claimedAt: nowTs,
        status: 'COMPLETED',
        walletTxReference: claimTxRef,
      };

      const nextClaimedTotal = Number((currentState.totalClaimedUsd + amount).toFixed(2));
      const nextAvailable = Math.max(0, Number((rawAvailable - amount).toFixed(2)));
      const nextClaims = [newClaim, ...currentState.claims];

      const nextEvents = currentState.recentEvents.map((evt) =>
        !evt.claimed ? { ...evt, claimed: true, claimedAt: nowTs } : evt
      );

      const nextState: ReferralState = {
        ...currentState,
        totalClaimedUsd: nextClaimedTotal,
        availableCommissionUsd: nextAvailable,
        claims: nextClaims,
        recentEvents: nextEvents,
      };

      this.saveReferralState(cleanEmail, nextState);

      if (supabaseService.isConfigured()) {
        await supabaseService.saveReferralClaimToCloud(newClaim, nextState).catch(() => false);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vtm_referral_update', {
            detail: { referrerEmail: cleanEmail, claimedAmount: amount, walletTxReference: claimTxRef },
          })
        );
      }

      return {
        success: true,
        claimedAmount: amount,
        walletTxReference: claimTxRef,
        state: nextState,
      };
    } finally {
      claimingEmailsLock.delete(cleanEmail);
    }
  }

  /**
   * Synchronous claim helper (updates local state immediately and persists to Supabase in background)
   */
  claimCommission(
    userEmail: string,
    amountToClaim?: number
  ): { success: boolean; claimedAmount: number; walletTxReference?: string; error?: string; state: ReferralState } {
    const cleanEmail = (userEmail || 'guest@vtm.com').trim().toLowerCase();
    const currentState = this.getReferralState(cleanEmail);
    const amount =
      typeof amountToClaim === 'number' && amountToClaim > 0
        ? Number(amountToClaim.toFixed(2))
        : currentState.availableCommissionUsd;

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

    const nowTs = Date.now();
    const claimTxRef = `REF-CLAIM-${nowTs}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClaim: ReferralClaimRecord = {
      id: `claim-${nowTs}-${Math.random().toString(36).slice(2, 6)}`,
      referrerEmail: cleanEmail,
      amountUsd: amount,
      claimedAt: nowTs,
      status: 'COMPLETED',
      walletTxReference: claimTxRef,
    };

    const nextClaimedTotal = Number((currentState.totalClaimedUsd + amount).toFixed(2));
    const nextAvailable = Math.max(
      0,
      Number((currentState.availableCommissionUsd - amount).toFixed(2))
    );
    const nextClaims = [newClaim, ...currentState.claims];

    const nextEvents = currentState.recentEvents.map((evt) => {
      if (!evt.claimed) {
        return { ...evt, claimed: true, claimedAt: nowTs };
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

    this.saveReferralState(cleanEmail, nextState);
    if (supabaseService.isConfigured() && cleanEmail !== 'guest@vtm.com') {
      supabaseService.saveReferralClaimToCloud(newClaim, nextState).catch(() => {});
    }
    return {
      success: true,
      claimedAmount: amount,
      walletTxReference: claimTxRef,
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
