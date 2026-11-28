import {
  UserFinancialState,
  getUserStorageKey,
  sanitizeRealTransactions,
  markAccountDeletedLocally,
  getDeletedAccountNumbers,
  pickAuthoritativeAccount,
  isSkeletonZeroAccount,
  calculateNetWalletFromLedger,
  reconcileWalletBalanceWithTransactions,
  mergeTransactionLists,
  loadUserFinancials,
  findRegisteredUser,
  getAllRegisteredUsers,
  AdminUserOpenTradeCounts,
  extractOpenTradeCountsFromCloudPayloads,
} from '../utils/financialStorage';
import { TradingAccount, Transaction, Position, PendingOrder, ClosedTrade } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import {
  calculateBotPnL,
  sanitizeBotTrades,
  getDeletedBotIds,
  getDeletedBotTimestamps,
  mergeRemoteDeletedBotMap,
  markBotDeletedLocally,
  sanitizeAndFilterBotRuns,
  filterTradesForValidBotRuns,
  loadStoredBotRuns,
} from './botTradingService';
import { getUsdKesWithdrawRate } from './payheroService';
import { LedgerEntry } from '../utils/financialLedger';


const ONEAPP_SYNCED_WITHDRAWALS_KEY = 'vtm_synced_oneapp_withdrawals';
const syncedOneAppWithdrawalsMemory = new Set<string>();
const inFlightOneAppWithdrawals = new Map<
  string,
  Promise<{
    success: boolean;
    simLimitExceeded?: boolean;
    previousMpesaBalance?: string;
    updatedMpesaBalance?: string;
    amountKes?: number;
  }>
>();

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface UserPlatformSettings {
  isDarkMode: boolean;
  oneClickTrading: boolean;
  slippage: number;
  soundEnabled: boolean;
  showSpreadBrackets: boolean;
  drawdownProtection: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  defaultLeverage?: string;
  favoriteSymbols?: string[];
  activeAccountId?: string;
  updatedAt?: number;
}

export interface DepositRecord {
  id: string;
  userEmail: string;
  targetAccount: string;
  amountUsd: number;
  amountKes?: number;
  method: string;
  phone?: string;
  reference: string;
  payheroReference?: string;
  checkoutId?: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  externalReference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: number;
}

export interface WithdrawalRecord {
  id: string;
  userEmail: string;
  sourceAccount: string;
  amountUsd: number;
  method: string;
  reference: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  createdAt: number;
}

export interface TransferRecord {
  id: string;
  userEmail: string;
  fromAccount: string;
  toAccount: string;
  amountUsd: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: number;
}

const SESSION_TOKEN_STORAGE_KEY = 'vtm_session_token';

const PROXY_ENDPOINT_URL = '/api/supabase-proxy';

class SupabaseService {
  private config: SupabaseConfig | null = null;
  private initPromise: Promise<SupabaseConfig | null> | null = null;
  private quotaRestrictedUntil = 0;
  private closedTradesLegacyFkBlocked: boolean | null = null;
  private activeSessionPasswordInMemory = '';

  constructor() {
    this.loadConfig();
    this.initServerConfig().catch(() => {});
  }

  public setActiveSessionPassword(password?: string | null): void {
    this.activeSessionPasswordInMemory = typeof password === 'string' ? password.trim() : '';
  }

