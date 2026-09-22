import { TradingAccount, Transaction } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from '../data/initialData';
import { supabaseService } from '../services/supabaseService';

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
 * Get all registered user profiles (for Admin / Account Management)
 */
export function getAllRegisteredUsers(): UserAuthProfile[] {
  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    if (raw) {
      const registry: Record<string, UserAuthProfile> = JSON.parse(raw);
      return Object.values(registry);
    }
  } catch (e) {
    console.error('Failed to get users registry', e);
  }
  return [];
}

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
 * Requirement: Every new sign up MUST have ZERO live or demo accounts until they open one!
 */
export function initializeUserFinancials(
  user: UserAuthProfile,
  isNewRegistration = true
): UserFinancialState {
  const existing = loadUserFinancials(user);
  if (existing) {
    return existing;
  }

  // Strict requirement: New sign up starts with 0 live or demo accounts
  // Users manually open an account as needed
  const newState: UserFinancialState = {
    walletBalance: 0.0,
    accounts: [],
    selectedAccountId: null,
    transactions: [],
    lastUpdated: Date.now(),
  };

  saveUserFinancials(user, newState);
  return newState;
}

/**
 * Saves the user's financial state to localStorage and syncs with Supabase.
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
      selectedAccountId: state.selectedAccountId ?? null,
      transactions: state.transactions || [],
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    localStorage.setItem(
      ACTIVE_FINANCES_KEY,
      JSON.stringify({ ...payload, _key: key })
    );

    // Sync to Supabase in background
    supabaseService.syncUserFinancials(user, payload).catch((err) => {
      console.warn('Background Supabase sync notice:', err);
    });
  } catch (e) {
    console.error(`Failed to save financials for user ${key}`, e);
  }
}

/**
 * Safely executes money transfer between VTM Wallet and a trading account,
 * ensuring bidirectional persistence across logout/login and across devices.
 */
