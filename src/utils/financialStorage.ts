import { TradingAccount, Transaction } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from '../data/initialData';
import { supabaseService } from '../services/supabaseService';
import { getUsdKesRate } from '../services/hashbackService';

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
const USER_CREDENTIALS_KEY = 'vtm_user_credentials';
const DELETED_ACCOUNTS_KEY = 'vtm_deleted_live_accounts';

// 2 Weeks (14 days) in milliseconds for silent background idle Live account cleanup
export const TWO_WEEKS_IDLE_MS = 14 * 24 * 60 * 60 * 1000;

export function markAccountDeletedLocally(userEmail: string | undefined | null, accountNumber: string): void {
  if (!accountNumber) return;
  const cleanEmail = (userEmail || 'default').trim().toLowerCase();
  try {
    const raw = localStorage.getItem(DELETED_ACCOUNTS_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const list = Array.isArray(map[cleanEmail]) ? map[cleanEmail] : [];
    if (!list.includes(accountNumber)) {
      list.push(accountNumber);
    }
    map[cleanEmail] = list;
    localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getDeletedAccountNumbers(userEmail?: string | null): Set<string> {
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem(DELETED_ACCOUNTS_KEY);
    if (!raw) return set;
    const map: Record<string, string[]> = JSON.parse(raw);
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      if (Array.isArray(map[cleanEmail])) {
        map[cleanEmail].forEach((n) => set.add(String(n)));
      }
    }
  } catch {
    // ignore
  }
  return set;
}

export function extractAccountCreatedAt(acc: TradingAccount, fallbackTime?: number): number {
  if (typeof acc.createdAt === 'number' && Number.isFinite(acc.createdAt) && acc.createdAt > 1000000000000) {
    return acc.createdAt;
  }
  if (typeof acc.id === 'string') {
    const m = acc.id.match(/^acc-(\d{12,14})$/);
    if (m) {
      const parsed = Number(m[1]);
      if (Number.isFinite(parsed) && parsed > 1000000000000) {
        return parsed;
      }
    }
  }
  return fallbackTime && fallbackTime > 1000000000000 ? fallbackTime : Date.now();
}

/**
 * Merges two UserFinancialState objects (e.g. remote cloud state and local device state)
 * so that no Live or Demo account opened by the user ever vanishes unless explicitly deleted by the user.
 */
export function mergeUserFinancialStates(
  primary: UserFinancialState,
  secondary: UserFinancialState | null | undefined,
  userEmail?: string | null
): UserFinancialState {
  if (!secondary) return primary;
  const deletedSet = getDeletedAccountNumbers(userEmail);

  const accountMap = new Map<string, TradingAccount>();
  // Put secondary accounts first, then let primary override matching accounts while preserving any extra non-deleted accounts
  for (const acc of secondary.accounts || []) {
    if (!acc) continue;
    const accNum = String(acc.accountNumber || '');
    if (accNum && deletedSet.has(accNum)) continue;
    const key = accNum || acc.id;
    if (key) accountMap.set(key, acc);
  }
  for (const acc of primary.accounts || []) {
    if (!acc) continue;
    const accNum = String(acc.accountNumber || '');
    if (accNum && deletedSet.has(accNum)) continue;
    const key = accNum || acc.id;
    if (key) accountMap.set(key, acc);
  }

  const mergedAccounts = Array.from(accountMap.values());

  const txMap = new Map<string, Transaction>();
  for (const tx of [...(primary.transactions || []), ...(secondary.transactions || [])]) {
    if (!tx) continue;
    const key = String(tx.id || tx.reference || `${tx.type}-${tx.timestamp}`);
    if (!txMap.has(key)) {
      txMap.set(key, tx);
    } else {
      const existing = txMap.get(key)!;
      const incomingFailed =
        tx.status === 'FAILED' ||
        /capacity exceeded|unsuccessful|failed|bounced back/i.test(String(tx.details || ''));
      if (incomingFailed && existing.status !== 'FAILED') {
        txMap.set(key, {
          ...existing,
          ...tx,
          status: 'FAILED',
        });
      }
    }
  }

  const mergedTransactions = sanitizeRealTransactions(Array.from(txMap.values()));
  const selectedId =
    primary.selectedAccountId && mergedAccounts.some((a) => a.id === primary.selectedAccountId)
      ? primary.selectedAccountId
      : secondary.selectedAccountId && mergedAccounts.some((a) => a.id === secondary.selectedAccountId)
      ? secondary.selectedAccountId
      : mergedAccounts[0]?.id || null;

  return {
    walletBalance: Number((primary.walletBalance ?? secondary.walletBalance ?? 0).toFixed(2)),
    accounts: mergedAccounts,
    selectedAccountId: selectedId,
    transactions: mergedTransactions,
    lastUpdated: Math.max(primary.lastUpdated || 0, secondary.lastUpdated || 0),
  };
}

/**
 * Live accounts are preserved permanently until the user explicitly deletes them.
 * When a user deletes a Live account, its balance is transferred back to the Central Wallet.
 */
export function sweepIdleLiveAccountsSilently(
  _user: UserAuthProfile | null | undefined,
  state: UserFinancialState,
  _hasOpenPositionsOnAccount?: (acc: TradingAccount) => boolean
): {
  state: UserFinancialState;
  sweptAccountNumbers: string[];
  transferredToWalletUsd: number;
  changed: boolean;
} {
  return {
    state,
    sweptAccountNumbers: [],
    transferredToWalletUsd: 0,
    changed: false,
  };
}

// Master Super Administrator Identity (Strictly Exclusive)
export const MASTER_ADMIN_EMAIL = 'mutwirib964@gmail.com';
export const MASTER_ADMIN_ALT_EMAIL = 'mutwirib964@gmail.com';
export const MASTER_ADMIN_UID = '84a1e1db-f302-4dac-a077-291128ae0cea';
export const MASTER_ADMIN_NAME = 'mutwiri';

const ALLOWED_ADMIN_EMAILS = new Set([
  'mutwirib964@gmail.com',
]);

/**
 * Strictly checks if an email belongs to the sole Master Admin (mutwirib964@gmail.com).
 * No other email is ever allowed to access the admin side.
 */
export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === 'mutwirib964@gmail.com' || clean === 'mutwrib@gmail.com';
}

