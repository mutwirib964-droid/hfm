import { TradingAccount, Transaction } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from '../data/initialData';

export interface UserFinancialState {
  walletBalance: number;
  accounts: TradingAccount[];
  selectedAccountId?: string | null;
  transactions?: Transaction[];
  lastUpdated: number;
}

/**
 * Computes a unique storage key for user-specific financial data.
 */
export function getUserStorageKey(user?: UserAuthProfile | null): string {
  if (!user) return 'default_user';
  if (user.email && user.email.trim()) {
    return user.email.trim().toLowerCase();
  }
  if (user.accountNumber && user.accountNumber.trim()) {
    return `acc_${user.accountNumber.trim()}`;
  }
  if (user.id && user.id.trim()) {
    return user.id.trim();
  }
  return 'default_user';
}

const STORAGE_PREFIX = 'vtm_finances_';
const ACTIVE_FINANCES_KEY = 'vtm_active_finances';
const USER_REGISTRY_KEY = 'vtm_user_registry';

/**
 * Get or register user profile in persistent registry
 */
export function getOrCreateUserProfile(profile: UserAuthProfile): UserAuthProfile {
  const key = getUserStorageKey(profile);
  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    const registry: Record<string, UserAuthProfile> = raw ? JSON.parse(raw) : {};

    if (registry[key]) {
      const existing = registry[key];
      const merged: UserAuthProfile = {
        ...existing,
        ...profile,
        // Keep permanent account number and creation timestamp if already set
        accountNumber: existing.accountNumber || profile.accountNumber,
        createdAt: existing.createdAt || profile.createdAt,
        isLoggedIn: true,
      };
      registry[key] = merged;
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));
      return merged;
    } else {
      registry[key] = profile;
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));
      return profile;
    }
  } catch (e) {
    console.error('Failed to access user registry', e);
    return profile;
  }
}

/**
 * Loads the user's persistent financial state (wallet balance, accounts, transactions).
 * Returns null if no state has been saved yet for this user.
 */
export function loadUserFinancials(user?: UserAuthProfile | null): UserFinancialState | null {
  const key = getUserStorageKey(user);
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      const parsed: UserFinancialState = JSON.parse(raw);
      if (typeof parsed.walletBalance === 'number' && Array.isArray(parsed.accounts)) {
        return parsed;
      }
    }

    // Fallback: check if active finances belongs to this key
    const activeRaw = localStorage.getItem(ACTIVE_FINANCES_KEY);
    if (activeRaw) {
      const parsed = JSON.parse(activeRaw);
      if (parsed && parsed._key === key && typeof parsed.walletBalance === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error(`Failed to load financials for user ${key}`, e);
  }
  return null;
}

/**
 * Creates and persists the initial financial state for a newly registered or first-time user.
 */
export function initializeUserFinancials(
  user: UserAuthProfile,
  isNewRegistration = false
): UserFinancialState {
  const key = getUserStorageKey(user);
  const existing = loadUserFinancials(user);
  if (existing) {
    return existing;
  }

  // Sanitized key for IDs
  const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');

  const defaultLiveAccount: TradingAccount = {
    id: `acc-live-${safeKey}`,
    accountNumber: user.accountNumber || `${Math.floor(7000000 + Math.random() * 999999)}`,
    server: 'VTMarkets-LiveServer1',
    type: 'Live',
    tier: 'Premium',
    balance: 0.0,
    equity: 0.0,
    margin: 0.0,
    freeMargin: 0.0,
    marginLevel: 0,
    currency: 'USD',
    leverage: '1:500',
    isDefault: true,
  };

  const defaultDemoAccount: TradingAccount = {
    id: `acc-demo-${safeKey}`,
    accountNumber: `${Math.floor(9000000 + Math.random() * 999999)}`,
    server: 'VTMarkets-DemoServer',
    type: 'Demo',
    tier: 'Pro',
    balance: 100000.0,
    equity: 100000.0,
    margin: 0.0,
    freeMargin: 100000.0,
    marginLevel: 0,
    currency: 'USD',
    leverage: '1:1000',
    isDefault: false,
  };

  const initialAccounts: TradingAccount[] = [defaultLiveAccount, defaultDemoAccount];

  const newState: UserFinancialState = {
    walletBalance: 0.0,
    accounts: initialAccounts,
    selectedAccountId: defaultLiveAccount.id,
    transactions: INITIAL_TRANSACTIONS,
    lastUpdated: Date.now(),
  };

  saveUserFinancials(user, newState);
  return newState;
}

/**
 * Saves the user's financial state to localStorage.
 * Persists immediately and remains safe across login/logout cycles.
 */
export function saveUserFinancials(
  user: UserAuthProfile | null | undefined,
  state: {
    walletBalance: number;
    accounts: TradingAccount[];
    selectedAccountId?: string | null;
    transactions?: Transaction[];
  }
): void {
  const key = getUserStorageKey(user);
  try {
    const payload: UserFinancialState = {
      walletBalance: Number(state.walletBalance.toFixed(2)),
      accounts: state.accounts,
      selectedAccountId: state.selectedAccountId,
      transactions: state.transactions,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    localStorage.setItem(
      ACTIVE_FINANCES_KEY,
      JSON.stringify({ ...payload, _key: key })
    );
  } catch (e) {
    console.error(`Failed to save financials for user ${key}`, e);
  }
}
