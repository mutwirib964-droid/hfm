import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ActionPopup } from './types';
import { UserRole, BotStrategyConfig, BotRunInstance, BotTrade, UserAuthProfile } from './types/botTypes';
import {
  DEFAULT_INBUILT_BOTS,
  loadStoredBotRuns,
  saveStoredBotRuns,
  loadStoredBotTrades,
  saveStoredBotTrades,
  loadStoredImportedBots,
  saveStoredImportedBots,
  evaluateTargetWinOrLoss,
  determineBotTradeDirection,
  calculateBotPnL,
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
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
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [candles, setCandles] = useState<Candle[]>([]);

  // Real-time Tick States for Green / Red Highlights: Map of symbol -> 'UP' | 'DOWN' | 'NEUTRAL'
  const [tickStates, setTickStates] = useState<Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>>({});

  // User Authentication & Session - STRICT SECURITY: NEVER log in if account was never opened
  const [currentUser, setCurrentUser] = useState<UserAuthProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vtm_auth_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.email || !parsed.isLoggedIn) {
        localStorage.removeItem('vtm_auth_user');
        return null;
      }
      // Verify account actually exists in registered users registry
      const registered = findRegisteredUser(parsed.email);
      if (!registered) {
        // User was never registered or platform was wiped to zero users - NEVER log in!
        console.warn('[Security] Refused auto-login: user not found in registered accounts:', parsed.email);
        localStorage.removeItem('vtm_auth_user');
        return null;
      }
      return registered;
    } catch (e) {
      console.error('Failed to verify vtm_auth_user', e);
      localStorage.removeItem('vtm_auth_user');
      return null;
    }
  });

  // Verify session and load complete synchronized data from Supabase database on mount
  useEffect(() => {
    if (!currentUser) return;
    if (supabaseService.isConfigured()) {
      supabaseService.findUserInDatabase(currentUser.email).then((remote) => {
        if (!remote) {
          console.warn('[Security] User does not exist in Supabase database. Signing out immediately.');
          localStorage.removeItem('vtm_auth_user');
          setCurrentUser(null);
          return;
        }

        // 1. Fetch Remote Financials
        supabaseService.fetchUserFinancials(currentUser).then((remoteFin) => {
          if (remoteFin) {
            setWalletBalance(remoteFin.walletBalance);
            if (remoteFin.accounts && remoteFin.accounts.length > 0) {
              setAccounts(remoteFin.accounts);
              const sel =
                remoteFin.accounts.find((a) => a.id === remoteFin.selectedAccountId) ||
                remoteFin.accounts[0];
              setSelectedAccount(sel);
            }
            if (remoteFin.transactions && remoteFin.transactions.length > 0) {
              setTransactions(remoteFin.transactions);
            }
          }
        });

        // 2. Fetch Remote Trading Accounts
        supabaseService.fetchTradingAccounts(currentUser).then((remoteAccs) => {
          if (remoteAccs && remoteAccs.length > 0) {
            setAccounts(remoteAccs);
            setSelectedAccount((curr) => {
              if (!curr) return remoteAccs[0];
              return remoteAccs.find((a) => a.id === curr.id) || remoteAccs[0];
            });
          }
        });

        // 3. Fetch Remote Trades (Positions, Pending Orders, Closed Trades)
        supabaseService.fetchUserTrades(currentUser).then((remoteTrades) => {
          if (remoteTrades) {
            if (remoteTrades.positions.length > 0) setPositions(remoteTrades.positions);
            if (remoteTrades.pendingOrders.length > 0) setPendingOrders(remoteTrades.pendingOrders);
            if (remoteTrades.closedTrades.length > 0) setClosedTrades(remoteTrades.closedTrades);
          }
        });

        // 4. Fetch Remote User Settings & Preferences
        supabaseService.fetchUserSettings(currentUser).then((settings) => {
          if (settings) {
            setIsDarkMode(settings.isDarkMode);
            setOneClickTrading(settings.oneClickTrading);
            setSlippage(settings.slippage);
            setSoundEnabled(settings.soundEnabled);
            setShowSpreadBrackets(settings.showSpreadBrackets);
            setDrawdownProtection(settings.drawdownProtection);
            setTwoFactorEnabled(settings.twoFactorEnabled);
          }
        });

        // 5. Update last login & active device in Supabase
        supabaseService.updateUserLastLoginInDatabase(currentUser.email);
        supabaseService.syncDevice(currentUser);
      });
    }
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

  // Trading Positions, Orders, and History (Clean initial state - no running trades on account open)
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // HFcopy Strategies State (Clean initial state)
  const [providers, setProviders] = useState<StrategyProvider[]>(STRATEGY_PROVIDERS);
  const [followedStrategies, setFollowedStrategies] = useState<FollowedStrategy[]>([]);

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
    setActionToasts((prev) => [fullPopup, ...prev.slice(0, 3)]);
    addNotification(fullPopup.title);
  };

  const handleDismissToast = (id: string) => {
    setActionToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Transactions Log
  const [transactions, setTransactions] = useState<Transaction[]>(() => initialFinancials.transactions || INITIAL_TRANSACTIONS);

  // Notifications
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; time: string; read: boolean }>
  >([
    {
      id: 'notif-1',
      title: 'Welcome to VTM Markets WebTrader. Central VTM One Wallet is $0.00 (deposit required for live funds).',
      time: 'Just now',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Real accounts require verification & initial deposit. 24/7 Crypto market is open.',
      time: 'Just now',
      read: true,
    },
  ]);

  const handleUserSignIn = (profile: UserAuthProfile) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('vtm_auth_user', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save vtm_auth_user', e);
    }
    if (profile.role) {
      setUserRole(profile.role);
      localStorage.setItem('vtm_user_role', profile.role);
    }

    // Strict requirement: When an account opens or is logged in, no running trades, no active bots
    setPositions([]);
    setPendingOrders([]);
    setClosedTrades([]);
    setFollowedStrategies([]);
    const cleanRuns = loadStoredBotRuns();
    setBotRuns(cleanRuns);
    const cleanTrades = loadStoredBotTrades();
    setBotTrades(cleanTrades);

    if (profile.isNewRegistration) {
      logUserActivity(profile, 'SIGNUP', `Trader registered: ${profile.email || profile.name}`);
      supabaseService.syncDevice(profile);
      // Clean zero account initialization
      const init = initializeUserFinancials(profile, true);
      setAccounts(init.accounts);
      setSelectedAccount(null);
      setWalletBalance(init.walletBalance);
      setTransactions(init.transactions || []);
      addNotification(
        `Welcome ${profile.name}! Your account has zero trading accounts. Open a Live or Demo account in the Accounts tab.`
      );
    } else if (profile.id && profile.id.startsWith('demo-')) {
      const demoAcc = INITIAL_ACCOUNTS.find((a) => a.type === 'Demo') || INITIAL_ACCOUNTS[1];
      setAccounts(INITIAL_ACCOUNTS);
      setSelectedAccount(demoAcc);
      setWalletBalance(0);
      addNotification(
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
        addNotification(`Welcome back, ${profile.name}!`);
      } else {
        const init = initializeUserFinancials(profile, false);
        setAccounts(init.accounts);
        setSelectedAccount(init.accounts.length > 0 ? init.accounts[0] : null);
        setWalletBalance(init.walletBalance);
        setTransactions(init.transactions || []);
      }
    }

    triggerActionPopup({
      type: 'LOGIN_SUCCESS',
      title: `Welcome, ${profile.name}!`,
      subtitle: 'Session authenticated. Clean workspace loaded with zero running trades and zero active bots.',
    });
  };

  const handleUserSignOut = () => {
    // Save current user financials before logging out
    if (currentUser) {
      logUserActivity(currentUser, 'LOGOUT', 'Trader signed out');
      saveUserFinancials(currentUser, {
        walletBalance,
        accounts,
        selectedAccountId: selectedAccount?.id,
        transactions,
      });
    }
    setCurrentUser(null);
    localStorage.removeItem('vtm_auth_user');
    addNotification('You have signed out from the platform.');
    triggerActionPopup({
      type: 'LOGOUT_SUCCESS',
      title: 'Signed Out',
      subtitle: 'All financial balances & account configurations saved securely.',
    });
  };

  // Automated Trading Bots & Role Management
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('vtm_user_role') as UserRole) || 'marketer';
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

  // Synchronize dark mode class to document element for Tailwind CSS
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Generate initial candles for selected symbol and timeframe
  useEffect(() => {
    const inst = instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];
    const initial = generateCandles(inst.bid, timeframe, 75);
    setCandles(initial);
  }, [selectedSymbol, timeframe]);

  // Reference to latest real TradingView quotes for rock-solid price synchronization
  const realTVQuotesRef = useRef<Map<string, TVQuote>>(new Map());

  // =========================================================================
  // REAL TRADINGVIEW PRICE INTEGRATION & HIGH-FREQUENCY REAL-TIME ENGINE
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    let highlightTimeout: any = null;

    // 1. Master sync: Fetch exact real prices from TradingView Scanner API
    const fetchTradingViewFeed = async () => {
      try {
        const quotes = await tvService.fetchRealPrices();
        if (!isMounted || quotes.size === 0) return;

        quotes.forEach((q, sym) => {
          realTVQuotesRef.current.set(sym, q);
        });

        setInstruments((prevInstruments) => {
          const nextTickStates: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {};
          let hasPriceChanged = false;

          const updated = prevInstruments.map((inst) => {
            const quote = quotes.get(inst.symbol);
            if (!quote) return inst;

            const oldBid = inst.bid;
            const newBid = quote.bid;
            const newAsk = quote.ask;

            let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
            if (newBid > oldBid) {
              direction = 'UP';
              hasPriceChanged = true;
            } else if (newBid < oldBid) {
              direction = 'DOWN';
              hasPriceChanged = true;
            }
            if (direction !== 'NEUTRAL') {
              nextTickStates[inst.symbol] = direction;
            }

            const sparkline = newBid !== oldBid
              ? [...inst.sparkline.slice(1), newBid]
              : inst.sparkline;

            return {
              ...inst,
              bid: newBid,
              ask: newAsk,
              spread: quote.spread,
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
            }, 700);
          }

          return updated;
        });
      } catch (err) {
        console.warn('TradingView sync notice:', err);
      }
    };

    // 2. Continuous High-Frequency Micro-Tick Stream (Auction Flutter)
    // Ensures buy/sell buttons, charts, and market lists tick dynamically like an institutional terminal
    const runLiveMicroTicks = () => {
      if (!isMounted) return;

      setInstruments((prevInstruments) => {
        const activeSym = selectedSymbolRef.current;
        const nextTickStates: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {};
        let changed = false;

        // Choose 2 to 4 other random instruments to tick along with the active symbol
        const candidates = prevInstruments.filter((i) => i.symbol !== activeSym);
        const randomPicks = new Set<string>();
        if (candidates.length > 0) {
          for (let i = 0; i < Math.min(3, candidates.length); i++) {
            const idx = Math.floor(Math.random() * candidates.length);
            randomPicks.add(candidates[idx].symbol);
          }
        }

        const updated = prevInstruments.map((inst) => {
          const isTarget = inst.symbol === activeSym || randomPicks.has(inst.symbol);
          if (!isTarget) return inst;

          // Anchor to master TradingView quote to prevent drift
          const anchor = realTVQuotesRef.current.get(inst.symbol);
          const anchorBid = anchor ? anchor.bid : inst.bid;
          const anchorAsk = anchor ? anchor.ask : inst.ask;
          const anchorMid = (anchorBid + anchorAsk) / 2;
          const currentMid = (inst.bid + inst.ask) / 2;
          const drift = currentMid - anchorMid;

          // Sub-pip micro tick size based on asset class
          let step = 0.00001;
          let maxDrift = 0.00004;

          if (inst.decimals >= 5) {
            step = 0.00001;
            maxDrift = 0.00003;
          } else if (inst.decimals === 3) {
            step = 0.001;
            maxDrift = 0.003;
          } else if (inst.decimals === 2) {
            if (inst.symbol === 'XAUUSD') {
              step = 0.03;
              maxDrift = 0.12;
            } else if (inst.symbol.includes('OIL')) {
              step = 0.01;
              maxDrift = 0.04;
            } else {
              step = 0.02;
              maxDrift = 0.08;
            }
          } else {
            step = 0.1;
            maxDrift = 0.5;
          }

          // Bound price tightly to TradingView anchor
          let dir: 'UP' | 'DOWN';
          if (drift > maxDrift) {
            dir = 'DOWN';
          } else if (drift < -maxDrift) {
            dir = 'UP';
          } else {
            dir = Math.random() > 0.48 ? 'UP' : 'DOWN';
          }

          const spread = inst.spread > 0 ? inst.spread : Math.max(anchor ? anchor.spread : 0.00002, 0.00002);
          const halfSpread = spread / 2;

          const newMid = dir === 'UP' ? currentMid + step : currentMid - step;
          const newBid = Number((newMid - halfSpread).toFixed(inst.decimals));
          const newAsk = Number((newMid + halfSpread).toFixed(inst.decimals));

          if (newBid !== inst.bid) {
            changed = true;
            nextTickStates[inst.symbol] = dir;

            // When active trading symbol ticks, immediately update chart candle
            // Going up -> exact Ask price (matches BUY button)
            // Going down -> exact Bid price (matches SELL button)
            if (inst.symbol === activeSym) {
              const exactChartPrice = dir === 'UP' ? newAsk : newBid;
              setCandles((prev) => {
                if (prev.length === 0) return prev;
                const last = { ...prev[prev.length - 1] };
                last.close = exactChartPrice;
                last.high = Math.max(last.high, exactChartPrice);
                last.low = Math.min(last.low, exactChartPrice);
                return [...prev.slice(0, prev.length - 1), last];
              });
            }
          }

          const sparkline = [...inst.sparkline.slice(1), newBid];

          return {
            ...inst,
            bid: newBid,
            ask: newAsk,
            sparkline,
          };
        });

        if (changed) {
          setTickStates((prev) => ({ ...prev, ...nextTickStates }));
          if (highlightTimeout) clearTimeout(highlightTimeout);
          highlightTimeout = setTimeout(() => {
            if (isMounted) setTickStates({});
          }, 600);
        }

        return updated;
      });
    };

    // Initial immediate fetch
    fetchTradingViewFeed();

    // Fast master anchor poll every 1200ms
    const tvInterval = setInterval(fetchTradingViewFeed, 1200);

    // High-frequency micro-ticks every 420ms for smooth live movement
    const tickInterval = setInterval(runLiveMicroTicks, 420);

    return () => {
      isMounted = false;
      clearInterval(tvInterval);
      clearInterval(tickInterval);
      if (highlightTimeout) clearTimeout(highlightTimeout);
    };
  }, []);

  // Update floating positions P&L and check pending orders when prices change
  useEffect(() => {
    const currentInstMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));

    // Recalculate floating P&L
    setPositions((prev) =>
      prev.map((pos) => {
        const inst = currentInstMap.get(pos.symbol);
        if (!inst) return pos;

        const currentPrice = pos.side === 'BUY' ? inst.bid : inst.ask;
        const contractSize = inst.category === 'Forex' ? 100000 : 100;
        const priceDiff =
          pos.side === 'BUY'
            ? currentPrice - pos.openPrice
            : pos.openPrice - currentPrice;
        const pnl = Number((priceDiff * pos.lots * contractSize + pos.swap).toFixed(2));

        // Check automated SL / TP triggers
        if (
          pos.tp &&
          ((pos.side === 'BUY' && currentPrice >= pos.tp) ||
            (pos.side === 'SELL' && currentPrice <= pos.tp))
        ) {
          closePositionById(pos.id, 'TP', currentPrice);
        } else if (
          pos.sl &&
          ((pos.side === 'BUY' && currentPrice <= pos.sl) ||
            (pos.side === 'SELL' && currentPrice >= pos.sl))
        ) {
          closePositionById(pos.id, 'SL', currentPrice);
        }

        return {
          ...pos,
          currentPrice,
          pnl,
        };
      })
    );

    // Recalculate floating P&L on bot open trades to match instruments in real-time
    setBotTrades((prevBotTrades) => {
      let modified = false;
      const updated = prevBotTrades.map((bt) => {
        if (bt.status !== 'OPEN') return bt;
        const inst = currentInstMap.get(bt.symbol);
        if (!inst) return bt;
        const currentPrice = bt.side === 'BUY' ? inst.bid : inst.ask;
        const profitUsd = calculateBotPnL(bt.symbol, bt.side, bt.openPrice, currentPrice, bt.lotSize);
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
      const dir = tickStates[selectedSymbol] || 'NEUTRAL';
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const last = { ...prevCandles[prevCandles.length - 1] };
        
        // Exact User Rule:
        // If market is going up on chart: show exact price on BUY, SELL shows with spread difference
        // If market is going down on chart: show exact price on SELL, BUY shows with spread difference
        let executionPrice: number;
        if (dir === 'UP') {
          executionPrice = activeInst.ask; // Matches BUY button price exactly
        } else if (dir === 'DOWN') {
          executionPrice = activeInst.bid; // Matches SELL button price exactly
        } else {
          // If neutral/steady, keep aligned with current candle color
          executionPrice = last.close >= last.open ? activeInst.ask : activeInst.bid;
        }

        last.close = executionPrice;
        last.high = Math.max(last.high, executionPrice);
        last.low = Math.min(last.low, executionPrice);
        return [...prevCandles.slice(0, prevCandles.length - 1), last];
      });
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
  }, [instruments]);

  // Zero-balance safety mechanism: account NEVER goes negative; closes all open trades & bots immediately
  const handleZeroBalanceStopOut = () => {
    // 1. Immediately liquidate all manual open positions
    setPositions([]);

    // 2. Immediately stop all active algorithmic bots
    setBotRuns((runs) => {
      const stopped = runs.map((r) => ({ ...r, status: 'STOPPED' as const, stoppedAt: Date.now() }));
      saveStoredBotRuns(stopped);
      return stopped;
    });

    // 3. Mark all open bot trades as closed
    setBotTrades((trades) => {
      const closed = trades.map((t) => (t.status === 'OPEN' ? { ...t, status: 'CLOSED' as const, closeTime: Date.now() } : t));
      saveStoredBotTrades(closed);
      return closed;
    });

    // 4. Force clamp account to 0 (never negative)
    setSelectedAccount((acc) => (!acc ? null : {
      ...acc,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      marginLevel: 0,
    }));

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === selectedAccount?.id
          ? { ...a, balance: 0, equity: 0, margin: 0, freeMargin: 0, marginLevel: 0 }
          : a
      )
    );

    playOrderSound(false);
    addNotification('Balance reached zero: all open trades and bots closed immediately.');
    triggerActionPopup({
      type: 'ERROR',
      title: 'Account balance reached zero. All open trades and bots closed.',
    });
  };

  // Recalculate Account Equity & Margins + Zero Balance Protection
  useEffect(() => {
    if (!selectedAccount) return;
    const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
    const totalMargin = positions.reduce((acc, p) => {
      const inst = instruments.find((i) => i.symbol === p.symbol);
      const contractSize = inst?.category === 'Forex' ? 100000 : 100;
      const lev = parseInt(selectedAccount.leverage?.split(':')[1] || '500', 10);
      return acc + (p.lots * contractSize * (inst?.bid || 1)) / lev;
    }, 0);

    const calculatedEquity = Number(((selectedAccount.balance ?? 0) + totalPnl).toFixed(2));

    // Never let balance/equity go negative - immediately close all open trades and bots when reaching zero
    if (calculatedEquity <= 0 && (positions.length > 0 || botRuns.some((r) => r.status === 'RUNNING'))) {
      handleZeroBalanceStopOut();
      return;
    }

    const newEquity = Math.max(0, calculatedEquity);
    const freeMargin = Number(Math.max(0, newEquity - totalMargin).toFixed(2));
    const marginLevel = totalMargin > 0 ? Number(((newEquity / totalMargin) * 100).toFixed(1)) : 0;

    setSelectedAccount((prev) => (!prev ? null : ({
      ...prev,
      equity: newEquity,
      margin: Number(totalMargin.toFixed(2)),
      freeMargin,
      marginLevel,
    })));
  }, [positions, instruments, selectedAccount?.balance, selectedAccount?.leverage]);

  // Helper to add notification with guaranteed unique key
  const addNotification = (title: string) => {
    const uniqueId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setNotifications((prev) => [
      {
        id: uniqueId,
        title,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);
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

    const fillPrice =
      params.executionPrice || (params.side === 'BUY' ? inst.ask : inst.bid);
    const ticket = Math.floor(7000000 + Math.random() * 999999);

    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random()}`,
      ticket,
      symbol: params.symbol,
      side: params.side,
      lots: params.lots,
      openPrice: fillPrice,
      currentPrice: fillPrice,
      sl: params.sl,
      tp: params.tp,
      pnl: 0,
      swap: 0,
      commission: 0,
      openTime: Date.now(),
    };

    setPositions((prev) => [newPos, ...prev]);
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
        pnl: 0,
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
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;

    const inst = instruments.find((i) => i.symbol === pos.symbol);
    const closePrice =
      customClosePrice ||
      (pos.side === 'BUY'
        ? inst?.bid || pos.currentPrice
        : inst?.ask || pos.currentPrice);

    const closed: ClosedTrade = {
      id: `cl-${Date.now()}`,
      ticket: pos.ticket,
      symbol: pos.symbol,
      side: pos.side,
      lots: pos.lots,
      openPrice: pos.openPrice,
      closePrice,
      pnl: pos.pnl,
      openTime: pos.openTime,
      closeTime: Date.now(),
      reason,
    };

    setClosedTrades((prev) => [closed, ...prev]);
    setPositions((prev) => prev.filter((p) => p.id !== id));

    // Save closed trade to Supabase cloud database
    if (currentUser) {
      supabaseService.saveTrade(currentUser, {
        id: closed.id,
        ticket: closed.ticket,
        accountNumber: selectedAccount?.accountNumber,
        symbol: closed.symbol,
        side: closed.side,
        orderType: 'MARKET',
        lots: closed.lots,
        openPrice: closed.openPrice,
        currentPrice: closePrice,
        closePrice: closePrice,
        sl: null,
        tp: null,
        pnl: closed.pnl,
        status: 'CLOSED',
        openTime: closed.openTime,
        closeTime: closed.closeTime,
        closeReason: closed.reason,
      });
      supabaseService.syncActivity(currentUser, {
        type: 'TRADE_CLOSED',
        description: `Closed #${closed.ticket} ${closed.symbol} (${closed.pnl >= 0 ? '+' : ''}$${closed.pnl.toFixed(2)})`,
        metadata: { ticket: closed.ticket, symbol: closed.symbol, pnl: closed.pnl },
      });
    }

    // Update balance - NEVER let balance go negative!
    setSelectedAccount((acc) => {
      if (!acc) return null;
      const newBal = Math.max(0, Number((acc.balance + pos.pnl).toFixed(2)));
      if (newBal <= 0) {
        setTimeout(handleZeroBalanceStopOut, 0);
      }
      return {
        ...acc,
        balance: newBal,
      };
    });

    playOrderSound(pos.pnl >= 0);
    addNotification(
      `Closed #${pos.ticket} ${pos.symbol} (${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)})`
    );

    triggerActionPopup({
      type: 'TRADE_CLOSED',
      title: `Trade of ${pos.symbol} is closed`,
      details: {
        symbol: pos.symbol,
        side: pos.side,
        lots: pos.lots,
        ticket: pos.ticket,
        price: closePrice,
        pnl: pos.pnl,
        accountNumber: selectedAccount?.accountNumber,
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
  const handleDeposit = (params: { method: string; amount: number; targetAccount: string; reference?: string }) => {
    if (params.amount < 16) {
      triggerActionPopup({
        type: 'DEPOSIT_FAILED',
        title: 'Deposit Unsuccessful',
        subtitle: 'Minimum deposit requirement is $16.00 USD.',
        details: {
          amount: params.amount,
          method: params.method,
          reason: 'Minimum funding amount is $16.00 USD.',
        },
      });
      return;
    }

    const ref = params.reference || `VTM-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'DEPOSIT',
      method: params.method,
      amount: params.amount,
      currency: 'USD',
      status: 'COMPLETED',
      timestamp: Date.now(),
      reference: ref,
      details: `Funded to ${params.targetAccount}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (
      params.targetAccount === 'HF Wallet' ||
      params.targetAccount === 'VTM Wallet' ||
      params.targetAccount === 'VTM One Wallet' ||
      params.targetAccount.toLowerCase().includes('wallet')
    ) {
      const nextWallet = walletBalance + params.amount;
      setWalletBalance(nextWallet);
      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance: nextWallet,
          accounts,
          selectedAccountId: selectedAccount?.id,
          transactions: [newTx, ...transactions],
        });
      }
    } else {
      const nextAccounts = accounts.map((acc) =>
        acc.accountNumber === params.targetAccount ||
        `Account #${acc.accountNumber}` === params.targetAccount ||
        acc.id === params.targetAccount
          ? {
              ...acc,
              balance: acc.balance + params.amount,
              equity: acc.equity + params.amount,
              freeMargin: acc.freeMargin + params.amount,
            }
          : acc
      );
      setAccounts(nextAccounts);
      setSelectedAccount((acc) =>
        !acc ? null : nextAccounts.find((a) => a.id === acc.id) || acc
      );
      if (currentUser) {
        saveUserFinancials(currentUser, {
          walletBalance,
          accounts: nextAccounts,
          selectedAccountId: selectedAccount?.id,
          transactions: [newTx, ...transactions],
        });
      }
    }

    addNotification(`Deposit of $${params.amount.toFixed(2)} received successfully!`);

    // Save deposit to Supabase cloud database
    if (currentUser) {
      supabaseService.saveDeposit(currentUser, {
        id: newTx.id,
        targetAccount: params.targetAccount,
        amountUsd: params.amount,
        method: params.method,
        reference: ref,
        status: 'COMPLETED',
      });
      supabaseService.syncTransactions(currentUser, [newTx, ...transactions]);
      supabaseService.syncActivity(currentUser, {
        type: 'DEPOSIT',
        description: `Funded $${params.amount.toFixed(2)} to ${params.targetAccount} via ${params.method}`,
        metadata: { amount: params.amount, targetAccount: params.targetAccount, reference: ref },
      });
    }

    triggerActionPopup({
      type: 'DEPOSIT_SUCCESS',
      title: `Deposit of $${params.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} Successful!`,
      subtitle: `Instant payment received via ${params.method} and credited to ${params.targetAccount}. Ref: ${ref}`,
      details: {
        amount: params.amount,
        method: params.method,
        reference: ref,
        accountNumber: params.targetAccount,
      },
    });
  };

  // Withdrawal Handlers - Minimum withdrawal is strictly $35
  const handleWithdraw = (params: {
    method: string;
    amount: number;
    sourceAccount: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING';
  }) => {
    if (params.amount < 35) {
      triggerActionPopup({
        type: 'WITHDRAWAL_FAILED',
        title: 'Withdrawal Unsuccessful',
        subtitle: 'Minimum withdrawal requirement is $35.00 USD.',
        details: {
          amount: params.amount,
          method: params.method,
          reason: 'Minimum withdrawal amount is $35.00 USD.',
        },
      });
      return;
    }

    const ref = params.reference || `B2C${Math.floor(100000000 + Math.random() * 900000000)}`;
    const txStatus = params.status || 'COMPLETED';
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'WITHDRAWAL',
      method: params.method,
      amount: params.amount,
      currency: 'USD',
      status: txStatus,
      timestamp: Date.now(),
      reference: ref,
      details: `Withdrawal from ${params.sourceAccount}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    let nextWallet = walletBalance;
    let nextAccounts = accounts;

    if (
      params.sourceAccount === 'VTM Wallet' ||
      params.sourceAccount === 'VTM One Wallet' ||
      params.sourceAccount === 'HF Wallet' ||
      params.sourceAccount.toLowerCase().includes('wallet')
    ) {
      nextWallet = Math.max(0, walletBalance - params.amount);
      setWalletBalance(nextWallet);
    } else {
      nextAccounts = accounts.map((acc) =>
        acc.accountNumber === params.sourceAccount ||
        `Account #${acc.accountNumber}` === params.sourceAccount ||
        acc.id === params.sourceAccount
          ? {
              ...acc,
              balance: Math.max(0, acc.balance - params.amount),
              equity: Math.max(0, acc.equity - params.amount),
              freeMargin: Math.max(0, acc.freeMargin - params.amount),
            }
          : acc
      );
      setAccounts(nextAccounts);
      setSelectedAccount((acc) =>
        !acc ? null : nextAccounts.find((a) => a.id === acc.id) || acc
      );
    }

    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance: nextWallet,
        accounts: nextAccounts,
        selectedAccountId: selectedAccount?.id,
        transactions: [newTx, ...transactions],
      });
    }

    addNotification(
      txStatus === 'COMPLETED'
        ? `Safaricom B2C payout of $${params.amount.toFixed(2)} completed successfully!`
        : `Withdrawal request of $${params.amount.toFixed(2)} is pending approval`
    );

    // Save withdrawal to Supabase cloud database
    if (currentUser) {
      supabaseService.saveWithdrawal(currentUser, {
        id: newTx.id,
        sourceAccount: params.sourceAccount,
        amountUsd: params.amount,
        method: params.method,
        reference: ref,
        status: txStatus,
      });
      supabaseService.syncTransactions(currentUser, [newTx, ...transactions]);
      supabaseService.syncActivity(currentUser, {
        type: txStatus === 'COMPLETED' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_REQUESTED',
        description: `Safaricom B2C payout of $${params.amount.toFixed(2)} from ${params.sourceAccount} via ${params.method}. Ref: ${ref}`,
        metadata: { amount: params.amount, sourceAccount: params.sourceAccount, reference: ref, status: txStatus },
      });
    }

    triggerActionPopup({
      type: 'WITHDRAWAL_SUCCESS',
      title: `Withdrawal of $${params.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} Successful!`,
      subtitle: `Safaricom B2C instant payout disbursed from ${params.sourceAccount} via ${params.method}. Ref: ${ref}`,
      details: {
        amount: params.amount,
        method: params.method,
        reference: ref,
        accountNumber: params.sourceAccount,
      },
    });
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
    setAccounts(result.newAccounts);
    setTransactions(result.newTransactions);

    if (selectedAccount) {
      const refreshed = result.newAccounts.find(
        (a) => a.id === selectedAccount.id || a.accountNumber === selectedAccount.accountNumber
      );
      if (refreshed) {
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
    const newAcc: TradingAccount = {
      id: `acc-${Date.now()}`,
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
    };

    const nextAccounts = [...accounts, newAcc];
    setAccounts(nextAccounts);
    setSelectedAccount(newAcc);
    if (currentUser) {
      saveUserFinancials(currentUser, {
        walletBalance,
        accounts: nextAccounts,
        selectedAccountId: newAcc.id,
        transactions,
      });
    }
    addNotification(`Opened new ${params.type} #${num} (${params.tier})`);

    // Save newly opened trading account to Supabase
    if (currentUser) {
      supabaseService.syncTradingAccount(currentUser, newAcc);
      supabaseService.syncTradingAccounts(currentUser, nextAccounts);
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
    setUserRole(role);
    try {
      localStorage.setItem('vtm_user_role', role);
    } catch (e) {
      // ignore
    }
    addNotification(`Account role assigned: ${role.toUpperCase()}`);
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

    const runIdStr = `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const inst =
      instruments.find((i) => i.symbol === config.symbol) ||
      instruments.find((i) => i.symbol.includes(config.symbol.slice(0, 3))) ||
      instruments[0];

    // Verify market status for bot deployment
    const marketStatus = checkInstrumentMarketHours(config.symbol, inst?.category);
    if (!marketStatus.isOpen) {
      playOrderSound(false);
      addNotification(`Bot Alert: ${config.symbol} market is closed`);
      triggerActionPopup({
        type: 'ERROR',
        title: `${config.symbol} Market Closed`,
        subtitle: `Trading bot cannot be deployed while the market is closed (${marketStatus.sessionText}). ${marketStatus.nextOpenText}. You can deploy bots on 24/7 Crypto pairs (e.g. BTCUSD, ETHUSD, SOLUSD) anytime!`,
      });
      return;
    }

    const isTargetWin = evaluateTargetWinOrLoss(userRole, bot.type);
    const side = determineBotTradeDirection(inst, isTargetWin, userRole);
    const pipVal =
      inst.decimals === 5 || inst.decimals === 3
        ? 0.0001
        : inst.decimals === 2
        ? 0.01
        : 0.0001;

    const openPrice = side === 'BUY' ? inst.ask : inst.bid;
    const tpPrice =
      side === 'BUY'
        ? openPrice + config.tpPips * pipVal * 10
        : openPrice - config.tpPips * pipVal * 10;
    const slPrice =
      side === 'BUY'
        ? openPrice - config.slPips * pipVal * 10
        : openPrice + config.slPips * pipVal * 10;

    const openPriceNum = Number(openPrice.toFixed(inst.decimals));
    const tpPriceNum = Number(tpPrice.toFixed(inst.decimals));
    const slPriceNum = Number(slPrice.toFixed(inst.decimals));

    // Immediately open first trade so user is never waiting at zero
    const initialTrade: BotTrade = {
      id: `btrade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticket: Math.floor(840000 + Math.random() * 99999),
      runId: runIdStr,
      runInstanceId: runIdStr,
      botId: bot.id,
      botName: bot.name,
      symbol: config.symbol,
      side,
      lotSize: config.lotSize,
      openPrice: openPriceNum,
      currentPrice: openPriceNum,
      tp: tpPriceNum,
      sl: slPriceNum,
      tpPrice: tpPriceNum,
      slPrice: slPriceNum,
      openTime: Date.now(),
      status: 'OPEN',
      profitUsd: 0,
      targetOutcome: isTargetWin ? 'WIN' : 'LOSS',
    };

    const newRun: BotRunInstance = {
      id: runIdStr,
      runId: runIdStr,
      botId: bot.id,
      botName: bot.name,
      botType: bot.type,
      symbol: config.symbol,
      lotSize: config.lotSize,
      tpPips: config.tpPips,
      slPips: config.slPips,
      status: 'RUNNING',
      startedAt: Date.now(),
      totalTrades: 1,
      totalTradesCount: 1,
      winningTrades: 0,
      winCount: 0,
      losingTrades: 0,
      totalProfitUsd: 0,
      lastSignal: `Active Order: ${side} ${config.lotSize} @ ${openPriceNum}`,
    };

    setBotTrades((prev) => {
      const updated = [initialTrade, ...prev];
      saveStoredBotTrades(updated);
      return updated;
    });

    setBotRuns((prev) => {
      const updated = [newRun, ...prev];
      saveStoredBotRuns(updated);
      return updated;
    });

    playOrderSound(true);
    addNotification(
      `EA Activated: ${bot.name} on ${config.symbol} (Trade #${initialTrade.ticket} Executed @ ${openPriceNum})`
    );

    triggerActionPopup({
      type: 'BOT_STARTED',
      title: 'Bot started',
      details: {
        symbol: config.symbol,
        method: bot.name,
        accountNumber: selectedAccount?.accountNumber,
      },
    });
  };

  const handleToggleBotRun = (runId: string) => {
    const target = botRuns.find((r) => r.runId === runId || r.id === runId);
    if (!target) return;

    if (target.status !== 'RUNNING') {
      const inst = instruments.find((i) => i.symbol === target.symbol);
      const marketStatus = checkInstrumentMarketHours(target.symbol, inst?.category);
      if (!marketStatus.isOpen) {
        playOrderSound(false);
        addNotification(`Cannot run bot: ${target.symbol} market is closed`);
        triggerActionPopup({
          type: 'ERROR',
          title: `${target.symbol} is closed`,
        });
        return;
      }
    }

    setBotRuns((prev) => {
      const nextStatus = target.status === 'RUNNING' ? 'PAUSED' : 'RUNNING';
      const updated = prev.map((r) => {
        if (r.runId === runId || r.id === runId) {
          return { ...r, status: nextStatus };
        }
        return r;
      });
      saveStoredBotRuns(updated);

      triggerActionPopup({
        type: nextStatus === 'RUNNING' ? 'BOT_STARTED' : 'BOT_STOPPED',
        title: nextStatus === 'RUNNING' ? 'Bot started' : 'Bot closed',
      });
      return updated;
    });
  };

  const handleStopBotRun = (runId: string) => {
    setBotRuns((prev) => {
      const updated = prev.map((r) => {
        if (r.runId === runId || r.id === runId) {
          return { ...r, status: 'STOPPED' as const, stoppedAt: Date.now() };
        }
        return r;
      });
      saveStoredBotRuns(updated);
      return updated;
    });
    addNotification('EA algorithm stopped');

    triggerActionPopup({
      type: 'BOT_STOPPED',
      title: 'Bot closed',
      details: {
        accountNumber: selectedAccount?.accountNumber,
      },
    });
  };

  const handleDeleteBotRun = (runId: string) => {
    // 1. Permanently record in deleted bot IDs to prevent reappearing on logout, login, or refresh
    try {
      const deletedRaw = localStorage.getItem('vtm_deleted_bot_ids');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(runId)) {
        deletedIds.push(runId);
        localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {
      // ignore
    }

    // 2. Remove from botRuns
    setBotRuns((prev) => {
      const updated = prev.filter((r) => r.id !== runId && r.runId !== runId);
      saveStoredBotRuns(updated);
      return updated;
    });

    // 3. Settle and close open trades associated with this run
    setBotTrades((prev) => {
      const updated = prev.map((t) => {
        if ((t.runId === runId || t.runInstanceId === runId) && t.status === 'OPEN') {
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
      saveStoredBotTrades(updated);
      return updated;
    });

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
    setBotRuns((prev) => {
      const updated = prev.map((r) => {
        if (r.id === runId || r.runId === runId) {
          const nextStatus = updates.status ?? r.status;
          return {
            ...r,
            ...updates,
            status: nextStatus,
            lastSignal: `Settings Updated: ${updates.lotSize ?? r.lotSize} Lots, TP ${updates.tpPips ?? r.tpPips}p, SL ${updates.slPips ?? r.slPips}p`,
            lastSignalTime: Date.now(),
          };
        }
        return r;
      });
      saveStoredBotRuns(updated);
      return updated;
    });

    playOrderSound(true);
    addNotification('Bot settings saved successfully');
    triggerActionPopup({
      type: 'BOT_STARTED',
      title: 'Bot Settings Updated',
      subtitle: `Parameters saved successfully (${updates.lotSize ? `${updates.lotSize} Lots` : ''}${updates.tpPips ? `, TP ${updates.tpPips}p` : ''}${updates.slPips ? `, SL ${updates.slPips}p` : ''}).`,
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
      subtitle: `Algorithmic bot loaded with default ${newBot.defaultLotSize} Lots. No bot actions will execute without your explicit command.`,
    });
  };

  const handleCloseBotTrade = (tradeId: string) => {
    setBotTrades((prev) => {
      const trade = prev.find((t) => t.id === tradeId);
      if (!trade || trade.status !== 'OPEN') return prev;

      const inst = instruments.find((i) => i.symbol === trade.symbol);
      const exitPrice =
        trade.side === 'BUY'
          ? inst?.bid || trade.currentPrice
          : inst?.ask || trade.currentPrice;
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
        exitPrice,
        profitUsd,
        exitReason: 'MANUAL',
        closeTime: Date.now(),
      };

      // Credit or debit account - NEVER let balance go negative!
      setSelectedAccount((acc) => {
        if (!acc) return null;
        const newBal = Math.max(0, Number((acc.balance + profitUsd).toFixed(2)));
        const newEq = Math.max(0, Number((acc.equity + profitUsd).toFixed(2)));
        if (newBal <= 0) {
          setTimeout(handleZeroBalanceStopOut, 0);
        }
        return {
          ...acc,
          balance: newBal,
          equity: newEq,
        };
      });

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
        `Bot trade #${trade.ticket} closed (${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)})`
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
          accountNumber: selectedAccount?.accountNumber,
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

    const isTargetWin = evaluateTargetWinOrLoss(userRole, run.botType);
    const side = determineBotTradeDirection(inst, isTargetWin, userRole);
    const pipVal =
      inst.decimals === 5 || inst.decimals === 3
        ? 0.0001
        : inst.decimals === 2
        ? 0.01
        : 0.0001;
    const openPrice = side === 'BUY' ? inst.ask : inst.bid;
    const tpPrice =
      side === 'BUY'
        ? openPrice + run.tpPips * pipVal * 10
        : openPrice - run.tpPips * pipVal * 10;
    const slPrice =
      side === 'BUY'
        ? openPrice - run.slPips * pipVal * 10
        : openPrice + run.slPips * pipVal * 10;

    const openPriceNum = Number(openPrice.toFixed(inst.decimals));
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
      currentPrice: openPriceNum,
      tp: tpPriceNum,
      sl: slPriceNum,
      tpPrice: tpPriceNum,
      slPrice: slPriceNum,
      openTime: Date.now(),
      status: 'OPEN',
      profitUsd: 0,
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

  // Automated Bot Execution Engine Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRuns = botRunsRef.current;
      const currentTrades = botTradesRef.current;
      const allInstruments = instrumentsRef.current;
      const currentRole = userRoleRef.current;

      const runningBots = currentRuns.filter((r) => r.status === 'RUNNING');
      if (runningBots.length === 0) return;

      let nextTrades = [...currentTrades];
      let tradesChanged = false;

      let nextRuns = [...currentRuns];
      let runsChanged = false;

      runningBots.forEach((run) => {
        const runKey = run.id || run.runId;
        const activeTrade = nextTrades.find(
          (t) =>
            (t.runId === runKey ||
              t.runInstanceId === runKey ||
              t.runId === run.runId ||
              t.runId === run.id ||
              t.runInstanceId === run.id) &&
            t.status === 'OPEN'
        );

        const inst =
          allInstruments.find((i) => i.symbol === run.symbol) ||
          allInstruments.find((i) => i.symbol.includes(run.symbol.slice(0, 3))) ||
          allInstruments[0];
        if (!inst) return;

        const pipVal =
          inst.decimals === 5 || inst.decimals === 3
            ? 0.0001
            : inst.decimals === 2
            ? 0.01
            : 0.0001;

        if (!activeTrade) {
          // Command-only enforcement: Never auto-open trades without an explicit user command
          // If a trade was closed, it remains closed. The bot awaits user command.
          return;
        } else {
          // Real-time market execution: current live price directly from the instrument
          const currentMarketPrice = activeTrade.side === 'BUY' ? inst.bid : inst.ask;
          const floatingProfit = calculateBotPnL(
            activeTrade.symbol,
            activeTrade.side,
            activeTrade.openPrice,
            currentMarketPrice,
            activeTrade.lotSize
          );

          // Check if TP or SL is reached or profit target reached (>80% win rate target)
          const hitTp =
            activeTrade.side === 'BUY'
              ? currentMarketPrice >= activeTrade.tp
              : currentMarketPrice <= activeTrade.tp;
          const hitSl =
            activeTrade.side === 'BUY'
              ? currentMarketPrice <= activeTrade.sl
              : currentMarketPrice >= activeTrade.sl;
          const durationMs = Date.now() - (activeTrade.openTime || Date.now());

          // Automated closure conditions: TP hit, SL hit, or positive realized institutional gain
          const shouldTakeProfit =
            hitTp ||
            (activeTrade.targetOutcome === 'WIN' && floatingProfit >= 10.0 && durationMs >= 3000) ||
            (durationMs >= 8000 && floatingProfit > 3.0);

          const shouldCloseLoss =
            hitSl ||
            (activeTrade.targetOutcome === 'LOSS' && floatingProfit <= -18.0 && durationMs >= 4000);

          if (shouldTakeProfit || shouldCloseLoss) {
            const finalExitPrice = currentMarketPrice;
            const profitUsd = floatingProfit;

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
            tradesChanged = true;

            // Sync balance and equity immediately - NEVER let balance go negative!
            setSelectedAccount((acc) => {
              if (!acc) return null;
              const newBal = Math.max(0, Number((acc.balance + profitUsd).toFixed(2)));
              const newEq = Math.max(0, Number((acc.equity + profitUsd).toFixed(2)));
              if (newBal <= 0) {
                setTimeout(handleZeroBalanceStopOut, 0);
              }
              return {
                ...acc,
                balance: newBal,
                equity: newEq,
              };
            });

            // Update run stats with wins/losses/profit
            nextRuns = nextRuns.map((r) => {
              if (r.id === run.id || r.runId === runKey) {
                const tradesCount = (r.totalTrades || r.totalTradesCount || 0) + 1;
                const wins = (r.winningTrades || r.winCount || 0) + (profitUsd > 0 ? 1 : 0);
                const losses = (r.losingTrades || 0) + (profitUsd <= 0 ? 1 : 0);
                const profitSum = Number(((r.totalProfitUsd || 0) + profitUsd).toFixed(2));
                return {
                  ...r,
                  totalTrades: tradesCount,
                  totalTradesCount: tradesCount,
                  winningTrades: wins,
                  winCount: wins,
                  losingTrades: losses,
                  totalProfitUsd: profitSum,
                  lastSignal:
                    profitUsd > 0
                      ? `Take Profit Closed (+$${profitUsd.toFixed(2)})`
                      : `Stop Loss Closed (-$${Math.abs(profitUsd).toFixed(2)})`,
                  lastSignalTime: Date.now(),
                };
              }
              return r;
            });
            runsChanged = true;

            playOrderSound(profitUsd >= 0);
            addNotification(
              `[${run.botName}] Trade Closed: ${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)} on ${activeTrade.symbol}`
            );

            triggerActionPopup({
              type: 'TRADE_CLOSED',
              title: `Trade of ${activeTrade.symbol} is closed`,
              details: {
                symbol: activeTrade.symbol,
                side: activeTrade.side,
                lots: activeTrade.lotSize,
                price: finalExitPrice,
                pnl: profitUsd,
                ticket: activeTrade.ticket,
                accountNumber: selectedAccount?.accountNumber,
              },
            });
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
            tradesChanged = true;
          }
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
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Current tick direction for selected symbol
  const currentTickDirection = tickStates[selectedSymbol] || 'NEUTRAL';
  const currentInstrument =
    instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

  const handleUpdatePlatformSetting = (partial: Partial<UserPlatformSettings>) => {
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
        description: 'Updated platform preferences in Supabase',
        metadata: partial,
      });
    }
  };

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
    } catch (e) {
      console.warn('Sync all to Supabase encounter notice:', e);
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
          />
        );
      case 'bots':
        return (
          <BotsTab
            instruments={instruments}
            userRole={userRole}
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
            economicEvents={ECONOMIC_EVENTS}
            marketAnalyses={MARKET_ANALYSES}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            userRole={userRole}
            onUpdateUserRole={handleUpdateUserRole}
            currentUser={currentUser}
            onSignOut={handleUserSignOut}
          />
        );
      default:
        return null;
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
          onResetDemo={handleResetDemo}
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame((prev) => !prev)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          oneClickTrading={oneClickTrading}
          onToggleOneClick={() => setOneClickTrading(!oneClickTrading)}
          setActiveTab={setActiveTab}
          notifications={notifications}
          onMarkNotificationsRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
          onOpenMenuDrawer={() => setIsMenuDrawerOpen(true)}
          currentUser={currentUser}
          onSignOut={handleUserSignOut}
          onOpenInstall={pwa.openInstallDialog}
          isInstalled={pwa.isInstalled}
          onOpenAdminManager={() => setIsAdminManagerOpen(true)}
        />

        {/* Scrollable Main Content - Full-width desktop responsive container */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          {renderTabContent()}
        </main>

        {/* Sticky Bottom Navigation - Responsive container */}
        <div className="sticky bottom-0 z-40 w-full border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#111317]/95 backdrop-blur-md">
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
          walletBalance={walletBalance}
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          onSignOut={handleUserSignOut}
          onOpenInstall={pwa.openInstallDialog}
          isInstalled={pwa.isInstalled}
        />

        {/* Master Admin Financial & Account Manager Modal */}
        <AdminAccountManagerModal
          isOpen={isAdminManagerOpen}
          onClose={() => setIsAdminManagerOpen(false)}
          currentUser={currentUser}
          currentAccounts={accounts}
          currentWalletBalance={walletBalance}
          onApplyChanges={(updatedWallet, updatedAccounts) => {
            setWalletBalance(updatedWallet);
            setAccounts(updatedAccounts);
            if (updatedAccounts.length > 0) {
              if (!selectedAccount || !updatedAccounts.some((a) => a.id === selectedAccount.id)) {
                setSelectedAccount(updatedAccounts[0]);
              } else {
                const refreshed = updatedAccounts.find((a) => a.id === selectedAccount.id);
                if (refreshed) setSelectedAccount(refreshed);
              }
            } else {
              setSelectedAccount(null);
            }
            if (currentUser) {
              saveUserFinancials(currentUser, {
                walletBalance: updatedWallet,
                accounts: updatedAccounts,
                selectedAccountId: selectedAccount?.id,
                transactions,
              });
            }
            addNotification('Admin financial updates saved and applied successfully');
          }}
          isDarkMode={isDarkMode}
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
      </div>
    </div>
  );
}
