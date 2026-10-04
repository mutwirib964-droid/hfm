import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Wallet,
  Building,
  Save,
  CheckCircle2,
  DollarSign,
  Users,
  ArrowDownLeft,
  Search,
  RefreshCw,
  LogOut,
  PlusCircle,
  Sun,
  Moon,
  Lock,
  Calendar,
  SlidersHorizontal,
  Hash,
} from 'lucide-react';
import { TradingAccount } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import { getUsdKesRate } from '../services/hashbackService';
import {
  getAllRegisteredUsers,
  loadUserFinancials,
  saveUserFinancials,
  assignUserRole,
  getAllPlatformDeposits,
  getAllPlatformUsersWithMetrics,
  PlatformDepositTransaction,
  PlatformUserMetric,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_UID,
  isMasterAdminEmail,
  replaceLocalRegistryWithSupabase,
} from '../utils/financialStorage';
import { supabaseService } from '../services/supabaseService';

interface AdminAccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAuthProfile | null;
  currentAccounts: TradingAccount[];
  currentWalletBalance: number;
  onApplyChanges: (updatedWallet: number, updatedAccounts: TradingAccount[]) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onSignOut?: () => void;
  isFullPage?: boolean;
}

type AdminTab = 'users' | 'balances' | 'deposits';

function formatAccountCreatedDate(ts?: number): string {
  if (!ts || isNaN(ts)) {
    return 'Sep 24, 2026';
  }
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Sep 24, 2026';
  }
}

