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
import { HFMLogo } from './components/HFMLogo';
import { Wifi, Battery, Signal, Zap, Radio } from 'lucide-react';

// Subtle Web Audio synthesizer for trade execution sound
function playOrderSound(isSuccess: boolean = true) {
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

  // Market & Accounts State
  const [instruments, setInstruments] = useState<Instrument[]>(INITIAL_INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('15M');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [candles, setCandles] = useState<Candle[]>([]);

  // Real-time Tick States for Green / Red Highlights: Map of symbol -> 'UP' | 'DOWN' | 'NEUTRAL'
  const [tickStates, setTickStates] = useState<Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>>({});

  const [accounts, setAccounts] = useState<TradingAccount[]>(INITIAL_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(INITIAL_ACCOUNTS[0]);
  const [walletBalance, setWalletBalance] = useState<number>(14250.80);

  // Trading Positions, Orders, and History
  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'pos-1',
      ticket: 7891024,
      symbol: 'EURUSD',
      side: 'BUY',
      lots: 1.0,
      openPrice: 1.08640,
      currentPrice: 1.08724,
      sl: 1.08300,
      tp: 1.09200,
      pnl: 84.00,
      swap: -1.20,
      commission: 0,
      openTime: Date.now() - 3600000 * 2,
    },
    {
      id: 'pos-2',
      ticket: 7891089,
      symbol: 'XAUUSD',
      side: 'BUY',
      lots: 0.5,
      openPrice: 4272.50,
      currentPrice: 4280.15,
      sl: 4250.00,
      tp: 4320.00,
      pnl: 382.50,
      swap: -3.50,
      commission: 0,
      openTime: Date.now() - 3600000 * 4,
    },
  ]);

  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([
    {
      id: 'ord-1',
      ticket: 948102,
      symbol: 'GBPUSD',
      side: 'BUY',
      type: 'BUY_LIMIT',
      targetPrice: 1.29400,
      lots: 0.5,
      sl: 1.29000,
      tp: 1.30200,
      status: 'PENDING',
      createdAt: Date.now() - 7200000,
    },
  ]);

  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([
    {
      id: 'cl-1',
      ticket: 7889100,
      symbol: 'BTCUSD',
      side: 'BUY',
      lots: 0.1,
      openPrice: 67100.00,
      closePrice: 68450.00,
      pnl: 135.00,
      openTime: Date.now() - 86400000 * 2,
      closeTime: Date.now() - 86400000 * 1,
      reason: 'TP',
    },
    {
      id: 'cl-2',
      ticket: 7886420,
      symbol: 'US500',
      side: 'BUY',
      lots: 1.0,
      openPrice: 5835.00,
      closePrice: 5864.20,
      pnl: 292.00,
      openTime: Date.now() - 86400000 * 3,
      closeTime: Date.now() - 86400000 * 2,
      reason: 'MANUAL',
    },
  ]);

  // HFcopy Strategies State
  const [providers, setProviders] = useState<StrategyProvider[]>(STRATEGY_PROVIDERS);
  const [followedStrategies, setFollowedStrategies] = useState<FollowedStrategy[]>(INITIAL_FOLLOWED);

  // Transactions Log
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Notifications
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; time: string; read: boolean }>
  >([
    {
      id: 'notif-1',
      title: 'Order Filled: BUY 1.00 EURUSD @ 1.08640',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Deposit of $5,000.00 via Visa/Mastercard Completed',
      time: '1 day ago',
      read: true,
    },
    {
      id: 'notif-3',
      title: 'HFcopy Strategy Alpha Quant yielded +$340.25 profit',
      time: '2 days ago',
      read: true,
    },
  ]);

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
  // REAL TRADINGVIEW PRICE INTEGRATION & REALISTIC SPREAD TICKING ENGINE
  // =========================================================================
  useEffect(() => {
    let isMounted = true;

    // Fetch real prices from TradingView Scanner API
    const fetchTradingViewFeed = async () => {
      try {
        const quotes = await tvService.fetchRealPrices();
        if (!isMounted || quotes.size === 0) return;

        quotes.forEach((q, sym) => {
          realTVQuotesRef.current.set(sym, q);
        });

        setInstruments((prevInstruments) => {
          const nextTickStates: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {};

          const updated = prevInstruments.map((inst) => {
            const quote = quotes.get(inst.symbol);
            if (!quote) return inst;

            const oldAsk = inst.ask;
            const newBid = quote.bid;
            const newAsk = quote.ask;

            // Compute tick direction for green/red highlight boxes
            let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
            if (newAsk > oldAsk) direction = 'UP';
            else if (newAsk < oldAsk) direction = 'DOWN';
            nextTickStates[inst.symbol] = direction;

            // Update sparkline
            const sparkline = [...inst.sparkline.slice(1), newBid];

            return {
              ...inst,
              bid: newBid,
              ask: newAsk,
              spread: quote.spread,
              change24h: quote.change24h,
              high24h: Math.max(inst.high24h, quote.high24h),
              low24h: Math.min(inst.low24h, quote.low24h),
              sparkline,
            };
          });

          setTickStates((prev) => ({ ...prev, ...nextTickStates }));
          return updated;
        });
      } catch (err) {
        console.warn('TradingView sync notice:', err);
      }
    };

    // Initial immediate fetch
    fetchTradingViewFeed();

    // Poll TradingView scanner every 2.5 seconds for instant price updates
    const tvInterval = setInterval(fetchTradingViewFeed, 2500);

    // Realistic micro-ticks bounded to real TradingView quotes (never drifting away)
    const microTickInterval = setInterval(() => {
      setInstruments((prevInstruments) => {
        const nextTickStates: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {};

        const updated = prevInstruments.map((inst) => {
          // 40% probability of a micro-tick per cycle
          if (Math.random() > 0.4) return inst;

          const baseQuote = realTVQuotesRef.current.get(inst.symbol);
          const anchorBid = baseQuote ? baseQuote.bid : inst.bid;
          const anchorAsk = baseQuote ? baseQuote.ask : inst.ask;
          const anchorSpread = baseQuote ? baseQuote.spread : inst.spread;

          // Micro-movement within a narrow fraction of a pip around the real TradingView anchor
          const baseStep = 1 / inst.pipMultiplier;
          const pipJitter = (Math.random() - 0.5) * 0.25 * baseStep;

          const newBid = Number((anchorBid + pipJitter).toFixed(inst.decimals));
          const newAsk = Number((anchorAsk + pipJitter).toFixed(inst.decimals));

          let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
          if (newAsk > inst.ask) direction = 'UP';
          else if (newAsk < inst.ask) direction = 'DOWN';
          nextTickStates[inst.symbol] = direction;

          const sparkline = [...inst.sparkline.slice(1), newBid];

          return {
            ...inst,
            bid: newBid,
            ask: newAsk,
            spread: anchorSpread,
            sparkline,
          };
        });

        setTickStates((prev) => ({ ...prev, ...nextTickStates }));
        return updated;
      });
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(tvInterval);
      clearInterval(microTickInterval);
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

    // Update active chart's latest candle smoothly
    const activeInst = currentInstMap.get(selectedSymbol);
    if (activeInst) {
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const last = { ...prevCandles[prevCandles.length - 1] };
        last.close = activeInst.bid;
        last.high = Math.max(last.high, activeInst.bid);
        last.low = Math.min(last.low, activeInst.bid);
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

  // Recalculate Account Equity & Margins
  useEffect(() => {
    const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
    const totalMargin = positions.reduce((acc, p) => {
      const inst = instruments.find((i) => i.symbol === p.symbol);
      const contractSize = inst?.category === 'Forex' ? 100000 : 100;
      const lev = parseInt(selectedAccount.leverage.split(':')[1] || '500', 10);
      return acc + (p.lots * contractSize * (inst?.bid || 1)) / lev;
    }, 0);

    const newEquity = Number((selectedAccount.balance + totalPnl).toFixed(2));
    const freeMargin = Number(Math.max(0, newEquity - totalMargin).toFixed(2));
    const marginLevel = totalMargin > 0 ? Number(((newEquity / totalMargin) * 100).toFixed(1)) : 0;

    setSelectedAccount((prev) => ({
      ...prev,
      equity: newEquity,
      margin: Number(totalMargin.toFixed(2)),
      freeMargin,
      marginLevel,
    }));
  }, [positions, instruments]);

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

    // Update balance
    setSelectedAccount((acc) => ({
      ...acc,
      balance: Number((acc.balance + pos.pnl).toFixed(2)),
    }));

    playOrderSound(pos.pnl >= 0);
    addNotification(
      `Closed #${pos.ticket} ${pos.symbol} (${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)})`
    );
  };

  const handleCloseAllPositions = () => {
    positions.forEach((p) => closePositionById(p.id, 'MANUAL'));
  };

  const handleCancelPendingOrder = (id: string) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== id));
    addNotification('Pending order cancelled');
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
  };

  const handleUnfollowStrategy = (providerId: string) => {
    setFollowedStrategies((prev) => prev.filter((f) => f.providerId !== providerId));
    addNotification('Strategy copy stopped and funds settled');
  };

  // Wallet Funding Handlers
  const handleDeposit = (params: { method: string; amount: number; targetAccount: string }) => {
    const ref = `HFM-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
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

    if (params.targetAccount === 'HF Wallet') {
      setWalletBalance((prev) => prev + params.amount);
    } else {
      setSelectedAccount((acc) => ({
        ...acc,
        balance: acc.balance + params.amount,
      }));
    }

    addNotification(`Deposit of $${params.amount.toFixed(2)} received successfully!`);
  };

  const handleWithdraw = (params: { method: string; amount: number; sourceAccount: string }) => {
    const ref = `HFM-WTH-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'WITHDRAWAL',
      method: params.method,
      amount: params.amount,
      currency: 'USD',
      status: 'PENDING',
      timestamp: Date.now(),
      reference: ref,
      details: `Withdrawal from ${params.sourceAccount}`,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setWalletBalance((prev) => Math.max(0, prev - params.amount));
    addNotification(`Withdrawal request of $${params.amount.toFixed(2)} is pending approval`);
  };

  const handleTransfer = (params: { fromAccount: string; toAccount: string; amount: number }) => {
    const ref = `HFM-TRF-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'INTERNAL_TRANSFER',
      method: 'Internal Transfer',
      amount: params.amount,
      currency: 'USD',
      status: 'COMPLETED',
      timestamp: Date.now(),
      reference: ref,
      details: `${params.fromAccount} ➔ ${params.toAccount}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (params.fromAccount === 'HF Wallet') {
      setWalletBalance((w) => w - params.amount);
      setSelectedAccount((acc) => ({ ...acc, balance: acc.balance + params.amount }));
    } else if (params.toAccount === 'HF Wallet') {
      setSelectedAccount((acc) => ({ ...acc, balance: acc.balance - params.amount }));
      setWalletBalance((w) => w + params.amount);
    }

    addNotification(`Transferred $${params.amount.toFixed(2)} between accounts`);
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
      server: params.type === 'Live' ? 'HFMarkets-LiveServer4' : 'HFMarkets-DemoServer',
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

    setAccounts((prev) => [...prev, newAcc]);
    setSelectedAccount(newAcc);
    addNotification(`Opened new ${params.type} #${num} (${params.tier})`);
  };

  const handleResetDemo = () => {
    setSelectedAccount((acc) => ({
      ...acc,
      balance: 100000,
      equity: 100000,
      margin: 0,
      freeMargin: 100000,
    }));
    addNotification('Demo account reset to $100,000.00');
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

  // Current tick direction for selected symbol
  const currentTickDirection = tickStates[selectedSymbol] || 'NEUTRAL';
  const currentInstrument =
    instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

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
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            oneClickTrading={oneClickTrading}
            onToggleOneClick={() => setOneClickTrading(!oneClickTrading)}
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      id="hfm-app-root"
      className={`min-h-screen w-full transition-colors duration-200 ${
        isDarkMode ? 'dark bg-[#0B0C0E] text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      <div className="min-h-screen w-full flex flex-col bg-white dark:bg-[#111317] relative">
        {/* Main Top Header */}
        <Header
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          onOpenDeposit={() => setActiveTab('wallet')}
          onOpenNewAccount={() => setActiveTab('account')}
          onResetDemo={handleResetDemo}
          isMobileFrame={false}
          onToggleMobileFrame={() => {}}
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
        />
      </div>
    </div>
  );
}