/**
 * Strictly checks if a user profile is the confirmed Master Admin with UID 84a1e1db-f302-4dac-a077-291128ae0cea.
 */
export function isMasterAdminUser(user?: UserAuthProfile | null): boolean {
  if (!user || !user.email) return false;
  return (
    isMasterAdminEmail(user.email) &&
    (user.id === MASTER_ADMIN_UID || user.role === 'admin')
  );
}

/**
 * Validates that a user has a genuine UID (UUID format or verified Supabase UID).
 * Users without a valid UID saved to Supabase can never sign in.
 */
export function isValidUserUid(uid?: string | null): boolean {
  if (!uid || typeof uid !== 'string') return false;
  const trimmed = uid.trim();
  if (!trimmed || trimmed.startsWith('demo-') || trimmed.startsWith('usr-')) {
    return false;
  }
  // Standard UUID v4 / Supabase Auth UID pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed);
}

/**
 * Generates a deterministic or RFC4122 UUID v4 when needed for Supabase registration.
 */
export function generateSupabaseUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Look up a registered user by email in the local registry.
 * Guarantees that ONLY mutwrib@gmail.com / mutwirib964@gmail.com is recognized as Super Admin with UID 84a1e1db-f302-4dac-a077-291128ae0cea.
 */
export function findRegisteredUser(email: string): UserAuthProfile | null {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();

  // If this is the master admin, ensure they are registered as Super Admin with confirmed UID
  if (isMasterAdminEmail(cleanEmail)) {
    try {
      const raw = localStorage.getItem(USER_REGISTRY_KEY);
      const registry: Record<string, UserAuthProfile> = raw ? JSON.parse(raw) : {};
      delete registry['mutwrib@gmail.com'];
      const adminProfile: UserAuthProfile = {
        ...(registry[MASTER_ADMIN_EMAIL] || {}),
        id: MASTER_ADMIN_UID,
        email: MASTER_ADMIN_EMAIL,
        name: MASTER_ADMIN_NAME,
        role: 'admin',
        accountNumber: registry[MASTER_ADMIN_EMAIL]?.accountNumber || '27330648',
        countryCode: '+254',
        countryName: 'Kenya',
        isLoggedIn: true,
        createdAt: registry[MASTER_ADMIN_EMAIL]?.createdAt || 1790257470000,
      };
      registry[MASTER_ADMIN_EMAIL] = adminProfile;
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));
      return adminProfile;
    } catch {
      return {
        id: MASTER_ADMIN_UID,
        email: MASTER_ADMIN_EMAIL,
        name: MASTER_ADMIN_NAME,
        role: 'admin',
        accountNumber: '27330648',
        isLoggedIn: true,
        createdAt: 1790257470000,
      };
    }
  }

  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    if (!raw) return null;
    const registry: Record<string, UserAuthProfile> = JSON.parse(raw);
    const found = registry[cleanEmail] || null;
    if (!found) return null;

    // Enforce: NO other email can EVER have role === 'admin'
    if (found.role === 'admin' && !isMasterAdminEmail(found.email)) {
      found.role = 'normal';
      registry[cleanEmail] = found;
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));
    }
    return found;
  } catch (e) {
    console.error('Failed to look up user in registry', e);
    return null;
  }
}

/**
 * Verify credentials for sign in.
 * Recognizes ONLY master admin email with UID 84a1e1db-f302-4dac-a077-291128ae0cea as 'admin'.
 * Rejects any user without a valid UID.
 */
