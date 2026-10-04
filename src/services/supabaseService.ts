import { UserFinancialState, getUserStorageKey, sanitizeRealTransactions } from '../utils/financialStorage';
import { TradingAccount, Transaction, Position, PendingOrder, ClosedTrade } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import { calculateBotPnL, sanitizeBotTrades } from './botTradingService';

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
  checkoutId?: string;
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

const STORAGE_SUPABASE_URL_KEY = 'vtm_supabase_url';
const STORAGE_SUPABASE_ANON_KEY = 'vtm_supabase_anon_key';

// Default Production Supabase Configuration - Ensures all devices (mobile phones, tablets, PCs, deployed URLs) connect directly
const DEFAULT_SUPABASE_URL = 'https://seycwqpozegjwpxuewbf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';

class SupabaseService {
  private config: SupabaseConfig | null = null;
  private initPromise: Promise<SupabaseConfig | null> | null = null;

  constructor() {
    this.loadConfig();
    this.initServerConfig().catch(() => {});
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
    if (this.config && this.config.url === DEFAULT_SUPABASE_URL && this.config.anonKey === DEFAULT_SUPABASE_ANON_KEY) {
      return this.config;
    }
    this.config = { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
    return this.config;
  }

  public loadConfig(): SupabaseConfig | null {
    // Always prioritize the authoritative production project so Netlify and mobile browsers never use stale localStorage or broken env vars
    this.config = { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
    try {
      localStorage.setItem(STORAGE_SUPABASE_URL_KEY, DEFAULT_SUPABASE_URL);
      localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_ANON_KEY);
    } catch {
      // ignore
    }
    return this.config;
  }

  public isConfigured(): boolean {
    return !!(this.config && this.config.url && this.config.anonKey);
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public setCredentials(url: string, anonKey: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();
    this.config = { url: cleanUrl, anonKey: cleanKey };
    try {
      localStorage.setItem(STORAGE_SUPABASE_URL_KEY, cleanUrl);
      localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, cleanKey);
    } catch (e) {
      console.error('Failed to store Supabase credentials', e);
    }

    // Persist to server so ALL devices (mobile phones, laptops, other browsers) get the config
    fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
    }).catch(() => {});
  }

  public clearCredentials(): void {
    this.config = null;
    try {
      localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
      localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
    } catch (e) {
      // ignore
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: 'Supabase URL and Anon Key are not configured.' };
    }

    try {
      const res = await fetch(`${this.config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok || res.status === 200 || res.status === 404) {
        return { success: true, message: 'Connected to Supabase endpoint successfully.' };
      }
      return { success: false, message: `Supabase returned HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection timeout or network error' };
    }
  }

  private getHeaders() {
    if (!this.config) return {};
    return {
      'Content-Type': 'application/json',
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      Prefer: 'resolution=merge-duplicates',
    };
  }

  // =========================================================================
  // 1. ACCOUNT CREATION & PROFILES (vtm_registered_users & Supabase Auth)
  // =========================================================================

  private isMasterAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return (
      clean === 'mutwrib@gmail.com' ||
      clean === 'mutwirib964@gmail.com' ||
      clean === 'mutwirib@gmail.com'
    );
  }

  private isValidUuid(val?: string | null): boolean {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  }

  private parseStoredPasswordAndUid(rawHash?: string | null): { uid?: string; password?: string } {
    if (!rawHash) return {};
    if (rawHash.startsWith('uid:')) {
      const pipeIdx = rawHash.indexOf('|');
      if (pipeIdx > 4) {
        const uid = rawHash.slice(4, pipeIdx).trim();
        const password = rawHash.slice(pipeIdx + 1);
        return { uid: this.isValidUuid(uid) ? uid : undefined, password };
      }
    }
    return { password: rawHash };
  }

  public async findUserInDatabase(
    email: string
  ): Promise<{ profile: UserAuthProfile; password?: string; hasVerifiedUid: boolean } | null> {
    if (!this.config || !email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = this.isMasterAdminEmail(cleanEmail);

    try {
      const queryFilter = isAdmin
        ? `or=(email.ilike.mutwrib@gmail.com,email.ilike.mutwirib964@gmail.com,email.ilike.mutwirib@gmail.com)`
        : `email=ilike.${encodeURIComponent(cleanEmail)}`;

      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_registered_users?${queryFilter}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      let rows: any[] = [];
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed)) rows = parsed;
      }

      // Fallback scan if ilike query returned empty due to whitespace or encoding
      if (rows.length === 0) {
        const allRes = await fetch(
          `${this.config.url}/rest/v1/vtm_registered_users?select=*`,
          {
            method: 'GET',
            headers: {
              apikey: this.config.anonKey,
              Authorization: `Bearer ${this.config.anonKey}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (allRes.ok) {
          const allRows = await allRes.json();
          if (Array.isArray(allRows)) {
            rows = allRows.filter((r: any) => {
              if (!r || !r.email) return false;
              const rowEmail = String(r.email).trim().toLowerCase();
              return isAdmin ? this.isMasterAdminEmail(rowEmail) : rowEmail === cleanEmail;
            });
          }
        }
      }

      if (rows.length > 0) {
        const row = rows[0];
        const parsedHash = this.parseStoredPasswordAndUid(row.password_hash);
        let resolvedUid = row.uid || parsedHash.uid || '';

        if (isAdmin) {
          resolvedUid = '84a1e1db-f302-4dac-a077-291128ae0cea';
        }

        // Also check vtm_user_finances if uid wasn't in row yet
        if (!this.isValidUuid(resolvedUid) && !isAdmin) {
          try {
            const finRes = await fetch(
              `${this.config.url}/rest/v1/vtm_user_finances?user_email=ilike.${encodeURIComponent(cleanEmail)}&select=user_key`,
              {
                method: 'GET',
                headers: {
                  apikey: this.config.anonKey,
                  Authorization: `Bearer ${this.config.anonKey}`,
                },
                signal: AbortSignal.timeout(3000),
              }
            );
            if (finRes.ok) {
              const finRows = await finRes.json();
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

        // If the user is registered in vtm_registered_users, guarantee a valid deterministic UUID so they can always sign in
        if (!this.isValidUuid(resolvedUid) && !isAdmin) {
          resolvedUid = this.deterministicUuidFromEmail(cleanEmail);
        }

        const hasVerifiedUid = true;
        // Strict rule: No other email ever gets 'admin' role
        const safeRole = isAdmin
          ? 'admin'
          : row.role === 'marketer'
          ? 'marketer'
          : 'normal';

        const profile: UserAuthProfile = {
          id: resolvedUid,
          name: isAdmin ? 'mutwiri' : row.name || 'Trader',
          email: isAdmin ? cleanEmail : row.email.trim().toLowerCase(),
          phoneNumber: row.phone_number || '',
          phone: row.phone_number || '',
          countryCode: row.country_code || '+254',
          countryName: row.country_name || 'Kenya',
          accountNumber: row.account_number || '27330648',
          role: safeRole,
          isLoggedIn: true,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        };
        return { profile, password: parsedHash.password, hasVerifiedUid };
      }
    } catch (e) {
      console.warn('Could not query vtm_registered_users', e);
    }
    return null;
  }

  public async registerUserInDatabase(
    profile: UserAuthProfile,
    password?: string
  ): Promise<boolean> {
    if (!this.config || !profile.email) return false;
    const cleanEmail = profile.email.trim().toLowerCase();
    const isAdmin = this.isMasterAdminEmail(cleanEmail);
    const verifiedUid = isAdmin
      ? '84a1e1db-f302-4dac-a077-291128ae0cea'
      : this.isValidUuid(profile.id)
      ? profile.id.trim()
      : '';

    // Strict rule: user without a valid UID can NEVER be saved or sign in
    if (!verifiedUid) {
      console.warn('Blocked registration in database: missing valid UID');
      return false;
    }

    // Strict rule: only Master Admin email can ever have role 'admin'
    const safeRole = isAdmin
      ? 'admin'
      : profile.role === 'marketer'
      ? 'marketer'
      : 'normal';

    const encodedPasswordHash = password !== undefined && password !== ''
      ? `uid:${verifiedUid}|${password}`
      : undefined;

    try {
      // Store verified UID inside password_hash (uid:<uuid>|<password>) and upsert on email conflict
      const payload: Record<string, any> = {
        email: cleanEmail,
        name: isAdmin ? 'mutwiri' : profile.name,
        phone_number: profile.phoneNumber || profile.phone || '',
        country_code: profile.countryCode || '+254',
        country_name: profile.countryName || 'Kenya',
        account_number: profile.accountNumber,
        role: safeRole,
        created_at: new Date(profile.createdAt || Date.now()).toISOString(),
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (encodedPasswordHash) {
        payload.password_hash = encodedPasswordHash;
      }

      const res = await fetch(`${this.config.url}/rest/v1/vtm_registered_users?on_conflict=email`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        return true;
      }

      // Fallback PATCH if row already exists
      const patchPayload: Record<string, any> = {
        name: isAdmin ? 'mutwiri' : profile.name,
        phone_number: profile.phoneNumber || profile.phone || '',
        country_code: profile.countryCode || '+254',
        country_name: profile.countryName || 'Kenya',
        account_number: profile.accountNumber,
        role: safeRole,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (encodedPasswordHash) {
        patchPayload.password_hash = encodedPasswordHash;
      }

      const patchRes = await fetch(
        `${this.config.url}/rest/v1/vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          body: JSON.stringify(patchPayload),
          signal: AbortSignal.timeout(6000),
        }
      );

      return patchRes.ok;
    } catch (e) {
      console.warn('Failed to save registered user', e);
      return false;
    }
  }

  public async updateUserLastLoginInDatabase(email: string): Promise<boolean> {
    if (!this.config || !email) return false;

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          body: JSON.stringify({
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(3000),
        }
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
      const isAdmin = this.isMasterAdminEmail(cleanEmail);
      // Strictly forbid any other email from having 'admin' role in Supabase
      const safeRole = isAdmin ? 'admin' : role === 'marketer' ? 'marketer' : 'normal';

      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          body: JSON.stringify({
            role: safeRole,
            updated_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(4000),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Super Admin Cloud Sync: Fetches ALL registered users and ALL user financial states
   * directly from Supabase so the Admin Portal displays exact real-time platform users & money in.
   */
  public async fetchAllPlatformUsersAndFinances(): Promise<{
    users: UserAuthProfile[];
    financesByEmail: Record<string, UserFinancialState>;
  } | null> {
    if (!this.config) return null;

    try {
      const [usersRes, finRes] = await Promise.all([
        fetch(`${this.config.url}/rest/v1/vtm_registered_users?select=*&order=created_at.desc`, {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }),
        fetch(`${this.config.url}/rest/v1/vtm_user_finances?select=*&order=last_updated.desc`, {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }),
      ]);

      const usersRows = usersRes.ok ? await usersRes.json() : [];
      const finRows = finRes.ok ? await finRes.json() : [];

      const financesByEmail: Record<string, UserFinancialState> = {};
      const uidByEmail: Record<string, string> = {};

      if (Array.isArray(finRows)) {
        finRows.forEach((r: any) => {
          const emailKey = (r.user_email || r.user_key || '').trim().toLowerCase();
          if (!emailKey) return;

          if (this.isValidUuid(r.user_key)) {
            uidByEmail[emailKey] = r.user_key.trim();
          }

          const canonicalEmail = this.isMasterAdminEmail(emailKey)
            ? 'mutwirib964@gmail.com'
            : emailKey;

          // Keep the row with non-empty accounts/transactions or newest timestamp
          const existing = financesByEmail[canonicalEmail];
          const incomingState: UserFinancialState = {
            walletBalance: Number(r.wallet_balance || 0),
            accounts: Array.isArray(r.accounts) ? r.accounts : [],
            selectedAccountId: r.selected_account_id || null,
            transactions: sanitizeRealTransactions(Array.isArray(r.transactions) ? r.transactions : []),
            lastUpdated: r.last_updated ? new Date(r.last_updated).getTime() : Date.now(),
          };

          if (
            !existing ||
            (existing.accounts.length === 0 && incomingState.accounts.length > 0) ||
            ((existing.transactions?.length || 0) === 0 && (incomingState.transactions?.length || 0) > 0)
          ) {
            financesByEmail[canonicalEmail] = incomingState;
            if (canonicalEmail !== emailKey) {
              financesByEmail[emailKey] = incomingState;
            }
          }
        });
      }

      const usersMap = new Map<string, UserAuthProfile>();

      if (Array.isArray(usersRows)) {
        usersRows.forEach((row: any) => {
          if (!row || !row.email) return;
          const rawEmail = row.email.trim().toLowerCase();
          const isAdmin = this.isMasterAdminEmail(rawEmail);
          const canonicalEmail = isAdmin ? 'mutwirib964@gmail.com' : rawEmail;
          const parsedHash = this.parseStoredPasswordAndUid(row.password_hash);
          let resolvedUid = isAdmin
            ? '84a1e1db-f302-4dac-a077-291128ae0cea'
            : row.uid || parsedHash.uid || uidByEmail[rawEmail] || '';

          if (!isAdmin && !this.isValidUuid(resolvedUid)) {
            resolvedUid = this.deterministicUuidFromEmail(rawEmail);
          }

          const safeRole = isAdmin
            ? 'admin'
            : row.role === 'marketer'
            ? 'marketer'
            : 'normal';

          usersMap.set(canonicalEmail, {
            id: resolvedUid,
            name: isAdmin ? 'mutwiri' : row.name || 'Trader',
            email: canonicalEmail,
            phoneNumber: row.phone_number || '',
            phone: row.phone_number || '',
            countryCode: row.country_code || '+254',
            countryName: row.country_name || 'Kenya',
            accountNumber: row.account_number || '27330648',
            role: safeRole,
            isLoggedIn: false,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          });
        });
      }

      // Guarantee Master Admin is always present with confirmed UID
      if (!usersMap.has('mutwirib964@gmail.com')) {
        usersMap.set('mutwirib964@gmail.com', {
          id: '84a1e1db-f302-4dac-a077-291128ae0cea',
          name: 'mutwiri',
          email: 'mutwirib964@gmail.com',
          phoneNumber: '+254 741114162',
          phone: '+254 741114162',
          countryCode: '+254',
          countryName: 'Kenya',
          accountNumber: '27330648',
          role: 'admin',
          isLoggedIn: true,
          createdAt: 1790257470000,
        });
      }

      return {
        users: Array.from(usersMap.values()),
        financesByEmail,
      };
    } catch (e) {
      console.warn('Failed to fetch all platform users and finances from Supabase', e);
      return null;
    }
  }

  public async signUpWithSupabaseAuth(
    profile: UserAuthProfile,
    password: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.config || !profile.email) {
      return { success: false, error: 'Database is not configured.' };
    }

    try {
      const cleanEmail = profile.email.trim().toLowerCase();
      const res = await fetch(`${this.config.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          data: {
            display_name: profile.name,
            name: profile.name,
            phone: profile.phoneNumber,
            country_name: profile.countryName,
            account_number: profile.accountNumber,
            role: profile.role || 'normal',
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.msg || json.error_description || json.message || 'Failed. Please try again later.',
        };
      }

      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: 'Failed. Please try again later.' };
    }
  }

  public async signInWithSupabaseAuth(
    email: string,
    password: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.config || !email) {
      return { success: false, error: 'Failed. Please try again later.' };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.anonKey,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
        }),
        signal: AbortSignal.timeout(6000),
      });

      const json = await res.json();
      if (!res.ok) {
        const msg = json.error_description || json.msg || json.message || '';
        if (msg.toLowerCase().includes('invalid login credentials')) {
          return {
            success: false,
            error: 'Invalid email or password. Please try again.',
          };
        }
        return { success: false, error: 'Failed. Please try again later.' };
      }

      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: 'Failed. Please try again later.' };
    }
  }

  // =========================================================================
  // HELPER: RELIABLE CLOUD STATE STORAGE IN SUPABASE (user_activities JSONB)
  // =========================================================================

  private async saveCloudStateRecord(
    userEmail: string,
    stateType: string,
    description: string,
    metadata: any
  ): Promise<boolean> {
    if (!this.config || !userEmail) return false;
    const cleanEmail = this.isMasterAdminEmail(userEmail)
      ? 'mutwirib964@gmail.com'
      : userEmail.trim().toLowerCase();

    try {
      // 1. Check if state record already exists for this user + stateType
      const getRes = await fetch(
        `${this.config.url}/rest/v1/user_activities?user_email=eq.${encodeURIComponent(
          cleanEmail
        )}&activity_type=eq.${encodeURIComponent(stateType)}&select=id&order=created_at.desc&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
          const patchRes = await fetch(
            `${this.config.url}/rest/v1/user_activities?id=eq.${encodeURIComponent(rows[0].id)}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                apikey: this.config.anonKey,
                Authorization: `Bearer ${this.config.anonKey}`,
              },
              body: JSON.stringify({
                description,
                metadata,
                created_at: new Date().toISOString(),
              }),
              signal: AbortSignal.timeout(5000),
            }
          );
          if (patchRes.ok) return true;
        }
      }

      // 2. Insert new state record if none existed yet
      const postRes = await fetch(`${this.config.url}/rest/v1/user_activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
        body: JSON.stringify({
          user_email: cleanEmail,
          activity_type: stateType,
          description,
          device_id: typeof navigator !== 'undefined' ? `${navigator.platform || 'web'}` : 'web',
          metadata,
          created_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });

      return postRes.ok;
    } catch (e) {
      console.warn(`Supabase cloud state save (${stateType}) notice:`, e);
      return false;
    }
  }

  private async fetchCloudStateRecord<T = any>(
    userEmail: string,
    stateType: string
  ): Promise<T | null> {
    if (!this.config || !userEmail) return null;
    const cleanEmail = this.isMasterAdminEmail(userEmail)
      ? 'mutwirib964@gmail.com'
      : userEmail.trim().toLowerCase();

    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/user_activities?user_email=eq.${encodeURIComponent(
          cleanEmail
        )}&activity_type=eq.${encodeURIComponent(stateType)}&select=metadata&order=created_at.desc&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].metadata) {
          return rows[0].metadata as T;
        }
      }
    } catch (e) {
      console.warn(`Supabase cloud state fetch (${stateType}) notice:`, e);
    }
    return null;
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
      const existingAccounts = currentFin?.accounts || [];
      const exists = existingAccounts.some((a) => a.id === account.id || a.accountNumber === account.accountNumber);
      const nextAccounts = exists
        ? existingAccounts.map((a) =>
            a.id === account.id || a.accountNumber === account.accountNumber ? account : a
          )
        : [...existingAccounts, account];

      return await this.syncUserFinancials(user, {
        walletBalance: currentFin?.walletBalance ?? 0,
        accounts: nextAccounts,
        selectedAccountId: currentFin?.selectedAccountId || account.id,
        transactions: currentFin?.transactions || [],
        lastUpdated: Date.now(),
      });
    } catch (e) {
      console.warn('Could not sync trading account to Supabase:', e);
      return false;
    }
  }

  public async syncTradingAccounts(
    user: UserAuthProfile | null | undefined,
    accounts: TradingAccount[]
  ): Promise<boolean> {
    if (!this.config || !user || !accounts) return false;
    try {
      const currentFin = await this.fetchUserFinancials(user);
      return await this.syncUserFinancials(user, {
        walletBalance: currentFin?.walletBalance ?? 0,
        accounts,
        selectedAccountId: currentFin?.selectedAccountId || accounts[0]?.id || null,
        transactions: currentFin?.transactions || [],
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
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;

    // Never overwrite existing cloud closedTrades with an empty array on initial mount/login
    let mergedClosed = Array.isArray(data.closedTrades) ? [...data.closedTrades] : [];
    try {
      const existing = await this.fetchCloudStateRecord<{
        closedTrades?: ClosedTrade[];
      }>(user.email, 'STATE_TRADES');
      if (existing && Array.isArray(existing.closedTrades) && existing.closedTrades.length > 0) {
        const seenTickets = new Set(mergedClosed.map((t) => `${t.ticket}-${t.openTime}`));
        for (const oldTrade of existing.closedTrades) {
          const key = `${oldTrade.ticket}-${oldTrade.openTime}`;
          if (!seenTickets.has(key)) {
            seenTickets.add(key);
            mergedClosed.push(oldTrade);
          }
        }
      }
    } catch {
      // ignore
    }

    mergedClosed.sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));
    const latestClosed = mergedClosed.slice(0, 50);

    return await this.saveCloudStateRecord(
      user.email,
      'STATE_TRADES',
      `Synchronized ${data.positions.length} open positions, ${data.pendingOrders.length} pending orders, ${latestClosed.length} closed trades`,
      {
        positions: data.positions,
        pendingOrders: data.pendingOrders,
        closedTrades: latestClosed,
        accountNumber: data.accountNumber || user.accountNumber || '',
        updatedAt: Date.now(),
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
    const cleanEmail = this.isMasterAdminEmail(user.email)
      ? 'mutwirib964@gmail.com'
      : user.email.trim().toLowerCase();

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
            const exactPnl = calculateBotPnL(ct.symbol, side, openPrice, closePrice, lots);
            closedMap.set(key, {
              ...ct,
              side,
              lots,
              openPrice,
              closePrice,
              pnl: exactPnl,
            });
          }
        }
      }

      // Also query the latest TRADE_CLOSED rows directly from user_activities in Supabase so the latest 20 closed trades are always recovered
      try {
        const res = await fetch(
          `${this.config.url}/rest/v1/user_activities?user_email=ilike.${encodeURIComponent(cleanEmail)}&activity_type=eq.TRADE_CLOSED&select=metadata,created_at&order=created_at.desc&limit=30`,
          {
            method: 'GET',
            headers: {
              apikey: this.config.anonKey,
              Authorization: `Bearer ${this.config.anonKey}`,
            },
            signal: AbortSignal.timeout(4500),
          }
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
                  const exactPnl = calculateBotPnL(m.symbol, side, openPrice, closePrice, lots);
                  closedMap.set(key, {
                    id: m.id || `cl-${key}`,
                    ticket: Number(m.ticket || Math.floor(700000 + Math.random() * 99999)),
                    symbol: m.symbol,
                    side,
                    lots,
                    openPrice,
                    closePrice,
                    pnl: exactPnl,
                    openTime: Number(m.openTime || (row.created_at ? new Date(row.created_at).getTime() - 60000 : Date.now())),
                    closeTime: Number(m.closeTime || (row.created_at ? new Date(row.created_at).getTime() : Date.now())),
                    reason: m.closeReason === 'TP' || m.closeReason === 'SL' ? m.closeReason : 'MANUAL',
                  });
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }

    const mergedClosedTrades = Array.from(closedMap.values())
      .sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0))
      .slice(0, 50);

    return {
      positions: data && Array.isArray(data.positions) ? data.positions : [],
      pendingOrders: data && Array.isArray(data.pendingOrders) ? data.pendingOrders : [],
      closedTrades: mergedClosedTrades,
    };
  }

  public async syncBotState(
    user: UserAuthProfile | null | undefined,
    botState: {
      importedBots: any[];
      botRuns: any[];
      botTrades: any[];
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.saveCloudStateRecord(
      user.email,
      'STATE_BOTS',
      `Synchronized ${botState.botRuns.length} bot runs and ${botState.botTrades.length} bot trades`,
      {
        importedBots: botState.importedBots || [],
        botRuns: botState.botRuns || [],
        botTrades: (botState.botTrades || []).slice(0, 100),
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
  } | null> {
    if (!this.config || !user?.email) return null;
    const raw = await this.fetchCloudStateRecord<{
      importedBots?: any[];
      botRuns?: any[];
      botTrades?: any[];
    }>(user.email, 'STATE_BOTS');
    if (!raw) return null;
    return {
      importedBots: Array.isArray(raw.importedBots) ? raw.importedBots : [],
      botRuns: Array.isArray(raw.botRuns) ? raw.botRuns : [],
      botTrades: Array.isArray(raw.botTrades) ? sanitizeBotTrades(raw.botTrades) : [],
    };
  }

  public async syncExtrasState(
    user: UserAuthProfile | null | undefined,
    extras: {
      priceAlerts?: any[];
      followedStrategies?: any[];
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.saveCloudStateRecord(
      user.email,
      'STATE_EXTRAS',
      'Synchronized price alerts and copy trading strategies',
      {
        priceAlerts: extras.priceAlerts || [],
        followedStrategies: extras.followedStrategies || [],
        updatedAt: Date.now(),
      }
    );
  }

  public async fetchExtrasState(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    priceAlerts?: any[];
    followedStrategies?: any[];
  } | null> {
    if (!this.config || !user?.email) return null;
    return await this.fetchCloudStateRecord(user.email, 'STATE_EXTRAS');
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
      checkoutId?: string;
      status?: 'PENDING' | 'COMPLETED' | 'FAILED';
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.syncActivity(user, {
      type: 'DEPOSIT',
      description: `Deposited $${deposit.amountUsd.toFixed(2)} via ${deposit.method} to ${deposit.targetAccount}`,
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
        reference: t.reference || t.id,
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
      method: string;
      reference?: string;
      status?: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
    }
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    return await this.syncActivity(user, {
      type: 'WITHDRAWAL',
      description: `Withdrawal of $${withdrawal.amountUsd.toFixed(2)} via ${withdrawal.method} from ${withdrawal.sourceAccount}`,
      metadata: withdrawal,
    });
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
    if (!this.config || !user?.email) return false;
    return await this.saveCloudStateRecord(
      user.email,
      'STATE_SETTINGS',
      'Updated user platform settings',
      {
        ...settings,
        updatedAt: Date.now(),
      }
    );
  }

  public async fetchUserSettings(
    user: UserAuthProfile | null | undefined
  ): Promise<UserPlatformSettings | null> {
    if (!this.config || !user?.email) return null;
    return await this.fetchCloudStateRecord<UserPlatformSettings>(user.email, 'STATE_SETTINGS');
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
    if (!this.config || !user) return false;
    const isAdmin = this.isMasterAdminEmail(user.email);
    const cleanEmail = isAdmin
      ? 'mutwirib964@gmail.com'
      : (user.email || getUserStorageKey(user)).trim().toLowerCase();
    const userKey = isAdmin ? 'mutwirib964@gmail.com' : getUserStorageKey(user);

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        user_key: userKey,
        user_email: cleanEmail,
        user_name: isAdmin ? 'mutwiri' : user.name || '',
        wallet_balance: Number((state.walletBalance || 0).toFixed(2)),
        accounts: Array.isArray(state.accounts) ? state.accounts : [],
        selected_account_id: state.selectedAccountId || null,
        transactions: Array.isArray(state.transactions) ? state.transactions.slice(0, 100) : [],
        last_updated: nowIso,
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_user_finances`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      // Always patch any rows matching user_email or user_key so all rows stay in sync
      if (cleanEmail) {
        await fetch(
          `${this.config.url}/rest/v1/vtm_user_finances?or=(user_key.eq.${encodeURIComponent(
            userKey
          )},user_email.eq.${encodeURIComponent(cleanEmail)})`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: this.config.anonKey,
              Authorization: `Bearer ${this.config.anonKey}`,
            },
            body: JSON.stringify({
              user_email: cleanEmail,
              user_name: isAdmin ? 'mutwiri' : user.name || '',
              wallet_balance: Number((state.walletBalance || 0).toFixed(2)),
              accounts: Array.isArray(state.accounts) ? state.accounts : [],
              selected_account_id: state.selectedAccountId || null,
              transactions: Array.isArray(state.transactions) ? state.transactions.slice(0, 100) : [],
              last_updated: nowIso,
            }),
            signal: AbortSignal.timeout(5000),
          }
        ).catch(() => {});
      }

      return res.ok;
    } catch (err) {
      console.warn('Supabase financials sync notice:', err);
      return false;
    }
  }

  public async fetchUserFinancials(
    user: UserAuthProfile | null | undefined
  ): Promise<UserFinancialState | null> {
    if (!this.config || !user) return null;
    const isAdmin = this.isMasterAdminEmail(user.email);
    const cleanEmail = isAdmin
      ? 'mutwirib964@gmail.com'
      : (user.email || getUserStorageKey(user)).trim().toLowerCase();
    const userKey = isAdmin ? 'mutwirib964@gmail.com' : getUserStorageKey(user);

    try {
      const filter = isAdmin
        ? `or=(user_key.eq.mutwirib964@gmail.com,user_email.eq.mutwirib964@gmail.com)`
        : cleanEmail
        ? `or=(user_key.eq.${encodeURIComponent(userKey)},user_email.eq.${encodeURIComponent(cleanEmail)})`
        : `user_key=eq.${encodeURIComponent(userKey)}`;

      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_user_finances?${filter}&select=*&order=last_updated.desc`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row =
            rows.find(
              (r: any) =>
                (Array.isArray(r.accounts) && r.accounts.length > 0) ||
                Number(r.wallet_balance || 0) > 0 ||
                (Array.isArray(r.transactions) && r.transactions.length > 0)
            ) || rows[0];

          return {
            walletBalance: Number(row.wallet_balance || 0),
            accounts: Array.isArray(row.accounts) ? row.accounts : [],
            selectedAccountId: row.selected_account_id || null,
            transactions: sanitizeRealTransactions(Array.isArray(row.transactions) ? row.transactions : []),
            lastUpdated: row.last_updated ? new Date(row.last_updated).getTime() : Date.now(),
          };
        }
      }
    } catch (e) {
      console.warn('Could not fetch financials from Supabase:', e);
    }
    return null;
  }

  public async syncTransactions(
    user: UserAuthProfile | null | undefined,
    transactions: Transaction[]
  ): Promise<boolean> {
    if (!this.config || !user?.email || !transactions) return false;
    const currentFin = await this.fetchUserFinancials(user);
    return await this.syncUserFinancials(user, {
      walletBalance: currentFin?.walletBalance ?? 0,
      accounts: currentFin?.accounts || [],
      selectedAccountId: currentFin?.selectedAccountId || null,
      transactions,
      lastUpdated: Date.now(),
    });
  }

  public async syncNotifications(
    user: UserAuthProfile | null | undefined,
    notifications: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>,
    lastWelcomeDate?: string
  ): Promise<boolean> {
    if (!this.config || !user) return false;
    return this.upsertStateViaActivities(user, 'STATE_NOTIFICATIONS', {
      notifications: notifications.slice(0, 200),
      lastWelcomeDate: lastWelcomeDate || '',
      updatedAt: Date.now(),
    });
  }

  public async fetchNotifications(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    notifications: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>;
    lastWelcomeDate?: string;
  } | null> {
    if (!this.config || !user) return null;
    const state = await this.fetchStateViaActivities(user, 'STATE_NOTIFICATIONS');
    if (state && Array.isArray(state.notifications)) {
      return {
        notifications: state.notifications,
        lastWelcomeDate: state.lastWelcomeDate || '',
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
    if (!this.config || !user) return false;
    try {
      const payload = {
        user_email: user.email || user.accountNumber || 'trader',
        activity_type: activity.type,
        description: activity.description,
        device_id: typeof navigator !== 'undefined' ? `${navigator.platform || 'web'}` : 'web',
        metadata: activity.metadata || {},
        created_at: new Date(activity.timestamp || Date.now()).toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/user_activities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async syncDevice(user: UserAuthProfile | null | undefined): Promise<boolean> {
    if (!this.config || !user || !user.email) return false;
    try {
      const deviceId =
        localStorage.getItem('vtm_device_id') ||
        (() => {
          const gen = 'dev-' + Math.random().toString(36).substring(2, 10);
          localStorage.setItem('vtm_device_id', gen);
          return gen;
        })();

      const payload = {
        user_email: user.email,
        device_id: deviceId,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        browser: navigator.userAgent.slice(0, 50),
        os: navigator.platform || 'unknown',
        last_active_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/user_devices`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // 10. POSTGRESQL DDL (For user to copy & run in Supabase SQL Editor if desired)
  // =========================================================================

  public getDatabaseSchemaSQL(): string {
    return `-- =========================================================================
-- VTM MARKETS COMPLETE SUPABASE SQL SCHEMA (STRICT UID & SINGLE ADMIN LOCK)
-- COPY & RUN THIS ENTIRE SCRIPT IN SUPABASE -> SQL EDITOR -> NEW QUERY
-- =========================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Registered Users Table (Strict UID Required)
CREATE TABLE IF NOT EXISTS public.vtm_registered_users (
  email TEXT PRIMARY KEY,
  uid UUID,
  password_hash TEXT,
  name TEXT,
  phone_number TEXT,
  country_code TEXT DEFAULT '+254',
  country_name TEXT DEFAULT 'Kenya',
  account_number TEXT,
  role TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure uid column exists if table was created previously
ALTER TABLE public.vtm_registered_users
  ADD COLUMN IF NOT EXISTS uid UUID;

-- Backfill uid from auth.users for any existing registered email
UPDATE public.vtm_registered_users r
SET uid = a.id
FROM auth.users a
WHERE LOWER(r.email) = LOWER(a.email)
  AND r.uid IS NULL;

-- Assign a valid UUID to any remaining existing registered user so they are not locked out
UPDATE public.vtm_registered_users
SET uid = gen_random_uuid()
WHERE uid IS NULL
  AND LOWER(email) NOT IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com');

-- 2. Confirm Exclusive Master Admin (Email: mutwrib@gmail.com / mutwirib964@gmail.com, UID: 84a1e1db-f302-4dac-a077-291128ae0cea)
INSERT INTO public.vtm_registered_users (
  email, uid, name, phone_number, country_code, country_name, account_number, role, created_at, last_login_at, updated_at
) VALUES (
  'mutwrib@gmail.com',
  '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid,
  'mutwiri',
  '+254 741114162',
  '+254',
  'Kenya',
  '884201',
  'admin',
  now(),
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  uid = '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid,
  role = 'admin',
  updated_at = now();

UPDATE public.vtm_registered_users
SET role = 'admin',
    uid = '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid
WHERE LOWER(email) IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com');

-- Revoke admin role from EVERY other email in the database
UPDATE public.vtm_registered_users
SET role = 'normal'
WHERE LOWER(email) NOT IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com')
  AND role = 'admin';

-- 3. Strict Trigger: Enforce Valid UID & Exclusive Single Admin (mutwrib@gmail.com / 84a1e1db-f302-4dac-a077-291128ae0cea)
CREATE OR REPLACE FUNCTION public.enforce_strict_uid_and_single_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize email
  NEW.email := LOWER(TRIM(NEW.email));

  -- If this is the Master Admin email, always lock UID to 84a1e1db-f302-4dac-a077-291128ae0cea and role to 'admin'
  IF NEW.email IN ('mutwrib@gmail.com', 'mutwirib964@gmail.com') THEN
    NEW.uid := '84a1e1db-f302-4dac-a077-291128ae0cea'::uuid;
    NEW.role := 'admin';
  ELSE
    -- Strictly forbid any other email from ever becoming 'admin'
    IF NEW.role = 'admin' THEN
      NEW.role := 'normal';
    END IF;
    -- Ensure role is only 'normal' or 'marketer'
    IF NEW.role NOT IN ('normal', 'marketer') OR NEW.role IS NULL THEN
      NEW.role := 'normal';
    END IF;
  END IF;

  -- Strictly require a non-null UID for every user saved in Supabase
  IF NEW.uid IS NULL THEN
    RAISE EXCEPTION 'Access Denied: User cannot be saved or sign in without a valid Supabase UID.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_strict_uid_and_single_admin ON public.vtm_registered_users;
CREATE TRIGGER trg_enforce_strict_uid_and_single_admin
BEFORE INSERT OR UPDATE ON public.vtm_registered_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_strict_uid_and_single_admin();

-- 4. Automatic Sync Trigger from Supabase Auth (auth.users -> public.vtm_registered_users)
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync_vtm()
RETURNS TRIGGER AS $$
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
    email, uid, name, phone_number, country_code, country_name, account_number, role, created_at, last_login_at, updated_at
  ) VALUES (
    LOWER(NEW.email),
    v_uid,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    '+254',
    COALESCE(NEW.raw_user_meta_data->>'country_name', 'Kenya'),
    COALESCE(NEW.raw_user_meta_data->>'account_number', LPAD(FLOOR(RANDOM() * 90000000 + 10000000)::TEXT, 8, '0')),
    v_role,
    now(),
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    uid = EXCLUDED.uid,
    last_login_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_vtm ON auth.users;
CREATE TRIGGER on_auth_user_created_vtm
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync_vtm();

-- 5. User Financials & Live Accounts Table
CREATE TABLE IF NOT EXISTS public.vtm_user_finances (
  user_key TEXT PRIMARY KEY,
  user_email TEXT,
  user_name TEXT,
  wallet_balance NUMERIC(15, 2) DEFAULT 0.00,
  accounts JSONB DEFAULT '[]'::jsonb,
  selected_account_id TEXT,
  transactions JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 6. Trading Accounts Table
CREATE TABLE IF NOT EXISTS public.vtm_trading_accounts (
  account_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT NOT NULL,
  server TEXT,
  account_type TEXT DEFAULT 'Live',
  tier TEXT DEFAULT 'Premium',
  balance NUMERIC(15, 2) DEFAULT 0.00,
  equity NUMERIC(15, 2) DEFAULT 0.00,
  margin NUMERIC(15, 2) DEFAULT 0.00,
  free_margin NUMERIC(15, 2) DEFAULT 0.00,
  margin_level NUMERIC(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  leverage TEXT DEFAULT '1:500',
  is_default BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Trades, Deposits, Withdrawals, Transfers, Settings & Activity Tables
CREATE TABLE IF NOT EXISTS public.vtm_trades (
  trade_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_number TEXT,
  ticket BIGINT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT DEFAULT 'MARKET',
  lots NUMERIC(10, 2) NOT NULL,
  open_price NUMERIC(15, 5) NOT NULL,
  current_price NUMERIC(15, 5),
  close_price NUMERIC(15, 5),
  sl NUMERIC(15, 5),
  tp NUMERIC(15, 5),
  pnl NUMERIC(15, 2) DEFAULT 0.00,
  status TEXT NOT NULL,
  open_time TIMESTAMPTZ DEFAULT now(),
  close_time TIMESTAMPTZ,
  close_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtm_deposits (
  deposit_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  target_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL,
  amount_kes NUMERIC(15, 2) DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  phone_number TEXT,
  reference TEXT,
  checkout_id TEXT,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtm_withdrawals (
  withdrawal_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  source_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtm_transfers (
  transfer_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtm_user_settings (
  user_email TEXT PRIMARY KEY,
  is_dark_mode BOOLEAN DEFAULT true,
  one_click_trading BOOLEAN DEFAULT false,
  slippage NUMERIC(5, 2) DEFAULT 0.5,
  sound_enabled BOOLEAN DEFAULT true,
  show_spread_brackets BOOLEAN DEFAULT true,
  drawdown_protection BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  default_leverage TEXT DEFAULT '1:500',
  favorite_symbols JSONB DEFAULT '[]'::jsonb,
  active_account_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vtm_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  method TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  reference TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_devices (
  device_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Row Level Security (RLS) Policies for Immediate Cloud Sync
ALTER TABLE public.vtm_registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtm_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public all access on vtm_registered_users" ON public.vtm_registered_users;
  CREATE POLICY "Allow public all access on vtm_registered_users" ON public.vtm_registered_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_user_finances" ON public.vtm_user_finances;
  CREATE POLICY "Allow public all access on vtm_user_finances" ON public.vtm_user_finances FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_trading_accounts" ON public.vtm_trading_accounts;
  CREATE POLICY "Allow public all access on vtm_trading_accounts" ON public.vtm_trading_accounts FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_trades" ON public.vtm_trades;
  CREATE POLICY "Allow public all access on vtm_trades" ON public.vtm_trades FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_deposits" ON public.vtm_deposits;
  CREATE POLICY "Allow public all access on vtm_deposits" ON public.vtm_deposits FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_withdrawals" ON public.vtm_withdrawals;
  CREATE POLICY "Allow public all access on vtm_withdrawals" ON public.vtm_withdrawals FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_transfers" ON public.vtm_transfers;
  CREATE POLICY "Allow public all access on vtm_transfers" ON public.vtm_transfers FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_user_settings" ON public.vtm_user_settings;
  CREATE POLICY "Allow public all access on vtm_user_settings" ON public.vtm_user_settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on vtm_transactions" ON public.vtm_transactions;
  CREATE POLICY "Allow public all access on vtm_transactions" ON public.vtm_transactions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on user_activities" ON public.user_activities;
  CREATE POLICY "Allow public all access on user_activities" ON public.user_activities FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow public all access on user_devices" ON public.user_devices;
  CREATE POLICY "Allow public all access on user_devices" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;
  }
}

export const supabaseService = new SupabaseService();