export const AdminAccountManagerModal: React.FC<AdminAccountManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onApplyChanges,
  isDarkMode = true,
  onToggleTheme,
  onSignOut,
  isFullPage = true,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'marketer' | 'normal'>('ALL');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Users and Deposits state
  const [userMetrics, setUserMetrics] = useState<PlatformUserMetric[]>([]);
  const [depositsData, setDepositsData] = useState<{
    totalDepositedUsd: number;
    totalDepositedKes: number;
    deposits: PlatformDepositTransaction[];
  }>({ totalDepositedUsd: 0, totalDepositedKes: 0, deposits: [] });

  // Selected user for Account Balances & Role Editor
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [selectedUserRole, setSelectedUserRole] = useState<'normal' | 'marketer' | 'admin'>('normal');
  const [editableWallet, setEditableWallet] = useState<number>(0);
  const [editableAccounts, setEditableAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccIndex, setSelectedAccIndex] = useState<number>(0);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const loadLocalAdminMetrics = useCallback(() => {
    const metrics = getAllPlatformUsersWithMetrics();
    setUserMetrics(metrics);
    const deposits = getAllPlatformDeposits();
    setDepositsData(deposits);
    return metrics;
  }, []);

  // Select a user to edit their Role, Wallet Balance, and Live Trading Account Balances
  const handleSelectUserForEdit = useCallback((emailOrKey: string) => {
    const clean = emailOrKey.trim().toLowerCase();
    setSelectedUserEmail(clean);

    const allUsers = getAllRegisteredUsers();
    const targetUser =
      allUsers.find((u) => u.email.toLowerCase() === clean) ||
      ({ id: clean, email: clean, name: clean.split('@')[0], role: 'normal' } as UserAuthProfile);

    setSelectedUserRole(
      isMasterAdminEmail(clean)
        ? 'admin'
        : targetUser.role === 'marketer'
        ? 'marketer'
        : 'normal'
    );

    const rawFin = loadUserFinancials(targetUser);
    if (rawFin) {
      setEditableWallet(rawFin.walletBalance);
      setEditableAccounts(rawFin.accounts || []);
      setSelectedAccIndex(0);
    } else {
      setEditableWallet(0);
      setEditableAccounts([]);
      setSelectedAccIndex(0);
    }
  }, []);

  // Fetch all real users & finances from Supabase and replace local cache with authoritative Supabase state
  const syncFromSupabaseCloud = useCallback(async () => {
    setIsSyncingCloud(true);
    try {
      if (!supabaseService.isConfigured()) {
        await supabaseService.initServerConfig();
      }
      const cloudData = await supabaseService.fetchAllPlatformUsersAndFinances();
      if (cloudData) {
        replaceLocalRegistryWithSupabase(cloudData.users, cloudData.financesByEmail);
      }
    } catch (e) {
      console.warn('Admin cloud sync notice:', e);
    } finally {
      const updatedMetrics = loadLocalAdminMetrics();
      setIsSyncingCloud(false);

      if (
        updatedMetrics.length > 0 &&
        (!selectedUserEmail || !updatedMetrics.some((m) => m.user.email.toLowerCase() === selectedUserEmail))
      ) {
        const firstClient =
          updatedMetrics.find((m) => !isMasterAdminEmail(m.user.email)) || updatedMetrics[0];
        if (firstClient) {
          handleSelectUserForEdit(firstClient.user.email);
        }
      }
    }
  }, [loadLocalAdminMetrics, selectedUserEmail, handleSelectUserForEdit]);

  useEffect(() => {
    if (!isOpen) return;
    loadLocalAdminMetrics();
    syncFromSupabaseCloud();
    const interval = setInterval(() => {
      syncFromSupabaseCloud();
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen, loadLocalAdminMetrics, syncFromSupabaseCloud]);

  // Create a new Live Trading Account for the selected user immediately
  const handleAddLiveAccountForUser = () => {
    const newAccNumber = `${Math.floor(1000000 + Math.random() * 9000000)}`;
    const newLiveAccount: TradingAccount = {
      id: `acc-${Date.now()}`,
      accountNumber: newAccNumber,
      type: 'Live',
      tier: 'Premium',
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      marginLevel: 0,
      currency: 'USD',
      leverage: '1:500',
      server: 'VTM-Live-Server1',
      isDefault: editableAccounts.length === 0,
    };

    setEditableAccounts((prev) => {
      const next = [...prev, newLiveAccount];
      setSelectedAccIndex(next.length - 1);
      return next;
    });

    setStatusMessage({
      text: `Live Account #${newAccNumber} created for ${selectedUserEmail}. Enter the account balance below and click Save Balances & Role Immediately.`,
      type: 'info',
    });
  };

  // Update a field on the selected user's Live Account
  const handleUpdateAccountField = (index: number, field: keyof TradingAccount, val: any) => {
    setEditableAccounts((prev) => {
      const copy = [...prev];
      const current = { ...copy[index] };

      if (field === 'balance') {
        const numVal = Number(val) || 0;
        current.balance = numVal;
        current.equity = numVal;
        current.freeMargin = Math.max(0, numVal - (current.margin || 0));
      } else if (field === 'equity') {
        const numVal = Number(val) || 0;
        current.equity = numVal;
        current.freeMargin = Math.max(0, numVal - (current.margin || 0));
      } else {
        (current as any)[field] = val;
      }

      copy[index] = current;
      return copy;
    });
  };

  // Save Role + Wallet + Live Accounts immediately
  const handleSaveUserAndLiveAccounts = async () => {
    if (!selectedUserEmail) return;
    setIsSavingChanges(true);

    try {
      const cleanEmail = selectedUserEmail.trim().toLowerCase();
      const allUsers = getAllRegisteredUsers();
      const existingProfile =
        allUsers.find((u) => u.email.toLowerCase() === cleanEmail) ||
        ({
          id: isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_UID : cleanEmail,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: selectedUserRole,
        } as UserAuthProfile);

      const effectiveRole: 'normal' | 'marketer' | 'admin' = isMasterAdminEmail(cleanEmail)
        ? 'admin'
        : selectedUserRole === 'marketer'
        ? 'marketer'
        : 'normal';

      // 1. Update role locally & in database
      assignUserRole(cleanEmail, effectiveRole);
      await supabaseService.updateUserRoleInDatabase(cleanEmail, effectiveRole);

      // 2. Preserve user's existing transactions and record any newly credited deposit to database
      const existingFin = loadUserFinancials(existingProfile);
      const prevWallet = existingFin?.walletBalance || 0;
      const prevLiveTotal = (existingFin?.accounts || [])
        .filter((a) => a.type === 'Live')
        .reduce((sum, a) => sum + (a.balance || 0), 0);
      const newWallet = Number(editableWallet.toFixed(2));
      const newLiveTotal = editableAccounts
        .filter((a) => a.type === 'Live')
        .reduce((sum, a) => sum + (a.balance || 0), 0);

      const nextTransactions = [...(existingFin?.transactions || [])];
      const netCreditedUsd = Number((newWallet + newLiveTotal - (prevWallet + prevLiveTotal)).toFixed(2));

      if (netCreditedUsd > 0) {
        const targetAcc =
          newLiveTotal > prevLiveTotal
            ? `Account #${editableAccounts.find((a) => a.type === 'Live')?.accountNumber || 'Live'}`
            : 'VTM Wallet';
        const depRef = `DB-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const depTx = {
          id: `tx-${Date.now()}`,
          type: 'DEPOSIT' as const,
          method: 'Direct Account Deposit',
          amount: netCreditedUsd,
          currency: 'USD',
          status: 'COMPLETED' as const,
          timestamp: Date.now(),
          reference: depRef,
          accountNumber: targetAcc,
          details: `Deposited to ${targetAcc}`,
        };
        nextTransactions.unshift(depTx);
        await supabaseService
          .saveDeposit(existingProfile, {
            id: depTx.id,
            targetAccount: targetAcc,
            amountUsd: netCreditedUsd,
            amountKes: Number((netCreditedUsd * getUsdKesRate()).toFixed(2)),
            method: 'Direct Account Deposit',
            reference: depRef,
            status: 'COMPLETED',
          })
          .catch(() => {});
      }

      const updatedFinState = {
        walletBalance: newWallet,
        accounts: editableAccounts,
        selectedAccountId:
          editableAccounts[selectedAccIndex]?.id ||
          editableAccounts[0]?.id ||
          existingFin?.selectedAccountId ||
          null,
        transactions: nextTransactions,
        lastUpdated: Date.now(),
      };

      // 3. Save locally and push immediately to cloud database
      saveUserFinancials(existingProfile, updatedFinState);
      await supabaseService.syncUserFinancials(existingProfile, updatedFinState);

      // 4. If editing current active user session, apply immediately
      if (currentUser && currentUser.email.toLowerCase() === cleanEmail) {
        onApplyChanges(editableWallet, editableAccounts);
      }

      loadLocalAdminMetrics();

      const liveCount = editableAccounts.filter((a) => a.type === 'Live').length;
      setStatusMessage({
        text: `Changes saved immediately for ${existingProfile.name} (${cleanEmail}). Role: ${
          effectiveRole === 'marketer' ? 'Marketer' : effectiveRole === 'admin' ? 'Administrator' : 'Retail Trader'
        } · Live Accounts: ${liveCount}.`,
        type: 'success',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({
        text: 'Unable to save changes. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Instant Role Assignment from the Users Directory Table
  const handleQuickAssignRole = async (email: string, newRole: 'normal' | 'marketer') => {
    const clean = email.trim().toLowerCase();
    if (isMasterAdminEmail(clean)) return;

    const ok = assignUserRole(clean, newRole);
    await supabaseService.updateUserRoleInDatabase(clean, newRole);

    if (ok) {
      if (selectedUserEmail.toLowerCase() === clean) {
        setSelectedUserRole(newRole);
      }
      loadLocalAdminMetrics();
      setStatusMessage({
        text: `Role for ${clean} updated to ${
          newRole === 'marketer' ? 'Marketer' : 'Retail Trader'
        } with immediate effect.`,
        type: 'success',
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return userMetrics.filter((m) => {
      const u = m.user;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userMetrics, searchQuery, roleFilter]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return depositsData.deposits;
    return depositsData.deposits.filter(
      (d) =>
        d.userEmail.toLowerCase().includes(q) ||
        d.userName.toLowerCase().includes(q) ||
        (d.referenceId && d.referenceId.toLowerCase().includes(q)) ||
        d.method.toLowerCase().includes(q)
    );
  }, [depositsData.deposits, searchQuery]);

  // Platform Aggregate Totals (Live Trading Accounts strictly in terms of numbers/count)
  const platformStats = useMemo(() => {
    const totalUsers = userMetrics.length;
    const marketersCount = userMetrics.filter((m) => m.user.role === 'marketer').length;
    const tradersCount = userMetrics.filter((m) => m.user.role === 'normal').length;
    const totalLiveAccountsCount = userMetrics.reduce((s, m) => s + (m.accountsCount || 0), 0);

    return {
      totalUsers,
      marketersCount,
      tradersCount,
      totalLiveAccountsCount,
    };
  }, [userMetrics]);

  if (!isOpen) return null;

  const selectedAcc = editableAccounts[selectedAccIndex] || null;
  const selectedUserObj =
    userMetrics.find((m) => m.user.email.toLowerCase() === selectedUserEmail)?.user || null;

  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const secondaryText = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const cardBg = isDarkMode
    ? 'bg-[#0E1118] border-white/[0.08]'
    : 'bg-white border-slate-200 shadow-xs';
  const inputBg = isDarkMode
    ? 'bg-[#090B10] border-white/[0.1] text-white placeholder:text-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div
      className={`${
        isFullPage
          ? 'min-h-screen w-full flex flex-col'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs'
      } ${
        isDarkMode ? 'dark bg-[#090B10] text-slate-100' : 'bg-slate-50 text-slate-900'
      } font-['Plus_Jakarta_Sans',sans-serif] antialiased transition-colors duration-200`}
    >
      {/* TOP BAR */}
      <header
        className={`pwa-safe-top sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
          isDarkMode
            ? 'bg-[#0E1118]/95 backdrop-blur-md border-white/[0.08]'
            : 'bg-white/95 backdrop-blur-md border-slate-200 shadow-2xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E51937] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-semibold tracking-tight truncate">
                VTM Markets Administration
              </h1>
              <div className={`flex items-center gap-1.5 text-[11px] sm:text-xs truncate ${mutedText}`}>
                <span className="hidden xs:inline">Administrator</span>
                <span className="hidden xs:inline" aria-hidden="true">·</span>
                <span className={`font-medium truncate ${secondaryText}`}>{MASTER_ADMIN_EMAIL}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={syncFromSupabaseCloud}
              disabled={isSyncingCloud}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDarkMode
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingCloud ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{isSyncingCloud ? 'Syncing...' : 'Refresh Data'}</span>
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isDarkMode
                    ? 'border-white/[0.1] bg-white/[0.05] text-amber-400 hover:bg-white/[0.1]'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#E51937] hover:bg-[#c9142f] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}

            {!isFullPage && (
              <button
                type="button"
                onClick={onClose}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  isDarkMode
                    ? 'border-white/10 text-slate-400 hover:text-white'
                    : 'border-slate-300 text-slate-600 hover:text-slate-900'
                }`}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* EXECUTIVE KPI SUMMARY ROW (3 CARDS: USERS, MONEY DEPOSITED, LIVE TRADING ACCOUNTS IN NUMBERS) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* KPI 1: Number of Users in the Website */}
          <div
            onClick={() => setActiveTab('users')}
            className={`p-5 rounded-xl border cursor-pointer transition-colors ${cardBg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${mutedText}`}>
                Total Website Users
              </span>
              <Users className={`w-4 h-4 ${mutedText}`} />
            </div>
            <div className="text-3xl font-semibold font-mono tabular-nums tracking-tight">
              {platformStats.totalUsers}
            </div>
            <div className={`mt-2 flex items-center gap-2 text-xs ${mutedText}`}>
              <span>{platformStats.marketersCount} Marketers</span>
              <span aria-hidden="true">·</span>
              <span>{platformStats.tradersCount} Retail Traders</span>
            </div>
          </div>

          {/* KPI 2: Money Deposited (Money In - Strictly COMPLETED Transactions Only) */}
          <div
            onClick={() => setActiveTab('deposits')}
            className={`p-5 rounded-xl border cursor-pointer transition-colors ${cardBg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${mutedText}`}>
                Total Money Deposited
              </span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-semibold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              ${depositsData.totalDepositedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`mt-2 flex items-center gap-2 text-xs font-mono tabular-nums ${mutedText}`}>
              <span>
                KES {depositsData.totalDepositedKes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-sans">
                {depositsData.deposits.filter((d) => d.status === 'COMPLETED').length} completed deposits
              </span>
            </div>
          </div>

          {/* KPI 3: Live Trading Accounts (Strictly in terms of numbers / count, NOT dollar amount) */}
          <div
            onClick={() => setActiveTab('balances')}
            className={`p-5 rounded-xl border cursor-pointer transition-colors ${cardBg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${mutedText}`}>
                Live Trading Accounts
              </span>
              <Hash className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-3xl font-semibold font-mono tabular-nums tracking-tight">
              {platformStats.totalLiveAccountsCount}
            </div>
            <div className={`mt-2 flex items-center gap-2 text-xs ${mutedText}`}>
              <span>Active live accounts opened across users</span>
            </div>
          </div>
        </section>

        {/* SEGMENTED NAVIGATION BAR */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
            isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
          }`}
        >
          <div
            className={`inline-flex items-center gap-1 p-1 rounded-xl border ${
              isDarkMode
                ? 'bg-[#0E1118] border-white/[0.08]'
                : 'bg-slate-200/70 border-slate-300/80'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-[#E51937] text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Website Users ({userMetrics.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('balances')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'balances'
                  ? 'bg-[#E51937] text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit Account Balances &amp; Roles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deposits')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'deposits'
                  ? 'bg-[#E51937] text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Money Deposited (${depositsData.totalDepositedUsd.toFixed(2)})</span>
            </button>
          </div>

          {/* Global Admin User Search Bar (Search by Username or Email) */}
          <div className="relative w-full sm:w-80">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
            <input
              type="text"
              placeholder="Search user by username or email..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim()) {
                  const q = val.trim().toLowerCase();
                  const match = userMetrics.find(
                    (m) =>
                      m.user.name.toLowerCase().includes(q) ||
                      m.user.email.toLowerCase().includes(q)
                  );
                  if (match) {
                    handleSelectUserForEdit(match.user.email);
                  }
                }
              }}
              className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-1 cursor-pointer ${mutedText}`}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* STATUS FEEDBACK BANNER */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
              statusMessage.type === 'success'
                ? isDarkMode
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : statusMessage.type === 'info'
                ? isDarkMode
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-sky-50 border-sky-300 text-sky-800'
                : isDarkMode
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: WEBSITE USERS DIRECTORY */}
        {activeTab === 'users' && (
          <section className={`rounded-xl border overflow-hidden ${cardBg}`}>
            {/* Table Toolbar */}
            <div
              className={`p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs ${mutedText}`}>Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:border-[#E51937] ${inputBg}`}
                >
                  <option value="ALL">All Users ({userMetrics.length})</option>
                  <option value="marketer">Marketers ({platformStats.marketersCount})</option>
                  <option value="normal">Retail Traders ({platformStats.tradersCount})</option>
                  <option value="admin">Administrator (1)</option>
                </select>
              </div>
            </div>

            {/* Clean Professional Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-semibold ${mutedText} ${
                      isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <th className="py-3.5 px-4">Name &amp; Email</th>
                    <th className="py-3.5 px-4">Account Created</th>
                    <th className="py-3.5 px-4">Money Deposited</th>
                    <th className="py-3.5 px-4">Live Trading Accounts</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y text-xs ${
                    isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-200'
                  }`}
                >
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`py-10 text-center ${mutedText}`}>
                        No matching users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((m) => {
                      const u = m.user;
                      const isMaster = isMasterAdminEmail(u.email);
                      const displayEmail = isMaster ? MASTER_ADMIN_EMAIL : u.email;

                      return (
                        <tr
                          key={u.email || u.id}
                          className={`transition-colors ${
                            isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 1. Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-sm">
                              {u.name || 'Trader'}
                            </div>
                            <div className={`text-xs mt-0.5 ${mutedText}`}>{displayEmail}</div>
                          </td>

                          {/* 2. When They Created Account */}
                          <td className={`py-3.5 px-4 whitespace-nowrap ${secondaryText}`}>
                            <div className="inline-flex items-center gap-1.5">
                              <Calendar className={`w-3.5 h-3.5 ${mutedText}`} />
                              <span>{formatAccountCreatedDate(u.createdAt)}</span>
                            </div>
                          </td>

                          {/* 3. Money They Have Deposited */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              ${m.totalDepositedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            {m.depositsCount > 0 && (
                              <span className={`text-[11px] ml-1.5 font-sans ${mutedText}`}>
                                ({m.depositsCount})
                              </span>
                            )}
                          </td>

                          {/* 4. Live Trading Account in terms of numbers (count, NOT dollar amount) */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums">
                            <span className="font-semibold text-sm">
                              {m.accountsCount}
                            </span>
                            <span className={`text-xs font-sans ml-1.5 ${mutedText}`}>
                              {m.accountsCount === 1 ? 'Live Account' : 'Live Accounts'}
                            </span>
                          </td>

                          {/* 5. Assigning Roles */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isMaster ? (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${mutedText}`}>
                                <Lock className="w-3.5 h-3.5 text-[#E51937]" />
                                <span>Administrator</span>
                              </span>
                            ) : (
                              <select
                                value={u.role === 'marketer' ? 'marketer' : 'normal'}
                                onChange={(e) =>
                                  handleQuickAssignRole(
                                    u.email,
                                    e.target.value as 'normal' | 'marketer'
                                  )
                                }
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer transition-colors ${
                                  u.role === 'marketer'
                                    ? isDarkMode
                                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                                      : 'bg-purple-50 border-purple-300 text-purple-800'
                                    : inputBg
                                }`}
                              >
                                <option value="normal">Retail Trader</option>
                                <option value="marketer">Marketer</option>
                              </select>
                            )}
                          </td>

                          {/* 6. Edit Account Balances Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectUserForEdit(u.email);
                                setActiveTab('balances');
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                                isDarkMode
                                  ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                              }`}
                            >
                              <Wallet className="w-3.5 h-3.5 text-[#E51937]" />
                              <span>Edit Balances</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: PLACE TO EDIT USERS ACCOUNT BALANCES AND ASSIGNING ROLES */}
        {activeTab === 'balances' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: User & Role Selection + Wallet Balance */}
            <div className={`lg:col-span-5 p-5 rounded-xl border space-y-5 h-fit ${cardBg}`}>
              <div>
                <h2 className="text-sm font-semibold">1. Select User &amp; Assign Role</h2>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Role and balance updates apply immediately to the user&apos;s account.
                </p>
              </div>

              {/* Search Bar + User Selector (Search by Username or Email) */}
              <div className="space-y-2.5">
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${mutedText}`}>
                    Search User by Username or Email
                  </label>
                  <div className="relative">
                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                    <input
                      type="text"
                      placeholder="Type username or email to find user..."
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (val.trim()) {
                          const q = val.trim().toLowerCase();
                          const match = userMetrics.find(
                            (m) =>
                              m.user.name.toLowerCase().includes(q) ||
                              m.user.email.toLowerCase().includes(q)
                          );
                          if (match) {
                            handleSelectUserForEdit(match.user.email);
                          }
                        }
                      }}
                      className={`w-full pl-9 pr-8 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-1 cursor-pointer ${mutedText}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${mutedText}`}>
                    Select Website User ({filteredUsers.length} matching)
                  </label>
                  <select
                    value={selectedUserEmail}
                    onChange={(e) => handleSelectUserForEdit(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border text-xs font-medium focus:outline-none focus:border-[#E51937] ${inputBg}`}
                  >
                    {(filteredUsers.length > 0 ? filteredUsers : userMetrics).map((m) => {
                      const isMaster = isMasterAdminEmail(m.user.email);
                      const emailShown = isMaster ? MASTER_ADMIN_EMAIL : m.user.email;
                      return (
                        <option key={m.user.email} value={m.user.email.toLowerCase()}>
                          {m.user.name} — {emailShown} ({m.accountsCount} Live Accounts)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedUserObj && (
                  <div className={`pt-1 flex items-center justify-between text-xs ${mutedText}`}>
                    <span>Created: {formatAccountCreatedDate(selectedUserObj.createdAt)}</span>
                    <span>
                      Live Accounts: {editableAccounts.filter((a) => a.type === 'Live').length}
                    </span>
                  </div>
                )}
              </div>

              {/* Role Assignment Selector */}
              <div className="space-y-1.5">
                <label className={`text-xs font-medium block ${mutedText}`}>
                  Assign Account Role
                </label>
                {isMasterAdminEmail(selectedUserEmail) ? (
                  <div
                    className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                      isDarkMode
                        ? 'border-white/[0.08] bg-white/[0.02] text-slate-300'
                        : 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-[#E51937]" />
                    <span>Administrator ({MASTER_ADMIN_EMAIL})</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserRole('normal')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        selectedUserRole === 'normal'
                          ? 'bg-[#E51937] border-[#E51937] text-white'
                          : isDarkMode
                          ? 'bg-[#090B10] border-white/[0.08] text-slate-400 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Retail Trader
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUserRole('marketer')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        selectedUserRole === 'marketer'
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : isDarkMode
                          ? 'bg-[#090B10] border-white/[0.08] text-slate-400 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Marketer
                    </button>
                  </div>
                )}
              </div>

              {/* Central Wallet Balance Editor */}
              <div
                className={`pt-3 border-t space-y-2.5 ${
                  isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-medium ${secondaryText}`}>
                    Central Wallet Balance (USD)
                  </label>
                  <span className="text-xs font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                    ${editableWallet.toFixed(2)}
                  </span>
                </div>

                <div className="relative">
                  <DollarSign className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    type="number"
                    step="0.01"
                    value={editableWallet}
                    onChange={(e) => setEditableWallet(parseFloat(e.target.value) || 0)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border font-mono tabular-nums font-semibold text-sm focus:outline-none focus:border-[#E51937] ${inputBg}`}
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[50, 100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() =>
                        setEditableWallet((prev) => Number((prev + amt).toFixed(2)))
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums font-medium border cursor-pointer ${
                        isDarkMode
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      +${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditableWallet(0)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums font-medium border cursor-pointer ${
                      isDarkMode
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Reset $0
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Trading Accounts Balances Editor */}
            <div className={`lg:col-span-7 p-5 rounded-xl border space-y-5 flex flex-col justify-between ${cardBg}`}>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">
                      2. Edit User&apos;s Live Trading Accounts ({editableAccounts.length})
                    </h2>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Select an account below or create a new Live Account for this user.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLiveAccountForUser}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors self-start ${
                      isDarkMode
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Add Live Account</span>
                  </button>
                </div>

                {editableAccounts.length === 0 ? (
                  <div
                    className={`p-8 rounded-xl border border-dashed text-center space-y-3 ${
                      isDarkMode ? 'border-white/[0.1]' : 'border-slate-300'
                    }`}
                  >
                    <Building className={`w-6 h-6 mx-auto ${mutedText}`} />
                    <p className={`text-xs ${mutedText}`}>
                      This user currently has 0 Live Trading Accounts.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddLiveAccountForUser}
                      className="px-4 py-2 rounded-lg bg-[#E51937] hover:bg-[#c9142f] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create Live Trading Account</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Account Number Selector Tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {editableAccounts.map((acc, idx) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedAccIndex(idx)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${
                            selectedAccIndex === idx
                              ? 'bg-[#E51937] border-[#E51937] text-white'
                              : isDarkMode
                              ? 'bg-[#090B10] border-white/[0.08] text-slate-400 hover:text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-semibold">{acc.type}</span>
                          <span className="font-mono">#{acc.accountNumber}</span>
                        </button>
                      ))}
                    </div>

                    {selectedAcc && (
                      <div
                        className={`p-4 rounded-xl border space-y-4 ${
                          isDarkMode
                            ? 'bg-[#090B10] border-white/[0.08]'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Live Account Balance */}
                          <div>
                            <label className={`text-xs font-medium block mb-1.5 ${mutedText}`}>
                              Account #{selectedAcc.accountNumber} Balance (USD)
                            </label>
                            <div className="relative">
                              <DollarSign className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                              <input
                                type="number"
                                step="0.01"
                                value={selectedAcc.balance}
                                onChange={(e) =>
                                  handleUpdateAccountField(
                                    selectedAccIndex,
                                    'balance',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={`w-full pl-9 pr-3 py-2 rounded-lg border font-mono tabular-nums font-semibold text-sm focus:outline-none focus:border-[#E51937] ${
                                  isDarkMode
                                    ? 'bg-[#0E1118] border-white/[0.1] text-white'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Account Equity */}
                          <div>
                            <label className={`text-xs font-medium block mb-1.5 ${mutedText}`}>
                              Account Equity (USD)
                            </label>
                            <div className="relative">
                              <DollarSign className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                              <input
                                type="number"
                                step="0.01"
                                value={selectedAcc.equity}
                                onChange={(e) =>
                                  handleUpdateAccountField(
                                    selectedAccIndex,
                                    'equity',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={`w-full pl-9 pr-3 py-2 rounded-lg border font-mono tabular-nums font-semibold text-sm focus:outline-none focus:border-[#E51937] ${
                                  isDarkMode
                                    ? 'bg-[#0E1118] border-white/[0.1] text-white'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Balance Presets for Live Account */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[100, 500, 1000, 5000, 10000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() =>
                                handleUpdateAccountField(
                                  selectedAccIndex,
                                  'balance',
                                  Number(((selectedAcc.balance || 0) + amt).toFixed(2))
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums font-medium border cursor-pointer ${
                                isDarkMode
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              +${amt.toLocaleString()}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateAccountField(selectedAccIndex, 'balance', 0)
                            }
                            className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums font-medium border cursor-pointer ${
                              isDarkMode
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            Reset $0
                          </button>
                        </div>

                        <div
                          className={`grid grid-cols-2 gap-3 pt-2 border-t ${
                            isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <label className={`text-[11px] font-medium block mb-1 ${mutedText}`}>
                              Account Type
                            </label>
                            <select
                              value={selectedAcc.type}
                              onChange={(e) =>
                                handleUpdateAccountField(
                                  selectedAccIndex,
                                  'type',
                                  e.target.value
                                )
                              }
                              className={`w-full p-2 rounded-lg border text-xs font-medium ${
                                isDarkMode
                                  ? 'bg-[#0E1118] border-white/[0.1] text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              <option value="Live">Live Account</option>
                              <option value="Demo">Demo Account</option>
                            </select>
                          </div>

                          <div>
                            <label className={`text-[11px] font-medium block mb-1 ${mutedText}`}>
                              Leverage
                            </label>
                            <select
                              value={selectedAcc.leverage}
                              onChange={(e) =>
                                handleUpdateAccountField(
                                  selectedAccIndex,
                                  'leverage',
                                  e.target.value
                                )
                              }
                              className={`w-full p-2 rounded-lg border text-xs font-medium ${
                                isDarkMode
                                  ? 'bg-[#0E1118] border-white/[0.1] text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              <option value="1:100">1:100</option>
                              <option value="1:200">1:200</option>
                              <option value="1:500">1:500</option>
                              <option value="1:1000">1:1000</option>
                              <option value="1:2000">1:2000</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save Action Footer */}
              <div
                className={`pt-5 border-t flex items-center justify-end ${
                  isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={handleSaveUserAndLiveAccounts}
                  disabled={isSavingChanges}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#E51937] hover:bg-[#c9142f] text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingChanges ? 'Saving Changes...' : 'Save Balances & Role Immediately'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: MONEY DEPOSITED LEDGER */}
        {activeTab === 'deposits' && (
          <section className={`rounded-xl border overflow-hidden ${cardBg}`}>
            <div
              className={`p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                <input
                  type="text"
                  placeholder="Search deposits by name, email, or payment method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
                />
              </div>

              <div className={`text-xs font-mono tabular-nums ${mutedText}`}>
                Total Deposited:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  ${depositsData.totalDepositedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {filteredDeposits.length === 0 ? (
              <div className={`p-10 text-center text-xs ${mutedText}`}>
                No deposit records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-semibold ${mutedText} ${
                        isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">User Name &amp; Email</th>
                      <th className="py-3.5 px-4">Payment Method</th>
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4 text-right">Amount (USD)</th>
                      <th className="py-3.5 px-4 text-right">Amount (KES)</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y text-xs ${
                      isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-200'
                    }`}
                  >
                    {filteredDeposits.map((d) => (
                      <tr
                        key={d.id}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`py-3.5 px-4 whitespace-nowrap ${mutedText}`}>
                          {d.dateStr}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">
                            {d.userName}
                          </div>
                          <div className={`text-[11px] ${mutedText}`}>{d.userEmail}</div>
                        </td>
                        <td className={`py-3.5 px-4 font-medium ${secondaryText}`}>
                          {d.method}
                        </td>
                        <td className={`py-3.5 px-4 font-mono ${mutedText}`}>
                          {d.referenceId}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          +${d.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono tabular-nums ${secondaryText}`}>
                          KES {(d.amountKes || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {d.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