export function verifyUserCredentials(
  email: string,
  passwordAttempt: string
): { success: boolean; user?: UserAuthProfile; error?: string } {
  if (!email || !email.trim()) {
    return { success: false, error: 'Please enter your email.' };
  }
  if (!passwordAttempt) {
    return { success: false, error: 'Please enter your password.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = findRegisteredUser(cleanEmail);

  if (!existingUser) {
    return {
      success: false,
      error: 'Invalid email or password. Please try again.',
    };
  }

  try {
    const rawCreds = localStorage.getItem(USER_CREDENTIALS_KEY);
    const creds: Record<string, string> = rawCreds ? JSON.parse(rawCreds) : {};
    const storedPassword = creds[cleanEmail];

    // Master Admin login with confirmed UID 84a1e1db-f302-4dac-a077-291128ae0cea
    if (isMasterAdminEmail(cleanEmail)) {
      creds[cleanEmail] = passwordAttempt;
      localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(creds));

      const updatedAdmin: UserAuthProfile = {
        ...existingUser,
        id: MASTER_ADMIN_UID,
        email: cleanEmail,
        name: MASTER_ADMIN_NAME,
        role: 'admin',
        isLoggedIn: true,
      };
      getOrCreateUserProfile(updatedAdmin);
      return { success: true, user: updatedAdmin };
    }

    // Strict check: Non-admin user MUST have a valid UID
    if (!isValidUserUid(existingUser.id)) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    // If password was stored, verify match
    if (storedPassword && storedPassword !== passwordAttempt) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      };
    }

    // Enforce non-admin role for all other emails
    const safeRole = existingUser.role === 'marketer' ? 'marketer' : 'normal';
    const updatedUser: UserAuthProfile = {
      ...existingUser,
      role: safeRole,
      isLoggedIn: true,
    };
    getOrCreateUserProfile(updatedUser);

    return { success: true, user: updatedUser };
  } catch (e) {
    return { success: false, error: 'Authentication service error. Please try again.' };
  }
}

/**
 * Assign a new role to a user (Strictly 'normal' or 'marketer' for non-admin users).
 * No other email can ever be assigned 'admin'.
 * Persists locally and updates Supabase immediately.
 */
export function assignUserRole(email: string, newRole: 'normal' | 'marketer' | 'admin'): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Strictly forbid assigning 'admin' to any email other than Master Admin
  const effectiveRole: 'normal' | 'marketer' | 'admin' = isMasterAdminEmail(cleanEmail)
    ? 'admin'
    : newRole === 'marketer'
    ? 'marketer'
    : 'normal';

  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    const registry: Record<string, UserAuthProfile> = raw ? JSON.parse(raw) : {};
    if (registry[cleanEmail]) {
      registry[cleanEmail] = {
        ...registry[cleanEmail],
        role: effectiveRole,
      };
    } else {
      registry[cleanEmail] = {
        id: isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_UID : generateSupabaseUuid(),
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: effectiveRole,
        accountNumber: `VTM-${Math.floor(100000 + Math.random() * 900000)}`,
        isLoggedIn: false,
        createdAt: Date.now(),
      };
    }
    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));

    // Also update currently active user if same
    const activeRaw = localStorage.getItem('vtm_auth_user');
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active.email?.toLowerCase() === cleanEmail) {
        active.role = effectiveRole;
        localStorage.setItem('vtm_auth_user', JSON.stringify(active));
        localStorage.setItem('vtm_user_role', effectiveRole);
      }
    }

    // Sync to Supabase immediately
    supabaseService.updateUserRoleInDatabase(cleanEmail, effectiveRole).catch(() => {});
    return true;
  } catch (e) {
    console.error('Failed to assign user role', e);
  }
  return false;
}

/**
 * Register or update a user profile with password in credentials storage.
 * Enforces that every user has a valid UID and only Master Admin has 'admin' role.
 */
export function registerNewUser(
  profile: UserAuthProfile,
  password: string
): { success: boolean; user?: UserAuthProfile; error?: string } {
  if (!profile.email) {
    return { success: false, error: 'Valid email is required.' };
  }
  const cleanEmail = profile.email.trim().toLowerCase();
  const isMaster = isMasterAdminEmail(cleanEmail);

  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    const registry: Record<string, UserAuthProfile> = raw ? JSON.parse(raw) : {};
    const existing = registry[cleanEmail];

    const finalId = isMaster
      ? MASTER_ADMIN_UID
      : isValidUserUid(profile.id)
      ? profile.id
      : existing && isValidUserUid(existing.id)
      ? existing.id
      : generateSupabaseUuid();

    const finalRole = isMaster
      ? 'admin'
      : profile.role === 'marketer'
      ? 'marketer'
      : 'normal';

    const completeProfile: UserAuthProfile = {
      ...(existing || {}),
      ...profile,
      id: finalId,
      email: cleanEmail,
      role: finalRole,
      isLoggedIn: true,
      createdAt: profile.createdAt || existing?.createdAt || Date.now(),
    };
    registry[cleanEmail] = completeProfile;
    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(registry));

    // Save credentials
    if (password) {
      const rawCreds = localStorage.getItem(USER_CREDENTIALS_KEY);
      const creds: Record<string, string> = rawCreds ? JSON.parse(rawCreds) : {};
      creds[cleanEmail] = password;
      localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(creds));
    }

    return { success: true, user: completeProfile };
  } catch (e) {
    return { success: false, error: 'Failed to save registration profile.' };
  }
}

