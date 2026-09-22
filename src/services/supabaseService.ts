import { UserFinancialState, getUserStorageKey } from '../utils/financialStorage';
import { TradingAccount, Transaction } from '../types';
import { UserAuthProfile } from '../types/botTypes';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_SUPABASE_URL_KEY = 'vtm_supabase_url';
const STORAGE_SUPABASE_ANON_KEY = 'vtm_supabase_anon_key';

class SupabaseService {
  private config: SupabaseConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): SupabaseConfig | null {
    // 1. Environment variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
      this.config = { url: envUrl.trim(), anonKey: envKey.trim() };
      return this.config;
    }

    // 2. User defined in localStorage
    try {
      const storedUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY);
      const storedKey = localStorage.getItem(STORAGE_SUPABASE_ANON_KEY);
      if (storedUrl && storedKey) {
        this.config = { url: storedUrl.trim(), anonKey: storedKey.trim() };
        return this.config;
      }
    } catch (e) {
      // ignore
    }

    this.config = null;
    return null;
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

  /**
   * Sync complete user financial state to Supabase table `vtm_user_finances`
   */
  public async syncUserFinancials(
    user: UserAuthProfile | null | undefined,
    state: UserFinancialState
  ): Promise<boolean> {
    const userKey = getUserStorageKey(user);
    if (!this.config) {
      return false;
    }

    try {
      const payload = {
        user_key: userKey,
        user_email: user?.email || '',
        user_name: user?.name || '',
        wallet_balance: state.walletBalance,
        accounts: state.accounts,
        selected_account_id: state.selectedAccountId || null,
        transactions: (state.transactions || []).slice(0, 100),
        last_updated: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_user_finances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        // Table might not exist yet; log gracefully without throwing
        console.warn('Supabase sync response status:', res.status, res.statusText);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Supabase sync notice (offline or network fallback active):', err);
      return false;
    }
  }

  /**
   * Load user financial state from Supabase table
   */
  public async fetchUserFinancials(
    user: UserAuthProfile | null | undefined
  ): Promise<UserFinancialState | null> {
    const userKey = getUserStorageKey(user);
    if (!this.config) return null;

    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_user_finances?user_key=eq.${encodeURIComponent(userKey)}&select=*`,
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
          const row = rows[0];
          return {
            walletBalance: Number(row.wallet_balance || 0),
            accounts: Array.isArray(row.accounts) ? row.accounts : [],
            selectedAccountId: row.selected_account_id || null,
            transactions: Array.isArray(row.transactions) ? row.transactions : [],
            lastUpdated: Date.now(),
          };
        }
      }
    } catch (e) {
      console.warn('Could not fetch financials from Supabase, relying on local persistence', e);
    }
    return null;
  }
}

export const supabaseService = new SupabaseService();
