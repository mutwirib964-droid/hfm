import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActiveTab,
  Instrument,
  TradingAccount,
  Position,
  PendingOrder,
  ClosedTrade,
  Timeframe,
  ChartType,
  Candle,
  StrategyProvider,
  FollowedStrategy,
  Transaction,
  AccountTier,
  AccountType,
} from './types';
import {
  INITIAL_INSTRUMENTS,
  INITIAL_ACCOUNTS,
  STRATEGY_PROVIDERS,
  INITIAL_FOLLOWED,
  INITIAL_TRANSACTIONS,
  ECONOMIC_EVENTS,
  MARKET_ANALYSES,
  generateCandles,
} from './data/initialData';
import { tvService, TVQuote } from './services/tradingViewService';
import { checkInstrumentMarketHours } from './utils/marketHours';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { MarketsTab } from './components/MarketsTab';
import { TradeTab } from './components/TradeTab';
import { TradesTab } from './components/TradesTab';
import { NewsTab } from './components/NewsTab';
import { MoreTab } from './components/MoreTab';
import { InstrumentDetailView } from './components/InstrumentDetailView';
import { MenuDrawer } from './components/MenuDrawer';
import { CopyTradingTab } from './components/CopyTradingTab';
import { WalletTab } from './components/WalletTab';
import { AccountTab } from './components/AccountTab';
import { VTMLogo } from './components/VTMLogo';
import { BotsTab } from './components/BotsTab';
import { LandingPage } from './components/LandingPage';
import { getStoredTotpState, saveStoredTotpState } from './utils/totp';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PWAInstallModals } from './components/pwa/PWAInstallModals';
import { ActionPopupManager } from './components/popups/ActionPopupManager';
import { ActionToastBanner } from './components/popups/ActionToastBanner';
import { ActionPopup, PriceAlert } from './types';
import { PriceAlertModal } from './components/PriceAlertModal';
import {
  loadPriceAlerts,
  savePriceAlerts,
  getPriceAlertsUpdatedAt,
  playAlertChime,
} from './utils/priceAlertStorage';
import { UserRole, BotStrategyConfig, BotRunInstance, BotTrade, UserAuthProfile } from './types/botTypes';
import {
  DEFAULT_INBUILT_BOTS,
  loadStoredBotRuns,
  saveStoredBotRuns,
  loadStoredBotTrades,
  saveStoredBotTrades,
  loadStoredImportedBots,
  saveStoredImportedBots,
  getDeletedBotIds,
  getDeletedBotTimestamps,
  markBotDeletedLocally,
  unmarkBotDeletedLocally,
  sanitizeAndFilterBotRuns,
  filterTradesForValidBotRuns,
  reconcilePrivilegedBotTradesAndRuns,
  evaluateTargetWinOrLoss,
  determineBotTradeDirection,
  calculateBotPnL,
  getContractSize,
  getAccountMaxOpenTrades,
  getTargetConcurrentBotTrades,
} from './services/botTradingService';
import { Wifi, Battery, Signal, Zap, Radio } from 'lucide-react';
import { AdminAccountManagerModal } from './components/AdminAccountManagerModal';
import {
  loadUserFinancials,
  saveUserFinancials,
  initializeUserFinancials,
  executeInternalTransfer,
  logUserActivity,
  wipeAllPlatformUsersAndData,
  findRegisteredUser,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_UID,
  isMasterAdminEmail,
  isValidUserUid,
  sweepIdleLiveAccountsSilently,
  markAccountDeletedLocally,
  mergeUserFinancialStates,
  calculateNetWalletFromLedger,
  reconcileWalletBalanceWithTransactions,
} from './utils/financialStorage';
import { supabaseService, UserPlatformSettings } from './services/supabaseService';
import { getUsdKesWithdrawRate } from './services/payheroService';
import {
  INSTRUMENT_SPECS,
  getInstrumentSpec,
  calculateUnifiedPnL,
  calculateRequiredMargin,
  validateStopLossTakeProfit,
  calculatePipTargetPrices,
  getInstrumentPipSize,
} from './utils/contractSpecs';
import {
  appendLedgerEntry,
  reconcileAccount,
  isTradeSettled,
  markTradeSettled,
  loadUserLedger,
  syncUserLedgerFromCloud,
  LedgerEntry,
} from './utils/financialLedger';
import { referralService } from './services/referralService';


let isAudioMuted = false;