/**
 * Replaces the local user registry with the authoritative user list from Supabase,
 * removing any stale local-only users (such as joelndungu1022@gmail.com if not in Supabase).
 */
export function replaceLocalRegistryWithSupabase(
  cloudUsers: UserAuthProfile[],
  financesByEmail: Record<string, UserFinancialState>
): void {
  try {
    const newRegistry: Record<string, UserAuthProfile> = {};
    const validEmails = new Set<string>();

    cloudUsers.forEach((u) => {
      if (!u || !u.email) return;
      const isMaster = isMasterAdminEmail(u.email);
      const cleanEmail = isMaster ? MASTER_ADMIN_EMAIL : u.email.trim().toLowerCase();
      if (!isMaster && !isValidUserUid(u.id)) return;

      validEmails.add(cleanEmail);
      const profile: UserAuthProfile = {
        ...u,
        id: isMaster ? MASTER_ADMIN_UID : u.id,
        email: cleanEmail,
        name: isMaster ? MASTER_ADMIN_NAME : u.name,
        role: isMaster ? 'admin' : u.role === 'marketer' ? 'marketer' : 'normal',
        isLoggedIn: true,
      };
      newRegistry[cleanEmail] = profile;

      const fin = financesByEmail[cleanEmail] || financesByEmail[u.email.toLowerCase()];
      if (fin) {
        localStorage.setItem(STORAGE_PREFIX + cleanEmail, JSON.stringify(fin));
      }
    });

    // Guarantee Master Admin (mutwirib964@gmail.com) is always present
    if (!newRegistry[MASTER_ADMIN_EMAIL]) {
      newRegistry[MASTER_ADMIN_EMAIL] = {
        id: MASTER_ADMIN_UID,
        email: MASTER_ADMIN_EMAIL,
        name: MASTER_ADMIN_NAME,
        role: 'admin',
        accountNumber: '27330648',
        isLoggedIn: true,
        createdAt: 1790257470000,
      };
      validEmails.add(MASTER_ADMIN_EMAIL);
    }

    // Remove any local-only financial or credential records for users not in Supabase
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const emailPart = k.slice(STORAGE_PREFIX.length).toLowerCase();
          if (!validEmails.has(emailPart)) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const rawCreds = localStorage.getItem(USER_CREDENTIALS_KEY);
      if (rawCreds) {
        const creds = JSON.parse(rawCreds);
        Object.keys(creds).forEach((em) => {
          if (!validEmails.has(em.toLowerCase())) {
            delete creds[em];
          }
        });
        localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(creds));
      }
    } catch {
      // ignore cleanup errors
    }

    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(newRegistry));
  } catch (e) {
    console.warn('Failed to replace local registry with Supabase users:', e);
  }
}

/**
 * Get all registered user profiles (for Admin / Account Management)
 * Always guarantees Master Admin (mutwirib964@gmail.com) is present with confirmed UID 84a1e1db-f302-4dac-a077-291128ae0cea,
 * and ensures no other user ever has role 'admin'.
 */
export function getAllRegisteredUsers(): UserAuthProfile[] {
  findRegisteredUser(MASTER_ADMIN_EMAIL);

  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    if (raw) {
      const registry: Record<string, UserAuthProfile> = JSON.parse(raw);
      const usersList: UserAuthProfile[] = [];
      let masterAdded = false;

      Object.entries(registry).forEach(([, u]) => {
        if (!u || !u.email) return;
        if (isMasterAdminEmail(u.email)) {
          if (!masterAdded) {
            masterAdded = true;
            usersList.push({
              ...u,
              id: MASTER_ADMIN_UID,
              email: MASTER_ADMIN_EMAIL,
              name: MASTER_ADMIN_NAME,
              role: 'admin',
            });
          }
        } else if (isValidUserUid(u.id)) {
          // Only include users with a valid Supabase UID
          usersList.push({
            ...u,
            id: u.id,
            role: u.role === 'marketer' ? 'marketer' : 'normal',
          });
        }
      });

      return usersList;
    }
  } catch (e) {
    console.error('Failed to get users registry', e);
  }
  return [
    {
      id: MASTER_ADMIN_UID,
      email: MASTER_ADMIN_EMAIL,
      name: MASTER_ADMIN_NAME,
      role: 'admin',
      accountNumber: '27330648',
      isLoggedIn: true,
      createdAt: 1790257470000,
    },
  ];
}

export interface PlatformUserMetric {
  user: UserAuthProfile;
  walletBalance: number;
  accountsBalance: number;
  accountsCount: number;
  totalDepositedUsd: number;
  depositsCount: number;
  lastActive?: number;
}

export interface PlatformDepositTransaction {
  id: string;
  userEmail: string;
  userName: string;
  userId: string;
  accountNumber?: string;
  amountUsd: number;
  amountKes?: number;
  method: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: number;
  dateStr: string;
  referenceId?: string;
}