export function executeInternalTransfer(
  user: UserAuthProfile | null | undefined,
  params: {
    fromAccount: string; // 'VTM Wallet', 'HF Wallet', or account number/id
    toAccount: string;
    amount: number;
    currentState: {
      walletBalance: number;
      accounts: TradingAccount[];
      transactions: Transaction[];
    };
  }
): {
  success: boolean;
  message: string;
  newWalletBalance: number;
  newAccounts: TradingAccount[];
  newTransactions: Transaction[];
} {
  const { fromAccount, toAccount, amount, currentState } = params;
  const isFromWallet = fromAccount === 'VTM Wallet' || fromAccount === 'HF Wallet' || fromAccount.toLowerCase().includes('wallet');
  const isToWallet = toAccount === 'VTM Wallet' || toAccount === 'HF Wallet' || toAccount.toLowerCase().includes('wallet');

  if (amount <= 0) {
    return {
      success: false,
      message: 'Transfer amount must be greater than $0.00',
      newWalletBalance: currentState.walletBalance,
      newAccounts: currentState.accounts,
      newTransactions: currentState.transactions,
    };
  }

  let updatedWallet = currentState.walletBalance;
  let updatedAccounts = [...currentState.accounts];

  if (isFromWallet && !isToWallet) {
    // Wallet -> Trading Account
    if (updatedWallet < amount) {
      return {
        success: false,
        message: `Insufficient VTM Wallet balance ($${updatedWallet.toFixed(2)}) for transfer of $${amount.toFixed(2)}`,
        newWalletBalance: currentState.walletBalance,
        newAccounts: currentState.accounts,
        newTransactions: currentState.transactions,
      };
    }

    // Deduct from wallet
    updatedWallet = Number((updatedWallet - amount).toFixed(2));

    // Add to target trading account
    updatedAccounts = updatedAccounts.map((acc) => {
      const match = acc.id === toAccount || acc.accountNumber === toAccount || toAccount.includes(acc.accountNumber);
      if (match) {
        const newBal = Number((acc.balance + amount).toFixed(2));
        const newEq = Number((acc.equity + amount).toFixed(2));
        const newFree = Number((acc.freeMargin + amount).toFixed(2));
        return {
          ...acc,
          balance: newBal,
          equity: newEq,
          freeMargin: newFree,
        };
      }
      return acc;
    });
  } else if (!isFromWallet && isToWallet) {
    // Trading Account -> Wallet
    const sourceAcc = updatedAccounts.find(
      (a) => a.id === fromAccount || a.accountNumber === fromAccount || fromAccount.includes(a.accountNumber)
    );

    if (!sourceAcc) {
      return {
        success: false,
        message: `Source trading account not found`,
        newWalletBalance: currentState.walletBalance,
        newAccounts: currentState.accounts,
        newTransactions: currentState.transactions,
      };
    }

    if (sourceAcc.balance < amount) {
      return {
        success: false,
        message: `Insufficient account balance in #${sourceAcc.accountNumber} ($${sourceAcc.balance.toFixed(2)}) for transfer`,
        newWalletBalance: currentState.walletBalance,
        newAccounts: currentState.accounts,
        newTransactions: currentState.transactions,
      };
    }

    // Deduct from trading account
    updatedAccounts = updatedAccounts.map((acc) => {
      if (acc.id === sourceAcc.id) {
        const newBal = Number((acc.balance - amount).toFixed(2));
        const newEq = Number((acc.equity - amount).toFixed(2));
        const newFree = Number(Math.max(0, acc.freeMargin - amount).toFixed(2));
        return {
          ...acc,
          balance: newBal,
          equity: newEq,
          freeMargin: newFree,
        };
      }
      return acc;
    });

    // Add to wallet
    updatedWallet = Number((updatedWallet + amount).toFixed(2));
  } else if (!isFromWallet && !isToWallet) {
    // Account to Account
    const sourceAcc = updatedAccounts.find(
      (a) => a.id === fromAccount || a.accountNumber === fromAccount || fromAccount.includes(a.accountNumber)
    );
    if (!sourceAcc || sourceAcc.balance < amount) {
      return {
        success: false,
        message: 'Insufficient balance in source account',
        newWalletBalance: currentState.walletBalance,
        newAccounts: currentState.accounts,
        newTransactions: currentState.transactions,
      };
    }

    updatedAccounts = updatedAccounts.map((acc) => {
      if (acc.id === sourceAcc.id) {
        return {
          ...acc,
          balance: Number((acc.balance - amount).toFixed(2)),
          equity: Number((acc.equity - amount).toFixed(2)),
        };
      }
      const isTarget = acc.id === toAccount || acc.accountNumber === toAccount || toAccount.includes(acc.accountNumber);
      if (isTarget) {
        return {
          ...acc,
          balance: Number((acc.balance + amount).toFixed(2)),
          equity: Number((acc.equity + amount).toFixed(2)),
        };
      }
      return acc;
    });
  }

  // Record transaction
  const ref = `VTM-TRF-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    type: 'INTERNAL_TRANSFER',
    method: 'Internal Transfer',
    amount,
    currency: 'USD',
    status: 'COMPLETED',
    timestamp: Date.now(),
    reference: ref,
    details: `${fromAccount} ➔ ${toAccount}`,
  };

  const newTransactions = [newTx, ...currentState.transactions];

  // Save immediately to persistent storage
  saveUserFinancials(user, {
    walletBalance: updatedWallet,
    accounts: updatedAccounts,
    transactions: newTransactions,
  });

  return {
    success: true,
    message: `Transferred $${amount.toFixed(2)} successfully`,
    newWalletBalance: updatedWallet,
    newAccounts: updatedAccounts,
    newTransactions,
  };
}

/**
 * Admin / Manager permission to edit any user's wallet or trading accounts
 */
export function adminUpdateUserAccount(
  targetUserKey: string,
  accountUpdates: {
    walletBalance?: number;
    accountId?: string;
    newBalance?: number;
    newEquity?: number;
    newLeverage?: string;
  }
): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + targetUserKey);
    let state: UserFinancialState = raw
      ? JSON.parse(raw)
      : { walletBalance: 0, accounts: [], lastUpdated: Date.now() };

    if (accountUpdates.walletBalance !== undefined) {
      state.walletBalance = Number(accountUpdates.walletBalance.toFixed(2));
    }

    if (accountUpdates.accountId && accountUpdates.newBalance !== undefined) {
      state.accounts = state.accounts.map((acc) => {
        if (acc.id === accountUpdates.accountId || acc.accountNumber === accountUpdates.accountId) {
          return {
            ...acc,
            balance: Number(accountUpdates.newBalance!.toFixed(2)),
            equity: accountUpdates.newEquity !== undefined ? Number(accountUpdates.newEquity.toFixed(2)) : Number(accountUpdates.newBalance!.toFixed(2)),
            leverage: accountUpdates.newLeverage || acc.leverage,
          };
        }
        return acc;
      });
    }

    state.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_PREFIX + targetUserKey, JSON.stringify(state));

    // Also update active finances if current user matches
    const activeRaw = localStorage.getItem(ACTIVE_FINANCES_KEY);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active._key === targetUserKey) {
        localStorage.setItem(ACTIVE_FINANCES_KEY, JSON.stringify({ ...state, _key: targetUserKey }));
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to admin update user account', e);
    return false;
  }
}

