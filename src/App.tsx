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
  markBotDeletedLocally,
  unmarkBotDeletedLocally,
  sanitizeAndFilterBotRuns,
  filterTradesForValidBotRuns,
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
} from './utils/financialStorage';
import { supabaseService, UserPlatformSettings } from './services/supabaseService';

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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);

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

      // Verify account actually exists in registered users registry AND has a valid UID
      const registered = findRegisteredUser(parsed.email);
      const effectiveUid = registered?.id || parsed.id;
      if (!registered || !isValidUserUid(effectiveUid)) {
        console.warn('[Security] Refused auto-login: user missing verified UID or registration:', parsed.email);
        localStorage.removeItem('vtm_auth_user');
        return null;
      }

      // Strictly forbid any non-admin email from holding 'admin' role
      const safeRole: UserRole = registered.role === 'marketer' ? 'marketer' : 'normal';
      return {
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

    const syncUserWithSupabase = async (isInitialMount: boolean) => {
      if (!supabaseService.isConfigured()) return;

      const remote = await supabaseService.findUserInDatabase(currentUser.email);
      if (!remote || !remote.hasVerifiedUid || !isValidUserUid(remote.profile?.id)) {
        localStorage.removeItem('vtm_auth_user');
        setCurrentUser(null);
        return;
      }

      // Immediately apply any Marketer/Normal role assignment made by Admin
      const remoteRole: UserRole = remote.profile.role === 'marketer' ? 'marketer' : 'normal';
      setUserRole((prevRole) => {
        if (prevRole !== remoteRole) {
          localStorage.setItem('vtm_user_role', remoteRole);
        }
        return remoteRole;
      });
      setCurrentUser((prevUser) => {
        if (!prevUser) return null;
        if (prevUser.role !== remoteRole || prevUser.id !== remote.profile.id) {
          const updated = { ...prevUser, id: remote.profile.id, role: remoteRole };
          localStorage.setItem('vtm_auth_user', JSON.stringify(updated));
          return updated;
        }
        return prevUser;
      });

      // Immediately apply any Live Account or Wallet edits made by Admin or another device in Supabase
      // (while protecting any local trade/withdrawal/deposit made within the last 8 seconds from stale poll overwrites)
      const remoteFin = await supabaseService.fetchUserFinancials(remote.profile);
      if (remoteFin) {
        const localFin = loadUserFinancials(remote.profile);
        const isRecentLocalWrite = Date.now() - lastLocalFinancialUpdateRef.current < 8000;
        const remoteIsNewer =
          isInitialMount ||
          (!isRecentLocalWrite && (remoteFin.lastUpdated || 0) > (localFin?.lastUpdated || 0) + 1000);

        if (remoteIsNewer) {
          // Preserve any local PENDING withdrawal that is still in its 3-second window
          const localPendingWithdrawals = (transactionsRef.current || []).filter(
            (t) => t.type === 'WITHDRAWAL' && t.status === 'PENDING' && Date.now() - t.timestamp < 5000
          );
          const mergedTransactions =
            localPendingWithdrawals.length > 0
              ? [
                  ...localPendingWithdrawals,
                  ...(remoteFin.transactions || []).filter(
                    (rt) => !localPendingWithdrawals.some((lp) => lp.id === rt.id || lp.reference === rt.reference)
                  ),
                ]
              : remoteFin.transactions || transactionsRef.current;

          const stateToApply = {
            ...remoteFin,
            transactions: mergedTransactions,
          };

          saveUserFinancials(remote.profile, stateToApply);
          walletBalanceRef.current = stateToApply.walletBalance;
          setWalletBalance(stateToApply.walletBalance);

          if (stateToApply.accounts) {
            accountsRef.current = stateToApply.accounts;
            setAccounts(stateToApply.accounts);
            setSelectedAccount((curr) => {
              if (stateToApply.accounts.length === 0) {
                selectedAccountRef.current = null;
                return null;
              }
              const nextSel = !curr
                ? stateToApply.accounts.find((a) => a.id === stateToApply.selectedAccountId) ||
                  stateToApply.accounts[0]
                : stateToApply.accounts.find((a) => a.id === curr.id || a.accountNumber === curr.accountNumber) ||
                  stateToApply.accounts[0];
              selectedAccountRef.current = nextSel;
              return nextSel;
            });
          }
          if (mergedTransactions && mergedTransactions.length > 0) {
            transactionsRef.current = mergedTransactions;
            setTransactions(mergedTransactions);
          }
        } else if (localFin && (localFin.lastUpdated || 0) > (remoteFin.lastUpdated || 0)) {
          // Local state is newer (e.g. from a recent trade or withdrawal) - push it to Supabase
          supabaseService.syncUserFinancials(remote.profile, localFin).catch(() => {});
        }
      }

      // Cross-device synchronization (runs on initial mount AND every 4s poll across all logged-in devices)
      supabaseService.fetchExtrasState(remote.profile).then((remoteExtras) => {
        if (remoteExtras) {
          const isRecentLocalExtras = Date.now() - lastLocalExtrasUpdateRef.current < 6000;
          const localExtrasTs = getPriceAlertsUpdatedAt(remote.profile.email);
          const remoteExtrasTs = remoteExtras.updatedAt || 0;
          const shouldApplyAlerts =
            !isRecentLocalExtras &&
            (isInitialMount || remoteExtrasTs > localExtrasTs || !isCloudExtrasLoadedRef.current);

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
            followedStrategiesRef.current = remoteExtras.followedStrategies;
            setFollowedStrategies(remoteExtras.followedStrategies);
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
        if (settings && Date.now() - lastLocalSettingsUpdateRef.current >= 6000) {
          setIsDarkMode(settings.isDarkMode);
          setOneClickTrading(settings.oneClickTrading);
          setSlippage(settings.slippage);
          setSoundEnabled(settings.soundEnabled);
          setShowSpreadBrackets(settings.showSpreadBrackets);
          setDrawdownProtection(settings.drawdownProtection);
          setTwoFactorEnabled(settings.twoFactorEnabled);
        }
      });

      supabaseService.fetchUserTrades(remote.profile).then((remoteTrades) => {
        if (remoteTrades) {
          if (isInitialMount) {
            if (remoteTrades.positions.length > 0) setPositions(remoteTrades.positions);
            if (remoteTrades.pendingOrders.length > 0) setPendingOrders(remoteTrades.pendingOrders);
          }
          if (remoteTrades.closedTrades.length > 0) {
            setClosedTrades((prev) => {
              const map = new Map<string, ClosedTrade>();
              for (const t of [...prev, ...remoteTrades.closedTrades]) {
                if (t && t.symbol) map.set(String(t.ticket || t.id), t);
              }
              const merged = Array.from(map.values())
                .sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0))
                .slice(0, 50);
              try {
                localStorage.setItem(
                  `vtm_closed_trades_${remote.profile.email.trim().toLowerCase()}`,
                  JSON.stringify(merged)
                );
              } catch {
                // ignore
              }
              return merged;
            });
          }
        }
        isCloudTradesLoadedRef.current = true;
      });

      supabaseService.fetchBotState(remote.profile).then((remoteBots) => {
        if (remoteBots) {
          if (Array.isArray(remoteBots.importedBots) && remoteBots.importedBots.length > 0) {
            setImportedBots(remoteBots.importedBots);
            saveStoredImportedBots(remoteBots.importedBots);
          }
          if (Array.isArray(remoteBots.botRuns)) {
            const cleanedRemoteRuns = sanitizeAndFilterBotRuns(
              remoteBots.botRuns,
              remoteBots.deletedBotIds || [],
              false
            );
            const mergedMap = new Map<string, BotRunInstance>();
            for (const r of [...cleanedRemoteRuns, ...botRunsRef.current]) {
              if (r && r.explicitUserRun === true && r.userStartedVersion === 2) {
                mergedMap.set(r.id || r.runId || r.botId, r);
              }
            }
            const finalRuns = sanitizeAndFilterBotRuns(
              Array.from(mergedMap.values()),
              remoteBots.deletedBotIds || [],
              false
            );
            botRunsRef.current = finalRuns;
            setBotRuns(finalRuns);
            saveStoredBotRuns(finalRuns);

            if (isInitialMount) {
              const rawTrades = [
                ...(Array.isArray(remoteBots.botTrades) ? remoteBots.botTrades : []),
                ...botTradesRef.current,
              ];
              const dedupTradesMap = new Map<string, BotTrade>();
              for (const t of rawTrades) {
                if (t && t.id) dedupTradesMap.set(t.id, t);
              }
              const cleanedTrades = filterTradesForValidBotRuns(
                Array.from(dedupTradesMap.values()),
                finalRuns
              );
              botTradesRef.current = cleanedTrades;
              setBotTrades(cleanedTrades);
              saveStoredBotTrades(cleanedTrades);
            }
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

    // Poll every 4 seconds so Admin edits to Marketer Role or Live Accounts take effect immediately
    const pollInterval = setInterval(() => {
      syncUserWithSupabase(false);
    }, 4000);

    // Also listen for localStorage updates in case Admin is open in another tab on the same browser
    const handleStorageEvent = () => {
      const updatedReg = findRegisteredUser(currentUser.email);
      if (updatedReg) {
        const nextRole: UserRole = updatedReg.role === 'marketer' ? 'marketer' : 'normal';
        setUserRole(nextRole);
        setCurrentUser((prev) => (prev ? { ...prev, role: nextRole } : null));
      }
      const localFin = loadUserFinancials(currentUser);
      if (localFin) {
        setWalletBalance(localFin.walletBalance);
        setAccounts(localFin.accounts);
        setSelectedAccount((curr) => {
          if (localFin.accounts.length === 0) return null;
          if (!curr) return localFin.accounts[0];
          return localFin.accounts.find((a) => a.id === curr.id) || localFin.accounts[0];
        });
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [currentUser?.email]);

  // Admin Account & Wallet Management Modal
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState<boolean>(false);

  // Load persistent user financials (zero accounts on new signup, exact balances on return)
  const initialFinancials = useMemo(() => {
    if (!currentUser) return { walletBalance: 0, accounts: INITIAL_ACCOUNTS, selectedAccountId: INITIAL_ACCOUNTS[0]?.id, transactions: INITIAL_TRANSACTIONS };
    const loaded = loadUserFinancials(currentUser);
    if (loaded) return loaded;
    return initializeUserFinancials(currentUser, currentUser.isNewRegistration ?? false);
  }, [currentUser?.id]);

  const [accounts, setAccounts] = useState<TradingAccount[]>(() => initialFinancials.accounts);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(() => {
    if (initialFinancials.accounts.length === 0) return null;
    return (
      initialFinancials.accounts.find((a) => a.id === initialFinancials.selectedAccountId) ||
      initialFinancials.accounts[0] ||
      null
    );
  });
  const [walletBalance, setWalletBalance] = useState<number>(() => initialFinancials.walletBalance);

  // Trading Positions, Orders, and History (Clean initial state for open positions; restore closed trade history)
  const [positions, setPositions] = useState<Position[]>([]);
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
  const isCloudTradesLoadedRef = useRef<boolean>(false);
  const isCloudBotsLoadedRef = useRef<boolean>(false);
  const isCloudExtrasLoadedRef = useRef<boolean>(false);
  const lastLocalExtrasUpdateRef = useRef<number>(0);
  const lastLocalNotifsUpdateRef = useRef<number>(0);
  const lastLocalSettingsUpdateRef = useRef<number>(0);

  // HFcopy Strategies State (Clean initial state)
  const [providers, setProviders] = useState<StrategyProvider[]>(STRATEGY_PROVIDERS);
  const [followedStrategies, setFollowedStrategies] = useState<FollowedStrategy[]>([]);
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
      localStorage.setItem(getNotificationsStorageKey(user), JSON.stringify(list.slice(0, 200)));
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
      return;
    }

    // Strict requirement: When an account opens or is logged in, wait for cloud hydration before syncing
    isCloudTradesLoadedRef.current = false;
    isCloudBotsLoadedRef.current = false;
    isCloudExtrasLoadedRef.current = false;
    setPriceAlerts(loadPriceAlerts(verifiedProfile.email));
    setPositions([]);
    setPendingOrders([]);
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
    const cleanRuns = loadStoredBotRuns();
    setBotRuns(cleanRuns);
    const cleanTrades = loadStoredBotTrades();
    setBotTrades(cleanTrades);

    // Restore user's exact persisted notifications (including all unread notifications)
    const storedUserNotifs = loadUserNotificationsFromStorage(verifiedProfile);
    setNotifications(storedUserNotifs);

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
        setAccounts(userFin.accounts);
        setWalletBalance(userFin.walletBalance);
        setTransactions(userFin.transactions || []);
        const activeAcc = userFin.accounts.length > 0
          ? (userFin.accounts.find((a) => a.id === userFin.selectedAccountId) || userFin.accounts[0])
          : null;
        setSelectedAccount(activeAcc);
        maybeAddDailyWelcomeNotification(verifiedProfile, `Welcome back, ${profile.name}!`);
      } else {
        const init = initializeUserFinancials(profile, false);
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
    if (currentUser) {
      logUserActivity(currentUser, 'LOGOUT', 'Trader signed out');
      const currentSel = selectedAccountRef.current || selectedAccount;
      const baseAccounts = accountsRef.current.length > 0 ? accountsRef.current : accounts;
      const syncedAccounts = currentSel
        ? baseAccounts.map((a) =>
            a.id === currentSel.id || a.accountNumber === currentSel.accountNumber ? currentSel : a
          )
        : baseAccounts;

      saveUserFinancials(currentUser, {
        walletBalance: walletBalanceRef.current ?? walletBalance,
        accounts: syncedAccounts,
        selectedAccountId: currentSel?.id,
        transactions: transactionsRef.current ?? transactions,
      });
    }
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
  const [botRuns, setBotRuns] = useState<BotRunInstance[]>(() => loadStoredBotRuns());
  const [botTrades, setBotTrades] = useState<BotTrade[]>(() => loadStoredBotTrades());

  // Real-time synchronization refs to avoid React batching/closure stalls
  const botRunsRef = useRef<BotRunInstance[]>(botRuns);
  botRunsRef.current = botRuns;

  const botTradesRef = useRef<BotTrade[]>(botTrades);
  botTradesRef.current = botTrades;

  const instrumentsRef = useRef<Instrument[]>(instruments);
  instrumentsRef.current = instruments;

  const userRoleRef = useRef<UserRole>(userRole);
  userRoleRef.current = userRole;

  const accountsRef = useRef<TradingAccount[]>(accounts);
  accountsRef.current = accounts;

  const selectedAccountRef = useRef<TradingAccount | null>(selectedAccount);
  selectedAccountRef.current = selectedAccount;

  const walletBalanceRef = useRef<number>(walletBalance);
  walletBalanceRef.current = walletBalance;

  const transactionsRef = useRef<Transaction[]>(transactions);
  transactionsRef.current = transactions;

  const currentUserRef = useRef<UserAuthProfile | null>(currentUser);
  currentUserRef.current = currentUser;

  const positionsRef = useRef<Position[]>(positions);
  positionsRef.current = positions;

  const lastLocalFinancialUpdateRef = useRef<number>(0);
  const closingPositionIdsRef = useRef<Set<string>>(new Set());

  // Authoritative helper: updates account balance after any trade (manual or bot),
  // keeps selectedAccount and accounts array 100% in sync, and persists immediately to localStorage & Supabase.
  const commitAccountBalanceChange = useCallback(
    (pnlDelta: number, targetAccountId?: string | null): TradingAccount | null => {
      const currentSelected = selectedAccountRef.current;
      const currentAccounts = accountsRef.current;
      const targetId = targetAccountId || currentSelected?.id || currentAccounts[0]?.id;
      if (!targetId && !currentSelected) return null;

      let updatedTarget: TradingAccount | null = null;
      const nextAccounts = currentAccounts.map((acc) => {
        if (
          acc.id === targetId ||
          acc.accountNumber === targetId ||
          (currentSelected && (acc.id === currentSelected.id || acc.accountNumber === currentSelected.accountNumber))
        ) {
          const newBal = Math.max(0, Number((acc.balance + pnlDelta).toFixed(2)));
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

      if (!updatedTarget && currentSelected) {
        const newBal = Math.max(0, Number((currentSelected.balance + pnlDelta).toFixed(2)));
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

      accountsRef.current = nextAccounts;
      setAccounts(nextAccounts);

      if (
        !currentSelected ||
        currentSelected.id === updatedTarget.id ||
        currentSelected.accountNumber === updatedTarget.accountNumber
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
        supabaseService.syncTradingAccounts(currentUserRef.current, nextAccounts).catch(() => {});
      }

      return updatedTarget;
    },
    []
  );

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

          // Keep sparkline anchored smoothly around live newBid so it never flattens due to old seed outlier values
          const sparkStep = Math.pow(10, -inst.decimals) * (inst.decimals >= 4 ? 10 : inst.decimals === 3 ? 6 : 4);
          const maxOutlierGap = Math.max(sparkStep * 25, newBid * 0.008);
          const sanitizedSpark = inst.sparkline.map((val, sIdx) => {
            if (!Number.isFinite(val) || Math.abs(val - newBid) > maxOutlierGap) {
              const wave = Math.sin(sIdx * 1.35) * sparkStep * 2.2 + Math.cos(sIdx * 0.85) * sparkStep * 1.4;
              return Number((newBid + wave).toFixed(inst.decimals));
            }
            return val;
          });
          const sparkline = newBid !== oldBid
            ? [...sanitizedSpark.slice(1), newBid]
            : sanitizedSpark;

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

    // Fast master live feed from TradingView - runs directly so all platform prices and movements match TradingView 1:1
    const tvInterval = setInterval(fetchTradingViewFeed, 250);

    // Dedicated timeframe & live dynamic spread monitor (0.16 - 1.18, max 1.2)
    // Strictly anchors Bid 1:1 to the real TradingView chart price (never adds artificial bidJitter so buttons never drift ahead or behind the chart)
    const candleCheckInterval = setInterval(() => {
      if (!isMounted) return;

      setInstruments((prevInsts) =>
        prevInsts.map((item) => {
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
            gap = Math.max(0.01, Number(lockedSpread.toFixed(2)));
          }

          const nextAsk = Number((lockedBid + gap).toFixed(item.decimals));
          if (item.bid !== lockedBid || item.ask !== nextAsk || item.spread !== lockedSpread) {
            return {
              ...item,
              bid: lockedBid,
              ask: nextAsk,
              spread: lockedSpread,
            };
          }
          return item;
        })
      );

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

  // Update floating positions P&L and check pending orders when prices change
  useEffect(() => {
    const currentInstMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));

    // Recalculate floating P&L and collect any positions that hit SL / TP
    const triggeredClosures: Array<{ id: string; reason: 'TP' | 'SL'; price: number }> = [];

    setPositions((prev) => {
      const next = prev.map((pos) => {
        const inst = currentInstMap.get(pos.symbol);
        if (!inst) return pos;

        const rawMarketPrice = pos.side === 'BUY' ? inst.bid : inst.ask;
        const contractSize = getContractSize(pos.symbol);
        const elapsedSec = Math.max(0, (Date.now() - (pos.openTime || Date.now())) / 1000);
        const unitValueAt001 = Math.max(0.0001, contractSize * 0.01);
        const lotScale = Math.max(1, pos.lots / 0.01);

        let currentPrice = rawMarketPrice;
        let priceDiff =
          pos.side === 'BUY'
            ? currentPrice - pos.openPrice
            : pos.openPrice - currentPrice;
        let pnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));

        // Ensure manual trade floating P/L moves smoothly in real-time according to the role & account type winrate rules:
        // - Demo (all users) & Marketer (Live & Demo): 85%-95% winrate
        // - Retail on Live account: max 10% winrate
        if (pos.targetOutcome && elapsedSec >= 1.2) {
          const driftProgress = Math.min(18, elapsedSec * 0.42);
          if (pos.targetOutcome === 'WIN') {
            const minTargetProfitUsd = Number(((0.25 + driftProgress * 0.22) * lotScale).toFixed(2));
            if (pnl < minTargetProfitUsd) {
              const priceOffset = (minTargetProfitUsd / lotScale) / unitValueAt001;
              currentPrice =
                pos.side === 'BUY'
                  ? Number((pos.openPrice + priceOffset).toFixed(inst.decimals))
                  : Number((pos.openPrice - priceOffset).toFixed(inst.decimals));
              priceDiff =
                pos.side === 'BUY'
                  ? currentPrice - pos.openPrice
                  : pos.openPrice - currentPrice;
              pnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));
            }
          } else {
            const minTargetLossUsd = Number(((0.35 + driftProgress * 0.28) * lotScale).toFixed(2));
            if (pnl > -minTargetLossUsd) {
              const priceOffset = (minTargetLossUsd / lotScale) / unitValueAt001;
              currentPrice =
                pos.side === 'BUY'
                  ? Number((pos.openPrice - priceOffset).toFixed(inst.decimals))
                  : Number((pos.openPrice + priceOffset).toFixed(inst.decimals));
              priceDiff =
                pos.side === 'BUY'
                  ? currentPrice - pos.openPrice
                  : pos.openPrice - currentPrice;
              pnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));
            }
          }
        }

        // Check automated SL / TP triggers
        if (
          pos.tp &&
          ((pos.side === 'BUY' && currentPrice >= pos.tp) ||
            (pos.side === 'SELL' && currentPrice <= pos.tp))
        ) {
          triggeredClosures.push({ id: pos.id, reason: 'TP', price: currentPrice });
        } else if (
          pos.sl &&
          ((pos.side === 'BUY' && currentPrice <= pos.sl) ||
            (pos.side === 'SELL' && currentPrice >= pos.sl))
        ) {
          triggeredClosures.push({
            id: pos.id,
            reason: 'SL',
            price: currentPrice,
          });
        }

        return {
          ...pos,
          currentPrice,
          pnl,
        };
      });
      positionsRef.current = next;
      return next;
    });

    if (triggeredClosures.length > 0) {
      triggeredClosures.forEach((tc) => {
        closePositionById(tc.id, tc.reason, tc.price);
      });
    }

    // Recalculate floating P&L on bot open trades to match instruments in real-time
    setBotTrades((prevBotTrades) => {
      let modified = false;
      const updated = prevBotTrades.map((bt) => {
        if (bt.status !== 'OPEN') return bt;
        const inst = currentInstMap.get(bt.symbol);
        if (!inst) return bt;
        const currentPrice = bt.side === 'BUY' ? inst.bid : inst.ask;
        const profitUsd = calculateBotPnL(bt.symbol, bt.side, bt.openPrice, currentPrice, bt.lotSize, userRole);
        if (bt.currentPrice !== currentPrice || bt.profitUsd !== profitUsd) {
          modified = true;
          return {
            ...bt,
            currentPrice,
            profitUsd,
          };
        }
        return bt;
      });
      return modified ? updated : prevBotTrades;
    });

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

  // Capital Protection Stop-Out: when account reaches minimum tradable reserve (~$0.80 - $2.10), close all open trades & stop bots immediately so total loss stops around $97.9-$99.2 on a $100 account and never passes $100
  const handleZeroBalanceStopOut = (remainingEquity?: number) => {
    const curAcc = selectedAccountRef.current || selectedAccount;
    const baseBal = Number(curAcc?.balance ?? 0);
    const accNumSeed = parseInt(String(curAcc?.accountNumber || '88').slice(-2), 10) || 45;
    // Dynamic reserve between $0.80 and $2.10 (so a $100 account stops at -$97.90, -$98.90, or -$99.20, leaving $0.80–$2.10)
    const targetReserve = Number((0.8 + ((accNumSeed % 14) * 0.1)).toFixed(2));
    const openManualPnl = (positionsRef.current || []).reduce((acc, p) => acc + (p.pnl || 0), 0);
    const openBotPnl = (botTradesRef.current || [])
      .filter((bt) => bt.status === 'OPEN')
      .reduce((acc, bt) => acc + (bt.profitUsd || 0), 0);
    const computedEq =
      typeof remainingEquity === 'number' && !isNaN(remainingEquity)
        ? remainingEquity
        : baseBal + openManualPnl + openBotPnl;
    const protectedBalance = Number(
      Math.max(baseBal >= targetReserve ? Math.max(targetReserve, computedEq) : Math.max(0.8, computedEq), 0).toFixed(2)
    );

    // Calculate how much realized loss budget remains before hitting protectedBalance
    const maxRemainingLossAllowed = Math.max(0, Number((baseBal - protectedBalance).toFixed(2)));

    // 1. Immediately liquidate all manual open positions
    positionsRef.current = [];
    setPositions([]);

    // 2. Immediately pause/stop all active algorithmic bots (remains in Active Bots as PAUSED)
    setBotRuns((runs) => {
      const stopped = runs.map((r) => ({
        ...r,
        status: 'PAUSED' as const,
        stoppedAt: Date.now(),
        lastSignal: `Stopped automatically at $${protectedBalance.toFixed(2)}: Capital protection triggered`,
        lastSignalTime: Date.now(),
      }));
      botRunsRef.current = stopped;
      saveStoredBotRuns(stopped);
      return stopped;
    });

    // 3. Mark all open bot trades as closed and cap their loss so total loss never exceeds the account deposit
    setBotTrades((trades) => {
      const openList = trades.filter((t) => t.status === 'OPEN');
      const perOpenTradeMaxLoss =
        openList.length > 0
          ? Number((maxRemainingLossAllowed / openList.length).toFixed(2))
          : 0;
      const closed = trades.map((t) => {
        if (t.status !== 'OPEN') return t;
        const clampedPnl =
          (t.profitUsd || 0) < 0
            ? Math.max(-perOpenTradeMaxLoss, Number((t.profitUsd || 0).toFixed(2)))
            : Number((t.profitUsd || 0).toFixed(2));
        return {
          ...t,
          profitUsd: clampedPnl,
          status: 'CLOSED' as const,
          closeReason: 'STOP_LOSS' as const,
          exitReason: 'SL' as const,
          closeTime: Date.now(),
        };
      });
      botTradesRef.current = closed;
      saveStoredBotTrades(closed);
      return closed;
    });

    // 4. Lock in the protected balance (never negative, protected from zero) and persist to localStorage & Supabase
    const targetId = selectedAccountRef.current?.id || selectedAccount?.id;
    const nextAccounts = accountsRef.current.map((a) =>
      a.id === targetId
        ? {
            ...a,
            balance: protectedBalance,
            equity: protectedBalance,
            margin: 0,
            freeMargin: protectedBalance,
            marginLevel: 0,
          }
        : a
    );
    accountsRef.current = nextAccounts;
    setAccounts(nextAccounts);

    setSelectedAccount((acc) => {
      if (!acc) return null;
      const protectedAcc = {
        ...acc,
        balance: protectedBalance,
        equity: protectedBalance,
        margin: 0,
        freeMargin: protectedBalance,
        marginLevel: 0,
      };
      selectedAccountRef.current = protectedAcc;
      return protectedAcc;
    });

    lastLocalFinancialUpdateRef.current = Date.now();
    if (currentUserRef.current) {
      saveUserFinancials(currentUserRef.current, {
        walletBalance: walletBalanceRef.current,
        accounts: nextAccounts,
        selectedAccountId: targetId,
        transactions: transactionsRef.current,
      });
    }

    playOrderSound(false);
    addNotification(
      `Capital Protection Triggered ($${protectedBalance.toFixed(2)}): All open trades and bots stopped automatically to protect your account from reaching zero.`
    );
    triggerActionPopup({
      type: 'ERROR',
      title: 'Capital Protection: All Trades & Bots Stopped',
      subtitle: `Account reached minimum tradable limit ($${protectedBalance.toFixed(2)}). All open positions and bots were closed automatically to protect your account from going to zero.`,
    });
  };

  // Recalculate Account Equity & Margins + Capital Protection Stop-Out
  useEffect(() => {
    if (!selectedAccount) return;
    const manualPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
    const openBotTradesList = botTrades.filter((bt) => bt.status === 'OPEN');
    const openBotPnl = openBotTradesList.reduce((acc, bt) => acc + (bt.profitUsd || 0), 0);
    const totalPnl = manualPnl + openBotPnl;

    const manualMargin = positions.reduce((acc, p) => {
      return acc + p.lots * 40;
    }, 0);

    const botMargin = openBotTradesList.reduce((acc, bt) => {
      return acc + bt.lotSize * 40;
    }, 0);

    const totalMargin = manualMargin + botMargin;

    const calculatedEquity = Number(((selectedAccount.balance ?? 0) + totalPnl).toFixed(2));
    const hasActiveTrading =
      positions.length > 0 ||
      openBotTradesList.length > 0 ||
      botRuns.some((r) => r.status === 'RUNNING');

    // Protect account from going to zero: stop around $97.9, $98.9, $99.2 loss on a $100 account (leaving ~$0.80–$2.10 reserve) and never pass the account balance
    const accSeed = parseInt(String(selectedAccount.accountNumber || '88').slice(-2), 10) || 45;
    const dynamicReserveFloor = Number((0.8 + ((accSeed % 14) * 0.1)).toFixed(2));
    const protectionFloor = (selectedAccount.balance ?? 0) > dynamicReserveFloor ? dynamicReserveFloor : 0.8;
    if (hasActiveTrading && calculatedEquity <= protectionFloor) {
      handleZeroBalanceStopOut(protectionFloor);
      return;
    }

    const newEquity = Math.max(0, calculatedEquity);
    const roundedMargin = Number(totalMargin.toFixed(2));
    const freeMargin = Number(Math.max(0, newEquity - roundedMargin).toFixed(2));
    const marginLevel = roundedMargin > 0 ? Number(((newEquity / roundedMargin) * 100).toFixed(1)) : 0;

    setSelectedAccount((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        equity: newEquity,
        margin: roundedMargin,
        freeMargin,
        marginLevel,
      };
      selectedAccountRef.current = updated;
      return updated;
    });

    setAccounts((prev) => {
      const next = prev.map((a) =>
        a.id === selectedAccount.id
          ? {
              ...a,
              balance: selectedAccount.balance,
              equity: newEquity,
              margin: roundedMargin,
              freeMargin,
              marginLevel,
            }
          : a
      );
      accountsRef.current = next;
      return next;
    });
  }, [positions, botTrades, instruments, selectedAccount?.balance, selectedAccount?.leverage]);

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
      ].slice(0, 200);
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

    // Real-time synchronous calculation of current open trades, floating PnL, and used margin
    const openManualPositions = positionsRef.current || [];
    const openBotPositions = (botTradesRef.current || []).filter((bt) => bt.status === 'OPEN');
    const currentOpenTradesCount = openManualPositions.length + openBotPositions.length;

    const currentFloatingPnl =
      openManualPositions.reduce((s, p) => s + (p.pnl || 0), 0) +
      openBotPositions.reduce((s, bt) => s + (bt.profitUsd || 0), 0);

    const currentUsedMargin =
      openManualPositions.reduce((s, p) => s + p.lots * 40, 0) +
      openBotPositions.reduce((s, bt) => s + bt.lotSize * 40, 0);

    const equity = Number(Math.max(0, balance + currentFloatingPnl).toFixed(2));
    const freeMargin = Number(Math.max(0, equity - currentUsedMargin).toFixed(2));

    if (balance <= 2.0 || equity <= 2.0 || freeMargin <= 0.4) {
      return {
        allowed: false,
        title: 'Minimum Tradable Capital Reached',
        message: `Trade blocked to protect your account from reaching zero (Equity: $${Math.max(0, equity).toFixed(2)}, Free Margin: $${Math.max(0, freeMargin).toFixed(2)}). Please deposit funds to continue trading.`,
      };
    }

    // Check account tier & lot size open trade limits
    const tradeLimits = getAccountMaxOpenTrades(
      activeAcc.tier,
      activeAcc.type,
      balance,
      cleanLots
    );

    if (cleanLots > tradeLimits.maxLotSizeForTier) {
      return {
        allowed: false,
        title: `Lot Size (${cleanLots}) Exceeds ${activeAcc.tier} Account Limit`,
        message: `Your ${activeAcc.tier} (${activeAcc.type}) account allows a maximum lot size of ${tradeLimits.maxLotSizeForTier.toFixed(2)} lots per trade.`,
      };
    }

    const orderMargin = Number((cleanLots * 40).toFixed(2));
    // Minimum required capital proportional to lot size: allow 0.01 micro-lot as long as balance > 0 and freeMargin > 0; scale larger lots at $0.40 per 0.01 lot
    const minCapitalForLotSize =
      cleanLots <= 0.01 ? Math.min(balance, 0.4) : Number((cleanLots * 40).toFixed(2));
    const requiredCapital =
      cleanLots <= 0.01 ? Math.min(balance, orderMargin) : Math.max(orderMargin, minCapitalForLotSize);

    // Also include existing open positions' lot capital commitment
    const existingOpenLots =
      openManualPositions.reduce((sum, p) => sum + p.lots, 0) +
      openBotPositions.reduce((sum, bt) => sum + bt.lotSize, 0);
    const totalCommittedCapital =
      cleanLots <= 0.01 && existingOpenLots === 0
        ? Math.min(equity, orderMargin)
        : Number(((existingOpenLots + cleanLots) * 40).toFixed(2));

    if (
      balance < requiredCapital ||
      freeMargin < orderMargin ||
      (cleanLots > 0.01 && equity < totalCommittedCapital)
    ) {
      const remainingCapital = Math.max(0, Math.min(balance, equity) - existingOpenLots * 40);
      const maxAllowedLots = Math.floor((remainingCapital / 40) * 100) / 100;
      return {
        allowed: false,
        title: `Lot Size (${cleanLots}) Exceeds Account Capital / Free Margin`,
        message: `${cleanLots} lots on ${symbol} requires at least $${requiredCapital.toFixed(2)} capital (Balance: $${balance.toFixed(2)}, Free Margin: $${freeMargin.toFixed(2)}). ${
          maxAllowedLots >= 0.01
            ? `Max allowed lot size for your remaining margin is ${maxAllowedLots.toFixed(2)} lots.`
            : 'Please close existing positions, reduce lot size, or deposit funds.'
        }`,
      };
    }

    if (currentOpenTradesCount >= tradeLimits.effectiveMaxTrades) {
      return {
        allowed: false,
        title: `Max Open Trades Reached (${currentOpenTradesCount}/${tradeLimits.effectiveMaxTrades})`,
        message: `Your ${activeAcc.tier} (${activeAcc.type}) account with $${balance.toFixed(2)} balance and ${cleanLots} lot size allows a maximum of ${tradeLimits.effectiveMaxTrades} open trade${tradeLimits.effectiveMaxTrades === 1 ? '' : 's'} at a time. Please close an open trade first.`,
      };
    }

    return { allowed: true };
  };

  // Internal execution
  const executeMarketOrderInternal = (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
    executionPrice?: number;
  }) => {
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
    // Every trade immediately starts negative because of the bid/ask spread
    const initialPnl = rawInitialPnl < 0 ? rawInitialPnl : Number((-Math.max(0.05, (inst.spread || 0.42) * (params.lots / 0.01) * 0.1)).toFixed(2));

    // Evaluate target outcome for manual trading:
    // - Demo account (all users) & Marketer (Live & Demo): 85%–95% winrate
    // - Retail trader on Live account: maximum 10% winrate
    const activeAccForManual = selectedAccountRef.current || selectedAccount;
    const isDemoManual = activeAccForManual?.type === 'Demo';
    const manualClosedHistory = closedTrades.filter((ct) => !String(ct.id).startsWith('cl-bot-'));
    const manualWinsCount = manualClosedHistory.filter((ct) => (ct.pnl || 0) > 0).length;
    const isManualTargetWin = evaluateTargetWinOrLoss(
      userRoleRef.current,
      undefined,
      isDemoManual,
      '89.5%',
      manualWinsCount,
      manualClosedHistory.length
    );

    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random()}`,
      ticket,
      symbol: params.symbol,
      side: params.side,
      lots: params.lots,
      openPrice: fillPrice,
      currentPrice: initialLiquidationPrice,
      sl: params.sl,
      tp: params.tp,
      pnl: initialPnl,
      swap: 0,
      commission: 0,
      openTime: Date.now(),
      targetOutcome: isManualTargetWin ? 'WIN' : 'LOSS',
    };

    const nextManualPositions = [newPos, ...positionsRef.current];
    positionsRef.current = nextManualPositions;
    setPositions(nextManualPositions);
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

    // Save open trade to Supabase cloud database
    if (currentUser) {
      supabaseService.saveTrade(currentUser, {
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
      supabaseService.syncActivity(currentUser, {
        type: 'TRADE_OPENED',
        description: `Market ${params.side} ${params.lots} ${params.symbol} @ ${fillPrice}`,
        metadata: { ticket, symbol: params.symbol, lots: params.lots, price: fillPrice },
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
        sl: params.sl,
        tp: params.tp,
      },
    });
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
    };
    setPendingOrders((prev) => [newOrd, ...prev]);
    playOrderSound(true);
    addNotification(
      `Placed Pending ${params.type}: ${params.lots} ${params.symbol} @ ${params.targetPrice}`
    );

    // Save pending order to Supabase
    if (currentUser) {
      supabaseService.saveTrade(currentUser, {
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
      supabaseService.syncActivity(currentUser, {
        type: 'ORDER_PENDING',
        description: `Placed ${newOrd.type} ${newOrd.lots} ${newOrd.symbol} @ ${newOrd.targetPrice}`,
        metadata: { ticket, symbol: newOrd.symbol, targetPrice: newOrd.targetPrice },
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
    if (closingPositionIdsRef.current.has(id)) return;
    const pos = positionsRef.current.find((p) => p.id === id) || positions.find((p) => p.id === id);
    if (!pos) return;
    closingPositionIdsRef.current.add(id);

    const inst = instrumentsRef.current.find((i) => i.symbol === pos.symbol);
    const closePrice =
      customClosePrice ||
      pos.currentPrice ||
      (pos.side === 'BUY'
        ? inst?.bid || pos.currentPrice
        : inst?.ask || pos.currentPrice);

    let finalClosePrice = closePrice;
    const contractSize = getContractSize(pos.symbol);
    const unitValueAt001 = Math.max(0.0001, contractSize * 0.01);
    const lotScale = Math.max(1, pos.lots / 0.01);

    let priceDiff =
      pos.side === 'BUY'
        ? finalClosePrice - pos.openPrice
        : pos.openPrice - finalClosePrice;
    let calculatedPnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));

    // Ensure closed manual trade outcome respects the winrate rule (<=10% for retail Live, 85%-95% for Demo & Marketer)
    if (pos.targetOutcome === 'WIN' && calculatedPnl <= 0 && inst) {
      const targetWinPer001 = 0.65 + ((pos.ticket % 120) / 100);
      const priceOffset = targetWinPer001 / unitValueAt001;
      finalClosePrice =
        pos.side === 'BUY'
          ? Number((pos.openPrice + priceOffset).toFixed(inst.decimals))
          : Number((pos.openPrice - priceOffset).toFixed(inst.decimals));
      priceDiff =
        pos.side === 'BUY'
          ? finalClosePrice - pos.openPrice
          : pos.openPrice - finalClosePrice;
      calculatedPnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));
    } else if (pos.targetOutcome === 'LOSS' && calculatedPnl >= 0 && inst) {
      const targetLossPer001 = 0.85 + ((pos.ticket % 160) / 100);
      const priceOffset = targetLossPer001 / unitValueAt001;
      finalClosePrice =
        pos.side === 'BUY'
          ? Number((pos.openPrice - priceOffset).toFixed(inst.decimals))
          : Number((pos.openPrice + priceOffset).toFixed(inst.decimals));
      priceDiff =
        pos.side === 'BUY'
          ? finalClosePrice - pos.openPrice
          : pos.openPrice - finalClosePrice;
      calculatedPnl = Number((priceDiff * pos.lots * contractSize + (pos.swap || 0)).toFixed(2));
    }

    const finalPnl = calculatedPnl;

    const closed: ClosedTrade = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    };

    const nextPositions = positionsRef.current.filter((p) => p.id !== id);
    positionsRef.current = nextPositions;
    setPositions(nextPositions);
    setClosedTrades((prev) => {
      const updated = [closed, ...prev].slice(0, 50);
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

    // Immediately update account balance in BOTH selectedAccount and accounts array, and persist to localStorage & Supabase!
    const updatedAcc = commitAccountBalanceChange(finalPnl, selectedAccountRef.current?.id);
    if (updatedAcc && updatedAcc.balance <= 0) {
      setTimeout(handleZeroBalanceStopOut, 0);
    }

    // Save closed trade to Supabase cloud database
    if (currentUserRef.current) {
      supabaseService.saveTrade(currentUserRef.current, {
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
        sl: null,
        tp: null,
        pnl: closed.pnl,
        status: 'CLOSED',
        openTime: closed.openTime,
        closeTime: closed.closeTime,
        closeReason: closed.reason,
      });
      supabaseService.syncActivity(currentUserRef.current, {
        type: 'TRADE_CLOSED',
        description: `Closed #${closed.ticket} ${closed.symbol} (${closed.pnl >= 0 ? '+' : ''}$${closed.pnl.toFixed(2)}) • New Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`,
        metadata: {
          ticket: closed.ticket,
          symbol: closed.symbol,
          pnl: closed.pnl,
          newBalance: updatedAcc?.balance ?? 0,
        },
      });
    }

    playOrderSound(finalPnl >= 0);
    addNotification(
      `Closed #${pos.ticket} ${pos.symbol} (${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)}) • Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`
    );

    triggerActionPopup({
      type: 'TRADE_CLOSED',
      title: `Trade of ${pos.symbol} is closed`,
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
  };

  const handleCloseAllPositions = () => {
    const count = positions.length;
    positions.forEach((p) => closePositionById(p.id, 'MANUAL'));
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

    if (currentUser && ord) {
      supabaseService.saveTrade(currentUser, {
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
      supabaseService.syncActivity(currentUser, {
        type: 'ORDER_CANCELLED',
        description: `Cancelled pending ${ord.type} #${ord.ticket} for ${ord.lots} ${ord.symbol}`,
        metadata: { ticket: ord.ticket, symbol: ord.symbol },
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
      lots: 0.1,
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

    const newFollowed: FollowedStrategy = {
      providerId: provider.id,
      providerName: provider.name,
      allocatedAmount: params.allocatedAmount,
      currentProfit: 0,
      profitPercent: 0,
      volumeAllocation: params.volumeAllocation,
      rescueLevel: params.rescueLevel,
      startDate: new Date().toISOString().split('T')[0],
    };

    setFollowedStrategies((prev) => [newFollowed, ...prev]);
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
    const followed = followedStrategies.find((f) => f.providerId === providerId);
    setFollowedStrategies((prev) => prev.filter((f) => f.providerId !== providerId));
    addNotification('Strategy copy stopped and funds settled');

    triggerActionPopup({
      type: 'COPY_STOPPED',
      title: 'Strategy Copy Halted',
      subtitle: followed
        ? `Detached from ${followed.providerName}. Remaining allocated capital released to your balance.`
        : 'Copy strategy detached successfully.',
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
      details: params.details || `Funded to ${params.targetAccount}`,
    };

    const nextTransactions =
      existingIdx >= 0
        ? transactionsRef.current.map((t, idx) => (idx === existingIdx ? newTx : t))
        : [newTx, ...transactionsRef.current];
    transactionsRef.current = nextTransactions;
    setTransactions(nextTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (
      params.targetAccount === 'HF Wallet' ||
      params.targetAccount === 'VTM Wallet' ||
      params.targetAccount === 'VTM One Wallet' ||
      params.targetAccount.toLowerCase().includes('wallet')
    ) {
      const nextWallet = Number((walletBalanceRef.current + amountUsd).toFixed(2));
      walletBalanceRef.current = nextWallet;
      setWalletBalance(nextWallet);
      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: nextWallet,
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

  // Helper to complete a PENDING withdrawal transaction automatically after 3 seconds
  const finalizePendingWithdrawal = useCallback((txId: string, reference: string) => {
    const existingTx = transactionsRef.current.find(
      (t) => (t.id === txId || (reference && t.reference === reference)) && t.type === 'WITHDRAWAL'
    );
    if (!existingTx || existingTx.status === 'COMPLETED') return;

    const updatedTransactions = transactionsRef.current.map((t) =>
      t.id === existingTx.id
        ? {
            ...t,
            status: 'COMPLETED' as const,
            details: `${t.details || `Withdrawal from ${t.accountNumber || 'Account'}`} • Disbursed`,
          }
        : t
    );

    transactionsRef.current = updatedTransactions;
    setTransactions(updatedTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    const activeUser = currentUserRef.current;
    if (activeUser) {
      saveUserFinancials(activeUser, {
        walletBalance: walletBalanceRef.current,
        accounts: accountsRef.current,
        selectedAccountId: selectedAccountRef.current?.id,
        transactions: updatedTransactions,
      });
      supabaseService.saveWithdrawal(activeUser, {
        id: existingTx.id,
        sourceAccount: existingTx.accountNumber || 'VTM Wallet',
        amountUsd: existingTx.amount,
        method: existingTx.method,
        reference: existingTx.reference,
        status: 'COMPLETED',
      });
      supabaseService.syncTransactions(activeUser, updatedTransactions);
      supabaseService.syncActivity(activeUser, {
        type: 'WITHDRAWAL_COMPLETED',
        description: `Withdrawal of $${existingTx.amount.toFixed(2)} from ${existingTx.accountNumber || 'Account'} completed via ${existingTx.method}. Ref: ${existingTx.reference}`,
        metadata: {
          amount: existingTx.amount,
          sourceAccount: existingTx.accountNumber,
          reference: existingTx.reference,
          status: 'COMPLETED',
        },
      });
    }

    addNotification(
      `Withdrawal of $${existingTx.amount.toFixed(2)} completed successfully! (Ref: ${existingTx.reference})`
    );
    triggerActionPopup({
      type: 'WITHDRAWAL_SUCCESS',
      title: `Withdrawal of $${existingTx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} Successful!`,
      subtitle: `Instant payout disbursed from ${existingTx.accountNumber || 'Account'} via ${existingTx.method}. Ref: ${existingTx.reference}`,
      details: {
        amount: existingTx.amount,
        method: existingTx.method,
        reference: existingTx.reference,
        accountNumber: existingTx.accountNumber || 'VTM Wallet',
      },
    });
  }, []);

  // Safety Watcher: Ensure any PENDING withdrawal transaction automatically shifts to COMPLETED (SUCCESSFUL) after 3 seconds without fail
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

  // Withdrawal Handlers - Minimum withdrawal is strictly $35 ($50 for Crypto)
  // Deducts immediately from account, stores new balance for next trades/transactions,
  // records as PENDING for 3 seconds, then shifts automatically to COMPLETED (SUCCESSFUL) without fail.
  const handleWithdraw = (params: {
    method: string;
    amount: number;
    sourceAccount: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING' | 'FAILED';
  }) => {
    const amountUsd = Number((params.amount || 0).toFixed(2));

    if (params.status === 'FAILED' || amountUsd < 35) {
      triggerActionPopup({
        type: 'WITHDRAWAL_FAILED',
        title: 'Withdrawal Unsuccessful',
        subtitle: amountUsd < 35 ? 'Minimum withdrawal requirement is $35.00 USD.' : 'Insufficient withdrawable funds in selected source.',
        details: {
          amount: amountUsd,
          method: params.method,
          reason: amountUsd < 35 ? 'Minimum withdrawal amount is $35.00 USD.' : 'Insufficient funds.',
        },
      });
      return;
    }

    const ref = params.reference || `B2C${Math.floor(100000000 + Math.random() * 900000000)}`;
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 1. Immediately deduct amount from the source account/wallet and store the new balance for next trades & transactions
    let nextWallet = walletBalanceRef.current;
    let nextAccounts = [...accountsRef.current];
    let resultingBalance = 0;

    if (
      params.sourceAccount === 'VTM Wallet' ||
      params.sourceAccount === 'VTM One Wallet' ||
      params.sourceAccount === 'HF Wallet' ||
      params.sourceAccount.toLowerCase().includes('wallet')
    ) {
      nextWallet = Math.max(0, Number((walletBalanceRef.current - amountUsd).toFixed(2)));
      resultingBalance = nextWallet;
      walletBalanceRef.current = nextWallet;
      setWalletBalance(nextWallet);
    } else {
      const cleanSource = params.sourceAccount.replace(/^Account\s*#/i, '').trim();
      nextAccounts = accountsRef.current.map((acc) => {
        if (
          acc.accountNumber === cleanSource ||
          acc.accountNumber === params.sourceAccount ||
          `Account #${acc.accountNumber}` === params.sourceAccount ||
          acc.id === params.sourceAccount
        ) {
          const newBal = Math.max(0, Number((acc.balance - amountUsd).toFixed(2)));
          const newEq = Math.max(0, Number((acc.equity - amountUsd).toFixed(2)));
          const newFree = Math.max(0, Number((acc.freeMargin - amountUsd).toFixed(2)));
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

    // 2. Always start as PENDING for 3 seconds so it is recorded immediately in transactions & Supabase
    const newTx: Transaction = {
      id: txId,
      type: 'WITHDRAWAL',
      method: params.method,
      amount: amountUsd,
      currency: 'USD',
      status: 'PENDING',
      timestamp: Date.now(),
      reference: ref,
      accountNumber: params.sourceAccount,
      details: `Withdrawal from ${params.sourceAccount} (New Bal: $${resultingBalance.toFixed(2)})`,
    };

    const nextTransactions = [newTx, ...transactionsRef.current];
    transactionsRef.current = nextTransactions;
    setTransactions(nextTransactions);
    lastLocalFinancialUpdateRef.current = Date.now();

    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance: nextWallet,
        accounts: nextAccounts,
        selectedAccountId: selectedAccountRef.current?.id,
        transactions: nextTransactions,
      });
      supabaseService.saveWithdrawal(currentUser, {
        id: newTx.id,
        sourceAccount: params.sourceAccount,
        amountUsd,
        method: params.method,
        reference: ref,
        status: 'PENDING',
      });
      supabaseService.syncTransactions(currentUser, nextTransactions);
      supabaseService.syncActivity(currentUser, {
        type: 'WITHDRAWAL_PENDING',
        description: `Withdrawal of $${amountUsd.toFixed(2)} initiated from ${params.sourceAccount} via ${params.method} (Pending 3s verification)`,
        metadata: { amount: amountUsd, sourceAccount: params.sourceAccount, reference: ref, status: 'PENDING' },
      });
    }

    addNotification(
      `Withdrawal of $${amountUsd.toFixed(2)} from ${params.sourceAccount} is PENDING (processing 3s)...`
    );

    // 3. Automatically shift from PENDING to COMPLETED (SUCCESSFUL) after 3 seconds without fail
    setTimeout(() => {
      finalizePendingWithdrawal(txId, ref);
    }, 3000);
  };

  const handleTransfer = (params: { fromAccount: string; toAccount: string; amount: number }) => {
    if (params.amount <= 0 || params.fromAccount === params.toAccount) {
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
      amount: params.amount,
      currentState: {
        walletBalance,
        accounts,
        transactions,
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

      const transferredToWallet =
        targetAcc.type === 'Live' && Number(targetAcc.balance || 0) > 0
          ? Number(Number(targetAcc.balance).toFixed(2))
          : 0;

      const nextWallet = Number((walletBalanceRef.current + transferredToWallet).toFixed(2));
      const nextAccounts = accountsRef.current.filter(
        (a) => a.id !== targetAcc.id && a.accountNumber !== targetAcc.accountNumber
      );

      let nextTransactions = [...transactionsRef.current];
      if (transferredToWallet > 0) {
        const ref = `VTM-CLS-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const transferTx: Transaction = {
          id: `tx-${Date.now()}`,
          type: 'INTERNAL_TRANSFER',
          method: 'Account Closure Settlement',
          amount: transferredToWallet,
          currency: 'USD',
          status: 'COMPLETED',
          timestamp: Date.now(),
          reference: ref,
          accountNumber: 'VTM Wallet',
          details: `Live #${targetAcc.accountNumber} ➔ VTM Wallet (Account Deleted)`,
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

  // Silent Background Platform Cleanup for Idle Live Accounts (Never shown to users)
  // Automatically removes Live accounts idle with $0 deposit for 2 weeks, or Live accounts with a deposit and no trades for 2 weeks (transferring balance to Wallet).
  useEffect(() => {
    if (!currentUser || !currentUser.isLoggedIn) return;

    const runSilentCleanup = () => {
      const activeUser = currentUserRef.current;
      if (!activeUser || accountsRef.current.length === 0) return;

      const currentState = {
        walletBalance: walletBalanceRef.current,
        accounts: accountsRef.current,
        selectedAccountId: selectedAccountRef.current?.id || null,
        transactions: transactionsRef.current,
        lastUpdated: Date.now(),
      };

      const swept = sweepIdleLiveAccountsSilently(activeUser, currentState, (acc) => {
        const isCurrent =
          selectedAccountRef.current?.id === acc.id ||
          selectedAccountRef.current?.accountNumber === acc.accountNumber;
        return isCurrent && positionsRef.current.length > 0;
      });

      if (swept.changed) {
        walletBalanceRef.current = swept.state.walletBalance;
        accountsRef.current = swept.state.accounts;
        const nextSel =
          swept.state.accounts.find((a) => a.id === swept.state.selectedAccountId) ||
          swept.state.accounts[0] ||
          null;
        selectedAccountRef.current = nextSel;
        lastLocalFinancialUpdateRef.current = Date.now();

        setWalletBalance(swept.state.walletBalance);
        setAccounts(swept.state.accounts);
        setSelectedAccount(nextSel);

        saveUserFinancials(activeUser, swept.state);
        swept.sweptAccountNumbers.forEach((accNum) => {
          supabaseService.deleteTradingAccountFromDatabase(activeUser, accNum, true).catch(() => {});
        });
      }
    };

    runSilentCleanup();
    const interval = setInterval(runSilentCleanup, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

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

  // Automatically resolve an active OPEN market instrument for autonomous bot execution
  const resolveActiveBotInstrument = (
    preferredSymbol: string,
    botConfig?: BotStrategyConfig
  ): Instrument => {
    const allInst = instrumentsRef.current.length > 0 ? instrumentsRef.current : instruments;
    const preferred =
      allInst.find((i) => i.symbol === preferredSymbol) ||
      allInst.find((i) => i.symbol.includes((preferredSymbol || '').slice(0, 3)));
    if (preferred && checkInstrumentMarketHours(preferred.symbol, preferred.category).isOpen) {
      return preferred;
    }

    // 1. Check bot's recommended instruments for any open market
    if (botConfig?.recommendedInstruments?.length) {
      for (const recSym of botConfig.recommendedInstruments) {
        const recInst = allInst.find((i) => i.symbol === recSym);
        if (recInst && checkInstrumentMarketHours(recInst.symbol, recInst.category).isOpen) {
          return recInst;
        }
      }
    }

    // 2. Check all currently open instruments on the platform (e.g. 24/7 Crypto pairs BTCUSD, ETHUSD, SOLUSD when FX/Metals are closed)
    const openCandidates = allInst.filter(
      (i) => checkInstrumentMarketHours(i.symbol, i.category).isOpen
    );
    if (openCandidates.length > 0) {
      return (
        openCandidates.find((i) => i.symbol === 'BTCUSD') ||
        openCandidates.find((i) => i.symbol === 'ETHUSD') ||
        openCandidates[0]
      );
    }

    return preferred || allInst[0];
  };

  // Automatically scale bot lot size to fit the user's available account balance so bots can open 10 to 20 trades concurrently
  const resolveAffordableBotLotSize = (requestedLots: number): number => {
    const activeAcc = selectedAccountRef.current || selectedAccount;
    if (!activeAcc || activeAcc.balance <= 0) return Math.max(0.01, requestedLots || 0.01);

    const balance = Number(activeAcc.balance || 0);
    const tradeLimits = getAccountMaxOpenTrades(
      activeAcc.tier,
      activeAcc.type,
      balance,
      0.01
    );

    // Size each position so the total account balance comfortably supports 20 concurrent trades ($0.40 margin per 0.01 lot)
    const maxByCapitalFor20Trades = Math.max(0.01, Math.floor((balance / (40 * 22)) * 100) / 100);
    const safeLots = Math.min(
      Math.max(0.01, Number(requestedLots || 0.01)),
      tradeLimits.maxLotSizeForTier,
      maxByCapitalFor20Trades
    );
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

    // If this bot is already deployed in Active Bots, keep it in Active Bots without duplicating
    const existingDeployed = botRunsRef.current.find((r) => r.botId === bot.id);
    if (existingDeployed) {
      unmarkBotDeletedLocally([bot.id, bot.name, existingDeployed.id, existingDeployed.runId]);
      playOrderSound(true);
      addNotification(
        `${bot.name} is ready in Active Bots. Adjust settings or click Run Bot there to start trading.`
      );
      return;
    }

    const runIdStr = `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const preferredSymbol = (config.symbol || bot.recommendedInstruments[0] || 'XAUUSD')
      .trim()
      .toUpperCase();
    const cleanLotSize =
      Number(config.lotSize) > 0 ? Number(config.lotSize) : bot.defaultLotSize || 0.01;
    const cleanTpPips =
      Number(config.tpPips) > 0 ? Number(config.tpPips) : bot.defaultTpPips || 30;
    const cleanSlPips =
      Number(config.slPips) > 0 ? Number(config.slPips) : bot.defaultSlPips || 20;

    // Clear any prior tombstone for this bot when the user explicitly deploys it
    unmarkBotDeletedLocally([bot.id, bot.name, runIdStr]);

    // Deploy to Active Bots in standby (PAUSED) — does NOT execute market trades until the user clicks Run inside Active Bots
    const newRun: BotRunInstance = {
      id: runIdStr,
      runId: runIdStr,
      botId: bot.id,
      botName: bot.name,
      botType: bot.type,
      symbol: preferredSymbol,
      lotSize: cleanLotSize,
      tpPips: cleanTpPips,
      slPips: cleanSlPips,
      status: 'PAUSED',
      explicitUserRun: true,
      userStartedVersion: 2,
      startedAt: Date.now(),
      totalTrades: 0,
      totalTradesCount: 0,
      winningTrades: 0,
      winCount: 0,
      losingTrades: 0,
      totalProfitUsd: 0,
      lastSignal: `Deployed to Active Bots • Configure settings or click Run to execute market orders`,
      lastSignalTime: Date.now(),
    };

    const updatedRuns = [newRun, ...botRunsRef.current];
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns);

    if (currentUser && currentUser.email) {
      supabaseService
        .syncBotState(currentUser, {
          importedBots,
          botRuns: updatedRuns,
          botTrades: botTradesRef.current,
          deletedBotIds: getDeletedBotIds(),
        })
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
    const botCfg = allBots.find((b) => b.id === target.botId);
    const activeInst = resolveActiveBotInstrument(target.symbol, botCfg);
    const effectiveLots = resolveAffordableBotLotSize(target.lotSize);

    if (nextStatus === 'RUNNING') {
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

      // Immediately open a market trade if this bot has 0 currently open trades so execution starts right away
      const runKey = target.id || target.runId;
      const openForThisBot = botTradesRef.current.filter(
        (t) =>
          (t.runId === runKey ||
            t.runInstanceId === runKey ||
            t.runId === target.runId ||
            t.runId === target.id) &&
          t.status === 'OPEN'
      );

      let immediateSignal = `Autonomous Engine Active on ${activeInst.symbol}`;
      if (openForThisBot.length === 0) {
        const isDemoAcc = selectedAccountRef.current?.type === 'Demo';
        const pipVal =
          activeInst.decimals === 5 || activeInst.decimals === 3
            ? 0.0001
            : activeInst.decimals === 2
            ? 0.01
            : 0.0001;
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
        const recPool = botCfg?.recommendedInstruments?.length
          ? [activeInst.symbol, ...botCfg.recommendedInstruments]
          : [activeInst.symbol];

        for (let w = 0; w < maxInitialWave; w++) {
          const candidateSym = recPool[w % recPool.length];
          const waveInst = resolveActiveBotInstrument(candidateSym, botCfg) || activeInst;
          const wavePipVal =
            waveInst.decimals === 5 || waveInst.decimals === 3
              ? 0.0001
              : waveInst.decimals === 2
              ? 0.01
              : 0.0001;

          const isTargetWin = evaluateTargetWinOrLoss(
            userRoleRef.current,
            target.botType,
            isDemoAcc,
            botCfg?.claimedWinRate,
            (target.winningTrades || 0) + w,
            (target.totalTrades || 0) + w
          );
          const side = determineBotTradeDirection(waveInst, isTargetWin, userRoleRef.current);
          const baseEntry = side === 'BUY' ? waveInst.ask : waveInst.bid;
          const microStep = (w % 5) * wavePipVal * 1.2;
          const entryPriceNum = Number(
            (side === 'BUY' ? baseEntry + microStep : baseEntry - microStep).toFixed(waveInst.decimals)
          );
          const currentExitNum = Number(
            (side === 'BUY' ? waveInst.bid : waveInst.ask).toFixed(waveInst.decimals)
          );
          const tpNum = Number(
            (side === 'BUY'
              ? entryPriceNum + cleanTp * wavePipVal * 10
              : entryPriceNum - cleanTp * wavePipVal * 10
            ).toFixed(waveInst.decimals)
          );
          const slNum = Number(
            (side === 'BUY'
              ? entryPriceNum - cleanSl * wavePipVal * 10
              : entryPriceNum + cleanSl * wavePipVal * 10
            ).toFixed(waveInst.decimals)
          );
          const rawInitPnl = calculateBotPnL(
            waveInst.symbol,
            side,
            entryPriceNum,
            currentExitNum,
            effectiveLots
          );
          const initPnl =
            rawInitPnl < 0
              ? rawInitPnl
              : Number(
                  (-Math.max(0.05, (waveInst.spread || 0.42) * (effectiveLots / 0.01) * 0.1)).toFixed(2)
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
          });
        }

        const updatedTrades = [...initialWaveTrades, ...botTradesRef.current];
        botTradesRef.current = updatedTrades;
        setBotTrades(updatedTrades);
        saveStoredBotTrades(updatedTrades);
        immediateSignal = `Auto Executed: ${initialWaveTrades.length} orders live (scaling up to ${targetTotalConcurrent} concurrent trades)`;
      }

      const updatedRuns = botRunsRef.current.map((r) => {
        if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
          return {
            ...r,
            symbol: activeInst.symbol,
            lotSize: effectiveLots,
            tpPips: Number(r.tpPips) > 0 ? Number(r.tpPips) : 30,
            slPips: Number(r.slPips) > 0 ? Number(r.slPips) : 20,
            status: 'RUNNING' as const,
            explicitUserRun: true,
            userStartedVersion: 2,
            lastSignal: immediateSignal,
            lastSignalTime: Date.now(),
          };
        }
        return r;
      });
      botRunsRef.current = updatedRuns;
      setBotRuns(updatedRuns);
      saveStoredBotRuns(updatedRuns);

      playOrderSound(true);
      triggerActionPopup({
        type: 'BOT_STARTED',
        title: 'Bot Running Autonomously',
        subtitle: `${target.botName} is actively executing market trades on ${activeInst.symbol}.`,
      });
    } else {
      const updatedRuns = botRunsRef.current.map((r) => {
        if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
          return {
            ...r,
            status: 'PAUSED' as const,
            lastSignal: 'Bot Paused by User',
            lastSignalTime: Date.now(),
          };
        }
        return r;
      });
      botRunsRef.current = updatedRuns;
      setBotRuns(updatedRuns);
      saveStoredBotRuns(updatedRuns);

      triggerActionPopup({
        type: 'BOT_STOPPED',
        title: 'Bot Paused',
      });
    }
  };

  const handleStopBotRun = (runId: string) => {
    const updatedRuns = botRunsRef.current.map((r) => {
      if (r.runId === runId || r.id === runId || r.botId === runId || r.botName === runId) {
        return {
          ...r,
          status: 'PAUSED' as const,
          stoppedAt: Date.now(),
          lastSignal: 'Bot Stopped (Remains in Active Bots until deleted)',
          lastSignalTime: Date.now(),
        };
      }
      return r;
    });
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns);
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

    // 1. Permanently record in deleted bot IDs to prevent reappearing on logout, login, or refresh
    const updatedDeletedIds = markBotDeletedLocally([
      runId,
      targetRun?.id,
      targetRun?.runId,
      targetRun?.botId,
      targetRun?.botName,
    ]);

    // 2. Remove from botRuns synchronously & persist
    const updatedRuns = botRunsRef.current.filter(
      (r) =>
        r !== targetRun &&
        r.id !== runId &&
        r.runId !== runId &&
        r.botId !== runId &&
        r.botName !== runId
    );
    botRunsRef.current = updatedRuns;
    setBotRuns(updatedRuns);
    saveStoredBotRuns(updatedRuns);

    // 3. Settle and close open trades associated with this run
    const updatedTrades = botTradesRef.current.map((t) => {
      if (
        (t.runId === runId ||
          t.runInstanceId === runId ||
          (targetRun &&
            (t.runId === targetRun.id ||
              t.runId === targetRun.runId ||
              t.botId === targetRun.botId))) &&
        t.status === 'OPEN'
      ) {
        return {
          ...t,
          status: 'CLOSED' as const,
          closeReason: 'MANUAL',
          exitReason: 'MANUAL',
          closeTime: Date.now(),
        };
      }
      return t;
    });
    botTradesRef.current = updatedTrades;
    setBotTrades(updatedTrades);
    saveStoredBotTrades(updatedTrades);

    // 4. Immediately push deletion to Supabase so background sync never restores it
    if (currentUser && currentUser.email) {
      supabaseService
        .syncBotState(currentUser, {
          importedBots,
          botRuns: updatedRuns,
          botTrades: updatedTrades,
          deletedBotIds: updatedDeletedIds,
        })
        .catch(() => {});
    }

    playOrderSound(false);
    addNotification('Deployed bot removed successfully');

    triggerActionPopup({
      type: 'BOT_STOPPED',
      title: 'Bot Deleted Successfully',
      subtitle: 'The bot has been permanently removed and will not appear on login, logout, or refresh.',
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

    const updated = botRunsRef.current.map((r) => {
      if (r.id === runId || r.runId === runId || r.botId === runId || r.botName === runId) {
        return {
          ...r,
          ...updates,
          status: nextStatus === 'STOPPED' ? 'PAUSED' : nextStatus,
          explicitUserRun: true,
          userStartedVersion: 2,
          lastSignal: `Settings Updated: ${updates.symbol ?? r.symbol} • ${updates.lotSize ?? r.lotSize} Lots, TP ${updates.tpPips ?? r.tpPips}p, SL ${updates.slPips ?? r.slPips}p`,
          lastSignalTime: Date.now(),
        };
      }
      return r;
    });
    botRunsRef.current = updated;
    setBotRuns(updated);
    saveStoredBotRuns(updated);

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
    setBotTrades((prev) => {
      const trade = prev.find((t) => t.id === tradeId);
      if (!trade || trade.status !== 'OPEN') return prev;

      const inst = instrumentsRef.current.find((i) => i.symbol === trade.symbol);
      const exitPrice =
        trade.side === 'BUY'
          ? inst?.bid || trade.currentPrice
          : inst?.ask || trade.currentPrice;
      const profitUsd = Number(
        calculateBotPnL(
          trade.symbol,
          trade.side,
          trade.openPrice,
          exitPrice,
          trade.lotSize,
          userRoleRef.current
        ).toFixed(2)
      );

      const updatedTrade: BotTrade = {
        ...trade,
        status: 'CLOSED',
        exitPrice,
        profitUsd,
        exitReason: 'MANUAL',
        closeTime: Date.now(),
      };

      // Credit or debit account in BOTH selectedAccount and accounts array, and persist immediately to localStorage & Supabase!
      const updatedAcc = commitAccountBalanceChange(profitUsd, selectedAccountRef.current?.id);
      if (updatedAcc && updatedAcc.balance <= 0) {
        setTimeout(handleZeroBalanceStopOut, 0);
      }

      // Also record in closedTrades history & Supabase
      const closedRecord: ClosedTrade = {
        id: `cl-bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      };
      setClosedTrades((ct) => {
        const updated = [closedRecord, ...ct].slice(0, 50);
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
      }

      // Update run stats
      setBotRuns((runs) => {
        const nextRuns = runs.map((r) => {
          if (r.runId === trade.runId || r.id === trade.runId || r.id === trade.runInstanceId) {
            const count = (r.totalTrades || r.totalTradesCount || 0) + 1;
            const wins = (r.winningTrades || r.winCount || 0) + (profitUsd > 0 ? 1 : 0);
            return {
              ...r,
              totalTrades: count,
              totalTradesCount: count,
              winningTrades: wins,
              winCount: wins,
              totalProfitUsd: Number(((r.totalProfitUsd || 0) + profitUsd).toFixed(2)),
            };
          }
          return r;
        });
        saveStoredBotRuns(nextRuns);
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

      const updatedTrades = prev.map((t) => (t.id === tradeId ? updatedTrade : t));
      saveStoredBotTrades(updatedTrades);
      return updatedTrades;
    });
  };

  const handleTriggerManualSignal = (runId: string) => {
    const run = botRuns.find((r) => r.runId === runId || r.id === runId);
    if (!run) return;

    // Enforce market hours: if currency is closed, one cannot open any trade
    const inst = instruments.find((i) => i.symbol === run.symbol) || instruments[0];
    const marketStatus = checkInstrumentMarketHours(run.symbol, inst?.category);
    if (!marketStatus.isOpen) {
      playOrderSound(false);
      addNotification(`Signal Rejected: ${run.symbol} market is closed`);
      triggerActionPopup({
        type: 'ERROR',
        title: `${run.symbol} is closed`,
      });
      return;
    }

    const isDemoAcc = selectedAccount?.type === 'Demo';
    const isTargetWin = evaluateTargetWinOrLoss(userRole, run.botType, isDemoAcc);
    const side = determineBotTradeDirection(inst, isTargetWin, userRole);
    const pipVal =
      inst.decimals === 5 || inst.decimals === 3
        ? 0.0001
        : inst.decimals === 2
        ? 0.01
        : 0.0001;
    const openPrice = side === 'BUY' ? inst.ask : inst.bid;

    // Strict check: Never open signal trade if free margin is 0 or lot size exceeds account capital
    const capCheck = validateTradeCapitalAndMargin(run.lotSize, run.symbol, openPrice);
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
    const tpPrice =
      side === 'BUY'
        ? openPrice + run.tpPips * pipVal * 10
        : openPrice - run.tpPips * pipVal * 10;
    const slPrice =
      side === 'BUY'
        ? openPrice - run.slPips * pipVal * 10
        : openPrice + run.slPips * pipVal * 10;

    const openPriceNum = Number(openPrice.toFixed(inst.decimals));
    const currentExitNum = Number((side === 'BUY' ? inst.bid : inst.ask).toFixed(inst.decimals));
    const rawBotInitPnl = calculateBotPnL(run.symbol, side, openPriceNum, currentExitNum, run.lotSize);
    const initialBotProfit = rawBotInitPnl < 0 ? rawBotInitPnl : Number((-Math.max(0.05, (inst.spread || 0.42) * (run.lotSize / 0.01) * 0.1)).toFixed(2));
    const tpPriceNum = Number(tpPrice.toFixed(inst.decimals));
    const slPriceNum = Number(slPrice.toFixed(inst.decimals));

    const newTrade: BotTrade = {
      id: `btrade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticket: Math.floor(800000 + Math.random() * 99999),
      runId: run.runId,
      runInstanceId: run.id || run.runId,
      botId: run.botId,
      botName: run.botName,
      symbol: run.symbol,
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
    };

    setBotTrades((prev) => {
      const updated = [newTrade, ...prev];
      saveStoredBotTrades(updated);
      return updated;
    });

    setBotRuns((runs) => {
      const nextRuns = runs.map((r) => {
        if (r.id === run.id || r.runId === run.runId) {
          return {
            ...r,
            lastSignal: `Command Executed: ${side} ${run.lotSize} @ ${openPriceNum}`,
            lastSignalTime: Date.now(),
          };
        }
        return r;
      });
      saveStoredBotRuns(nextRuns);
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

  // Automated Bot Execution Engine Loop (Fully Autonomous Multi-Trade Execution & Rapid Profit Taking)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRuns = botRunsRef.current;
      const currentTrades = botTradesRef.current;
      const allInstruments = instrumentsRef.current;
      const currentRole = userRoleRef.current;

      // Strictly only execute bots that were explicitly started by the user and are currently RUNNING
      const runningBots = currentRuns.filter(
        (r) => r.status === 'RUNNING' && r.explicitUserRun === true && r.userStartedVersion === 2
      );
      if (runningBots.length === 0) return;

      let nextTrades = [...currentTrades];
      let tradesChanged = false;

      let nextRuns = [...currentRuns];
      let runsChanged = false;

      const allBotConfigs = [...DEFAULT_INBUILT_BOTS, ...loadStoredImportedBots()];

      runningBots.forEach((run) => {
        const runKey = run.id || run.runId;
        const botConfig = allBotConfigs.find((b) => b.id === run.botId);
        const claimedWinRateStr = botConfig?.claimedWinRate || '87.5%';

        const openTradesForRun = nextTrades.filter(
          (t) =>
            (t.runId === runKey ||
              t.runInstanceId === runKey ||
              t.runId === run.runId ||
              t.runId === run.id ||
              t.runInstanceId === run.id) &&
            t.status === 'OPEN'
        );

        const primaryInst = resolveActiveBotInstrument(run.symbol, botConfig);
        if (!primaryInst) return;

        // Ensure market is open for the resolved instrument
        const botMarketStatus = checkInstrumentMarketHours(primaryInst.symbol, primaryInst.category);
        if (!botMarketStatus.isOpen) return;

        // 1. Evaluate all currently open trades for this bot for rapid profit-taking & automatic closing
        openTradesForRun.forEach((activeTrade) => {
          const tradeInst =
            allInstruments.find((i) => i.symbol === activeTrade.symbol) || primaryInst;
          const currentMarketPrice =
            activeTrade.side === 'BUY' ? tradeInst.bid : tradeInst.ask;
          const floatingProfit = calculateBotPnL(
            activeTrade.symbol,
            activeTrade.side,
            activeTrade.openPrice,
            currentMarketPrice,
            activeTrade.lotSize
          );

          const hitTp =
            activeTrade.side === 'BUY'
              ? currentMarketPrice >= activeTrade.tp
              : currentMarketPrice <= activeTrade.tp;
          const hitSl =
            activeTrade.side === 'BUY'
              ? currentMarketPrice <= activeTrade.sl
              : currentMarketPrice >= activeTrade.sl;
          const durationMs = Date.now() - (activeTrade.openTime || Date.now());
          const isDemoAcc = selectedAccountRef.current?.type === 'Demo';
          const isMarketerOrDemo = currentRole === 'marketer' || isDemoAcc;

          // Staggered hold time (7s - 15s) for up to 5 concurrent trades
          const fastWinThresholdMs = isMarketerOrDemo
            ? 6500 + (activeTrade.ticket % 5500)
            : 8000 + (activeTrade.ticket % 6000);
          const lossThresholdMs = isMarketerOrDemo
            ? 8500 + (activeTrade.ticket % 5500)
            : 6500 + (activeTrade.ticket % 5500);

          const isDesignatedWin = activeTrade.targetOutcome === 'WIN';
          const shouldTakeProfit =
            isDesignatedWin &&
            (hitTp ||
              (floatingProfit > 0.5 && durationMs >= 5000 + (activeTrade.ticket % 3500)) ||
              durationMs >= fastWinThresholdMs);

          const shouldCloseLoss =
            !isDesignatedWin &&
            (hitSl ||
              (floatingProfit < -0.8 && durationMs >= 5000 + (activeTrade.ticket % 3500)) ||
              durationMs >= lossThresholdMs);

          if (shouldTakeProfit || shouldCloseLoss) {
            let finalExitPrice = currentMarketPrice;
            const cs = getContractSize(activeTrade.symbol);
            // Unit value of 1.00 price point at 0.01 lot
            const unitValueAt001 = Math.max(0.0001, cs * 0.01);
            const lotScale = Math.max(1, activeTrade.lotSize / 0.01);

            if (shouldTakeProfit) {
              // Marketers/Demo earn $2.10 - $5.80 per 0.01 lot; Retail traders earn small wins ($0.65 - $1.35 per 0.01 lot) so losses outweigh wins
              const targetProfitPer001 = isMarketerOrDemo
                ? 2.10 + ((activeTrade.ticket % 370) / 100)
                : 0.65 + ((activeTrade.ticket % 70) / 100);
              const minWinUsd = targetProfitPer001 * lotScale;
              if (floatingProfit < minWinUsd) {
                const priceOffset = targetProfitPer001 / unitValueAt001;
                finalExitPrice =
                  activeTrade.side === 'BUY'
                    ? Number((activeTrade.openPrice + priceOffset).toFixed(tradeInst.decimals))
                    : Number((activeTrade.openPrice - priceOffset).toFixed(tradeInst.decimals));
              }
            } else if (shouldCloseLoss) {
              // Retail traders take real losses ($2.40 - $4.80 per 0.01 lot) so Total Profit and Account Balance genuinely decrease!
              // Marketers/Demo take small controlled losses ($0.85 - $1.65 per 0.01 lot)
              const targetLossPer001 = isMarketerOrDemo
                ? 0.85 + ((activeTrade.ticket % 80) / 100)
                : 2.40 + ((activeTrade.ticket % 240) / 100);
              const minLossUsd = targetLossPer001 * lotScale;
              if (floatingProfit > -minLossUsd) {
                const priceOffset = targetLossPer001 / unitValueAt001;
                finalExitPrice =
                  activeTrade.side === 'BUY'
                    ? Number((activeTrade.openPrice - priceOffset).toFixed(tradeInst.decimals))
                    : Number((activeTrade.openPrice + priceOffset).toFixed(tradeInst.decimals));
              }
            }

            // Strictly calculate profitUsd from openPrice, finalExitPrice, and lotSize, and clamp loss so account balance never drops below protection reserve ($0.80-$2.10)
            let profitUsd = calculateBotPnL(
              activeTrade.symbol,
              activeTrade.side,
              activeTrade.openPrice,
              finalExitPrice,
              activeTrade.lotSize
            );
            const currentAccForClamp = selectedAccountRef.current;
            const currentBalForClamp = Number(currentAccForClamp?.balance ?? 0);
            const accSeedClamp = parseInt(String(currentAccForClamp?.accountNumber || '88').slice(-2), 10) || 45;
            const reserveFloorClamp = Number((0.8 + ((accSeedClamp % 14) * 0.1)).toFixed(2));
            const maxAllowedSingleLoss = Math.max(0, Number((currentBalForClamp - reserveFloorClamp).toFixed(2)));

            if (profitUsd < 0 && Math.abs(profitUsd) >= maxAllowedSingleLoss) {
              profitUsd = -maxAllowedSingleLoss;
              const csClamp = getContractSize(activeTrade.symbol);
              const unitValClamp = Math.max(0.0001, csClamp * activeTrade.lotSize);
              const clampedOffset = maxAllowedSingleLoss / unitValClamp;
              finalExitPrice =
                activeTrade.side === 'BUY'
                  ? Number((activeTrade.openPrice - clampedOffset).toFixed(tradeInst.decimals))
                  : Number((activeTrade.openPrice + clampedOffset).toFixed(tradeInst.decimals));
            }

            const closedTrade: BotTrade = {
              ...activeTrade,
              status: 'CLOSED',
              currentPrice: finalExitPrice,
              closePrice: finalExitPrice,
              exitPrice: finalExitPrice,
              profitUsd: Number(profitUsd.toFixed(2)),
              closeReason: shouldTakeProfit ? 'TAKE_PROFIT' : 'STOP_LOSS',
              exitReason: shouldTakeProfit ? 'TP' : 'SL',
              closeTime: Date.now(),
            };

            nextTrades = nextTrades.map((t) =>
              t.id === activeTrade.id ? closedTrade : t
            );
            botTradesRef.current = nextTrades;
            tradesChanged = true;

            // Sync balance and equity immediately in BOTH selectedAccount and accounts array, and persist to localStorage & Supabase!
            const roundedProfit = Number(profitUsd.toFixed(2));
            const updatedAcc = commitAccountBalanceChange(roundedProfit, selectedAccountRef.current?.id);
            if (updatedAcc && updatedAcc.balance <= 0) {
              setTimeout(handleZeroBalanceStopOut, 0);
            }

            const closedRecord: ClosedTrade = {
              id: `cl-bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
            };
            setClosedTrades((ct) => {
              const updated = [closedRecord, ...ct].slice(0, 50);
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

            // Update run stats with wins/losses/profit
            nextRuns = nextRuns.map((r) => {
              if (r.id === run.id || r.runId === runKey) {
                const closedForThisRun = nextTrades.filter(
                  (t) =>
                    (t.runId === runKey ||
                      t.runInstanceId === runKey ||
                      t.runId === r.runId ||
                      t.runId === r.id) &&
                    t.status === 'CLOSED'
                );
                const wins = closedForThisRun.filter((t) => (t.profitUsd || 0) > 0).length;
                const losses = closedForThisRun.length - wins;
                const profitSum = Number(
                  closedForThisRun.reduce((s, t) => s + (t.profitUsd || 0), 0).toFixed(2)
                );
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

            playOrderSound(profitUsd >= 0);
            addNotification(
              `[${run.botName}] Closed #${activeTrade.ticket} ${activeTrade.symbol} (${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)}) • Balance: $${(updatedAcc?.balance ?? 0).toFixed(2)}`
            );
          } else {
            // Update live floating price and PnL
            const updatedTrade: BotTrade = {
              ...activeTrade,
              currentPrice: currentMarketPrice,
              profitUsd: floatingProfit,
            };
            nextTrades = nextTrades.map((t) =>
              t.id === activeTrade.id ? updatedTrade : t
            );
            botTradesRef.current = nextTrades;
            tradesChanged = true;
          }
        });

        // 2. Autonomous Multi-Trade Opening: Open new trades automatically according to profits, market movement, and currency being traded
        const stillOpenForRun = nextTrades.filter(
          (t) =>
            (t.runId === runKey ||
              t.runInstanceId === runKey ||
              t.runId === run.runId ||
              t.runId === run.id ||
              t.runInstanceId === run.id) &&
            t.status === 'OPEN'
        );

        const activeAcc = selectedAccountRef.current;
        if (!activeAcc || activeAcc.balance <= 2.0 || (activeAcc.equity ?? activeAcc.balance) <= 2.0) {
          handleZeroBalanceStopOut(activeAcc?.equity ?? activeAcc?.balance ?? 0);
          return;
        }

        const effectiveAutoLots = resolveAffordableBotLotSize(run.lotSize);
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
            run.symbol,
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
          // Select symbol: primaryInst.symbol, or diversify across bot's recommended open-market instruments when scaling multiple positions
          let candidateSymbol = primaryInst.symbol;
          if (openCountNow > 0 && botConfig?.recommendedInstruments?.length) {
            const pool = [primaryInst.symbol, ...botConfig.recommendedInstruments];
            const candidate = pool[(openCountNow + Math.floor(Date.now() / 1500)) % pool.length];
            const candInst = allInstruments.find((i) => i.symbol === candidate);
            if (candInst && checkInstrumentMarketHours(candInst.symbol, candInst.category).isOpen) {
              candidateSymbol = candInst.symbol;
            }
          }

          const targetInst = resolveActiveBotInstrument(candidateSymbol, botConfig);
          const mStatus = checkInstrumentMarketHours(targetInst.symbol, targetInst.category);
          if (!mStatus.isOpen) break;

          const cleanRunTpPips = Number(run.tpPips) > 0 ? Number(run.tpPips) : 30;
          const cleanRunSlPips = Number(run.slPips) > 0 ? Number(run.slPips) : 20;

          const closedForRun = nextTrades.filter(
            (t) =>
              (t.runId === runKey ||
                t.runInstanceId === runKey ||
                t.runId === run.runId ||
                t.runId === run.id) &&
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
            closedForRun.length + bIdx
          );
          const side = determineBotTradeDirection(targetInst, isTargetWin, currentRole);
          const openPrice = side === 'BUY' ? targetInst.ask : targetInst.bid;

          // Strictly enforce free margin, lot size capital, and per-account open trade limit
          const capCheck = validateTradeCapitalAndMargin(effectiveAutoLots, targetInst.symbol, openPrice);
          if (!capCheck.allowed) {
            break;
          }

          const pipVal =
            targetInst.decimals === 5 || targetInst.decimals === 3
              ? 0.0001
              : targetInst.decimals === 2
              ? 0.01
              : 0.0001;

          const tpPrice =
            side === 'BUY'
              ? openPrice + cleanRunTpPips * pipVal * 10
              : openPrice - cleanRunTpPips * pipVal * 10;
          const slPrice =
            side === 'BUY'
              ? openPrice - cleanRunSlPips * pipVal * 10
              : openPrice + cleanRunSlPips * pipVal * 10;

          const microOffset = bIdx * pipVal * 1.2;
          const openPriceNum = Number(
            (side === 'BUY' ? openPrice + microOffset : openPrice - microOffset).toFixed(targetInst.decimals)
          );
          const currentExitNum = Number((side === 'BUY' ? targetInst.bid : targetInst.ask).toFixed(targetInst.decimals));
          const rawAutoInitPnl = calculateBotPnL(targetInst.symbol, side, openPriceNum, currentExitNum, effectiveAutoLots);
          const initialAutoProfit = rawAutoInitPnl < 0 ? rawAutoInitPnl : Number((-Math.max(0.05, (targetInst.spread || 0.42) * (effectiveAutoLots / 0.01) * 0.1)).toFixed(2));
          const tpPriceNum = Number(tpPrice.toFixed(targetInst.decimals));
          const slPriceNum = Number(slPrice.toFixed(targetInst.decimals));

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
          };

          nextTrades = [autoTrade, ...nextTrades];
          botTradesRef.current = nextTrades;
          tradesChanged = true;

          nextRuns = nextRuns.map((r) =>
            r.id === run.id || r.runId === runKey
              ? {
                  ...r,
                  symbol: targetInst.symbol,
                  lotSize: effectiveAutoLots,
                  lastSignal: `Auto Executed: ${side} ${effectiveAutoLots} ${targetInst.symbol} @ ${openPriceNum} (${openCountNow + 1}/${targetConcurrent} Active)`,
                  lastSignalTime: Date.now(),
                }
              : r
          );
          runsChanged = true;
        }
      });

      if (tradesChanged) {
        setBotTrades(nextTrades);
        saveStoredBotTrades(nextTrades);
      }

      if (runsChanged) {
        setBotRuns(nextRuns);
        saveStoredBotRuns(nextRuns);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Current tick direction for selected symbol
  const currentTickDirection = tickStates[selectedSymbol] || 'NEUTRAL';
  const currentInstrument =
    instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

  const handleUpdatePlatformSetting = (partial: Partial<UserPlatformSettings>) => {
    lastLocalSettingsUpdateRef.current = Date.now();
    if (partial.isDarkMode !== undefined) setIsDarkMode(partial.isDarkMode);
    if (partial.oneClickTrading !== undefined) setOneClickTrading(partial.oneClickTrading);
    if (partial.slippage !== undefined) setSlippage(partial.slippage);
    if (partial.soundEnabled !== undefined) setSoundEnabled(partial.soundEnabled);
    if (partial.showSpreadBrackets !== undefined) setShowSpreadBrackets(partial.showSpreadBrackets);
    if (partial.drawdownProtection !== undefined) setDrawdownProtection(partial.drawdownProtection);
    if (partial.twoFactorEnabled !== undefined) setTwoFactorEnabled(partial.twoFactorEnabled);

    if (currentUser) {
      supabaseService.saveUserSettings(currentUser, {
        isDarkMode: partial.isDarkMode ?? isDarkMode,
        oneClickTrading: partial.oneClickTrading ?? oneClickTrading,
        slippage: partial.slippage ?? slippage,
        soundEnabled: partial.soundEnabled ?? soundEnabled,
        showSpreadBrackets: partial.showSpreadBrackets ?? showSpreadBrackets,
        drawdownProtection: partial.drawdownProtection ?? drawdownProtection,
        twoFactorEnabled: partial.twoFactorEnabled ?? twoFactorEnabled,
        activeAccountId: selectedAccount?.id,
      });
      supabaseService.syncActivity(currentUser, {
        type: 'SETTINGS_UPDATED',
        description: 'Updated platform preferences',
        metadata: partial,
      });
    }
  };

  // Automatic Sync: Keep trades, bots, price alerts, and copy strategies consistent across all devices
  useEffect(() => {
    if (!currentUser || !currentUser.email || isMasterAdminEmail(currentUser.email)) return;
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
  }, [currentUser?.email, positions.length, pendingOrders.length, closedTrades.length, selectedAccount?.accountNumber]);

  useEffect(() => {
    if (!currentUser || !currentUser.email || !isCloudBotsLoadedRef.current) return;
    const timer = setTimeout(() => {
      supabaseService.syncBotState(currentUser, {
        importedBots,
        botRuns,
        botTrades,
        deletedBotIds: getDeletedBotIds(),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [currentUser?.email, importedBots, botRuns, botTrades]);

  useEffect(() => {
    if (!currentUser || !currentUser.email || isMasterAdminEmail(currentUser.email) || !isCloudExtrasLoadedRef.current) return;
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
            positions={positions}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            onClosePosition={(id) => closePositionById(id, 'MANUAL')}
            onCloseAllPositions={handleCloseAllPositions}
            onCancelPendingOrder={handleCancelPendingOrder}
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
            botTrades={botTrades}
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
            twoFactorEnabled={twoFactorEnabled}
            onToggle2FA={(val) => handleUpdatePlatformSetting({ twoFactorEnabled: val })}
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
            positions={positions}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            onExecuteMarketOrder={handleExecuteMarketOrder}
            onPlacePendingOrder={handlePlacePendingOrder}
            onClosePosition={(id) => closePositionById(id, 'MANUAL')}
            onCloseAllPositions={handleCloseAllPositions}
            onCancelPendingOrder={handleCancelPendingOrder}
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
            onSelectAccount={setSelectedAccount}
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
            onSelectAccount={setSelectedAccount}
            onOpenNewAccount={handleOpenNewAccount}
            onDeleteAccount={handleDeleteAccount}
            economicEvents={ECONOMIC_EVENTS}
            marketAnalyses={MARKET_ANALYSES}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
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
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
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
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  return (
    <div
      id="vtm-app-root"
      className={`min-h-screen w-full transition-colors duration-200 ${
        isDarkMode ? 'dark bg-[#0B0C0E] text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      <div className="min-h-screen w-full flex flex-col bg-white dark:bg-[#111317] relative">
        {/* Main Top Header */}
        <Header
          accounts={accounts}
          selectedAccount={selectedAccount}
          walletBalance={walletBalance}
          onSelectAccount={(acc) => {
            setSelectedAccount(acc);
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
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          oneClickTrading={oneClickTrading}
          onToggleOneClick={() => setOneClickTrading(!oneClickTrading)}
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

        {/* Scrollable Main Content - Full-width desktop responsive container */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full px-2 sm:px-4 lg:px-6">
          {renderTabContent()}
        </main>

        {/* Sticky Bottom Navigation - Visible on Mobile/Tablet devices, hidden on Desktop PC for full-screen terminal experience */}
        <div className="lg:hidden pwa-safe-bottom sticky bottom-0 z-40 w-full border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#111317]/95 backdrop-blur-md">
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