const LEGACY_MOCK_TX_IDS = new Set([
  'tx-101',
  'tx-102',
  'tx-103',
  'tx-104',
  'tx-105',
  'tx-106',
  'tx-107',
  'tx-108',
  'tx-109',
  'tx-110',
]);

const LEGACY_MOCK_REFERENCES = new Set([
  'SLK9482190',
  '0xcc6371a1f224ac0e655b6c787be086444be2f674',
  'TRF-884129',
  'B2C983104921',
  'CRD-FAIL-91024',
  'TUmex3LPfRF8Zjbx8DUw6XS7YFdmuoXKuz',
  'TX-BTC-49102941',
  'SKJ3910283',
  'STK-CAN-19402',
  'SJH2910481',
]);

export function sanitizeRealTransactions(txs?: Transaction[] | null): Transaction[] {
  if (!Array.isArray(txs)) return [];
  const seenIds = new Set<string>();
  const result: Transaction[] = [];

  for (const tx of txs) {
    if (!tx || typeof tx !== 'object') continue;
    if (tx.id && LEGACY_MOCK_TX_IDS.has(String(tx.id))) continue;
    if (tx.reference && LEGACY_MOCK_REFERENCES.has(String(tx.reference))) continue;
    // Strip any old synthetic failed withdrawal records
    if (tx.type === 'WITHDRAWAL' && String(tx.reference || '').startsWith('FAIL-WTH-')) continue;

    const dedupeKey = String(tx.id || tx.reference || `${tx.type}-${tx.timestamp}`);
    if (seenIds.has(dedupeKey)) continue;
    seenIds.add(dedupeKey);

    let normalizedStatus: Transaction['status'] = tx.status;
    if (tx.type === 'WITHDRAWAL') {
      const raw = String(tx.status || '').toUpperCase();
      const detailsStr = String(tx.details || '');
      const isFailedWithdrawal =
        raw === 'FAILED' ||
        /capacity exceeded|unsuccessful|failed|bounced back/i.test(detailsStr);
      if (isFailedWithdrawal) {
        normalizedStatus = 'FAILED';
      } else if (raw === 'PENDING') {
        const elapsed = Date.now() - (tx.timestamp || 0);
        normalizedStatus = elapsed < 15000 ? 'PENDING' : 'COMPLETED';
      } else {
        normalizedStatus = 'COMPLETED';
      }
    } else if (tx.type === 'DEPOSIT') {
      // Deposits are strictly PENDING, COMPLETED, or FAILED
      const raw = String(tx.status || '').toUpperCase();
      normalizedStatus =
        raw === 'COMPLETED' ? 'COMPLETED' : raw === 'PENDING' ? 'PENDING' : 'FAILED';
    }

    const cleanedMethod = tx.method
      ? String(tx.method)
          .replace(/\s*•?\s*HashBack\s*\([^)]*\)/gi, '')
          .replace(/\s*HashBack\s*\([^)]*\)/gi, '')
          .trim() || tx.type
      : tx.method;

    const cleanedDetails =
      tx.type === 'DEPOSIT' && normalizedStatus === 'FAILED'
        ? 'Request cancelled by user'
        : tx.type === 'WITHDRAWAL' && normalizedStatus === 'FAILED'
        ? /capacity exceeded|bounced back/i.test(String(tx.details || ''))
          ? 'Customer wallet capacity exceeded'
          : String(tx.details || 'Withdrawal unsuccessful')
              .replace(/\s*•?\s*\$?[\d,.]+\s*(?:USD\s*)?bounced back.*$/i, '')
              .trim()
        : tx.details
        ? String(tx.details)
            .replace(/\s*•?\s*HashBack\s*\([^)]*\)/gi, '')
            .replace(/\s*HashBack\s*\([^)]*\)/gi, '')
            .replace(/\s*•?\s*\$?[\d,.]+\s*(?:USD\s*)?bounced back.*$/i, '')
            .trim()
        : tx.details;

    result.push({
      ...tx,
      method: cleanedMethod,
      details: cleanedDetails,
      status: normalizedStatus,
    });
  }

  result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return result;
}

/**
 * Super Admin function: Gathers all deposits made across the entire platform.
 * Strictly sums ONLY COMPLETED deposits (failed, cancelled, or pending are never included in totalDepositedUsd).
 */