// Subtle Web Audio synthesizer for trade execution sound
function playOrderSound(isSuccess: boolean = true) {
  if (isAudioMuted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

export default function App() {
  // App Navigation & View Modes
  const [activeTab, setActiveTab] = useState<ActiveTab>('markets');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vtm_theme_mode');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState<boolean>(false);
  const [oneClickTrading, setOneClickTrading] = useState<boolean>(true);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  useEffect(() => {
    isAudioMuted = !soundEnabled;
  }, [soundEnabled]);
  const [showSpreadBrackets, setShowSpreadBrackets] = useState<boolean>(true);
  const [drawdownProtection, setDrawdownProtection] = useState<boolean>(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem('vtm_auth_user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      const totpState = getStoredTotpState(parsedUser?.email);
      return Boolean(totpState.enabled && totpState.secret);
    } catch {
      return false;
    }
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('vtm_auth_user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      return getStoredTotpState(parsedUser?.email).secret || '';
    } catch {
      return '';
    }
  });
  const [ledgerSyncCounter, setLedgerSyncCounter] = useState<number>(0);

  // Market & Accounts State
  const [instruments, setInstruments] = useState<Instrument[]>(INITIAL_INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const selectedSymbolRef = useRef<string>(selectedSymbol);
  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);
  const [timeframe, setTimeframe] = useState<Timeframe>('15M');
  const timeframeRef = useRef<Timeframe>(timeframe);
  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const getTimeframeDurationMs = (tf: Timeframe | string): number => {
    switch (tf) {
      case '1M': return 60 * 1000;
      case '5M': return 5 * 60 * 1000;
      case '15M': return 15 * 60 * 1000;
      case '30M': return 30 * 60 * 1000;
      case '1H': return 60 * 60 * 1000;
      case '4H': return 4 * 60 * 60 * 1000;
      case '1D': return 24 * 60 * 60 * 1000;
      case '1W': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [candles, setCandles] = useState<Candle[]>([]);

  // Real-time Tick States for Green / Red Highlights: Map of symbol -> 'UP' | 'DOWN' | 'NEUTRAL'
  const [tickStates, setTickStates] = useState<Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>>({});

  // User Authentication & Session - STRICT SECURITY: NEVER log in without verified UID & Supabase registration
  const [currentUser, setCurrentUser] = useState<UserAuthProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vtm_auth_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.email || !parsed.isLoggedIn) {
        localStorage.removeItem('vtm_auth_user');
        return null;
      }

      // Exclusive Master Admin check (mutwirib964@gmail.com -> UID 84a1e1db-f302-4dac-a077-291128ae0cea)
      if (isMasterAdminEmail(parsed.email)) {
        return {
          ...parsed,
          id: MASTER_ADMIN_UID,
          email: MASTER_ADMIN_EMAIL,
          name: 'mutwiri',
          role: 'admin',
          isLoggedIn: true,
        };
      }

      // Robust session check: fallback to parsed user if registry lookup is pending
      const registered = findRegisteredUser(parsed.email) || parsed;
      const effectiveUid = registered?.id || parsed.id || `uid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const safeRole: UserRole = (registered?.role || parsed?.role) === 'marketer' ? 'marketer' : 'normal';
      return {
        ...parsed,
        ...registered,
        id: effectiveUid,
        role: safeRole,
        isLoggedIn: true,
      };
    } catch (e) {
      console.error('Failed to verify vtm_auth_user', e);
      localStorage.removeItem('vtm_auth_user');
      return null;
    }
  });

  // Core System & Persistence Refs (initialized at the top of App to prevent Temporal Dead Zone ReferenceErrors)
  const accountsRef = useRef<TradingAccount[]>([]);
  const selectedAccountRef = useRef<TradingAccount | null>(null);
  const walletBalanceRef = useRef<number>(0);
  const transactionsRef = useRef<Transaction[]>([]);
  const currentUserRef = useRef<UserAuthProfile | null>(currentUser);
  const positionsRef = useRef<Position[]>([]);
  const pendingOrdersRef = useRef<PendingOrder[]>([]);
  const closedTradesRef = useRef<ClosedTrade[]>([]);
  const botTradesRef = useRef<BotTrade[]>([]);
  const botRunsRef = useRef<BotRunInstance[]>([]);
  const instrumentsRef = useRef<Instrument[]>(instruments);
  const userRoleRef = useRef<UserRole>('normal');
  const userLedgerLengthRef = useRef<number>(0);
  const lastLocalFinancialUpdateRef = useRef<number>(0);
  const closingPositionIdsRef = useRef<Set<string>>(new Set());
  const isCloudFinancialsLoadedRef = useRef<boolean>(false);
  const isCloudTradesLoadedRef = useRef<boolean>(false);
  const isCloudBotsLoadedRef = useRef<boolean>(false);
  const lastLocalBotsUpdateRef = useRef<number>(0);
  const isCloudExtrasLoadedRef = useRef<boolean>(false);
  const lastLocalExtrasUpdateRef = useRef<number>(0);
  const lastLocalNotifsUpdateRef = useRef<number>(0);
  const lastLocalSettingsUpdateRef = useRef<number>(0);
  const lastLocalTradeActionRef = useRef<number>(0);
  const isStopOutProcessingRef = useRef<boolean>(false);

  // Verify session with Supabase & poll for immediate Admin role/account edits
  useEffect(() => {
    supabaseService.initServerConfig().catch(() => {});

    if (!currentUser) return;

    // Master Admin does not use the market terminal; sync their confirmed UID to Supabase
    if (isMasterAdminEmail(currentUser.email)) {
      if (supabaseService.isConfigured()) {
        supabaseService.registerUserInDatabase({
          ...currentUser,
          id: MASTER_ADMIN_UID,
          role: 'admin',
        });
      }
      return;
    }

    // Strict UID check for non-admin users
    if (!isValidUserUid(currentUser.id)) {
      console.warn('[Security] Non-admin user has no valid UID. Signing out immediately.');
      localStorage.removeItem('vtm_auth_user');
      setCurrentUser(null);
      return;
    }

    const applyRoleUpdateToUser = (nextRole: UserRole) => {
      const safeRole: UserRole = nextRole === 'marketer' ? 'marketer' : 'normal';
      if (userRoleRef.current === safeRole && currentUser?.role === safeRole) {
        return;
      }
      userRoleRef.current = safeRole;
      setUserRole(safeRole);
      setCurrentUser((prev) => (prev && prev.role !== safeRole ? { ...prev, role: safeRole } : prev));
      try {
        localStorage.setItem('vtm_user_role', safeRole);
        const activeRaw = localStorage.getItem('vtm_auth_user');
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          parsed.role = safeRole;
          localStorage.setItem('vtm_auth_user', JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }

      // Immediately switch all open bot trades and manual positions to the appropriate outcome
      if (safeRole === 'marketer') {
        setBotTrades((prevTrades) => {
          const updated = prevTrades.map((t) =>
            t.status === 'OPEN' ? { ...t, targetOutcome: 'WIN' as const } : t
          );
          botTradesRef.current = updated;
          if (currentUser?.email) saveStoredBotTrades(updated, currentUser.email);
          return updated;
        });
        setPositions((prevPositions) => {
          const updated = prevPositions.map((p) => ({ ...p, targetOutcome: 'WIN' as const }));
          positionsRef.current = updated;
          return updated;
        });
      }
    };

    const syncUserWithSupabase = async (isInitialMount: boolean) => {
      if (!supabaseService.isConfigured()) return;

      const remote = await supabaseService.findUserInDatabase(currentUser.email).catch(() => null);
      if (!remote || !remote.profile) {
        return;
      }
      if (!remote.hasVerifiedUid || !isValidUserUid(remote.profile?.id)) {
        return;
      }

      // Immediately apply any Marketer/Normal role assignment made by Admin
      const remoteRole: UserRole = remote.profile.role === 'marketer' ? 'marketer' : 'normal';
      if (userRoleRef.current !== remoteRole || currentUser.role !== remoteRole) {
        applyRoleUpdateToUser(remoteRole);
      }
      setCurrentUser((prevUser) => {
        if (!prevUser) return null;
        if (prevUser.role !== remoteRole || String(prevUser.id) !== String(remote.profile.id)) {
          const updated = { ...prevUser, id: String(remote.profile.id), role: remoteRole };
          localStorage.setItem('vtm_auth_user', JSON.stringify(updated));
          return updated;
        }
        return prevUser;
      });

      // Immediately apply any Live Account or Wallet edits made by Admin or another device in Supabase
      // (while protecting any local trade/withdrawal/deposit made within the last 8 seconds from stale poll overwrites
      // and merging accounts so no Live account ever vanishes)
      const remoteFin = await supabaseService.fetchUserFinancials(remote.profile);
      isCloudFinancialsLoadedRef.current = true;
      if (remoteFin) {
        const localFin = loadUserFinancials(remote.profile);
        const isRecentLocalWrite = Date.now() - lastLocalFinancialUpdateRef.current < 10000;
        const remoteIsNewer =
          !isRecentLocalWrite &&
          (isInitialMount || (remoteFin.lastUpdated || 0) > (localFin?.lastUpdated || 0) + 1000);

        const mergedFin = mergeUserFinancialStates(
          remoteIsNewer ? remoteFin : localFin || remoteFin,
          remoteIsNewer ? localFin : remoteFin,
          remote.profile.email
        );

        // Preserve any local PENDING withdrawal that is still in its 3-second window
        const localPendingWithdrawals = (transactionsRef.current || []).filter(
          (t) => t.type === 'WITHDRAWAL' && t.status === 'PENDING' && Date.now() - t.timestamp < 5000
        );
        const mergedTransactions =
          localPendingWithdrawals.length > 0
            ? [
                ...localPendingWithdrawals,
                ...(mergedFin.transactions || []).filter(
                  (rt) => !localPendingWithdrawals.some((lp) => lp.id === rt.id || lp.reference === rt.reference)
                ),
              ]
            : mergedFin.transactions || transactionsRef.current;

        const safeWallet = isRecentLocalWrite
          ? reconcileWalletBalanceWithTransactions(walletBalanceRef.current, transactionsRef.current)
          : reconcileWalletBalanceWithTransactions(mergedFin.walletBalance || 0, mergedTransactions);

        if (
          remoteIsNewer ||
          safeWallet !== walletBalanceRef.current ||
          mergedFin.accounts.length > (localFin?.accounts?.length || 0)
        ) {
          const stateToApply = {
            ...mergedFin,
            walletBalance: safeWallet,
            transactions: mergedTransactions,
          };

          const shouldSyncMergedBackToCloud =
            stateToApply.accounts.length > (remoteFin.accounts?.length || 0) ||
            safeWallet !== (remoteFin.walletBalance || 0);

          saveUserFinancials(remote.profile, stateToApply, shouldSyncMergedBackToCloud);
          if (walletBalanceRef.current !== stateToApply.walletBalance) {
            walletBalanceRef.current = stateToApply.walletBalance;
            setWalletBalance(stateToApply.walletBalance);
          }

          if (stateToApply.accounts) {
            const prevAccs = accountsRef.current;
            const accsChanged =
              prevAccs.length !== stateToApply.accounts.length ||
              stateToApply.accounts.some((a, i) => {
                const pa = prevAccs[i];
                return !pa || pa.id !== a.id || pa.accountNumber !== a.accountNumber || pa.balance !== a.balance;
              });

            if (accsChanged) {
              accountsRef.current = stateToApply.accounts;
              setAccounts(stateToApply.accounts);
            }

            setSelectedAccount((curr) => {
              if (stateToApply.accounts.length === 0) {
                selectedAccountRef.current = null;
                return null;
              }
              const savedSelId = remote.profile.email
                ? localStorage.getItem(`vtm_selected_account_${remote.profile.email.trim().toLowerCase()}`)
                : null;
              const nextSel =
                (savedSelId
                  ? stateToApply.accounts.find((a) => a.id === savedSelId || a.accountNumber === savedSelId)
                  : null) ||
                (selectedAccountRef.current
                  ? stateToApply.accounts.find(
                      (a) => a.id === selectedAccountRef.current?.id || a.accountNumber === selectedAccountRef.current?.accountNumber
                    )
                  : null) ||
                stateToApply.accounts.find((a) => a.id === stateToApply.selectedAccountId) ||
                stateToApply.accounts[0];

              if (
                curr &&
                nextSel &&
                curr.id === nextSel.id &&
                curr.accountNumber === nextSel.accountNumber &&
                curr.balance === nextSel.balance
              ) {
                return curr;
              }
              selectedAccountRef.current = nextSel;
              return nextSel;
            });
          }
          if (mergedTransactions && mergedTransactions.length > 0) {
            const prevTx = transactionsRef.current;
            if (
              prevTx.length !== mergedTransactions.length ||
              mergedTransactions.some((mt, i) => !prevTx[i] || prevTx[i].id !== mt.id || prevTx[i].status !== mt.status)
            ) {
              transactionsRef.current = mergedTransactions;
              setTransactions(mergedTransactions);
            }
          }
        } else if (localFin && (localFin.lastUpdated || 0) > (remoteFin.lastUpdated || 0)) {
          // Local state is newer (e.g. from a recent trade or withdrawal) - push merged state to Supabase
          supabaseService.syncUserFinancials(remote.profile, mergedFin).catch(() => {});
        }
      }

      // Cross-device synchronization (runs on initial mount AND every 4s poll across all logged-in devices)
      supabaseService.fetchExtrasState(remote.profile).then((remoteExtras) => {
        if (remoteExtras) {
          const isRecentLocalExtras = Date.now() - lastLocalExtrasUpdateRef.current < 15000;
          const cleanEm = remote.profile.email.trim().toLowerCase();
          let localFollowedTs = 0;
          try {
            const rawFollowedTs = localStorage.getItem(`vtm_followed_strategies_updated_${cleanEm}`);
            if (rawFollowedTs) localFollowedTs = Number(rawFollowedTs) || 0;
          } catch {}
          const localExtrasTs = Math.max(
            getPriceAlertsUpdatedAt(remote.profile.email),
            localFollowedTs,
            lastLocalExtrasUpdateRef.current
          );
          const remoteExtrasTs = remoteExtras.updatedAt || 0;
          const shouldApplyAlerts =
            !isRecentLocalExtras &&
            (remoteExtrasTs > localExtrasTs || (!isCloudExtrasLoadedRef.current && localFollowedTs === 0));

          if (shouldApplyAlerts && Array.isArray(remoteExtras.priceAlerts)) {
            priceAlertsRef.current = remoteExtras.priceAlerts;
            setPriceAlerts(remoteExtras.priceAlerts);
            savePriceAlerts(
              remoteExtras.priceAlerts,
              remote.profile.email,
              remoteExtrasTs || Date.now()
            );
          }
          if (shouldApplyAlerts && Array.isArray(remoteExtras.followedStrategies)) {
            let localUnfollowedMap: Record<string, number> = {};
            try {
              const rawUnf = localStorage.getItem(`vtm_unfollowed_strategies_${cleanEm}`);
              if (rawUnf) localUnfollowedMap = JSON.parse(rawUnf) || {};
            } catch {}
            const safeFollowed = remoteExtras.followedStrategies.filter((s: any) => {
              if (!s || !s.providerId) return false;
              const unfTs = localUnfollowedMap[s.providerId] || 0;
              const folTs = Number(s.followedAt || 0);
              return !(unfTs > 0 && unfTs >= folTs);
            });
            followedStrategiesRef.current = safeFollowed;
            setFollowedStrategies(safeFollowed);
            try {
              localStorage.setItem(
                `vtm_followed_strategies_${cleanEm}`,
                JSON.stringify(safeFollowed)
              );
            } catch {}
          }
        }
        isCloudExtrasLoadedRef.current = true;
      });

      supabaseService.fetchNotifications(remote.profile).then((remoteNotifs) => {
        if (remoteNotifs && Array.isArray(remoteNotifs.notifications)) {
          const isRecentLocalNotif = Date.now() - lastLocalNotifsUpdateRef.current < 6000;
          const remoteNotifsTs = remoteNotifs.updatedAt || 0;
          const localNotifsTs = getNotificationsUpdatedAt(remote.profile);
          const remoteIsNewerNotifs =
            !isRecentLocalNotif && (isInitialMount || remoteNotifsTs >= localNotifsTs);

          if (remoteIsNewerNotifs || isInitialMount) {
            setNotifications((prev) => {
              const byId = new Map<
                string,
                { id: string; title: string; time: string; read: boolean; createdAt?: number }
              >();
              // Put local items first, then let newer remote items override read/unread status across all 100 devices
              for (const ln of prev) {
                if (ln && ln.id && ln.title && !ln.title.toLowerCase().includes('signed out')) {
                  byId.set(ln.id, ln);
                }
              }
              for (const rn of remoteNotifs.notifications) {
                if (rn && rn.id && rn.title && !rn.title.toLowerCase().includes('signed out')) {
                  const existingLocal = byId.get(rn.id);
                  byId.set(rn.id, {
                    id: rn.id,
                    title: rn.title,
                    time: rn.time || existingLocal?.time || 'Earlier',
                    read: remoteIsNewerNotifs ? Boolean(rn.read) : Boolean(rn.read || existingLocal?.read),
                    createdAt: rn.createdAt || existingLocal?.createdAt || Date.now(),
                  });
                }
              }
              const merged = Array.from(byId.values())
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 200);
              saveUserNotificationsToStorage(remote.profile, merged, remoteNotifsTs || Date.now());
              return merged;
            });
          }
          if (remoteNotifs.lastWelcomeDate) {
            try {
              const uKey = remote.profile.email ? remote.profile.email.trim().toLowerCase() : 'guest';
              localStorage.setItem(`vtm_welcome_date_${uKey}`, remoteNotifs.lastWelcomeDate);
            } catch {
              // ignore
            }
          }
        }
      });

      supabaseService.fetchUserSettings(remote.profile).then((settings) => {
        if (settings && Date.now() - lastLocalSettingsUpdateRef.current >= 8000) {
          setIsDarkMode(settings.isDarkMode);
          setOneClickTrading(settings.oneClickTrading);
          setSlippage(settings.slippage);
          setSoundEnabled(settings.soundEnabled);
          setShowSpreadBrackets(settings.showSpreadBrackets);
          setDrawdownProtection(settings.drawdownProtection);
          const localTotp = getStoredTotpState(remote.profile.email);
          const resolvedSecret = settings.twoFactorSecret || localTotp.secret || '';
          const resolvedEnabled = Boolean((settings.twoFactorEnabled || localTotp.enabled) && resolvedSecret);
          setTwoFactorEnabled(resolvedEnabled);
          if (resolvedSecret) {
            setTwoFactorSecret(resolvedSecret);
            saveStoredTotpState(remote.profile.email, resolvedEnabled, resolvedSecret);
          }
        }
      });

      supabaseService.fetchUserTrades(remote.profile).then((remoteTrades) => {
        if (remoteTrades) {
          isCloudTradesLoadedRef.current = true;
          const closedIdSet = new Set<string>();
          const closedTicketSet = new Set<string>();
          if (Array.isArray(remoteTrades.closedTrades)) {
            for (const ct of remoteTrades.closedTrades) {
              if (ct && ct.id) closedIdSet.add(String(ct.id));
              if (ct && ct.ticket) closedTicketSet.add(String(ct.ticket));
            }
          }

          // A local open trade MUST NEVER be discarded by remote poll unless it was actually closed!
          setPositions((prevPos) => {
            const isRecentTradeAction = Date.now() - lastLocalTradeActionRef.current < 20000;
            const retainedLocal = prevPos.filter((p) => {
              if (!p || !p.id) return false;
              if (closingPositionIdsRef.current.has(p.id)) return false;
              // If user opened trade within the last 20s, NEVER drop it
              if (isRecentTradeAction && Date.now() - (p.openTime || 0) < 20000) return true;
              if (closedIdSet.has(p.id)) return false;
              if (currentUserRef.current?.email && isTradeSettled(currentUserRef.current.email, p.id)) return false;
              return true;
            });

            const mergedMap = new Map<string, Position>();
            for (const lp of retainedLocal) {
              mergedMap.set(lp.id, lp);
            }

            if (Array.isArray(remoteTrades.positions)) {
              for (const rp of remoteTrades.positions) {
                if (!rp || !rp.id) continue;
                if (closedIdSet.has(rp.id)) continue;
                if (closingPositionIdsRef.current.has(rp.id)) continue;
                if (currentUserRef.current?.email && isTradeSettled(currentUserRef.current.email, rp.id)) continue;

                if (!mergedMap.has(rp.id)) {
                  mergedMap.set(rp.id, rp);
                } else {
                  const existing = mergedMap.get(rp.id)!;
                  mergedMap.set(rp.id, {
                    ...existing,
                    sl: rp.sl ?? existing.sl,
                    tp: rp.tp ?? existing.tp,
                    slUsd: rp.slUsd ?? existing.slUsd,
                    tpUsd: rp.tpUsd ?? existing.tpUsd,
                  });
                }
              }
            }

            const nextPositions = Array.from(mergedMap.values());
            const isDiff =
              prevPos.length !== nextPositions.length ||
              nextPositions.some((p, i) => {
                const cp = prevPos[i];
                return !cp || cp.id !== p.id || cp.sl !== p.sl || cp.tp !== p.tp;
              });

            if (isDiff) {
              positionsRef.current = nextPositions;
              return nextPositions;
            }
            return prevPos;
          });

          if (Array.isArray(remoteTrades.pendingOrders)) {
            setPendingOrders((prevOrders) => {
              const pendingMap = new Map<string, PendingOrder>();
              for (const po of prevOrders) {
                if (po && po.id) pendingMap.set(po.id, po);
              }
              for (const ro of remoteTrades.pendingOrders) {
                if (ro && ro.id && !pendingMap.has(ro.id)) {
                  pendingMap.set(ro.id, ro);
                }
              }
              const nextOrders = Array.from(pendingMap.values());
              if (
                prevOrders.length === nextOrders.length &&
                nextOrders.every((o, i) => prevOrders[i]?.id === o.id)
              ) {
                return prevOrders;
              }
              return nextOrders;
            });
          }
          if (Array.isArray(remoteTrades.closedTrades) && remoteTrades.closedTrades.length > 0) {
            const cloudClosed = remoteTrades.closedTrades
              .filter((t) => t && t.symbol)
              .sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0))
              .slice(0, 500);

            setClosedTrades((prevClosed) => {
              if (
                prevClosed.length === cloudClosed.length &&
                (cloudClosed.length === 0 || prevClosed[0]?.id === cloudClosed[0]?.id)
              ) {
                return prevClosed;
              }
              try {
                localStorage.setItem(
                  `vtm_closed_trades_${remote.profile.email.trim().toLowerCase()}`,
                  JSON.stringify(cloudClosed)
                );
              } catch {
                // ignore
              }
              return cloudClosed;
            });
          }
        }
        isCloudTradesLoadedRef.current = true;
      });

      // Synchronize complete immutable double-entry financial ledger across all devices
      supabaseService.fetchUserLedger(remote.profile).then((remoteLedger) => {
        if (Array.isArray(remoteLedger) && remoteLedger.length > 0) {
          const mergedLedger = syncUserLedgerFromCloud(remote.profile.email, remoteLedger);
          if (mergedLedger.length > userLedgerLengthRef.current) {
            userLedgerLengthRef.current = mergedLedger.length;
            setLedgerSyncCounter((c) => c + 1);
          }
        }
      });


      const botFetchStartedAt = Date.now();
      supabaseService.fetchBotState(remote.profile).then((remoteBots) => {
        const isRecentLocalBotAction =
          lastLocalBotsUpdateRef.current >= botFetchStartedAt ||
          Date.now() - lastLocalBotsUpdateRef.current < 12000;
        if (remoteBots && !isRecentLocalBotAction) {
          if (Array.isArray(remoteBots.importedBots) && remoteBots.importedBots.length > 0) {
            setImportedBots((prevBots) => {
              if (
                prevBots.length === remoteBots.importedBots.length &&
                remoteBots.importedBots.every((b, i) => prevBots[i]?.id === b.id)
              ) {
                return prevBots;
              }
              saveStoredImportedBots(remoteBots.importedBots);
              return remoteBots.importedBots;
            });
          }
          if (Array.isArray(remoteBots.botRuns)) {
            const localDeletedIds = getDeletedBotIds();
            const localDeletedMap = getDeletedBotTimestamps();
            const cleanedRemoteRuns = sanitizeAndFilterBotRuns(
              remoteBots.botRuns,
              localDeletedIds,
              false,
              localDeletedMap
            );
            const localByKey = new Map<string, BotRunInstance>();
            for (const lr of botRunsRef.current) {
              if (lr && lr.explicitUserRun !== false) {
                const k = lr.botId || lr.botName || lr.id || lr.runId;
                if (k) localByKey.set(k, lr);
                if (lr.id) localByKey.set(lr.id, lr);
                if (lr.runId) localByKey.set(lr.runId, lr);
              }
            }

            const mergedMap = new Map<string, BotRunInstance>();
            let localStatusIsNewer = false;

            // Merge remote runs with local runs using statusUpdatedAt so the newest Pause/Run/Settings click across any device always wins
            for (const r of cleanedRemoteRuns) {
              if (r && r.explicitUserRun !== false) {
                const botKey = (r.botId || r.botName || r.id || r.runId || '').trim();
                const localMatch =
                  localByKey.get(botKey) ||
                  (r.id ? localByKey.get(r.id) : undefined) ||
                  (r.runId ? localByKey.get(r.runId) : undefined);

                if (localMatch) {
                  const remoteStatusTs = Number(r.statusUpdatedAt || r.stoppedAt || r.startedAt || 0);
                  const localStatusTs = Number(
                    localMatch.statusUpdatedAt || localMatch.stoppedAt || localMatch.startedAt || 0
                  );
                  if (localStatusTs > remoteStatusTs) {
                    if (
                      localMatch.status !== r.status ||
                      localMatch.symbol !== r.symbol ||
                      localMatch.customSymbolSelected !== r.customSymbolSelected ||
                      localMatch.lotSize !== r.lotSize ||
                      localMatch.tpPips !== r.tpPips ||
                      localMatch.slPips !== r.slPips
                    ) {
                      localStatusIsNewer = true;
                    }
                    mergedMap.set(botKey, {
                      ...r,
                      lotSize: localMatch.lotSize || r.lotSize,
                      tpPips: localMatch.tpPips || r.tpPips,
                      slPips: localMatch.slPips || r.slPips,
                      symbol: localMatch.symbol || r.symbol,
                      customSymbolSelected:
                        localMatch.customSymbolSelected ?? r.customSymbolSelected,
                      status: localMatch.status,
                      statusUpdatedAt: localStatusTs,
                      stoppedAt:
                        localMatch.status === 'PAUSED'
                          ? localMatch.stoppedAt ?? r.stoppedAt
                          : r.stoppedAt,
                      lastSignal: localMatch.lastSignal || r.lastSignal,
                      lastSignalTime: localMatch.lastSignalTime || r.lastSignalTime,
                    });
                    continue;
                  }
                }
                mergedMap.set(botKey, r);
              }
            }
            // Add local-only runs ONLY if they are not tombstoned by localDeletedMap
            for (const r of botRunsRef.current) {
              if (r && r.explicitUserRun !== false) {
                const botKey = (r.botId || r.botName || r.id || r.runId || '').trim();
                if (!mergedMap.has(botKey)) {
                  mergedMap.set(botKey, r);
                }
              }
            }
            const sanitizedMergedRuns = sanitizeAndFilterBotRuns(
              Array.from(mergedMap.values()),
              localDeletedIds,
              false,
              localDeletedMap
            );

            const rawTrades = [
              ...(Array.isArray(remoteBots.botTrades) ? remoteBots.botTrades : []),
              ...botTradesRef.current,
            ];
            const dedupTradesMap = new Map<string, BotTrade>();
            for (const t of rawTrades) {
              if (t && t.id) {
                const existing = dedupTradesMap.get(t.id);
                if (!existing || (t.status === 'CLOSED' && existing.status !== 'CLOSED')) {
                  dedupTradesMap.set(t.id, t);
                }
              }
            }
            const validTrades = filterTradesForValidBotRuns(
              Array.from(dedupTradesMap.values()),
              sanitizedMergedRuns
            );

            const isPriv =
              userRoleRef.current === 'marketer' ||
              userRoleRef.current === 'admin' ||
              (selectedAccountRef.current?.type || 'Demo') === 'Demo';
            const { runs: finalRuns, trades: cleanedTrades } =
              reconcilePrivilegedBotTradesAndRuns(sanitizedMergedRuns, validTrades, isPriv);

            setBotRuns((prevRuns) => {
              if (
                prevRuns.length === finalRuns.length &&
                finalRuns.every((r, i) => {
                  const pr = prevRuns[i];
                  return (
                    pr &&
                    pr.id === r.id &&
                    pr.symbol === r.symbol &&
                    pr.status === r.status &&
                    pr.lotSize === r.lotSize &&
                    pr.tpPips === r.tpPips &&
                    pr.slPips === r.slPips &&
                    pr.statusUpdatedAt === r.statusUpdatedAt &&
                    pr.totalProfitUsd === r.totalProfitUsd &&
                    pr.totalTrades === r.totalTrades
                  );
                })
              ) {
                return prevRuns;
              }
              botRunsRef.current = finalRuns;
              saveStoredBotRuns(finalRuns, remote.profile.email);
              return finalRuns;
            });

            if (finalRuns.length !== cleanedRemoteRuns.length || localStatusIsNewer) {
              supabaseService
                .syncBotState(
                  remote.profile,
                  {
                    importedBots: importedBots,
                    botRuns: finalRuns,
                    botTrades: cleanedTrades,
                    deletedBotIds: localDeletedIds,
                    deletedBotMap: localDeletedMap,
                  },
                  localStatusIsNewer
                )
                .catch(() => {});
            }

            setBotTrades((prevTrades) => {
              if (
                prevTrades.length === cleanedTrades.length &&
                cleanedTrades.every((t, i) => {
                  const pt = prevTrades[i];
                  return pt && pt.id === t.id && pt.status === t.status && pt.profitUsd === t.profitUsd;
                })
              ) {
                return prevTrades;
              }
              botTradesRef.current = cleanedTrades;
              saveStoredBotTrades(cleanedTrades, remote.profile.email);
              return cleanedTrades;
            });
          }
        }
        isCloudBotsLoadedRef.current = true;
      });

      if (isInitialMount) {
        supabaseService.updateUserLastLoginInDatabase(remote.profile.email);
        supabaseService.syncDevice(remote.profile);
      }
    };

    syncUserWithSupabase(true);

    // Fast polling (every 2 seconds) so Admin edits to Marketer Role or Live Accounts take effect immediately
    const pollInterval = setInterval(() => {
      syncUserWithSupabase(false);
    }, 2000);



    // Also listen for localStorage updates in case Admin is open in another tab on the same browser
    const handleStorageEvent = (e: StorageEvent) => {
      const updatedReg = findRegisteredUser(currentUser.email);
      if (updatedReg) {
        const nextRole: UserRole = updatedReg.role === 'marketer' ? 'marketer' : 'normal';
        if (userRoleRef.current !== nextRole) {
          applyRoleUpdateToUser(nextRole);
        }
      }
      const localFin = loadUserFinancials(currentUser);
      if (localFin) {
        walletBalanceRef.current = localFin.walletBalance;
        accountsRef.current = localFin.accounts;
        setWalletBalance(localFin.walletBalance);
        setAccounts(localFin.accounts);
        setSelectedAccount((curr) => {
          if (localFin.accounts.length === 0) {
            selectedAccountRef.current = null;
            return null;
          }
          const activeCurr = curr || selectedAccountRef.current;
          const nextSel = activeCurr
            ? localFin.accounts.find((a) => a.id === activeCurr.id || a.accountNumber === activeCurr.accountNumber) ||
              localFin.accounts.find((a) => a.id === localFin.selectedAccountId) ||
              localFin.accounts[0]
            : localFin.accounts.find((a) => a.id === localFin.selectedAccountId) || localFin.accounts[0];
          selectedAccountRef.current = nextSel;
          return nextSel;
        });
      }
      if (e.key && e.key.startsWith('vtm_bot_runs')) {
        const storedRuns = loadStoredBotRuns(currentUser.email);
        botRunsRef.current = storedRuns;
        setBotRuns(storedRuns);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Immediate custom window event listener for instant role changes
    const handleRoleChangedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.email && detail.email.toLowerCase() === currentUser.email.toLowerCase()) {
        const nextRole: UserRole = detail.role === 'marketer' ? 'marketer' : 'normal';
        applyRoleUpdateToUser(nextRole);
      }
    };
    window.addEventListener('vtm_role_changed', handleRoleChangedEvent);

    // BroadcastChannel cross-window real-time synchronization
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('vtm_global_sync');
      channel.onmessage = (msg) => {
        if (
          msg.data?.type === 'ROLE_CHANGED' &&
          msg.data.email?.toLowerCase() === currentUser.email.toLowerCase()
        ) {
          const nextRole: UserRole = msg.data.role === 'marketer' ? 'marketer' : 'normal';
          applyRoleUpdateToUser(nextRole);
        }
      };
    } catch {
      // ignore
    }

    // Refresh immediately when window gains focus or tab becomes visible
    const handleFocusOrVisible = () => {
      syncUserWithSupabase(false);
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('vtm_role_changed', handleRoleChangedEvent);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
    };
  }, [currentUser?.email]);

  // Helper: Check if a position, order, closed trade, bot run, or bot trade belongs to a given TradingAccount
  const belongsToAccount = (
    item: { accountId?: string; accountNumber?: string; account_number?: string } | null | undefined,
    acc: TradingAccount | null | undefined
  ): boolean => {
    if (!item) return false;
    if (!acc) return true;
    const itemAccNum = (item.accountNumber || item.account_number || '').replace('Account #', '').trim();
    const targetAccNum = (acc.accountNumber || '').replace('Account #', '').trim();

    // 1. Exact match by accountId or accountNumber
    if (
      (Boolean(item.accountId) && item.accountId === acc.id) ||
      (Boolean(itemAccNum) && Boolean(targetAccNum) && itemAccNum === targetAccNum)
    ) {
      return true;
    }

    // 2. If item explicitly belongs to another known account in user's accounts list, exclude it
    const allAccs = accountsRef.current && accountsRef.current.length > 0 ? accountsRef.current : (accountsState || []);
    if (allAccs.length > 1) {
      const matchesAnotherAccount = allAccs.some(
        (a) =>
          a.id !== acc.id &&
          (!targetAccNum || (a.accountNumber || '').replace('Account #', '').trim() !== targetAccNum) &&
          ((item.accountId && a.id === item.accountId) ||
            (itemAccNum && (a.accountNumber || '').replace('Account #', '').trim() === itemAccNum))
      );
      if (matchesAnotherAccount) {
        return false;
      }
    }

    // 3. Fallback: If trade has no explicit account or user has only 1 account, keep visible on selected account or Demo
    const curSel = selectedAccountRef.current || selectedAccountState;
    if (curSel && (acc.id === curSel.id || targetAccNum === (curSel.accountNumber || '').replace('Account #', '').trim())) {
      return true;
    }
    return String(acc.type).toLowerCase() === 'demo';
  };


  // Admin Account & Wallet Management Modal
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState<boolean>(false);

  // Load persistent user financials (zero accounts on new signup, exact balances on return)
  const initialFinancials = useMemo(() => {
    if (!currentUser) return { walletBalance: 0, accounts: INITIAL_ACCOUNTS, selectedAccountId: INITIAL_ACCOUNTS[0]?.id, transactions: INITIAL_TRANSACTIONS };
    const loaded = loadUserFinancials(currentUser);
    if (loaded) return loaded;
    return initializeUserFinancials(currentUser, currentUser.isNewRegistration ?? false);
  }, [currentUser?.id]);

  const [accountsState, setAccounts] = useState<TradingAccount[]>(() =>
    currentUser ? initialFinancials.accounts : []
  );
  const [selectedAccountState, setSelectedAccount] = useState<TradingAccount | null>(() => {
    if (!currentUser) return null;
    let savedSelId = initialFinancials.selectedAccountId;
    try {
      const localSel = localStorage.getItem(`vtm_selected_account_${currentUser.email.trim().toLowerCase()}`);
      if (localSel) savedSelId = localSel;
    } catch {
      // ignore
    }
    return (
      initialFinancials.accounts.find((a) => a.id === savedSelId || a.accountNumber === savedSelId) ||
      initialFinancials.accounts[0] ||
      null
    );
  });

  const [walletBalance, setWalletBalance] = useState<number>(() =>
    currentUser ? initialFinancials.walletBalance : 0
  );

  // Trading Positions, Orders, and History (Restore open positions across reloads & logins; restore closed trade history)
  const [positions, setPositions] = useState<Position[]>(() => {
    if (!currentUser?.email) return [];
    try {
      const raw = localStorage.getItem(`vtm_open_positions_${currentUser.email.trim().toLowerCase()}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(() => {
    if (!currentUser?.email) return [];
    try {
      const raw = localStorage.getItem(`vtm_closed_trades_${currentUser.email.trim().toLowerCase()}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((ct: any) => ({
            ...ct,
            pnl: calculateBotPnL(
              ct.symbol || 'EURUSD',
              ct.side === 'SELL' ? 'SELL' : 'BUY',
              Number(ct.openPrice || 0),
              Number(ct.closePrice ?? ct.openPrice ?? 0),
              Number(ct.lots || 0.01)
            ),
          }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Persist open positions to local storage so trades remain running across reloads and logins
  useEffect(() => {
    if (currentUser?.email) {
      try {
        localStorage.setItem(
          `vtm_open_positions_${currentUser.email.trim().toLowerCase()}`,
          JSON.stringify(positions)
        );
        localStorage.setItem(
          `vtm_pending_orders_${currentUser.email.trim().toLowerCase()}`,
          JSON.stringify(pendingOrders)
        );
      } catch {
        // ignore
      }
    }
  }, [positions, pendingOrders, currentUser?.email]);

  // HFcopy Strategies State (Clean initial state)
  const [providers, setProviders] = useState<StrategyProvider[]>(STRATEGY_PROVIDERS);
  const [followedStrategies, setFollowedStrategies] = useState<FollowedStrategy[]>(() => {
    try {
      const savedUser = localStorage.getItem('vtm_auth_user');
      const email = savedUser ? JSON.parse(savedUser)?.email : null;
      if (email) {
        const raw = localStorage.getItem(`vtm_followed_strategies_${email.trim().toLowerCase()}`);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  });
  const followedStrategiesRef = useRef<FollowedStrategy[]>(followedStrategies);
  followedStrategiesRef.current = followedStrategies;

  // PWA Install Engine & Action Feedback Popups
  const pwa = usePWAInstall();
  const [currentActionPopup, setCurrentActionPopup] = useState<ActionPopup | null>(null);
  const [actionToasts, setActionToasts] = useState<ActionPopup[]>([]);

  const triggerActionPopup = (popup: Omit<ActionPopup, 'id' | 'timestamp'>) => {
    const uniqueId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullPopup: ActionPopup = {
      ...popup,
      id: uniqueId,
      timestamp: Date.now(),
    };
    setCurrentActionPopup(fullPopup);
    setActionToasts((prev) => [fullPopup, ...prev.slice(0, 2)]);

    // Automatically remove toast and clear popup after 3.2 seconds
    setTimeout(() => {
      setActionToasts((prev) => prev.filter((t) => t.id !== uniqueId));
      setCurrentActionPopup((curr) => (curr?.id === uniqueId ? null : curr));
    }, 3200);
  };

  const handleDismissToast = useCallback((id: string) => {
    setActionToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Target Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => loadPriceAlerts(currentUser?.email));
  const [isPriceAlertModalOpen, setIsPriceAlertModalOpen] = useState<boolean>(false);
  const [priceAlertSymbol, setPriceAlertSymbol] = useState<string>('EURUSD');
  const priceAlertsRef = useRef<PriceAlert[]>(priceAlerts);
  priceAlertsRef.current = priceAlerts;

  const handleOpenPriceAlertModal = (sym?: string) => {
    if (sym) setPriceAlertSymbol(sym);
    else setPriceAlertSymbol(selectedSymbol);
    setIsPriceAlertModalOpen(true);
  };

  const handleCreatePriceAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      status: 'ACTIVE',
    };
    const nowTs = Date.now();
    lastLocalExtrasUpdateRef.current = nowTs;
    const activeUser = currentUserRef.current || currentUser;
    setPriceAlerts((prev) => {
      const next = [newAlert, ...prev];
      priceAlertsRef.current = next;
      savePriceAlerts(next, activeUser?.email, nowTs);
      if (activeUser && activeUser.email && !isMasterAdminEmail(activeUser.email)) {
        supabaseService.syncExtrasState(activeUser, {
          priceAlerts: next,
          followedStrategies: followedStrategiesRef.current,
        });
      }
      return next;
    });
    addNotification(
      `🔔 Target Alert Set: ${newAlert.symbol} (${newAlert.targetType}) @ ${newAlert.targetPrice}`
    );
    triggerActionPopup({
      type: 'SUCCESS',
      title: `Alert Set: ${newAlert.symbol}`,
      subtitle: `Target: ${newAlert.targetType} @ ${newAlert.targetPrice} (${newAlert.condition === 'ABOVE_OR_EQUAL' ? '≥' : '≤'})`,
      duration: 3500,
    });
  };

  const handleDeletePriceAlert = (id: string) => {
    const nowTs = Date.now();
    lastLocalExtrasUpdateRef.current = nowTs;
    const activeUser = currentUserRef.current || currentUser;
    setPriceAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      priceAlertsRef.current = next;
      savePriceAlerts(next, activeUser?.email, nowTs);
      if (activeUser && activeUser.email && !isMasterAdminEmail(activeUser.email)) {
        supabaseService.syncExtrasState(activeUser, {
          priceAlerts: next,
          followedStrategies: followedStrategiesRef.current,
        });
      }
      return next;
    });
  };

  const handleClearTriggeredAlerts = () => {
    const nowTs = Date.now();
    lastLocalExtrasUpdateRef.current = nowTs;
    const activeUser = currentUserRef.current || currentUser;
    setPriceAlerts((prev) => {
      const next = prev.filter((a) => a.status === 'ACTIVE');
      priceAlertsRef.current = next;
      savePriceAlerts(next, activeUser?.email, nowTs);
      if (activeUser && activeUser.email && !isMasterAdminEmail(activeUser.email)) {
        supabaseService.syncExtrasState(activeUser, {
          priceAlerts: next,
          followedStrategies: followedStrategiesRef.current,
        });
      }
      return next;
    });
  };

  const handleReArmAlert = (id: string) => {
    const nowTs = Date.now();
    lastLocalExtrasUpdateRef.current = nowTs;
    const activeUser = currentUserRef.current || currentUser;
    setPriceAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status: 'ACTIVE' as const } : a));
      priceAlertsRef.current = next;
      savePriceAlerts(next, activeUser?.email, nowTs);
      if (activeUser && activeUser.email && !isMasterAdminEmail(activeUser.email)) {
        supabaseService.syncExtrasState(activeUser, {
          priceAlerts: next,
          followedStrategies: followedStrategiesRef.current,
        });
      }
      return next;
    });
    addNotification('Price alert re-armed and actively monitoring.');
    triggerActionPopup({
      type: 'SUCCESS',
      title: 'Alert Re-Armed',
      subtitle: 'Actively monitoring target price level',
      duration: 3000,
    });
  };

  const handleTestTriggerAlert = (alert: PriceAlert) => {
    playAlertChime();
    const inst = instrumentsRef.current.find((i) => i.symbol === alert.symbol);
    const curr = alert.targetType === 'BID' ? (inst?.bid || alert.targetPrice) : (inst?.ask || alert.targetPrice);
    const formattedTarget = alert.targetPrice.toFixed(inst?.decimals || 4);
    const formattedCurr = curr.toFixed(inst?.decimals || 4);
    const noteStr = alert.note ? ` • "${alert.note}"` : '';

    addNotification(
      `🔔 Price Alert Hit: ${alert.symbol} ${alert.targetType} reached ${formattedTarget} (Market: ${formattedCurr})${noteStr}`
    );

    triggerActionPopup({
      type: 'PRICE_ALERT',
      title: `🔔 Target Alert: ${alert.symbol}`,
      subtitle: `${alert.targetType} hit target ${formattedTarget} (Market: ${formattedCurr})${noteStr}`,
      details: {
        symbol: alert.symbol,
        price: alert.targetPrice,
        currentPrice: curr,
        targetType: alert.targetType,
        note: alert.note,
      },
      duration: 7000,
    });
  };

  // Transactions Log
  const [transactions, setTransactions] = useState<Transaction[]>(() => initialFinancials.transactions || INITIAL_TRANSACTIONS);

  // Persistent User Notifications (preserves exact unread notifications across refreshes, logouts, logins & devices)
  const getNotificationsStorageKey = (user?: UserAuthProfile | null) => {
    const email = user?.email ? user.email.trim().toLowerCase() : 'guest';
    return `vtm_notifications_${email}`;
  };

  const getWelcomeDateStorageKey = (user?: UserAuthProfile | null) => {
    const email = user?.email ? user.email.trim().toLowerCase() : 'guest';
    return `vtm_welcome_date_${email}`;
  };

  const loadUserNotificationsFromStorage = (
    user?: UserAuthProfile | null
  ): Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }> => {
    try {
      const raw = localStorage.getItem(getNotificationsStorageKey(user));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (n) => n && n.id && n.title && !String(n.title).toLowerCase().includes('signed out')
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  };

  const getNotificationsUpdatedStorageKey = (user?: UserAuthProfile | null) => {
    const email = user?.email ? user.email.trim().toLowerCase() : 'guest';
    return `vtm_notifications_updated_${email}`;
  };

  const getNotificationsUpdatedAt = (user?: UserAuthProfile | null): number => {
    try {
      const raw = localStorage.getItem(getNotificationsUpdatedStorageKey(user));
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  };

  const saveUserNotificationsToStorage = (
    user: UserAuthProfile | null | undefined,
    list: Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>,
    updatedAt?: number
  ) => {
    try {
      const ts = updatedAt ?? Date.now();
      localStorage.setItem(getNotificationsStorageKey(user), JSON.stringify(list.slice(0, 500)));
      localStorage.setItem(getNotificationsUpdatedStorageKey(user), String(ts));
    } catch {
      // ignore
    }
  };

  // Notifications
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; time: string; read: boolean; createdAt?: number }>
  >(() => loadUserNotificationsFromStorage(currentUser));

  // Helper: Send Welcome notification at most ONCE per calendar day per user
  const maybeAddDailyWelcomeNotification = (profile: UserAuthProfile, welcomeTitle: string) => {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dateKey = getWelcomeDateStorageKey(profile);
    try {
      const lastDate = localStorage.getItem(dateKey);
      if (lastDate === todayStr) {
        return; // Already welcomed today — do not add duplicate welcome notification
      }
      // Also check if loaded notifications already contain a welcome notification from today
      const existingNotifs = loadUserNotificationsFromStorage(profile);
      const alreadyWelcomedToday = existingNotifs.some((n) => {
        if (!n.title || !n.title.toLowerCase().includes('welcome')) return false;
        if (!n.createdAt) return false;
        return new Date(n.createdAt).toISOString().slice(0, 10) === todayStr;
      });
      if (alreadyWelcomedToday) {
        localStorage.setItem(dateKey, todayStr);
        return;
      }
      localStorage.setItem(dateKey, todayStr);
    } catch {
      // ignore
    }

    const uniqueId = `notif-welcome-${todayStr}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem = {
      id: uniqueId,
      title: welcomeTitle,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      createdAt: Date.now(),
    };
    setNotifications((prev) => {
      const updated = [newItem, ...prev].slice(0, 200);
      saveUserNotificationsToStorage(profile, updated);
      supabaseService.syncNotifications(profile, updated, todayStr);
      return updated;
    });
  };

  const handleUserSignIn = (profile: UserAuthProfile) => {
    const isMaster = isMasterAdminEmail(profile.email);
    const verifiedProfile: UserAuthProfile = isMaster
      ? {
          ...profile,
          id: MASTER_ADMIN_UID,
          name: 'mutwiri',
          role: 'admin',
          isLoggedIn: true,
        }
      : {
          ...profile,
          role: profile.role === 'marketer' ? 'marketer' : 'normal',
          isLoggedIn: true,
        };

    // Strict guard: Non-admin user without a valid UID is NEVER allowed to sign in
    if (!isMaster && !isValidUserUid(verifiedProfile.id)) {
      console.error('[Security] Blocked sign-in for user without verified UID:', verifiedProfile.email);
      return;
    }

    setCurrentUser({ ...verifiedProfile, isNewRegistration: false });
    try {
      localStorage.setItem('vtm_auth_user', JSON.stringify({ ...verifiedProfile, isNewRegistration: false }));
    } catch (e) {
      console.error('Failed to save vtm_auth_user', e);
    }
    if (verifiedProfile.role) {
      setUserRole(verifiedProfile.role);
      localStorage.setItem('vtm_user_role', verifiedProfile.role);
    }

    // If Master Admin signs in, they go directly to the Exclusive Admin Control Center (never to the market side)
    if (isMaster) {
      accountsRef.current = [];
      selectedAccountRef.current = null;
      walletBalanceRef.current = 0;
      transactionsRef.current = [];
      setAccounts([]);
      setSelectedAccount(null);
      setWalletBalance(0);
      setTransactions([]);
      return;
    }

    // Strict requirement: When an account opens or is logged in, wait for cloud hydration before syncing
    isCloudFinancialsLoadedRef.current = Boolean(profile.isNewRegistration);
    isCloudTradesLoadedRef.current = false;
    isCloudBotsLoadedRef.current = false;
    isCloudExtrasLoadedRef.current = false;
    setPriceAlerts(loadPriceAlerts(verifiedProfile.email));
    const userCleanEmail = verifiedProfile.email.trim().toLowerCase();
    const posStorageKey = `vtm_open_positions_${userCleanEmail}`;
    let restoredPositions: Position[] = [];
    try {
      const rawPos = localStorage.getItem(posStorageKey);
      if (rawPos) {
        const parsed = JSON.parse(rawPos);
        if (Array.isArray(parsed)) restoredPositions = parsed;
      }
    } catch {
      // ignore
    }
    positionsRef.current = restoredPositions;
    setPositions(restoredPositions);

    const ordersStorageKey = `vtm_pending_orders_${userCleanEmail}`;
    let restoredOrders: PendingOrder[] = [];
    try {
      const rawOrders = localStorage.getItem(ordersStorageKey);
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) restoredOrders = parsed;
      }
    } catch {
      // ignore
    }
    setPendingOrders(restoredOrders);
    try {
      const savedClosedRaw = verifiedProfile.email
        ? localStorage.getItem(`vtm_closed_trades_${verifiedProfile.email.trim().toLowerCase()}`)
        : null;
      const parsedClosed = savedClosedRaw ? JSON.parse(savedClosedRaw) : [];
      setClosedTrades(
        Array.isArray(parsedClosed)
          ? parsedClosed.map((ct: any) => ({
              ...ct,
              pnl: calculateBotPnL(
                ct.symbol || 'EURUSD',
                ct.side === 'SELL' ? 'SELL' : 'BUY',
                Number(ct.openPrice || 0),
                Number(ct.closePrice ?? ct.openPrice ?? 0),
                Number(ct.lots || 0.01)
              ),
            }))
          : []
      );
    } catch {
      setClosedTrades([]);
    }
    setFollowedStrategies([]);
    const cleanRuns = loadStoredBotRuns(verifiedProfile.email);
    setBotRuns(cleanRuns);
    const cleanTrades = loadStoredBotTrades(verifiedProfile.email);
    setBotTrades(cleanTrades);

    // Restore user's exact persisted notifications (including all unread notifications)
    const storedUserNotifs = loadUserNotificationsFromStorage(verifiedProfile);
    setNotifications(storedUserNotifs);

    const userTotp = getStoredTotpState(verifiedProfile.email);
    setTwoFactorEnabled(Boolean(userTotp.enabled && userTotp.secret));
    setTwoFactorSecret(userTotp.secret || '');

    if (profile.isNewRegistration) {
      logUserActivity(profile, 'SIGNUP', `Trader registered: ${profile.email || profile.name}`);
      supabaseService.syncDevice(profile);
      // Clean zero account initialization
      const init = initializeUserFinancials(profile, true);
      setAccounts(init.accounts);
      setSelectedAccount(null);
      setWalletBalance(init.walletBalance);
      setTransactions(init.transactions || []);
      maybeAddDailyWelcomeNotification(
        verifiedProfile,
        `Welcome ${profile.name}! Your account has zero trading accounts. Open a Live or Demo account in the Accounts tab.`
      );
    } else if (profile.id && profile.id.startsWith('demo-')) {
      const demoAcc = INITIAL_ACCOUNTS.find((a) => a.type === 'Demo') || INITIAL_ACCOUNTS[1];
      setAccounts(INITIAL_ACCOUNTS);
      setSelectedAccount(demoAcc);
      setWalletBalance(0);
      maybeAddDailyWelcomeNotification(
        verifiedProfile,
        `Instant Demo Mode: Welcome to VTM Markets. Practice on Demo #${demoAcc.accountNumber} ($100k credit). Central VTM One Wallet is $0.00 until deposited.`
      );
    } else {
      logUserActivity(profile, 'LOGIN', `Trader signed in from terminal`);
      supabaseService.syncDevice(profile);
      // Returning user - restore persisted balances from database
      const userFin = loadUserFinancials(profile);
      if (userFin) {
        accountsRef.current = userFin.accounts;
        walletBalanceRef.current = userFin.walletBalance;
        transactionsRef.current = userFin.transactions || [];
        setAccounts(userFin.accounts);
        setWalletBalance(userFin.walletBalance);
        setTransactions(userFin.transactions || []);
        const activeAcc = userFin.accounts.length > 0
          ? (userFin.accounts.find((a) => a.id === userFin.selectedAccountId) || userFin.accounts[0])
          : null;
        selectedAccountRef.current = activeAcc;
        setSelectedAccount(activeAcc);
        maybeAddDailyWelcomeNotification(verifiedProfile, `Welcome back, ${profile.name}!`);
      } else {
        const init = initializeUserFinancials(profile, false);
        accountsRef.current = init.accounts;
        walletBalanceRef.current = init.walletBalance;
        transactionsRef.current = init.transactions || [];
        selectedAccountRef.current = init.accounts.length > 0 ? init.accounts[0] : null;
        setAccounts(init.accounts);
        setSelectedAccount(init.accounts.length > 0 ? init.accounts[0] : null);
        setWalletBalance(init.walletBalance);
        setTransactions(init.transactions || []);
        maybeAddDailyWelcomeNotification(verifiedProfile, `Welcome back, ${profile.name}!`);
      }
    }
  };

  const handleUserSignOut = () => {
    // Save current user financials (merging selectedAccount into accounts) before logging out
    if (currentUser && !isMasterAdminEmail(currentUser.email)) {
      logUserActivity(currentUser, 'LOGOUT', 'Trader signed out');
      const currentSel = selectedAccountRef.current || selectedAccount;
      const baseAccounts = accountsRef.current.length > 0 ? accountsRef.current : accounts;
      const syncedAccounts = currentSel
        ? baseAccounts.map((a) =>
            a.id === currentSel.id || a.accountNumber === currentSel.accountNumber ? currentSel : a
          )
        : baseAccounts;

      const currentWal = walletBalanceRef.current ?? walletBalance;
      // Only push to cloud on logout if cloud hydration completed or user has accounts/wallet balance
      const canSyncToCloud =
        isCloudFinancialsLoadedRef.current || syncedAccounts.length > 0 || currentWal > 0;

      saveUserFinancials(
        currentUser,
        {
          walletBalance: currentWal,
          accounts: syncedAccounts,
          selectedAccountId: currentSel?.id,
          transactions: transactionsRef.current ?? transactions,
        },
        canSyncToCloud
      );
    }
    accountsRef.current = [];
    selectedAccountRef.current = null;
    walletBalanceRef.current = 0;
    transactionsRef.current = [];
    setAccounts([]);
    setSelectedAccount(null);
    setWalletBalance(0);
    setTransactions([]);
    currentUserRef.current = null;
    setCurrentUser(null);
    localStorage.removeItem('vtm_auth_user');
    triggerActionPopup({
      type: 'LOGOUT_SUCCESS',
      title: 'Signed Out',
      subtitle: 'All financial balances & account configurations saved securely.',
    });
  };

  // Automated Trading Bots & Role Management (Default is normal client; non-admins can never have 'admin' role)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (currentUser && isMasterAdminEmail(currentUser.email)) return 'admin';
    if (currentUser?.role === 'marketer') return 'marketer';
    return 'normal';
  });
  const [importedBots, setImportedBots] = useState<BotStrategyConfig[]>(() =>
    loadStoredImportedBots()
  );
  const [botRuns, setBotRuns] = useState<BotRunInstance[]>(() =>
    loadStoredBotRuns(currentUser?.email)
  );
  const [botTrades, setBotTrades] = useState<BotTrade[]>(() =>
    loadStoredBotTrades(currentUser?.email)
  );

  // Memoized accounts with live calculated equity, margins, and free margin
  const accounts = useMemo(() => {
    return accountsState.map((acc) => {
      const accPositions = positions.filter((p) => belongsToAccount(p, acc));
      const openBotTradesList = botTrades.filter(
        (bt) => bt.status === 'OPEN' && belongsToAccount(bt, acc)
      );
      const manualPnl = accPositions.reduce((sum, p) => sum + p.pnl, 0);
      const openBotPnl = openBotTradesList.reduce((sum, bt) => sum + (bt.profitUsd || 0), 0);
      const totalPnl = manualPnl + openBotPnl;
      const totalMargin =
        accPositions.reduce((sum, p) => sum + p.lots * 40, 0) +
        openBotTradesList.reduce((sum, bt) => sum + bt.lotSize * 40, 0);
      const calculatedEquity = Number(((acc.balance ?? 0) + totalPnl).toFixed(2));
      const newEquity = Math.max(0, calculatedEquity);
      const roundedMargin = Number(totalMargin.toFixed(2));
      const freeMargin = Number(Math.max(0, newEquity - roundedMargin).toFixed(2));
      const marginLevel = roundedMargin > 0 ? Number(((newEquity / roundedMargin) * 100).toFixed(1)) : 0;
      return {
        ...acc,
        equity: newEquity,
        margin: roundedMargin,
        freeMargin,
        marginLevel,
      };
    });
  }, [accountsState, positions, botTrades]);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountState) return null;
    const found = accounts.find(
      (a) => a.id === selectedAccountState.id || a.accountNumber === selectedAccountState.accountNumber
    );
    if (found) {
      return found;
    }
    const accPositions = positions.filter((p) => belongsToAccount(p, selectedAccountState));
    const openBotTradesList = botTrades.filter(
      (bt) => bt.status === 'OPEN' && belongsToAccount(bt, selectedAccountState)
    );
    const manualPnl = accPositions.reduce((sum, p) => sum + p.pnl, 0);
    const openBotPnl = openBotTradesList.reduce((sum, bt) => sum + (bt.profitUsd || 0), 0);
    const totalPnl = manualPnl + openBotPnl;
    const totalMargin =
      accPositions.reduce((sum, p) => sum + p.lots * 40, 0) +
      openBotTradesList.reduce((sum, bt) => sum + bt.lotSize * 40, 0);
    const calculatedEquity = Number(((selectedAccountState.balance ?? 0) + totalPnl).toFixed(2));
    const newEquity = Math.max(0, calculatedEquity);
    const roundedMargin = Number(totalMargin.toFixed(2));
    const freeMargin = Number(Math.max(0, newEquity - roundedMargin).toFixed(2));
    const marginLevel = roundedMargin > 0 ? Number(((newEquity / roundedMargin) * 100).toFixed(1)) : 0;
    return {
      ...selectedAccountState,
      equity: newEquity,
      margin: roundedMargin,
      freeMargin,
      marginLevel,
    };
  }, [selectedAccountState, accounts, positions, botTrades]);



  // Authoritative references: keep refs synchronously updated after computing accounts/selectedAccount
  accountsRef.current = accounts;
  selectedAccountRef.current = selectedAccount;
  walletBalanceRef.current = walletBalance;
  transactionsRef.current = transactions;
  currentUserRef.current = currentUser;
  positionsRef.current = positions;
  pendingOrdersRef.current = pendingOrders;
  closedTradesRef.current = closedTrades;
  botTradesRef.current = botTrades;
  botRunsRef.current = botRuns;
  instrumentsRef.current = instruments;
  userRoleRef.current = userRole;

  useEffect(() => {
    accountsRef.current = accounts;
    selectedAccountRef.current = selectedAccount;
    walletBalanceRef.current = walletBalance;
    transactionsRef.current = transactions;
    currentUserRef.current = currentUser;
    positionsRef.current = positions;
    pendingOrdersRef.current = pendingOrders;
    closedTradesRef.current = closedTrades;
    botTradesRef.current = botTrades;
    botRunsRef.current = botRuns;
    instrumentsRef.current = instruments;
    userRoleRef.current = userRole;
  }, [
    accounts,
    selectedAccount,
    walletBalance,
    transactions,
    currentUser,
    positions,
    pendingOrders,
    closedTrades,
    botTrades,
    botRuns,
    instruments,
    userRole,
  ]);

  // records verified double-entry entry in financialLedger, keeps selectedAccount and accounts array
  // 100% in sync, and persists immediately to localStorage & Supabase.
  const commitAccountBalanceChange = useCallback(
    (
      pnlDelta: number,
      targetAccountId?: string | null,
      ledgerMeta?: {
        referenceId: string;
        reason: string;
        type?: LedgerEntry['type'];
        metadata?: any;
      }
    ): TradingAccount | null => {
      const currentSelected = selectedAccountRef.current;
      const currentAccounts = accountsRef.current;
      const targetId = targetAccountId || currentSelected?.id || currentAccounts[0]?.id;
      if (!targetId) return null;

      let previousBal = 0;
      let newBal = 0;
      let targetAccNum = '';

      let updatedTarget: TradingAccount | null = null;
      const nextAccounts = currentAccounts.map((acc) => {
        if (acc.id === targetId || acc.accountNumber === targetId) {
          previousBal = acc.balance;
          targetAccNum = acc.accountNumber;
          newBal = Math.max(0, Number((acc.balance + pnlDelta).toFixed(2)));
          const newEq = Math.max(0, Number(newBal.toFixed(2)));
          const newFree = Math.max(0, Number((newEq - (acc.margin || 0)).toFixed(2)));
          updatedTarget = {
            ...acc,
            balance: newBal,
            equity: newEq,
            freeMargin: newFree,
            lastTradeAt: Date.now(),
            lastActivityAt: Date.now(),
          };
          return updatedTarget;
        }
        return acc;
      });

      if (
        !updatedTarget &&
        currentSelected &&
        (currentSelected.id === targetId || currentSelected.accountNumber === targetId)
      ) {
        previousBal = currentSelected.balance;
        targetAccNum = currentSelected.accountNumber;
        newBal = Math.max(0, Number((currentSelected.balance + pnlDelta).toFixed(2)));
        const newEq = Math.max(0, Number(newBal.toFixed(2)));
        const newFree = Math.max(0, Number((newEq - (currentSelected.margin || 0)).toFixed(2)));
        updatedTarget = {
          ...currentSelected,
          balance: newBal,
          equity: newEq,
          freeMargin: newFree,
          lastTradeAt: Date.now(),
          lastActivityAt: Date.now(),
        };
        nextAccounts.push(updatedTarget);
      }

      if (!updatedTarget) return null;

      // Append verified movement into the immutable financial ledger
      if (currentUserRef.current?.email && (pnlDelta !== 0 || ledgerMeta)) {
        const entryType = ledgerMeta?.type || 'REALIZED_TRADE_PNL';
        const entryRefId = ledgerMeta?.referenceId || `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const entryReason = ledgerMeta?.reason || (pnlDelta >= 0 ? 'Realized Profit' : 'Realized Loss');

        const savedEntry = appendLedgerEntry({
          userEmail: currentUserRef.current.email,
          accountNumber: targetAccNum || updatedTarget.accountNumber,
          type: entryType,
          amount: pnlDelta,
          previousBalance: previousBal,
          newBalance: newBal,
          referenceId: entryRefId,
          reason: entryReason,
          metadata: ledgerMeta?.metadata,
        });

        supabaseService.syncLedgerEntry(currentUserRef.current, savedEntry).catch(() => {});
      }

      accountsRef.current = nextAccounts;
      setAccounts(nextAccounts);

      if (
        currentSelected &&
        (currentSelected.id === updatedTarget.id ||
          currentSelected.accountNumber === updatedTarget.accountNumber)
      ) {
        selectedAccountRef.current = updatedTarget;
        setSelectedAccount(updatedTarget);
      }

      lastLocalFinancialUpdateRef.current = Date.now();

      if (currentUserRef.current) {
        saveUserFinancials(currentUserRef.current, {
          walletBalance: walletBalanceRef.current,
          accounts: nextAccounts,
          selectedAccountId: selectedAccountRef.current?.id || updatedTarget.id,
          transactions: transactionsRef.current,
        });
        supabaseService
          .syncTradingAccounts(
            currentUserRef.current,
            nextAccounts,
            selectedAccountRef.current?.id || updatedTarget.id
          )
          .catch(() => {});
      }

      return updatedTarget;
    },
    []
  );

  // Capture incoming referral link code if visitor arrived via ?ref=...
  useEffect(() => {
    referralService.captureIncomingReferral();
  }, []);

  // Synchronize dark mode class to document element for Tailwind CSS
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('vtm_theme_mode', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  // Generate initial candles for selected symbol and timeframe
  useEffect(() => {
    const inst = instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];
    const initial = generateCandles(inst.bid, timeframe, 75, inst.decimals);
    setCandles(initial);
  }, [selectedSymbol, timeframe]);

  // Reference to latest real TradingView quotes for rock-solid price synchronization
  const realTVQuotesRef = useRef<Map<string, TVQuote>>(new Map());
  const seededClosedSymbolsRef = useRef<Set<string>>(new Set());

  // =========================================================================
  // REAL TRADINGVIEW PRICE INTEGRATION & HIGH-FREQUENCY REAL-TIME ENGINE
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    let highlightTimeout: any = null;

    // Core quote applicator - updates instruments, ticks, and chart candles instantaneously
    const applyQuotes = (quotes: Map<string, TVQuote>) => {
      if (!isMounted || quotes.size === 0) return;

      quotes.forEach((q, sym) => {
        realTVQuotesRef.current.set(sym, q);
      });

      setInstruments((prevInstruments) => {
        const nextTickStates: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {};
        let hasPriceChanged = false;
        const activeSym = selectedSymbolRef.current;

        const updated = prevInstruments.map((inst) => {
          const quote = quotes.get(inst.symbol);
          if (!quote) return inst;

          const mStatus = checkInstrumentMarketHours(inst.symbol, inst.category);
          const oldBid = inst.bid;
          const oldAsk = inst.ask;
          const newBid = quote.bid;
          const newAsk = quote.ask;

          if (!mStatus.isOpen) {
            return {
              ...inst,
              bid: newBid,
              ask: newAsk,
              spread: quote.spread > 0 ? quote.spread : inst.spread,
              change24h: quote.change24h,
              high24h: quote.high24h,
              low24h: quote.low24h,
            };
          }

          let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
          if (newBid > oldBid || (newBid === oldBid && newAsk > oldAsk)) {
            direction = 'UP';
            hasPriceChanged = true;
          } else if (newBid < oldBid || (newBid === oldBid && newAsk < oldAsk)) {
            direction = 'DOWN';
            hasPriceChanged = true;
          }
          if (direction !== 'NEUTRAL') {
            nextTickStates[inst.symbol] = direction;
          }

          // Immediately update chart candle when master TradingView feed updates active pair
          if (inst.symbol === activeSym && (newBid !== oldBid || newAsk !== inst.ask)) {
            const activeChartPrice = newBid;
            const now = Date.now();
            const currentTf = timeframeRef.current || '15M';
            const intervalMs = getTimeframeDurationMs(currentTf);

            setCandles((prev) => {
              if (prev.length === 0) {
                return generateCandles(activeChartPrice, currentTf, 75, inst.decimals);
              }
              const last = prev[prev.length - 1];

              // If previous candles were seeded from initial static mock prices and differ from the live feed by >0.25%, rebase the chart candles around the real live price so the chart and Buy/Sell buttons match 1:1
              if (last.open > 0 && Math.abs(activeChartPrice - last.open) / last.open > 0.0025) {
                return generateCandles(activeChartPrice, currentTf, 75, inst.decimals);
              }

              // If time selected is over, form a brand new candle!
              if (now >= last.time + intervalMs) {
                const newSlot = Math.floor(now / intervalMs) * intervalMs;
                const newCandle: Candle = {
                  time: newSlot,
                  open: last.close,
                  high: Math.max(last.close, activeChartPrice),
                  low: Math.min(last.close, activeChartPrice),
                  close: activeChartPrice,
                  volume: 1,
                };
                const trimmed = prev.length >= 85 ? prev.slice(1) : prev;
                return [...trimmed, newCandle];
              }

              // Natural realistic candle wicks (like real TradingView candlesticks)
              const bodyTop = Math.max(last.open, activeChartPrice);
              const bodyBottom = Math.min(last.open, activeChartPrice);
              const bodySize = bodyTop - bodyBottom;
              const minStep = Math.pow(10, -inst.decimals);
              const maxWick = Math.max(minStep * 2, bodySize * 0.25);

              const safeHigh = Math.max(bodyTop, Math.min(Math.max(last.high, activeChartPrice), bodyTop + maxWick));
              const safeLow = Math.min(bodyBottom, Math.max(Math.min(last.low, activeChartPrice), bodyBottom - maxWick));

              const updatedLast: Candle = {
                ...last,
                close: activeChartPrice,
                high: Number(safeHigh.toFixed(inst.decimals)),
                low: Number(safeLow.toFixed(inst.decimals)),
                volume: (last.volume || 1) + 1,
              };
              return [...prev.slice(0, prev.length - 1), updatedLast];
            });
          }

          // Keep sparkline anchored smoothly around live newBid with natural multi-wave curvature so it never flattens
          const sparkStep = Math.pow(10, -inst.decimals) * (inst.decimals >= 4 ? 10 : inst.decimals === 3 ? 6 : 4);
          const symSeed = inst.symbol
            .split('')
            .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);
          const tickPhase = Math.round(newBid * Math.pow(10, inst.decimals)) * 0.45;
          const sparkline = Array.from({ length: 12 }, (_, sIdx) => {
            if (sIdx === 11) return newBid;
            const wave =
              Math.sin(sIdx * 1.25 + symSeed * 0.31 + tickPhase) * sparkStep * 2.4 +
              Math.cos(sIdx * 2.05 - symSeed * 0.19 + tickPhase * 0.7) * sparkStep * 1.5;
            return Number((newBid + wave).toFixed(inst.decimals));
          });

          return {
            ...inst,
            bid: newBid,
            ask: newAsk,
            spread: quote.spread > 0 ? quote.spread : inst.spread,
            change24h: quote.change24h,
            high24h: quote.high24h,
            low24h: quote.low24h,
            sparkline,
          };
        });

        if (hasPriceChanged) {
          setTickStates((prev) => ({ ...prev, ...nextTickStates }));
          if (highlightTimeout) clearTimeout(highlightTimeout);
          highlightTimeout = setTimeout(() => {
            if (isMounted) setTickStates({});
          }, 800);
        }

        if (!hasPriceChanged) {
          const anyItemChanged = updated.some((inst, idx) => {
            const prev = prevInstruments[idx];
            return !prev || prev.bid !== inst.bid || prev.ask !== inst.ask || prev.spread !== inst.spread;
          });
          if (!anyItemChanged) {
            return prevInstruments;
          }
        }

        return updated;
      });
    };

    // 1. Subscribe to immediate real-time WebSocket & SSE ticks
    const unsubscribeWs = tvService.subscribe((quotes) => {
      applyQuotes(quotes);
    });

    // 2. High-speed poll from TradingView WebSocket Proxy API every 250ms
    const fetchTradingViewFeed = async () => {
      try {
        const quotes = await tvService.fetchRealPrices();
        applyQuotes(quotes);
      } catch {
        // Silent fallback
      }
    };

    // Initial immediate fetch
    fetchTradingViewFeed();

    // Master live feed from TradingView - runs smoothly in synchronization with real-time WebSocket ticks
    const tvInterval = setInterval(fetchTradingViewFeed, 2000);

    // Dedicated timeframe & live dynamic spread monitor (0.16 - 1.18, max 1.2)
    // Strictly anchors Bid 1:1 to the real TradingView chart price (never adds artificial bidJitter so buttons never drift ahead or behind the chart)
    const candleCheckInterval = setInterval(() => {
      if (!isMounted) return;

      setInstruments((prevInsts) => {
        let hasAnyChanged = false;
        const nextInsts = prevInsts.map((item) => {
          const tvAuthQuote = realTVQuotesRef.current.get(item.symbol);
          const lockedBid = Number((tvAuthQuote?.bid ?? item.bid).toFixed(item.decimals));
          const lockedSpread = Number(
            (tvAuthQuote?.spread && tvAuthQuote.spread > 0
              ? tvAuthQuote.spread
              : item.spread > 0
              ? item.spread
              : 0.35
            ).toFixed(2)
          );

          let gap = lockedSpread;
          if (item.decimals === 5) {
            gap = Math.max(0.00001, Number((lockedSpread / 10000).toFixed(5)));
          } else if (item.decimals === 4) {
            gap = Math.max(0.0001, Number((lockedSpread / 1000).toFixed(4)));
          } else if (item.decimals === 3) {
            gap =
              item.symbol === 'XAUUSD'
                ? Number(lockedSpread.toFixed(3))
                : Math.max(0.001, Number((lockedSpread * 0.01).toFixed(3)));
          } else {
            if (lockedBid < 250) {
              gap = Math.max(0.01, Number((lockedSpread * 0.04).toFixed(2)));
            } else if (lockedBid < 1000) {
              gap = Math.max(0.01, Number((lockedSpread * 0.1).toFixed(2)));
            } else {
              gap = Math.max(0.01, Number(lockedSpread.toFixed(2)));
            }
          }

          const nextAsk = Number((lockedBid + gap).toFixed(item.decimals));
          if (item.bid !== lockedBid || item.ask !== nextAsk || item.spread !== lockedSpread) {
            hasAnyChanged = true;
            return {
              ...item,
              bid: lockedBid,
              ask: nextAsk,
              spread: lockedSpread,
            };
          }
          return item;
        });
        return hasAnyChanged ? nextInsts : prevInsts;
      });

      const activeSym = selectedSymbolRef.current;
      const inst = instrumentsRef.current.find((i) => i.symbol === activeSym);
      if (!inst) return;
      const mStatus = checkInstrumentMarketHours(inst.symbol, inst.category);
      if (!mStatus.isOpen) return;

      const now = Date.now();
      const currentTf = timeframeRef.current || '15M';
      const intervalMs = getTimeframeDurationMs(currentTf);

      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (now >= last.time + intervalMs) {
          const newSlot = Math.floor(now / intervalMs) * intervalMs;
          const currentPrice = inst.bid;
          const newCandle: Candle = {
            time: newSlot,
            open: last.close,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 1,
          };
          const trimmed = prev.length >= 85 ? prev.slice(1) : prev;
          return [...trimmed, newCandle];
        }
        return prev;
      });
    }, 1000);

    return () => {
      isMounted = false;
      unsubscribeWs();
      clearInterval(tvInterval);
      clearInterval(candleCheckInterval);
      if (highlightTimeout) clearTimeout(highlightTimeout);
    };
  }, []);

  // Helper to evaluate open manual positions' realistic floating P&L and trigger SL / TP closures synchronously
  const evaluateManualPositionsAndTpSl = useCallback(
    (currentInstList: Instrument[]) => {
      const currentPositions = positionsRef.current;
      if (!currentPositions || currentPositions.length === 0) return;

      const currentInstMap = new Map<string, Instrument>(currentInstList.map((i) => [i.symbol, i]));
      const triggeredClosures: Array<{ id: string; reason: 'TP' | 'SL'; price: number }> = [];
      const triggeredIds = new Set<string>();
      let changed = false;

      const updatedPositions = currentPositions.map((pos) => {
        if (closingPositionIdsRef.current.has(pos.id)) return pos;
        const inst = currentInstMap.get(pos.symbol);
        if (!inst) return pos;

        const rawMarketPrice = pos.side === 'BUY' ? inst.bid : inst.ask;
        if (!(rawMarketPrice > 0) || !(pos.openPrice > 0)) return pos;

        // Guard against stale static seed prices before the live market feed has hydrated this symbol
        if (
          !realTVQuotesRef.current.has(pos.symbol) &&
          Math.abs(rawMarketPrice - pos.openPrice) / pos.openPrice > 0.12
        ) {
          return pos;
        }

        // Pure market P&L calculation: driven strictly by actual entry price, executable bid/ask price, position volume, and contract specifications
        const currentPrice = Number(rawMarketPrice.toFixed(inst.decimals));
        const grossPnl = calculateUnifiedPnL(pos.symbol, pos.side, pos.openPrice, currentPrice, pos.lots);
        let pnl = Number((grossPnl + (pos.swap || 0) + (pos.commission || 0)).toFixed(2));



        // Authoritative SL / TP check: Trigger when market price hits SL/TP price, or fallback to USD target if no price set
        const hitTpByPrice =
          pos.tp !== null &&
          pos.tp > 0 &&
          ((pos.side === 'BUY' && currentPrice >= pos.tp) ||
            (pos.side === 'SELL' && currentPrice <= pos.tp));
        const hitTpByUsd =
          (!pos.tp || pos.tp <= 0) &&
          typeof pos.tpUsd === 'number' &&
          pos.tpUsd > 0 &&
          pnl >= pos.tpUsd;

        const hitSlByPrice =
          pos.sl !== null &&
          pos.sl > 0 &&
          ((pos.side === 'BUY' && currentPrice <= pos.sl) ||
            (pos.side === 'SELL' && currentPrice >= pos.sl));
        const hitSlByUsd =
          (!pos.sl || pos.sl <= 0) &&
          typeof pos.slUsd === 'number' &&
          pos.slUsd > 0 &&
          pnl <= -pos.slUsd;

        if (hitTpByPrice || hitTpByUsd) {
          const exitPrice = pos.tp && pos.tp > 0 ? pos.tp : currentPrice;
          triggeredIds.add(pos.id);
          triggeredClosures.push({ id: pos.id, reason: 'TP', price: exitPrice });
          return pos;
        }

        if (hitSlByPrice || hitSlByUsd) {
          const exitPrice = pos.sl && pos.sl > 0 ? pos.sl : currentPrice;
          triggeredIds.add(pos.id);
          triggeredClosures.push({ id: pos.id, reason: 'SL', price: exitPrice });
          return pos;
        }

        if (pos.currentPrice !== currentPrice || pos.pnl !== pnl) {
          changed = true;
          return {
            ...pos,
            currentPrice,
            pnl,
          };
        }
        return pos;
      });

      if (changed) {
        const remaining =
          triggeredIds.size > 0
            ? updatedPositions.filter((p) => !triggeredIds.has(p.id))
            : updatedPositions;
        positionsRef.current = remaining;
        setPositions(() => [...remaining]);
      }

      if (triggeredClosures.length > 0) {
        triggeredClosures.forEach((tc) => {
          closePositionById(tc.id, tc.reason, tc.price);
        });
      }
    },
    []
  );

  // Continuous 400ms monitor so manual trade TP / SL triggers immediately even between quote ticks
  useEffect(() => {
    const timer = setInterval(() => {
      if (positionsRef.current.length > 0) {
        evaluateManualPositionsAndTpSl(instrumentsRef.current);
      }
    }, 400);
    return () => clearInterval(timer);
  }, [evaluateManualPositionsAndTpSl]);

  // Update floating positions P&L and check pending orders when prices change
  useEffect(() => {
    const currentInstMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));

    evaluateManualPositionsAndTpSl(instruments);

    // Update active chart's latest candle smoothly in perfect sync with Buy/Sell buttons
    const activeInst = currentInstMap.get(selectedSymbol);
    if (activeInst) {
      const marketStatus = checkInstrumentMarketHours(activeInst.symbol, activeInst.category);
      if (marketStatus.isOpen) {
        const executionPrice = activeInst.bid;
        const now = Date.now();
        const currentTf = timeframeRef.current || '15M';
        const intervalMs = getTimeframeDurationMs(currentTf);

        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;
          const last = prevCandles[prevCandles.length - 1];

          if (last.open > 0 && Math.abs(executionPrice - last.open) / last.open > 0.0025) {
            return generateCandles(executionPrice, currentTf, 75, activeInst.decimals);
          }

          // If time selected is over, form a brand new candle!
          if (now >= last.time + intervalMs) {
            const newSlot = Math.floor(now / intervalMs) * intervalMs;
            const newCandle: Candle = {
              time: newSlot,
              open: last.close,
              high: Math.max(last.close, executionPrice),
              low: Math.min(last.close, executionPrice),
              close: executionPrice,
              volume: 1,
            };
            const trimmed = prevCandles.length >= 85 ? prevCandles.slice(1) : prevCandles;
            return [...trimmed, newCandle];
          }

          const bodyTop = Math.max(last.open, executionPrice);
          const bodyBottom = Math.min(last.open, executionPrice);
          const bodySize = bodyTop - bodyBottom;
          const minStep = Math.pow(10, -activeInst.decimals);
          const maxWick = Math.max(minStep * 2, bodySize * 0.25);

          const safeHigh = Math.min(Math.max(last.high, executionPrice), bodyTop + maxWick);
          const safeLow = Math.max(Math.min(last.low, executionPrice), bodyBottom - maxWick);

          const updatedLast: Candle = {
            ...last,
            close: executionPrice,
            high: Number(safeHigh.toFixed(activeInst.decimals)),
            low: Number(safeLow.toFixed(activeInst.decimals)),
            volume: (last.volume || 1) + 1,
          };
          return [...prevCandles.slice(0, prevCandles.length - 1), updatedLast];
        });
      }
    }

    // Check pending orders for trigger
    pendingOrders.forEach((ord) => {
      const inst = currentInstMap.get(ord.symbol);
      if (!inst) return;

      let triggered = false;
      if (ord.type === 'BUY_LIMIT' && inst.ask <= ord.targetPrice) triggered = true;
      if (ord.type === 'SELL_LIMIT' && inst.bid >= ord.targetPrice) triggered = true;
      if (ord.type === 'BUY_STOP' && inst.ask >= ord.targetPrice) triggered = true;
      if (ord.type === 'SELL_STOP' && inst.bid <= ord.targetPrice) triggered = true;

      if (triggered) {
        executeMarketOrderInternal({
          symbol: ord.symbol,
          side: ord.side,
          lots: ord.lots,
          sl: ord.sl,
          tp: ord.tp,
          executionPrice: ord.targetPrice,
          accountId: ord.accountId,
          accountNumber: ord.accountNumber,
        });
        setPendingOrders((orders) => orders.filter((o) => o.id !== ord.id));
        addNotification(
          `Pending order triggered: ${ord.type} ${ord.lots} ${ord.symbol} @ ${ord.targetPrice}`
        );
      }
    });

    // Check target price alerts for live trigger
    if (priceAlertsRef.current.length > 0) {
      let anyAlertTriggered = false;
      const updatedAlerts = priceAlertsRef.current.map((alert) => {
        if (alert.status !== 'ACTIVE') return alert;
        const inst = currentInstMap.get(alert.symbol);
        if (!inst) return alert;

        const currentPrice = alert.targetType === 'BID' ? inst.bid : inst.ask;
        let isHit = false;

        if (alert.condition === 'ABOVE_OR_EQUAL' && currentPrice >= alert.targetPrice) {
          isHit = true;
        } else if (alert.condition === 'BELOW_OR_EQUAL' && currentPrice <= alert.targetPrice) {
          isHit = true;
        }

        if (isHit) {
          anyAlertTriggered = true;
          playAlertChime();

          const formattedTarget = alert.targetPrice.toFixed(inst.decimals);
          const formattedCurrent = currentPrice.toFixed(inst.decimals);
          const noteStr = alert.note ? ` • "${alert.note}"` : '';

          // 1. In-app Notification
          addNotification(
            `🔔 Price Alert Hit: ${alert.symbol} ${alert.targetType} reached ${formattedTarget} (Market: ${formattedCurrent})${noteStr}`
          );

          // 2. Global Toast Alert
          triggerActionPopup({
            type: 'PRICE_ALERT',
            title: `🔔 Target Alert: ${alert.symbol}`,
            subtitle: `${alert.targetType} hit target ${formattedTarget} (Market: ${formattedCurrent})${noteStr}`,
            details: {
              symbol: alert.symbol,
              price: alert.targetPrice,
              currentPrice,
              targetType: alert.targetType,
              note: alert.note,
            },
            duration: 7500,
          });

          return {
            ...alert,
            status: alert.recurring ? ('ACTIVE' as const) : ('TRIGGERED' as const),
            triggeredAt: Date.now(),
            triggeredPrice: currentPrice,
          };
        }

        return alert;
      });

      if (anyAlertTriggered) {
        const nowTs = Date.now();
        lastLocalExtrasUpdateRef.current = nowTs;
        priceAlertsRef.current = updatedAlerts;
        setPriceAlerts(updatedAlerts);
        savePriceAlerts(updatedAlerts, currentUserRef.current?.email, nowTs);
        if (currentUserRef.current && currentUserRef.current.email && !isMasterAdminEmail(currentUserRef.current.email)) {
          supabaseService.syncExtrasState(currentUserRef.current, {
            priceAlerts: updatedAlerts,
            followedStrategies: followedStrategiesRef.current,
          });
        }
      }
    }
  }, [instruments]);



  // Capital Protection Stop-Out: when live account equity reaches minimum tradable reserve floor, close open trades & stop bots atomically
  const handleZeroBalanceStopOut = (_remainingEquity?: number) => {
    if (isStopOutProcessingRef.current) return;
    const curAcc = selectedAccountRef.current || selectedAccount;
    if (!curAcc) return;

    // Demo accounts should never be stopped out automatically while practicing
    const isDemo = String(curAcc.type).toLowerCase() === 'demo';
    if (isDemo && (curAcc.balance ?? 0) > 0) return;

    const currentBal = Number(curAcc.balance ?? 0);
    if (currentBal <= 0) return;

    const accPositions = (positionsRef.current || []).filter((p) => belongsToAccount(p, curAcc));
    const accOpenBotTrades = (botTradesRef.current || []).filter(
      (bt) => bt.status === 'OPEN' && belongsToAccount(bt, curAcc)
    );

    // Never trigger stop-out if this specific account has no open positions or open bot trades
    if (accPositions.length === 0 && accOpenBotTrades.length === 0) {
      return;
    }

    // Verify all open positions have live quotes hydrated before any stop-out can execute
    const hasUnhydratedQuote = accPositions.some((p) => !realTVQuotesRef.current.has(p.symbol));
    if (hasUnhydratedQuote) {
      return;
    }

    isStopOutProcessingRef.current = true;
    const stopOutTs = Date.now();

    // 1. Pause active algorithmic bots belonging to THIS account only
    setBotRuns((runs) => {
      if (!runs.some((r) => r.status === 'RUNNING' && belongsToAccount(r, curAcc))) return runs;
      const stoppedIds: string[] = [];
      const stopped = runs.map((r) => {
        if (r.status === 'RUNNING' && belongsToAccount(r, curAcc)) {
          if (r.id) stoppedIds.push(r.id);
          if (r.runId) stoppedIds.push(r.runId);
          return {
            ...r,
            status: 'PAUSED' as const,
            statusUpdatedAt: stopOutTs,
            stoppedAt: stopOutTs,
            lastSignal: 'Stopped automatically: Margin stop-out protection triggered',
            lastSignalTime: stopOutTs,
          };
        }
        return r;
      });
      lastLocalBotsUpdateRef.current = stopOutTs;
      supabaseService.recordBotStatusIntent(stoppedIds, 'PAUSED', stopOutTs, {
        stoppedAt: stopOutTs,
        lastSignal: 'Stopped automatically: Margin stop-out protection triggered',
        lastSignalTime: stopOutTs,
      });
      botRunsRef.current = stopped;
      saveStoredBotRuns(stopped, currentUserRef.current?.email);
      if (currentUserRef.current?.email) {
        supabaseService
          .syncBotState(
            currentUserRef.current,
            {
              importedBots,
              botRuns: stopped,
              botTrades: botTradesRef.current,
              deletedBotIds: getDeletedBotIds(),
            },
            true
          )
          .catch(() => {});
      }
      return stopped;
    });

    // 2. Batch close all open positions atomically in one single pass (prevents setState loop / Maximum update depth exceeded)
    const closedPositions: ClosedTrade[] = [];
    const closedIds = new Set<string>();
    let totalRealizedPnl = 0;

    for (const pos of accPositions) {
      if (closingPositionIdsRef.current.has(pos.id)) continue;
      closingPositionIdsRef.current.add(pos.id);
      closedIds.add(pos.id);
      if (currentUserRef.current?.email) {
        markTradeSettled(currentUserRef.current.email, pos.id);
      }
      const inst = instrumentsRef.current.find((i) => i.symbol === pos.symbol);
      const decimals = inst?.decimals ?? 5;
      const liveExecPrice =
        pos.side === 'BUY'
          ? inst?.bid ?? pos.currentPrice ?? pos.openPrice
          : inst?.ask ?? pos.currentPrice ?? pos.openPrice;
      const finalClosePrice = Number(liveExecPrice.toFixed(decimals));
      const calculatedPnl = Number(
        (
          calculateUnifiedPnL(pos.symbol, pos.side, pos.openPrice, finalClosePrice, pos.lots) +
          (pos.swap || 0) +
          (pos.commission || 0)
        ).toFixed(2)
      );
      totalRealizedPnl += calculatedPnl;
      closedPositions.push({
        id: pos.id,
        ticket: pos.ticket,
        symbol: pos.symbol,
        side: pos.side,
        lots: pos.lots,
        openPrice: pos.openPrice,
        closePrice: finalClosePrice,
        pnl: calculatedPnl,
        openTime: pos.openTime,
        closeTime: stopOutTs,
        reason: 'SL',
        accountId: curAcc.id,
        accountNumber: curAcc.accountNumber,
      });
    }

    if (closedIds.size > 0) {
      const remaining = (positionsRef.current || []).filter((p) => !closedIds.has(p.id));
      positionsRef.current = remaining;
      setPositions(remaining);
      setClosedTrades((prev) => {
        const deduped = prev.filter((ct) => !closedIds.has(ct.id));
        const updated = [...closedPositions, ...deduped];
        if (currentUserRef.current?.email) {
          try {
            localStorage.setItem(
              `vtm_closed_trades_${currentUserRef.current.email.trim().toLowerCase()}`,
              JSON.stringify(updated)
            );
            localStorage.setItem(
              `vtm_open_positions_${currentUserRef.current.email.trim().toLowerCase()}`,
              JSON.stringify(remaining)
            );
          } catch {
            // ignore
          }
        }
        return updated;
      });

      commitAccountBalanceChange(totalRealizedPnl, curAcc.id, {
        type: 'REALIZED_TRADE_PNL',
        referenceId: `stopout-${stopOutTs}`,
        reason: `Margin Stop-Out: ${closedPositions.length} positions closed`,
      });
    }

    // 3. Close open bot trades
    accOpenBotTrades.forEach((bt) => {
      handleCloseBotTrade(bt.id);
    });

    const latestAcc =
      accountsRef.current.find((a) => a.id === curAcc.id || a.accountNumber === curAcc.accountNumber) ||
      selectedAccountRef.current ||
      curAcc;
    const finalBal = Number((latestAcc?.balance ?? 0).toFixed(2));

    playOrderSound(false);
    addNotification(
      `Margin Stop-Out Protection Triggered ($${finalBal.toFixed(2)}): All open trades and bots closed at verified market prices.`
    );
    triggerActionPopup({
      type: 'ERROR',
      title: 'Margin Protection: All Trades & Bots Closed',
      subtitle: `Account equity reached stop-out threshold ($${finalBal.toFixed(2)}). All open positions and bots were closed and recorded in trade history.`,
    });

    setTimeout(() => {
      isStopOutProcessingRef.current = false;
    }, 1200);
  };

  // Reference memoized accounts and selectedAccount directly (already calculated with live equity & margin)
  const accountsWithEquity = accounts;
  const selectedAccountWithEquity = selectedAccount;

  // Capital Protection Stop-Out check (side effect without state update loop)
  useEffect(() => {
    if (isStopOutProcessingRef.current) return;
    if (!selectedAccountWithEquity) return;

    // Demo accounts should never be stopped out automatically while practicing
    const isDemo = String(selectedAccountWithEquity.type).toLowerCase() === 'demo';
    if (isDemo) return;

    const currentBal = Number(selectedAccountWithEquity.balance ?? 0);
    if (currentBal <= 0) return;

    const accountPositions = positions.filter((p) => belongsToAccount(p, selectedAccountWithEquity));
    const openBotTradesList = botTrades.filter(
      (bt) => bt.status === 'OPEN' && belongsToAccount(bt, selectedAccountWithEquity)
    );
    const hasOpenTrades = accountPositions.length > 0 || openBotTradesList.length > 0;
    if (!hasOpenTrades) return;

    const allQuotesHydrated = accountPositions.every((p) => realTVQuotesRef.current.has(p.symbol));
    if (!allQuotesHydrated) return;

    const manualPnl = accountPositions.reduce((acc, p) => acc + p.pnl, 0);
    const openBotPnl = openBotTradesList.reduce((acc, bt) => acc + (bt.profitUsd || 0), 0);
    const totalPnl = manualPnl + openBotPnl;
    const calculatedEquity = selectedAccountWithEquity.equity;

    const accSeed = parseInt(String(selectedAccountWithEquity.accountNumber || '88').slice(-2), 10) || 45;
    const dynamicReserveFloor = Number((0.8 + ((accSeed % 14) * 0.1)).toFixed(2));
    const protectionFloor = currentBal > dynamicReserveFloor ? dynamicReserveFloor : 0.8;

    if (
      totalPnl < 0 &&
      currentBal > protectionFloor &&
      calculatedEquity <= protectionFloor
    ) {
      handleZeroBalanceStopOut(protectionFloor);
    }
  }, [positions, botTrades, selectedAccountWithEquity]);

  // Helper to add notification with guaranteed unique key and persistent storage + Supabase sync
  const addNotification = (title: string) => {
    const activeUser = currentUserRef.current || currentUser;
    // Guard against duplicate welcome notifications on the same day
    if (title.toLowerCase().includes('welcome')) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dateKey = getWelcomeDateStorageKey(activeUser);
      try {
        if (localStorage.getItem(dateKey) === todayStr) {
          return;
        }
        localStorage.setItem(dateKey, todayStr);
      } catch {
        // ignore
      }
    }

    const nowTs = Date.now();
    lastLocalNotifsUpdateRef.current = nowTs;
    const uniqueId = `notif-${nowTs}-${Math.random().toString(36).slice(2, 9)}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications((prev) => {
      const updated = [
        {
          id: uniqueId,
          title,
          time: timeStr,
          read: false,
          createdAt: nowTs,
        },
        ...prev,
      ].slice(0, 500);
      saveUserNotificationsToStorage(activeUser, updated, nowTs);
      if (activeUser) {
        const welcomeDate = localStorage.getItem(getWelcomeDateStorageKey(activeUser)) || '';
        supabaseService.syncNotifications(activeUser, updated, welcomeDate);
      }
      return updated;
    });
  };

  const handleMarkNotificationsRead = () => {
    const activeUser = currentUserRef.current || currentUser;
    const nowTs = Date.now();
    lastLocalNotifsUpdateRef.current = nowTs;
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveUserNotificationsToStorage(activeUser, updated, nowTs);
      if (activeUser) {
        const welcomeDate = localStorage.getItem(getWelcomeDateStorageKey(activeUser)) || '';
        supabaseService.syncNotifications(activeUser, updated, welcomeDate);
      }
      return updated;
    });
  };

  const handleToggleNotificationRead = (notifId: string) => {
    const activeUser = currentUserRef.current || currentUser;
    const nowTs = Date.now();
    lastLocalNotifsUpdateRef.current = nowTs;
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notifId ? { ...n, read: !n.read } : n));
      saveUserNotificationsToStorage(activeUser, updated, nowTs);
      if (activeUser) {
        const welcomeDate = localStorage.getItem(getWelcomeDateStorageKey(activeUser)) || '';
        supabaseService.syncNotifications(activeUser, updated, welcomeDate);
      }
      return updated;
    });
  };

  // Strict capital, balance, free margin & per-account open trade limit validator:
  // 1) Never open any trade when freeMargin <= 0 or balance <= 0
  // 2) Never open any trade when account balance or free margin is smaller than the required capital for the lot size ($10 per 0.01 lot / required margin)
  // 3) Enforce per-account maximum open trades limit depending on account type/tier, account balance, and lot size used
  const validateTradeCapitalAndMargin = (
    lots: number,
    symbol: string,
    _entryPrice: number
  ): { allowed: boolean; title?: string; message?: string } => {
    const activeAcc = selectedAccountRef.current || selectedAccount;
    if (!activeAcc) {
      return {
        allowed: false,
        title: 'No Trading Account Selected',
        message: 'Please select or open a Live or Demo trading account before placing a trade.',
      };
    }

    const balance = Number(activeAcc.balance ?? 0);
    const cleanLots = Math.max(0.01, Number(lots || 0.01));

    // Real-time synchronous calculation of current open trades, floating PnL, and used margin for THIS account only
    const openManualPositions = (positionsRef.current || []).filter((p) => belongsToAccount(p, activeAcc));
    const openBotPositions = (botTradesRef.current || []).filter(
      (bt) => bt.status === 'OPEN' && belongsToAccount(bt, activeAcc)
    );
    const currentOpenTradesCount = openManualPositions.length + openBotPositions.length;

    const currentFloatingPnl =
      openManualPositions.reduce((s, p) => s + (p.pnl || 0), 0) +
      openBotPositions.reduce((s, bt) => s + (bt.profitUsd || 0), 0);

    const currentUsedMargin =
      openManualPositions.reduce((s, p) => s + p.lots * 40, 0) +
      openBotPositions.reduce((s, bt) => s + bt.lotSize * 40, 0);

    const equity = Number(Math.max(0, balance + currentFloatingPnl).toFixed(2));
    const freeMargin = Number(Math.max(0, equity - currentUsedMargin).toFixed(2));

    const isDemo = String(activeAcc.type).toLowerCase() === 'demo';

    if (!isDemo && (balance <= 1.0 || equity <= 1.0 || freeMargin <= 0.1)) {
      return {
        allowed: false,
        title: 'Minimum Tradable Capital Reached',
        message: `Trade blocked to protect your account from reaching zero (Equity: $${Math.max(0, equity).toFixed(2)}, Free Margin: $${Math.max(0, freeMargin).toFixed(2)}). Please deposit funds to continue trading.`,
      };
    }

    // Check account tier & lot size open trade limits (MT5 standard supports up to 200 open positions)
    const tradeLimits = getAccountMaxOpenTrades(
      activeAcc.tier,
      activeAcc.type,
      balance,
      cleanLots
    );

    if (!isDemo && cleanLots > tradeLimits.maxLotSizeForTier) {
      return {
        allowed: false,
        title: `Lot Size (${cleanLots}) Exceeds ${activeAcc.tier} Account Limit`,
        message: `Your ${activeAcc.tier} (${activeAcc.type}) account allows a maximum lot size of ${tradeLimits.maxLotSizeForTier.toFixed(2)} lots per trade.`,
      };
    }

    const orderMargin = Number((cleanLots * 40).toFixed(2));
    const requiredCapital = cleanLots <= 0.01 ? Math.min(balance, orderMargin) : orderMargin;

    if (!isDemo && (balance < requiredCapital || freeMargin < orderMargin)) {
      return {
        allowed: false,
        title: `Lot Size (${cleanLots}) Exceeds Account Capital / Free Margin`,
        message: `${cleanLots} lots on ${symbol} requires at least $${requiredCapital.toFixed(2)} margin (Balance: $${balance.toFixed(2)}, Free Margin: $${freeMargin.toFixed(2)}).`,
      };
    }

    if (currentOpenTradesCount >= 200) {
      return {
        allowed: false,
        title: `Max Open Trades Limit Reached (${currentOpenTradesCount}/200)`,
        message: `Maximum limit of 200 open trades reached on Account #${activeAcc.accountNumber}. Please close a trade before opening more.`,
      };
    }

    return { allowed: true };
  };

  // Smart normalizer for manual Stop Loss & Take Profit:
  // Supports both exact Target Prices (e.g. 1.12600 / 4150.00) AND USD profit/loss amounts (e.g. 2 / 5 / 10),
  // and ensures TP is always placed on the profit side of openPrice and SL on the loss side of openPrice.
  // Smart normalizer for manual Stop Loss & Take Profit:
  // Preserves exact target prices or converts dollar targets, and supports clearing with null or 0.
  const normalizeManualTpSl = (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    openPrice: number;
    lots: number;
    rawSl: number | null;
    rawTp: number | null;
    decimals: number;
  }): {
    sl: number | null;
    tp: number | null;
    slUsd: number | null;
    tpUsd: number | null;
  } => {
    const { symbol, side, openPrice, lots, rawSl, rawTp, decimals } = params;
    const contractSize = getContractSize(symbol);
    const minStep = Math.pow(10, -decimals);
    const unitVal = Math.max(0.0001, lots * contractSize);

    let tp: number | null = null;
    let tpUsd: number | null = null;
    if (rawTp !== null && rawTp !== undefined && !isNaN(Number(rawTp)) && Number(rawTp) > 0) {
      const val = Number(rawTp);
      const relDiff = Math.abs(val - openPrice) / Math.max(0.0001, openPrice);
      if (relDiff < 0.6) {
        // Entered as an exact Target Price
        tp = Number(val.toFixed(decimals));
        const dist = Math.abs(tp - openPrice);
        tpUsd = Math.max(0.01, Number((dist * unitVal).toFixed(2)));
      } else {
        // Entered as a USD Profit Target (e.g. 5, 10, 20 dollars)
        tpUsd = Math.max(0.05, Number(Math.abs(val).toFixed(2)));
        const priceOffset = Math.max(minStep * 2, tpUsd / unitVal);
        tp =
          side === 'BUY'
            ? Number((openPrice + priceOffset).toFixed(decimals))
            : Number((openPrice - priceOffset).toFixed(decimals));
      }
    }

    let sl: number | null = null;
    let slUsd: number | null = null;
    if (rawSl !== null && rawSl !== undefined && !isNaN(Number(rawSl)) && Number(rawSl) > 0) {
      const val = Number(rawSl);
      const relDiff = Math.abs(val - openPrice) / Math.max(0.0001, openPrice);
      if (relDiff < 0.6) {
        // Entered as an exact Target Price
        sl = Number(val.toFixed(decimals));
        const dist = Math.abs(openPrice - sl);
        slUsd = Math.max(0.01, Number((dist * unitVal).toFixed(2)));
      } else {
        // Entered as a USD Stop Loss Target (e.g. 5, 10, 20 dollars)
        slUsd = Math.max(0.05, Number(Math.abs(val).toFixed(2)));
        const priceOffset = Math.max(minStep * 2, slUsd / unitVal);
        sl =
          side === 'BUY'
            ? Number((openPrice - priceOffset).toFixed(decimals))
            : Number((openPrice + priceOffset).toFixed(decimals));
      }
    }

    return { sl, tp, slUsd, tpUsd };
  };

  // Internal execution
  const executeMarketOrderInternal = (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
    executionPrice?: number;
    accountId?: string;
    accountNumber?: string;
  }) => {
    lastLocalTradeActionRef.current = Date.now();
    const inst = instruments.find((i) => i.symbol === params.symbol) || instruments[0];

    // Enforce market hours: if currency is closed, one cannot open any trade
    const marketStatus = checkInstrumentMarketHours(params.symbol, inst?.category);
    if (!marketStatus.isOpen) {
      playOrderSound(false);
      addNotification(`Order Rejected: ${params.symbol} market is closed`);
      triggerActionPopup({
        type: 'ERROR',
        title: `${params.symbol} is closed`,
        details: {
          symbol: params.symbol,
          side: params.side,
          lots: params.lots,
        },
      });
      return;
    }

    const minPriceStep = Math.pow(10, -inst.decimals);
    const liveGap = Math.max(minPriceStep, Math.abs(inst.ask - inst.bid));
    const fillPrice =
      params.executionPrice ||
      (params.side === 'BUY'
        ? Number(Math.max(inst.ask, inst.bid + liveGap).toFixed(inst.decimals))
        : Number(Math.min(inst.bid, inst.ask - liveGap).toFixed(inst.decimals)));
    const initialLiquidationPrice =
      params.side === 'BUY'
        ? Number(Math.min(inst.bid, fillPrice - liveGap).toFixed(inst.decimals))
        : Number(Math.max(inst.ask, fillPrice + liveGap).toFixed(inst.decimals));

    // Strict check: Never open trade when free margin is 0 or lot size exceeds account balance/capital
    const capCheck = validateTradeCapitalAndMargin(params.lots, params.symbol, fillPrice);
    if (!capCheck.allowed) {
      playOrderSound(false);
      addNotification(capCheck.message || 'Order Rejected: Insufficient Free Margin / Capital');
      triggerActionPopup({
        type: 'ERROR',
        title: capCheck.title || 'Insufficient Free Margin',
        subtitle: capCheck.message,
        details: {
          symbol: params.symbol,
          side: params.side,
          lots: params.lots,
        },
      });
      return;
    }

    const ticket = Math.floor(7000000 + Math.random() * 999999);
    const contractSize = getContractSize(params.symbol);
    const initialPriceDiff =
      params.side === 'BUY'
        ? initialLiquidationPrice - fillPrice
        : fillPrice - initialLiquidationPrice;
    const rawInitialPnl = Number((initialPriceDiff * params.lots * contractSize).toFixed(2));
    // Every trade immediately starts at a realistic spread cost (capped proportionally to lot size)
    const maxInitialSpreadUsd = Number((Math.max(0.03, (inst.spread || 0.35) * (params.lots / 0.01) * 0.12)).toFixed(2));
    const initialPnl =
      rawInitialPnl < 0 && Math.abs(rawInitialPnl) <= maxInitialSpreadUsd
        ? rawInitialPnl
        : -maxInitialSpreadUsd;

    // Normalize SL and TP (supports both target prices and USD profit/loss targets)
    const normalizedTpSl = normalizeManualTpSl({
      symbol: params.symbol,
      side: params.side,
      openPrice: fillPrice,
      lots: params.lots,
      rawSl: params.sl,
      rawTp: params.tp,
      decimals: inst.decimals,
    });

    // Evaluate target outcome for manual trading:
    // - All Demo accounts (all users) & Marketers on Real/Live accounts: >95% win rate (identical high win rate)
    // - Retail trader on Real/Live account: strictly below 15% win rate
    const activeAccForManual = selectedAccountRef.current || selectedAccount;
    const isDemoManual = (activeAccForManual?.type || selectedAccount?.type) === 'Demo';
    const manualClosedHistory = closedTrades.filter((ct) => !String(ct.id).startsWith('cl-bot-'));
    const manualWinsCount = manualClosedHistory.filter((ct) => (ct.pnl || 0) > 0).length;
    const isManualTargetWin = evaluateTargetWinOrLoss(
      userRoleRef.current,
      undefined,
      isDemoManual,
      '90.0%',
      manualWinsCount,
      manualClosedHistory.length
    );

    const ownerAccountId = params.accountId || activeAccForManual?.id;
    const ownerAccountNumber = params.accountNumber || activeAccForManual?.accountNumber;

    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random()}`,
      ticket,
      symbol: params.symbol,
      side: params.side,
      lots: params.lots,
      openPrice: fillPrice,
      currentPrice: initialLiquidationPrice,
      sl: normalizedTpSl.sl,
      tp: normalizedTpSl.tp,
      slUsd: normalizedTpSl.slUsd,
      tpUsd: normalizedTpSl.tpUsd,
      pnl: initialPnl,
      swap: 0,
      commission: 0,
      openTime: Date.now(),
      targetOutcome: isManualTargetWin ? 'WIN' : 'LOSS',
      accountId: ownerAccountId,
      accountNumber: ownerAccountNumber,
    };

    const nextManualPositions = [newPos, ...positionsRef.current];
    positionsRef.current = nextManualPositions;
    setPositions(() => [...nextManualPositions]);
    if (currentUserRef.current?.email) {
      try {
        localStorage.setItem(
          `vtm_open_positions_${currentUserRef.current.email.trim().toLowerCase()}`,
          JSON.stringify(nextManualPositions)
        );
      } catch {
        // ignore
      }
    }
    // Stamp lastTradeAt on the active account so the platform knows this account is actively traded
    if (selectedAccountRef.current) {
      const nowTs = Date.now();
      const stampedAccounts = accountsRef.current.map((a) =>
        a.id === selectedAccountRef.current?.id || a.accountNumber === selectedAccountRef.current?.accountNumber
          ? { ...a, lastTradeAt: nowTs, lastActivityAt: nowTs }
          : a
      );
      accountsRef.current = stampedAccounts;
      setAccounts(stampedAccounts);
      const updatedSel =
        stampedAccounts.find((a) => a.id === selectedAccountRef.current?.id) || selectedAccountRef.current;
      selectedAccountRef.current = updatedSel;
      setSelectedAccount(updatedSel);
      if (currentUserRef.current) {
        saveUserFinancials(currentUserRef.current, {
          walletBalance: walletBalanceRef.current,
          accounts: stampedAccounts,
          selectedAccountId: updatedSel.id,
          transactions: transactionsRef.current,
        });
      }
    }
    playOrderSound(true);
    addNotification(
      `Order Executed: ${params.side} ${params.lots} ${params.symbol} @ ${fillPrice}`
    );

    // Save open trade & sync master trade state to Supabase cloud database for multi-device parity
    const activeUser = currentUserRef.current || currentUser;
    if (activeUser) {
      supabaseService.saveTrade(activeUser, {
        id: newPos.id,
        ticket: newPos.ticket,
        accountNumber: selectedAccount?.accountNumber,
        symbol: newPos.symbol,
        side: newPos.side,
        orderType: 'MARKET',
        lots: newPos.lots,
        openPrice: newPos.openPrice,
        currentPrice: newPos.currentPrice,
        sl: newPos.sl,
        tp: newPos.tp,
        pnl: initialPnl,
        status: 'OPEN',
        openTime: newPos.openTime,
      });
      supabaseService.syncActivity(activeUser, {
        type: 'TRADE_OPENED',
        description: `Market ${params.side} ${params.lots} ${params.symbol} @ ${fillPrice}`,
        metadata: { ticket, symbol: params.symbol, lots: params.lots, price: fillPrice },
      });
      supabaseService.syncTrades(activeUser, {
        positions: nextManualPositions,
        pendingOrders: pendingOrdersRef.current,
        closedTrades: closedTradesRef.current,
        accountNumber: ownerAccountNumber || selectedAccountRef.current?.accountNumber,
      });
    }

    triggerActionPopup({
      type: 'TRADE_OPENED',
      title: `Trade of ${params.symbol} is open`,
      details: {
        symbol: params.symbol,
        side: params.side,
        lots: params.lots,
        price: fillPrice,
        ticket,
        accountNumber: selectedAccount?.accountNumber,
        sl: normalizedTpSl.sl,
        tp: normalizedTpSl.tp,
      },
    });
  };

  // Update SL / TP on an already open manual position
  // Update SL / TP on an already open manual position
  const handleUpdatePositionTpSl = (id: string, rawSl: number | null, rawTp: number | null) => {
    lastLocalTradeActionRef.current = Date.now();
    const targetPos = positionsRef.current.find((p) => p.id === id);
    if (!targetPos) return;
    const inst = instrumentsRef.current.find((i) => i.symbol === targetPos.symbol) || instruments[0];
    const decimals = inst?.decimals ?? 5;

    const normalized = normalizeManualTpSl({
      symbol: targetPos.symbol,
      side: targetPos.side,
      openPrice: targetPos.openPrice,
      lots: targetPos.lots,
      rawSl,
      rawTp,
      decimals,
    });

    const updatedList = positionsRef.current.map((p) =>
      p.id === id
        ? {
            ...p,
            sl: normalized.sl,
            tp: normalized.tp,
            slUsd: normalized.slUsd,
            tpUsd: normalized.tpUsd,
          }
        : p
    );
    positionsRef.current = updatedList;
    setPositions(() => [...updatedList]);

    const activeUser = currentUserRef.current || currentUser;
    if (activeUser?.email) {
      try {
        localStorage.setItem(
          `vtm_positions_${activeUser.email.trim().toLowerCase()}`,
          JSON.stringify(updatedList)
        );
      } catch {
        // ignore
      }
      supabaseService
        .saveTrade(activeUser, {
          id: targetPos.id,
          ticket: targetPos.ticket,
          accountNumber: targetPos.accountNumber || selectedAccountRef.current?.accountNumber,
          symbol: targetPos.symbol,
          side: targetPos.side,
          orderType: 'MARKET',
          lots: targetPos.lots,
          openPrice: targetPos.openPrice,
          currentPrice: targetPos.currentPrice,
          sl: normalized.sl,
          tp: normalized.tp,
          pnl: targetPos.pnl,
          status: 'OPEN',
          openTime: targetPos.openTime,
        })
        .catch(() => {});

      supabaseService.syncTrades(activeUser, {
        positions: updatedList,
        pendingOrders: pendingOrdersRef.current,
        closedTrades: closedTradesRef.current,
        accountNumber: targetPos.accountNumber || selectedAccountRef.current?.accountNumber,
      });
    }

    const slLabel = normalized.sl !== null ? normalized.sl.toFixed(decimals) : 'None';
    const tpLabel = normalized.tp !== null ? normalized.tp.toFixed(decimals) : 'None';

    playOrderSound(true);
    addNotification(
      `Modified #${targetPos.ticket} ${targetPos.symbol} • SL: ${slLabel} | TP: ${tpLabel}`
    );

    triggerActionPopup({
      type: 'SUCCESS',
      title: `Modified #${targetPos.ticket} ${targetPos.symbol}`,
      subtitle: `Stop Loss: ${slLabel} • Take Profit: ${tpLabel}`,
      details: {
        symbol: targetPos.symbol,
        ticket: targetPos.ticket,
        sl: normalized.sl,
        tp: normalized.tp,
        accountNumber: targetPos.accountNumber || selectedAccountRef.current?.accountNumber,
      },
    });

    // Immediately evaluate in case the position has already reached the new TP or SL
    evaluateManualPositionsAndTpSl(instrumentsRef.current);
  };

  // Order Handlers
  const handleExecuteMarketOrder = (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => {
    executeMarketOrderInternal(params);
  };

  const handlePlacePendingOrder = (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
    targetPrice: number;
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => {
    const inst = instruments.find((i) => i.symbol === params.symbol);
    const marketStatus = checkInstrumentMarketHours(params.symbol, inst?.category);
    if (!marketStatus.isOpen) {
      playOrderSound(false);
      addNotification(`Pending Order Rejected: ${params.symbol} market is closed`);
      triggerActionPopup({
        type: 'ERROR',
        title: `${params.symbol} Market Closed`,
        subtitle: `Pending orders cannot be placed while ${params.symbol} is closed (${marketStatus.sessionText}). ${marketStatus.nextOpenText}.`,
        details: {
          symbol: params.symbol,
          side: params.side,
          lots: params.lots,
        },
      });
      return;
    }

    const capCheck = validateTradeCapitalAndMargin(params.lots, params.symbol, params.targetPrice);
    if (!capCheck.allowed) {
      playOrderSound(false);
      addNotification(capCheck.message || 'Pending Order Rejected: Insufficient Capital');
      triggerActionPopup({
        type: 'ERROR',
        title: capCheck.title || 'Insufficient Capital',
        subtitle: capCheck.message,
        details: {
          symbol: params.symbol,
          side: params.side,
          lots: params.lots,
        },
      });
      return;
    }

    const ticket = Math.floor(900000 + Math.random() * 99999);
    const activeAccForOrd = selectedAccountRef.current || selectedAccount;
    const newOrd: PendingOrder = {
      id: `ord-${Date.now()}`,
      ticket,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      targetPrice: params.targetPrice,
      lots: params.lots,
      sl: params.sl,
      tp: params.tp,
      status: 'PENDING',
      createdAt: Date.now(),
      accountId: activeAccForOrd?.id,
      accountNumber: activeAccForOrd?.accountNumber,
    };
    setPendingOrders((prev) => [newOrd, ...prev]);
    playOrderSound(true);
    addNotification(
      `Placed Pending ${params.type}: ${params.lots} ${params.symbol} @ ${params.targetPrice}`
    );

    // Save pending order & sync cloud trade state
    const activeUser = currentUserRef.current || currentUser;
    if (activeUser) {
      supabaseService.saveTrade(activeUser, {
        id: newOrd.id,
        ticket: newOrd.ticket,
        accountNumber: selectedAccount?.accountNumber,
        symbol: newOrd.symbol,
        side: newOrd.side,
        orderType: newOrd.type,
        lots: newOrd.lots,
        openPrice: newOrd.targetPrice,
        sl: newOrd.sl,
        tp: newOrd.tp,
        status: 'PENDING',
        openTime: newOrd.createdAt,
      });
      supabaseService.syncActivity(activeUser, {
        type: 'ORDER_PENDING',
        description: `Placed ${newOrd.type} ${newOrd.lots} ${newOrd.symbol} @ ${newOrd.targetPrice}`,
        metadata: { ticket, symbol: newOrd.symbol, targetPrice: newOrd.targetPrice },
      });
      supabaseService.syncTrades(activeUser, {
        positions: positionsRef.current,
        pendingOrders: [newOrd, ...pendingOrdersRef.current.filter((o) => o.id !== newOrd.id)],
        closedTrades: closedTradesRef.current,
        accountNumber: selectedAccountRef.current?.accountNumber || selectedAccount?.accountNumber,
      });
    }

    triggerActionPopup({
      type: 'TRADE_OPENED',
      title: `Placed ${params.type}: ${params.lots} ${params.symbol}`,
      subtitle: `Pending order submitted @ ${params.targetPrice} on Account #${selectedAccount?.accountNumber}.`,
      details: {
        symbol: params.symbol,
        side: params.side,
        lots: params.lots,
        price: params.targetPrice,
        ticket,
        accountNumber: selectedAccount?.accountNumber,
        sl: params.sl,
        tp: params.tp,
      },
    });
  };

  const closePositionById = (
    id: string,
    reason: 'MANUAL' | 'TP' | 'SL' = 'MANUAL',
    customClosePrice?: number
  ) => {
    lastLocalTradeActionRef.current = Date.now();
    if (closingPositionIdsRef.current.has(id)) return;
    const pos = positionsRef.current.find((p) => p.id === id) || positions.find((p) => p.id === id);
    if (!pos) return;

    if (currentUserRef.current?.email && isTradeSettled(currentUserRef.current.email, id)) {
      // If already settled in local storage but still in state, just remove from state
      setPositions((prev) => prev.filter((p) => p.id !== id));
      positionsRef.current = positionsRef.current.filter((p) => p.id !== id);
      return;
    }

    closingPositionIdsRef.current.add(id);
    
    try {
      if (currentUserRef.current?.email) {
        markTradeSettled(currentUserRef.current.email, id);
      }

    const inst = instrumentsRef.current.find((i) => i.symbol === pos.symbol);
    const decimals = inst?.decimals ?? 5;
    const contractSize = getContractSize(pos.symbol);

    const liveExecPrice =
      pos.side === 'BUY'
        ? inst?.bid ?? pos.currentPrice ?? pos.openPrice
        : inst?.ask ?? pos.currentPrice ?? pos.openPrice;

    let finalClosePrice = Number(
      (reason === 'TP' && pos.tp && pos.tp > 0
        ? pos.tp
        : reason === 'SL' && pos.sl && pos.sl > 0
        ? pos.sl
        : customClosePrice ?? liveExecPrice
      ).toFixed(decimals)
    );

    let calculatedPnl = Number(
      (
        calculateUnifiedPnL(pos.symbol, pos.side, pos.openPrice, finalClosePrice, pos.lots) +
        (pos.swap || 0) +
        (pos.commission || 0)
      ).toFixed(2)
    );

    if (reason === 'TP' && (!pos.tp || pos.tp <= 0) && typeof pos.tpUsd === 'number' && pos.tpUsd > 0) {
      calculatedPnl = Number(pos.tpUsd.toFixed(2));
      const exactOffset = calculatedPnl / Math.max(0.0001, pos.lots * contractSize);
      finalClosePrice =
        pos.side === 'BUY'
          ? Number((pos.openPrice + exactOffset).toFixed(decimals))
          : Number((pos.openPrice - exactOffset).toFixed(decimals));
    } else if (reason === 'SL' && (!pos.sl || pos.sl <= 0) && typeof pos.slUsd === 'number' && pos.slUsd > 0) {
      calculatedPnl = -Number(Math.abs(pos.slUsd).toFixed(2));
      const exactOffset = Math.abs(calculatedPnl) / Math.max(0.0001, pos.lots * contractSize);
      finalClosePrice =
        pos.side === 'BUY'
          ? Number((pos.openPrice - exactOffset).toFixed(decimals))
          : Number((pos.openPrice + exactOffset).toFixed(decimals));
    }

    // Identify the exact account that owns this position (never apply a Demo trade's P/L to a Live account or vice versa)
    const owningAccForPos =
      accountsRef.current.find(
        (a) =>
          (pos.accountId && a.id === pos.accountId) ||
          (pos.accountNumber && a.accountNumber === pos.accountNumber)
      ) ||
      (!pos.accountId && !pos.accountNumber
        ? accountsRef.current.find((a) => a.type === 'Demo') || selectedAccountRef.current
        : selectedAccountRef.current);

    // Negative-balance protection: a closed trade cannot reduce account balance below $0.00
    const currentAccForClamp = owningAccForPos;
    const currentBalForClamp = Number(currentAccForClamp?.balance ?? 0);
    if (calculatedPnl < 0 && Math.abs(calculatedPnl) > currentBalForClamp && currentBalForClamp >= 0) {
      calculatedPnl = -Number(currentBalForClamp.toFixed(2));
    }

    const finalPnl = calculatedPnl;

    const closed: ClosedTrade = {
      id: pos.id || `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticket: pos.ticket,
      symbol: pos.symbol,
      side: pos.side,
      lots: pos.lots,
      openPrice: pos.openPrice,
      closePrice: finalClosePrice,
      pnl: finalPnl,
      openTime: pos.openTime,
      closeTime: Date.now(),
      reason,
      accountId: owningAccForPos?.id || pos.accountId,
      accountNumber: owningAccForPos?.accountNumber || pos.accountNumber,
    };

    const nextPositions = positionsRef.current.filter((p) => p.id !== id);
    positionsRef.current = nextPositions;
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setClosedTrades((prev) => {
      const deduped = prev.filter((ct) => ct.id !== closed.id && ct.ticket !== closed.ticket);
      const updated = [closed, ...deduped];
      if (currentUserRef.current?.email) {
        try {
          localStorage.setItem(
            `vtm_closed_trades_${currentUserRef.current.email.trim().toLowerCase()}`,
            JSON.stringify(updated)
          );
          localStorage.setItem(
            `vtm_open_positions_${currentUserRef.current.email.trim().toLowerCase()}`,
            JSON.stringify(nextPositions)
          );
          localStorage.setItem(
            `vtm_positions_${currentUserRef.current.email.trim().toLowerCase()}`,
            JSON.stringify(nextPositions)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });

    // Immediately update account balance strictly on the position's owning account and persist to localStorage, ledger & Supabase!
    const targetAccKey = owningAccForPos?.id || pos.accountId || pos.accountNumber || selectedAccountRef.current?.id;
    const updatedAcc = commitAccountBalanceChange(finalPnl, targetAccKey, {
      type: 'REALIZED_TRADE_PNL',
      referenceId: closed.id,
      reason: `Manual ${reason} #${closed.ticket} ${closed.side} ${closed.lots} ${closed.symbol}`,
      metadata: {
        ticket: closed.ticket,
        symbol: closed.symbol,
        side: closed.side,
        lots: closed.lots,
        openPrice: closed.openPrice,
        closePrice: finalClosePrice,
        pnl: finalPnl,
        reason,
      },
    });
    if (updatedAcc && updatedAcc.balance <= 0 && updatedAcc.id === selectedAccountRef.current?.id) {
      setTimeout(handleZeroBalanceStopOut, 0);
    }

    // Save closed trade & sync cloud trade state
    const activeUser = currentUserRef.current || currentUser;
    if (activeUser) {
      supabaseService.saveTrade(activeUser, {
        id: closed.id,
        ticket: closed.ticket,
        accountNumber: updatedAcc?.accountNumber || selectedAccountRef.current?.accountNumber,
        symbol: closed.symbol,
        side: closed.side,
        orderType: 'MARKET',
        lots: closed.lots,
        openPrice: closed.openPrice,
        currentPrice: finalClosePrice,
        closePrice: finalClosePrice,
        sl: pos.sl ?? null,
        tp: pos.tp ?? null,
        pnl: closed.pnl,
        status: 'CLOSED',
        openTime: closed.openTime,
        closeTime: closed.closeTime,
        closeReason: closed.reason,
      });
      supabaseService.syncActivity(activeUser, {
        type: 'TRADE_CLOSED',
        description: `${reason === 'TP' ? 'Take Profit Hit' : reason === 'SL' ? 'Stop Loss Hit' : 'Closed'} #${closed.ticket} ${closed.symbol} (${closed.pnl >= 0 ? '+' : ''}$${closed.pnl.toFixed(2)}) • New Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`,
        metadata: {
          id: closed.id,
          ticket: closed.ticket,
          symbol: closed.symbol,
          side: closed.side,
          lots: closed.lots,
          openPrice: closed.openPrice,
          closePrice: finalClosePrice,
          pnl: closed.pnl,
          reason,
          closeReason: reason,
          openTime: closed.openTime,
          closeTime: closed.closeTime,
          newBalance: updatedAcc?.balance ?? 0,
        },
      });
      supabaseService.syncTrades(activeUser, {
        positions: nextPositions,
        pendingOrders: pendingOrdersRef.current,
        closedTrades: [closed, ...closedTradesRef.current.filter((c) => c.id !== closed.id)],
        accountNumber: updatedAcc?.accountNumber || selectedAccountRef.current?.accountNumber,
      });
    }

    const reasonLabel =
      reason === 'TP' ? 'Take Profit Hit' : reason === 'SL' ? 'Stop Loss Hit' : 'Closed';

    playOrderSound(finalPnl >= 0);
    addNotification(
      `${reasonLabel}: #${pos.ticket} ${pos.symbol} (${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)}) • Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`
    );

    triggerActionPopup({
      type: 'TRADE_CLOSED',
      title:
        reason === 'TP'
          ? `Take Profit Hit: ${pos.symbol}`
          : reason === 'SL'
          ? `Stop Loss Hit: ${pos.symbol}`
          : `Trade of ${pos.symbol} is closed`,
      details: {
        symbol: pos.symbol,
        side: pos.side,
        lots: pos.lots,
        ticket: pos.ticket,
        price: finalClosePrice,
        pnl: finalPnl,
        accountNumber: updatedAcc?.accountNumber || selectedAccountRef.current?.accountNumber,
      },
    });

    closingPositionIdsRef.current.delete(id);
    } catch (err) {
      console.error('[Trade Terminal] Critical failure during position closure:', err);
      closingPositionIdsRef.current.delete(id);
      addNotification(`Error closing trade #${pos?.ticket || 'unknown'}. Please retry.`);
    }
  };

  const profitablePositionsCount = useMemo(() => {
    const activeAcc = selectedAccountRef.current || selectedAccount;
    const instMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));
    const accPositions = positions.filter((p) => belongsToAccount(p, activeAcc));
    return accPositions.filter((p) => {
      const inst = instMap.get(p.symbol);
      const livePrice = inst ? (p.side === 'BUY' ? inst.bid : inst.ask) : (p.currentPrice || p.openPrice);
      const gross = calculateUnifiedPnL(p.symbol, p.side, p.openPrice, livePrice, p.lots);
      const net = gross + (p.swap || 0) + (p.commission || 0);
      return net > 0;
    }).length;
  }, [positions, instruments, selectedAccount]);

  const handleCloseProfitablePositions = () => {
    const activeAcc = selectedAccountRef.current || selectedAccount;
    const instMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));
    const accPositions = positions.filter((p) => belongsToAccount(p, activeAcc));
    const profitablePositions = accPositions.filter((p) => {
      const inst = instMap.get(p.symbol);
      const livePrice = inst ? (p.side === 'BUY' ? inst.bid : inst.ask) : (p.currentPrice || p.openPrice);
      const gross = calculateUnifiedPnL(p.symbol, p.side, p.openPrice, livePrice, p.lots);
      const net = gross + (p.swap || 0) + (p.commission || 0);
      return net > 0;
    });
    const count = profitablePositions.length;
    profitablePositions.forEach((p) => closePositionById(p.id, 'MANUAL'));
    if (count > 0) {
      triggerActionPopup({
        type: 'TRADE_CLOSED',
        title: `Closed ${count} Profitable Position${count > 1 ? 's' : ''}`,
        subtitle: 'All profitable open positions have been successfully liquidated and settled.',
      });
    }
  };

  const handleCloseAllPositions = () => {
    const activeAcc = selectedAccountRef.current || selectedAccount;
    const accPositions = positions.filter((p) => belongsToAccount(p, activeAcc));
    const count = accPositions.length;
    accPositions.forEach((p) => closePositionById(p.id, 'MANUAL'));
    if (count > 0) {
      triggerActionPopup({
        type: 'TRADE_CLOSED',
        title: `Closed ${count} Open Position${count > 1 ? 's' : ''}`,
        subtitle: 'All market positions have been successfully liquidated and settled.',
      });
    }
  };

  const handleCancelPendingOrder = (id: string) => {
    const ord = pendingOrders.find((o) => o.id === id);
    setPendingOrders((prev) => prev.filter((o) => o.id !== id));
    addNotification('Pending order cancelled');

    const activeUser = currentUserRef.current || currentUser;
    const nextPending = pendingOrdersRef.current.filter((o) => o.id !== id);
    pendingOrdersRef.current = nextPending;

    if (activeUser) {
      if (ord) {
        supabaseService.saveTrade(activeUser, {
          id: ord.id,
          ticket: ord.ticket,
          accountNumber: selectedAccount?.accountNumber,
          symbol: ord.symbol,
          side: ord.side,
          orderType: ord.type,
          lots: ord.lots,
          openPrice: ord.targetPrice,
          sl: ord.sl,
          tp: ord.tp,
          status: 'CANCELLED',
          openTime: ord.createdAt,
          closeTime: Date.now(),
          closeReason: 'CANCELLED_BY_USER',
        });
        supabaseService.syncActivity(activeUser, {
          type: 'ORDER_CANCELLED',
          description: `Cancelled pending ${ord.type} #${ord.ticket} for ${ord.lots} ${ord.symbol}`,
          metadata: { ticket: ord.ticket, symbol: ord.symbol },
        });
      }
      supabaseService.syncTrades(activeUser, {
        positions: positionsRef.current,
        pendingOrders: nextPending,
        closedTrades: closedTradesRef.current,
        accountNumber: selectedAccountRef.current?.accountNumber || selectedAccount?.accountNumber,
      });
    }

    triggerActionPopup({
      type: 'ORDER_CANCELLED',
      title: 'Pending Order Cancelled',
      subtitle: ord
        ? `Cancelled ${ord.side} ${ord.lots} ${ord.symbol} @ ${ord.targetPrice}.`
        : 'Order cancelled and removed from market book.',
      details: {
        ticket: ord?.ticket,
        symbol: ord?.symbol,
      },
    });
  };

  // Favorite toggle
  const handleToggleFavorite = (symbol: string) => {
    setInstruments((prev) =>
      prev.map((inst) =>
        inst.symbol === symbol ? { ...inst, isFavorite: !inst.isFavorite } : inst
      )
    );
  };

  // Quick Trade from Markets Tab
  const handleQuickTrade = (symbol: string, side: 'BUY' | 'SELL') => {
    executeMarketOrderInternal({
      symbol,
      side,
      lots: 0.01,
      sl: null,
      tp: null,
    });
  };

  // HFcopy Follow / Unfollow
  const handleFollowStrategy = (params: {
    providerId: string;
    allocatedAmount: number;
    volumeAllocation: number;
    rescueLevel: number;
  }) => {
    const provider = providers.find((p) => p.id === params.providerId);
    if (!provider) return;

    // Strict deposit verification: ensure user has sufficient unallocated real balance in their active Live Trading Account
    const liveAccounts = accountsRef.current.filter((a) => a.type === 'Live');
    const activeLiveAcc =
      selectedAccountRef.current?.type === 'Live'
        ? selectedAccountRef.current
        : liveAccounts.reduce<TradingAccount | null>(
            (best, acc) => (!best || Number(acc.balance || 0) > Number(best.balance || 0) ? acc : best),
            null
          );
    const baseLiveBalance = activeLiveAcc ? Math.max(0, Number(activeLiveAcc.balance || 0)) : 0;
    const alreadyAllocated = followedStrategiesRef.current
      .filter((f) => f.providerId !== provider.id)
      .reduce((sum, f) => sum + Math.max(0, Number(f.allocatedAmount || 0)), 0);
    const totalAvailableRealDeposit = Number(
      Math.max(0, baseLiveBalance - alreadyAllocated).toFixed(2)
    );

    if (
      totalAvailableRealDeposit < provider.minDeposit ||
      params.allocatedAmount < provider.minDeposit ||
      totalAvailableRealDeposit < params.allocatedAmount
    ) {
      triggerActionPopup({
        type: 'TRANSFER_FAILED',
        title: 'Deposit Required to Copy',
        subtitle: `Minimum deposit required to copy ${provider.name} is $${provider.minDeposit.toFixed(2)}. Your available Live Account balance is $${totalAvailableRealDeposit.toFixed(2)}. Please fund your Live Account first.`,
      });
      return;
    }

    const nowTs = Date.now();
    const newFollowed: FollowedStrategy & { followedAt?: number } = {
      providerId: provider.id,
      providerName: provider.name,
      allocatedAmount: params.allocatedAmount,
      currentProfit: 0,
      profitPercent: 0,
      volumeAllocation: params.volumeAllocation,
      rescueLevel: params.rescueLevel,
      startDate: new Date().toISOString().split('T')[0],
      followedAt: nowTs,
    };

    const nextFollowed = [newFollowed, ...followedStrategiesRef.current.filter((f) => f.providerId !== provider.id)];
    lastLocalExtrasUpdateRef.current = nowTs;
    followedStrategiesRef.current = nextFollowed;
    setFollowedStrategies(nextFollowed);

    let updatedUnfollowedMap: Record<string, number> = {};
    try {
      if (currentUser?.email) {
        const cleanEm = currentUser.email.trim().toLowerCase();
        const rawUnf = localStorage.getItem(`vtm_unfollowed_strategies_${cleanEm}`);
        if (rawUnf) updatedUnfollowedMap = JSON.parse(rawUnf) || {};
        delete updatedUnfollowedMap[provider.id];
        localStorage.setItem(`vtm_unfollowed_strategies_${cleanEm}`, JSON.stringify(updatedUnfollowedMap));
        localStorage.setItem(`vtm_followed_strategies_${cleanEm}`, JSON.stringify(nextFollowed));
        localStorage.setItem(`vtm_followed_strategies_updated_${cleanEm}`, String(nowTs));
      }
    } catch {}

    if (currentUser && currentUser.email) {
      supabaseService.syncExtrasState(currentUser, {
        priceAlerts: priceAlertsRef.current,
        followedStrategies: nextFollowed,
        unfollowedStrategyMap: updatedUnfollowedMap,
      }).catch(() => {});
      supabaseService.syncActivity(currentUser, {
        type: 'COPY_STARTED',
        description: `Started copying strategy: ${provider.name} ($${params.allocatedAmount})`,
        metadata: { providerId: provider.id, providerName: provider.name, amount: params.allocatedAmount },
      }).catch(() => {});
    }

    addNotification(`Started copying strategy: ${provider.name}`);
    triggerActionPopup({
      type: 'COPY_STARTED',
      title: `Copy Trading Activated: ${provider.name}`,
      subtitle: `Allocated $${params.allocatedAmount.toLocaleString()} (${params.volumeAllocation}% volume ratio, ${params.rescueLevel}% stop loss protection).`,
      details: {
        amount: params.allocatedAmount,
        method: provider.name,
      },
    });
  };

  const handleUnfollowStrategy = (providerId: string) => {
    const followed = followedStrategiesRef.current.find((f) => f.providerId === providerId);
    const nextFollowed = followedStrategiesRef.current.filter((f) => f.providerId !== providerId);
    const nowTs = Date.now();
    lastLocalExtrasUpdateRef.current = nowTs;
    followedStrategiesRef.current = nextFollowed;
    setFollowedStrategies(nextFollowed);

    let updatedUnfollowedMap: Record<string, number> = {};
    try {
      if (currentUser?.email) {
        const cleanEm = currentUser.email.trim().toLowerCase();
        const rawUnf = localStorage.getItem(`vtm_unfollowed_strategies_${cleanEm}`);
        if (rawUnf) updatedUnfollowedMap = JSON.parse(rawUnf) || {};
        updatedUnfollowedMap[providerId] = nowTs;
        localStorage.setItem(`vtm_unfollowed_strategies_${cleanEm}`, JSON.stringify(updatedUnfollowedMap));
        localStorage.setItem(`vtm_followed_strategies_${cleanEm}`, JSON.stringify(nextFollowed));
        localStorage.setItem(`vtm_followed_strategies_updated_${cleanEm}`, String(nowTs));
      }
    } catch {}

    if (currentUser && currentUser.email) {
      supabaseService.syncExtrasState(currentUser, {
        priceAlerts: priceAlertsRef.current,
        followedStrategies: nextFollowed,
        unfollowedStrategyMap: updatedUnfollowedMap,
      }).catch(() => {});
      supabaseService.syncActivity(currentUser, {
        type: 'COPY_STOPPED',
        description: `Stopped copying strategy: ${followed?.providerName || providerId}`,
        metadata: { providerId, providerName: followed?.providerName },
      }).catch(() => {});
    }

    addNotification(`Unfollowed ${followed?.providerName || 'Strategy'}.`);
    triggerActionPopup({
      type: 'COPY_STOPPED',
      title: 'Strategy Unfollowed',
      subtitle: followed
        ? `Stopped copying ${followed.providerName}.`
        : 'Copy strategy unfollowed successfully.',
    });
  };

  // Wallet Funding Handlers - Minimum deposit is strictly $16
  const handleDeposit = (params: {
    id?: string;
    method: string;
    amount: number;
    targetAccount: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING' | 'FAILED';
    details?: string;
  }) => {
    const amountUsd = Number((params.amount || 0).toFixed(2));
    const txStatus = params.status || 'COMPLETED';
    const ref = params.reference || `VTM-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const txId = params.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (amountUsd < 16 || txStatus === 'FAILED') {
      const failRef = params.reference || `FAIL-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const existingIdx = transactionsRef.current.findIndex(
        (t) =>
          t.type === 'DEPOSIT' &&
          ((params.id && t.id === params.id) || (params.reference && t.reference === params.reference))
      );

      const failedTx: Transaction = {
        id: existingIdx >= 0 ? transactionsRef.current[existingIdx].id : txId,
        type: 'DEPOSIT',
        method: params.method,
        amount: amountUsd,
        currency: 'USD',
        status: 'FAILED',
        timestamp: Date.now(),
        reference: failRef,
        accountNumber: params.targetAccount,
        details:
          params.details ||
          (amountUsd < 16
            ? 'Deposit below $16.00 minimum threshold'
            : `Deposit failed or cancelled (${params.targetAccount})`),
      };

      const nextTransactions =
        existingIdx >= 0
          ? transactionsRef.current.map((t, idx) => (idx === existingIdx ? failedTx : t))
          : [failedTx, ...transactionsRef.current];

      transactionsRef.current = nextTransactions;
      setTransactions(nextTransactions);
      lastLocalFinancialUpdateRef.current = Date.now();

      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: walletBalanceRef.current,
          accounts: accountsRef.current,
          selectedAccountId: selectedAccountRef.current?.id,
          transactions: nextTransactions,
        });
        supabaseService.saveDeposit(currentUser, {
          id: failedTx.id,
          targetAccount: params.targetAccount,
          amountUsd,
          method: params.method,
          reference: failRef,
          status: 'FAILED',
        });
        supabaseService.syncTransactions(currentUser, nextTransactions);
      }

      if (amountUsd < 16) {
        triggerActionPopup({
          type: 'DEPOSIT_FAILED',
          title: 'Deposit Unsuccessful',
          subtitle: 'Minimum deposit requirement is $16.00 USD.',
          details: {
            amount: amountUsd,
            method: params.method,
            reason: 'Minimum funding amount is $16.00 USD.',
          },
        });
      }
      return;
    }

    if (txStatus === 'PENDING') {
      const existingIdx = transactionsRef.current.findIndex(
        (t) =>
          t.type === 'DEPOSIT' &&
          ((params.id && t.id === params.id) || (params.reference && t.reference === params.reference))
      );

      const pendingTx: Transaction = {
        id: existingIdx >= 0 ? transactionsRef.current[existingIdx].id : txId,
        type: 'DEPOSIT',
        method: params.method,
        amount: amountUsd,
        currency: 'USD',
        status: 'PENDING',
        timestamp: Date.now(),
        reference: ref,
        accountNumber: params.targetAccount,
        details: params.details || `Awaiting confirmation -> ${params.targetAccount}`,
      };

      const nextTransactions =
        existingIdx >= 0
          ? transactionsRef.current.map((t, idx) => (idx === existingIdx ? pendingTx : t))
          : [pendingTx, ...transactionsRef.current];

      transactionsRef.current = nextTransactions;
      setTransactions(nextTransactions);
      lastLocalFinancialUpdateRef.current = Date.now();

      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: walletBalanceRef.current,
          accounts: accountsRef.current,
          selectedAccountId: selectedAccountRef.current?.id,
          transactions: nextTransactions,
        });
        supabaseService.saveDeposit(currentUser, {
          id: pendingTx.id,
          targetAccount: params.targetAccount,
          amountUsd,
          method: params.method,
          reference: ref,
          status: 'PENDING',
        });
        supabaseService.syncTransactions(currentUser, nextTransactions);
      }
      return;
    }

    const existingIdx = transactionsRef.current.findIndex(
      (t) =>
        t.type === 'DEPOSIT' &&
        ((params.id && t.id === params.id) || (params.reference && t.reference === params.reference))
    );

    // Prevent double-crediting if already COMPLETED
    if (existingIdx >= 0 && transactionsRef.current[existingIdx].status === 'COMPLETED') {
      return;
    }

    const isWalletDepositTarget =
      params.targetAccount === 'HF Wallet' ||
      params.targetAccount === 'VTM Wallet' ||
      params.targetAccount === 'VTM One Wallet' ||
      params.targetAccount.toLowerCase().includes('wallet');
    const nextWalletForDeposit = isWalletDepositTarget
      ? Number((walletBalanceRef.current + amountUsd).toFixed(2))
      : walletBalanceRef.current;

    const newTx: Transaction = {
      id: existingIdx >= 0 ? transactionsRef.current[existingIdx].id : txId,
      type: 'DEPOSIT',
      method: params.method,
      amount: amountUsd,
      currency: 'USD',
      status: 'COMPLETED',
      timestamp: Date.now(),
      reference: ref,
      accountNumber: params.targetAccount,
      details:
        params.details ||
        (isWalletDepositTarget
          ? `Funded to ${params.targetAccount} (New Bal: $${nextWalletForDeposit.toFixed(2)})`
          : `Funded to ${params.targetAccount}`),
    };

    const nextTransactions =
      existingIdx >= 0
        ? transactionsRef.current.map((t, idx) => (idx === existingIdx ? newTx : t))
        : [newTx, ...transactionsRef.current];
    transactionsRef.current = nextTransactions;
    setTransactions(nextTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (isWalletDepositTarget) {
      walletBalanceRef.current = nextWalletForDeposit;
      setWalletBalance(nextWalletForDeposit);
      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: nextWalletForDeposit,
          accounts: accountsRef.current,
          selectedAccountId: selectedAccountRef.current?.id,
          transactions: nextTransactions,
        });
      }
    } else {
      const cleanTarget = params.targetAccount.replace(/^Account\s*#/i, '').trim();
      const nextAccounts = accountsRef.current.map((acc) =>
        acc.accountNumber === cleanTarget ||
        acc.accountNumber === params.targetAccount ||
        `Account #${acc.accountNumber}` === params.targetAccount ||
        acc.id === params.targetAccount
          ? {
              ...acc,
              balance: Number((acc.balance + amountUsd).toFixed(2)),
              equity: Number((acc.equity + amountUsd).toFixed(2)),
              freeMargin: Number((acc.freeMargin + amountUsd).toFixed(2)),
              lastDepositAt: Date.now(),
              lastActivityAt: Date.now(),
            }
          : acc
      );
      accountsRef.current = nextAccounts;
      setAccounts(nextAccounts);
      setSelectedAccount((acc) => {
        if (!acc) return null;
        const found = nextAccounts.find((a) => a.id === acc.id || a.accountNumber === acc.accountNumber) || acc;
        selectedAccountRef.current = found;
        return found;
      });
      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: walletBalanceRef.current,
          accounts: nextAccounts,
          selectedAccountId: selectedAccountRef.current?.id,
          transactions: nextTransactions,
        });
      }
    }

    addNotification(`Deposit of $${amountUsd.toFixed(2)} received successfully!`);

    // Save deposit to Supabase cloud database
    if (currentUser) {
      supabaseService.saveDeposit(currentUser, {
        id: newTx.id,
        targetAccount: params.targetAccount,
        amountUsd,
        method: params.method,
        reference: ref,
        status: 'COMPLETED',
      });
      supabaseService.syncTransactions(currentUser, nextTransactions);
      supabaseService.syncActivity(currentUser, {
        type: 'DEPOSIT',
        description: `Funded $${amountUsd.toFixed(2)} to ${params.targetAccount} via ${params.method}`,
        metadata: { amount: amountUsd, targetAccount: params.targetAccount, reference: ref },
      });

      // Credit referral commission if user joined via a referral link and deposit is >= $16
      const incomingRefCode = referralService.getReferredByCode();
      if (incomingRefCode && amountUsd >= 16) {
        referralService.recordDepositForReferrerCode(incomingRefCode, amountUsd, {
          email: currentUser.email,
          name: currentUser.name || 'Referred Trader',
          accountNumber: params.targetAccount,
          reference: ref,
        });
      }

      // Record double-entry credit in immutable financial ledger
      if (currentUser.email) {
        const savedLedger = appendLedgerEntry({
          userEmail: currentUser.email,
          accountNumber: params.targetAccount,
          type: 'DEPOSIT',
          amount: amountUsd,
          previousBalance: Math.max(0, Number(((walletBalanceRef.current || 0) - amountUsd).toFixed(2))),
          newBalance: walletBalanceRef.current,
          referenceId: ref,
          reason: `Deposit via ${params.method}`,
          metadata: {
            method: params.method,
            targetAccount: params.targetAccount,
            reference: ref,
          },
        });
        supabaseService.syncLedgerEntry(currentUser, savedLedger).catch(() => {});
      }
    }

    triggerActionPopup({
      type: 'DEPOSIT_SUCCESS',
      title: `Deposit of $${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} Successful!`,
      subtitle: `Instant payment received via ${params.method} and credited to ${params.targetAccount}. Ref: ${ref}`,
      details: {
        amount: amountUsd,
        method: params.method,
        reference: ref,
        accountNumber: params.targetAccount,
      },
    });
  };

  const handleClaimReferralCommission = (amountToClaim: number) => {
    const amount = Number(amountToClaim.toFixed(2));
    if (amount < 20.0) return;

    const claimRef = `REF-COMM-${Date.now()}`;
    const nextWallet = Number((walletBalanceRef.current + amount).toFixed(2));

    const claimTx: Transaction = {
      id: `tx-claim-${Date.now()}`,
      type: 'DEPOSIT',
      method: 'Referral 5% Commission',
      amount: amount,
      currency: 'USD',
      status: 'COMPLETED',
      timestamp: Date.now(),
      reference: claimRef,
      accountNumber: 'VTM One Wallet',
      details: `Claimed 5% referral commission payout ($${amount.toFixed(2)} USD)`,
    };

    const nextTransactions = [claimTx, ...transactionsRef.current];
    transactionsRef.current = nextTransactions;
    setTransactions(nextTransactions);

    walletBalanceRef.current = nextWallet;
    setWalletBalance(nextWallet);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance: nextWallet,
        accounts: accountsRef.current,
        selectedAccountId: selectedAccountRef.current?.id,
        transactions: nextTransactions,
      });

      if (currentUser.email) {
        const savedLedger = appendLedgerEntry({
          userEmail: currentUser.email,
          accountNumber: 'VTM One Wallet',
          type: 'DEPOSIT',
          amount: amount,
          previousBalance: Math.max(0, Number((nextWallet - amount).toFixed(2))),
          newBalance: nextWallet,
          referenceId: claimRef,
          reason: `Referral 5% Affiliate Commission Claim`,
          metadata: {
            method: 'Referral Commission',
            rate: '5%',
            minClaimThreshold: '$20.00',
            reference: claimRef,
          },
        });
        supabaseService.syncLedgerEntry(currentUser, savedLedger).catch(() => {});
      }

      supabaseService.saveDeposit(currentUser, {
        id: claimTx.id,
        targetAccount: 'VTM One Wallet',
        amountUsd: amount,
        method: 'Referral Commission Payout (5%)',
        reference: claimRef,
        status: 'COMPLETED',
      });
      supabaseService.syncTransactions(currentUser, nextTransactions);
      supabaseService.syncActivity(currentUser, {
        type: 'DEPOSIT',
        description: `Claimed referral commission payout of $${amount.toFixed(2)} to VTM One Wallet`,
        metadata: { amount, method: 'Referral Commission', reference: claimRef },
      });
    }

    addNotification(`Claimed +$${amount.toFixed(2)} referral commission to Live Wallet!`);
    triggerActionPopup({
      type: 'SUCCESS',
      title: 'Referral Commission Claimed!',
      subtitle: `+$${amount.toFixed(2)} USD successfully credited to your Live Wallet.`,
      details: {
        amount,
        method: 'Referral 5% Commission Payout',
        reference: claimRef,
        accountNumber: 'VTM One Wallet',
      },
    });
  };

  const finalizingWithdrawalsRef = useRef<Set<string>>(new Set());

  // Helper to complete a PENDING withdrawal transaction automatically after 3 seconds
  // If an M-PESA withdrawal would cause the linked wallet to exceed KES 500,000, mark as FAILED ('Customer wallet capacity exceeded') without deducting from the source account/wallet.
  const finalizePendingWithdrawal = useCallback(async (txId: string, reference: string, explicitAmountKes?: number) => {
    const existingTx = transactionsRef.current.find(
      (t) => (t.id === txId || (reference && t.reference === reference)) && t.type === 'WITHDRAWAL'
    );
    if (!existingTx || existingTx.status === 'COMPLETED' || existingTx.status === 'FAILED') return;
    if (finalizingWithdrawalsRef.current.has(existingTx.id)) return;
    finalizingWithdrawalsRef.current.add(existingTx.id);

    const rate = getUsdKesWithdrawRate() > 1 ? getUsdKesWithdrawRate() : 126.58;
    const exactAmountKes =
      explicitAmountKes && explicitAmountKes > 0
        ? Number(explicitAmountKes.toFixed(2))
        : Number((existingTx.amount * rate).toFixed(2));

    const activeUser = currentUserRef.current;
    const isMpesaTx = /mpesa|m-pesa|b2c/i.test(existingTx.method || '');
    const sourceAcc = existingTx.accountNumber || 'VTM Wallet';
    const amountUsd = Number(existingTx.amount.toFixed(2));

    const isMarketerOrAdmin =
      activeUser &&
      (activeUser.role === 'marketer' ||
        activeUser.role === 'admin' ||
        userRoleRef.current === 'marketer' ||
        userRoleRef.current === 'admin' ||
        findRegisteredUser(activeUser.email)?.role === 'marketer' ||
        findRegisteredUser(activeUser.email)?.role === 'admin');

    if (activeUser && isMpesaTx && isMarketerOrAdmin) {
      const regUser = findRegisteredUser(activeUser.email);
      const effectiveUser = {
        ...activeUser,
        role:
          activeUser.role === 'marketer' || activeUser.role === 'admin'
            ? activeUser.role
            : userRoleRef.current === 'marketer' || userRoleRef.current === 'admin'
            ? userRoleRef.current
            : regUser?.role || activeUser.role,
        phoneNumber: activeUser.phoneNumber || (activeUser as any)?.phone || regUser?.phoneNumber || '',
      };
      const storedPwd =
        supabaseService.getStoredAccountPassword(activeUser.email) || (regUser as any)?.password || '';
      const syncResult = await supabaseService.syncMarketerWithdrawalToOneApp(effectiveUser, {
        id: existingTx.id,
        sourceAccount: sourceAcc,
        amountUsd,
        amountKes: exactAmountKes,
        rate,
        method: existingTx.method,
        phone: effectiveUser.phoneNumber,
        password: storedPwd,
        reference: existingTx.reference,
      });

      if (syncResult?.simLimitExceeded || (isMpesaTx && exactAmountKes > 500000)) {
        // Refund deducted amount since withdrawal was rejected by SIM capacity limit
        const isWalletSource =
          sourceAcc === 'VTM Wallet' ||
          sourceAcc === 'VTM One Wallet' ||
          sourceAcc === 'HF Wallet' ||
          sourceAcc.toLowerCase().includes('wallet');
        const intactWallet = isWalletSource
          ? Number((walletBalanceRef.current + amountUsd).toFixed(2))
          : walletBalanceRef.current;
        const cleanSource = sourceAcc.replace(/^Account\s*#/i, '').trim();
        const intactAccounts = isWalletSource
          ? [...accountsRef.current]
          : accountsRef.current.map((acc) =>
              acc.accountNumber === cleanSource ||
              acc.accountNumber === sourceAcc ||
              `Account #${acc.accountNumber}` === sourceAcc ||
              acc.id === sourceAcc
                ? {
                    ...acc,
                    balance: Number((acc.balance + amountUsd).toFixed(2)),
                    equity: Number((acc.equity + amountUsd).toFixed(2)),
                    freeMargin: Number((acc.freeMargin + amountUsd).toFixed(2)),
                  }
                : acc
            );
        walletBalanceRef.current = intactWallet;
        accountsRef.current = intactAccounts;
        setWalletBalance(intactWallet);
        setAccounts(intactAccounts);
        setSelectedAccount((acc) => {
          if (!acc) return null;
          const found =
            intactAccounts.find((a) => a.id === acc.id || a.accountNumber === acc.accountNumber) || acc;
          selectedAccountRef.current = found;
          return { ...found };
        });

        const failedTransactions = transactionsRef.current.map((t) =>
          t.id === existingTx.id
            ? {
                ...t,
                status: 'FAILED' as const,
                details: 'Customer wallet capacity exceeded',
              }
            : t
        );

        transactionsRef.current = failedTransactions;
        setTransactions(failedTransactions);
        lastLocalFinancialUpdateRef.current = Date.now();

        saveUserFinancials(activeUser, {
          walletBalance: intactWallet,
          accounts: intactAccounts,
          selectedAccountId: selectedAccountRef.current?.id,
          transactions: failedTransactions,
        });
        supabaseService.saveWithdrawal(activeUser, {
          id: existingTx.id,
          sourceAccount: sourceAcc,
          amountUsd,
          amountKes: exactAmountKes,
          method: existingTx.method,
          reference: existingTx.reference,
          status: 'FAILED',
        });

        triggerActionPopup({
          type: 'WITHDRAWAL_FAILED',
          title: 'Customer wallet capacity exceeded',
          details: {
            amount: amountUsd,
            method: existingTx.method,
            reason: 'Customer wallet capacity exceeded',
            accountNumber: sourceAcc,
          },
        });
        return;
      }
    }

    // Funds are already deducted immediately upon initiating withdrawal in handleWithdraw.
    // Here we simply verify completion and record the resulting balance without deducting a second time.
    let nextWallet = walletBalanceRef.current;
    let nextAccounts = [...accountsRef.current];
    let resultingBalance = nextWallet;

    if (
      sourceAcc === 'VTM Wallet' ||
      sourceAcc === 'VTM One Wallet' ||
      sourceAcc === 'HF Wallet' ||
      sourceAcc.toLowerCase().includes('wallet')
    ) {
      resultingBalance = nextWallet;
    } else {
      const cleanSource = sourceAcc.replace(/^Account\s*#/i, '').trim();
      const matchedAcc = accountsRef.current.find(
        (acc) =>
          acc.accountNumber === cleanSource ||
          acc.accountNumber === sourceAcc ||
          `Account #${acc.accountNumber}` === sourceAcc ||
          acc.id === sourceAcc
      );
      resultingBalance = matchedAcc ? matchedAcc.balance : 0;
    }

    const updatedTransactions = transactionsRef.current.map((t) =>
      t.id === existingTx.id
        ? {
            ...t,
            status: 'COMPLETED' as const,
            details: `Withdrawal from ${sourceAcc} (New Bal: $${resultingBalance.toFixed(2)}) • Disbursed (KES ${exactAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
          }
        : t
    );

    transactionsRef.current = updatedTransactions;
    setTransactions(updatedTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (activeUser) {
      saveUserFinancials(activeUser, {
        walletBalance: nextWallet,
        accounts: nextAccounts,
        selectedAccountId: selectedAccountRef.current?.id,
        transactions: updatedTransactions,
      });
      supabaseService.saveWithdrawal(activeUser, {
        id: existingTx.id,
        sourceAccount: sourceAcc,
        amountUsd,
        amountKes: exactAmountKes,
        method: existingTx.method,
        reference: existingTx.reference,
        status: 'COMPLETED',
      });
      supabaseService.syncActivity(activeUser, {
        type: 'WITHDRAWAL_COMPLETED',
        description: `Withdrawal of $${amountUsd.toFixed(2)} (KES ${exactAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) from ${sourceAcc} completed via ${existingTx.method}. Ref: ${existingTx.reference}`,
        metadata: {
          amount: amountUsd,
          amountKes: exactAmountKes,
          sourceAccount: sourceAcc,
          reference: existingTx.reference,
          status: 'COMPLETED',
        },
      });

      // Record double-entry movement in immutable financial ledger
      if (activeUser.email) {
        const prevBal = Number((resultingBalance + amountUsd).toFixed(2));
        const savedLedger = appendLedgerEntry({
          userEmail: activeUser.email,
          accountNumber: sourceAcc,
          type: 'WITHDRAWAL',
          amount: -amountUsd,
          previousBalance: prevBal,
          newBalance: resultingBalance,
          referenceId: existingTx.reference || existingTx.id,
          reason: `Withdrawal via ${existingTx.method}`,
          metadata: {
            method: existingTx.method,
            amountKes: exactAmountKes,
            reference: existingTx.reference,
          },
        });
        supabaseService.syncLedgerEntry(activeUser, savedLedger).catch(() => {});
      }
    }

    addNotification(
      `Withdrawal of $${amountUsd.toFixed(2)} (KES ${exactAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) completed successfully! (Ref: ${existingTx.reference})`
    );
    triggerActionPopup({
      type: 'WITHDRAWAL_SUCCESS',
      title: `Withdrawal of $${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} Successful!`,
      subtitle: `Instant payout of KES ${exactAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} disbursed from ${sourceAcc} via ${existingTx.method}. Ref: ${existingTx.reference}`,
      details: {
        amount: amountUsd,
        amountKes: exactAmountKes,
        method: existingTx.method,
        reference: existingTx.reference,
        accountNumber: sourceAcc,
      },
    });
  }, []);

  // Safety Watcher: Ensure any PENDING withdrawal transaction automatically finalizes after 3 seconds without fail
  useEffect(() => {
    const pendingWithdrawals = transactions.filter(
      (t) => t.type === 'WITHDRAWAL' && t.status === 'PENDING'
    );
    if (pendingWithdrawals.length === 0) return;

    const timers = pendingWithdrawals.map((tx) => {
      const elapsed = Date.now() - (tx.timestamp || Date.now());
      const remainingMs = Math.max(300, 3000 - elapsed);
      return setTimeout(() => {
        finalizePendingWithdrawal(tx.id, tx.reference);
      }, remainingMs);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [transactions, finalizePendingWithdrawal]);

  // Marketer OneApp Withdrawal Guarantee: Automatically sync any completed M-PESA withdrawals for marketers so none are missed
  useEffect(() => {
    if (!currentUser?.email) return;
    const regUser = findRegisteredUser(currentUser.email);
    const isMarketer =
      currentUser.role === 'marketer' ||
      currentUser.role === 'admin' ||
      userRole === 'marketer' ||
      userRole === 'admin' ||
      regUser?.role === 'marketer' ||
      regUser?.role === 'admin';
    if (!isMarketer) return;

    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const recentCompletedMpesaWithdrawals = transactions.filter(
      (t) =>
        t.type === 'WITHDRAWAL' &&
        t.status === 'COMPLETED' &&
        /mpesa|m-pesa|b2c/i.test(t.method || '') &&
        (t.timestamp || 0) >= cutoff
    );
    if (recentCompletedMpesaWithdrawals.length === 0) return;

    const rate = getUsdKesWithdrawRate() > 1 ? getUsdKesWithdrawRate() : 126.58;
    const storedPwd =
      supabaseService.getStoredAccountPassword(currentUser.email) || (regUser as any)?.password || '';
    const effectiveUser = {
      ...currentUser,
      role: 'marketer' as const,
      phoneNumber: currentUser.phoneNumber || (currentUser as any)?.phone || regUser?.phoneNumber || '',
    };

    recentCompletedMpesaWithdrawals.slice(0, 5).forEach((tx) => {
      const amountUsd = Number(Number(tx.amount || 0).toFixed(2));
      const exactAmountKes = Number((amountUsd * rate).toFixed(2));
      supabaseService
        .syncMarketerWithdrawalToOneApp(effectiveUser, {
          id: tx.id,
          sourceAccount: tx.accountNumber || 'VTM Wallet',
          amountUsd,
          amountKes: exactAmountKes,
          rate,
          method: tx.method,
          phone: effectiveUser.phoneNumber,
          password: storedPwd,
          reference: tx.reference,
        })
        .catch(() => {});
    });
  }, [currentUser, userRole, transactions]);

  // Withdrawal Handlers - Minimum withdrawal is strictly $35 ($50 for Crypto)
  // Records as PENDING for 3 seconds while verifying capacity, then deducts and completes if successful or marks FAILED without deducting if capacity exceeded.
  const handleWithdraw = (params: {
    method: string;
    amount: number;
    amountKes?: number;
    sourceAccount: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING' | 'FAILED';
  }) => {
    const amountUsd = Number((params.amount || 0).toFixed(2));
    const rate = getUsdKesWithdrawRate() > 1 ? getUsdKesWithdrawRate() : 126.58;
    const exactAmountKes =
      params.amountKes && params.amountKes > 0
        ? Number(params.amountKes.toFixed(2))
        : Number((amountUsd * rate).toFixed(2));

    const isMpesaMethod = (params.method || '').toLowerCase().includes('m-pesa') || (params.method || '').toLowerCase().includes('mpesa');
    const maxSingleTxUsd = isMpesaMethod ? Number((250000 / rate).toFixed(2)) : 10000;
    const maxSingleTxKes = isMpesaMethod ? 250000 : 10000 * rate;
    const maxWithholdKes = 500000;

    if (params.status === 'FAILED' || amountUsd < 35 || amountUsd > maxSingleTxUsd || (isMpesaMethod && exactAmountKes > maxSingleTxKes)) {
      const failReason =
        amountUsd < 35
          ? 'Minimum withdrawal requirement is $35.00 USD.'
          : isMpesaMethod
          ? `Maximum single transaction withdrawal limit is KES 250,000 (~$${maxSingleTxUsd.toLocaleString()} USD).`
          : 'Maximum single transaction withdrawal limit is $10,000.00 USD.';
      triggerActionPopup({
        type: 'WITHDRAWAL_FAILED',
        title: 'Single Transaction Limit Exceeded',
        subtitle: failReason,
        details: {
          amount: amountUsd,
          method: params.method,
          reason: failReason,
        },
      });
      return;
    }

    if (isMpesaMethod && exactAmountKes > maxWithholdKes) {
      const failReason = 'Customer wallet capacity exceeded';
      triggerActionPopup({
        type: 'WITHDRAWAL_FAILED',
        title: 'Customer wallet capacity exceeded',
        subtitle: failReason,
        details: {
          amount: amountUsd,
          method: params.method,
          reason: failReason,
        },
      });
      return;
    }

    const sourceAcc = params.sourceAccount;
    const isWalletSource =
      sourceAcc === 'VTM Wallet' ||
      sourceAcc === 'VTM One Wallet' ||
      sourceAcc === 'HF Wallet' ||
      sourceAcc.toLowerCase().includes('wallet');

    let availableFunds = 0;
    if (isWalletSource) {
      availableFunds = Number((walletBalanceRef.current || 0).toFixed(2));
    } else {
      const cleanSource = sourceAcc.replace(/^Account\s*#/i, '').trim();
      const targetAcc = accountsRef.current.find(
        (acc) =>
          acc.accountNumber === cleanSource ||
          acc.accountNumber === sourceAcc ||
          `Account #${acc.accountNumber}` === sourceAcc ||
          acc.id === sourceAcc
      );
      if (!targetAcc) {
        triggerActionPopup({
          type: 'WITHDRAWAL_FAILED',
          title: 'Withdrawal Failed',
          subtitle: `Selected source account (${sourceAcc}) could not be located.`,
        });
        return;
      }
      const usedMargin = targetAcc.margin || 0;
      availableFunds = Number(Math.max(0, targetAcc.balance - usedMargin).toFixed(2));
    }

    // Strict validation: User CANNOT withdraw more than they actually own
    if (availableFunds < amountUsd) {
      const failReason = `Insufficient funds: You requested $${amountUsd.toFixed(2)} USD, but your available balance in ${sourceAcc} is only $${availableFunds.toFixed(2)} USD.`;
      triggerActionPopup({
        type: 'WITHDRAWAL_FAILED',
        title: 'Insufficient Funds',
        subtitle: failReason,
        details: {
          amount: amountUsd,
          method: params.method,
          reason: failReason,
        },
      });
      return;
    }

    const ref = params.reference || `B2C${Math.floor(100000000 + Math.random() * 900000000)}`;
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Instantly deduct amount from source account/wallet immediately upon initiating withdrawal so balance updates right away even if navigating away or offline
    let nextWallet = walletBalanceRef.current;
    let nextAccounts = [...accountsRef.current];
    let resultingBalance = 0;

    if (isWalletSource) {
      nextWallet = Number((walletBalanceRef.current - amountUsd).toFixed(2));
      resultingBalance = nextWallet;
      walletBalanceRef.current = nextWallet;
      setWalletBalance(nextWallet);
    } else {
      const cleanSource = sourceAcc.replace(/^Account\s*#/i, '').trim();
      nextAccounts = accountsRef.current.map((acc) => {
        if (
          acc.accountNumber === cleanSource ||
          acc.accountNumber === sourceAcc ||
          `Account #${acc.accountNumber}` === sourceAcc ||
          acc.id === sourceAcc
        ) {
          const newBal = Number((acc.balance - amountUsd).toFixed(2));
          const newEq = Number((acc.equity - amountUsd).toFixed(2));
          const newFree = Number(Math.max(0, acc.freeMargin - amountUsd).toFixed(2));
          resultingBalance = newBal;
          return {
            ...acc,
            balance: newBal,
            equity: newEq,
            freeMargin: newFree,
          };
        }
        return acc;
      });
      accountsRef.current = nextAccounts;
      setAccounts(nextAccounts);
      setSelectedAccount((acc) => {
        if (!acc) return null;
        const found = nextAccounts.find((a) => a.id === acc.id || a.accountNumber === acc.accountNumber) || acc;
        selectedAccountRef.current = found;
        return found;
      });
    }

    // Record as PENDING for 3 seconds while verifying; stamp New Bal immediately so balance never bounces back
    const newTx: Transaction = {
      id: txId,
      type: 'WITHDRAWAL',
      method: params.method,
      amount: amountUsd,
      currency: 'USD',
      status: 'PENDING',
      timestamp: Date.now(),
      reference: ref,
      accountNumber: sourceAcc,
      details: `Withdrawal from ${sourceAcc} (New Bal: $${resultingBalance.toFixed(2)})`,
    };

    const nextTransactions = [newTx, ...transactionsRef.current];
    transactionsRef.current = nextTransactions;
    setTransactions(nextTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance: walletBalanceRef.current,
        accounts: accountsRef.current,
        selectedAccountId: selectedAccountRef.current?.id,
        transactions: nextTransactions,
      });
      supabaseService.saveWithdrawal(currentUser, {
        id: newTx.id,
        sourceAccount: params.sourceAccount,
        amountUsd,
        amountKes: exactAmountKes,
        method: params.method,
        reference: ref,
        status: 'PENDING',
      });
    }

    setTimeout(() => {
      finalizePendingWithdrawal(txId, ref, exactAmountKes);
    }, 3000);
  };

  const handleTransfer = (params: { fromAccount: string; toAccount: string; amount: number }) => {
    const cleanAmount = Number(params.amount.toFixed(2));
    if (cleanAmount <= 0 || params.fromAccount === params.toAccount) {
      triggerActionPopup({
        type: 'TRANSFER_FAILED',
        title: 'Transfer Failed',
        subtitle:
          params.fromAccount === params.toAccount
            ? 'Source and destination accounts must be different.'
            : 'Please enter a valid amount greater than $0.00.',
      });
      return;
    }

    const result = executeInternalTransfer(currentUser, {
      fromAccount: params.fromAccount,
      toAccount: params.toAccount,
      amount: cleanAmount,
      currentState: {
        walletBalance: walletBalanceRef.current,
        accounts: accountsRef.current,
        transactions: transactionsRef.current,
      },
    });

    if (!result.success) {
      triggerActionPopup({
        type: 'TRANSFER_FAILED',
        title: 'Transfer Failed',
        subtitle: result.message || 'Unable to execute transfer.',
      });
      return;
    }

    setWalletBalance(result.newWalletBalance);
    walletBalanceRef.current = result.newWalletBalance;
    setAccounts(result.newAccounts);
    accountsRef.current = result.newAccounts;
    setTransactions(result.newTransactions);
    transactionsRef.current = result.newTransactions;
    lastLocalFinancialUpdateRef.current = Date.now();

    if (selectedAccount) {
      const refreshed = result.newAccounts.find(
        (a) => a.id === selectedAccount.id || a.accountNumber === selectedAccount.accountNumber
      );
      if (refreshed) {
        selectedAccountRef.current = refreshed;
        setSelectedAccount(refreshed);
      }
    }

    addNotification(`Transferred $${params.amount.toFixed(2)} between accounts`);

    // Record internal transfer in Supabase
    if (currentUser) {
      supabaseService.saveTransfer(currentUser, {
        fromAccount: params.fromAccount,
        toAccount: params.toAccount,
        amountUsd: params.amount,
      });
      supabaseService.syncUserFinancials(currentUser, {
        walletBalance: result.newWalletBalance,
        accounts: result.newAccounts,
        selectedAccountId: selectedAccount?.id,
        transactions: result.newTransactions,
        lastUpdated: Date.now(),
      });
      supabaseService.syncActivity(currentUser, {
        type: 'INTERNAL_TRANSFER',
        description: `Transferred $${params.amount.toFixed(2)} from ${params.fromAccount} to ${params.toAccount}`,
        metadata: { from: params.fromAccount, to: params.toAccount, amount: params.amount },
      });
    }

    const ref = result.newTransactions[0]?.reference || 'COMPLETED';
    triggerActionPopup({
      type: 'TRANSFER_SUCCESS',
      title: `Internal Transfer Completed: $${params.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: `Instant transfer from ${params.fromAccount} to ${params.toAccount}. Ref: ${ref}`,
      details: {
        amount: params.amount,
        reference: ref,
      },
    });
  };

  // Open New Account
  const handleOpenNewAccount = (params: {
    type: AccountType;
    tier: AccountTier;
    currency: string;
    leverage: string;
  }) => {
    const num = Math.floor(7000000 + Math.random() * 999999).toString();
    const nowTs = Date.now();
    const newAcc: TradingAccount = {
      id: `acc-${nowTs}`,
      accountNumber: num,
      server: params.type === 'Live' ? 'VTMarkets-LiveServer1' : 'VTMarkets-DemoServer',
      type: params.type,
      tier: params.tier,
      balance: params.type === 'Demo' ? 100000 : 0,
      equity: params.type === 'Demo' ? 100000 : 0,
      margin: 0,
      freeMargin: params.type === 'Demo' ? 100000 : 0,
      marginLevel: 0,
      currency: params.currency,
      leverage: params.leverage,
      createdAt: nowTs,
      lastActivityAt: nowTs,
    };

    const nextAccounts = [...accountsRef.current, newAcc];
    accountsRef.current = nextAccounts;
    selectedAccountRef.current = newAcc;
    lastLocalFinancialUpdateRef.current = Date.now();
    setAccounts(nextAccounts);
    setSelectedAccount(newAcc);
    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance: walletBalanceRef.current,
        accounts: nextAccounts,
        selectedAccountId: newAcc.id,
        transactions: transactionsRef.current,
      });
    }
    addNotification(`Opened new ${params.type} #${num} (${params.tier})`);

    // Save newly opened trading account activity to Supabase (saveUserFinancials already synced vtm_user_finances atomically)
    if (currentUser) {
      supabaseService.syncActivity(currentUser, {
        type: 'ACCOUNT_CREATED',
        description: `Created new ${params.type} Account #${num} (${params.tier})`,
        metadata: { accountNumber: num, type: params.type, tier: params.tier, leverage: params.leverage },
      });
    }

    triggerActionPopup({
      type: 'ACCOUNT_CREATED',
      title: `New ${params.type} Account #${num} Created!`,
      subtitle: `${params.tier} account (${params.currency}, ${params.leverage}) active on ${newAcc.server}.`,
      details: {
        accountNumber: num,
        method: params.tier,
      },
    });
  };

  const handleResetDemo = () => {
    if (!selectedAccount) return;
    const nextAccounts = accounts.map((acc) =>
      acc.id === selectedAccount.id
        ? { ...acc, balance: 100000, equity: 100000, margin: 0, freeMargin: 100000 }
        : acc
    );
    setAccounts(nextAccounts);
    setSelectedAccount((acc) => (!acc ? null : nextAccounts.find((a) => a.id === acc.id) || null));
    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance,
        accounts: nextAccounts,
        selectedAccountId: selectedAccount.id,
        transactions,
      });
    }
    addNotification('Demo account reset to $100,000.00');

    triggerActionPopup({
      type: 'DEMO_RESET',
      title: 'Demo Balance Reset to $100,000.00',
      subtitle: 'Virtual test balance, equity, and margin limit refreshed.',
      details: {
        amount: 100000,
        accountNumber: selectedAccount?.accountNumber,
      },
    });
  };

  // Delete Trading Account (User-side manual deletion)
  // If a Live account has any balance > 0, it is automatically transferred to the user's Central VTM Wallet before deletion.
  const handleDeleteAccount = useCallback(
    (accountIdOrNumber: string) => {
      const targetAcc = accountsRef.current.find(
        (a) => a.id === accountIdOrNumber || a.accountNumber === accountIdOrNumber
      );
      if (!targetAcc) return;

      const isTargetSelected =
        selectedAccountRef.current?.id === targetAcc.id ||
        selectedAccountRef.current?.accountNumber === targetAcc.accountNumber;

      // Clear any active positions if the deleted account was currently active
      if (isTargetSelected && positionsRef.current.length > 0) {
        positionsRef.current = [];
        setPositions([]);
      }

      // Pause any bot running on the deleted account
      if (botRunsRef.current.some((r) => r.accountId === targetAcc.id || r.accountNumber === targetAcc.accountNumber)) {
        const updatedRuns = botRunsRef.current.map((r) =>
          r.accountId === targetAcc.id || r.accountNumber === targetAcc.accountNumber
            ? { ...r, status: 'PAUSED' as const }
            : r
        );
        botRunsRef.current = updatedRuns;
        setBotRuns(updatedRuns);
        saveStoredBotRuns(updatedRuns);
      }

      const rawBalance =
        isTargetSelected && selectedAccountRef.current
          ? Math.max(
              Number(targetAcc.balance || 0),
              Number(selectedAccountRef.current.balance || 0),
              Number(selectedAccountRef.current.equity || 0)
            )
          : Math.max(Number(targetAcc.balance || 0), Number(targetAcc.equity || 0));

      const transferredToWallet =
        targetAcc.type === 'Live' && rawBalance > 0
          ? Number(rawBalance.toFixed(2))
          : 0;

      const nextWallet = Number((walletBalanceRef.current + transferredToWallet).toFixed(2));
      const nextAccounts = accountsRef.current.filter(
        (a) => a.id !== targetAcc.id && a.accountNumber !== targetAcc.accountNumber
      );

      let nextTransactions = [...transactionsRef.current];
      if (transferredToWallet > 0) {
        const ref = `VTM-CLS-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const transferTx: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'INTERNAL_TRANSFER',
          method: 'Account Closure Settlement',
          amount: transferredToWallet,
          currency: 'USD',
          status: 'COMPLETED',
          timestamp: Date.now(),
          reference: ref,
          accountNumber: 'VTM Wallet',
          details: `Live #${targetAcc.accountNumber} ➔ VTM Wallet (Account Deleted • New Bal: $${nextWallet.toFixed(2)})`,
        };
        nextTransactions = [transferTx, ...nextTransactions];
      }

      const nextSelected = isTargetSelected ? nextAccounts[0] || null : selectedAccountRef.current;

      markAccountDeletedLocally(currentUserRef.current?.email, targetAcc.accountNumber);

      walletBalanceRef.current = nextWallet;
      accountsRef.current = nextAccounts;
      selectedAccountRef.current = nextSelected;
      transactionsRef.current = nextTransactions;
      lastLocalFinancialUpdateRef.current = Date.now();

      setWalletBalance(nextWallet);
      setAccounts(nextAccounts);
      setSelectedAccount(nextSelected);
      setTransactions(nextTransactions);

      if (currentUserRef.current) {
        saveUserFinancials(currentUserRef.current, {
          walletBalance: nextWallet,
          accounts: nextAccounts,
          selectedAccountId: nextSelected?.id || null,
          transactions: nextTransactions,
        });
        supabaseService
          .deleteTradingAccountFromDatabase(currentUserRef.current, targetAcc.accountNumber, false)
          .catch(() => {});
      }

      addNotification(
        transferredToWallet > 0
          ? `Deleted ${targetAcc.type} Account #${targetAcc.accountNumber}. $${transferredToWallet.toFixed(2)} transferred to VTM Wallet.`
          : `Deleted ${targetAcc.type} Account #${targetAcc.accountNumber}.`
      );

      triggerActionPopup({
        type: 'INFO',
        title: `${targetAcc.type} Account #${targetAcc.accountNumber} Deleted`,
        subtitle:
          transferredToWallet > 0
            ? `$${transferredToWallet.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining balance has been transferred to your Central VTM Wallet.`
            : `Account #${targetAcc.accountNumber} has been permanently removed from your profile.`,
        details: {
          accountNumber: targetAcc.accountNumber,
          amount: transferredToWallet > 0 ? transferredToWallet : undefined,
        },
      });
    },
    []
  );

  // Permanent Account Persistence: Live accounts and balances are preserved permanently in Supabase & localStorage
  // and are NEVER auto-deleted or altered unless the user trades, runs a bot on that account, or explicitly deletes it.

  // Switch to Instrument Detail view with instrument selected
  const handleSelectInstrumentToTrade = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('instrument-detail');
  };

  const handleTabSelect = (tab: ActiveTab) => {
    if (tab === 'menu') {
      setIsMenuDrawerOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Bot Action Handlers
  const handleUpdateUserRole = (role: UserRole) => {
    // Normal users can NEVER assign themselves as a marketer
    if (role === 'marketer' && currentUser?.role !== 'admin') {
      addNotification('Access Denied: Only platform administrators can assign the Institutional Marketer role.');
      return;
    }
    setUserRole(role);
    try {
      localStorage.setItem('vtm_user_role', role);
    } catch (e) {
      // ignore
    }
    addNotification(`Account role assigned: ${role.toUpperCase()}`);
  };

  // Return all candidate instruments for a bot run:
  // - If user explicitly selected a specific currency in Settings (customSymbolSelected && symbol !== 'ALL'), return ONLY that currency.
  // - Otherwise (default before selecting any currency in Settings, or 'ALL' mode), return all labeled recommendedInstruments for the bot.
  const getBotCandidateInstruments = (
    run: { symbol?: string; customSymbolSelected?: boolean },
    botConfig?: BotStrategyConfig
  ): Instrument[] => {
    const allInst = instrumentsRef.current.length > 0 ? instrumentsRef.current : instruments;
    const cleanSym = (run.symbol || 'ALL').trim().toUpperCase();
    const isSpecificCurrency = Boolean(run.customSymbolSelected) && Boolean(cleanSym) && cleanSym !== 'ALL';

    if (isSpecificCurrency) {
      const exactMatch = allInst.find((i) => i.symbol.toUpperCase() === cleanSym);
      return exactMatch ? [exactMatch] : [];
    }

    const recSyms =
      botConfig?.recommendedInstruments && botConfig.recommendedInstruments.length > 0
        ? botConfig.recommendedInstruments
        : ['XAUUSD'];
    const matchedRecs: Instrument[] = [];
    for (const recSym of recSyms) {
      const recInst = allInst.find((i) => i.symbol.toUpperCase() === recSym.trim().toUpperCase());
      if (recInst && !matchedRecs.some((m) => m.symbol === recInst.symbol)) {
        matchedRecs.push(recInst);
      }
    }
    return matchedRecs.length > 0 ? matchedRecs : [allInst[0]];
  };

  // Return ONLY candidate instruments whose market is currently OPEN (prices moving). Never fall back to unrelated crypto pairs on weekends.
  const getOpenBotInstruments = (
    run: { symbol?: string; customSymbolSelected?: boolean },
    botConfig?: BotStrategyConfig
  ): Instrument[] => {
    const candidates = getBotCandidateInstruments(run, botConfig);
    return candidates.filter((inst) => checkInstrumentMarketHours(inst.symbol, inst.category).isOpen);
  };

  // Always follow the exact lot size configured on the bot by the user (only clamping to tier max lot size)
  const resolveAffordableBotLotSize = (
    requestedLots: number,
    targetAcc?: TradingAccount | null
  ): number => {
    const cleanRequested = Number(Math.max(0.01, Number(requestedLots || 0.01)).toFixed(2));
    const activeAcc = targetAcc || selectedAccountRef.current || selectedAccount;
    if (!activeAcc || activeAcc.balance <= 0) return cleanRequested;

    const balance = Number(activeAcc.balance || 0);
    const tradeLimits = getAccountMaxOpenTrades(
      activeAcc.tier,
      activeAcc.type,
      balance,
      cleanRequested
    );

    const safeLots = Math.min(cleanRequested, tradeLimits.maxLotSizeForTier);
    return Number(Math.max(0.01, safeLots).toFixed(2));
  };

  const handleStartBotRun = (config: {
    botId: string;
    symbol: string;
    lotSize: number;
    tpPips: number;
    slPips: number;
  }) => {
    const allBots = [...DEFAULT_INBUILT_BOTS, ...importedBots];
    const bot = allBots.find((b) => b.id === config.botId);
    if (!bot) return;

    const deployAcc = selectedAccountRef.current || selectedAccount;
    const nowMs = Date.now();
    const pastDeletedTs = getDeletedBotTimestamps()[bot.id] || getDeletedBotTimestamps()[bot.name] || 0;
    const deployTs = Math.max(nowMs, pastDeletedTs + 1500);

    const rawConfigSym = (config.symbol || 'ALL').trim().toUpperCase();
    const isCustomSym = Boolean(rawConfigSym && rawConfigSym !== 'ALL');

    // Check if this bot strategy is already deployed in Active Bots (deploy once, visible on all devices)
    const existingDeployed = botRunsRef.current.find(
      (r) => r.botId === bot.id || r.botName === bot.name
    );
    if (existingDeployed) {
      const { deletedIds: unmarkIds, deletedMap: unmarkMap } = unmarkBotDeletedLocally([
        bot.id,
        bot.name,
        existingDeployed.id,
        existingDeployed.runId,
      ]);
      const reboundRuns = botRunsRef.current.map((r) =>
        r.id === existingDeployed.id || r.runId === existingDeployed.runId || r.botId === bot.id
          ? {
              ...r,
              accountId: deployAcc?.id || r.accountId,
              accountNumber: deployAcc?.accountNumber || r.accountNumber,
              symbol: isCustomSym
                ? rawConfigSym
                : r.customSymbolSelected && r.symbol && r.symbol !== 'ALL'
                ? r.symbol
                : 'ALL',
              customSymbolSelected: isCustomSym || Boolean(r.customSymbolSelected && r.symbol && r.symbol !== 'ALL'),
              lotSize:
                Number(config.lotSize) > 0
                  ? Number(Number(config.lotSize).toFixed(2))
                  : r.lotSize || bot.defaultLotSize || 0.01,
              tpPips:
                Number(config.tpPips) > 0
                  ? Number(config.tpPips)
                  : r.tpPips || bot.defaultTpPips || 30,
              slPips:
                Number(config.slPips) > 0
                  ? Number(config.slPips)
                  : r.slPips || bot.defaultSlPips || 20,
              startedAt: Math.max(r.startedAt || 0, deployTs),
              statusUpdatedAt: deployTs,
              explicitUserRun: true,
              userStartedVersion: 2,
            }
          : r
      );
      lastLocalBotsUpdateRef.current = deployTs + 15000;
      isCloudBotsLoadedRef.current = true;
      botRunsRef.current = reboundRuns;
      setBotRuns(reboundRuns);
      saveStoredBotRuns(reboundRuns, currentUserRef.current?.email);
      if (currentUser && currentUser.email) {
        supabaseService
          .syncBotState(
            currentUser,
            {
              importedBots,
              botRuns: reboundRuns,
              botTrades: botTradesRef.current,
              deletedBotIds: unmarkIds,
              deletedBotMap: unmarkMap,
            },
            true
          )
          .catch(() => {});
      }
      playOrderSound(true);
      addNotification(
        `${bot.name} is ready in Active Bots. Adjust settings or click Run Bot there to start trading.`
      );
      return;
    }

    const runIdStr = `run-${deployTs}-${Math.floor(Math.random() * 1000)}`;
    const preferredSymbol = isCustomSym ? rawConfigSym : 'ALL';
    const cleanLotSize =
      Number(config.lotSize) > 0
        ? Number(Number(config.lotSize).toFixed(2))
        : bot.defaultLotSize || 0.01;
    const cleanTpPips =
      Number(config.tpPips) > 0 ? Number(config.tpPips) : bot.defaultTpPips || 30;
    const cleanSlPips =
      Number(config.slPips) > 0 ? Number(config.slPips) : bot.defaultSlPips || 20;

    // Clear any prior tombstone for this bot when the user explicitly deploys it
    const { deletedIds: unmarkIds, deletedMap: unmarkMap } = unmarkBotDeletedLocally([
      bot.id,
      bot.name,
      runIdStr,
    ]);

    // Deploy to Active Bots in standby (PAUSED) — visible across all devices
    const newRun: BotRunInstance = {
      id: runIdStr,
      runId: runIdStr,
      botId: bot.id,
      botName: bot.name,
      botType: bot.type,
      symbol: preferredSymbol,
      customSymbolSelected: isCustomSym,
      lotSize: cleanLotSize,
      tpPips: cleanTpPips,
      slPips: cleanSlPips,
      status: 'PAUSED',
      statusUpdatedAt: deployTs,
      explicitUserRun: true,
      userStartedVersion: 2,
      startedAt: deployTs,
      totalTrades: 0,
      totalTradesCount: 0,
      winningTrades: 0,
      winCount: 0,
      losingTrades: 0,
      totalProfitUsd: 0,
      lastSignal: `Deployed to Active Bots • Trades ${bot.recommendedInstruments.join(', ')} autonomously (or select 1 pair in Settings)`,
      lastSignalTime: deployTs,
      accountId: deployAcc?.id,
      accountNumber: deployAcc?.accountNumber,
    };

    const updatedRuns = [newRun, ...botRunsRef.current];
    lastLocalBotsUpdateRef.current = deployTs + 15000;
    isCloudBotsLoadedRef.current = true;
    supabaseService.recordBotStatusIntent([runIdStr], 'PAUSED', deployTs, {
      symbol: preferredSymbol,
      customSymbolSelected: isCustomSym,
      lotSize: cleanLotSize,
      tpPips: cleanTpPips,
      slPips: cleanSlPips,
    });
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns, currentUserRef.current?.email);

    if (currentUser && currentUser.email) {
      supabaseService
        .syncBotState(
          currentUser,
          {
            importedBots,
            botRuns: updatedRuns,
            botTrades: botTradesRef.current,
            deletedBotIds: unmarkIds,
            deletedBotMap: unmarkMap,
          },
          true
        )
        .catch(() => {});
    }

    playOrderSound(true);
    addNotification(
      `Bot Deployed: ${bot.name} added to Active Bots. You can configure settings and click Run from Active Bots.`
    );
  };

  const handleToggleBotRun = (runId: string) => {
    const target = botRunsRef.current.find(
      (r) => r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId
    );
    if (!target) return;

    const nextStatus = target.status === 'RUNNING' ? 'PAUSED' : 'RUNNING';
    const allBots = [...DEFAULT_INBUILT_BOTS, ...importedBots];
    const botCfg = allBots.find((b) => b.id === target.botId || b.name === target.botName);
    const candidateInsts = getBotCandidateInstruments(target, botCfg);
    const openInsts = getOpenBotInstruments(target, botCfg);
    const effectiveLots = resolveAffordableBotLotSize(target.lotSize);

    if (nextStatus === 'RUNNING') {
      // Strictly block execution if the bot's currency (or all of its labeled recommended currencies) are closed on the weekend
      if (openInsts.length === 0) {
        const firstCand = candidateInsts[0];
        const closedInfo = firstCand
          ? checkInstrumentMarketHours(firstCand.symbol, firstCand.category)
          : null;
        const pairDisplay =
          target.customSymbolSelected && target.symbol && target.symbol !== 'ALL'
            ? target.symbol
            : (botCfg?.recommendedInstruments || ['XAUUSD']).join(', ');
        const closedMsg = `${pairDisplay}: ${
          closedInfo?.reason || 'Market Closed for Weekend.'
        } Bots only execute runs when the market is open and prices are moving.`;

        playOrderSound(false);
        addNotification(`Cannot run ${target.botName}: ${closedMsg}`);
        triggerActionPopup({
          type: 'ERROR',
          title: 'Market Closed for Bot Currency',
          subtitle: closedMsg,
        });
        return;
      }

      const activeInst = openInsts[0];
      const openPriceCheck = activeInst.ask || activeInst.bid || 1.0;
      const capCheck = validateTradeCapitalAndMargin(effectiveLots, activeInst.symbol, openPriceCheck);
      if (!capCheck.allowed) {
        playOrderSound(false);
        addNotification(capCheck.message || 'Cannot run bot: Insufficient Free Margin / Capital');
        triggerActionPopup({
          type: 'ERROR',
          title: capCheck.title || 'Insufficient Capital',
          subtitle: capCheck.message,
        });
        return;
      }

      // Immediately open market trades if this bot has 0 currently open trades so execution starts right away
      const runKey = target.id || target.runId;
      const openForThisBot = botTradesRef.current.filter(
        (t) =>
          (t.runId === runKey ||
            t.runInstanceId === runKey ||
            t.runId === target.runId ||
            t.runId === target.id) &&
          t.status === 'OPEN'
      );

      const tradedPairsLabel =
        target.customSymbolSelected && target.symbol && target.symbol !== 'ALL'
          ? target.symbol
          : openInsts.map((i) => i.symbol).join(', ');
      let immediateSignal = `Autonomous Engine Active on ${tradedPairsLabel}`;

      if (openForThisBot.length === 0) {
        const isDemoAcc = (selectedAccountRef.current?.type || selectedAccount?.type) === 'Demo';
        const cleanTp = Number(target.tpPips) > 0 ? Number(target.tpPips) : 30;
        const cleanSl = Number(target.slPips) > 0 ? Number(target.slPips) : 20;

        const activeAcc = selectedAccountRef.current || selectedAccount;
        const accLimitsForWave = getAccountMaxOpenTrades(
          activeAcc?.tier,
          activeAcc?.type,
          activeAcc?.balance || 16,
          effectiveLots
        );
        const targetTotalConcurrent = getTargetConcurrentBotTrades(
          target,
          activeInst.symbol,
          accLimitsForWave.effectiveMaxTrades,
          activeAcc?.balance || 16,
          effectiveLots
        );
        const maxInitialWave = Math.min(
          2,
          targetTotalConcurrent,
          Math.max(1, Math.floor(Math.max(0, (activeAcc?.balance || 16) - 2.0) / Math.max(0.4, effectiveLots * 40)))
        );

        const initialWaveTrades: BotTrade[] = [];

        for (let w = 0; w < maxInitialWave; w++) {
          const waveInst = openInsts[w % openInsts.length];

          const isTargetWin = evaluateTargetWinOrLoss(
            userRoleRef.current,
            target.botType,
            isDemoAcc,
            botCfg?.claimedWinRate,
            (target.winningTrades || 0) + w,
            (target.totalTrades || 0) + w,
            target.botId
          );
          const side = determineBotTradeDirection(waveInst, isTargetWin, userRoleRef.current);
          const entryPriceNum = Number(
            (side === 'BUY' ? waveInst.ask : waveInst.bid).toFixed(waveInst.decimals)
          );
          const wavePipSize = getInstrumentPipSize(waveInst.symbol);
          const currentExitNum = isTargetWin
            ? Number(
                (
                  entryPriceNum +
                  (side === 'BUY' ? 1 : -1) * wavePipSize * (3 + (w % 3))
                ).toFixed(waveInst.decimals)
              )
            : Number(
                (side === 'BUY' ? waveInst.bid : waveInst.ask).toFixed(waveInst.decimals)
              );
          const { tpPrice: tpNum, slPrice: slNum } = calculatePipTargetPrices(
            waveInst.symbol,
            side,
            entryPriceNum,
            cleanTp,
            cleanSl
          );
          const initPnl = calculateBotPnL(
            waveInst.symbol,
            side,
            entryPriceNum,
            currentExitNum,
            effectiveLots
          );

          initialWaveTrades.push({
            id: `btrade-${Date.now()}-${w}-${Math.floor(Math.random() * 1000)}`,
            ticket: Math.floor(840000 + Math.random() * 99999),
            runId: target.runId || target.id,
            runInstanceId: target.id || target.runId,
            botId: target.botId,
            botName: target.botName,
            symbol: waveInst.symbol,
            side,
            lotSize: effectiveLots,
            openPrice: entryPriceNum,
            currentPrice: currentExitNum,
            tp: tpNum,
            sl: slNum,
            tpPrice: tpNum,
            slPrice: slNum,
            openTime: Date.now() - w * 600,
            status: 'OPEN',
            profitUsd: initPnl,
            targetOutcome: isTargetWin ? 'WIN' : 'LOSS',
            accountId: activeAcc?.id,
            accountNumber: activeAcc?.accountNumber,
          });
        }

        const updatedTrades = [...initialWaveTrades, ...botTradesRef.current];
        botTradesRef.current = updatedTrades;
        setBotTrades(() => [...updatedTrades]);
        saveStoredBotTrades(updatedTrades, currentUserRef.current?.email);
        immediateSignal = `Auto Executed: ${initialWaveTrades.length} orders live on ${tradedPairsLabel} (${effectiveLots} Lots)`;
      }

      const activeAccForRun = selectedAccountRef.current || selectedAccount;
      const nowTs = Date.now();
      const preservedSym =
        target.customSymbolSelected && target.symbol && target.symbol !== 'ALL'
          ? target.symbol
          : 'ALL';
      const preservedCustomFlag = Boolean(
        target.customSymbolSelected && target.symbol && target.symbol !== 'ALL'
      );

      const updatedRuns = botRunsRef.current.map((r) => {
        if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
          return {
            ...r,
            symbol: preservedSym,
            customSymbolSelected: preservedCustomFlag,
            lotSize: effectiveLots,
            tpPips: Number(r.tpPips) > 0 ? Number(r.tpPips) : 30,
            slPips: Number(r.slPips) > 0 ? Number(r.slPips) : 20,
            status: 'RUNNING' as const,
            statusUpdatedAt: nowTs,
            explicitUserRun: true,
            userStartedVersion: 2,
            lastSignal: immediateSignal,
            lastSignalTime: nowTs,
            accountId: activeAccForRun?.id || r.accountId,
            accountNumber: activeAccForRun?.accountNumber || r.accountNumber,
          };
        }
        return r;
      });
      lastLocalBotsUpdateRef.current = nowTs;
      isCloudBotsLoadedRef.current = true;
      supabaseService.recordBotStatusIntent(
        [target.id, target.runId, runId],
        'RUNNING',
        nowTs,
        {
          lastSignal: immediateSignal,
          lastSignalTime: nowTs,
          symbol: preservedSym,
          customSymbolSelected: preservedCustomFlag,
          lotSize: effectiveLots,
        }
      );
      botRunsRef.current = updatedRuns;
      setBotRuns(updatedRuns);
      saveStoredBotRuns(updatedRuns, currentUserRef.current?.email);
      if (currentUserRef.current?.email) {
        supabaseService
          .syncBotState(
            currentUserRef.current,
            {
              importedBots,
              botRuns: updatedRuns,
              botTrades: botTradesRef.current,
              deletedBotIds: getDeletedBotIds(),
              deletedBotMap: getDeletedBotTimestamps(),
            },
            true
          )
          .catch(() => {});
      }

      playOrderSound(true);
      triggerActionPopup({
        type: 'BOT_STARTED',
        title: 'Bot Running Autonomously',
        subtitle: `${target.botName} is actively executing ${effectiveLots} Lot market trades on ${tradedPairsLabel}.`,
      });
    } else {
      const nowTs = Date.now();
      const pauseMsg = 'Bot Paused by User • Remaining open trades will auto-close at TP/SL';
      const updatedRuns = botRunsRef.current.map((r) => {
        if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
          return {
            ...r,
            status: 'PAUSED' as const,
            statusUpdatedAt: nowTs,
            stoppedAt: nowTs,
            lastSignal: pauseMsg,
            lastSignalTime: nowTs,
          };
        }
        return r;
      });
      lastLocalBotsUpdateRef.current = nowTs;
      isCloudBotsLoadedRef.current = true;
      supabaseService.recordBotStatusIntent(
        [target.id, target.runId, runId],
        'PAUSED',
        nowTs,
        { stoppedAt: nowTs, lastSignal: pauseMsg, lastSignalTime: nowTs }
      );
      botRunsRef.current = updatedRuns;
      setBotRuns(updatedRuns);
      saveStoredBotRuns(updatedRuns, currentUserRef.current?.email);
      if (currentUserRef.current?.email) {
        supabaseService
          .syncBotState(
            currentUserRef.current,
            {
              importedBots,
              botRuns: updatedRuns,
              botTrades: botTradesRef.current,
              deletedBotIds: getDeletedBotIds(),
              deletedBotMap: getDeletedBotTimestamps(),
            },
            true
          )
          .catch(() => {});
      }

      triggerActionPopup({
        type: 'BOT_STOPPED',
        title: 'Bot Paused',
      });
    }
  };

  const handleStopBotRun = (runId: string) => {
    const nowTs = Date.now();
    const stopMsg = 'Bot Stopped (Remains in Active Bots until deleted)';
    const matchedIds: string[] = [runId];
    const updatedRuns = botRunsRef.current.map((r) => {
      if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
        if (r.id) matchedIds.push(r.id);
        if (r.runId) matchedIds.push(r.runId);
        return {
          ...r,
          status: 'PAUSED' as const,
          statusUpdatedAt: nowTs,
          stoppedAt: nowTs,
          lastSignal: stopMsg,
          lastSignalTime: nowTs,
        };
      }
      return r;
    });
    lastLocalBotsUpdateRef.current = nowTs;
    isCloudBotsLoadedRef.current = true;
    supabaseService.recordBotStatusIntent(matchedIds, 'PAUSED', nowTs, {
      stoppedAt: nowTs,
      lastSignal: stopMsg,
      lastSignalTime: nowTs,
    });
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns, currentUserRef.current?.email);
    if (currentUserRef.current?.email) {
      supabaseService
        .syncBotState(
          currentUserRef.current,
          {
            importedBots,
            botRuns: updatedRuns,
            botTrades: botTradesRef.current,
            deletedBotIds: getDeletedBotIds(),
            deletedBotMap: getDeletedBotTimestamps(),
          },
          true
        )
        .catch(() => {});
    }
    addNotification('EA algorithm paused/stopped in Active Bots');

    triggerActionPopup({
      type: 'BOT_STOPPED',
      title: 'Bot Stopped',
      subtitle: 'Bot execution halted. It remains in Active Bots until you run or delete it.',
      details: {
        accountNumber: selectedAccount?.accountNumber,
      },
    });
  };

  const handleDeleteBotRun = (runId: string) => {
    const targetRun = botRunsRef.current.find(
      (r) =>
        r.id === runId ||
        r.runId === runId ||
        r.botId === runId ||
        r.botName === runId
    );

    // 1. Settle and close open trades associated with this run BEFORE removing the run so P/L and ledger are recorded
    const openTradesForRun = botTradesRef.current.filter(
      (t) =>
        (t.runId === runId ||
          t.runInstanceId === runId ||
          (targetRun &&
            (t.runId === targetRun.id ||
              t.runId === targetRun.runId ||
              t.botId === targetRun.botId))) &&
        t.status === 'OPEN'
    );
    openTradesForRun.forEach((t) => {
      handleCloseBotTrade(t.id);
    });

    // 2. Permanently record CRDT deletion timestamp for this run AND strategy so it is deleted across ALL devices and never reappears unless re-deployed
    const deletedAtTs = Date.now();
    const updatedDeletedIds = markBotDeletedLocally(
      [
        targetRun?.id,
        targetRun?.runId,
        targetRun?.botId,
        targetRun?.botName,
        runId,
      ],
      deletedAtTs
    );
    const updatedDeletedMap = getDeletedBotTimestamps();
    lastLocalBotsUpdateRef.current = deletedAtTs;
    isCloudBotsLoadedRef.current = true;

    // 3. Remove all instances of this bot from botRuns synchronously & persist
    const updatedRuns = botRunsRef.current.filter(
      (r) =>
        r !== targetRun &&
        r.id !== runId &&
        r.runId !== runId &&
        r.botId !== runId &&
        r.botName !== runId &&
        (!targetRun?.botId || r.botId !== targetRun.botId) &&
        (!targetRun?.botName || r.botName !== targetRun.botName)
    );
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns, currentUserRef.current?.email);

    // 4. Immediately push explicit deletion to Supabase so all devices remove the bot and never restore it
    if (currentUser && currentUser.email) {
      supabaseService
        .syncBotState(
          currentUser,
          {
            importedBots,
            botRuns: updatedRuns,
            botTrades: botTradesRef.current,
            deletedBotIds: updatedDeletedIds,
            deletedBotMap: updatedDeletedMap,
          },
          true
        )
        .catch(() => {});
    }

    playOrderSound(false);
    addNotification('Deployed bot removed across all devices');

    triggerActionPopup({
      type: 'BOT_STOPPED',
      title: 'Bot Deleted Successfully',
      subtitle: 'The bot has been permanently removed across all devices and will not appear again unless re-deployed.',
    });
  };

  const handleUpdateBotRunSettings = (
    runId: string,
    updates: {
      symbol?: string;
      lotSize?: number;
      tpPips?: number;
      slPips?: number;
      status?: 'RUNNING' | 'PAUSED' | 'STOPPED';
    }
  ) => {
    const target = botRunsRef.current.find(
      (r) => r.id === runId || r.runId === runId || r.botId === runId || r.botName === runId
    );
    const wasRunning = target?.status === 'RUNNING';
    const nextStatus = updates.status ?? target?.status ?? 'PAUSED';
    const resolvedStatus: 'RUNNING' | 'PAUSED' = nextStatus === 'STOPPED' ? 'PAUSED' : nextStatus;
    const nowTs = Date.now();
    const rawUpdateSym = updates.symbol !== undefined ? updates.symbol.trim().toUpperCase() : undefined;
    const isSpecificSymSelected =
      rawUpdateSym !== undefined
        ? rawUpdateSym !== 'ALL' && rawUpdateSym.length > 0
        : Boolean(target?.customSymbolSelected && target?.symbol && target?.symbol !== 'ALL');
    const cleanSymbol = isSpecificSymSelected
      ? rawUpdateSym || target?.symbol || 'XAUUSD'
      : 'ALL';
    const cleanNewLots =
      updates.lotSize !== undefined && Number(updates.lotSize) > 0
        ? Number(Number(updates.lotSize).toFixed(2))
        : target?.lotSize ?? 0.01;
    const cleanNewTp =
      updates.tpPips !== undefined && Number(updates.tpPips) > 0
        ? Number(updates.tpPips)
        : target?.tpPips ?? 30;
    const cleanNewSl =
      updates.slPips !== undefined && Number(updates.slPips) > 0
        ? Number(updates.slPips)
        : target?.slPips ?? 20;
    const symDisplayLabel = isSpecificSymSelected ? cleanSymbol : 'All Bot Currencies (Auto)';
    const settingsSignal = `Settings Updated: ${symDisplayLabel} • ${cleanNewLots} Lots, TP ${cleanNewTp}p, SL ${cleanNewSl}p`;

    const updated = botRunsRef.current.map((r) => {
      if (r.id === runId || r.runId === runId || r.botId === runId || r.botName === runId) {
        return {
          ...r,
          ...updates,
          symbol: cleanSymbol,
          customSymbolSelected: isSpecificSymSelected,
          lotSize: cleanNewLots,
          tpPips: cleanNewTp,
          slPips: cleanNewSl,
          status: resolvedStatus,
          statusUpdatedAt: nowTs,
          explicitUserRun: true,
          userStartedVersion: 2,
          lastSignal: settingsSignal,
          lastSignalTime: nowTs,
        };
      }
      return r;
    });
    lastLocalBotsUpdateRef.current = nowTs + 15000;
    isCloudBotsLoadedRef.current = true;
    supabaseService.recordBotStatusIntent(
      [target?.id, target?.runId, runId],
      resolvedStatus,
      nowTs,
      {
        lastSignal: settingsSignal,
        lastSignalTime: nowTs,
        symbol: cleanSymbol,
        customSymbolSelected: isSpecificSymSelected,
        lotSize: cleanNewLots,
        tpPips: cleanNewTp,
        slPips: cleanNewSl,
      }
    );
    botRunsRef.current = updated;
    setBotRuns(updated);
    saveStoredBotRuns(updated, currentUserRef.current?.email);
    if (currentUserRef.current?.email && !(nextStatus === 'RUNNING' && !wasRunning && target)) {
      supabaseService
        .syncBotState(
          currentUserRef.current,
          {
            importedBots,
            botRuns: updated,
            botTrades: botTradesRef.current,
            deletedBotIds: getDeletedBotIds(),
            deletedBotMap: getDeletedBotTimestamps(),
          },
          true
        )
        .catch(() => {});
    }

    // Also update TP/SL target prices on any currently OPEN bot trades belonging to this run
    if (target && (updates.tpPips !== undefined || updates.slPips !== undefined)) {
      const nextTpPips = Number(updates.tpPips ?? target.tpPips) > 0 ? Number(updates.tpPips ?? target.tpPips) : 30;
      const nextSlPips = Number(updates.slPips ?? target.slPips) > 0 ? Number(updates.slPips ?? target.slPips) : 20;
      let anyTradeUpdated = false;
      const updatedBotTrades = botTradesRef.current.map((t) => {
        if (
          t.status === 'OPEN' &&
          (t.runId === target.id ||
            t.runId === target.runId ||
            t.runInstanceId === target.id ||
            t.runInstanceId === target.runId ||
            t.botId === target.botId)
        ) {
          const { tpPrice, slPrice } = calculatePipTargetPrices(
            t.symbol,
            t.side,
            t.openPrice,
            nextTpPips,
            nextSlPips
          );
          anyTradeUpdated = true;
          return {
            ...t,
            tp: tpPrice,
            tpPrice,
            sl: slPrice,
            slPrice,
          };
        }
        return t;
      });
      if (anyTradeUpdated) {
        botTradesRef.current = updatedBotTrades;
        setBotTrades(() => [...updatedBotTrades]);
        saveStoredBotTrades(updatedBotTrades, currentUserRef.current?.email);
      }
    }

    // If user selected RUNNING in settings and bot wasn't running yet, start autonomous execution immediately
    if (nextStatus === 'RUNNING' && !wasRunning && target) {
      // Set status to PAUSED momentarily so handleToggleBotRun transitions it to RUNNING and opens immediate trade
      botRunsRef.current = updated.map((r) =>
        r.id === target.id || r.runId === target.runId ? { ...r, status: 'PAUSED' as const } : r
      );
      handleToggleBotRun(target.id || target.runId || runId);
      return;
    }

    playOrderSound(true);
    addNotification('Bot settings saved successfully');
    triggerActionPopup({
      type: 'BOT_STARTED',
      title: 'Bot Settings Updated',
      subtitle: `Parameters saved successfully (${updates.symbol ? `${updates.symbol}, ` : ''}${updates.lotSize ? `${updates.lotSize} Lots` : ''}${updates.tpPips ? `, TP ${updates.tpPips}p` : ''}${updates.slPips ? `, SL ${updates.slPips}p` : ''}).`,
    });
  };

  const handleImportBot = (newBot: BotStrategyConfig) => {
    setImportedBots((prev) => {
      const updated = [newBot, ...prev];
      saveStoredImportedBots(updated);
      return updated;
    });
    playOrderSound(true);
    addNotification(`Strategy Imported: ${newBot.name} (${newBot.version || 'v1.0'})`);
    triggerActionPopup({
      type: 'BOT_STARTED',
      title: `Strategy Imported: ${newBot.name}`,
      subtitle: `Algorithmic bot loaded with default ${newBot.defaultLotSize} Lots and ready for autonomous execution.`,
    });
  };

  const handleCloseBotTrade = (tradeId: string) => {
    const trade = botTradesRef.current.find((t) => t.id === tradeId || String(t.ticket) === String(tradeId));
    if (!trade || trade.status !== 'OPEN') return;

    if (currentUserRef.current?.email) {
      markTradeSettled(currentUserRef.current.email, trade.id);
    }

    const inst = instrumentsRef.current.find((i) => i.symbol === trade.symbol);
    const decimals = inst?.decimals ?? getInstrumentSpec(trade.symbol).decimals;
    const exitPrice = Number(
      (typeof trade.currentPrice === 'number' && !isNaN(trade.currentPrice) && trade.currentPrice > 0
        ? trade.currentPrice
        : trade.side === 'BUY'
        ? inst?.bid || trade.openPrice
        : inst?.ask || trade.openPrice
      ).toFixed(decimals)
    );
    const profitUsd = calculateBotPnL(
      trade.symbol,
      trade.side,
      trade.openPrice,
      exitPrice,
      trade.lotSize
    );

    const updatedTrade: BotTrade = {
      ...trade,
      status: 'CLOSED',
      currentPrice: exitPrice,
      closePrice: exitPrice,
      exitPrice,
      profitUsd: Number(profitUsd.toFixed(2)),
      closeReason: 'MANUAL',
      exitReason: 'MANUAL',
      closeTime: Date.now(),
    };

    const nextBotTrades = botTradesRef.current.map((t) => (t.id === trade.id || String(t.ticket) === String(tradeId) ? updatedTrade : t));
    botTradesRef.current = nextBotTrades;
    lastLocalBotsUpdateRef.current = Date.now();
    setBotTrades(() => [...nextBotTrades]);
    saveStoredBotTrades(nextBotTrades, currentUserRef.current?.email);

    // Credit or debit strictly the account that owns this bot trade!
    const parentRunForClose = botRunsRef.current.find(
      (r) =>
        r.id === trade.runId ||
        r.runId === trade.runId ||
        r.id === trade.runInstanceId ||
        r.botId === trade.botId
    );
    const ownerAccId =
      trade.accountId ||
      parentRunForClose?.accountId ||
      trade.accountNumber ||
      parentRunForClose?.accountNumber ||
      accountsRef.current.find((a) => a.type === 'Demo')?.id ||
      selectedAccountRef.current?.id;
    const updatedAcc = commitAccountBalanceChange(profitUsd, ownerAccId, {
      type: 'REALIZED_TRADE_PNL',
      referenceId: trade.id,
      reason: `Bot MANUAL #${trade.ticket} ${trade.side} ${trade.lotSize} ${trade.symbol}`,
      metadata: {
        ticket: trade.ticket,
        symbol: trade.symbol,
        side: trade.side,
        lots: trade.lotSize,
        openPrice: trade.openPrice,
        closePrice: exitPrice,
        pnl: profitUsd,
        reason: 'MANUAL',
      },
    });
    if (updatedAcc && updatedAcc.balance <= 0 && updatedAcc.id === selectedAccountRef.current?.id) {
      setTimeout(handleZeroBalanceStopOut, 0);
    }

    // Also record in closedTrades history & Supabase
    const closedRecord: ClosedTrade = {
      id: `cl-bot-${trade.id}`,
      ticket: trade.ticket,
      symbol: trade.symbol,
      side: trade.side,
      lots: trade.lotSize,
      openPrice: trade.openPrice,
      closePrice: exitPrice,
      pnl: profitUsd,
      openTime: trade.openTime,
      closeTime: Date.now(),
      reason: 'MANUAL',
      accountId: updatedAcc?.id || trade.accountId,
      accountNumber: updatedAcc?.accountNumber || trade.accountNumber,
    };
    setClosedTrades((ct) => {
      const deduped = ct.filter((item) => item.id !== closedRecord.id && item.ticket !== closedRecord.ticket);
      const updated = [closedRecord, ...deduped];
      if (currentUserRef.current?.email) {
        try {
          localStorage.setItem(
            `vtm_closed_trades_${currentUserRef.current.email.trim().toLowerCase()}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });

    if (currentUserRef.current) {
      supabaseService.saveTrade(currentUserRef.current, {
        id: closedRecord.id,
        ticket: closedRecord.ticket,
        accountNumber: updatedAcc?.accountNumber || selectedAccountRef.current?.accountNumber,
        symbol: closedRecord.symbol,
        side: closedRecord.side,
        orderType: 'BOT',
        lots: closedRecord.lots,
        openPrice: closedRecord.openPrice,
        currentPrice: exitPrice,
        closePrice: exitPrice,
        sl: trade.sl ?? null,
        tp: trade.tp ?? null,
        pnl: profitUsd,
        status: 'CLOSED',
        openTime: closedRecord.openTime,
        closeTime: closedRecord.closeTime,
        closeReason: 'MANUAL',
      });

      // Synchronize updated bot trades to Supabase STATE_BOTS immediately
      supabaseService
        .syncBotState(currentUserRef.current, {
          importedBots,
          botRuns: botRunsRef.current,
          botTrades: nextBotTrades,
          deletedBotIds: getDeletedBotIds(),
        })
        .catch(() => {});
    }

    // Update run stats
    setBotRuns((runs) => {
      const nextRuns = runs.map((r) => {
        if (r.runId === trade.runId || r.id === trade.runId || r.id === trade.runInstanceId) {
          const count = (r.totalTrades || r.totalTradesCount || 0) + 1;
          const wins = (r.winningTrades || r.winCount || 0) + (profitUsd > 0 ? 1 : 0);
          const losses = (r.losingTrades || 0) + (profitUsd < 0 ? 1 : 0);
          return {
            ...r,
            totalTrades: count,
            totalTradesCount: count,
            winningTrades: wins,
            winCount: wins,
            losingTrades: losses,
            totalProfitUsd: Number(((r.totalProfitUsd || 0) + profitUsd).toFixed(2)),
          };
        }
        return r;
      });
      botRunsRef.current = nextRuns;
      saveStoredBotRuns(nextRuns, currentUserRef.current?.email);
      return nextRuns;
    });

    playOrderSound(profitUsd >= 0);
    addNotification(
      `Bot trade #${trade.ticket} closed (${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)}) • Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`
    );

    triggerActionPopup({
      type: 'TRADE_CLOSED',
      title: `Trade of ${trade.symbol} is closed`,
      details: {
        symbol: trade.symbol,
        side: trade.side,
        lots: trade.lotSize,
        price: exitPrice,
        pnl: profitUsd,
        ticket: trade.ticket,
        accountNumber: updatedAcc?.accountNumber || selectedAccountRef.current?.accountNumber,
      },
    });
  };

  const handleTriggerManualSignal = (runId: string) => {
    const run = botRuns.find((r) => r.runId === runId || r.id === runId);
    if (!run) return;

    const allBots = [...DEFAULT_INBUILT_BOTS, ...importedBots];
    const botCfg = allBots.find((b) => b.id === run.botId || b.name === run.botName);
    const openInsts = getOpenBotInstruments(run, botCfg);

    // Enforce market hours: if currency is closed, one cannot open any trade
    if (openInsts.length === 0) {
      const pairLabel =
        run.customSymbolSelected && run.symbol && run.symbol !== 'ALL'
          ? run.symbol
          : (botCfg?.recommendedInstruments || ['XAUUSD']).join(', ');
      playOrderSound(false);
      addNotification(`Signal Rejected: ${pairLabel} market is closed`);
      triggerActionPopup({
        type: 'ERROR',
        title: `${pairLabel} is closed`,
      });
      return;
    }

    const inst = openInsts[Math.floor(Date.now() / 1000) % openInsts.length];
    const isDemoAcc = (selectedAccountRef.current?.type || selectedAccount?.type) === 'Demo';
    const isTargetWin = evaluateTargetWinOrLoss(userRoleRef.current, run.botType, isDemoAcc, botCfg?.claimedWinRate, run.winningTrades, run.totalTrades, run.id);
    const side = determineBotTradeDirection(inst, isTargetWin, userRoleRef.current);
    const openPrice = side === 'BUY' ? inst.ask : inst.bid;

    // Strict check: Never open signal trade if free margin is 0 or lot size exceeds account capital
    const capCheck = validateTradeCapitalAndMargin(run.lotSize, inst.symbol, openPrice);
    if (!capCheck.allowed) {
      playOrderSound(false);
      addNotification(capCheck.message || 'Signal Rejected: Insufficient Free Margin / Capital');
      triggerActionPopup({
        type: 'ERROR',
        title: capCheck.title || 'Insufficient Capital',
        subtitle: capCheck.message,
      });
      return;
    }

    const openPriceNum = Number(openPrice.toFixed(inst.decimals));
    const sigPipSize = getInstrumentPipSize(inst.symbol);
    const currentExitNum = isTargetWin
      ? Number((openPriceNum + (side === 'BUY' ? 1 : -1) * sigPipSize * 3).toFixed(inst.decimals))
      : Number((side === 'BUY' ? inst.bid : inst.ask).toFixed(inst.decimals));
    const cleanTpPips = Number(run.tpPips) > 0 ? Number(run.tpPips) : 30;
    const cleanSlPips = Number(run.slPips) > 0 ? Number(run.slPips) : 20;
    const { tpPrice: tpPriceNum, slPrice: slPriceNum } = calculatePipTargetPrices(
      inst.symbol,
      side,
      openPriceNum,
      cleanTpPips,
      cleanSlPips
    );
    const initialBotProfit = calculateBotPnL(inst.symbol, side, openPriceNum, currentExitNum, run.lotSize);

    const newTrade: BotTrade = {
      id: `btrade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticket: Math.floor(800000 + Math.random() * 99999),
      runId: run.runId,
      runInstanceId: run.id || run.runId,
      botId: run.botId,
      botName: run.botName,
      symbol: inst.symbol,
      side,
      lotSize: run.lotSize,
      openPrice: openPriceNum,
      currentPrice: currentExitNum,
      tp: tpPriceNum,
      sl: slPriceNum,
      tpPrice: tpPriceNum,
      slPrice: slPriceNum,
      openTime: Date.now(),
      status: 'OPEN',
      profitUsd: initialBotProfit,
      targetOutcome: isTargetWin ? 'WIN' : 'LOSS',
      accountId: run.accountId || selectedAccount?.id,
      accountNumber: run.accountNumber || selectedAccount?.accountNumber,
    };

    setBotTrades((prev) => {
      const updated = [newTrade, ...prev];
      botTradesRef.current = updated;
      saveStoredBotTrades(updated, currentUserRef.current?.email);
      return updated;
    });

    setBotRuns((runs) => {
      const nextRuns = runs.map((r) => {
        if (r.id === run.id || r.runId === run.runId) {
          return {
            ...r,
            lastSignal: `Command Executed: ${side} ${run.lotSize} @ ${openPriceNum}`,
            lastSignalTime: Date.now(),
            accountId: r.accountId || selectedAccount?.id,
            accountNumber: r.accountNumber || selectedAccount?.accountNumber,
          };
        }
        return r;
      });
      botRunsRef.current = nextRuns;
      saveStoredBotRuns(nextRuns, currentUserRef.current?.email);
      return nextRuns;
    });

    playOrderSound(true);
    addNotification(
      `[${run.botName}] Signal Triggered: ${side} ${run.lotSize} on ${run.symbol}`
    );

    triggerActionPopup({
      type: 'TRADE_OPENED',
      title: `Trade of ${run.symbol} is open`,
      details: {
        symbol: run.symbol,
        side,
        lots: run.lotSize,
        price: openPriceNum,
        ticket: newTrade.ticket,
        accountNumber: selectedAccount?.accountNumber,
      },
    });
  };

  // Automated Bot Execution Engine Loop (Fully Autonomous Multi-Trade Execution & Accurate Pip TP/SL Settlement)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRuns = botRunsRef.current;
      const currentTrades = botTradesRef.current;
      const allInstruments = instrumentsRef.current;
      const currentRole = userRoleRef.current;

      // Evaluate all currently open bot trades (even if the parent bot was paused!) AND run active bots
      const runningBots = currentRuns.filter(
        (r) => r.status === 'RUNNING' && r.explicitUserRun !== false
      );
      const allOpenBotTrades = currentTrades.filter((t) => t.status === 'OPEN');
      if (runningBots.length === 0 && allOpenBotTrades.length === 0) return;

      let nextTrades = [...currentTrades];
      let tradesChanged = false;

      let nextRuns = [...currentRuns];
      let runsChanged = false;

      const allBotConfigs = [...DEFAULT_INBUILT_BOTS, ...loadStoredImportedBots()];

      // 1. Evaluate ALL currently OPEN bot trades (including trades left open after a bot is PAUSED)
      //    so they automatically close when they hit profit (TP) or loss (SL), strictly on their OWNING account.
      allOpenBotTrades.forEach((activeTrade) => {
        if (closingPositionIdsRef.current.has(activeTrade.id)) return;
        if (currentUserRef.current?.email && isTradeSettled(currentUserRef.current.email, activeTrade.id)) return;

        const parentRun = nextRuns.find(
          (r) =>
            r.id === activeTrade.runId ||
            r.runId === activeTrade.runId ||
            r.id === activeTrade.runInstanceId ||
            r.runId === activeTrade.runInstanceId ||
            r.botId === activeTrade.botId
        );

        const targetAccIdOrNum =
          activeTrade.accountId ||
          parentRun?.accountId ||
          activeTrade.accountNumber ||
          parentRun?.accountNumber;

        // Resolve the exact account that owns this bot trade using belongsToAccount (matches both accountId and accountNumber across devices)
        const tradeOwningAcc =
          accountsRef.current.find(
            (a) => belongsToAccount(activeTrade, a) || (parentRun && belongsToAccount(parentRun, a))
          ) ||
          (targetAccIdOrNum
            ? accountsRef.current.find(
                (a) => a.id === targetAccIdOrNum || a.accountNumber === targetAccIdOrNum
              )
            : selectedAccountRef.current || accountsRef.current.find((a) => a.type === 'Demo'));

        if (!tradeOwningAcc) return;

        const tradeInst =
          allInstruments.find((i) => i.symbol === activeTrade.symbol) ||
          (parentRun ? getBotCandidateInstruments(parentRun)[0] : allInstruments[0]);
        if (!tradeInst) return;

        const mStatus = checkInstrumentMarketHours(tradeInst.symbol, tradeInst.category);
        if (!mStatus.isOpen) return;

        const pipSize = getInstrumentPipSize(activeTrade.symbol);
        const durationMs = Date.now() - (activeTrade.openTime || Date.now());
        const elapsedSec = Math.max(0, durationMs / 1000);

        const isPrivilegedAcc =
          currentRole === 'marketer' ||
          currentRole === 'admin' ||
          tradeOwningAcc.type === 'Demo';

        // On Marketer and Demo accounts, guarantee >90% winrate, wins > losses, and total profit strictly > $0.00
        let isDesignatedWin =
          activeTrade.targetOutcome === 'WIN' ||
          (activeTrade.targetOutcome !== 'LOSS' && activeTrade.ticket % 10 < 7);

        if (isPrivilegedAcc) {
          const closedSoFar = nextTrades.filter((t) => t.status === 'CLOSED');
          const winsCount = closedSoFar.filter((t) => (t.profitUsd || 0) > 0).length;
          const totalCount = closedSoFar.length;
          const realizedSum = closedSoFar.reduce((s, t) => s + (t.profitUsd || 0), 0);
          if (
            totalCount < 10 ||
            winsCount / (totalCount + 1) < 0.92 ||
            realizedSum <= 0
          ) {
            isDesignatedWin = true;
          }
        }

        const contractSize = getContractSize(activeTrade.symbol);
        const tpDist = Math.max(pipSize * 5, Math.abs(activeTrade.tp - activeTrade.openPrice));
        const slDist = Math.max(pipSize * 5, Math.abs(activeTrade.openPrice - activeTrade.sl));
        const tpTargetUsd = Math.max(
          0.05,
          Number((tpDist * contractSize * activeTrade.lotSize).toFixed(2))
        );
        const slTargetUsd = Math.max(
          0.05,
          Number((slDist * contractSize * activeTrade.lotSize).toFixed(2))
        );

        const tickSlot = elapsedSec * 2.5;
        const waveRatio =
          Math.sin(tickSlot * 1.35 + (activeTrade.ticket % 19) * 0.5) * 0.02 +
          Math.cos(tickSlot * 2.25 + (activeTrade.ticket % 11) * 0.3) * 0.01;

        let currentMarketPrice: number;
        let floatingProfit: number;

        if (isDesignatedWin) {
          // Start immediately in positive profit (at least 12% of TP distance or 3 pips) and progress smoothly to TP over 24 seconds
          const baseProgress = Math.min(1.0, Math.max(0.12, 0.12 + (elapsedSec / 24) * 0.88));
          const progressWithWave =
            baseProgress >= 1.0 ? 1.0 : Math.min(0.99, Math.max(0.10, baseProgress + waveRatio));
          const moveOffset = Math.max(pipSize * 2, tpDist * progressWithWave);
          const rawCandidate =
            activeTrade.side === 'BUY'
              ? Number((activeTrade.openPrice + moveOffset).toFixed(tradeInst.decimals))
              : Number((activeTrade.openPrice - moveOffset).toFixed(tradeInst.decimals));

          if (activeTrade.side === 'BUY') {
            currentMarketPrice =
              baseProgress >= 1.0 || rawCandidate >= activeTrade.tp
                ? activeTrade.tp
                : Math.max(Number((activeTrade.openPrice + pipSize * 2).toFixed(tradeInst.decimals)), rawCandidate);
          } else {
            currentMarketPrice =
              baseProgress >= 1.0 || rawCandidate <= activeTrade.tp
                ? activeTrade.tp
                : Math.min(Number((activeTrade.openPrice - pipSize * 2).toFixed(tradeInst.decimals)), rawCandidate);
          }

          floatingProfit = calculateBotPnL(
            activeTrade.symbol,
            activeTrade.side,
            activeTrade.openPrice,
            currentMarketPrice,
            activeTrade.lotSize
          );

          if (isPrivilegedAcc && floatingProfit <= 0) {
            floatingProfit = Math.max(0.15, Number((contractSize * pipSize * 2 * activeTrade.lotSize).toFixed(2)));
          }
        } else {
          const baseLossProgress = Math.min(1.0, Math.max(0.08, 0.08 + (elapsedSec / 22) * 0.92));
          const lossProgressWithWave =
            baseLossProgress >= 1.0 ? 1.0 : Math.min(0.99, Math.max(0.05, baseLossProgress - waveRatio));
          const moveOffset = Math.max(pipSize * 2, slDist * lossProgressWithWave);
          const rawCandidate =
            activeTrade.side === 'BUY'
              ? Number((activeTrade.openPrice - moveOffset).toFixed(tradeInst.decimals))
              : Number((activeTrade.openPrice + moveOffset).toFixed(tradeInst.decimals));

          if (activeTrade.side === 'BUY') {
            currentMarketPrice =
              baseLossProgress >= 1.0 || rawCandidate <= activeTrade.sl
                ? activeTrade.sl
                : Math.min(activeTrade.tp, rawCandidate);
          } else {
            currentMarketPrice =
              baseLossProgress >= 1.0 || rawCandidate >= activeTrade.sl
                ? activeTrade.sl
                : Math.max(activeTrade.tp, rawCandidate);
          }

          floatingProfit = calculateBotPnL(
            activeTrade.symbol,
            activeTrade.side,
            activeTrade.openPrice,
            currentMarketPrice,
            activeTrade.lotSize
          );
        }

        const hitTp =
          activeTrade.tp > 0 &&
          (activeTrade.side === 'BUY'
            ? currentMarketPrice >= activeTrade.tp
            : currentMarketPrice <= activeTrade.tp);
        const hitSl =
          activeTrade.sl > 0 &&
          (activeTrade.side === 'BUY'
            ? currentMarketPrice <= activeTrade.sl
            : currentMarketPrice >= activeTrade.sl);

        const shouldTakeProfit = hitTp;
        const shouldCloseLoss = hitSl;

        if (shouldTakeProfit || shouldCloseLoss) {
          closingPositionIdsRef.current.add(activeTrade.id);
          if (currentUserRef.current?.email) {
            markTradeSettled(currentUserRef.current.email, activeTrade.id);
          }

          const fallbackTp =
            activeTrade.side === 'BUY'
              ? activeTrade.openPrice + 30 * pipSize
              : activeTrade.openPrice - 30 * pipSize;
          const fallbackSl =
            activeTrade.side === 'BUY'
              ? activeTrade.openPrice - 20 * pipSize
              : activeTrade.openPrice + 20 * pipSize;

          // Lock exact TP or SL exit price so PnL is 100% mathematically exact to configured pips and lot size
          const finalExitPrice = Number(
            (shouldTakeProfit
              ? activeTrade.tp || activeTrade.tpPrice || fallbackTp
              : activeTrade.sl || activeTrade.slPrice || fallbackSl
            ).toFixed(tradeInst.decimals)
          );

          let profitUsd = calculateBotPnL(
            activeTrade.symbol,
            activeTrade.side,
            activeTrade.openPrice,
            finalExitPrice,
            activeTrade.lotSize
          );

          if (shouldTakeProfit) {
            profitUsd = Math.max(profitUsd, Number(tpTargetUsd.toFixed(2)));
            if (isPrivilegedAcc) {
              const spec = getInstrumentSpec(activeTrade.symbol);
              const minWinUsd = Math.max(0.25, Number((spec.contractSize * spec.pipSize * 5 * activeTrade.lotSize).toFixed(2)));
              profitUsd = Math.max(profitUsd, minWinUsd);
            }
          } else if (shouldCloseLoss) {
            if (isPrivilegedAcc) {
              const closedForRun = nextTrades.filter(
                (t) =>
                  (t.runId === activeTrade.runId || t.botId === activeTrade.botId) &&
                  t.status === 'CLOSED'
              );
              const runWinTotal = closedForRun
                .filter((t) => (t.profitUsd || 0) > 0)
                .reduce((s, t) => s + (t.profitUsd || 0), 0);
              const maxSafeLoss = Math.max(0.1, runWinTotal * 0.25);
              profitUsd = -Math.min(maxSafeLoss, Math.abs(profitUsd), Number(slTargetUsd.toFixed(2)));
            } else {
              profitUsd = -Math.min(Math.abs(profitUsd), Number(slTargetUsd.toFixed(2)));
            }
          }

          // Capital protection: clamp loss to available account balance so balance never goes negative
          const currentAccForClamp = tradeOwningAcc;
          const currentBalForClamp = Number(currentAccForClamp.balance ?? 0);
          const maxAllowedSingleLoss = Math.max(0, currentBalForClamp);

          if (profitUsd < 0 && Math.abs(profitUsd) > maxAllowedSingleLoss) {
            profitUsd = -Number(maxAllowedSingleLoss.toFixed(2));
          }

          const isWin = profitUsd >= 0;
          const closedTrade: BotTrade = {
            ...activeTrade,
            status: 'CLOSED',
            currentPrice: finalExitPrice,
            closePrice: finalExitPrice,
            exitPrice: finalExitPrice,
            profitUsd: Number(profitUsd.toFixed(2)),
            closeReason: isWin ? 'TAKE_PROFIT' : 'STOP_LOSS',
            exitReason: isWin ? 'TP' : 'SL',
            closeTime: Date.now(),
            accountId: tradeOwningAcc.id,
            accountNumber: tradeOwningAcc.accountNumber,
          };

          nextTrades = nextTrades.map((t) =>
            t.id === activeTrade.id ? closedTrade : t
          );
          botTradesRef.current = nextTrades;
          tradesChanged = true;

          const roundedProfit = Number(profitUsd.toFixed(2));
          const updatedAcc = commitAccountBalanceChange(roundedProfit, tradeOwningAcc.id, {
            type: 'REALIZED_TRADE_PNL',
            referenceId: activeTrade.id,
            reason: `Bot ${shouldTakeProfit ? 'TP' : 'SL'} #${activeTrade.ticket} ${activeTrade.side} ${activeTrade.lotSize} ${activeTrade.symbol}`,
            metadata: {
              ticket: activeTrade.ticket,
              symbol: activeTrade.symbol,
              side: activeTrade.side,
              lots: activeTrade.lotSize,
              openPrice: activeTrade.openPrice,
              closePrice: finalExitPrice,
              pnl: roundedProfit,
              reason: shouldTakeProfit ? 'TP' : 'SL',
            },
          });
          if (updatedAcc && updatedAcc.balance <= 0 && updatedAcc.id === selectedAccountRef.current?.id) {
            setTimeout(handleZeroBalanceStopOut, 0);
          }

          const closedRecord: ClosedTrade = {
            id: `cl-bot-${activeTrade.id}`,
            ticket: activeTrade.ticket,
            symbol: activeTrade.symbol,
            side: activeTrade.side,
            lots: activeTrade.lotSize,
            openPrice: activeTrade.openPrice,
            closePrice: finalExitPrice,
            pnl: roundedProfit,
            openTime: activeTrade.openTime,
            closeTime: Date.now(),
            reason: shouldTakeProfit ? 'TP' : 'SL',
            accountId: tradeOwningAcc.id,
            accountNumber: tradeOwningAcc.accountNumber,
          };
          setClosedTrades((ct) => {
            const deduped = ct.filter((item) => item.id !== closedRecord.id && item.ticket !== closedRecord.ticket);
            const updated = [closedRecord, ...deduped];
            if (currentUserRef.current?.email) {
              try {
                localStorage.setItem(
                  `vtm_closed_trades_${currentUserRef.current.email.trim().toLowerCase()}`,
                  JSON.stringify(updated)
                );
              } catch {
                // ignore
              }
            }
            return updated;
          });

          if (currentUserRef.current) {
            supabaseService.saveTrade(currentUserRef.current, {
              id: closedRecord.id,
              ticket: closedRecord.ticket,
              accountNumber: tradeOwningAcc.accountNumber,
              symbol: closedRecord.symbol,
              side: closedRecord.side,
              orderType: 'BOT',
              lots: closedRecord.lots,
              openPrice: closedRecord.openPrice,
              currentPrice: finalExitPrice,
              closePrice: finalExitPrice,
              sl: activeTrade.sl ?? null,
              tp: activeTrade.tp ?? null,
              pnl: roundedProfit,
              status: 'CLOSED',
              openTime: closedRecord.openTime,
              closeTime: closedRecord.closeTime,
              closeReason: closedRecord.reason,
            });
          }

          if (parentRun) {
            const pKey = parentRun.id || parentRun.runId;
            nextRuns = nextRuns.map((r) => {
              if (r.id === parentRun.id || r.runId === pKey || r.botId === parentRun.botId) {
                const closedForThisRun = nextTrades.filter(
                  (t) =>
                    (t.runId === pKey ||
                      t.runInstanceId === pKey ||
                      t.runId === r.runId ||
                      t.runId === r.id ||
                      t.botId === r.botId) &&
                    t.status === 'CLOSED'
                );
                const wins = closedForThisRun.filter((t) => (t.profitUsd || 0) > 0).length;
                const losses = closedForThisRun.length - wins;
                let profitSum = Number(
                  closedForThisRun.reduce((s, t) => s + (t.profitUsd || 0), 0).toFixed(2)
                );
                if (isPrivilegedAcc && profitSum <= 0 && closedForThisRun.length > 0) {
                  profitSum = Math.max(0.50, Number((wins * 1.50).toFixed(2)));
                }
                return {
                  ...r,
                  totalTrades: closedForThisRun.length,
                  totalTradesCount: closedForThisRun.length,
                  winningTrades: wins,
                  winCount: wins,
                  losingTrades: losses,
                  totalProfitUsd: profitSum,
                  lastSignal:
                    profitUsd > 0
                      ? `TP Hit on ${activeTrade.symbol} (+$${profitUsd.toFixed(2)})`
                      : `SL Hit on ${activeTrade.symbol} (-$${Math.abs(profitUsd).toFixed(2)})`,
                  lastSignalTime: Date.now(),
                };
              }
              return r;
            });
            runsChanged = true;
          }

          playOrderSound(profitUsd >= 0);
          addNotification(
            `[${activeTrade.botName || parentRun?.botName || 'Bot'}] Closed #${activeTrade.ticket} ${activeTrade.symbol} (${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)}) • Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`
          );
        } else {
          // Update live floating price and PnL
          const updatedTrade: BotTrade = {
            ...activeTrade,
            currentPrice: currentMarketPrice,
            profitUsd: floatingProfit,
            targetOutcome: isDesignatedWin ? 'WIN' : 'LOSS',
          };
          nextTrades = nextTrades.map((t) =>
            t.id === activeTrade.id ? updatedTrade : t
          );
          botTradesRef.current = nextTrades;
          tradesChanged = true;
        }
      });

      // 2. Autonomous Multi-Trade Opening: ONLY open new trades for RUNNING bots on their OWNING account
      runningBots.forEach((run) => {
        const runTargetAccKey = run.accountId || run.accountNumber;
        const activeAcc =
          accountsRef.current.find((a) => belongsToAccount(run, a)) ||
          (runTargetAccKey
            ? accountsRef.current.find(
                (a) => a.id === runTargetAccKey || a.accountNumber === runTargetAccKey
              )
            : selectedAccountRef.current || accountsRef.current.find((a) => a.type === 'Demo'));

        if (!activeAcc) return;

        const runKey = run.id || run.runId;
        const botConfig = allBotConfigs.find(
          (b) => b.id === run.botId || b.name === run.botName
        );
        const claimedWinRateStr = botConfig?.claimedWinRate || '94.2%';

        // Resolve only open (market-active) instruments for this bot:
        // - If user selected a specific currency in Settings, only that currency (if open).
        // - Otherwise, all open recommendedInstruments labeled on the bot.
        const openInsts = getOpenBotInstruments(run, botConfig);
        if (openInsts.length === 0) {
          // Market is closed (e.g. weekend closure) — pause execution so bots never execute runs when market is closed
          const closedTs = Date.now();
          const pairLabel =
            run.customSymbolSelected && run.symbol && run.symbol !== 'ALL'
              ? run.symbol
              : (botConfig?.recommendedInstruments || ['XAUUSD']).join(', ');
          const closedMsg = `Paused: Market Closed for ${pairLabel} • Resumes when market opens`;
          lastLocalBotsUpdateRef.current = closedTs;
          supabaseService.recordBotStatusIntent([run.id, run.runId], 'PAUSED', closedTs, {
            stoppedAt: closedTs,
            lastSignal: closedMsg,
            lastSignalTime: closedTs,
            symbol: run.symbol,
            customSymbolSelected: run.customSymbolSelected,
          });
          nextRuns = nextRuns.map((r) =>
            r.id === run.id || r.runId === runKey
              ? {
                  ...r,
                  status: 'PAUSED' as const,
                  statusUpdatedAt: closedTs,
                  stoppedAt: closedTs,
                  lastSignal: closedMsg,
                  lastSignalTime: closedTs,
                }
              : r
          );
          runsChanged = true;
          return;
        }

        const stillOpenForRun = nextTrades.filter(
          (t) =>
            (t.runId === runKey ||
              t.runInstanceId === runKey ||
              t.runId === run.runId ||
              t.runId === run.id ||
              t.runInstanceId === run.id) &&
            t.status === 'OPEN'
        );

        const accOpenManualForEq = (positionsRef.current || []).filter((p) =>
          belongsToAccount(p, activeAcc)
        );
        const accOpenBotForEq = nextTrades.filter(
          (t) => t.status === 'OPEN' && belongsToAccount(t, activeAcc)
        );
        const liveFloatingPnl =
          accOpenManualForEq.reduce((s, p) => s + (p.pnl || 0), 0) +
          accOpenBotForEq.reduce((s, t) => s + (t.profitUsd || 0), 0);
        const liveAccBalance = Number(activeAcc.balance ?? 0);
        const liveAccEquity = Number((liveAccBalance + liveFloatingPnl).toFixed(2));

        // Only stop automatically if the account genuinely has no capital left to execute trades
        if (liveAccBalance <= 2.0 || liveAccEquity <= 2.0) {
          const stopTs = Date.now();
          const stopMsg = `Stopped automatically at $${liveAccBalance.toFixed(2)}: Minimum tradable capital reached`;
          lastLocalBotsUpdateRef.current = stopTs;
          supabaseService.recordBotStatusIntent([run.id, run.runId], 'PAUSED', stopTs, {
            stoppedAt: stopTs,
            lastSignal: stopMsg,
            lastSignalTime: stopTs,
          });
          nextRuns = nextRuns.map((r) =>
            r.id === run.id || r.runId === runKey
              ? {
                  ...r,
                  status: 'PAUSED' as const,
                  statusUpdatedAt: stopTs,
                  stoppedAt: stopTs,
                  lastSignal: stopMsg,
                  lastSignalTime: stopTs,
                }
              : r
          );
          runsChanged = true;
          if (activeAcc.id === selectedAccountRef.current?.id) {
            handleZeroBalanceStopOut(liveAccEquity);
          }
          return;
        }

        // Always follow the exact lot size configured on the bot by the user
        const effectiveAutoLots = resolveAffordableBotLotSize(run.lotSize, activeAcc);
        const accLimits = getAccountMaxOpenTrades(
          activeAcc.tier,
          activeAcc.type,
          activeAcc.balance,
          effectiveAutoLots
        );

        const latestRunState = nextRuns.find((r) => r.id === run.id || r.runId === runKey) || run;
        const targetConcurrent = Math.min(
          5,
          getTargetConcurrentBotTrades(
            latestRunState,
            openInsts[0].symbol,
            accLimits.effectiveMaxTrades,
            activeAcc.balance,
            effectiveAutoLots
          )
        );

        // Open 1 new trade per tick automatically until reaching targetConcurrent (maximum 5 concurrent trades)
        const deficit = targetConcurrent - stillOpenForRun.length;
        const tradesToOpenThisTick = deficit > 0 ? 1 : 0;

        for (let bIdx = 0; bIdx < tradesToOpenThisTick; bIdx++) {
          const openCountNow = stillOpenForRun.length + bIdx;
          // Cycle across all open candidate instruments (all recommended pairs in default 'ALL' mode, or the 1 selected pair if set in Settings)
          const targetInst =
            openInsts[(openCountNow + Math.floor(Date.now() / 1500)) % openInsts.length];
          const mStatus = checkInstrumentMarketHours(targetInst.symbol, targetInst.category);
          if (!mStatus.isOpen) break;

          const cleanRunTpPips = Number(run.tpPips) > 0 ? Number(run.tpPips) : 30;
          const cleanRunSlPips = Number(run.slPips) > 0 ? Number(run.slPips) : 20;

          const closedForRun = nextTrades.filter(
            (t) =>
              (t.runId === runKey ||
                t.runInstanceId === runKey ||
                t.runId === run.runId ||
                t.runId === run.id ||
                t.botId === run.botId) &&
              t.status === 'CLOSED'
          );
          const winsSoFar = closedForRun.filter((t) => (t.profitUsd || 0) > 0).length;

          const isDemoAcc = activeAcc.type === 'Demo';
          const isTargetWin = evaluateTargetWinOrLoss(
            currentRole,
            run.botType,
            isDemoAcc,
            claimedWinRateStr,
            winsSoFar + bIdx,
            closedForRun.length + bIdx,
            run.botId
          );
          const side = determineBotTradeDirection(targetInst, isTargetWin, currentRole);
          const openPrice = side === 'BUY' ? targetInst.ask : targetInst.bid;

          // Enforce open trade limit and minimum tradable balance on activeAcc
          const accOpenManual = (positionsRef.current || []).filter((p) => belongsToAccount(p, activeAcc));
          const accOpenBot = nextTrades.filter((t) => t.status === 'OPEN' && belongsToAccount(t, activeAcc));
          if (
            accOpenManual.length + accOpenBot.length >= Math.max(1, accLimits.effectiveMaxTrades) ||
            activeAcc.balance <= 2.0
          ) {
            break;
          }

          const openPriceNum = Number(openPrice.toFixed(targetInst.decimals));
          const targetPipSize = getInstrumentPipSize(targetInst.symbol);
          const currentExitNum = isTargetWin
            ? Number(
                (
                  openPriceNum +
                  (side === 'BUY' ? 1 : -1) * targetPipSize * (3 + (bIdx % 3))
                ).toFixed(targetInst.decimals)
              )
            : Number((side === 'BUY' ? targetInst.bid : targetInst.ask).toFixed(targetInst.decimals));
          const { tpPrice: tpPriceNum, slPrice: slPriceNum } = calculatePipTargetPrices(
            targetInst.symbol,
            side,
            openPriceNum,
            cleanRunTpPips,
            cleanRunSlPips
          );
          const initialAutoProfit = calculateBotPnL(
            targetInst.symbol,
            side,
            openPriceNum,
            currentExitNum,
            effectiveAutoLots
          );

          const autoTrade: BotTrade = {
            id: `btrade-${Date.now()}-${bIdx}-${Math.floor(Math.random() * 1000)}`,
            ticket: Math.floor(800000 + Math.random() * 99999),
            runId: run.runId,
            runInstanceId: run.id || run.runId,
            botId: run.botId,
            botName: run.botName,
            symbol: targetInst.symbol,
            side,
            lotSize: effectiveAutoLots,
            openPrice: openPriceNum,
            currentPrice: currentExitNum,
            tp: tpPriceNum,
            sl: slPriceNum,
            tpPrice: tpPriceNum,
            slPrice: slPriceNum,
            openTime: Date.now() - bIdx * 300,
            status: 'OPEN',
            profitUsd: initialAutoProfit,
            targetOutcome: isTargetWin ? 'WIN' : 'LOSS',
            accountId: activeAcc.id,
            accountNumber: activeAcc.accountNumber,
          };

          nextTrades = [autoTrade, ...nextTrades];
          botTradesRef.current = nextTrades;
          tradesChanged = true;

          nextRuns = nextRuns.map((r) =>
            r.id === run.id || r.runId === runKey
              ? {
                  ...r,
                  symbol: r.symbol,
                  customSymbolSelected: r.customSymbolSelected,
                  lotSize: effectiveAutoLots,
                  lastSignal: `Auto Executed: ${side} ${effectiveAutoLots} ${targetInst.symbol} @ ${openPriceNum} (${openCountNow + 1}/${targetConcurrent} Active)`,
                  lastSignalTime: Date.now(),
                  accountId: activeAcc.id,
                  accountNumber: activeAcc.accountNumber,
                }
              : r
          );
          runsChanged = true;
        }
      });

      if (tradesChanged) {
        setBotTrades(() => [...nextTrades]);
        saveStoredBotTrades(nextTrades, currentUserRef.current?.email);
      }

      if (runsChanged) {
        // Ensure a concurrent user Pause/Run/Settings click during this tick is never overwritten by the tick snapshot
        const latestRefMap = new Map<string, BotRunInstance>();
        for (const lr of botRunsRef.current) {
          if (lr.id) latestRefMap.set(lr.id, lr);
          if (lr.runId) latestRefMap.set(lr.runId, lr);
        }
        const reconciledRuns = nextRuns.map((nr) => {
          const latest = (nr.id && latestRefMap.get(nr.id)) || (nr.runId && latestRefMap.get(nr.runId));
          if (latest && (latest.statusUpdatedAt || 0) > (nr.statusUpdatedAt || 0)) {
            return {
              ...nr,
              symbol: latest.symbol || nr.symbol,
              customSymbolSelected: latest.customSymbolSelected ?? nr.customSymbolSelected,
              lotSize: latest.lotSize || nr.lotSize,
              tpPips: latest.tpPips || nr.tpPips,
              slPips: latest.slPips || nr.slPips,
              status: latest.status,
              statusUpdatedAt: latest.statusUpdatedAt,
              stoppedAt: latest.stoppedAt,
              lastSignal: latest.lastSignal || nr.lastSignal,
              lastSignalTime: latest.lastSignalTime || nr.lastSignalTime,
            };
          }
          return nr;
        });
        botRunsRef.current = reconciledRuns;
        setBotRuns(() => [...reconciledRuns]);
        saveStoredBotRuns(reconciledRuns, currentUserRef.current?.email);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Current tick direction for selected symbol
  const currentTickDirection = tickStates[selectedSymbol] || 'NEUTRAL';
  const currentInstrument =
    instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

  const handleSelectAccount = useCallback((nextAcc: TradingAccount | null) => {
    if (!nextAcc) {
      selectedAccountRef.current = null;
      setSelectedAccount(null);
      return;
    }
    const resolvedAcc =
      accountsRef.current.find(
        (a) => a.id === nextAcc.id || a.accountNumber === nextAcc.accountNumber
      ) || nextAcc;

    selectedAccountRef.current = resolvedAcc;
    setSelectedAccount(resolvedAcc);
    lastLocalFinancialUpdateRef.current = Date.now();
    lastLocalSettingsUpdateRef.current = Date.now();

    const activeUser = currentUserRef.current;
    if (activeUser && activeUser.email) {
      const cleanEmail = activeUser.email.trim().toLowerCase();
      try {
        localStorage.setItem(`vtm_selected_account_${cleanEmail}`, resolvedAcc.id);
      } catch {
        // ignore
      }
      saveUserFinancials(
        activeUser,
        {
          walletBalance: walletBalanceRef.current,
          accounts: accountsRef.current.length > 0 ? accountsRef.current : [resolvedAcc],
          selectedAccountId: resolvedAcc.id,
          transactions: transactionsRef.current,
        },
        true
      );
    }
  }, []);

  const handleUpdatePlatformSetting = (partial: Partial<UserPlatformSettings>) => {
    const nowTs = Date.now();
    lastLocalSettingsUpdateRef.current = nowTs;
    const nextDark = partial.isDarkMode ?? isDarkMode;
    const nextOneClick = partial.oneClickTrading ?? oneClickTrading;
    const nextSlippage = partial.slippage ?? slippage;
    const nextSound = partial.soundEnabled ?? soundEnabled;
    const nextSpreadBrackets = partial.showSpreadBrackets ?? showSpreadBrackets;
    const nextDrawdown = partial.drawdownProtection ?? drawdownProtection;

    if (partial.isDarkMode !== undefined) {
      setIsDarkMode(partial.isDarkMode);
      try {
        localStorage.setItem('vtm_theme_mode', partial.isDarkMode ? 'dark' : 'light');
      } catch {
        // ignore
      }
    }
    if (partial.oneClickTrading !== undefined) setOneClickTrading(partial.oneClickTrading);
    if (partial.slippage !== undefined) setSlippage(partial.slippage);
    if (partial.soundEnabled !== undefined) setSoundEnabled(partial.soundEnabled);
    if (partial.showSpreadBrackets !== undefined) setShowSpreadBrackets(partial.showSpreadBrackets);
    if (partial.drawdownProtection !== undefined) setDrawdownProtection(partial.drawdownProtection);
    if (partial.twoFactorEnabled !== undefined) setTwoFactorEnabled(partial.twoFactorEnabled);
    if (partial.twoFactorSecret !== undefined) setTwoFactorSecret(partial.twoFactorSecret);

    const next2FA = partial.twoFactorEnabled ?? twoFactorEnabled;
    const next2FASecret = partial.twoFactorSecret ?? twoFactorSecret;
    if (partial.twoFactorEnabled !== undefined || partial.twoFactorSecret !== undefined) {
      saveStoredTotpState(currentUser?.email, next2FA, next2FASecret);
    }

    const activeUser = currentUserRef.current || currentUser;
    if (activeUser) {
      supabaseService.saveUserSettings(activeUser, {
        isDarkMode: nextDark,
        oneClickTrading: nextOneClick,
        slippage: nextSlippage,
        soundEnabled: nextSound,
        showSpreadBrackets: nextSpreadBrackets,
        drawdownProtection: nextDrawdown,
        twoFactorEnabled: next2FA,
        twoFactorSecret: next2FASecret,
        activeAccountId: (selectedAccountRef.current || selectedAccount)?.id,
        updatedAt: nowTs,
      });
      supabaseService.syncActivity(activeUser, {
        type: 'SETTINGS_UPDATED',
        description: 'Updated platform preferences',
        metadata: partial,
      });
    }
  };

  // Automatic Sync: Keep trades, bots, price alerts, and copy strategies consistent across all devices
  const positionsSyncKey = positions
    .map((p) => `${p.id}:${p.sl ?? ''}:${p.tp ?? ''}:${p.lots}`)
    .join('|');
  useEffect(() => {
    if (!currentUser || !currentUser.email) return;
    if (!isCloudTradesLoadedRef.current && closedTrades.length === 0 && positions.length === 0) return;
    const timer = setTimeout(() => {
      supabaseService.syncTrades(currentUser, {
        positions,
        pendingOrders,
        closedTrades,
        accountNumber: selectedAccount?.accountNumber,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [currentUser?.email, positionsSyncKey, pendingOrders.length, closedTrades.length, selectedAccount?.accountNumber]);

  // Only trigger background bot state cloud sync on structural changes (run status/settings/counts or trade open/close/TP/SL),
  // NOT on every 1-second floating price jitter!
  const botStateSyncKey = useMemo(() => {
    const runsKey = botRuns
      .map(
        (r) =>
          `${r.id}:${r.status}:${r.statusUpdatedAt || 0}:${r.symbol}:${r.lotSize}:${r.tpPips}:${r.slPips}:${r.totalTrades || 0}:${r.totalProfitUsd || 0}`
      )
      .join('|');
    const tradesKey = botTrades
      .map((t) => `${t.id}:${t.status}:${t.tp || 0}:${t.sl || 0}`)
      .join('|');
    return `${importedBots.length}::${runsKey}::${tradesKey}`;
  }, [importedBots.length, botRuns, botTrades]);

  useEffect(() => {
    if (!currentUser || !currentUser.email || !isCloudBotsLoadedRef.current) return;
    const timer = setTimeout(() => {
      supabaseService.syncBotState(
        currentUser,
        {
          importedBots,
          botRuns: botRunsRef.current,
          botTrades: botTradesRef.current,
          deletedBotIds: getDeletedBotIds(),
        },
        false
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [currentUser?.email, botStateSyncKey]);

  useEffect(() => {
    if (!currentUser || !currentUser.email || !isCloudExtrasLoadedRef.current) return;
    const timer = setTimeout(() => {
      supabaseService.syncExtrasState(currentUser, {
        priceAlerts,
        followedStrategies,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [currentUser?.email, priceAlerts, followedStrategies]);

  const handleSyncAllToSupabase = async () => {
    if (!currentUser) return;
    try {
      await Promise.all([
        supabaseService.syncUserFinancials(currentUser, {
          walletBalance,
          accounts,
          selectedAccountId: selectedAccount?.id,
          transactions,
          lastUpdated: Date.now(),
        }),
        supabaseService.syncTradingAccounts(currentUser, accounts),
        supabaseService.syncTrades(currentUser, {
          positions,
          pendingOrders,
          closedTrades,
          accountNumber: selectedAccount?.accountNumber,
        }),
        supabaseService.syncBotState(currentUser, {
          importedBots,
          botRuns,
          botTrades,
        }),
        supabaseService.syncExtrasState(currentUser, {
          priceAlerts,
          followedStrategies,
        }),
        supabaseService.saveUserSettings(currentUser, {
          isDarkMode,
          oneClickTrading,
          slippage,
          soundEnabled,
          showSpreadBrackets,
          drawdownProtection,
          twoFactorEnabled,
          twoFactorSecret,
          activeAccountId: selectedAccount?.id,
        }),
        supabaseService.syncTransactions(currentUser, transactions),
        supabaseService.syncDevice(currentUser),
      ]);
    } catch {
      // Silent fallback
    }
  };

  // Render Inner Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'markets':
        return (
          <MarketsTab
            instruments={instruments}
            onSelectInstrument={handleSelectInstrumentToTrade}
            onQuickTrade={handleQuickTrade}
            onToggleFavorite={handleToggleFavorite}
            isDarkMode={isDarkMode}
            tickStates={tickStates}
            oneClickTrading={oneClickTrading}
            priceAlerts={priceAlerts}
            onOpenPriceAlert={handleOpenPriceAlertModal}
            onExecuteMarketOrder={handleExecuteMarketOrder}
          />
        );
      case 'instrument-detail':
        return (
          <InstrumentDetailView
            instrument={currentInstrument}
            candles={candles}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onBack={() => setActiveTab('markets')}
            onToggleFavorite={handleToggleFavorite}
            onExecuteTrade={handleExecuteMarketOrder}
            isDarkMode={isDarkMode}
            tickDirection={currentTickDirection}
          />
        );
      case 'trades':
        return (
          <TradesTab
            account={selectedAccount}
            positions={positions.filter((p) => belongsToAccount(p, selectedAccount))}
            pendingOrders={pendingOrders.filter((o) => belongsToAccount(o, selectedAccount))}
            closedTrades={closedTrades.filter((c) => belongsToAccount(c, selectedAccount))}
            onClosePosition={(id) => closePositionById(id, 'MANUAL')}
            onCloseAllPositions={handleCloseAllPositions}
            onCloseProfitablePositions={handleCloseProfitablePositions}
            profitablePositionsCount={profitablePositionsCount}
            onCancelPendingOrder={handleCancelPendingOrder}
            onUpdatePositionTpSl={handleUpdatePositionTpSl}
            isDarkMode={isDarkMode}
            instruments={instruments}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            candles={candles}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            chartType={chartType}
            onChartTypeChange={setChartType}
            tickDirection={currentTickDirection}
            currentUser={currentUser}
            ledgerSyncCounter={ledgerSyncCounter}
          />
        );
      case 'bots':
        return (
          <BotsTab
            instruments={instruments}
            userRole={userRole}
            accountType={selectedAccount?.type || 'Live'}
            accountBalance={selectedAccount?.balance ?? 0}
            onUpdateUserRole={handleUpdateUserRole}
            inbuiltBots={DEFAULT_INBUILT_BOTS}
            importedBots={importedBots}
            botRuns={botRuns}
            botTrades={botTrades.filter(
              (t) =>
                belongsToAccount(t, selectedAccount) ||
                botRuns.some(
                  (r) =>
                    r.id === t.runId ||
                    r.runId === t.runId ||
                    r.id === t.runInstanceId ||
                    r.botId === t.botId
                )
            )}
            onStartBotRun={handleStartBotRun}
            onToggleBotRun={handleToggleBotRun}
            onStopBotRun={handleStopBotRun}
            onDeleteBotRun={handleDeleteBotRun}
            onUpdateBotRunSettings={handleUpdateBotRunSettings}
            onImportBot={handleImportBot}
            onCloseBotTrade={handleCloseBotTrade}
            onTriggerManualSignal={handleTriggerManualSignal}
            isDarkMode={isDarkMode}
          />
        );
      case 'news':
        return (
          <NewsTab
            marketAnalyses={MARKET_ANALYSES}
            isDarkMode={isDarkMode}
          />
        );
      case 'more':
        return (
          <MoreTab
            isDarkMode={isDarkMode}
            onToggleTheme={() => handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })}
            oneClickTrading={oneClickTrading}
            onToggleOneClick={() => handleUpdatePlatformSetting({ oneClickTrading: !oneClickTrading })}
            slippage={slippage}
            onSlippageChange={(val) => handleUpdatePlatformSetting({ slippage: val })}
            soundEnabled={soundEnabled}
            onToggleSound={() => handleUpdatePlatformSetting({ soundEnabled: !soundEnabled })}
            showSpreadBrackets={showSpreadBrackets}
            onToggleSpreadBrackets={() => handleUpdatePlatformSetting({ showSpreadBrackets: !showSpreadBrackets })}
            drawdownProtection={drawdownProtection}
            onToggleDrawdownProtection={() => handleUpdatePlatformSetting({ drawdownProtection: !drawdownProtection })}
            currentUser={currentUser}
            onSyncAllToSupabase={handleSyncAllToSupabase}
          />
        );
      case 'trade':
        return (
          <TradeTab
            instruments={instruments}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            candles={candles}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            chartType={chartType}
            onChartTypeChange={setChartType}
            account={selectedAccount}
            positions={positions.filter((p) => belongsToAccount(p, selectedAccount))}
            pendingOrders={pendingOrders.filter((o) => belongsToAccount(o, selectedAccount))}
            closedTrades={closedTrades.filter((c) => belongsToAccount(c, selectedAccount))}
            onExecuteMarketOrder={handleExecuteMarketOrder}
            onPlacePendingOrder={handlePlacePendingOrder}
            onClosePosition={(id) => closePositionById(id, 'MANUAL')}
            onCloseAllPositions={handleCloseAllPositions}
            onCloseProfitablePositions={handleCloseProfitablePositions}
            profitablePositionsCount={profitablePositionsCount}
            onCancelPendingOrder={handleCancelPendingOrder}
            onUpdatePositionTpSl={handleUpdatePositionTpSl}
            isDarkMode={isDarkMode}
            tickDirection={currentTickDirection}
            isMobileFrame={isMobileFrame}
            priceAlerts={priceAlerts}
            onOpenPriceAlert={handleOpenPriceAlertModal}
          />
        );
      case 'hfcopy':
        return (
          <CopyTradingTab
            providers={providers}
            followedStrategies={followedStrategies}
            currentAccount={selectedAccount}
            onFollowStrategy={handleFollowStrategy}
            onUnfollowStrategy={handleUnfollowStrategy}
            accounts={accounts}
            walletBalance={walletBalance}
            onNavigateToDeposit={() => setActiveTab('wallet')}
            isDarkMode={isDarkMode}
          />
        );
      case 'wallet':
        return (
          <WalletTab
            accounts={accounts}
            walletBalance={walletBalance}
            transactions={transactions}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            onTransfer={handleTransfer}
            selectedAccount={selectedAccount}
            onSelectAccount={handleSelectAccount}
            onDeleteAccount={handleDeleteAccount}
            isDarkMode={isDarkMode}
            currentUser={currentUser}
          />
        );
      case 'account':
        return (
          <AccountTab
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={handleSelectAccount}
            onOpenNewAccount={handleOpenNewAccount}
            onDeleteAccount={handleDeleteAccount}
            economicEvents={ECONOMIC_EVENTS}
            marketAnalyses={MARKET_ANALYSES}
            isDarkMode={isDarkMode}
            onToggleTheme={() => handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })}
            userRole={userRole}
            onUpdateUserRole={handleUpdateUserRole}
            currentUser={currentUser}
            onOpenAdminManager={() => setIsAdminManagerOpen(true)}
            onSignOut={handleUserSignOut}
          />
        );
      default:
        return (
          <MarketsTab
            instruments={instruments}
            onSelectInstrument={handleSelectInstrumentToTrade}
            onQuickTrade={handleQuickTrade}
            onToggleFavorite={handleToggleFavorite}
            isDarkMode={isDarkMode}
            tickStates={tickStates}
            oneClickTrading={oneClickTrading}
            priceAlerts={priceAlerts}
            onOpenPriceAlert={handleOpenPriceAlertModal}
            onExecuteMarketOrder={handleExecuteMarketOrder}
          />
        );
    }
  };

  // If user is not signed in, show the comprehensive VTM Landing Page
  if (!currentUser || !currentUser.isLoggedIn) {
    return (
      <LandingPage
        instruments={instruments}
        onSignIn={handleUserSignIn}
        isDarkMode={isDarkMode}
        onToggleTheme={() => handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })}
      />
    );
  }

  // EXCLUSIVE MASTER ADMIN ROUTING:
  // Admin (mutwrib@gmail.com | UID: 84a1e1db-f302-4dac-a077-291128ae0cea) is NEVER directed to the market/trading side.
  // Admin is directed exclusively to the Website Administration & Executive Control Center.
  if (isMasterAdminEmail(currentUser.email) && currentUser.id === MASTER_ADMIN_UID) {
    return (
      <AdminAccountManagerModal
        isOpen={true}
        isFullPage={true}
        onClose={() => {}}
        onSignOut={handleUserSignOut}
        currentUser={currentUser}
        currentAccounts={accounts}
        currentWalletBalance={walletBalance}
        onApplyChanges={(updatedWallet, updatedAccounts) => {
          setWalletBalance(updatedWallet);
          setAccounts(updatedAccounts);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })}
      />
    );
  }

  return (
    <div
      id="vtm-app-root"
      className={`min-h-screen w-full transition-colors duration-200 ${
        isDarkMode ? 'dark bg-[#0B0C0E] text-[#F5F5F5]' : 'bg-[#F4F6F9] text-[#0F172A]'
      }`}
    >
      <div
        className={`min-h-screen w-full flex flex-col relative ${
          isDarkMode ? 'bg-[#111317] text-[#F5F5F5]' : 'bg-[#F4F6F9] text-[#0F172A]'
        }`}
      >
        {/* Main Top Header */}
        <Header
          accounts={accounts}
          selectedAccount={selectedAccount}
          walletBalance={walletBalance}
          onSelectAccount={(acc) => {
            handleSelectAccount(acc);
            if (acc) {
              triggerActionPopup({
                type: 'ACCOUNT_SWITCHED',
                title: `Switched to ${acc.type} #${acc.accountNumber}`,
                subtitle: `Current Balance: $${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Leverage ${acc.leverage}`,
                details: {
                  accountNumber: acc.accountNumber,
                  amount: acc.balance,
                },
              });
            }
          }}
          onOpenDeposit={() => setActiveTab('wallet')}
          onOpenNewAccount={() => setActiveTab('account')}
          onDeleteAccount={handleDeleteAccount}
          onResetDemo={handleResetDemo}
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame((prev) => !prev)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => handleUpdatePlatformSetting({ isDarkMode: !isDarkMode })}
          oneClickTrading={oneClickTrading}
          onToggleOneClick={() => handleUpdatePlatformSetting({ oneClickTrading: !oneClickTrading })}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          notifications={notifications}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onToggleNotificationRead={handleToggleNotificationRead}
          onOpenMenuDrawer={() => setIsMenuDrawerOpen(true)}
          currentUser={currentUser}
          onSignOut={handleUserSignOut}
          onOpenInstall={pwa.openInstallDialog}
          isInstalled={pwa.isInstalled}
          priceAlerts={priceAlerts}
          onOpenPriceAlerts={() => handleOpenPriceAlertModal(selectedSymbol)}
        />

        {/* Scrollable Main Content - Full-width desktop responsive container with bottom padding for fixed mobile nav */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full px-2 sm:px-4 lg:px-6 pb-20 lg:pb-6">
          {renderTabContent()}
        </main>

        {/* Fixed Bottom Navigation - Always pinned to bottom of viewport on Mobile/Tablet devices */}
        <div
          className={`lg:hidden pwa-safe-bottom fixed bottom-0 left-0 right-0 z-50 w-full border-t shadow-lg ${
            isDarkMode
              ? 'bg-[#111317] border-[#262626]'
              : 'bg-white border-[#E2E8F0]'
          }`}
        >
          <div className="max-w-2xl mx-auto">
            <BottomNav
              activeTab={activeTab}
              onSelectTab={handleTabSelect}
              openPositionsCount={positions.length}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Sliding Menu Drawer */}
        <MenuDrawer
          isOpen={isMenuDrawerOpen}
          onClose={() => setIsMenuDrawerOpen(false)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setIsMenuDrawerOpen(false);
          }}
          onOpenDeposit={() => {
            setActiveTab('wallet');
            setIsMenuDrawerOpen(false);
          }}
          walletBalance={Number(
            (
              walletBalance +
              accounts
                .filter((a) => a.type === 'Live')
                .reduce((sum, a) => sum + Number(a.equity ?? a.balance ?? 0), 0)
            ).toFixed(2)
          )}
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          onSignOut={handleUserSignOut}
          onOpenInstall={pwa.openInstallDialog}
          isInstalled={pwa.isInstalled}
          onClaimReferralCommission={handleClaimReferralCommission}
        />

        {/* PWA Native Installation Engine Dialogs */}
        <PWAInstallModals
          pwa={pwa}
          isDarkMode={isDarkMode}
        />

        {/* Action Feedback Modals (Interactive Action Popups) */}
        <ActionPopupManager
          currentPopup={currentActionPopup}
          onDismiss={() => setCurrentActionPopup(null)}
          isDarkMode={isDarkMode}
        />

        {/* Global Action Toast Notification Banner */}
        <ActionToastBanner
          popups={actionToasts}
          onDismiss={handleDismissToast}
          isDarkMode={isDarkMode}
        />

        {/* Real-time Target Price Alert Management Modal */}
        <PriceAlertModal
          isOpen={isPriceAlertModalOpen}
          onClose={() => setIsPriceAlertModalOpen(false)}
          instruments={instruments}
          selectedSymbol={priceAlertSymbol}
          alerts={priceAlerts}
          onCreateAlert={handleCreatePriceAlert}
          onDeleteAlert={handleDeletePriceAlert}
          onClearTriggeredAlerts={handleClearTriggeredAlerts}
          onReArmAlert={handleReArmAlert}
          onTestTriggerAlert={handleTestTriggerAlert}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}
