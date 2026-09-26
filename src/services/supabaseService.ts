import { UserFinancialState, getUserStorageKey } from '../utils/financialStorage';
import { TradingAccount, Transaction, Position, PendingOrder, ClosedTrade } from '../types';
import { UserAuthProfile } from '../types/botTypes';

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

class SupabaseService {
  private config: SupabaseConfig | null = null;
  private initPromise: Promise<SupabaseConfig | null> | null = null;

  constructor() {
    this.loadConfig();
    this.initServerConfig().catch(() => {});
  }

  public async initServerConfig(): Promise<SupabaseConfig | null> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const res = await fetch('/api/supabase-config', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.configured && data.url && data.anonKey) {
            const cleanUrl = data.url.trim().replace(/\/+$/, '');
            const cleanKey = data.anonKey.trim();
            this.config = { url: cleanUrl, anonKey: cleanKey };
            try {
              localStorage.setItem(STORAGE_SUPABASE_URL_KEY, cleanUrl);
              localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, cleanKey);
            } catch {
              // ignore
            }
            return this.config;
          }
        }
      } catch {
        // ignore
      } finally {
        this.initPromise = null;
      }
      return this.config;
    })();

    return this.initPromise;
  }

  public loadConfig(): SupabaseConfig | null {
    // 1. Environment variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey && !envUrl.includes('your-project.supabase.co')) {
      this.config = { url: envUrl.trim().replace(/\/+$/, ''), anonKey: envKey.trim() };
      return this.config;
    }

    // 2. User defined in localStorage
    try {
      const storedUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY);
      const storedKey = localStorage.getItem(STORAGE_SUPABASE_ANON_KEY);
      if (storedUrl && storedKey) {
        this.config = { url: storedUrl.trim().replace(/\/+$/, ''), anonKey: storedKey.trim() };
        // Sync to server so other devices (e.g. mobile phones) get the credentials
        fetch('/api/supabase-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: storedUrl, anonKey: storedKey }),
        }).catch(() => {});
        return this.config;
      }
    } catch (e) {
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

  public async findUserInDatabase(
    email: string
  ): Promise<{ profile: UserAuthProfile; password?: string } | null> {
    if (!this.config || !email) return null;
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_registered_users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          const profile: UserAuthProfile = {
            id: `usr-${row.account_number || Date.now()}`,
            name: row.name || 'Trader',
            email: row.email,
            phoneNumber: row.phone_number || '',
            phone: row.phone_number || '',
            countryCode: row.country_code || '+1',
            countryName: row.country_name || 'United States',
            accountNumber: row.account_number,
            role: row.role || 'normal',
            isLoggedIn: true,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          };
          return { profile, password: row.password_hash };
        }
      }
    } catch (e) {
      console.warn('Could not query vtm_registered_users from database', e);
    }
    return null;
  }

  public async registerUserInDatabase(
    profile: UserAuthProfile,
    password?: string
  ): Promise<boolean> {
    if (!this.config || !profile.email) return false;

    try {
      const payload = {
        email: profile.email.trim().toLowerCase(),
        password_hash: password || '',
        name: profile.name,
        phone_number: profile.phoneNumber || profile.phone || '',
        country_code: profile.countryCode || '+1',
        country_name: profile.countryName || 'United States',
        account_number: profile.accountNumber,
        role: profile.role || 'normal',
        created_at: new Date(profile.createdAt || Date.now()).toISOString(),
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_registered_users`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });

      return res.ok;
    } catch (e) {
      console.warn('Failed to save registered user to Supabase', e);
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
          error: json.msg || json.error_description || json.message || 'Failed to register user in database.',
        };
      }

      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during database registration.' };
    }
  }

  public async signInWithSupabaseAuth(
    email: string,
    password: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.config || !email) {
      return { success: false, error: 'Database is not configured.' };
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
            error: 'No account found with these credentials. You cannot log in without opening an account first.',
          };
        }
        return { success: false, error: msg || 'Database authentication failed.' };
      }

      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error connecting to database auth.' };
    }
  }

  // =========================================================================
  // 2. TRADING ACCOUNTS (vtm_trading_accounts)
  // =========================================================================

  public async syncTradingAccount(
    user: UserAuthProfile | null | undefined,
    account: TradingAccount
  ): Promise<boolean> {
    if (!this.config || !user || !account) return false;
    try {
      const payload = {
        account_id: account.id,
        user_email: user.email || '',
        account_number: account.accountNumber,
        server: account.server,
        account_type: account.type,
        tier: account.tier,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        free_margin: account.freeMargin,
        margin_level: account.marginLevel,
        currency: account.currency,
        leverage: account.leverage,
        is_default: !!account.isDefault,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_trading_accounts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
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
      const records = accounts.map((account) => ({
        account_id: account.id,
        user_email: user.email || '',
        account_number: account.accountNumber,
        server: account.server,
        account_type: account.type,
        tier: account.tier,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        free_margin: account.freeMargin,
        margin_level: account.marginLevel,
        currency: account.currency,
        leverage: account.leverage,
        is_default: !!account.isDefault,
        updated_at: new Date().toISOString(),
      }));

      const res = await fetch(`${this.config.url}/rest/v1/vtm_trading_accounts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(records),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to bulk sync trading accounts to Supabase:', e);
      return false;
    }
  }

  public async fetchTradingAccounts(
    user: UserAuthProfile | null | undefined
  ): Promise<TradingAccount[] | null> {
    if (!this.config || !user?.email) return null;
    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_trading_accounts?user_email=eq.${encodeURIComponent(
          user.email.toLowerCase()
        )}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.account_id || `acc-${r.account_number}`,
            accountNumber: r.account_number,
            server: r.server || 'VTM-Live-MT5',
            type: r.account_type || 'Live',
            tier: r.tier || 'Premium',
            balance: Number(r.balance || 0),
            equity: Number(r.equity || 0),
            margin: Number(r.margin || 0),
            freeMargin: Number(r.free_margin || 0),
            marginLevel: Number(r.margin_level || 0),
            currency: r.currency || 'USD',
            leverage: r.leverage || '1:500',
            isDefault: !!r.is_default,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch trading accounts from Supabase:', e);
    }
    return null;
  }

  // =========================================================================
  // 3. TRADES & ORDERS (vtm_trades)
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
    try {
      const payload = {
        trade_id: trade.id,
        user_email: user.email.toLowerCase(),
        account_number: trade.accountNumber || user.accountNumber || '',
        ticket: trade.ticket,
        symbol: trade.symbol,
        side: trade.side,
        order_type: trade.orderType || 'MARKET',
        lots: trade.lots,
        open_price: trade.openPrice,
        current_price: trade.currentPrice ?? trade.openPrice,
        close_price: trade.closePrice ?? null,
        sl: trade.sl,
        tp: trade.tp,
        pnl: trade.pnl ?? 0,
        status: trade.status,
        open_time: new Date(trade.openTime).toISOString(),
        close_time: trade.closeTime ? new Date(trade.closeTime).toISOString() : null,
        close_reason: trade.closeReason || null,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_trades`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save trade to Supabase:', e);
      return false;
    }
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
    try {
      const records: any[] = [];
      const userEmail = user.email.toLowerCase();
      const accNum = data.accountNumber || user.accountNumber || '';

      // Open positions
      data.positions.forEach((p) => {
        records.push({
          trade_id: p.id,
          user_email: userEmail,
          account_number: accNum,
          ticket: p.ticket,
          symbol: p.symbol,
          side: p.side,
          order_type: 'MARKET',
          lots: p.lots,
          open_price: p.openPrice,
          current_price: p.currentPrice,
          close_price: null,
          sl: p.sl,
          tp: p.tp,
          pnl: p.pnl,
          status: 'OPEN',
          open_time: new Date(p.openTime).toISOString(),
          close_time: null,
          close_reason: null,
          updated_at: new Date().toISOString(),
        });
      });

      // Pending orders
      data.pendingOrders.forEach((o) => {
        records.push({
          trade_id: o.id,
          user_email: userEmail,
          account_number: accNum,
          ticket: o.ticket,
          symbol: o.symbol,
          side: o.side,
          order_type: o.type,
          lots: o.lots,
          open_price: o.targetPrice,
          current_price: o.targetPrice,
          close_price: null,
          sl: o.sl,
          tp: o.tp,
          pnl: 0,
          status: o.status === 'TRIGGERED' ? 'TRIGGERED' : 'PENDING',
          open_time: new Date(o.createdAt).toISOString(),
          close_time: null,
          close_reason: null,
          updated_at: new Date().toISOString(),
        });
      });

      // Closed trades (last 50)
      data.closedTrades.slice(0, 50).forEach((c) => {
        records.push({
          trade_id: c.id,
          user_email: userEmail,
          account_number: accNum,
          ticket: c.ticket,
          symbol: c.symbol,
          side: c.side,
          order_type: 'MARKET',
          lots: c.lots,
          open_price: c.openPrice,
          current_price: c.closePrice,
          close_price: c.closePrice,
          sl: null,
          tp: null,
          pnl: c.pnl,
          status: 'CLOSED',
          open_time: new Date(c.openTime).toISOString(),
          close_time: new Date(c.closeTime).toISOString(),
          close_reason: c.reason,
          updated_at: new Date().toISOString(),
        });
      });

      if (records.length === 0) return true;

      const res = await fetch(`${this.config.url}/rest/v1/vtm_trades`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(records),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to sync trades to Supabase:', e);
      return false;
    }
  }

  public async fetchUserTrades(
    user: UserAuthProfile | null | undefined
  ): Promise<{
    positions: Position[];
    pendingOrders: PendingOrder[];
    closedTrades: ClosedTrade[];
  } | null> {
    if (!this.config || !user?.email) return null;
    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_trades?user_email=eq.${encodeURIComponent(
          user.email.toLowerCase()
        )}&select=*&order=open_time.desc&limit=100`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const positions: Position[] = [];
          const pendingOrders: PendingOrder[] = [];
          const closedTrades: ClosedTrade[] = [];

          rows.forEach((r: any) => {
            if (r.status === 'OPEN') {
              positions.push({
                id: r.trade_id || `pos-${r.ticket}`,
                ticket: Number(r.ticket),
                symbol: r.symbol,
                side: r.side,
                lots: Number(r.lots),
                openPrice: Number(r.open_price),
                currentPrice: Number(r.current_price || r.open_price),
                sl: r.sl != null ? Number(r.sl) : null,
                tp: r.tp != null ? Number(r.tp) : null,
                pnl: Number(r.pnl || 0),
                swap: 0,
                commission: 0,
                openTime: new Date(r.open_time).getTime(),
              });
            } else if (r.status === 'PENDING') {
              pendingOrders.push({
                id: r.trade_id || `ord-${r.ticket}`,
                ticket: Number(r.ticket),
                symbol: r.symbol,
                side: r.side,
                type: r.order_type || 'BUY_LIMIT',
                targetPrice: Number(r.open_price),
                lots: Number(r.lots),
                sl: r.sl != null ? Number(r.sl) : null,
                tp: r.tp != null ? Number(r.tp) : null,
                status: 'PENDING',
                createdAt: new Date(r.open_time).getTime(),
              });
            } else if (r.status === 'CLOSED') {
              closedTrades.push({
                id: r.trade_id || `cl-${r.ticket}`,
                ticket: Number(r.ticket),
                symbol: r.symbol,
                side: r.side,
                lots: Number(r.lots),
                openPrice: Number(r.open_price),
                closePrice: Number(r.close_price || r.open_price),
                pnl: Number(r.pnl || 0),
                openTime: new Date(r.open_time).getTime(),
                closeTime: r.close_time ? new Date(r.close_time).getTime() : Date.now(),
                reason: (r.close_reason as any) || 'MANUAL',
              });
            }
          });

          return { positions, pendingOrders, closedTrades };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch trades from Supabase:', e);
    }
    return null;
  }

  // =========================================================================
  // 4. DEPOSITS (vtm_deposits)
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
    try {
      const depositId = deposit.id || deposit.reference || `dep-${Date.now()}`;
      const payload = {
        deposit_id: depositId,
        user_email: user.email.toLowerCase(),
        target_account: deposit.targetAccount,
        amount_usd: deposit.amountUsd,
        amount_kes: deposit.amountKes || 0,
        payment_method: deposit.method,
        phone_number: deposit.phone || '',
        reference: deposit.reference || depositId,
        checkout_id: deposit.checkoutId || '',
        status: deposit.status || 'COMPLETED',
        created_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_deposits`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save deposit to Supabase:', e);
      return false;
    }
  }

  public async fetchUserDeposits(
    user: UserAuthProfile | null | undefined
  ): Promise<DepositRecord[] | null> {
    if (!this.config || !user?.email) return null;
    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_deposits?user_email=eq.${encodeURIComponent(
          user.email.toLowerCase()
        )}&select=*&order=created_at.desc&limit=50`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          return rows.map((r: any) => ({
            id: r.deposit_id,
            userEmail: r.user_email,
            targetAccount: r.target_account,
            amountUsd: Number(r.amount_usd),
            amountKes: Number(r.amount_kes || 0),
            method: r.payment_method,
            phone: r.phone_number,
            reference: r.reference,
            checkoutId: r.checkout_id,
            status: r.status,
            createdAt: new Date(r.created_at).getTime(),
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch deposits from Supabase:', e);
    }
    return null;
  }

  // =========================================================================
  // 5. WITHDRAWALS (vtm_withdrawals)
  // =========================================================================

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
    try {
      const withdrawalId = withdrawal.id || withdrawal.reference || `wth-${Date.now()}`;
      const payload = {
        withdrawal_id: withdrawalId,
        user_email: user.email.toLowerCase(),
        source_account: withdrawal.sourceAccount,
        amount_usd: withdrawal.amountUsd,
        payment_method: withdrawal.method,
        reference: withdrawal.reference || withdrawalId,
        status: withdrawal.status || 'PENDING',
        created_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_withdrawals`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save withdrawal to Supabase:', e);
      return false;
    }
  }

  public async fetchUserWithdrawals(
    user: UserAuthProfile | null | undefined
  ): Promise<WithdrawalRecord[] | null> {
    if (!this.config || !user?.email) return null;
    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_withdrawals?user_email=eq.${encodeURIComponent(
          user.email.toLowerCase()
        )}&select=*&order=created_at.desc&limit=50`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          return rows.map((r: any) => ({
            id: r.withdrawal_id,
            userEmail: r.user_email,
            sourceAccount: r.source_account,
            amountUsd: Number(r.amount_usd),
            method: r.payment_method,
            reference: r.reference,
            status: r.status,
            createdAt: new Date(r.created_at).getTime(),
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch withdrawals from Supabase:', e);
    }
    return null;
  }

  // =========================================================================
  // 6. SETTINGS & PREFERENCES (vtm_user_settings)
  // =========================================================================

  public async saveUserSettings(
    user: UserAuthProfile | null | undefined,
    settings: UserPlatformSettings
  ): Promise<boolean> {
    if (!this.config || !user?.email) return false;
    try {
      const payload = {
        user_email: user.email.toLowerCase(),
        is_dark_mode: !!settings.isDarkMode,
        one_click_trading: !!settings.oneClickTrading,
        slippage: settings.slippage,
        sound_enabled: !!settings.soundEnabled,
        show_spread_brackets: !!settings.showSpreadBrackets,
        drawdown_protection: !!settings.drawdownProtection,
        two_factor_enabled: !!settings.twoFactorEnabled,
        two_factor_secret: settings.twoFactorSecret || null,
        default_leverage: settings.defaultLeverage || '1:500',
        favorite_symbols: settings.favoriteSymbols || [],
        active_account_id: settings.activeAccountId || null,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_user_settings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save settings to Supabase:', e);
      return false;
    }
  }

  public async fetchUserSettings(
    user: UserAuthProfile | null | undefined
  ): Promise<UserPlatformSettings | null> {
    if (!this.config || !user?.email) return null;
    try {
      const res = await fetch(
        `${this.config.url}/rest/v1/vtm_user_settings?user_email=eq.${encodeURIComponent(
          user.email.toLowerCase()
        )}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          return {
            isDarkMode: row.is_dark_mode ?? true,
            oneClickTrading: !!row.one_click_trading,
            slippage: Number(row.slippage ?? 0.5),
            soundEnabled: row.sound_enabled ?? true,
            showSpreadBrackets: row.show_spread_brackets ?? true,
            drawdownProtection: row.drawdown_protection ?? true,
            twoFactorEnabled: !!row.two_factor_enabled,
            twoFactorSecret: row.two_factor_secret || undefined,
            defaultLeverage: row.default_leverage || '1:500',
            favoriteSymbols: Array.isArray(row.favorite_symbols) ? row.favorite_symbols : [],
            activeAccountId: row.active_account_id || undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load user settings from Supabase:', e);
    }
    return null;
  }

  // =========================================================================
  // 7. INTERNAL TRANSFERS (vtm_transfers)
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
    try {
      const transferId = `trf-${Date.now()}`;
      const payload = {
        transfer_id: transferId,
        user_email: user.email.toLowerCase(),
        from_account: transfer.fromAccount,
        to_account: transfer.toAccount,
        amount_usd: transfer.amountUsd,
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };

      const res = await fetch(`${this.config.url}/rest/v1/vtm_transfers`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to record transfer in Supabase:', e);
      return false;
    }
  }

  // =========================================================================
  // 8. TRANSACTIONS & FINANCIAL STATE (vtm_user_finances & vtm_transactions)
  // =========================================================================

  public async syncUserFinancials(
    user: UserAuthProfile | null | undefined,
    state: UserFinancialState
  ): Promise<boolean> {
    const userKey = getUserStorageKey(user);
    if (!this.config) return false;

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
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      return res.ok;
    } catch (err) {
      console.warn('Supabase financials sync notice:', err);
      return false;
    }
  }

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
      console.warn('Could not fetch financials from Supabase:', e);
    }
    return null;
  }

  public async syncTransactions(
    user: UserAuthProfile | null | undefined,
    transactions: Transaction[]
  ): Promise<boolean> {
    if (!this.config || !user?.email || !transactions) return false;
    try {
      const records = transactions.slice(0, 50).map((t) => ({
        transaction_id: t.id,
        user_email: user.email!.toLowerCase(),
        type: t.type,
        method: t.method || '',
        amount: t.amount,
        currency: t.currency || 'USD',
        status: t.status,
        reference: t.reference || '',
        details: t.details || '',
        created_at: new Date(t.timestamp).toISOString(),
      }));

      const res = await fetch(`${this.config.url}/rest/v1/vtm_transactions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(records),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to sync transactions to Supabase:', e);
      return false;
    }
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
-- VTM MARKETS WEBTRADER COMPLETE SUPABASE POSTGRESQL SCHEMA
-- RUN THIS IN YOUR SUPABASE PROJECT -> SQL EDITOR
-- =========================================================================

-- 1. Registered Users Table
CREATE TABLE IF NOT EXISTS public.vtm_registered_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT,
  name TEXT,
  phone_number TEXT,
  country_code TEXT,
  country_name TEXT,
  account_number TEXT,
  role TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Financials & Wallet Table
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

-- 3. Trading Accounts Table
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

-- 4. Trades & Orders Table (Open positions, pending orders, closed trades)
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
  status TEXT NOT NULL, -- 'OPEN', 'PENDING', 'CLOSED', 'CANCELLED'
  open_time TIMESTAMPTZ DEFAULT now(),
  close_time TIMESTAMPTZ,
  close_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Deposits Table (Hashback M-PESA & gateways)
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

-- 6. Withdrawals Table
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

-- 7. Internal Transfers Table
CREATE TABLE IF NOT EXISTS public.vtm_transfers (
  transfer_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount_usd NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. User Settings & Preferences Table
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

-- 9. Transactions Ledger Table
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

-- 10. Audit Activity & Device Tables
CREATE TABLE IF NOT EXISTS public.user_activities (
  id BIGSERIAL PRIMARY KEY,
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

-- Enable RLS and public access policies for anon key
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
  CREATE POLICY "Allow public all access on vtm_registered_users" ON public.vtm_registered_users FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_user_finances" ON public.vtm_user_finances FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_trading_accounts" ON public.vtm_trading_accounts FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_trades" ON public.vtm_trades FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_deposits" ON public.vtm_deposits FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_withdrawals" ON public.vtm_withdrawals FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_transfers" ON public.vtm_transfers FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_user_settings" ON public.vtm_user_settings FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on vtm_transactions" ON public.vtm_transactions FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on user_activities" ON public.user_activities FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public all access on user_devices" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;
  }
}

export const supabaseService = new SupabaseService();