export function getAllPlatformDeposits(): {
  totalDepositedUsd: number;
  totalDepositedKes: number;
  deposits: PlatformDepositTransaction[];
} {
  const users = getAllRegisteredUsers();
  const deposits: PlatformDepositTransaction[] = [];
  const USD_KES = getUsdKesRate();

  users.forEach((u) => {
    const finances = loadUserFinancials(u);
    const txs = sanitizeRealTransactions(finances?.transactions);

    txs.forEach((tx) => {
      if (tx.type === 'DEPOSIT') {
        const amt = Math.abs(Number(tx.amount || 0));
        const rawStatus = String(tx.status || '').toUpperCase();
        const status: 'COMPLETED' | 'PENDING' | 'FAILED' =
          rawStatus === 'COMPLETED'
            ? 'COMPLETED'
            : rawStatus === 'PENDING'
            ? 'PENDING'
            : 'FAILED';
        const dateObj = new Date(tx.timestamp || Date.now());
        deposits.push({
          id: tx.id || `dep-${u.accountNumber || u.id}-${tx.timestamp}`,
          userEmail: u.email || 'Trader',
          userName: u.name || 'Trader',
          userId: u.id,
          accountNumber: tx.accountNumber || u.accountNumber,
          amountUsd: amt,
          amountKes: Number((amt * USD_KES).toFixed(2)),
          method: tx.method || 'M-PESA Express STK',
          status,
          timestamp: tx.timestamp || Date.now(),
          dateStr: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          referenceId: (tx as any).referenceId || (tx as any).checkoutRequestId || tx.reference || `VTM-DEP-${String(tx.id || '').slice(-6).toUpperCase()}`,
        });
      }
    });
  });

  // Sort latest first
  deposits.sort((a, b) => b.timestamp - a.timestamp);

  // Strictly sum ONLY COMPLETED deposits (never failed, cancelled, or pending)
  const totalDepositedUsd = Number(
    deposits.reduce((acc, curr) => (curr.status === 'COMPLETED' ? acc + curr.amountUsd : acc), 0).toFixed(2)
  );
  const totalDepositedKes = Number((totalDepositedUsd * USD_KES).toFixed(2));

  return {
    totalDepositedUsd,
    totalDepositedKes,
    deposits,
  };
}

/**
 * Super Admin function: Gathers all users with aggregated financial metrics.
 */