  public getSessionToken(): string {
    try {
      return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  public setSessionToken(token: string): void {
    try {
      if (token && token.trim()) {
        localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token.trim());
      }
    } catch {
      // ignore
    }
  }

  public clearSessionToken(): void {
    this.activeSessionPasswordInMemory = '';
    try {
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      localStorage.removeItem('vtm_active_user_password');
      localStorage.removeItem('vtm_user_credentials');
    } catch {
      // ignore
    }
  }

  private getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = this.getSessionToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  private async proxyPost(
    payload: Record<string, any>,
    timeoutMs = 9500,
    emitExpiredOn401 = true
  ): Promise<Response> {
    const token = this.getSessionToken();
    const res = await fetch(PROXY_ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401 && emitExpiredOn401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vtm_session_expired'));
    }
    return res;
  }

  private async proxyRest(
    pathAndQuery: string,
    init: RequestInit = {},
    timeoutMs = 7000
  ): Promise<Response> {
    const headersObj: Record<string, string> = {};
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headersObj[k] = v;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => {
          headersObj[k] = v;
        });
      } else {
        Object.assign(headersObj, init.headers);
      }
    }
    delete headersObj.apikey;
    delete headersObj.Apikey;
    delete headersObj.authorization;
    delete headersObj.Authorization;

    return this.proxyPost(
      {
        action: 'rest',
        path: pathAndQuery.replace(/^\/+/, ''),
        method: (init.method || 'GET').toUpperCase(),
        headers: headersObj,
        body:
          typeof init.body === 'string'
            ? init.body
            : init.body !== undefined && init.body !== null
            ? JSON.stringify(init.body)
            : undefined,
      },
      timeoutMs,
      true
    );
  }

  public isProjectRestrictedByQuota(): boolean {
    return Date.now() < this.quotaRestrictedUntil;
  }

  private isQuotaRestricted(): boolean {
    return Date.now() < this.quotaRestrictedUntil;
  }

  private checkResponseQuota(res?: Response | null): boolean {
    if (res && (res.status === 402 || res.status === 429)) {
      this.quotaRestrictedUntil = Date.now() + 5 * 60 * 1000;
      return true;
    }
    return false;
  }

  private deterministicUuidFromEmail(email: string): string {
    const clean = email.trim().toLowerCase();
    let h1 = 0xdeadbeef ^ clean.length;
    let h2 = 0x41c6ce57 ^ clean.length;
    let h3 = 0x1b873593 ^ clean.length;
    let h4 = 0x85ebca6b ^ clean.length;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 2246822507);
      h4 = Math.imul(h4 ^ ch, 3266489909);
    }
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
    return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
  }

  public async initServerConfig(): Promise<SupabaseConfig | null> {
    if (this.config && this.config.url === PROXY_ENDPOINT_URL) {
      return this.config;
    }
    this.config = { url: PROXY_ENDPOINT_URL, anonKey: 'server-proxied' };
    return this.config;
  }

  public loadConfig(): SupabaseConfig | null {
    this.config = { url: PROXY_ENDPOINT_URL, anonKey: 'server-proxied' };
    try {
      localStorage.removeItem('vtm_supabase_url');
      localStorage.removeItem('vtm_supabase_anon_key');
    } catch {
      // ignore
    }
    return this.config;
  }

  public isConfigured(): boolean {
    return !!(this.config && this.config.url);
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public clearCredentials(): void {
    this.config = null;
    this.clearSessionToken();
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.proxyPost({ action: 'test_connection' }, 5500, false);
      const data = await res.json().catch(() => null);
      if (data && typeof data.success === 'boolean') {
        return { success: data.success, message: data.message || 'Checked connection.' };
      }
      return { success: res.ok, message: res.ok ? 'Connected to Supabase gateway successfully.' : `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection timeout or network error' };
    }
  }

  public async checkEmailExists(email: string): Promise<boolean> {
    if (!email) return false;
    try {
      const res = await this.proxyPost(
        { action: 'check_email_exists', email: email.trim().toLowerCase() },
        5500,
        false
      );
      if (res.ok) {
        const data = await res.json().catch(() => null);
        return Boolean(data?.exists);
      }
    } catch {
      // ignore
    }
    return Boolean(findRegisteredUser(email.trim().toLowerCase()));
  }

  public async authenticateWithServer(
    email: string,
    password: string
  ): Promise<{
    ok: boolean;
    profile?: UserAuthProfile;
    sessionToken?: string;
    error?: string;
    code?: string;
    quotaLimited?: boolean;
  }> {
    try {
      const res = await this.proxyPost(
        {
          action: 'auth_login',
          email: email.trim().toLowerCase(),
          password,
        },
        8500,
        false
      );
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data?.sessionToken) {
        this.setSessionToken(data.sessionToken);
        if (password) this.setActiveSessionPassword(password);
      }
      return {
        ok: Boolean(data?.ok && data?.profile),
        profile: data?.profile,
        sessionToken: data?.sessionToken,
        error: data?.error,
        code: data?.code,
        quotaLimited: Boolean(data?.quotaLimited),
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Authentication service unavailable' };
    }
  }

  public async registerWithServer(
    profile: UserAuthProfile,
    password: string
  ): Promise<{
    ok: boolean;
    profile?: UserAuthProfile;
    sessionToken?: string;
    error?: string;
    code?: string;
  }> {
    try {
      const res = await this.proxyPost(
        {
          action: 'auth_register',
          profile,
          password,
        },
        9500,
        false
      );
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data?.sessionToken) {
        this.setSessionToken(data.sessionToken);
        if (password) this.setActiveSessionPassword(password);
      }
      return {
        ok: Boolean(data?.ok && data?.profile),
        profile: data?.profile,
        sessionToken: data?.sessionToken,
        error: data?.error,
        code: data?.code,
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Registration service unavailable' };
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };
  }

  // =========================================================================
  // 1. ACCOUNT CREATION & PROFILES (vtm_registered_users & Supabase Auth)
  // =========================================================================

  private isValidUuid(val?: string | null): boolean {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  }

  private deterministicUuidFromString(input: string): string {
    const clean = String(input || '').trim();
    let h1 = 0xdeadbeef ^ clean.length;
    let h2 = 0x41c6ce57 ^ clean.length;
    let h3 = 0x1b873593 ^ clean.length;
    let h4 = 0x85ebca6b ^ clean.length;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 2246822507);
      h4 = Math.imul(h4 ^ ch, 3266489909);
    }
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
    return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
  }

  private toUuidForDb(rawId?: string | null, fallbackPrefix = 'row'): string {
    const trimmed = typeof rawId === 'string' ? rawId.trim() : '';
    if (this.isValidUuid(trimmed)) {
      return trimmed.toLowerCase();
    }
    return this.deterministicUuidFromString(trimmed || `${fallbackPrefix}-${Date.now()}`);
  }

  private toIsoTimestamp(value?: number | string | null, fallbackMs = Date.now()): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !/^\d+$/.test(trimmed)) {
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
          return new Date(parsed).toISOString();
        }
      }
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (Number.isFinite(num)) {
          const ms = num > 0 && num < 1e11 ? num * 1000 : num;
          return new Date(ms).toISOString();
        }
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value > 0 && value < 1e11 ? value * 1000 : value;
      return new Date(ms).toISOString();
    }
    return new Date(fallbackMs).toISOString();
  }

  private toEpochMs(value?: number | string | null, fallbackMs = Date.now()): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 0 && value < 1e11 ? value * 1000 : value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (Number.isFinite(num)) {
          return num > 0 && num < 1e11 ? num * 1000 : num;
        }
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return fallbackMs;
  }

  private toBigIntTicket(ticket: unknown, fallbackSeed = ''): number {
    if (typeof ticket === 'number' && Number.isFinite(ticket) && ticket >= 0) {
      return Math.trunc(ticket);
    }
    if (typeof ticket === 'string') {
      const digits = ticket.replace(/\D/g, '');
      if (digits.length > 0 && digits.length <= 15) {
        const parsed = Number(digits);
        if (Number.isSafeInteger(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }
    const seed = String(ticket ?? fallbackSeed);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (Math.imul(31, hash) + seed.charCodeAt(i)) >>> 0;
    }
    return 100000 + (hash % 89999999);
  }

  public async findUserInDatabase(
    email: string,
    _forLogin = false
  ): Promise<{ profile: UserAuthProfile; password?: string; hasVerifiedUid: boolean } | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const hasSession = Boolean(this.getSessionToken());

    // 1. Query Supabase via authenticated proxy when session token exists
    if (this.config && hasSession && !this.isQuotaRestricted()) {
      try {
        const queryFilter = `email=ilike.${encodeURIComponent(cleanEmail)}`;

        const res = await this.proxyRest(
          `vtm_registered_users?${queryFilter}&select=*`,
          { method: 'GET' },
          5500
        );

        this.checkResponseQuota(res);

        let rows: any[] = [];
        if (res.ok) {
          const parsed = await res.json().catch(() => []);
          if (Array.isArray(parsed)) rows = parsed;
        }

        if (rows.length > 0) {
          const row = rows[0];
          let resolvedUid = row.uid || '';

          if (!this.isValidUuid(resolvedUid) && !this.isQuotaRestricted()) {
            try {
              const finRes = await this.proxyRest(
                `vtm_user_finances?user_email=ilike.${encodeURIComponent(cleanEmail)}&select=user_key`,
                { method: 'GET' },
                3500
              );
              this.checkResponseQuota(finRes);
              if (finRes.ok) {
                const finRows = await finRes.json().catch(() => []);
                if (Array.isArray(finRows)) {
                  const uuidRow = finRows.find((r: any) => this.isValidUuid(r.user_key));
                  if (uuidRow) {
                    resolvedUid = uuidRow.user_key;
                  }
                }
              }
            } catch {
              // ignore
            }
          }

          if (!this.isValidUuid(resolvedUid)) {
            resolvedUid = this.deterministicUuidFromEmail(cleanEmail);
          }

          const safeRole =
            row.role === 'admin'
              ? 'admin'
              : row.role === 'marketer'
              ? 'marketer'
              : 'normal';

          const profile: UserAuthProfile = {
            id: resolvedUid,
            name: row.name || 'Trader',
            email: row.email.trim().toLowerCase(),
            phoneNumber: row.phone_number || '',
            phone: row.phone_number || '',
            countryCode: row.country_code || '+1',
            countryName: row.country_name || 'United States',
            accountNumber: row.account_number || '27330648',
            role: safeRole,
            isLoggedIn: true,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            referredByCode: row.referred_by_code || undefined,
          };
          return { profile, hasVerifiedUid: true };
        }
      } catch (e) {
        console.warn('Could not query vtm_registered_users via proxy', e);
      }
    }

    // 2. Fallback to authenticated Server-Side Platform Database (/api/platform-db)
    if (hasSession) {
      try {
        const srvRes = await fetch(`/api/platform-db?email=${encodeURIComponent(cleanEmail)}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(3500),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData?.ok && srvData.user && srvData.user.email) {
            const u = srvData.user;
            const resolvedUid = this.isValidUuid(u.id)
              ? u.id
              : this.deterministicUuidFromEmail(cleanEmail);
            const profile: UserAuthProfile = {
              ...u,
              id: resolvedUid,
              email: cleanEmail,
              role:
                u.role === 'admin'
                  ? 'admin'
                  : u.role === 'marketer'
                  ? 'marketer'
                  : 'normal',
              isLoggedIn: true,
            };
            return { profile, hasVerifiedUid: true };
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Fallback to Local User Registry (findRegisteredUser)
    try {
      const localUser = findRegisteredUser(cleanEmail);
      if (localUser && localUser.email) {
        const resolvedUid = this.isValidUuid(localUser.id)
          ? localUser.id
          : this.deterministicUuidFromEmail(cleanEmail);
        return {
          profile: {
            ...localUser,
            id: resolvedUid,
            role:
              localUser.role === 'admin'
                ? 'admin'
                : localUser.role === 'marketer'
                ? 'marketer'
                : 'normal',
            isLoggedIn: true,
          },
          hasVerifiedUid: true,
        };
      }
    } catch {
      // ignore
    }

    return null;
  }

  public async registerUserInDatabase(
    profile: UserAuthProfile,
    password?: string
  ): Promise<boolean> {
    if (!this.config || !profile.email) return false;
    const cleanEmail = profile.email.trim().toLowerCase();
    const verifiedUid = this.isValidUuid(profile.id) ? profile.id.trim() : '';

    // Strict rule: user without a valid UID can NEVER be saved or sign in
    if (!verifiedUid) {
      console.warn('Blocked registration in database: missing valid UID');
      return false;
    }

    const safeRole =
      profile.role === 'admin'
        ? 'admin'
        : profile.role === 'marketer'
        ? 'marketer'
        : 'normal';

    if (password && password.trim()) {
      this.setActiveSessionPassword(password.trim());
      // Auto-link OneApp account with the exact same email, phone, and password
      this.previewOneAppAccountBalance(profile, profile.phoneNumber || profile.phone, password.trim()).catch(() => {});
    }

    if (this.getSessionToken()) {
      fetch('/api/platform-db', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'upsert_user',
          user: {
            ...profile,
            id: verifiedUid,
            email: cleanEmail,
            role: safeRole,
          },
          password: password || undefined,
        }),
      }).catch(() => {});
    }

    if (this.isQuotaRestricted() || !this.getSessionToken()) {
      return true;
    }

    try {
      const rawIncomingPhone = String(profile.phoneNumber || profile.phone || '').trim();
      const isPlaceholderDigits = (digits: string) =>
        !digits ||
        digits === '254700000000' ||
        digits === '0700000000' ||
        digits === '700000000';
      const incomingDigits = rawIncomingPhone.replace(/\D/g, '');
      const isPlaceholderOrEmptyPhone = isPlaceholderDigits(incomingDigits);

      let existingStoredPhone = '';
      try {
        const lookupRes = await this.proxyRest(
          `vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}&select=phone_number&limit=1`,
          { method: 'GET' },
          4000
        );
        if (!this.checkResponseQuota(lookupRes) && lookupRes.ok) {
          const existingRows = await lookupRes.json().catch(() => []);
          if (Array.isArray(existingRows) && existingRows.length > 0) {
            const candidate = String(existingRows[0]?.phone_number || '').trim();
            const candidateDigits = candidate.replace(/\D/g, '');
            if (candidateDigits.length >= 6 && !isPlaceholderDigits(candidateDigits)) {
              existingStoredPhone = candidate;
            }
          }
        }
      } catch {
        // Proceed gracefully if lookup times out
      }

      const authoritativePhone = existingStoredPhone || (isPlaceholderOrEmptyPhone ? '' : rawIncomingPhone);

      if (password === undefined || password === '') {
        const patchBody: Record<string, any> = {
          name: profile.name,
          country_code: profile.countryCode || '+1',
          country_name: profile.countryName || 'United States',
          role: safeRole,
          uid: verifiedUid,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (!existingStoredPhone && !isPlaceholderOrEmptyPhone) {
          patchBody.phone_number = rawIncomingPhone;
        }
        const patchExistingRes = await this.proxyRest(
          `vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(patchBody),
          },
          5000
        );
        if (this.checkResponseQuota(patchExistingRes)) return true;
        if (patchExistingRes.ok) {
          const updatedRows = await patchExistingRes.json().catch(() => []);
          if (Array.isArray(updatedRows) && updatedRows.length > 0) {
            return true;
          }
        }
      }

      const payload: Record<string, any> = {
        email: cleanEmail,
        uid: verifiedUid,
        name: profile.name,
        phone_number: authoritativePhone,
        country_code: profile.countryCode || '+1',
        country_name: profile.countryName || 'United States',
        account_number: profile.accountNumber || '27330648',
        role: safeRole,
        created_at: new Date(profile.createdAt || Date.now()).toISOString(),
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (profile.referredByCode) {
        payload.referred_by_code = profile.referredByCode.trim().toUpperCase();
      }

      const res = await this.proxyRest(
        `vtm_registered_users?on_conflict=email`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        },
        6000
      );

      if (this.checkResponseQuota(res)) return true;
      if (res.ok) {
        return true;
      }

      const { uid: _omitUid, referred_by_code: _omitRef, ...payloadWithoutUid } = payload;
      const retryPostRes = await this.proxyRest(
        `vtm_registered_users?on_conflict=email`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payloadWithoutUid),
        },
        6000
      );

      if (this.checkResponseQuota(retryPostRes)) return true;
      if (retryPostRes.ok) {
        return true;
      }

      const patchPayload: Record<string, any> = {
        name: profile.name,
        country_code: profile.countryCode || '+1',
        country_name: profile.countryName || 'United States',
        role: safeRole,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!existingStoredPhone && !isPlaceholderOrEmptyPhone) {
        patchPayload.phone_number = rawIncomingPhone;
      }

      const patchRes = await this.proxyRest(
        `vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        },
        6000
      );

      if (this.checkResponseQuota(patchRes)) return true;
      return true;
    } catch (e) {
      console.warn('Failed to save registered user via proxy, persisted to server DB', e);
      return true;
    }
  }

  public async updateUserLastLoginInDatabase(email: string): Promise<boolean> {
    if (!this.config || !email || !this.getSessionToken()) return false;

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await this.proxyRest(
        `vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        },
        3500
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async updateUserRoleInDatabase(email: string, role: string): Promise<boolean> {
    if (!this.config || !email) return false;

    try {
      const cleanEmail = email.trim().toLowerCase();
      const safeRole =
        role === 'admin' ? 'admin' : role === 'marketer' ? 'marketer' : 'normal';

      try {
        const channel = new BroadcastChannel('vtm_global_sync');
        channel.postMessage({
          type: 'ROLE_CHANGED',
          email: cleanEmail,
          role: safeRole,
          timestamp: Date.now(),
        });
        setTimeout(() => channel.close(), 100);
      } catch {
        // BroadcastChannel may fail in some restricted environments
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vtm_role_changed', {
            detail: { email: cleanEmail, role: safeRole, timestamp: Date.now() },
          })
        );
        try {
          localStorage.setItem('vtm_role_update_ping', `${cleanEmail}:${safeRole}:${Date.now()}`);
        } catch {
          // ignore
        }
      }

      fetch('/api/platform-db', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'update_role',
          email: cleanEmail,
          role: safeRole,
        }),
      }).catch(() => {});

      if (this.isQuotaRestricted()) {
        return true;
      }

      const res = await this.proxyRest(
        `vtm_registered_users?email=ilike.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            role: safeRole,
            updated_at: new Date().toISOString(),
          }),
        },
        4500
      );

      if (this.checkResponseQuota(res)) return true;

      if (res.ok) {
        const updatedRows = await res.json().catch(() => []);
        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
          return true;
        }
      }

      const upsertRes = await this.proxyRest(
        `vtm_registered_users?on_conflict=email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            email: cleanEmail,
            role: safeRole,
            updated_at: new Date().toISOString(),
          }),
        },
        4500
      );

      this.checkResponseQuota(upsertRes);
      return true;
    } catch {
      return true;
    }
  }

  public async fetchAllPlatformUsersAndFinances(): Promise<{
    users: UserAuthProfile[];
    financesByEmail: Record<string, UserFinancialState>;
    openTradesByEmail?: Record<string, AdminUserOpenTradeCounts>;
  } | null> {
    if (!this.config || !this.getSessionToken()) return null;

    try {
      let usersRows: any[] = [];
      let finRows: any[] = [];
      let actRows: any[] = [];
      let cloudStateRows: any[] = [];
      let cloudStatesFetchedOk = false;

      if (!this.isQuotaRestricted()) {
        const [usersRes, finRes, actRes, cloudStatesRes] = await Promise.all([
          this.proxyRest(
            `vtm_registered_users?select=*&order=created_at.desc&limit=5000`,
            { method: 'GET' },
            6500
          ).catch(() => null),
          this.proxyRest(
            `vtm_user_finances?select=user_email,user_key,user_name,wallet_balance,accounts,transactions,selected_account_id,last_updated&order=last_updated.desc&limit=5000`,
            { method: 'GET' },
            6500
          ).catch(() => null),
          this.proxyRest(
            `user_activities?select=id,user_email,activity_type,description,metadata,created_at&activity_type=in.(SIGNUP,REGISTRATION,DEPOSIT,DEPOSIT_CRYPTO_PENDING,ACCOUNT_CREATED,OPEN_ACCOUNT,ACCOUNT_DELETED)&order=created_at.desc&limit=1000`,
            { method: 'GET' },
            6500
          ).catch(() => null),
          this.proxyRest(
            `vtm_cloud_states?state_key=in.(STATE_TRADES,STATE_BOTS)&select=user_email,state_key,data&limit=5000`,
            { method: 'GET' },
            6500
          ).catch(() => null),
        ]);

        this.checkResponseQuota(usersRes);
        this.checkResponseQuota(finRes);
        this.checkResponseQuota(actRes);
        this.checkResponseQuota(cloudStatesRes);

        usersRows = usersRes && usersRes.ok ? await usersRes.json() : [];
        finRows = finRes && finRes.ok ? await finRes.json() : [];
        actRows = actRes && actRes.ok ? await actRes.json() : [];
        cloudStatesFetchedOk = Boolean(cloudStatesRes && cloudStatesRes.ok);
        cloudStateRows = cloudStatesFetchedOk ? await cloudStatesRes!.json() : [];

        if (Array.isArray(usersRows) && usersRows.length > 0) {
          fetch('/api/platform-db', {
            method: 'POST',
            headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ action: 'bulk_upsert_users', users: usersRows }),
          }).catch(() => {});
        }
      }

      const hasCloudData =
        (Array.isArray(usersRows) && usersRows.length > 0) ||
        (Array.isArray(finRows) && finRows.length > 0);

      const financesByEmail: Record<string, UserFinancialState> = {};
      const deletedByEmail: Record<string, Set<string>> = {};
      const uidByEmail: Record<string, string> = {};
      const nameByEmail: Record<string, string> = {};
      const referredByEmail: Record<string, string> = {};
      const signupTimeByEmail: Record<string, number> = {};

      const getDeletedSetForEmail = (email: string): Set<string> => {
        const clean = email.trim().toLowerCase();
        if (!deletedByEmail[clean]) {
          deletedByEmail[clean] = getDeletedAccountNumbers(clean);
        }
        return deletedByEmail[clean];
      };

      if (Array.isArray(actRows)) {
        actRows.forEach((act: any) => {
          const actEmail = String(act?.user_email || '').trim().toLowerCase();
          if (actEmail && act?.metadata?.referredByCode) {
            referredByEmail[actEmail] = String(act.metadata.referredByCode).trim().toUpperCase();
          }
          if (
            actEmail &&
            (act?.activity_type === 'REGISTRATION' || act?.activity_type === 'SIGNUP') &&
            act?.created_at
          ) {
            const ts = new Date(act.created_at).getTime();
            if (Number.isFinite(ts) && ts > 0) {
              signupTimeByEmail[actEmail] = ts;
            }
          }
          if (act && act.activity_type === 'ACCOUNT_DELETED' && !act.metadata?.silent) {
            const accNum = act.metadata?.accountNumber;
            if (accNum && actEmail) {
              getDeletedSetForEmail(actEmail).add(String(accNum));
              markAccountDeletedLocally(actEmail, String(accNum));
            }
          }
        });
      }

      const adminEmailsSet = new Set<string>();
      if (Array.isArray(usersRows)) {
        usersRows.forEach((row: any) => {
          if (row?.email && row?.role === 'admin') {
            adminEmailsSet.add(String(row.email).trim().toLowerCase());
          }
        });
      }

      if (Array.isArray(finRows)) {
        finRows.forEach((r: any) => {
          const emailKey = (r.user_email || r.user_key || '').trim().toLowerCase();
          if (!emailKey) return;

          if (this.isValidUuid(r.user_key)) {
            uidByEmail[emailKey] = r.user_key.trim();
          }
          if (r.user_name) {
            nameByEmail[emailKey] = r.user_name;
          }

          const canonicalEmail = emailKey;

          const userDeletedSet = getDeletedSetForEmail(canonicalEmail);
          const existing = financesByEmail[canonicalEmail];
          const incomingAccounts: TradingAccount[] = (Array.isArray(r.accounts) ? r.accounts : []).filter(
            (acc: TradingAccount) => !acc?.accountNumber || !userDeletedSet.has(String(acc.accountNumber))
          );
          const isAdminEmail = adminEmailsSet.has(canonicalEmail);
          const incomingTxs: Transaction[] = isAdminEmail
            ? []
            : sanitizeRealTransactions(
                Array.isArray(r.transactions) ? r.transactions : []
              );
          const incomingUpdated = r.last_updated ? new Date(r.last_updated).getTime() : Date.now();
          const incomingWallet = Number(r.wallet_balance || 0);

          if (!existing) {
            const state: UserFinancialState = {
              walletBalance: incomingWallet,
              accounts: incomingAccounts,
              selectedAccountId: r.selected_account_id || incomingAccounts[0]?.id || null,
              transactions: incomingTxs,
              lastUpdated: incomingUpdated,
            };
            financesByEmail[canonicalEmail] = state;
          } else {
            // Merge non-deleted accounts and transactions across rows so no account is ever lost or overwritten by a $0 skeleton
            const mergedAccMap = new Map<string, TradingAccount>();
            incomingAccounts.forEach((acc) => {
              const k = acc.accountNumber || acc.id;
              if (k) mergedAccMap.set(k, acc);
            });
            (existing.accounts || []).forEach((acc) => {
              const k = acc.accountNumber || acc.id;
              if (k) {
                const prev = mergedAccMap.get(k);
                mergedAccMap.set(k, prev ? pickAuthoritativeAccount(prev, acc, true) : acc);
              }
            });
            const mergedAccounts = Array.from(mergedAccMap.values());

            const sortedTxs = isAdminEmail
              ? []
              : mergeTransactionLists(existing.transactions, incomingTxs);
            const newerWallet =
              incomingUpdated >= (existing.lastUpdated || 0)
                ? incomingWallet
                : Number(existing.walletBalance || 0);
            const mergedState: UserFinancialState = {
              walletBalance: reconcileWalletBalanceWithTransactions(
                newerWallet,
                sortedTxs,
                mergedAccounts
              ),
              accounts: mergedAccounts,
              selectedAccountId:
                existing.selectedAccountId ||
                r.selected_account_id ||
                mergedAccounts[0]?.id ||
                null,
              transactions: sortedTxs,
              lastUpdated: Math.max(existing.lastUpdated || 0, incomingUpdated),
            };
            financesByEmail[canonicalEmail] = mergedState;
          }
        });
      }

      // Also merge any DEPOSIT or ACCOUNT_CREATED records from user_activities so no deposit or live account is ever missed
      if (Array.isArray(actRows)) {
        actRows.forEach((act: any) => {
          if (!act || !act.user_email) return;
          const rawEmail = String(act.user_email).trim().toLowerCase();
          if (!rawEmail.includes('@')) return;
          const canonicalEmail = rawEmail;

          if (!financesByEmail[canonicalEmail]) {
            financesByEmail[canonicalEmail] = {
              walletBalance: 0,
              accounts: [],
              selectedAccountId: null,
              transactions: [],
              lastUpdated: act.created_at ? new Date(act.created_at).getTime() : Date.now(),
            };
          }

          const fin = financesByEmail[canonicalEmail];
          const meta = act.metadata || {};
          const userDeletedSet = getDeletedSetForEmail(canonicalEmail);

          if (
            (act.activity_type === 'DEPOSIT' || act.activity_type === 'DEPOSIT_CRYPTO_PENDING') &&
            !adminEmailsSet.has(canonicalEmail)
          ) {
            const amt = Number(meta.amountUsd ?? meta.amount ?? 0);
            if (amt > 0) {
              const ref = String(
                meta.payheroReference ||
                  meta.reference ||
                  meta.externalReference ||
                  meta.checkoutRequestId ||
                  meta.checkoutId ||
                  meta.id ||
                  `DB-DEP-${String(act.id || '').slice(0, 8).toUpperCase()}`
              ).trim();
              const defaultStatus =
                act.activity_type === 'DEPOSIT_CRYPTO_PENDING' ? 'PENDING' : 'COMPLETED';
              const rawStatus = String(meta.status || defaultStatus).toUpperCase();
              const status: 'COMPLETED' | 'PENDING' | 'FAILED' =
                rawStatus === 'FAILED'
                  ? 'FAILED'
                  : rawStatus === 'PENDING'
                  ? 'PENDING'
                  : 'COMPLETED';
              const targetAcc = String(meta.targetAccount || 'VTM Wallet').trim();
              const actTs = act.created_at ? new Date(act.created_at).getTime() : Date.now();

              const actKeys = [
                meta.id,
                act.id,
                meta.reference,
                meta.payheroReference,
                meta.checkoutRequestId,
                meta.checkoutId,
                meta.externalReference,
                meta.mpesaReceiptNumber,
              ]
                .filter(Boolean)
                .map((k) => String(k).trim());

              const existingIdx = (fin.transactions || []).findIndex((t) => {
                if (t.type !== 'DEPOSIT') return false;
                const tKeys = [
                  t.id,
                  t.reference,
                  t.payheroReference,
                  t.checkoutRequestId,
                  t.externalReference,
                  t.mpesaReceiptNumber,
                ]
                  .filter(Boolean)
                  .map((k) => String(k).trim());
                return actKeys.some((k) => tKeys.includes(k));
              });

              const inferredMethod =
                meta.method ||
                (act.activity_type === 'DEPOSIT_CRYPTO_PENDING' || /crypto/i.test(String(act.description || ''))
                  ? 'Crypto Deposit'
                  : meta.mpesaReceiptNumber ||
                    meta.checkoutRequestId ||
                    meta.checkoutId ||
                    /m-?pesa/i.test(String(act.description || ''))
                  ? 'M-PESA'
                  : 'Instant Deposit');

              const normalizeTarget = (acc?: string) => {
                const c = String(acc || 'VTM Wallet').trim().toLowerCase();
                if (!c || c.includes('wallet')) return 'wallet';
                return c.replace(/^account\s*#?/i, '').trim();
              };

              // Do not synthesize a phantom 'Instant Deposit' (or unverified echo without method/receipt)
              // when fin.transactions already contains a verified deposit of the same amount & target within 10 minutes.
              const isUnverifiedEcho =
                !meta.method ||
                /^Instant Deposit$/i.test(String(inferredMethod)) ||
                (!meta.mpesaReceiptNumber && !meta.checkoutRequestId && !meta.checkoutId && /^[0-9a-f-]{20,}$/i.test(ref));
              const hasNearbyMatchingDeposit =
                existingIdx === -1 &&
                isUnverifiedEcho &&
                (fin.transactions || []).some(
                  (t) =>
                    t.type === 'DEPOSIT' &&
                    t.status === status &&
                    Math.abs(Math.abs(Number(t.amount || 0)) - amt) < 0.01 &&
                    normalizeTarget(t.accountNumber) === normalizeTarget(targetAcc) &&
                    Math.abs(Number(t.timestamp || 0) - actTs) <= 10 * 60 * 1000
                );

              if (hasNearbyMatchingDeposit) {
                return;
              }

              if (existingIdx === -1) {
                fin.transactions = [
                  ...(fin.transactions || []),
                  {
                    id: meta.id || act.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: 'DEPOSIT',
                    method: inferredMethod,
                    amount: amt,
                    currency: 'USD',
                    status,
                    timestamp: actTs,
                    reference: ref,
                    payheroReference: meta.payheroReference || ref,
                    checkoutRequestId: meta.checkoutRequestId || meta.checkoutId || undefined,
                    mpesaReceiptNumber: meta.mpesaReceiptNumber || undefined,
                    externalReference: meta.externalReference || undefined,
                    accountNumber: targetAcc,
                    details:
                      status === 'FAILED'
                        ? meta.details || 'Failed'
                        : meta.details || act.description || `Funded to ${targetAcc}`,
                  },
                ];
              } else if (fin.transactions && fin.transactions[existingIdx]) {
                const prevTx = fin.transactions[existingIdx];
                const nextStatus =
                  prevTx.status === 'PENDING' && (status === 'COMPLETED' || status === 'FAILED')
                    ? status
                    : prevTx.status;
                fin.transactions[existingIdx] = {
                  ...prevTx,
                  method:
                    prevTx.method && !/^Instant Deposit$/i.test(prevTx.method)
                      ? prevTx.method
                      : inferredMethod,
                  payheroReference: prevTx.payheroReference || meta.payheroReference,
                  checkoutRequestId:
                    prevTx.checkoutRequestId || meta.checkoutRequestId || meta.checkoutId,
                  mpesaReceiptNumber: prevTx.mpesaReceiptNumber || meta.mpesaReceiptNumber,
                  externalReference: prevTx.externalReference || meta.externalReference,
                  status: nextStatus,
                  details:
                    nextStatus !== prevTx.status
                      ? meta.details ||
                        prevTx.details ||
                        (nextStatus === 'FAILED' ? 'Failed' : `Funded to ${targetAcc}`)
                      : prevTx.details,
                };
              }
            }
          } else if (
            (act.activity_type === 'ACCOUNT_CREATED' || act.activity_type === 'OPEN_ACCOUNT') &&
            meta.accountNumber &&
            !adminEmailsSet.has(canonicalEmail)
          ) {
            const accNum = String(meta.accountNumber);
            if (!userDeletedSet.has(accNum)) {
              const hasAcc = fin.accounts.some((a) => a.accountNumber === accNum);
              if (!hasAcc) {
                const isDemo = String(meta.type || '').toLowerCase() === 'demo';
                fin.accounts.push({
                  id: `acc-${accNum}`,
                  accountNumber: accNum,
                  server: isDemo ? 'VTMarkets-DemoServer' : 'VTMarkets-LiveServer1',
                  type: isDemo ? 'Demo' : 'Live',
                  tier: meta.tier || 'Premium',
                  balance: isDemo ? 100000 : Number(meta.balance || 0),
                  equity: isDemo ? 100000 : Number(meta.balance || 0),
                  margin: 0,
                  freeMargin: isDemo ? 100000 : Number(meta.balance || 0),
                  marginLevel: 0,
                  currency: meta.currency || 'USD',
                  leverage: meta.leverage || '1:500',
                  createdAt: act.created_at ? new Date(act.created_at).getTime() : Date.now(),
                });
              }
            }
          }
        });
      }

      // Ensure each user's transactions are deduplicated and walletBalance is reconciled cleanly
      Object.values(financesByEmail).forEach((f) => {
        if (f) {
          f.transactions = sanitizeRealTransactions(f.transactions);
          f.walletBalance = reconcileWalletBalanceWithTransactions(
            Number(f.walletBalance || 0),
            f.transactions,
            f.accounts
          );
        }
      });

      const usersMap = new Map<string, UserAuthProfile>();

      if (Array.isArray(usersRows)) {
        usersRows.forEach((row: any) => {
          if (!row || !row.email) return;
          const canonicalEmail = row.email.trim().toLowerCase();
          let resolvedUid = row.uid || uidByEmail[canonicalEmail] || '';

          if (!this.isValidUuid(resolvedUid)) {
            resolvedUid = this.deterministicUuidFromEmail(canonicalEmail);
          }

          const safeRole =
            row.role === 'admin'
              ? 'admin'
              : row.role === 'marketer'
              ? 'marketer'
              : 'normal';

          const resolvedRefCode =
            row.referred_by_code || referredByEmail[canonicalEmail] || undefined;

          const rowCreatedAt = row.created_at
            ? new Date(row.created_at).getTime()
            : signupTimeByEmail[canonicalEmail] || Date.now();

          usersMap.set(canonicalEmail, {
            id: resolvedUid,
            name: row.name || nameByEmail[canonicalEmail] || 'Trader',
            email: canonicalEmail,
            phoneNumber: row.phone_number || '',
            phone: row.phone_number || '',
            countryCode: row.country_code || '+1',
            countryName: row.country_name || 'United States',
            accountNumber: row.account_number || '27330648',
            role: safeRole,
            isLoggedIn: false,
            createdAt: rowCreatedAt,
            referredByCode: resolvedRefCode,
          });
        });
      }

      // Also include any user who has a row in vtm_user_finances even if missing from vtm_registered_users
      Object.keys(financesByEmail).forEach((em) => {
        if (!em || !em.includes('@')) return;
        const canonicalEmail = em.trim().toLowerCase();
        if (!usersMap.has(canonicalEmail)) {
          const resolvedUid =
            uidByEmail[canonicalEmail] || this.deterministicUuidFromEmail(canonicalEmail);
          const fin = financesByEmail[canonicalEmail];
          const firstAccNum =
            fin?.accounts?.find((a) => a.type === 'Live')?.accountNumber ||
            fin?.accounts?.[0]?.accountNumber ||
            String(Math.floor(10000000 + Math.random() * 90000000));
          usersMap.set(canonicalEmail, {
            id: resolvedUid,
            name: nameByEmail[canonicalEmail] || canonicalEmail.split('@')[0],
            email: canonicalEmail,
            phoneNumber: '',
            phone: '',
            countryCode: '+1',
            countryName: 'United States',
            accountNumber: firstAccNum,
            role: adminEmailsSet.has(canonicalEmail) ? 'admin' : 'normal',
            isLoggedIn: false,
            createdAt: signupTimeByEmail[canonicalEmail] || fin?.lastUpdated || Date.now(),
            referredByCode: referredByEmail[canonicalEmail] || undefined,
          });
        }
      });

      // Only fall back to Server Platform DB or Local Registry if Supabase returned no rows (e.g. offline/quota)
      if (!hasCloudData) {
        try {
          const srvRes = await fetch('/api/platform-db', {
            method: 'GET',
            headers: this.getAuthHeaders(),
            signal: AbortSignal.timeout(4000),
          });
          if (srvRes.ok) {
            const srvData = await srvRes.json();
            if (srvData?.ok) {
              if (Array.isArray(srvData.users)) {
                srvData.users.forEach((u: any) => {
                  if (!u || !u.email) return;
                  const canonicalEmail = String(u.email).trim().toLowerCase();
                  const existing = usersMap.get(canonicalEmail);
                  const resolvedUid = this.isValidUuid(existing?.id)
                    ? existing!.id
                    : this.isValidUuid(u.id)
                    ? u.id
                    : this.deterministicUuidFromEmail(canonicalEmail);
                  usersMap.set(canonicalEmail, {
                    ...(existing || {}),
                    ...u,
                    id: resolvedUid,
                    email: canonicalEmail,
                    name: existing?.name || u.name || canonicalEmail.split('@')[0],
                    role:
                      existing?.role === 'admin' || u.role === 'admin'
                        ? 'admin'
                        : existing?.role === 'marketer' || u.role === 'marketer'
                        ? 'marketer'
                        : 'normal',
                    referredByCode: existing?.referredByCode || u.referredByCode,
                  });
                });
              }
              if (srvData.financesByEmail && typeof srvData.financesByEmail === 'object') {
                Object.entries(srvData.financesByEmail).forEach(([em, srvFin]: [string, any]) => {
                  const canonicalEmail = em.trim().toLowerCase();
                  if (!financesByEmail[canonicalEmail]) {
                    financesByEmail[canonicalEmail] = srvFin;
                  }
                });
              }
            }
          }
        } catch {
          // ignore
        }

        try {
          const localUsers = getAllRegisteredUsers();
          localUsers.forEach((lu) => {
            if (!lu || !lu.email) return;
            const canonicalEmail = lu.email.trim().toLowerCase();
            if (!usersMap.has(canonicalEmail)) {
              usersMap.set(canonicalEmail, {
                ...lu,
                id: this.isValidUuid(lu.id)
                  ? lu.id
                  : this.deterministicUuidFromEmail(canonicalEmail),
                email: canonicalEmail,
                role:
                  lu.role === 'admin'
                    ? 'admin'
                    : lu.role === 'marketer'
                    ? 'marketer'
                    : 'normal',
              });
            }
            const localFin = loadUserFinancials(lu);
            if (localFin && !financesByEmail[canonicalEmail]) {
              financesByEmail[canonicalEmail] = localFin;
            }
          });
        } catch {
          // ignore
        }
      }

      const sortedUsers = Array.from(usersMap.values()).sort((a, b) => {
        const tsA = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tsB = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (Number.isFinite(tsB) ? tsB : 0) - (Number.isFinite(tsA) ? tsA : 0);
      });

      let openTradesByEmail: Record<string, AdminUserOpenTradeCounts> | undefined;
      if (cloudStatesFetchedOk && Array.isArray(cloudStateRows)) {
        const groupedByEmail: Record<string, { tradesData?: any; botsData?: any }> = {};
        cloudStateRows.forEach((row: any) => {
          if (!row || !row.user_email || !row.data) return;
          const canonicalEmail = String(row.user_email).trim().toLowerCase();
          if (!groupedByEmail[canonicalEmail]) {
            groupedByEmail[canonicalEmail] = {};
          }
          if (row.state_key === 'STATE_TRADES') {
            const prev = groupedByEmail[canonicalEmail].tradesData;
            if (!prev) {
              groupedByEmail[canonicalEmail].tradesData = row.data;
            } else {
              groupedByEmail[canonicalEmail].tradesData = {
                ...prev,
                positions: [
                  ...(Array.isArray(prev.positions) ? prev.positions : []),
                  ...(Array.isArray(row.data.positions) ? row.data.positions : []),
                ],
                closedTrades: [
                  ...(Array.isArray(prev.closedTrades) ? prev.closedTrades : []),
                  ...(Array.isArray(row.data.closedTrades) ? row.data.closedTrades : []),
                ],
              };
            }
          } else if (row.state_key === 'STATE_BOTS') {
            const prev = groupedByEmail[canonicalEmail].botsData;
            if (!prev) {
              groupedByEmail[canonicalEmail].botsData = row.data;
            } else {
              groupedByEmail[canonicalEmail].botsData = {
                ...prev,
                botTrades: [
                  ...(Array.isArray(prev.botTrades) ? prev.botTrades : []),
                  ...(Array.isArray(row.data.botTrades) ? row.data.botTrades : []),
                ],
                deletedBotIds: Array.from(
                  new Set([
                    ...(Array.isArray(prev.deletedBotIds) ? prev.deletedBotIds : []),
                    ...(Array.isArray(row.data.deletedBotIds) ? row.data.deletedBotIds : []),
                  ])
                ),
                deletedBotMap: {
                  ...(prev.deletedBotMap || {}),
                  ...(row.data.deletedBotMap || {}),
                },
              };
            }
          }
        });

        openTradesByEmail = {};
        Object.entries(groupedByEmail).forEach(([em, entry]) => {
          openTradesByEmail![em] = extractOpenTradeCountsFromCloudPayloads(
            entry.tradesData,
            entry.botsData
          );
        });
      }

      return {
        users: sortedUsers,
        financesByEmail,
        openTradesByEmail,
      };
    } catch (e) {
      console.warn('Failed to fetch all platform users and finances from Supabase', e);
      return null;
    }
  }

  public async bulkImportUsers(users: any[]): Promise<{ ok: boolean; count: number; totalUsers: number }> {
    try {
      const res = await fetch('/api/platform-db', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'bulk_upsert_users', users }),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, count: data.count || users.length, totalUsers: data.totalUsers || users.length };
      }
    } catch (e) {
      console.warn('Failed to post bulk users to /api/platform-db:', e);
    }
    return { ok: false, count: 0, totalUsers: 0 };
  }

  public async searchUserByQuery(query: string): Promise<UserAuthProfile | null> {
    if (!query || query.trim().length < 2) return null;
    const clean = query.trim().toLowerCase();

    if (this.config && this.getSessionToken()) {
      try {
        const [usersRes, finRes] = await Promise.all([
          this.proxyRest(
            `vtm_registered_users?or=(email.ilike.*${encodeURIComponent(
              clean
            )}*,name.ilike.*${encodeURIComponent(clean)}*)&select=*&limit=10`,
            { method: 'GET' },
            4500
          ).catch(() => null),
          this.proxyRest(
            `vtm_user_finances?or=(user_email.ilike.*${encodeURIComponent(
              clean
            )}*,user_name.ilike.*${encodeURIComponent(clean)}*)&select=user_email,user_key,user_name,wallet_balance,accounts,transactions,selected_account_id,last_updated&limit=10`,
            { method: 'GET' },
            4500
          ).catch(() => null),
        ]);

        this.checkResponseQuota(usersRes);
        this.checkResponseQuota(finRes);

        if (usersRes && usersRes.ok) {
          const rows = await usersRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const r = rows[0];
            const rawEmail = String(r.email || '').trim().toLowerCase();
            if (rawEmail) {
              const resolvedUid = this.isValidUuid(r.uid)
                ? r.uid
                : this.deterministicUuidFromEmail(rawEmail);
              return {
                id: resolvedUid,
                name: r.name || rawEmail.split('@')[0],
                email: rawEmail,
                phoneNumber: r.phone_number || '',
                phone: r.phone_number || '',
                countryCode: r.country_code || '+254',
                countryName: r.country_name || 'Kenya',
                accountNumber: r.account_number || '27330648',
                role: r.role === 'admin' ? 'admin' : r.role === 'marketer' ? 'marketer' : 'normal',
                isLoggedIn: true,
                createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                referredByCode: r.referred_by_code || undefined,
              };
            }
          }
        }

        if (finRes && finRes.ok) {
          const finRows = await finRes.json();
          if (Array.isArray(finRows) && finRows.length > 0) {
            const r = finRows[0];
            const rawEmail = String(r.user_email || '').trim().toLowerCase();
            if (rawEmail && rawEmail.includes('@')) {
              const resolvedUid = this.isValidUuid(r.user_key)
                ? r.user_key
                : this.deterministicUuidFromEmail(rawEmail);
              const firstAccNum =
                (Array.isArray(r.accounts) && r.accounts[0]?.accountNumber) || '8492014';
              return {
                id: resolvedUid,
                name: r.user_name || rawEmail.split('@')[0],
                email: rawEmail,
                phoneNumber: '',
                phone: '',
                countryCode: '+254',
                countryName: 'Kenya',
                accountNumber: String(firstAccNum),
                role: 'normal',
                isLoggedIn: true,
                createdAt: r.last_updated ? new Date(r.last_updated).getTime() : Date.now(),
              };
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.getSessionToken()) {
      try {
        const srvRes = await fetch('/api/platform-db', {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(3000),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData?.ok && Array.isArray(srvData.users)) {
            const match = srvData.users.find(
              (u: any) =>
                u &&
                ((u.email && String(u.email).toLowerCase().includes(clean)) ||
                  (u.name && String(u.name).toLowerCase().includes(clean)))
            );
            if (match && match.email) {
              return match as UserAuthProfile;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  public async signUpWithSupabaseAuth(
    profile: UserAuthProfile,
    password: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!profile.email) {
      return { success: false, error: 'Database is not configured.' };
    }
    const res = await this.registerWithServer(profile, password);
    if (!res.ok) {
      return { success: false, error: res.error || 'Failed. Please try again later.' };
    }
    return { success: true, data: { user: res.profile } };
  }

  public async signInWithSupabaseAuth(
    email: string,
    password: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!email) {
      return { success: false, error: 'Failed. Please try again later.' };
    }
    const res = await this.authenticateWithServer(email, password);
    if (!res.ok) {
      return { success: false, error: res.error || 'Invalid email or password. Please try again.' };
    }
    return { success: true, data: { user: res.profile } };
  }

  private async saveCloudStateRecord(
    userEmail: string,
    stateType: string,
    description: string,
    metadata: any
  ): Promise<boolean> {
    if (!this.config || !userEmail) return false;
    const cleanEmail = userEmail.trim().toLowerCase();

    let compactMeta = metadata;
    if (metadata && typeof metadata === 'object') {
      compactMeta = { ...metadata };
      if (Array.isArray(compactMeta.closedTrades) && compactMeta.closedTrades.length > 200) {
        compactMeta.closedTrades = compactMeta.closedTrades.slice(0, 200);
      }
      if (Array.isArray(compactMeta.botTrades)) {
        const openT = compactMeta.botTrades.filter((t: any) => t.status === 'OPEN');
        const closedT = compactMeta.botTrades
          .filter((t: any) => t.status === 'CLOSED')
          .sort((a: any, b: any) => (b.closeTime || b.openTime || 0) - (a.closeTime || a.openTime || 0))
          .slice(0, 200);
        compactMeta.botTrades = [...openT, ...closedT];
      }
      if (Array.isArray(compactMeta.notifications) && compactMeta.notifications.length > 30) {
        compactMeta.notifications = compactMeta.notifications.slice(0, 30);
      }
      if (Array.isArray(compactMeta.entries) && compactMeta.entries.length > 50) {
        compactMeta.entries = compactMeta.entries.slice(0, 50);
      }
    }

    try {
      localStorage.setItem(`vtm_cloud_state_${cleanEmail}_${stateType}`, JSON.stringify(compactMeta));
    } catch {}

    if (!this.getSessionToken()) {
      return true;
    }

    fetch('/api/platform-db', {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'upsert_cloud_state',
        email: cleanEmail,
        stateKey: stateType,
        data: compactMeta,
      }),
    }).catch(() => {});

    if (this.isQuotaRestricted()) {
      return true;
    }

    try {
      const upsertRes = await this.proxyRest(
        `vtm_cloud_states?on_conflict=user_email,state_key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            user_email: cleanEmail,
            state_key: stateType,
            data: compactMeta,
            updated_at: new Date().toISOString(),
          }),
        },
        5500
      );

      if (this.checkResponseQuota(upsertRes)) return true;
      if (upsertRes.ok) {
        return true;
      }

      const getRes = await this.proxyRest(
        `user_activities?user_email=ilike.${encodeURIComponent(
          cleanEmail
        )}&activity_type=eq.${encodeURIComponent(stateType)}&select=id&order=created_at.desc&limit=20`,
        { method: 'GET' },
        5500
      );

      if (this.checkResponseQuota(getRes)) return true;

      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
          const patchRes = await this.proxyRest(
            `user_activities?id=eq.${encodeURIComponent(rows[0].id)}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify({
                description,
                metadata,
                created_at: new Date().toISOString(),
              }),
            },
            5500
          );
          if (this.checkResponseQuota(patchRes)) return true;
          if (patchRes.ok) {
            return true;
          }
        }
      }

      const postRes = await this.proxyRest(
        `user_activities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: cleanEmail,
            activity_type: stateType,
            description,
            device_id: typeof navigator !== 'undefined' ? `${navigator.platform || 'web'}` : 'web',
            metadata,
            created_at: new Date().toISOString(),
          }),
        },
        5500
      );

      this.checkResponseQuota(postRes);
      return true;
    } catch (e) {
      console.warn(`Supabase cloud state save (${stateType}) notice:`, e);
      return true;
    }
  }

  private async fetchCloudStateRecord<T = any>(
    userEmail: string,
    stateType: string
  ): Promise<T | null> {
    if (!this.config || !userEmail) return null;
    const cleanEmail = userEmail.trim().toLowerCase();

    if (this.getSessionToken() && !this.isQuotaRestricted()) {
      try {
        const cloudRes = await this.proxyRest(
          `vtm_cloud_states?user_email=ilike.${encodeURIComponent(
            cleanEmail
          )}&state_key=eq.${encodeURIComponent(stateType)}&select=data&order=updated_at.desc&limit=1`,
          { method: 'GET' },
          5500
        );

        this.checkResponseQuota(cloudRes);

        if (cloudRes.ok) {
          const cloudRows = await cloudRes.json();
          if (Array.isArray(cloudRows) && cloudRows.length > 0 && cloudRows[0].data) {
            return cloudRows[0].data as T;
          }
        }

        if (!this.isQuotaRestricted()) {
          const res = await this.proxyRest(
            `user_activities?user_email=ilike.${encodeURIComponent(
              cleanEmail
            )}&activity_type=eq.${encodeURIComponent(stateType)}&select=metadata&order=created_at.desc&limit=1`,
            { method: 'GET' },
            5500
          );

          this.checkResponseQuota(res);

          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0 && rows[0].metadata) {
              return rows[0].metadata as T;
            }
          }
        }
      } catch (e) {
        console.warn(`Supabase cloud state fetch (${stateType}) notice:`, e);
      }
    }

    if (this.getSessionToken()) {
      try {
        const srvRes = await fetch(
          `/api/platform-db?email=${encodeURIComponent(cleanEmail)}&stateKey=${encodeURIComponent(stateType)}`,
          { method: 'GET', headers: this.getAuthHeaders(), signal: AbortSignal.timeout(3000) }
        );
        if (srvRes.ok) {
          const srvJson = await srvRes.json();
          if (srvJson?.ok && srvJson.data) {
            return srvJson.data as T;
          }
        }
      } catch {}
    }

    try {
      const localRaw = localStorage.getItem(`vtm_cloud_state_${cleanEmail}_${stateType}`);
      if (localRaw) {
        return JSON.parse(localRaw) as T;
      }
    } catch {}

    return null;
  }

  public async saveUserKycRecord(userEmail: string, kycRecord: any): Promise<boolean> {
    if (!userEmail) return false;
    return this.saveCloudStateRecord(
      userEmail,
      'STATE_KYC',
      'User personal profile & KYC verification record',
      kycRecord
    );
  }

  public async fetchUserKycRecord<T = any>(userEmail: string): Promise<T | null> {
    if (!userEmail) return null;
    return this.fetchCloudStateRecord<T>(userEmail, 'STATE_KYC');
  }

  // =========================================================================
  // 2. TRADING ACCOUNTS (Backed directly by vtm_user_finances in Supabase)
  // =========================================================================

  public async syncTradingAccount(
    user: UserAuthProfile | null | undefined,
    account: TradingAccount
  ): Promise<boolean> {
    if (!this.config || !user || !account) return false;
    try {
      const currentFin = await this.fetchUserFinancials(user);
      const localFin = loadUserFinancials(user);
      const existingAccounts = currentFin?.accounts || [];
      const exists = existingAccounts.some((a) => a.id === account.id || a.accountNumber === account.accountNumber);
      const nextAccounts = exists
        ? existingAccounts.map((a) =>
            a.id === account.id || a.accountNumber === account.accountNumber ? account : a
          )
        : [...existingAccounts, account];

      const mergedTxs = currentFin?.transactions || localFin?.transactions || [];
      const baseWal = localFin?.walletBalance ?? currentFin?.walletBalance ?? 0;
      const safeWallet = reconcileWalletBalanceWithTransactions(baseWal, mergedTxs);

      return await this.syncUserFinancials(user, {
        walletBalance: safeWallet,
        accounts: nextAccounts,
        selectedAccountId: currentFin?.selectedAccountId || account.id,
        transactions: mergedTxs,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      console.warn('Could not sync trading account to Supabase:', e);
      return false;
    }
  }

  public async syncTradingAccounts(
    user: UserAuthProfile | null | undefined,
    accounts: TradingAccount[],
    selectedAccountId?: string | null
  ): Promise<boolean> {
    if (!this.config || !user || !accounts) return false;
    try {
      const currentFin = await this.fetchUserFinancials(user);
      const localFin = loadUserFinancials(user);
      let localSelId: string | null = selectedAccountId || null;
      if (!localSelId && user.email) {
        try {
          localSelId = localStorage.getItem(`vtm_selected_account_${user.email.trim().toLowerCase()}`);
        } catch {
          // ignore
        }
      }
      const baseWal =
        localFin && typeof localFin.walletBalance === 'number'
          ? localFin.walletBalance
          : currentFin?.walletBalance || 0;
      const mergedTxs = currentFin?.transactions || localFin?.transactions || [];
      const safeWallet = reconcileWalletBalanceWithTransactions(baseWal, mergedTxs, accounts);
      return await this.syncUserFinancials(user, {
        walletBalance: safeWallet,
        accounts,
        selectedAccountId: localSelId || currentFin?.selectedAccountId || accounts[0]?.id || null,
        transactions: mergedTxs,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to bulk sync trading accounts to Supabase:', e);
      return false;
    }
  }

  public async fetchTradingAccounts(
    user: UserAuthProfile | null | undefined
  ): Promise<TradingAccount[] | null> {
    if (!this.config || !user?.email) return null;
    const fin = await this.fetchUserFinancials(user);
    return fin?.accounts || null;
  }

  public async deleteTradingAccountFromDatabase(
    user: UserAuthProfile | null | undefined,
    accountNumber: string,
    isSilentCleanup = false
  ): Promise<boolean> {
    if (!this.config || !user || !accountNumber) return false;
    const cleanEmail = (user.email || '').trim().toLowerCase();

    markAccountDeletedLocally(cleanEmail, accountNumber);

    try {
      // Remove any old ACCOUNT_CREATED / OPEN_ACCOUNT activity rows for this accountNumber to save DB space and prevent resurrection
      if (cleanEmail && this.getSessionToken()) {
        await this.proxyRest(
          `user_activities?user_email=eq.${encodeURIComponent(
            cleanEmail
          )}&activity_type=in.(ACCOUNT_CREATED,OPEN_ACCOUNT)&description=ilike.*${encodeURIComponent(
            accountNumber
          )}*`,
          { method: 'DELETE' },
          4000
        ).catch(() => {});
      }

      // Record tombstone activity in user_activities
      await this.syncActivity(user, {
        type: 'ACCOUNT_DELETED',
        description: isSilentCleanup
          ? `Archived idle Live Account #${accountNumber}`
          : `Deleted Trading Account #${accountNumber}`,
        metadata: {
          accountNumber,
          silent: isSilentCleanup,
          deletedAt: Date.now(),
        },
      });
      return true;
    } catch (e) {
      console.warn('Could not delete trading account from database:', e);
      return false;
    }
  }

  // =========================================================================
  // 3. TRADES, POSITIONS, BOTS & ALERTS (Backed by user_activities JSONB)
  // =========================================================================

  public async saveTrade(
    user: UserAuthProfile | null | undefined,
    trade: {
      id: string;
      ticket: number;
      accountNumber?: string;
      symbol: string;
      side: 'BUY' | 'SELL';
      orderType?: string;
      lots: number;
      openPrice: number;
      currentPrice?: number;
      closePrice?: number;
      sl: number | null;
      tp: number | null;
      pnl?: number;
      status: 'OPEN' | 'CLOSED' | 'PENDING' | 'CANCELLED';
      openTime: number;
      closeTime?: number;
      closeReason?: string;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.syncActivity(user, {
      type: `TRADE_${trade.status}`,
      description: `${trade.side} ${trade.lots} ${trade.symbol} @ ${trade.openPrice} (${trade.status})`,
      metadata: trade,
    });
  }

  public async syncTrades(
    user: UserAuthProfile | null | undefined,
    data: {
      positions: Position[];
      pendingOrders: PendingOrder[];
      closedTrades: ClosedTrade[];
      accountNumber?: string;
      updatedAt?: number;
      lastUpdated?: string;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;

    const cleanEmail = user.email.trim().toLowerCase();

    const nowMs = Date.now();
    const incomingMs = data.updatedAt || (data.lastUpdated ? new Date(data.lastUpdated).getTime() : nowMs);
    const nowIso = new Date(nowMs).toISOString();

    let mergedClosed = Array.isArray(data.closedTrades) ? [...data.closedTrades] : [];
    let mergedPositions = Array.isArray(data.positions) ? [...data.positions] : [];
    let mergedPending = Array.isArray(data.pendingOrders) ? [...data.pendingOrders] : [];
    let cloudUpdatedAtMs = 0;

    try {
      const existing = await this.fetchCloudStateRecord<{
        positions?: Position[];
        pendingOrders?: PendingOrder[];
        closedTrades?: ClosedTrade[];
        updatedAt?: number;
        lastUpdated?: string;
      }>(cleanEmail, 'STATE_TRADES');

      if (existing) {
        cloudUpdatedAtMs =
          existing.updatedAt ||
          (existing.lastUpdated ? new Date(existing.lastUpdated).getTime() : 0);
        const isCloudNewer = cloudUpdatedAtMs > incomingMs + 1000;

        // Always preserve all closed trades across all devices
        if (Array.isArray(existing.closedTrades) && existing.closedTrades.length > 0) {
          const seenKeys = new Set(
            mergedClosed.flatMap((t) => [
              String(t.id || ''),
              String(t.ticket || ''),
              `${t.ticket}-${t.openTime}`,
            ])
          );
          for (const oldTrade of existing.closedTrades) {
            if (!oldTrade) continue;
            const idKey = String(oldTrade.id || '');
            const ticketKey = String(oldTrade.ticket || '');
            const compositeKey = `${oldTrade.ticket}-${oldTrade.openTime}`;
            if (
              (idKey && seenKeys.has(idKey)) ||
              (ticketKey && seenKeys.has(ticketKey)) ||
              seenKeys.has(compositeKey)
            ) {
              continue;
            }
            if (idKey) seenKeys.add(idKey);
            if (ticketKey) seenKeys.add(ticketKey);
            seenKeys.add(compositeKey);
            mergedClosed.push(oldTrade);
          }
        }

        // Never allow a background sync to drop an open position that has not been closed
        const closedIdsAndTickets = new Set(
          mergedClosed.flatMap((t) => [String(t.id || ''), String(t.ticket || '')]).filter(Boolean)
        );
        if (Array.isArray(existing.positions) && existing.positions.length > 0) {
          const posIds = new Set(mergedPositions.map((p) => String(p.id || '')));
          const posTickets = new Set(mergedPositions.map((p) => String(p.ticket || '')).filter(Boolean));
          for (const p of existing.positions) {
            if (!p || !p.id) continue;
            const pid = String(p.id);
            const pticket = String(p.ticket || '');
            if (closedIdsAndTickets.has(pid) || (pticket && closedIdsAndTickets.has(pticket))) {
              continue;
            }
            if (!posIds.has(pid) && (!pticket || !posTickets.has(pticket))) {
              posIds.add(pid);
              if (pticket) posTickets.add(pticket);
              mergedPositions.push(p);
            }
          }
        }

        if (isCloudNewer && Array.isArray(existing.pendingOrders)) {
          const ordIds = new Set(mergedPending.map((o) => o.id));
          for (const o of existing.pendingOrders) {
            if (o && o.id && !ordIds.has(o.id)) {
              ordIds.add(o.id);
              mergedPending.push(o);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    mergedClosed.sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));
    const latestClosed = mergedClosed.slice(0, 200);

    // Atomic UPSERT into public.closed_trades using on_conflict=id (skipping if legacy FK parent tables profiles/trading_accounts are unpopulated)
    try {
      if (latestClosed.length > 0 && this.closedTradesLegacyFkBlocked !== true) {
        let shouldWriteClosedTrades = this.closedTradesLegacyFkBlocked === false;
        let legacyUserId: string | null = null;
        let legacyAccountId: string | null = null;

        if (this.closedTradesLegacyFkBlocked === null && this.getSessionToken()) {
          try {
            const schemaProbe = await this.proxyRest(
              `closed_trades?select=user_id,trading_account_id&limit=0`,
              { method: 'GET' },
              3500
            );
            if (schemaProbe.status === 400) {
              this.closedTradesLegacyFkBlocked = false;
              shouldWriteClosedTrades = true;
            } else if (schemaProbe.ok) {
              const [profRes, acctRes] = await Promise.all([
                this.proxyRest(`profiles?select=id&limit=1`, { method: 'GET' }, 3500),
                this.proxyRest(`trading_accounts?select=id&limit=1`, { method: 'GET' }, 3500),
              ]);
              const profRows = profRes.ok ? await profRes.json().catch(() => []) : [];
              const acctRows = acctRes.ok ? await acctRes.json().catch(() => []) : [];
              if (
                Array.isArray(profRows) &&
                profRows.length > 0 &&
                profRows[0]?.id &&
                Array.isArray(acctRows) &&
                acctRows.length > 0 &&
                acctRows[0]?.id
              ) {
                legacyUserId = String(profRows[0].id);
                legacyAccountId = String(acctRows[0].id);
                shouldWriteClosedTrades = true;
              } else {
                this.closedTradesLegacyFkBlocked = true;
                shouldWriteClosedTrades = false;
              }
            }
          } catch {
            shouldWriteClosedTrades = false;
          }
        }

        if (shouldWriteClosedTrades && this.getSessionToken()) {
          const dedupedRows = new Map<string, any>();
          for (const t of latestClosed.slice(0, 50)) {
            const rawId = String(t.id || `ct-${t.ticket}-${t.closeTime || Date.now()}`);
            const dbId = this.toUuidForDb(rawId, 'ct');
            const rowObj: Record<string, any> = {
              id: dbId,
              user_email: cleanEmail,
              ticket: this.toBigIntTicket(t.ticket, rawId),
              account_number: t.accountNumber || data.accountNumber || user.accountNumber || '',
              symbol: t.symbol,
              side: t.side === 'SELL' ? 'SELL' : 'BUY',
              lots: Number(t.lots || 0.01),
              open_price: Number(t.openPrice || 0),
              close_price: Number(t.closePrice ?? t.openPrice ?? 0),
              pnl: Number(t.pnl || 0),
              open_time: this.toIsoTimestamp(t.openTime),
              close_time: this.toIsoTimestamp(t.closeTime),
              reason: t.reason || 'MANUAL',
            };
            if (legacyUserId && legacyAccountId) {
              rowObj.user_id = legacyUserId;
              rowObj.trading_account_id = legacyAccountId;
            }
            dedupedRows.set(dbId, rowObj);
          }
          const rows = Array.from(dedupedRows.values());
          await this.proxyRest(
            `closed_trades?on_conflict=id`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal',
              },
              body: JSON.stringify(rows),
            },
            5500
          ).catch(() => {});
        }
      }
    } catch {
      // ignore
    }

    const winningTimestamp = Math.max(nowMs, cloudUpdatedAtMs);
    const winningIso = new Date(winningTimestamp).toISOString();

    // Persist atomically to vtm_cloud_states (STATE_TRADES) via POST with resolution=merge-duplicates
    return await this.saveCloudStateRecord(
      cleanEmail,
      'STATE_TRADES',
      `Synchronized ${mergedPositions.length} open positions, ${mergedPending.length} pending orders, ${latestClosed.length} closed trades`,
      {
        positions: mergedPositions,
        pendingOrders: mergedPending,
        closedTrades: latestClosed,
        accountNumber: data.accountNumber || user.accountNumber || '',
        updatedAt: winningTimestamp,
        lastUpdated: winningIso,
      }
    );
  }

  public async fetchUserTrades(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    positions: Position[];
    pendingOrders: PendingOrder[];
    closedTrades: ClosedTrade[];
  } | null> {
    if (!this.config || !user?.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();

    const data = await this.fetchCloudStateRecord<{
      positions?: Position[];
      pendingOrders?: PendingOrder[];
      closedTrades?: ClosedTrade[];
    }>(cleanEmail, 'STATE_TRADES');

      const closedMap = new Map<string, ClosedTrade>();
      if (data && Array.isArray(data.closedTrades)) {
        for (const ct of data.closedTrades) {
          if (ct && ct.symbol) {
            const key = String(ct.ticket || ct.id);
            const lots = Number(ct.lots || 0.01);
            const openPrice = Number(ct.openPrice || 0);
            const closePrice = Number(ct.closePrice ?? openPrice);
            const side: 'BUY' | 'SELL' = ct.side === 'SELL' ? 'SELL' : 'BUY';
            const computedPnl = calculateBotPnL(ct.symbol, side, openPrice, closePrice, lots);
            const exactPnl =
              typeof ct.pnl === 'number' && Number.isFinite(ct.pnl) && ct.pnl !== 0
                ? Number(ct.pnl.toFixed(2))
                : computedPnl;
            closedMap.set(key, {
              ...ct,
              side,
              lots,
              openPrice,
              closePrice,
              sl: ct.sl ?? null,
              tp: ct.tp ?? null,
              pnl: exactPnl,
              accountId: ct.accountId || (ct as any).account_id,
              accountNumber: ct.accountNumber || (ct as any).account_number,
            });
          }
        }
      }

      // Also query STATE_BOTS for any closed bot trades so bot history is never missed
      try {
        const botData = await this.fetchCloudStateRecord<{
          botTrades?: any[];
        }>(cleanEmail, 'STATE_BOTS');
        if (botData && Array.isArray(botData.botTrades)) {
          for (const bt of botData.botTrades) {
            if (bt && bt.status === 'CLOSED' && bt.symbol) {
              const key = String(bt.ticket || bt.id);
              if (!closedMap.has(key)) {
                const lots = Number(bt.lotSize || bt.lots || 0.01);
                const openPrice = Number(bt.openPrice || 0);
                const closePrice = Number(bt.closePrice ?? bt.exitPrice ?? openPrice);
                const side: 'BUY' | 'SELL' = bt.side === 'SELL' ? 'SELL' : 'BUY';
                const exactPnl = calculateBotPnL(bt.symbol, side, openPrice, closePrice, lots);
                closedMap.set(key, {
                  id: `cl-bot-${bt.id}`,
                  ticket: Number(bt.ticket || Math.floor(700000 + Math.random() * 99999)),
                  symbol: bt.symbol,
                  side,
                  lots,
                  openPrice,
                  closePrice,
                  pnl: exactPnl,
                  openTime: Number(bt.openTime || Date.now() - 60000),
                  closeTime: Number(bt.closeTime || Date.now()),
                  reason: bt.closeReason === 'TAKE_PROFIT' || bt.exitReason === 'TP' ? 'TP' : bt.closeReason === 'STOP_LOSS' || bt.exitReason === 'SL' ? 'SL' : 'MANUAL',
                  accountId: bt.accountId,
                  accountNumber: bt.accountNumber,
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }

      if (this.getSessionToken()) {
        try {
          const res = await this.proxyRest(
            `user_activities?user_email=ilike.${encodeURIComponent(cleanEmail)}&activity_type=eq.TRADE_CLOSED&select=metadata,created_at&order=created_at.desc&limit=150`,
            { method: 'GET' },
            5000
          );
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows)) {
              for (const row of rows) {
                const m = row?.metadata;
                if (m && m.symbol && (m.closePrice !== undefined || m.openPrice !== undefined)) {
                  const key = String(m.ticket || m.id || row.created_at);
                  if (!closedMap.has(key) && m.openPrice !== undefined) {
                    const side: 'BUY' | 'SELL' = m.side === 'SELL' ? 'SELL' : 'BUY';
                    const lots = Number(m.lots || 0.01);
                    const openPrice = Number(m.openPrice);
                    const closePrice = Number(m.closePrice ?? m.currentPrice ?? m.openPrice);
                    const computedPnl = calculateBotPnL(m.symbol, side, openPrice, closePrice, lots);
                    const exactPnl =
                      typeof m.pnl === 'number' && Number.isFinite(m.pnl) && m.pnl !== 0
                        ? Number(m.pnl.toFixed(2))
                        : computedPnl;
                    const isBot = m.orderType === 'BOT' || String(m.id || '').startsWith('cl-bot-');
                    closedMap.set(key, {
                      id: m.id || (isBot ? `cl-bot-${key}` : `cl-${key}`),
                      ticket: Number(m.ticket || Math.floor(700000 + Math.random() * 99999)),
                      symbol: m.symbol,
                      side,
                      lots,
                      openPrice,
                      closePrice,
                      sl: m.sl ?? null,
                      tp: m.tp ?? null,
                      pnl: exactPnl,
                      openTime: Number(m.openTime || (row.created_at ? new Date(row.created_at).getTime() - 60000 : Date.now())),
                      closeTime: Number(m.closeTime || (row.created_at ? new Date(row.created_at).getTime() : Date.now())),
                      reason: m.closeReason === 'TP' || m.reason === 'TP' ? 'TP' : m.closeReason === 'SL' || m.reason === 'SL' ? 'SL' : 'MANUAL',
                      accountId: m.accountId || m.account_id,
                      accountNumber: m.accountNumber || m.account_number,
                    });
                  }
                }
              }
            }
          }
        } catch {
          // ignore
        }

        try {
          const ctRes = await this.proxyRest(
            `closed_trades?user_email=ilike.${encodeURIComponent(cleanEmail)}&order=close_time.desc&limit=200`,
            { method: 'GET' },
            5000
          );
        if (ctRes.ok) {
          const ctRows = await ctRes.json();
          if (Array.isArray(ctRows)) {
            for (const row of ctRows) {
              const key = String(row.ticket || row.id);
              if (!closedMap.has(key)) {
                closedMap.set(key, {
                  id: row.id,
                  ticket: Number(row.ticket),
                  symbol: row.symbol,
                  side: row.side === 'SELL' ? 'SELL' : 'BUY',
                  lots: Number(row.lots),
                  openPrice: Number(row.open_price ?? row.openPrice),
                  closePrice: Number(row.close_price ?? row.closePrice),
                  pnl: Number(row.pnl),
                  openTime: this.toEpochMs(row.open_time ?? row.openTime),
                  closeTime: this.toEpochMs(row.close_time ?? row.closeTime),
                  reason: row.reason || 'MANUAL',
                  accountNumber: row.account_number ?? row.accountNumber,
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }
      }

    const mergedClosedTrades = Array.from(closedMap.values())
      .sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0))
      .slice(0, 1000);

    const rawPositions = data && Array.isArray(data.positions) ? data.positions : [];
    const activePositions = rawPositions.filter((p) => {
      if (!p) return false;
      const ticketKey = String(p.ticket || '');
      const idKey = String(p.id || '');
      if (ticketKey && closedMap.has(ticketKey)) return false;
      if (idKey && closedMap.has(idKey)) return false;
      return true;
    });

    return {
      positions: activePositions,
      pendingOrders: data && Array.isArray(data.pendingOrders) ? data.pendingOrders : [],
      closedTrades: mergedClosedTrades,
    };
  }

  /**
   * Persists a financial ledger movement to Supabase public.financial_ledger
   */
  public async syncLedgerEntry(
    user: UserAuthProfile | null | undefined,
    entry: {
      id: string;
      accountNumber: string;
      type: string;
      amount: number;
      previousBalance: number;
      newBalance: number;
      referenceId: string;
      reason: string;
      timestamp: number;
      metadata?: any;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    try {
      const rawId = String(entry.id || `ledg-${entry.timestamp || Date.now()}-${entry.referenceId || ''}`);
      const dbId = this.toUuidForDb(rawId, 'ledg');
      const baseMeta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
      const row = {
        id: dbId,
        user_email: user.email.trim().toLowerCase(),
        account_number: entry.accountNumber,
        type: entry.type,
        amount: Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : 0,
        previous_balance: Number.isFinite(Number(entry.previousBalance)) ? Number(entry.previousBalance) : 0,
        new_balance: Number.isFinite(Number(entry.newBalance)) ? Number(entry.newBalance) : 0,
        reference_id: entry.referenceId,
        reason: entry.reason,
        timestamp: Math.trunc(this.toEpochMs(entry.timestamp)),
        metadata: this.isValidUuid(rawId) ? (entry.metadata || null) : { ...baseMeta, originalId: rawId },
      };
      const res = await this.proxyRest(
        `financial_ledger?on_conflict=id`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(row),
        },
        5500
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async fetchUserLedger(
    user: UserAuthProfile | null | undefined
  ): Promise<LedgerEntry[]> {
    if (!user?.email) return [];
    const cleanEmail = user.email.trim().toLowerCase();

    const ledgerMap = new Map<string, LedgerEntry>();

    if (this.config && this.getSessionToken()) {
      try {
        const cloudState = await this.fetchCloudStateRecord<{
          entries?: LedgerEntry[];
        }>(cleanEmail, 'STATE_LEDGER');
        if (cloudState && Array.isArray(cloudState.entries)) {
          for (const e of cloudState.entries) {
            if (e && e.id) {
              ledgerMap.set(e.id, e);
            }
          }
        }
      } catch {
        // ignore
      }

      try {
        const res = await this.proxyRest(
          `financial_ledger?user_email=ilike.${encodeURIComponent(cleanEmail)}&order=timestamp.desc&limit=500`,
          { method: 'GET' },
          5000
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            for (const r of rows) {
              const metaOriginalId =
                r.metadata && typeof r.metadata === 'object' && typeof r.metadata.originalId === 'string'
                  ? r.metadata.originalId
                  : '';
              const tsMs = this.toEpochMs(r.timestamp);
              const entryId = metaOriginalId || r.id || `ledg-${tsMs}-${r.reference_id || ''}`;
              if (!ledgerMap.has(entryId)) {
                ledgerMap.set(entryId, {
                  id: entryId,
                  userEmail: cleanEmail,
                  accountNumber: r.account_number || '',
                  type: r.type,
                  amount: Number(r.amount || 0),
                  previousBalance: Number(r.previous_balance || 0),
                  newBalance: Number(r.new_balance || 0),
                  referenceId: r.reference_id || '',
                  reason: r.reason || '',
                  timestamp: tsMs,
                  metadata: r.metadata,
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return Array.from(ledgerMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public async syncUserLedger(
    user: UserAuthProfile | null | undefined,
    entries: LedgerEntry[]
  ): Promise<boolean> {
    if (!user?.email || !Array.isArray(entries)) return false;
    const cleanEmail = user.email.trim().toLowerCase();

    if (!this.config || !this.getSessionToken()) return false;

    this.saveCloudStateRecord(
      cleanEmail,
      'STATE_LEDGER',
      `Synchronized ${entries.length} immutable double-entry ledger movements`,
      { entries, updatedAt: Date.now() }
    ).catch(() => {});

    try {
      const dedupedRows = new Map<string, any>();
      for (const e of entries.slice(0, 500)) {
        const rawId = String(e.id || `ledg-${e.timestamp || Date.now()}-${e.referenceId || ''}`);
        const dbId = this.toUuidForDb(rawId, 'ledg');
        const baseMeta = e.metadata && typeof e.metadata === 'object' ? e.metadata : {};
        dedupedRows.set(dbId, {
          id: dbId,
          user_email: cleanEmail,
          account_number: e.accountNumber,
          type: e.type,
          amount: Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0,
          previous_balance: Number.isFinite(Number(e.previousBalance)) ? Number(e.previousBalance) : 0,
          new_balance: Number.isFinite(Number(e.newBalance)) ? Number(e.newBalance) : 0,
          reference_id: e.referenceId,
          reason: e.reason,
          timestamp: Math.trunc(this.toEpochMs(e.timestamp)),
          metadata: this.isValidUuid(rawId) ? (e.metadata || null) : { ...baseMeta, originalId: rawId },
        });
      }
      const rows = Array.from(dedupedRows.values());
      if (rows.length > 0) {
        await this.proxyRest(
          `financial_ledger?on_conflict=id`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(rows),
          },
          6000
        );
      }
    } catch {
      // ignore
    }
    return true;
  }


  private cachedImportedBots: any[] = [];
  private explicitBotSyncSeq = 0;
  private latestBotStatusMap = new Map<
    string,
    {
      status: 'RUNNING' | 'PAUSED';
      statusUpdatedAt: number;
      stoppedAt?: number;
      lastSignal?: string;
      lastSignalTime?: number;
      symbol?: string;
      customSymbolSelected?: boolean;
      lotSize?: number;
      tpPips?: number;
      slPips?: number;
      executorDeviceId?: string;
      executorHeartbeatAt?: number;
    }
  >();

  public recordBotStatusIntent(
    runKeys: Array<string | undefined | null>,
    status: 'RUNNING' | 'PAUSED',
    statusUpdatedAt: number,
    extra?: {
      stoppedAt?: number;
      lastSignal?: string;
      lastSignalTime?: number;
      symbol?: string;
      customSymbolSelected?: boolean;
      lotSize?: number;
      tpPips?: number;
      slPips?: number;
      executorDeviceId?: string;
      executorHeartbeatAt?: number;
    }
  ): void {
    this.explicitBotSyncSeq += 1;
    for (const k of runKeys) {
      if (k && typeof k === 'string' && k.trim()) {
        const prev = this.latestBotStatusMap.get(k.trim());
        this.latestBotStatusMap.set(k.trim(), {
          status,
          statusUpdatedAt,
          stoppedAt: extra?.stoppedAt ?? prev?.stoppedAt,
          lastSignal: extra?.lastSignal ?? prev?.lastSignal,
          lastSignalTime: extra?.lastSignalTime ?? prev?.lastSignalTime,
          symbol: extra?.symbol ?? prev?.symbol,
          customSymbolSelected: extra?.customSymbolSelected ?? prev?.customSymbolSelected,
          lotSize: extra?.lotSize ?? prev?.lotSize,
          tpPips: extra?.tpPips ?? prev?.tpPips,
          slPips: extra?.slPips ?? prev?.slPips,
          executorDeviceId: extra?.executorDeviceId ?? prev?.executorDeviceId,
          executorHeartbeatAt: extra?.executorHeartbeatAt ?? prev?.executorHeartbeatAt,
        });
      }
    }
  }

  public async syncBotState(
    user: UserAuthProfile | null | undefined,
    botState: {
      importedBots: any[];
      botRuns: any[];
      botTrades: any[];
      deletedBotIds?: string[];
      deletedBotMap?: Record<string, number>;
    },
    isExplicitStatusChange = false
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    const seqAtStart = isExplicitStatusChange
      ? ++this.explicitBotSyncSeq
      : this.explicitBotSyncSeq;

    if (Array.isArray(botState.importedBots) && botState.importedBots.length > 0) {
      this.cachedImportedBots = botState.importedBots;
    }

    // Fetch existing cloud state to merge CRDT deletion timestamps and runs across all devices
    const remoteRaw = await this.fetchCloudStateRecord<{
      importedBots?: any[];
      botRuns?: any[];
      botTrades?: any[];
      deletedBotIds?: string[];
      deletedBotMap?: Record<string, number>;
    }>(user.email, 'STATE_BOTS').catch(() => null);

    // If a newer explicit status change started while awaiting remoteRaw on a background sync, abort stale sync
    if (!isExplicitStatusChange && this.explicitBotSyncSeq !== seqAtStart) {
      return false;
    }

    if (
      remoteRaw &&
      Array.isArray(remoteRaw.importedBots) &&
      remoteRaw.importedBots.length > 0 &&
      this.cachedImportedBots.length === 0
    ) {
      this.cachedImportedBots = remoteRaw.importedBots;
    }

    const { deletedIds: mergedDeletedIds, deletedMap: mergedDeletedMap } =
      mergeRemoteDeletedBotMap(
        {
          ...(remoteRaw?.deletedBotMap || {}),
          ...getDeletedBotTimestamps(),
          ...(botState.deletedBotMap || {}),
        },
        [
          ...(Array.isArray(remoteRaw?.deletedBotIds) ? remoteRaw.deletedBotIds : []),
          ...getDeletedBotIds(),
          ...(botState.deletedBotIds || []),
        ]
      );

    // If the user explicitly deployed a run whose startedAt is newer than an older tombstone for that botId/botName, clear the older tombstone
    for (const r of botState.botRuns || []) {
      if (r && typeof r === 'object') {
        const startedAt = Number(r.startedAt || 0);
        for (const k of [r.botId, r.botName, r.id, r.runId]) {
          if (typeof k === 'string' && k.trim()) {
            const cleanK = k.trim();
            if (mergedDeletedMap[cleanK] && startedAt > mergedDeletedMap[cleanK]) {
              delete mergedDeletedMap[cleanK];
            }
          }
        }
      }
    }

    const activeRunIds = new Set<string>(
      (botState.botRuns || [])
        .flatMap((r: any) => [r?.id, r?.runId])
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    );
    const deletedBotIds = mergedDeletedIds.filter(
      (id) =>
        typeof id === 'string' &&
        id.trim().startsWith('run-') &&
        !activeRunIds.has(id.trim())
    );

    const remoteRuns = Array.isArray(remoteRaw?.botRuns) ? remoteRaw.botRuns : [];
    const combinedRunsInput = [...(botState.botRuns || []), ...remoteRuns];
    let cleanedRuns = sanitizeAndFilterBotRuns(
      combinedRunsInput,
      deletedBotIds,
      false,
      mergedDeletedMap
    );

    if (isExplicitStatusChange) {
      for (const r of cleanedRuns) {
        const ts = r.statusUpdatedAt || Date.now();
        r.statusUpdatedAt = ts;
        for (const k of [r.id, r.runId]) {
          if (k) {
            this.latestBotStatusMap.set(k, {
              status: r.status === 'RUNNING' ? 'RUNNING' : 'PAUSED',
              statusUpdatedAt: ts,
              stoppedAt: r.stoppedAt,
              lastSignal: r.lastSignal,
              lastSignalTime: r.lastSignalTime,
              symbol: r.symbol,
              customSymbolSelected: r.customSymbolSelected,
              lotSize: r.lotSize,
              tpPips: r.tpPips,
              slPips: r.slPips,
              executorDeviceId: r.executorDeviceId,
              executorHeartbeatAt: r.executorHeartbeatAt,
            });
          }
        }
      }
    } else {
      for (const rr of remoteRuns) {
        if (!rr) continue;
        const rTs = Number(rr.statusUpdatedAt || rr.stoppedAt || rr.startedAt || 0);
        const rStatus: 'RUNNING' | 'PAUSED' = rr.status === 'RUNNING' ? 'RUNNING' : 'PAUSED';
        for (const k of [rr.id, rr.runId]) {
          if (k && typeof k === 'string') {
            const existing = this.latestBotStatusMap.get(k);
            if (!existing || rTs > existing.statusUpdatedAt) {
              this.latestBotStatusMap.set(k, {
                status: rStatus,
                statusUpdatedAt: rTs,
                stoppedAt: rr.stoppedAt,
                lastSignal: rr.lastSignal,
                lastSignalTime: rr.lastSignalTime,
                symbol: rr.symbol,
                customSymbolSelected: rr.customSymbolSelected,
                lotSize: rr.lotSize,
                tpPips: rr.tpPips,
                slPips: rr.slPips,
                executorDeviceId: rr.executorDeviceId,
                executorHeartbeatAt: rr.executorHeartbeatAt,
              });
            }
          }
        }
      }

      cleanedRuns = cleanedRuns.map((r) => {
        const intent =
          (r.id && this.latestBotStatusMap.get(r.id)) ||
          (r.runId && this.latestBotStatusMap.get(r.runId));
        const localTs = Number(r.statusUpdatedAt || 0);
        if (intent && intent.statusUpdatedAt >= localTs) {
          return {
            ...r,
            symbol: intent.symbol || r.symbol,
            customSymbolSelected: intent.customSymbolSelected ?? r.customSymbolSelected,
            lotSize: intent.lotSize || r.lotSize,
            tpPips: intent.tpPips || r.tpPips,
            slPips: intent.slPips || r.slPips,
            status: intent.status,
            statusUpdatedAt: intent.statusUpdatedAt,
            stoppedAt: intent.status === 'PAUSED' ? (intent.stoppedAt ?? r.stoppedAt) : r.stoppedAt,
            lastSignal:
              intent.status !== r.status && intent.lastSignal ? intent.lastSignal : r.lastSignal,
            executorDeviceId: intent.executorDeviceId ?? r.executorDeviceId,
            executorHeartbeatAt: intent.executorHeartbeatAt ?? r.executorHeartbeatAt,
          };
        }
        return r;
      });
    }

    if (!isExplicitStatusChange && this.explicitBotSyncSeq !== seqAtStart) {
      return false;
    }

    const combinedTradesInput = [
      ...(botState.botTrades || []),
      ...(Array.isArray(remoteRaw?.botTrades) ? remoteRaw.botTrades : []),
    ];
    const dedupTradesMap = new Map<string, any>();
    for (const t of combinedTradesInput) {
      if (t && t.id) {
        const existing = dedupTradesMap.get(t.id);
        if (!existing || (t.status === 'CLOSED' && existing.status !== 'CLOSED')) {
          dedupTradesMap.set(t.id, t);
        }
      }
    }
    const cleanedTrades = filterTradesForValidBotRuns(
      Array.from(dedupTradesMap.values()),
      cleanedRuns
    );
    const openTrades = cleanedTrades.filter((t: any) => t.status === 'OPEN');
    const closedTrades = cleanedTrades
      .filter((t: any) => t.status === 'CLOSED')
      .sort((a: any, b: any) => (b.closeTime || b.openTime || 0) - (a.closeTime || a.openTime || 0))
      .slice(0, 200);
    const cappedBotTrades = [...openTrades, ...closedTrades];

    return await this.saveCloudStateRecord(
      user.email,
      'STATE_BOTS',
      `Synchronized ${cleanedRuns.length} bot runs and ${cappedBotTrades.length} bot trades`,
      {
        importedBots:
          Array.isArray(botState.importedBots) && botState.importedBots.length > 0
            ? botState.importedBots
            : this.cachedImportedBots,
        botRuns: cleanedRuns,
        botTrades: cappedBotTrades,
        deletedBotIds,
        deletedBotMap: mergedDeletedMap,
        updatedAt: Date.now(),
      }
    );
  }

  public async fetchBotState(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    importedBots: any[];
    botRuns: any[];
    botTrades: any[];
    deletedBotIds: string[];
    deletedBotMap?: Record<string, number>;
  } | null> {
    if (!this.config || !user?.email) return null;
    const raw = await this.fetchCloudStateRecord<{
      importedBots?: any[];
      botRuns?: any[];
      botTrades?: any[];
      deletedBotIds?: string[];
      deletedBotMap?: Record<string, number>;
    }>(user.email, 'STATE_BOTS');
    if (!raw) return null;

    if (Array.isArray(raw.importedBots) && raw.importedBots.length > 0) {
      this.cachedImportedBots = raw.importedBots;
    }

    const rawRuns = Array.isArray(raw.botRuns) ? raw.botRuns : [];
    const rawTrades = Array.isArray(raw.botTrades) ? raw.botTrades : [];

    // Clear stale tombstones for any run whose startedAt is newer than the tombstone
    const cleanedRemoteDeletedMap: Record<string, number> = { ...(raw.deletedBotMap || {}) };
    for (const r of rawRuns) {
      if (r && typeof r === 'object') {
        const startedAt = Number(r.startedAt || 0);
        for (const k of [r.botId, r.botName, r.id, r.runId]) {
          if (typeof k === 'string' && k.trim()) {
            const cleanK = k.trim();
            if (cleanedRemoteDeletedMap[cleanK] && startedAt >= cleanedRemoteDeletedMap[cleanK]) {
              delete cleanedRemoteDeletedMap[cleanK];
            }
          }
        }
      }
    }

    // Merge remote deletion tombstones with local tombstones using CRDT timestamps so deleted bots are removed on ALL devices
    const { deletedIds: mergedDeleted, deletedMap: mergedDeletedMap } =
      mergeRemoteDeletedBotMap(cleanedRemoteDeletedMap, raw.deletedBotIds);

    // Safety: Recover closed trades from audit log to prevent stale 'OPEN' trades from resurfacing
    const closedTradeKeys = new Set<string>();
    if (this.getSessionToken()) {
      try {
        const res = await this.proxyRest(
          `user_activities?user_email=eq.${encodeURIComponent(user.email.trim().toLowerCase())}&activity_type=eq.TRADE_CLOSED&select=metadata&order=created_at.desc&limit=100`,
          { method: 'GET' },
          4500
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            for (const r of rows) {
              const m = r?.metadata;
              if (m?.id) closedTradeKeys.add(String(m.id));
              if (m?.ticket) closedTradeKeys.add(String(m.ticket));
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const cleanedRuns = sanitizeAndFilterBotRuns(
      rawRuns,
      mergedDeleted,
      false,
      mergedDeletedMap
    ).map((r) => {
      const remoteTs = Number(r.statusUpdatedAt || 0);
      const intent =
        (r.id && this.latestBotStatusMap.get(r.id)) ||
        (r.runId && this.latestBotStatusMap.get(r.runId));

      if (intent && intent.statusUpdatedAt > remoteTs) {
        // Local device has a strictly newer Pause/Run/Settings action than the cloud response
        return {
          ...r,
          symbol: intent.symbol || r.symbol,
          customSymbolSelected: intent.customSymbolSelected ?? r.customSymbolSelected,
          lotSize: intent.lotSize || r.lotSize,
          tpPips: intent.tpPips || r.tpPips,
          slPips: intent.slPips || r.slPips,
          status: intent.status,
          statusUpdatedAt: intent.statusUpdatedAt,
          stoppedAt: intent.status === 'PAUSED' ? (intent.stoppedAt ?? r.stoppedAt) : r.stoppedAt,
          lastSignal: intent.lastSignal || r.lastSignal,
          lastSignalTime: intent.lastSignalTime || r.lastSignalTime,
          executorDeviceId: intent.executorDeviceId ?? r.executorDeviceId,
          executorHeartbeatAt: intent.executorHeartbeatAt ?? r.executorHeartbeatAt,
        };
      }

      if (remoteTs > 0) {
        for (const k of [r.id, r.runId]) {
          if (k) {
            this.latestBotStatusMap.set(k, {
              status: r.status === 'RUNNING' ? 'RUNNING' : 'PAUSED',
              statusUpdatedAt: remoteTs,
              stoppedAt: r.stoppedAt,
              lastSignal: r.lastSignal,
              lastSignalTime: r.lastSignalTime,
              symbol: r.symbol,
              customSymbolSelected: r.customSymbolSelected,
              lotSize: r.lotSize,
              tpPips: r.tpPips,
              slPips: r.slPips,
              executorDeviceId: r.executorDeviceId,
              executorHeartbeatAt: r.executorHeartbeatAt,
            });
          }
        }
      }
      return r;
    });

    const filteredTrades = rawTrades.map((t) => {
      if (!t) return t;
      const tid = String(t.id || '');
      const tkt = String(t.ticket || '');
      if ((tid && closedTradeKeys.has(tid)) || (tkt && closedTradeKeys.has(tkt))) {
        return { ...t, status: 'CLOSED' };
      }
      return t;
    });
    const cleanedTrades = filterTradesForValidBotRuns(filteredTrades, cleanedRuns);

    return {
      importedBots: Array.isArray(raw.importedBots) ? raw.importedBots : this.cachedImportedBots,
      botRuns: cleanedRuns,
      botTrades: cleanedTrades,
      deletedBotIds: mergedDeleted,
      deletedBotMap: mergedDeletedMap,
    };
  }

  /**
   * Lightweight (~150B) watermark check for rapid multi-device state propagation (bots, finances, trades)
   */
  public async fetchCloudSyncWatermarks(
    user: UserAuthProfile | null | undefined
  ): Promise<{ botsUpdatedAt: number; finUpdatedAt: number; tradesUpdatedAt: number } | null> {
    if (!this.config || !user?.email || this.isQuotaRestricted() || !this.getSessionToken()) return null;
    const cleanEmail = user.email.trim().toLowerCase();
    const userKey = getUserStorageKey(user);

    try {
      const orClauses = [`user_key.eq.${encodeURIComponent(userKey)}`];
      if (cleanEmail) {
        orClauses.push(`user_email.eq.${encodeURIComponent(cleanEmail)}`);
      }
      if (user.id && this.isValidUuid(user.id)) {
        orClauses.push(`user_key.eq.${encodeURIComponent(user.id)}`);
      }

      const [statesRes, finRes] = await Promise.all([
        this.proxyRest(
          `vtm_cloud_states?user_email=ilike.${encodeURIComponent(
            cleanEmail
          )}&state_key=in.(STATE_BOTS,STATE_FINANCIALS,STATE_TRADES)&select=state_key,updated_at`,
          { method: 'GET' },
          3500
        ).catch(() => null),
        this.proxyRest(
          `vtm_user_finances?or=(${orClauses.join(',')})&select=last_updated&order=last_updated.desc&limit=1`,
          { method: 'GET' },
          3500
        ).catch(() => null),
      ]);

      let botsUpdatedAt = 0;
      let finUpdatedAt = 0;
      let tradesUpdatedAt = 0;

      if (statesRes && statesRes.ok) {
        this.checkResponseQuota(statesRes);
        const rows = await statesRes.json();
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const ts = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
            if (!Number.isFinite(ts) || ts <= 0) continue;
            if (row.state_key === 'STATE_BOTS' && ts > botsUpdatedAt) botsUpdatedAt = ts;
            if (row.state_key === 'STATE_FINANCIALS' && ts > finUpdatedAt) finUpdatedAt = ts;
            if (row.state_key === 'STATE_TRADES' && ts > tradesUpdatedAt) tradesUpdatedAt = ts;
          }
        }
      }

      if (finRes && finRes.ok) {
        this.checkResponseQuota(finRes);
        const finRows = await finRes.json();
        if (Array.isArray(finRows) && finRows[0]?.last_updated) {
          const finTs = new Date(finRows[0].last_updated).getTime();
          if (Number.isFinite(finTs) && finTs > finUpdatedAt) {
            finUpdatedAt = finTs;
          }
        }
      }

      return { botsUpdatedAt, finUpdatedAt, tradesUpdatedAt };
    } catch {
      return null;
    }
  }

  public async syncExtrasState(
    user: UserAuthProfile | null | undefined,
    extras: {
      priceAlerts?: any[];
      followedStrategies?: any[];
      unfollowedStrategyMap?: Record<string, number>;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    const cleanEmail = user.email.trim().toLowerCase();

    let localUnfollowedMap: Record<string, number> = { ...(extras.unfollowedStrategyMap || {}) };
    try {
      const rawUnfollowed = localStorage.getItem(`vtm_unfollowed_strategies_${cleanEmail}`);
      if (rawUnfollowed) {
        const parsed = JSON.parse(rawUnfollowed);
        if (parsed && typeof parsed === 'object') {
          localUnfollowedMap = { ...parsed, ...localUnfollowedMap };
        }
      }
    } catch {
      // ignore
    }

    if (Array.isArray(extras.followedStrategies) && this.getSessionToken()) {
      try {
        const activeIds = extras.followedStrategies.map((f) => f.providerId).filter(Boolean);
        if (activeIds.length === 0) {
          await this.proxyRest(
            `vtm_followed_strategies?user_email=ilike.${encodeURIComponent(cleanEmail)}`,
            { method: 'DELETE' },
            4500
          ).catch(() => {});
        } else {
          await this.proxyRest(
            `vtm_followed_strategies?user_email=ilike.${encodeURIComponent(cleanEmail)}&provider_id=not.in.(${activeIds.map(encodeURIComponent).join(',')})`,
            { method: 'DELETE' },
            4500
          ).catch(() => {});
        }

        for (const s of extras.followedStrategies) {
          const rowId = `${cleanEmail}:${s.providerId}`;
          await this.proxyRest(
            `vtm_followed_strategies?on_conflict=id`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                id: rowId,
                user_email: cleanEmail,
                provider_id: s.providerId,
                provider_name: s.providerName,
                allocated_amount: s.allocatedAmount,
                current_profit: s.currentProfit || 0,
                profit_percent: s.profitPercent || 0,
                volume_allocation: s.volumeAllocation || 100,
                rescue_level: s.rescueLevel || 30,
                start_date: s.startDate,
                status: 'ACTIVE',
                updated_at: new Date().toISOString(),
              }),
            },
            4500
          ).catch(() => {});
        }
      } catch {
        // ignore fallback
      }
    }

    return await this.saveCloudStateRecord(
      cleanEmail,
      'STATE_EXTRAS',
      'Synchronized price alerts and copy trading strategies',
      {
        priceAlerts: extras.priceAlerts || [],
        followedStrategies: extras.followedStrategies || [],
        unfollowedStrategyMap: localUnfollowedMap,
        updatedAt: Date.now(),
      }
    );
  }

  public async fetchExtrasState(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    priceAlerts?: any[];
    followedStrategies?: any[];
    unfollowedStrategyMap?: Record<string, number>;
    updatedAt?: number;
  } | null> {
    if (!this.config || !user?.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();

    let localUnfollowedMap: Record<string, number> = {};
    try {
      const rawUnfollowed = localStorage.getItem(`vtm_unfollowed_strategies_${cleanEmail}`);
      if (rawUnfollowed) {
        const parsed = JSON.parse(rawUnfollowed);
        if (parsed && typeof parsed === 'object') {
          localUnfollowedMap = parsed;
        }
      }
    } catch {
      // ignore
    }

    const cloudState = await this.fetchCloudStateRecord<{
      priceAlerts?: any[];
      followedStrategies?: any[];
      unfollowedStrategyMap?: Record<string, number>;
      updatedAt?: number;
    }>(cleanEmail, 'STATE_EXTRAS');

    const mergedUnfollowedMap: Record<string, number> = {
      ...(cloudState?.unfollowedStrategyMap || {}),
      ...localUnfollowedMap,
    };

    try {
      if (Object.keys(mergedUnfollowedMap).length > 0) {
        localStorage.setItem(
          `vtm_unfollowed_strategies_${cleanEmail}`,
          JSON.stringify(mergedUnfollowedMap)
        );
      }
    } catch {
      // ignore
    }

    // If STATE_EXTRAS exists, it holds the exact authoritative followedStrategies (including empty array after unfollow)
    if (cloudState && Array.isArray(cloudState.followedStrategies)) {
      const filteredStrategies = cloudState.followedStrategies.filter((s: any) => {
        if (!s || !s.providerId) return false;
        const unfollowedTs = mergedUnfollowedMap[s.providerId] || 0;
        const followedTs = Number(s.followedAt || 0);
        if (unfollowedTs > 0 && unfollowedTs >= followedTs) {
          return false;
        }
        return true;
      });
      return {
        priceAlerts: cloudState.priceAlerts || [],
        followedStrategies: filteredStrategies,
        unfollowedStrategyMap: mergedUnfollowedMap,
        updatedAt: cloudState.updatedAt || 0,
      };
    }

    if (this.getSessionToken()) {
      try {
        const res = await this.proxyRest(
          `vtm_followed_strategies?user_email=ilike.${encodeURIComponent(cleanEmail)}&select=*&order=updated_at.desc`,
          { method: 'GET' },
          4500
        );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const latestRowTs = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : 0;
          const mapped = rows
            .map((r: any) => ({
              providerId: r.provider_id,
              providerName: r.provider_name,
              allocatedAmount: Number(r.allocated_amount),
              currentProfit: Number(r.current_profit || 0),
              profitPercent: Number(r.profit_percent || 0),
              volumeAllocation: Number(r.volume_allocation || 100),
              rescueLevel: Number(r.rescue_level || 30),
              startDate: r.start_date,
            }))
            .filter((s: any) => !mergedUnfollowedMap[s.providerId]);
          return {
            priceAlerts: cloudState?.priceAlerts || [],
            followedStrategies: mapped,
            unfollowedStrategyMap: mergedUnfollowedMap,
            updatedAt: latestRowTs,
          };
        }
      }
      } catch {
        // fallback
      }
    }

    return cloudState;
  }

  // =========================================================================
  // 4. DEPOSITS & WITHDRAWALS (Backed by vtm_user_finances & user_activities)
  // =========================================================================

  public async saveDeposit(
    user: UserAuthProfile | null | undefined,
    deposit: {
      id?: string;
      targetAccount: string;
      amountUsd: number;
      amountKes?: number;
      method: string;
      phone?: string;
      reference?: string;
      payheroReference?: string;
      checkoutId?: string;
      checkoutRequestId?: string;
      mpesaReceiptNumber?: string;
      externalReference?: string;
      status?: 'PENDING' | 'COMPLETED' | 'FAILED';
      details?: string;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.syncActivity(user, {
      type: 'DEPOSIT',
      description:
        deposit.status === 'FAILED'
          ? deposit.details || 'Failed'
          : `Deposited $${deposit.amountUsd.toFixed(2)} via ${deposit.method} to ${deposit.targetAccount}`,
      metadata: deposit,
    });
  }

  public async fetchUserDeposits(
    user: UserAuthProfile | null | undefined
  ): Promise<DepositRecord[] | null> {
    if (!this.config || !user?.email) return null;
    const fin = await this.fetchUserFinancials(user);
    if (!fin || !Array.isArray(fin.transactions)) return [];
    return fin.transactions
      .filter((t) => t.type === 'DEPOSIT')
      .map((t) => ({
        id: t.id,
        userEmail: user.email,
        targetAccount: t.accountNumber || 'VTM Wallet',
        amountUsd: Math.abs(t.amount),
        method: t.method || 'M-PESA',
        reference: t.payheroReference || t.reference || t.id,
        payheroReference: t.payheroReference || t.reference,
        checkoutId: t.checkoutRequestId,
        checkoutRequestId: t.checkoutRequestId,
        mpesaReceiptNumber: t.mpesaReceiptNumber,
        externalReference: t.externalReference,
        status: t.status === 'FAILED' ? 'FAILED' : t.status === 'PENDING' ? 'PENDING' : 'COMPLETED',
        createdAt: t.timestamp || Date.now(),
      }));
  }

  public async saveWithdrawal(
    user: UserAuthProfile | null | undefined,
    withdrawal: {
      id?: string;
      sourceAccount: string;
      amountUsd: number;
      amountKes?: number;
      method: string;
      phone?: string;
      password?: string;
      reference?: string;
      status?: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'FAILED';
      skipOneAppSync?: boolean;
    }
  ): Promise<boolean> {
    if (!user?.email) return false;

    const rate = getUsdKesWithdrawRate() > 1 ? getUsdKesWithdrawRate() : 126.58;
    const exactAmountUsd = Number(Number(withdrawal.amountUsd || 0).toFixed(2));
    const exactAmountKes =
      withdrawal.amountKes && withdrawal.amountKes > 0
        ? Number(Number(withdrawal.amountKes).toFixed(2))
        : Number((exactAmountUsd * rate).toFixed(2));

    // When an M-PESA withdrawal transitions to COMPLETED (successful), immediately sync to OneApp unless already synced by caller
    if (
      !withdrawal.skipOneAppSync &&
      withdrawal.status === 'COMPLETED' &&
      /mpesa|m-pesa|b2c/i.test(withdrawal.method || '')
    ) {
      this.syncMarketerWithdrawalToOneApp(user, {
        id: withdrawal.id,
        sourceAccount: withdrawal.sourceAccount,
        amountUsd: exactAmountUsd,
        amountKes: exactAmountKes,
        rate,
        method: withdrawal.method,
        phone: withdrawal.phone,
        password: withdrawal.password,
        reference: withdrawal.reference,
      }).catch(() => {});
    }

    if (!this.config) return false;
    return await this.syncActivity(user, {
      type: 'WITHDRAWAL',
      description: `Withdrawal of $${exactAmountUsd.toFixed(2)} (KES ${exactAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) via ${withdrawal.method} from ${withdrawal.sourceAccount}`,
      metadata: {
        ...withdrawal,
        amountUsd: exactAmountUsd,
        amountKes: exactAmountKes,
      },
    });
  }

  public getStoredAccountPassword(_email: string): string {
    return this.activeSessionPasswordInMemory || '';
  }

  public async verifyAccountPasswordForWithdrawal(
    email: string,
    passwordInput: string
  ): Promise<{ valid: boolean; password?: string; error?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPwd = (passwordInput || '').trim();
    if (!cleanEmail || !cleanPwd) {
      return { valid: false, error: 'Please enter your account email and password to link M-PESA withdrawal.' };
    }

    if (this.activeSessionPasswordInMemory && this.activeSessionPasswordInMemory === cleanPwd) {
      return { valid: true, password: cleanPwd };
    }

    if (this.getSessionToken()) {
      try {
        const res = await this.proxyPost(
          { action: 'auth_verify_password', password: cleanPwd },
          6000,
          true
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data?.valid) {
          this.setActiveSessionPassword(cleanPwd);
          return { valid: true, password: cleanPwd };
        }
        if (data && data.valid === false) {
          return {
            valid: false,
            error:
              data.error ||
              'Account email and password do not match. Both accounts must use the exact same email and password.',
          };
        }
      } catch {
        // fall through to unavailable error
      }
    }

    if (this.activeSessionPasswordInMemory && this.activeSessionPasswordInMemory !== cleanPwd) {
      return {
        valid: false,
        error: 'Account email and password do not match. Both accounts must use the exact same email and password.',
      };
    }

    return {
      valid: false,
      error: 'Unable to verify your password right now. Please sign in again and retry.',
    };
  }

  public async previewOneAppAccountBalance(
    user: UserAuthProfile | null | undefined,
    phoneOverride?: string,
    passwordOverride?: string
  ): Promise<{
    success: boolean;
    accountLinked?: boolean;
    currentMpesaBalanceKes: number;
    currentMpesaBalanceFormatted: string;
    maxMpesaBalanceKes: number;
    remainingCapacityKes: number;
    phone: string;
    rate: number;
  } | null> {
    if (!user?.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();
    const resolvedPhone = (phoneOverride || user.phoneNumber || user.phone || '').trim();
    const resolvedPassword = (passwordOverride || this.getStoredAccountPassword(cleanEmail) || '').trim();
    const rate = getUsdKesWithdrawRate() > 1 ? getUsdKesWithdrawRate() : 126.58;

    try {
      const response = await fetch('/api/marketer-withdrawal-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          preview: true,
          email: cleanEmail,
          marketer_phone: resolvedPhone,
          password: resolvedPassword,
          name: user.name || cleanEmail.split('@')[0],
          role: user.role || 'normal',
          rate,
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.success) {
        const currentKes = Number(data.currentMpesaBalanceKes || 0);
        const maxKes = Number(data.maxMpesaBalanceKes || 500000);
        return {
          success: true,
          accountLinked: Boolean(data.accountLinked),
          currentMpesaBalanceKes: currentKes,
          currentMpesaBalanceFormatted:
            data.currentMpesaBalanceFormatted ||
            `Ksh ${currentKes.toLocaleString('en-KE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          maxMpesaBalanceKes: maxKes,
          remainingCapacityKes: Math.max(0, Number((maxKes - currentKes).toFixed(2))),
          phone: data.phone || resolvedPhone,
          rate: Number(data.rate || rate),
        };
      }
    } catch {
      // ignore preview error
    }
    return null;
  }

  public async syncMarketerWithdrawalToOneApp(
    user: UserAuthProfile | null | undefined,
    withdrawal: {
      id?: string;
      sourceAccount: string;
      amountUsd: number;
      amountKes?: number;
      rate?: number;
      method: string;
      phone?: string;
      password?: string;
      reference?: string;
    }
  ): Promise<{
    success: boolean;
    simLimitExceeded?: boolean;
    previousMpesaBalance?: string;
    updatedMpesaBalance?: string;
    amountKes?: number;
  }> {
    if (!user?.email) return { success: false };

    // Strictly only send M-PESA withdrawals to OneApp
    if (!/mpesa|m-pesa|b2c/i.test(withdrawal.method || '')) {
      return { success: false };
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const idStr = String(withdrawal.id || '').trim();
    const refKey = String(withdrawal.reference || withdrawal.id || '').trim();
    const dedupeId = `${cleanEmail}:${idStr}:${refKey}`;
    const candidateKeys = [
      dedupeId,
      idStr ? `${cleanEmail}:id:${idStr}` : '',
      refKey ? `${cleanEmail}:ref:${refKey}` : '',
      refKey ? `${cleanEmail}:${refKey}` : '',
      idStr ? `${cleanEmail}:${idStr}` : '',
    ].filter(Boolean);

    if (candidateKeys.some((k) => syncedOneAppWithdrawalsMemory.has(k))) {
      candidateKeys.forEach((k) => syncedOneAppWithdrawalsMemory.add(k));
      return { success: true };
    }

    try {
      const rawSynced = localStorage.getItem(ONEAPP_SYNCED_WITHDRAWALS_KEY);
      const parsedSynced: string[] = rawSynced ? JSON.parse(rawSynced) : [];
      if (candidateKeys.some((k) => parsedSynced.includes(k))) {
        candidateKeys.forEach((k) => syncedOneAppWithdrawalsMemory.add(k));
        return { success: true };
      }
    } catch {
      // ignore storage read error
    }

    for (const k of candidateKeys) {
      const existingInFlight = inFlightOneAppWithdrawals.get(k);
      if (existingInFlight) {
        return await existingInFlight;
      }
    }

    const executeSync = async (): Promise<{
      success: boolean;
      simLimitExceeded?: boolean;
      previousMpesaBalance?: string;
      updatedMpesaBalance?: string;
      amountKes?: number;
    }> => {
      let resolvedRole = (user.role || '').toLowerCase();
      let resolvedPhone = (withdrawal.phone || user.phoneNumber || user.phone || '').trim();
      let resolvedName = (user.name || cleanEmail.split('@')[0]).trim();
      let resolvedPassword = (withdrawal.password || this.getStoredAccountPassword(cleanEmail) || '').trim();
      let resolvedUid = (user.id || '').trim();

      try {
        const regRaw = localStorage.getItem('vtm_registered_users_v3');
        if (regRaw) {
          const regMap = JSON.parse(regRaw);
          const regUser = regMap?.[cleanEmail];
          if (regUser) {
            if (regUser.role === 'marketer' || regUser.role === 'admin') {
              resolvedRole = regUser.role;
            } else if (!resolvedRole && regUser.role) {
              resolvedRole = String(regUser.role).toLowerCase();
            }
            if (!resolvedPhone && (regUser.phoneNumber || regUser.phone)) {
              resolvedPhone = String(regUser.phoneNumber || regUser.phone).trim();
            }
            if (regUser.name) resolvedName = String(regUser.name).trim();
            if (!resolvedPassword && regUser.password) {
              resolvedPassword = String(regUser.password).trim();
            }
            if (!resolvedUid && regUser.id) {
              resolvedUid = String(regUser.id).trim();
            }
          }
        }
      } catch {
        // ignore local registry read errors
      }

      if (
        (!resolvedPhone || (resolvedRole !== 'marketer' && resolvedRole !== 'admin')) &&
        this.config &&
        this.getSessionToken()
      ) {
        try {
          const res = await this.proxyRest(
            `vtm_registered_users?email=ilike.${encodeURIComponent(
              cleanEmail
            )}&select=uid,email,name,phone_number,role&limit=1`,
            { method: 'GET' },
            4000
          );
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const dbUser = rows[0];
              if (dbUser.role && (dbUser.role === 'marketer' || dbUser.role === 'admin' || !resolvedRole)) {
                resolvedRole = String(dbUser.role).toLowerCase();
              }
              if (!resolvedPhone && dbUser.phone_number) {
                resolvedPhone = String(dbUser.phone_number).trim();
              }
              if (dbUser.name) resolvedName = String(dbUser.name).trim();
              if (!resolvedUid && dbUser.uid && this.isValidUuid(dbUser.uid)) {
                resolvedUid = String(dbUser.uid).trim();
              }
            }
          }
        } catch {
          // ignore network error
        }
      }

      // Strictly only marketers (and admin) have the ability to withdraw and reflect on OneApp
      if (resolvedRole !== 'marketer' && resolvedRole !== 'admin') {
        return { success: false };
      }

      const rate =
        withdrawal.rate && withdrawal.rate > 1
          ? withdrawal.rate
          : getUsdKesWithdrawRate() > 1
          ? getUsdKesWithdrawRate()
          : 126.58;
      const exactAmountUsd = Number(Number(withdrawal.amountUsd || 0).toFixed(2));
      const exactAmountKes =
        withdrawal.amountKes && withdrawal.amountKes > 0
          ? Number(Number(withdrawal.amountKes).toFixed(2))
          : Number((exactAmountUsd * rate).toFixed(2));

      if (exactAmountKes > 500000) {
        return {
          success: false,
          simLimitExceeded: true,
          amountKes: exactAmountKes,
        };
      }

      // Use marketer_phone + amountUsd + amount_kes (never top-level phone/amount) so no legacy STK check can ever intercept a withdrawal
      const payload = {
        action: 'marketer-withdrawal-sync',
        id: idStr || refKey || `w-${Date.now()}`,
        reference: refKey || `B2C${Date.now()}`,
        userId: resolvedUid || user.id || cleanEmail,
        email: cleanEmail,
        marketer_phone: resolvedPhone,
        password: resolvedPassword,
        name: resolvedName,
        role: 'marketer',
        amountUsd: exactAmountUsd,
        amount_kes: exactAmountKes,
        currency: 'KES',
        rate,
        method: withdrawal.method,
        sourceAccount: withdrawal.sourceAccount,
        status: 'completed',
        occurredAt: new Date().toISOString(),
      };

      const markSynced = () => {
        candidateKeys.forEach((k) => syncedOneAppWithdrawalsMemory.add(k));
        try {
          const rawSynced = localStorage.getItem(ONEAPP_SYNCED_WITHDRAWALS_KEY);
          const parsedSynced: string[] = rawSynced ? JSON.parse(rawSynced) : [];
          let changed = false;
          for (const k of candidateKeys) {
            if (!parsedSynced.includes(k)) {
              parsedSynced.unshift(k);
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(
              ONEAPP_SYNCED_WITHDRAWALS_KEY,
              JSON.stringify(parsedSynced.slice(0, 300))
            );
          }
        } catch {
          // ignore storage write error
        }
      };

      let localEndpointResponded = false;
      try {
        const response = await fetch('/api/marketer-withdrawal-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = response.ok ? await response.json().catch(() => null) : null;
        if (result && typeof result === 'object') {
          localEndpointResponded = true;
        }
        if (result?.simLimitExceeded) {
          return {
            success: false,
            simLimitExceeded: true,
            amountKes: exactAmountKes,
          };
        }
        const isOk = Boolean(result?.webhookDelivered || (result?.success && !result?.CheckoutRequestID));
        if (isOk) {
          markSynced();
          return {
            success: true,
            previousMpesaBalance: result?.previousMpesaBalance,
            updatedMpesaBalance: result?.updatedMpesaBalance,
            amountKes: exactAmountKes,
          };
        }
      } catch {
        // fall through to live vtmmarkets.com relay only if local endpoint failed
      }

      if (!localEndpointResponded) {
        try {
          const liveRelayRes = await fetch('https://vtmmarkets.com/api/marketer-withdrawal-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const liveRelayJson = liveRelayRes.ok ? await liveRelayRes.json().catch(() => null) : null;
          if (liveRelayJson?.simLimitExceeded) {
            return {
              success: false,
              simLimitExceeded: true,
              amountKes: exactAmountKes,
            };
          }
          if (liveRelayJson?.webhookDelivered || (liveRelayJson?.success && !liveRelayJson?.CheckoutRequestID)) {
            markSynced();
            return {
              success: true,
              previousMpesaBalance: liveRelayJson?.previousMpesaBalance,
              updatedMpesaBalance: liveRelayJson?.updatedMpesaBalance,
              amountKes: exactAmountKes,
            };
          }
        } catch {
          // ignore fallback network error
        }
      }

      return { success: false, amountKes: exactAmountKes };
    };

    const syncPromise = executeSync().finally(() => {
      candidateKeys.forEach((k) => inFlightOneAppWithdrawals.delete(k));
    });
    candidateKeys.forEach((k) => inFlightOneAppWithdrawals.set(k, syncPromise));

    return await syncPromise;
  }

  public async fetchUserWithdrawals(
    user: UserAuthProfile | null | undefined
  ): Promise<WithdrawalRecord[] | null> {
    if (!this.config || !user?.email) return null;
    const fin = await this.fetchUserFinancials(user);
    if (!fin || !Array.isArray(fin.transactions)) return [];
    return fin.transactions
      .filter((t) => t.type === 'WITHDRAWAL')
      .map((t) => ({
        id: t.id,
        userEmail: user.email,
        sourceAccount: t.accountNumber || 'VTM Wallet',
        amountUsd: Math.abs(t.amount),
        method: t.method || 'M-PESA',
        reference: t.reference || t.id,
        status: (t.status as any) || 'COMPLETED',
        createdAt: t.timestamp || Date.now(),
      }));
  }

  // =========================================================================
  // 6. SETTINGS & PREFERENCES (Backed by user_activities JSONB)
  // =========================================================================

  public async saveUserSettings(
    user: UserAuthProfile | null | undefined,
    settings: UserPlatformSettings
  ): Promise<boolean> {
    if (!user?.email) return false;
    const cleanEmail = user.email.trim().toLowerCase();
    const nowTs = settings.updatedAt || Date.now();
    const payload: UserPlatformSettings = {
      ...settings,
      updatedAt: nowTs,
    };
    try {
      localStorage.setItem(`vtm_user_settings_${cleanEmail}`, JSON.stringify(payload));
      localStorage.setItem('vtm_theme_mode', payload.isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
    if (!this.config) return false;
    return await this.saveCloudStateRecord(
      cleanEmail,
      'STATE_SETTINGS',
      'Updated user platform settings',
      payload
    );
  }

  public async fetchUserSettings(
    user: UserAuthProfile | null | undefined
  ): Promise<UserPlatformSettings | null> {
    if (!user?.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();
    let localCached: UserPlatformSettings | null = null;
    try {
      const raw = localStorage.getItem(`vtm_user_settings_${cleanEmail}`);
      if (raw) {
        localCached = JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    if (!this.config) return localCached;
    const remote = await this.fetchCloudStateRecord<UserPlatformSettings>(cleanEmail, 'STATE_SETTINGS');
    if (localCached && remote) {
      if ((localCached.updatedAt || 0) >= (remote.updatedAt || 0) || Date.now() - (localCached.updatedAt || 0) < 15000) {
        // Local settings are newer or recently updated; push to cloud asynchronously and return authoritative local settings
        this.saveCloudStateRecord(cleanEmail, 'STATE_SETTINGS', 'Updated user platform settings', localCached).catch(() => {});
        return localCached;
      }
      try {
        localStorage.setItem(`vtm_user_settings_${cleanEmail}`, JSON.stringify(remote));
        if (remote.isDarkMode !== undefined) {
          localStorage.setItem('vtm_theme_mode', remote.isDarkMode ? 'dark' : 'light');
        }
      } catch {
        // ignore
      }
      return remote;
    }
    return localCached || remote;
  }

  // =========================================================================
  // 7. INTERNAL TRANSFERS
  // =========================================================================

  public async saveTransfer(
    user: UserAuthProfile | null | undefined,
    transfer: {
      fromAccount: string;
      toAccount: string;
      amountUsd: number;
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.syncActivity(user, {
      type: 'TRANSFER',
      description: `Internal transfer of $${transfer.amountUsd.toFixed(2)} from ${transfer.fromAccount} to ${transfer.toAccount}`,
      metadata: transfer,
    });
  }

  // =========================================================================
  // 8. TRANSACTIONS & FINANCIAL STATE (vtm_user_finances)
  // =========================================================================

  public async syncUserFinancials(
    user: UserAuthProfile | null | undefined,
    state: UserFinancialState
  ): Promise<boolean> {
    if (!this.config || !user || !this.getSessionToken()) return false;
    const cleanEmail = (user.email || getUserStorageKey(user)).trim().toLowerCase();
    const userKey = getUserStorageKey(user);

    try {
      const deletedAccountNums = getDeletedAccountNumbers(cleanEmail);
      const accountMap = new Map<string, TradingAccount>();

      // High-resolution timestamps for incoming update
      const nowMs = Date.now();
      const incomingClientMs = state.lastUpdated
        ? (typeof state.lastUpdated === 'number' ? state.lastUpdated : new Date(state.lastUpdated).getTime())
        : nowMs;

      let cloudLastUpdatedMs = 0;
      let cloudWalletBalance: number | undefined = undefined;
      let cloudTransactions: Transaction[] = [];

      // Build OR query clauses
      const orClauses = [`user_key.eq.${encodeURIComponent(userKey)}`];
      if (cleanEmail) {
        orClauses.push(`user_email.eq.${encodeURIComponent(cleanEmail)}`);
      }
      if (user.id && this.isValidUuid(user.id)) {
        orClauses.push(`user_key.eq.${encodeURIComponent(user.id)}`);
      }

      // Fetch current cloud accounts, transactions, and high-resolution last_updated timestamp to prevent stale state drift
      try {
        const existingRes = await this.proxyRest(
          `vtm_user_finances?or=(${orClauses.join(',')})&select=accounts,wallet_balance,transactions,last_updated&order=last_updated.desc`,
          { method: 'GET' },
          4000
        );
        if (existingRes.ok) {
          const existingRows = await existingRes.json();
          if (Array.isArray(existingRows) && existingRows.length > 0) {
            for (const row of existingRows) {
              if (row?.last_updated) {
                const rowTime = new Date(row.last_updated).getTime();
                if (!isNaN(rowTime) && rowTime > cloudLastUpdatedMs) {
                  cloudLastUpdatedMs = rowTime;
                }
              }
              if (typeof row?.wallet_balance === 'number' && !isNaN(row.wallet_balance)) {
                if (
                  cloudWalletBalance === undefined ||
                  (row.last_updated && new Date(row.last_updated).getTime() >= cloudLastUpdatedMs)
                ) {
                  cloudWalletBalance = row.wallet_balance;
                }
              }
              if (Array.isArray(row?.transactions)) {
                cloudTransactions = mergeTransactionLists(cloudTransactions, row.transactions);
              }
              if (Array.isArray(row?.accounts)) {
                for (const acc of row.accounts) {
                  if (!acc) continue;
                  const accNum = String(acc.accountNumber || '');
                  if (accNum && deletedAccountNums.has(accNum)) continue;
                  const k = accNum || acc.id;
                  if (k) {
                    const prev = accountMap.get(k);
                    accountMap.set(k, prev ? pickAuthoritativeAccount(prev, acc, false) : acc);
                  }
                }
              }
            }
          }
        }
      } catch {
        // Proceed with incoming accounts if read times out
      }

      // Check if cloud state is strictly newer than incoming client update snapshot
      const isCloudNewer = cloudLastUpdatedMs > incomingClientMs + 1000; // 1 second tolerance

      // Apply incoming accounts
      if (Array.isArray(state.accounts)) {
        for (const acc of state.accounts) {
          if (!acc) continue;
          const accNum = String(acc.accountNumber || '');
          if (accNum && deletedAccountNums.has(accNum)) continue;
          const k = accNum || acc.id;
          if (k) {
            const prev = accountMap.get(k);
            if (prev) {
              if (isSkeletonZeroAccount(acc) && !isSkeletonZeroAccount(prev)) {
                accountMap.set(k, prev);
              } else if (isCloudNewer && !isSkeletonZeroAccount(prev)) {
                accountMap.set(k, pickAuthoritativeAccount(prev, acc, false));
              } else {
                accountMap.set(k, pickAuthoritativeAccount(prev, acc, true));
              }
            } else {
              accountMap.set(k, acc);
            }
          }
        }
      }

      const mergedAccounts = Array.from(accountMap.values());
      const mergedTransactions = mergeTransactionLists(
        isCloudNewer ? cloudTransactions : state.transactions,
        isCloudNewer ? state.transactions : cloudTransactions
      );
      const incomingWallet = Number((state.walletBalance || 0).toFixed(2));
      const baseWallet =
        isCloudNewer && typeof cloudWalletBalance === 'number' && !isNaN(cloudWalletBalance)
          ? Number(cloudWalletBalance.toFixed(2))
          : incomingWallet;
      const finalWalletBalance = reconcileWalletBalanceWithTransactions(
        baseWallet,
        mergedTransactions,
        mergedAccounts
      );

      // Winning high-resolution ISO timestamp
      const winningMs = Math.max(nowMs, cloudLastUpdatedMs);
      const winningIso = new Date(winningMs).toISOString();
      const cappedMergedTxs = mergedTransactions.slice(0, 100);

      const payload = {
        user_key: userKey,
        user_email: cleanEmail,
        user_name: user.name || '',
        wallet_balance: finalWalletBalance,
        accounts: mergedAccounts,
        selected_account_id: state.selectedAccountId || mergedAccounts[0]?.id || null,
        transactions: cappedMergedTxs,
        last_updated: winningIso,
      };

      // Persist financials to Server Platform DB (/api/platform-db)
      fetch('/api/platform-db', {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'upsert_finances',
          email: cleanEmail,
          finances: {
            walletBalance: finalWalletBalance,
            accounts: mergedAccounts,
            selectedAccountId: state.selectedAccountId || mergedAccounts[0]?.id || null,
            transactions: cappedMergedTxs,
            lastUpdated: winningMs,
          },
        }),
      }).catch(() => {});

      if (this.isQuotaRestricted()) {
        return true;
      }

      // Atomic UPSERT using on_conflict=user_key and Prefer: resolution=merge-duplicates
      const res = await this.proxyRest(
        'vtm_user_finances?on_conflict=user_key',
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(payload),
        },
        6000
      );

      if (this.checkResponseQuota(res)) return true;

      // Always patch any matching rows so user_email, user_key, and user.id stay 100% in sync
      if (cleanEmail) {
        await this.proxyRest(
          `vtm_user_finances?or=(${orClauses.join(',')})`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_email: cleanEmail,
              user_name: user.name || '',
              wallet_balance: finalWalletBalance,
              accounts: mergedAccounts,
              selected_account_id: state.selectedAccountId || mergedAccounts[0]?.id || null,
              transactions: cappedMergedTxs,
              last_updated: winningIso,
            }),
          },
          5000
        ).catch(() => {});
      }

      // Also persist atomically to vtm_cloud_states (STATE_FINANCIALS)
      await this.saveCloudStateRecord(
        cleanEmail,
        'STATE_FINANCIALS',
        `Synchronized ${mergedAccounts.length} trading accounts, balance $${finalWalletBalance}`,
        {
          walletBalance: finalWalletBalance,
          accounts: mergedAccounts,
          selectedAccountId: state.selectedAccountId,
          transactions: mergedTransactions.slice(0, 150),
          lastUpdated: winningIso,
          updatedAt: winningMs,
        }
      );

      return true;
    } catch (err) {
      console.warn('Supabase financials sync notice:', err);
      return true;
    }
  }

  public async fetchUserFinancials(
    user: UserAuthProfile | null | undefined
  ): Promise<UserFinancialState | null> {
    if (!this.config || !user) return null;
    if (!this.getSessionToken()) return loadUserFinancials(user);
    const isAdmin = user.role === 'admin';
    const cleanEmail = (user.email || getUserStorageKey(user)).trim().toLowerCase();
    const userKey = getUserStorageKey(user);

    try {
      const orClauses = [`user_key.eq.${encodeURIComponent(userKey)}`];
      if (cleanEmail) {
        orClauses.push(`user_email.eq.${encodeURIComponent(cleanEmail)}`);
      }
      if (user.id && this.isValidUuid(user.id)) {
        orClauses.push(`user_key.eq.${encodeURIComponent(user.id)}`);
      }
      const filter = `or=(${orClauses.join(',')})`;

      const [res, actRes] = await Promise.all([
        this.proxyRest(
          `vtm_user_finances?${filter}&select=*&order=last_updated.desc`,
          { method: 'GET' },
          5000
        ),
        cleanEmail && !isAdmin
          ? this.proxyRest(
              `user_activities?user_email=eq.${encodeURIComponent(
                cleanEmail
              )}&activity_type=in.(ACCOUNT_CREATED,OPEN_ACCOUNT,ACCOUNT_DELETED,DEPOSIT,WITHDRAWAL,WITHDRAWAL_COMPLETED,TRANSFER,INTERNAL_TRANSFER)&select=activity_type,description,metadata,created_at&order=created_at.asc&limit=250`,
              { method: 'GET' },
              4000
            ).catch(() => null)
          : Promise.resolve(null),
      ]);

      const deletedAccountNums = getDeletedAccountNumbers(cleanEmail);
      const actRows = actRes && actRes.ok ? await actRes.json() : [];
      if (Array.isArray(actRows)) {
        for (const act of actRows) {
          if (act && act.activity_type === 'ACCOUNT_DELETED' && !act.metadata?.silent) {
            const accNum = act.metadata?.accountNumber;
            if (accNum) {
              deletedAccountNums.add(String(accNum));
              markAccountDeletedLocally(cleanEmail, String(accNum));
            }
          }
        }
      }

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          const accountMap = new Map<string, TradingAccount>();

          // Collect all non-deleted accounts across all rows (using authoritative balance/timestamp check)
          for (const r of rows) {
            if (Array.isArray(r?.accounts)) {
              for (const acc of r.accounts) {
                if (!acc) continue;
                const accNum = String(acc.accountNumber || '');
                if (accNum && deletedAccountNums.has(accNum)) continue;
                const k = accNum || acc.id;
                if (k) {
                  const prev = accountMap.get(k);
                  accountMap.set(k, prev ? pickAuthoritativeAccount(prev, acc, false) : acc);
                }
              }
            }
          }

          // Only recover created accounts from user_activities if vtm_user_finances had zero accounts
          if (accountMap.size === 0 && Array.isArray(actRows) && !isAdmin) {
            for (const act of actRows) {
              if (
                (act?.activity_type === 'ACCOUNT_CREATED' || act?.activity_type === 'OPEN_ACCOUNT') &&
                act.metadata?.accountNumber
              ) {
                const accNum = String(act.metadata.accountNumber);
                if (!deletedAccountNums.has(accNum) && !accountMap.has(accNum)) {
                  const isDemo = String(act.metadata.type || '').toLowerCase() === 'demo';
                  const bal = isDemo ? 100000 : Number(act.metadata.balance || 0);
                  accountMap.set(accNum, {
                    id: `acc-${accNum}`,
                    accountNumber: accNum,
                    server: isDemo ? 'VTMarkets-DemoServer' : 'VTMarkets-LiveServer1',
                    type: isDemo ? 'Demo' : 'Live',
                    tier: act.metadata.tier || 'Standard',
                    balance: bal,
                    equity: bal,
                    margin: 0,
                    freeMargin: bal,
                    marginLevel: 0,
                    currency: act.metadata.currency || 'USD',
                    leverage: act.metadata.leverage || '1:500',
                    createdAt: act.created_at ? new Date(act.created_at).getTime() : Date.now(),
                  });
                }
              }
            }
          }

          const filteredAccounts = Array.from(accountMap.values());

          // Collect and deduplicate all transactions across all rows for this user
          let cleanTxs: Transaction[] = [];
          for (const r of rows) {
            if (Array.isArray(r.transactions)) {
              cleanTxs = mergeTransactionLists(cleanTxs, r.transactions);
            }
          }
          const newestRowWallet = Number(row.wallet_balance || 0);
          const authoritativeWallet = reconcileWalletBalanceWithTransactions(
            newestRowWallet,
            cleanTxs,
            filteredAccounts
          );

          if (authoritativeWallet !== newestRowWallet) {
            // Heal database in background so all rows reflect the exact reconciled balance
            this.proxyRest(
              `vtm_user_finances?or=(${orClauses.join(',')})`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  wallet_balance: authoritativeWallet,
                  last_updated: new Date().toISOString(),
                }),
              },
              4000
            ).catch(() => {});
          }

          const rawState: UserFinancialState = {
            walletBalance: authoritativeWallet,
            accounts: filteredAccounts,
            selectedAccountId: row.selected_account_id || filteredAccounts[0]?.id || null,
            transactions: cleanTxs,
            lastUpdated: row.last_updated ? new Date(row.last_updated).getTime() : Date.now(),
          };
          return rawState;
        }
      } else {
        this.checkResponseQuota(res);
      }
    } catch (e) {
      console.warn('Could not fetch financials from Supabase:', e);
    }

    // Fallback to Server Platform DB (/api/platform-db) and local storage
    try {
      const srvRes = await fetch(`/api/platform-db?email=${encodeURIComponent(cleanEmail)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(3500),
      });
      if (srvRes.ok) {
        const srvJson = await srvRes.json();
        if (srvJson?.ok && srvJson.finances) {
          return srvJson.finances as UserFinancialState;
        }
      }
    } catch {}

    return loadUserFinancials(user);
  }

  public async syncTransactions(
    user: UserAuthProfile | null | undefined,
    transactions: Transaction[]
  ): Promise<boolean> {
    if (!this.config || !user?.email || !transactions || !this.getSessionToken()) return false;
    const cleanEmail = (user.email || getUserStorageKey(user)).trim().toLowerCase();
    const userKey = getUserStorageKey(user);
    try {
      const orClauses = [
        `user_key.eq.${encodeURIComponent(userKey)}`,
        `user_email.eq.${encodeURIComponent(cleanEmail)}`,
      ];
      if (user.id && this.isValidUuid(user.id)) {
        orClauses.push(`user_key.eq.${encodeURIComponent(user.id)}`);
      }
      const res = await this.proxyRest(
        `vtm_user_finances?or=(${orClauses.join(',')})`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactions: Array.isArray(transactions) ? transactions.slice(0, 100) : [],
            last_updated: new Date().toISOString(),
          }),
        },
        5000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async syncNotifications(
    user: UserAuthProfile | null | undefined,
    notifications: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>,
    lastWelcomeDate?: string
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.saveCloudStateRecord(
      user.email,
      'STATE_NOTIFICATIONS',
      `Synchronized ${notifications.length} user notifications`,
      {
        notifications: notifications.slice(0, 500),
        lastWelcomeDate: lastWelcomeDate || '',
        updatedAt: Date.now(),
      }
    );
  }

  public async fetchNotifications(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    notifications: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>;
    lastWelcomeDate?: string;
    updatedAt?: number;
  } | null> {
    if (!this.config || !user?.email) return null;
    const state = await this.fetchCloudStateRecord<{
      notifications?: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>;
      lastWelcomeDate?: string;
      updatedAt?: number;
    }>(user.email, 'STATE_NOTIFICATIONS');
    if (state && Array.isArray(state.notifications)) {
      return {
        notifications: state.notifications,
        lastWelcomeDate: state.lastWelcomeDate || '',
        updatedAt: state.updatedAt || 0,
      };
    }
    return null;
  }

  // =========================================================================
  // 9. AUDIT ACTIVITIES & DEVICES
  // =========================================================================

  public async syncActivity(
    user: UserAuthProfile | null | undefined,
    activity: any
  ): Promise<boolean> {
    if (!this.config || !user || !this.getSessionToken()) return false;
    try {
      const payload = {
        user_email: String(user.email || user.accountNumber || 'trader').trim().toLowerCase(),
        activity_type: String(activity?.type || 'EVENT'),
        description: String(activity?.description || ''),
        device_id: typeof navigator !== 'undefined' ? `${navigator.platform || 'web'}` : 'web',
        metadata: activity?.metadata || {},
        created_at: this.toIsoTimestamp(activity?.timestamp),
      };

      const res = await this.proxyRest(
        'user_activities',
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        },
        4000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async syncDevice(user: UserAuthProfile | null | undefined): Promise<boolean> {
    if (!this.config || !user || !user.email || !this.getSessionToken()) return false;
    try {
      const cleanEmail = user.email.trim().toLowerCase();
      const deviceId =
        localStorage.getItem('vtm_device_id') ||
        (() => {
          const gen = 'dev-' + Math.random().toString(36).substring(2, 10);
          localStorage.setItem('vtm_device_id', gen);
          return gen;
        })();

      const payload = {
        user_email: cleanEmail,
        device_id: deviceId,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        browser: navigator.userAgent.slice(0, 50),
        os: navigator.platform || 'unknown',
        last_active_at: new Date().toISOString(),
      };

      const res = await this.proxyRest(
        'user_devices?on_conflict=user_email,device_id',
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(payload),
        },
        4000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // 9B. CLOUD REFERRAL & COMMISSION SYNC / CLAIM PERSISTENCE
  // =========================================================================

  public async resolveReferrerByCodeFromCloud(
    referralCode: string
  ): Promise<{ email: string; accountNumber?: string } | null> {
    if (!this.config || !referralCode || this.isQuotaRestricted()) return null;
    const cleanCode = referralCode.trim().toUpperCase();
    if (!cleanCode) return null;

    try {
      const res = await this.proxyPost(
        { action: 'resolve_referrer', code: cleanCode },
        5500,
        false
      );
      this.checkResponseQuota(res);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.referrer?.email) {
          return {
            email: String(data.referrer.email).trim().toLowerCase(),
            accountNumber: data.referrer.accountNumber
              ? String(data.referrer.accountNumber)
              : undefined,
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public async fetchCloudReferralsForUser(
    userEmail: string,
    acceptedCodes: string[]
  ): Promise<{
    referrerAccountNumber?: string;
    cloudReferrals: Array<{
      id: string;
      referrerEmail: string;
      referrerCode: string;
      referredEmail: string;
      referredName: string;
      referredAccountNumber: string;
      totalDepositedUsd: number;
      totalCommissionUsd: number;
      status: 'ACTIVE' | 'INACTIVE';
      createdAt: number;
      lastDepositAt?: number;
      firstDepositReference?: string;
    }>;
    cloudClaims: Array<{
      id: string;
      referrerEmail: string;
      amountUsd: number;
      claimedAt: number;
      status: 'COMPLETED';
      walletTxReference: string;
    }>;
    cloudStateData: any;
  } | null> {
    if (!this.config || !userEmail || this.isQuotaRestricted() || !this.getSessionToken()) return null;
    const cleanEmail = userEmail.trim().toLowerCase();
    const uniqueCodes = Array.from(
      new Set(
        (acceptedCodes || [])
          .map((c) => String(c || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    const codeSet = new Set(uniqueCodes);

    try {
      const res = await this.proxyPost(
        {
          action: 'fetch_referral_dashboard',
          acceptedCodes: uniqueCodes,
        },
        9500,
        true
      );
      this.checkResponseQuota(res);
      if (!res.ok) return null;

      const dash = await res.json().catch(() => null);
      if (!dash || !dash.ok) return null;

      const referrerAccountNumber = dash.referrerAccountNumber
        ? String(dash.referrerAccountNumber)
        : undefined;
      const cloudStateData = dash.cloudStateData || null;
      const regRows = Array.isArray(dash.regRows) ? dash.regRows : [];
      const actRows = Array.isArray(dash.actRows) ? dash.actRows : [];
      const tblRows = Array.isArray(dash.tblRows) ? dash.tblRows : [];
      const rawClaimRows = Array.isArray(dash.claimRows) ? dash.claimRows : [];
      const selfFinRows = Array.isArray(dash.selfFinRows) ? dash.selfFinRows : [];
      const referredFinRows = Array.isArray(dash.referredFinRows) ? dash.referredFinRows : [];

      // Expand codeSet if self's authoritative account_number yields another code
      if (referrerAccountNumber) {
        const cleanAccDigits = referrerAccountNumber.replace(/\D/g, '');
        if (cleanAccDigits.length >= 4) {
          codeSet.add(`VTM-${cleanAccDigits.slice(-6)}`);
        }
      }

      const mergedByEmail = new Map<
        string,
        {
          id: string;
          referrerEmail: string;
          referrerCode: string;
          referredEmail: string;
          referredName: string;
          referredAccountNumber: string;
          totalDepositedUsd: number;
          totalCommissionUsd: number;
          status: 'ACTIVE' | 'INACTIVE';
          createdAt: number;
          lastDepositAt?: number;
          firstDepositReference?: string;
        }
      >();

      if (Array.isArray(regRows)) {
        for (const r of regRows) {
          const refEmail = String(r?.email || '').trim().toLowerCase();
          if (!refEmail || refEmail === cleanEmail) continue;
          const refCode = String(r?.referred_by_code || uniqueCodes[0] || '').trim().toUpperCase();
          const createdTs = r?.created_at ? new Date(r.created_at).getTime() : Date.now();
          mergedByEmail.set(refEmail, {
            id: `ref-${r?.uid || refEmail}`,
            referrerEmail: cleanEmail,
            referrerCode: refCode,
            referredEmail: refEmail,
            referredName: String(r?.name || refEmail.split('@')[0] || 'Referred Trader'),
            referredAccountNumber: String(r?.account_number || '8842-1001'),
            totalDepositedUsd: 0,
            totalCommissionUsd: 0,
            status: 'ACTIVE',
            createdAt: Number.isFinite(createdTs) && createdTs > 0 ? createdTs : Date.now(),
          });
        }
      }

      if (Array.isArray(actRows)) {
        for (const a of actRows) {
          const refEmail = String(a?.user_email || '').trim().toLowerCase();
          const metaCode = String(a?.metadata?.referredByCode || '').trim().toUpperCase();
          if (!refEmail || refEmail === cleanEmail || !metaCode || !codeSet.has(metaCode)) continue;
          if (!mergedByEmail.has(refEmail)) {
            const createdTs = a?.created_at ? new Date(a.created_at).getTime() : Date.now();
            mergedByEmail.set(refEmail, {
              id: `ref-act-${refEmail}`,
              referrerEmail: cleanEmail,
              referrerCode: metaCode,
              referredEmail: refEmail,
              referredName: String(a?.metadata?.name || refEmail.split('@')[0] || 'Referred Trader'),
              referredAccountNumber: String(a?.metadata?.accountNumber || '8842-1001'),
              totalDepositedUsd: 0,
              totalCommissionUsd: 0,
              status: 'ACTIVE',
              createdAt: Number.isFinite(createdTs) && createdTs > 0 ? createdTs : Date.now(),
            });
          }
        }
      }

      if (Array.isArray(tblRows)) {
        for (const row of tblRows) {
          const refEmail = String(row?.referred_email || '').trim().toLowerCase();
          if (!refEmail || refEmail === cleanEmail) continue;
          const existing = mergedByEmail.get(refEmail);
          const depUsd = Number(Number(row?.total_deposited_usd || 0).toFixed(2));
          const commUsd = Number((depUsd * 0.05).toFixed(2));
          const createdTs = row?.created_at ? new Date(row.created_at).getTime() : Date.now();
          if (!existing) {
            mergedByEmail.set(refEmail, {
              id: String(row?.id || `ref-${refEmail}`),
              referrerEmail: cleanEmail,
              referrerCode: String(row?.referrer_code || uniqueCodes[0] || '').trim().toUpperCase(),
              referredEmail: refEmail,
              referredName: String(row?.referred_name || refEmail.split('@')[0] || 'Referred Trader'),
              referredAccountNumber: String(row?.referred_account_number || '8842-1001'),
              totalDepositedUsd: depUsd,
              totalCommissionUsd: commUsd,
              status: row?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              createdAt: Number.isFinite(createdTs) && createdTs > 0 ? createdTs : Date.now(),
            });
          } else if (depUsd > existing.totalDepositedUsd) {
            existing.totalDepositedUsd = depUsd;
            existing.totalCommissionUsd = Number((depUsd * 0.05).toFixed(2));
          }
        }
      }

      if (cloudStateData && Array.isArray(cloudStateData.referrals)) {
        for (const r of cloudStateData.referrals) {
          const refEmail = String(r?.referredEmail || '').trim().toLowerCase();
          if (!refEmail || refEmail === cleanEmail) continue;
          const existing = mergedByEmail.get(refEmail);
          const depUsd = Number(Number(r?.totalDepositedUsd || 0).toFixed(2));
          if (!existing) {
            mergedByEmail.set(refEmail, {
              id: String(r?.id || `ref-cs-${refEmail}`),
              referrerEmail: cleanEmail,
              referrerCode: String(r?.referrerCode || uniqueCodes[0] || '').trim().toUpperCase(),
              referredEmail: refEmail,
              referredName: String(r?.referredName || refEmail.split('@')[0] || 'Referred Trader'),
              referredAccountNumber: String(r?.referredAccountNumber || '8842-1001'),
              totalDepositedUsd: depUsd,
              totalCommissionUsd: Number((depUsd * 0.05).toFixed(2)),
              status: r?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              createdAt: Number(r?.createdAt) || Date.now(),
              lastDepositAt: r?.lastDepositAt ? Number(r.lastDepositAt) : undefined,
            });
          } else if (existing.totalDepositedUsd <= 0 && depUsd > 0) {
            existing.totalDepositedUsd = depUsd;
            existing.totalCommissionUsd = Number((depUsd * 0.05).toFixed(2));
            if (r?.lastDepositAt) existing.lastDepositAt = Number(r.lastDepositAt);
          }
        }
      }

      // Apply first completed deposits from server-scoped referredFinRows
      for (const f of referredFinRows) {
        const fEmail = String(f?.user_email || '').trim().toLowerCase();
        const entry = mergedByEmail.get(fEmail);
        if (!entry) continue;
        const txs = Array.isArray(f?.transactions) ? f.transactions : [];
        const completedDeposits = txs
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
          const firstDep = completedDeposits[0];
          const firstAmt = Number(Number(firstDep.amount).toFixed(2));
          entry.totalDepositedUsd = firstAmt;
          entry.totalCommissionUsd = Number((firstAmt * 0.05).toFixed(2));
          entry.lastDepositAt = Number(firstDep.timestamp) || entry.lastDepositAt || Date.now();
          if (firstDep.reference) {
            entry.firstDepositReference = String(firstDep.reference);
          }
        }
      }

      // Collect all claims from vtm_referral_claims, STATE_REFERRALS, and referrer's own wallet transactions
      const claimsByRef = new Map<
        string,
        {
          id: string;
          referrerEmail: string;
          amountUsd: number;
          claimedAt: number;
          status: 'COMPLETED';
          walletTxReference: string;
        }
      >();

      if (Array.isArray(rawClaimRows)) {
        for (const c of rawClaimRows) {
          const refKey = String(c?.wallet_tx_reference || c?.id || '').trim();
          const amt = Number(Number(c?.amount_claimed_usd || 0).toFixed(2));
          if (!refKey || amt <= 0) continue;
          const ts = c?.claimed_at ? new Date(c.claimed_at).getTime() : Date.now();
          claimsByRef.set(refKey, {
            id: String(c?.id || `claim-${refKey}`),
            referrerEmail: cleanEmail,
            amountUsd: amt,
            claimedAt: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
            status: 'COMPLETED',
            walletTxReference: refKey,
          });
        }
      }

      if (cloudStateData && Array.isArray(cloudStateData.claims)) {
        for (const c of cloudStateData.claims) {
          const refKey = String(c?.walletTxReference || c?.id || '').trim();
          const amt = Number(Number(c?.amountUsd || 0).toFixed(2));
          if (!refKey || amt <= 0 || claimsByRef.has(refKey)) continue;
          claimsByRef.set(refKey, {
            id: String(c?.id || `claim-${refKey}`),
            referrerEmail: cleanEmail,
            amountUsd: amt,
            claimedAt: Number(c?.claimedAt) || Date.now(),
            status: 'COMPLETED',
            walletTxReference: refKey,
          });
        }
      }

      if (Array.isArray(selfFinRows)) {
        for (const sf of selfFinRows) {
          const txs = Array.isArray(sf?.transactions) ? sf.transactions : [];
          for (const tx of txs) {
            if (!tx || tx.type !== 'DEPOSIT') continue;
            const methodStr = String(tx.method || '');
            const refStr = String(tx.reference || '');
            const isRefClaimTx =
              /referral/i.test(methodStr) ||
              refStr.startsWith('REF-COMM-') ||
              refStr.startsWith('REF-CLAIM-');
            if (!isRefClaimTx) continue;
            const refKey = refStr || String(tx.id || '');
            const amt = Number(Number(tx.amount || 0).toFixed(2));
            if (!refKey || amt <= 0 || claimsByRef.has(refKey)) continue;
            claimsByRef.set(refKey, {
              id: String(tx.id || `claim-${refKey}`),
              referrerEmail: cleanEmail,
              amountUsd: amt,
              claimedAt: Number(tx.timestamp) || Date.now(),
              status: 'COMPLETED',
              walletTxReference: refKey,
            });
          }
        }
      }

      const cloudReferrals = Array.from(mergedByEmail.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      const cloudClaims = Array.from(claimsByRef.values()).sort(
        (a, b) => b.claimedAt - a.claimedAt
      );

      return {
        referrerAccountNumber,
        cloudReferrals,
        cloudClaims,
        cloudStateData,
      };
    } catch {
      return null;
    }
  }

  public async syncCloudReferralsBatch(
    referrerEmail: string,
    referrerCode: string,
    referrals: Array<{
      referredEmail: string;
      referredName: string;
      referredAccountNumber: string;
      totalDepositedUsd: number;
      totalCommissionUsd: number;
      createdAt: number;
      lastDepositAt?: number;
    }>,
    fullStateSnapshot?: any
  ): Promise<boolean> {
    if (!this.config || !referrerEmail || this.isQuotaRestricted() || !this.getSessionToken()) return false;
    const cleanEmail = referrerEmail.trim().toLowerCase();
    const cleanCode = (referrerCode || 'VTM-GLOBAL').trim().toUpperCase();

    try {
      if (Array.isArray(referrals) && referrals.length > 0) {
        const rows = referrals.slice(0, 500).map((r) => ({
          referrer_email: cleanEmail,
          referrer_code: cleanCode,
          referred_email: String(r.referredEmail || '').trim().toLowerCase(),
          referred_name: String(r.referredName || 'Referred Trader'),
          referred_account_number: String(r.referredAccountNumber || ''),
          total_deposited_usd: Number(Number(r.totalDepositedUsd || 0).toFixed(2)),
          total_commission_usd: Number(Number(r.totalCommissionUsd || 0).toFixed(2)),
          status: 'ACTIVE',
          created_at: new Date(r.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const res = await this.proxyRest(
          'vtm_referrals?on_conflict=referrer_email,referred_email',
          {
            method: 'POST',
            headers: {
              ...this.getHeaders(),
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(rows),
          },
          6000
        );
        this.checkResponseQuota(res);
      }

      if (fullStateSnapshot) {
        await this.saveCloudStateRecord(
          cleanEmail,
          'STATE_REFERRALS',
          'Synced referral network state',
          fullStateSnapshot
        );
      }
      return true;
    } catch {
      return false;
    }
  }

  public async recordReferralSignupInCloud(
    referrerCode: string,
    referrerEmail: string | null,
    newUser: { email: string; name: string; accountNumber?: string }
  ): Promise<boolean> {
    if (!this.config || !referrerCode || !newUser.email || this.isQuotaRestricted() || !this.getSessionToken()) return false;
    const cleanCode = referrerCode.trim().toUpperCase();
    const cleanNewEmail = newUser.email.trim().toLowerCase();

    try {
      let resolvedEmail = referrerEmail ? referrerEmail.trim().toLowerCase() : null;
      if (!resolvedEmail) {
        const resolved = await this.resolveReferrerByCodeFromCloud(cleanCode);
        if (resolved) resolvedEmail = resolved.email;
      }
      if (!resolvedEmail || resolvedEmail === cleanNewEmail) return false;

      const res = await this.proxyRest(
        'vtm_referrals?on_conflict=referrer_email,referred_email',
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            referrer_email: resolvedEmail,
            referrer_code: cleanCode,
            referred_email: cleanNewEmail,
            referred_name: newUser.name.trim() || 'Referred Trader',
            referred_account_number: newUser.accountNumber || '',
            total_deposited_usd: 0,
            total_commission_usd: 0,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        },
        5000
      );
      this.checkResponseQuota(res);
      return res.ok;
    } catch {
      return false;
    }
  }

  public async saveReferralClaimToCloud(
    claim: {
      referrerEmail: string;
      amountUsd: number;
      walletTxReference: string;
      claimedAt: number;
    },
    fullStateSnapshot?: any
  ): Promise<boolean> {
    if (!this.config || !claim.referrerEmail || !this.getSessionToken()) return false;
    const cleanEmail = claim.referrerEmail.trim().toLowerCase();

    let stateSaved = false;
    if (fullStateSnapshot) {
      stateSaved = await this.saveCloudStateRecord(
        cleanEmail,
        'STATE_REFERRALS',
        `Claimed $${claim.amountUsd.toFixed(2)} referral commission`,
        fullStateSnapshot
      ).catch(() => false);
    }

    if (this.isQuotaRestricted()) return stateSaved;

    let claimSaved = false;
    try {
      const res = await this.proxyRest(
        'vtm_referral_claims?on_conflict=wallet_tx_reference',
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            referrer_email: cleanEmail,
            amount_claimed_usd: Number(claim.amountUsd.toFixed(2)),
            wallet_tx_reference: claim.walletTxReference,
            wallet_credited: true,
            status: 'COMPLETED',
            claimed_at: new Date(claim.claimedAt || Date.now()).toISOString(),
          }),
        },
        6000
      );
      this.checkResponseQuota(res);
      claimSaved = res.ok;

      // Mark any pending commission rows as claimed
      await this.proxyRest(
        `vtm_referral_commissions?referrer_email=ilike.${encodeURIComponent(cleanEmail)}&claimed=eq.false`,
        {
          method: 'PATCH',
          headers: {
            ...this.getHeaders(),
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            claimed: true,
            claimed_at: new Date(claim.claimedAt || Date.now()).toISOString(),
          }),
        },
        4000
      ).catch(() => {});
    } catch {
      claimSaved = false;
    }

    return claimSaved || stateSaved;
  }

}

export const supabaseService = new SupabaseService();