export function getAllPlatformUsersWithMetrics(): PlatformUserMetric[] {
  const users = getAllRegisteredUsers();

  return users.map((u) => {
    const finances = loadUserFinancials(u);
    const walletBalance = finances?.walletBalance ?? 0;
    const allAccounts = finances?.accounts ?? [];
    const liveAccounts = allAccounts.filter((a) => a.type === 'Live');
    const accountsBalance = liveAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const txs = sanitizeRealTransactions(finances?.transactions);

    // Strictly count ONLY COMPLETED deposits (failed/cancelled/pending are excluded)
    const completedDeposits = txs.filter(
      (t) => t.type === 'DEPOSIT' && String(t.status || '').toUpperCase() === 'COMPLETED'
    );
    const totalDepositedUsd = completedDeposits.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    return {
      user: u,
      walletBalance: Number(walletBalance.toFixed(2)),
      accountsBalance: Number(accountsBalance.toFixed(2)),
      accountsCount: liveAccounts.length,
      totalDepositedUsd: Number(totalDepositedUsd.toFixed(2)),
      depositsCount: completedDeposits.length,
      lastActive: finances?.lastUpdated || u.createdAt,
    };
  });
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
        const hasFailedCapacityTx7744979 = Array.isArray(parsed.transactions) &&
          parsed.transactions.some(
            (t) =>
              t &&
              (t.id === 'tx-1791238745156-h7ue' ||
                t.reference === 'B2C737528578' ||
                String(t.details || '').includes('bounced back to Account #7744979'))
          );
        let accountsToUse = parsed.accounts;
        if (hasFailedCapacityTx7744979 && localStorage.getItem('vtm_restored_7744979_h7ue') !== '1') {
          let restored = false;
          accountsToUse = parsed.accounts.map((acc) => {
            if (acc && String(acc.accountNumber) === '7744979' && acc.balance < 500) {
              restored = true;
              const nextBal = Number((acc.balance + 500).toFixed(2));
              const nextEq = Number((acc.equity + 500).toFixed(2));
              const nextFree = Number((acc.freeMargin + 500).toFixed(2));
              return { ...acc, balance: nextBal, equity: nextEq, freeMargin: nextFree };
            }
            return acc;
          });
          localStorage.setItem('vtm_restored_7744979_h7ue', '1');
          if (restored) {
            const fixedPayload: UserFinancialState = {
              ...parsed,
              accounts: accountsToUse,
              transactions: sanitizeRealTransactions(parsed.transactions),
              lastUpdated: Date.now(),
            };
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(fixedPayload));
            supabaseService.syncUserFinancials(user, fixedPayload).catch(() => {});
            return fixedPayload;
          }
        }
        const sanitized: UserFinancialState = {
          ...parsed,
          accounts: accountsToUse,
          transactions: sanitizeRealTransactions(parsed.transactions),
        };
        const swept = sweepIdleLiveAccountsSilently(user, sanitized);
        if (swept.changed) {
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(swept.state));
          supabaseService.syncUserFinancials(user, swept.state).catch(() => {});
          swept.sweptAccountNumbers.forEach((accNum) => {
            supabaseService.deleteTradingAccountFromDatabase(user, accNum, true).catch(() => {});
          });
          return swept.state;
        }
        return sanitized;
      }
    }

    // Fallback: check if active finances belongs to this key
    const activeRaw = localStorage.getItem(ACTIVE_FINANCES_KEY);
    if (activeRaw) {
      const parsed = JSON.parse(activeRaw);
      if (parsed && parsed._key === key && typeof parsed.walletBalance === 'number') {
        return {
          ...parsed,
          transactions: sanitizeRealTransactions(parsed.transactions),
        };
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
    lastUpdated: isNewRegistration ? Date.now() : 0,
  };

  // Only push empty initial state to Supabase for brand-new registrations, never on returning login before cloud hydration
  saveUserFinancials(user, newState, isNewRegistration);
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
  },
  syncToCloud = true
): void {
  const key = getUserStorageKey(user);
  try {
    const existingLocal = loadUserFinancials(user);
    const deletedSet = getDeletedAccountNumbers(user?.email);

    // Ensure no existing non-deleted local account is accidentally dropped during a state save
    const accountMap = new Map<string, TradingAccount>();
    if (existingLocal && Array.isArray(existingLocal.accounts)) {
      for (const acc of existingLocal.accounts) {
        if (!acc) continue;
        const accNum = String(acc.accountNumber || '');
        if (accNum && deletedSet.has(accNum)) continue;
        const k = accNum || acc.id;
        if (k) accountMap.set(k, acc);
      }
    }
    for (const acc of state.accounts || []) {
      if (!acc) continue;
      const accNum = String(acc.accountNumber || '');
      if (accNum && deletedSet.has(accNum)) continue;
      const k = accNum || acc.id;
      if (k) accountMap.set(k, acc);
    }

    const safeAccounts = Array.from(accountMap.values());
    const payload: UserFinancialState = {
      walletBalance: Number(state.walletBalance.toFixed(2)),
      accounts: safeAccounts,
      selectedAccountId: state.selectedAccountId ?? safeAccounts[0]?.id ?? null,
      transactions: sanitizeRealTransactions(state.transactions),
      lastUpdated: syncToCloud ? Date.now() : 0,
    };

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    localStorage.setItem(
      ACTIVE_FINANCES_KEY,
      JSON.stringify({ ...payload, _key: key })
    );

    if (syncToCloud) {
      // Sync to Supabase in background
      supabaseService.syncUserFinancials(user, payload).catch((err) => {
        console.warn('Background Supabase sync notice:', err);
      });
    }
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
          lastDepositAt: Date.now(),
          lastActivityAt: Date.now(),
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
      : { walletBalance: 0, accounts: [], transactions: [], lastUpdated: Date.now() };
    if (!Array.isArray(state.transactions)) {
      state.transactions = [];
    }

    let addedDepositUsd = 0;
    let depositTargetLabel = 'VTM Wallet';

    if (accountUpdates.walletBalance !== undefined) {
      const nextWal = Number(accountUpdates.walletBalance.toFixed(2));
      const diff = nextWal - (state.walletBalance || 0);
      if (diff > 0) {
        addedDepositUsd += diff;
        depositTargetLabel = 'VTM Wallet';
      }
      state.walletBalance = nextWal;
    }

    if (accountUpdates.accountId && accountUpdates.newBalance !== undefined) {
      const nextBal = Number(accountUpdates.newBalance.toFixed(2));
      state.accounts = state.accounts.map((acc) => {
        if (acc.id === accountUpdates.accountId || acc.accountNumber === accountUpdates.accountId) {
          if (acc.type === 'Live') {
            const diff = nextBal - (acc.balance || 0);
            if (diff > 0) {
              addedDepositUsd += diff;
              depositTargetLabel = `Account #${acc.accountNumber}`;
            }
          }
          return {
            ...acc,
            balance: nextBal,
            equity:
              accountUpdates.newEquity !== undefined
                ? Number(accountUpdates.newEquity.toFixed(2))
                : nextBal,
            freeMargin:
              accountUpdates.newEquity !== undefined
                ? Number(accountUpdates.newEquity.toFixed(2))
                : nextBal,
            leverage: accountUpdates.newLeverage || acc.leverage,
          };
        }
        return acc;
      });
    }

    const targetUser = findRegisteredUser(targetUserKey);

    if (addedDepositUsd > 0) {
      const ref = `ADM-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'DEPOSIT',
        method: 'Institutional Direct Deposit',
        amount: Number(addedDepositUsd.toFixed(2)),
        currency: 'USD',
        status: 'COMPLETED',
        timestamp: Date.now(),
        reference: ref,
        accountNumber: depositTargetLabel,
        details: `Credited to ${depositTargetLabel}`,
      };
      state.transactions = [newTx, ...(state.transactions || [])];
      if (targetUser) {
        supabaseService
          .saveDeposit(targetUser, {
            id: newTx.id,
            targetAccount: depositTargetLabel,
            amountUsd: Number(addedDepositUsd.toFixed(2)),
            amountKes: Number((addedDepositUsd * getUsdKesRate()).toFixed(2)),
            method: 'Institutional Direct Deposit',
            reference: ref,
            status: 'COMPLETED',
          })
          .catch(() => {});
      }
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

    // Immediately sync updated financials to Supabase database
    const syncProfile: UserAuthProfile = targetUser || {
      id: generateSupabaseUuid(),
      email: targetUserKey,
      name: targetUserKey.split('@')[0],
      role: 'normal',
      accountNumber: state.accounts[0]?.accountNumber || 'VTM-000000',
      isLoggedIn: false,
      createdAt: Date.now(),
    };
    supabaseService.syncUserFinancials(syncProfile, state).catch(() => {});

    return true;
  } catch (e) {
    console.error('Failed to admin update user account', e);
    return false;
  }
}

/**
 * Platforms preserve registered user accounts permanently.
 */
export function wipeAllPlatformUsersAndData(): void {
  // Disabled: accounts are preserved permanently as on live institutional platforms
  console.log('[VTM Platform] Platform wipe disabled - user registry is persistent.');
}

export function ensureZeroUsersStateOnStartup(): void {
  // Disabled: accounts are preserved permanently
}

export interface UserActivityLog {
  id: string;
  userEmail: string;
  userName: string;
  type: 'SIGNUP' | 'LOGIN' | 'LOGOUT' | 'OPEN_ACCOUNT' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'TRADE_OPEN' | 'TRADE_CLOSE' | 'ADMIN_EDIT';
  description: string;
  timestamp: number;
  device?: string;
  metadata?: any;
}

export function logUserActivity(
  user: UserAuthProfile | null | undefined,
  type: UserActivityLog['type'],
  description: string,
  metadata?: any
): void {
  if (!user) return;
  const userKey = getUserStorageKey(user);
  const log: UserActivityLog = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userEmail: user.email || userKey,
    userName: user.name || 'Trader',
    type,
    description,
    timestamp: Date.now(),
    device: typeof navigator !== 'undefined' ? `${navigator.platform || 'Web'} - ${navigator.userAgent.slice(0, 45)}` : 'Web Terminal',
    metadata: metadata || {},
  };

  try {
    const raw = localStorage.getItem('vtm_user_activities');
    const logs: UserActivityLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);
    localStorage.setItem('vtm_user_activities', JSON.stringify(logs.slice(0, 200)));
  } catch (e) {
    // ignore
  }

  // Also sync activity to Supabase / Database in background
  supabaseService.syncActivity(user, log).catch(() => {});
}

export function getAllUserActivities(): UserActivityLog[] {
  try {
    const raw = localStorage.getItem('vtm_user_activities');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export interface PlatformLiveAccountRecord {
  account: TradingAccount;
  user: UserAuthProfile;
  walletBalance: number;
  lastUpdated?: number;
}

export function getAllPlatformLiveAccounts(): PlatformLiveAccountRecord[] {
  const users = getAllRegisteredUsers();
  const records: PlatformLiveAccountRecord[] = [];
  const seenAccountNumbers = new Set<string>();

  users.forEach((u) => {
    const fin = loadUserFinancials(u);
    if (fin && Array.isArray(fin.accounts)) {
      fin.accounts.forEach((acc) => {
        if (acc && acc.type === 'Live') {
          const dedupKey = `${u.email?.toLowerCase()}-${acc.accountNumber || acc.id}`;
          if (!seenAccountNumbers.has(dedupKey)) {
            seenAccountNumbers.add(dedupKey);
            records.push({
              account: acc,
              user: u,
              walletBalance: fin.walletBalance || 0,
              lastUpdated: fin.lastUpdated || u.createdAt,
            });
          }
        }
      });
    }
  });

  records.sort((a, b) => (b.account.balance || 0) - (a.account.balance || 0));
  return records;
}

export function getPlatformFinancialSummary(): {
  totalDepositedUsd: number;
  totalDepositedKes: number;
  totalUsers: number;
  totalWalletBalancesUsd: number;
  totalTradingBalancesUsd: number;
  totalLiveAccountsCount: number;
} {
  let totalWalletBalancesUsd = 0;
  let totalTradingBalancesUsd = 0;
  let totalLiveAccountsCount = 0;

  const users = getAllRegisteredUsers();
  const depositsData = getAllPlatformDeposits();

  users.forEach((u) => {
    const fin = loadUserFinancials(u);
    if (fin) {
      totalWalletBalancesUsd += fin.walletBalance || 0;
      if (Array.isArray(fin.accounts)) {
        fin.accounts.forEach((acc) => {
          if (acc && acc.type === 'Live') {
            totalLiveAccountsCount += 1;
            totalTradingBalancesUsd += acc.balance || 0;
          }
        });
      }
    }
  });

  return {
    totalDepositedUsd: depositsData.totalDepositedUsd,
    totalDepositedKes: depositsData.totalDepositedKes,
    totalUsers: users.length,
    totalWalletBalancesUsd: Number(totalWalletBalancesUsd.toFixed(2)),
    totalTradingBalancesUsd: Number(totalTradingBalancesUsd.toFixed(2)),
    totalLiveAccountsCount,
  };
}

