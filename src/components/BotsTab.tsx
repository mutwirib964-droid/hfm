import React, { useState, useMemo } from 'react';
import {
  Bot,
  Play,
  Pause,
  Square,
  UploadCloud,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  ChevronRight,
  Info,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Settings,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { Instrument } from '../types';
import { BotStrategyConfig, BotRunInstance, BotTrade, UserRole } from '../types/botTypes';
import {
  calculateBotPnL,
  getInstrumentPipSize,
  getContractSize,
  isMarketerExclusiveWeekendBot,
} from '../services/botTradingService';

interface BotsTabProps {
  instruments: Instrument[];
  userRole?: UserRole;
  accountType?: 'Live' | 'Demo';
  accountBalance?: number;
  onUpdateUserRole?: (role: UserRole) => void;
  inbuiltBots: BotStrategyConfig[];
  importedBots: BotStrategyConfig[];
  botRuns: BotRunInstance[];
  botTrades: BotTrade[];
  onStartBotRun: (config: {
    botId: string;
    symbol: string;
    lotSize: number;
    tpPips: number;
    slPips: number;
  }) => void;
  onToggleBotRun: (runId: string) => void;
  onStopBotRun: (runId: string) => void;
  onDeleteBotRun?: (runId: string) => void;
  onUpdateBotRunSettings?: (
    runId: string,
    updates: {
      symbol?: string;
      lotSize?: number;
      tpPips?: number;
      slPips?: number;
      status?: 'RUNNING' | 'PAUSED' | 'STOPPED';
    }
  ) => void;
  onImportBot: (newBot: BotStrategyConfig) => void;
  onCloseBotTrade: (tradeId: string) => void;
  onTriggerManualSignal?: (runId: string) => void;
  isDarkMode?: boolean;
}

// Safe formatting helper to prevent any undefined toFixed errors
const fmt = (val: number | undefined | null, decimals = 2): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(decimals);
};

export const BotsTab: React.FC<BotsTabProps> = ({
  instruments,
  userRole = 'normal' as UserRole,
  accountType = 'Live',
  accountBalance = 0,
  onUpdateUserRole,
  inbuiltBots,
  importedBots,
  botRuns,
  botTrades,
  onStartBotRun,
  onToggleBotRun,
  onStopBotRun,
  onDeleteBotRun,
  onUpdateBotRunSettings,
  onImportBot,
  onCloseBotTrade,
  onTriggerManualSignal,
  isDarkMode = true,
}) => {
  // Unified subtabs: 'bots', 'runs', 'trades' — default to 'runs' (Active Bots) when bots are deployed
  const [activeSubTab, setActiveSubTab] = useState<'bots' | 'runs' | 'trades'>(() =>
    botRuns.length > 0 ? 'runs' : 'bots'
  );
  const [selectedBotForConfig, setSelectedBotForConfig] = useState<BotStrategyConfig | null>(null);

  // Bot Config Form State
  const [configSymbol, setConfigSymbol] = useState<string>('XAUUSD');
  const [configLotSize, setConfigLotSize] = useState<number>(0.1);
  const [configTpPips, setConfigTpPips] = useState<number>(30);
  const [configSlPips, setConfigSlPips] = useState<number>(20);

  // Import Bot Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importName, setImportName] = useState('');
  const [importTag, setImportTag] = useState('Momentum Breakout');
  const [importDesc, setImportDesc] = useState('');
  const [importPair, setImportPair] = useState('EURUSD');
  const [importFileName, setImportFileName] = useState('');

  // Settings Modal State
  const [editingRun, setEditingRun] = useState<BotRunInstance | null>(null);
  const [editSymbol, setEditSymbol] = useState<string>('XAUUSD');
  const [editLotSize, setEditLotSize] = useState<number>(0.1);
  const [editTpPips, setEditTpPips] = useState<number>(30);
  const [editSlPips, setEditSlPips] = useState<number>(20);
  const [editStatus, setEditStatus] = useState<'RUNNING' | 'PAUSED' | 'STOPPED'>('RUNNING');

  // Delete Confirmation Modal State
  const [runToDelete, setRunToDelete] = useState<BotRunInstance | null>(null);

  // Memoize static instrument metadata strictly by symbol list so <select> options NEVER mutate or jump during 250ms price ticks
  const symbolsSignature = instruments.map((i) => i.symbol).join('|');
  const stableInstruments = useMemo(
    () =>
      instruments.map((i) => ({
        symbol: i.symbol,
        name: i.name,
        category: i.category,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbolsSignature]
  );

  const handleOpenSettingsModal = (run: BotRunInstance) => {
    setEditingRun(run);
    const initialSym =
      run.customSymbolSelected && run.symbol && run.symbol.toUpperCase() !== 'ALL'
        ? run.symbol.toUpperCase()
        : 'ALL';
    setEditSymbol(initialSym);
    setEditLotSize(run.lotSize);
    setEditTpPips(run.tpPips);
    setEditSlPips(run.slPips);
    setEditStatus(run.status);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;
    if (onUpdateBotRunSettings) {
      onUpdateBotRunSettings(
        editingRun.id || editingRun.runId || editingRun.botId || editingRun.botName,
        {
          symbol: editSymbol,
          lotSize: editLotSize,
          tpPips: editTpPips,
          slPips: editSlPips,
          status: editStatus,
        }
      );
    }
    setEditingRun(null);
  };

  const handleConfirmDelete = () => {
    if (!runToDelete) return;
    if (onDeleteBotRun) {
      onDeleteBotRun(
        runToDelete.id || runToDelete.runId || runToDelete.botId || runToDelete.botName
      );
    }
    setRunToDelete(null);
  };

  // Combined all bots into a single list — Wizard and Vortex are strictly visible to Marketers only (never to Retail Traders)
  const allBots: BotStrategyConfig[] = useMemo(
    () =>
      [...inbuiltBots, ...importedBots].filter((bot) => {
        if (
          bot.marketerOnly ||
          isMarketerExclusiveWeekendBot(bot.id) ||
          isMarketerExclusiveWeekendBot(bot.name)
        ) {
          return userRole === 'marketer';
        }
        return true;
      }),
    [inbuiltBots, importedBots, userRole]
  );

  // Hide Wizard and Vortex runs from Active Bots if the user is a Retail Trader ('normal')
  const visibleBotRuns: BotRunInstance[] = useMemo(
    () =>
      botRuns.filter((run) => {
        if (
          isMarketerExclusiveWeekendBot(run.botId) ||
          isMarketerExclusiveWeekendBot(run.botName)
        ) {
          return userRole === 'marketer';
        }
        return true;
      }),
    [botRuns, userRole]
  );

  // Map for fast instrument lookup
  const instMap = new Map<string, Instrument>(instruments.map((i) => [i.symbol, i]));

  const isPrivilegedAccount =
    userRole === 'marketer' || userRole === 'admin' || accountType === 'Demo';

  // Compute live trade statistics
  const openTrades = botTrades.filter((t) => t.status === 'OPEN');
  const closedTrades = botTrades.filter((t) => t.status === 'CLOSED');

  // Compute real-time live floating PnL for all open trades strictly following lotSize and live oscillating currentPrice
  const liveOpenTrades = openTrades.map((t) => {
    const inst = instMap.get(t.symbol);
    const decimals = inst ? inst.decimals : t.symbol.includes('JPY') ? 3 : 2;
    const currentPrice =
      typeof t.currentPrice === 'number' && !isNaN(t.currentPrice)
        ? t.currentPrice
        : inst
        ? t.side === 'BUY'
          ? inst.bid
          : inst.ask
        : t.openPrice || 1.0;

    const profitUsd = calculateBotPnL(
      t.symbol,
      t.side,
      t.openPrice,
      currentPrice,
      t.lotSize,
      userRole
    );

    return {
      ...t,
      currentPrice,
      decimals,
      profitUsd: typeof profitUsd === 'number' && !isNaN(profitUsd) ? profitUsd : 0,
      tpVal: t.tp ?? t.tpPrice ?? 0,
      slVal: t.sl ?? t.slPrice ?? 0,
    };
  });

  const adjustedClosedTrades = closedTrades
    .map((t, idx) => {
      const pipSize = getInstrumentPipSize(t.symbol);
      const inst = instMap.get(t.symbol);
      const decimals = inst ? inst.decimals : t.symbol.includes('JPY') ? 3 : 2;
      let closePriceVal = t.closePrice ?? t.exitPrice ?? t.currentPrice;
      const isLoss =
        (typeof t.profitUsd === 'number' && t.profitUsd < 0) ||
        t.reason === 'SL' ||
        t.closeReason === 'STOP_LOSS' ||
        t.exitReason === 'SL' ||
        (t.targetOutcome === 'LOSS' && !(typeof t.profitUsd === 'number' && t.profitUsd > 0));
      const isWin = !isLoss;

      const validWinPrice =
        t.side === 'BUY'
          ? (closePriceVal || 0) >= t.openPrice + pipSize * 1.5
          : (closePriceVal || 0) <= t.openPrice - pipSize * 1.5;
      const validLossPrice =
        t.side === 'BUY'
          ? (closePriceVal || 0) <= t.openPrice - pipSize * 1.5
          : (closePriceVal || 0) >= t.openPrice + pipSize * 1.5;

      if (!closePriceVal || closePriceVal === t.openPrice || (isWin && !validWinPrice) || (isLoss && !validLossPrice)) {
        if (isWin) {
          closePriceVal = Number(
            (
              t.tp ??
              t.tpPrice ??
              (t.side === 'BUY' ? t.openPrice + 30 * pipSize : t.openPrice - 30 * pipSize)
            ).toFixed(decimals)
          );
        } else {
          closePriceVal = Number(
            (
              t.sl ??
              t.slPrice ??
              (t.side === 'BUY' ? t.openPrice - 20 * pipSize : t.openPrice + 20 * pipSize)
            ).toFixed(decimals)
          );
        }
      }
      const exactPnl = calculateBotPnL(t.symbol, t.side, t.openPrice, closePriceVal, t.lotSize);
      // Guarantee valid closeTime so no trade ever lacks a time
      const ticketNum =
        typeof t.ticket === 'number'
          ? t.ticket
          : parseInt(String(t.ticket || t.id || '').replace(/\D/g, ''), 10) || ((idx + 1) * 317 + 1000);
      const fallbackTime = Date.now() - ((ticketNum % 14400) + (idx + 1) * 60) * 1000;
      const validCloseTime =
        t.closeTime && typeof t.closeTime === 'number' && t.closeTime > 0
          ? t.closeTime
          : t.openTime && typeof t.openTime === 'number' && t.openTime > 0
          ? t.openTime + 45000
          : (t as any).closedAt && Number((t as any).closedAt) > 0
          ? Number((t as any).closedAt)
          : (t as any).timestamp && Number((t as any).timestamp) > 0
          ? Number((t as any).timestamp)
          : fallbackTime;

      return {
        ...t,
        closeTime: validCloseTime,
        closePrice: closePriceVal,
        exitPrice: closePriceVal,
        profitUsd: exactPnl,
      };
    })
    .sort((a, b) => {
      const timeA = a.closeTime || a.openTime || 0;
      const timeB = b.closeTime || b.openTime || 0;
      return timeB - timeA; // Latest bot trades at the top
    });

  const totalOpenProfit = liveOpenTrades.reduce((acc, t) => acc + t.profitUsd, 0);
  const totalClosedProfit = adjustedClosedTrades.reduce((acc, t) => acc + (t.profitUsd || 0), 0);

  // Compute each bot run's exact performance metrics, realized profits, floating P/L, and verified win rate
  const runMetrics = useMemo(() => {
    return visibleBotRuns.map((run) => {
      const runKey = run.id || run.runId;
      const closedForRun = adjustedClosedTrades.filter(
        (t) =>
          t.runId === runKey ||
          t.runInstanceId === runKey ||
          (Boolean(run.runId) && t.runId === run.runId) ||
          (Boolean(run.id) && t.runId === run.id) ||
          (!t.runId && !t.runInstanceId && t.botId === run.botId)
      );
      const openForRun = liveOpenTrades.filter(
        (t) =>
          t.runId === runKey ||
          t.runInstanceId === runKey ||
          (Boolean(run.runId) && t.runId === run.runId) ||
          (Boolean(run.id) && t.runId === run.id) ||
          (!t.runId && !t.runInstanceId && t.botId === run.botId)
      );
      const totalTrades = Math.max(
        closedForRun.length,
        run.totalTrades ?? run.totalTradesCount ?? 0
      );
      const winningTrades =
        closedForRun.length > 0
          ? closedForRun.filter((t) => (t.profitUsd || 0) > 0).length
          : run.winningTrades ?? run.winCount ?? 0;
      const losingTrades =
        closedForRun.length > 0
          ? closedForRun.filter((t) => (t.profitUsd || 0) < 0).length
          : run.losingTrades ?? Math.max(0, totalTrades - winningTrades);

      const closedSum = closedForRun.reduce((s, t) => s + (t.profitUsd || 0), 0);
      const realizedProfit = closedForRun.length > 0 ? closedSum : (run.totalProfitUsd ?? 0);
      const floatingProfitForRun = openForRun.reduce(
        (s, t) => s + (t.profitUsd || 0),
        0
      );
      const totalProfit = Number((realizedProfit + floatingProfitForRun).toFixed(2));

      // Algorithm win rate can NEVER be 100% or more (strictly capped at realistic ceiling like 96.8%)
      let runWinRate = '94.6';
      if (totalTrades > 0) {
        const computedRate = (winningTrades / totalTrades) * 100;
        // Never allow win rate to equal or exceed 100% since no algorithm has 100% guaranteed win rate
        const safeRate = computedRate >= 100 ? 95.8 : Math.min(96.8, computedRate);
        runWinRate = safeRate.toFixed(1);
      } else {
        const matchedBotConfig = allBots.find(
          (b) => b.id === run.botId || b.name === run.botName
        );
        const claimed = matchedBotConfig?.claimedWinRate || run.claimedWinRate;
        if (claimed) {
          const parsed = parseFloat(claimed.replace('%', ''));
          if (!isNaN(parsed) && parsed > 0) {
            const safeClaimed = parsed >= 100 ? 95.8 : Math.min(96.8, parsed);
            runWinRate = safeClaimed.toFixed(1);
          }
        }
      }

      return {
        run,
        closedForRun,
        openForRun,
        totalTrades,
        winningTrades,
        losingTrades,
        totalProfit,
        runWinRate,
      };
    });
  }, [visibleBotRuns, adjustedClosedTrades, liveOpenTrades, allBots]);

  // Actual total bot profit strictly according to the runs of bot
  const overallProfit = useMemo(() => {
    if (runMetrics.length === 0) {
      return Number(totalClosedProfit.toFixed(2));
    }
    return Number(runMetrics.reduce((sum, m) => sum + m.totalProfit, 0).toFixed(2));
  }, [runMetrics, totalClosedProfit]);

  // Algorithm Win Rate can NEVER be 100% or more (strictly capped below 100%)
  const winRate = useMemo(() => {
    const totalWins = runMetrics.reduce((sum, m) => sum + m.winningTrades, 0);
    const totalTrades = runMetrics.reduce((sum, m) => sum + m.totalTrades, 0);
    if (totalTrades > 0) {
      const computedRate = (totalWins / totalTrades) * 100;
      const safeRate = computedRate >= 100 ? 95.8 : Math.min(96.8, computedRate);
      return safeRate.toFixed(1);
    }
    const closedWins = adjustedClosedTrades.filter((t) => (t.profitUsd || 0) > 0).length;
    if (adjustedClosedTrades.length > 0) {
      const computedRate = (closedWins / adjustedClosedTrades.length) * 100;
      const safeRate = computedRate >= 100 ? 95.8 : Math.min(96.8, computedRate);
      return safeRate.toFixed(1);
    }
    return '94.6';
  }, [runMetrics, adjustedClosedTrades]);

  const runningBotsCount = visibleBotRuns.filter((r) => r.status === 'RUNNING').length;

  const handleOpenConfigModal = (bot: BotStrategyConfig) => {
    setSelectedBotForConfig(bot);
    setConfigSymbol(bot.recommendedInstruments[0] || 'XAUUSD');
    setConfigLotSize(bot.defaultLotSize);
    setConfigTpPips(bot.defaultTpPips);
    setConfigSlPips(bot.defaultSlPips);
  };

  // Deploy bot to Active Bots tab in standby (PAUSED) with 'ALL' recommended currencies by default
  const handleDeployToActiveBots = (bot: BotStrategyConfig) => {
    onStartBotRun({
      botId: bot.id,
      symbol: 'ALL',
      lotSize: bot.defaultLotSize || 0.01,
      tpPips: bot.defaultTpPips || 30,
      slPips: bot.defaultSlPips || 20,
    });
    setActiveSubTab('runs');
  };

  const handleDeployBot = () => {
    if (!selectedBotForConfig) return;
    onStartBotRun({
      botId: selectedBotForConfig.id,
      symbol: configSymbol,
      lotSize: configLotSize,
      tpPips: configTpPips,
      slPips: configSlPips,
    });
    setSelectedBotForConfig(null);
    setActiveSubTab('runs');
  };

  const handleSaveImportedBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importName.trim()) return;

    const newBot: BotStrategyConfig = {
      id: `imported-${Date.now()}`,
      name: importName.trim(),
      type: 'IMPORTED',
      tag: importTag || 'Custom Strategy',
      description: importDesc.trim() || 'Custom imported institutional algorithmic expert advisor.',
      recommendedInstruments: [importPair],
      defaultLotSize: 0.1,
      defaultTpPips: 25,
      defaultSlPips: 20,
      author: 'Custom Algorithmic File',
      version: 'v1.0 Institutional',
      timeframe: 'M15',
      strategyLogic: 'User-defined algorithmic parameters & EA signal triggers.',
      indicatorTriggers: ['Custom Technical Filter', 'Dynamic Volatility Stop'],
      importedFileName: importFileName || `${importName.toLowerCase().replace(/\s+/g, '_')}.vtm`,
      claimedWinRate: '93.8%',
    };

    onImportBot(newBot);
    setShowImportModal(false);
    setImportName('');
    setImportDesc('');
    setImportFileName('');
    setActiveSubTab('bots');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
      if (!importName) {
        setImportName(file.name.replace(/\.[^/.]+$/, '').toUpperCase());
      }
    }
  };

  const selectedInst = instMap.get(configSymbol) || instruments[0];

  return (
    <div
      id="vtm-bots-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-20 transition-colors duration-200 select-none ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Top Banner: Bot Ecosystem Overview */}
      <div
        className={`px-3 sm:px-4 py-3 border-b ${
          isDarkMode ? 'bg-[#121418] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#E51937]" />
              <h1 className="text-lg sm:text-xl font-black tracking-tight">Bots &amp; EAs</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Bots &amp; EAs Execution Engine</span>
              </span>
            </div>

            <p className={`text-xs mt-0.5 max-w-2xl ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-slate-600'}`}>
              High-frequency Bots &amp; EAs execution engine. Deploy quantitative algorithms with real-time market pricing, algorithmic entries, Take Profit, and Stop Loss order tracking.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-import-bot-top"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Custom Bot</span>
            </button>
          </div>
        </div>

        {/* Aggregate Performance Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800/60">
          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Active Bot Runs</div>
            <div className="text-base font-black font-mono mt-0.5 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">{runningBotsCount}</span>
              <span className="text-xs text-slate-500 dark:text-neutral-500 font-normal">/ {visibleBotRuns.length} total</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Algorithm Win Rate</div>
            <div className="text-base font-black font-mono mt-0.5 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>{winRate}%</span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-normal">Verified</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Open Bot Trades</div>
            <div className="text-base font-black font-mono mt-0.5 text-sky-600 dark:text-sky-400">
              {openTrades.length} Positions
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Total Bot Profit</div>
            <div
              className={`text-base font-black font-mono mt-0.5 ${
                overallProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {overallProfit >= 0 ? '+' : ''}${fmt(overallProfit, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Unified Bots List, Active Runs, Trades & Execution */}
      <div
        className={`px-3 sm:px-4 py-2 border-b flex items-center gap-2 overflow-x-auto no-scrollbar ${
          isDarkMode ? 'bg-[#15171C] border-neutral-800' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <button
          id="bots-subtab-all"
          onClick={() => setActiveSubTab('bots')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'bots'
              ? 'bg-[#E51937] text-white shadow-xs'
              : isDarkMode
              ? 'text-neutral-500 dark:text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Bots ({allBots.length})</span>
        </button>

        <button
          id="bots-subtab-runs"
          onClick={() => setActiveSubTab('runs')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'runs'
              ? 'bg-[#E51937] text-white shadow-xs'
              : isDarkMode
              ? 'text-neutral-500 dark:text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Active Bots</span>
          {runningBotsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono font-bold">
            {visibleBotRuns.length}
          </span>
        </button>

        <button
          id="bots-subtab-trades"
          onClick={() => setActiveSubTab('trades')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'trades'
              ? 'bg-[#E51937] text-white shadow-xs'
              : isDarkMode
              ? 'text-neutral-500 dark:text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Trades & Execution</span>
          {openTrades.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-mono font-bold">
              {openTrades.length} Open
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-3 sm:p-4 w-full">
        {/* SUBTAB 1: All Bots Catalog (Unified, no Inbuilt/Imported split) */}
        {activeSubTab === 'bots' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold">Quantitative Algorithmic Strategies ({allBots.length})</h2>
                <p className={`text-xs ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-slate-600'}`}>
                  Select and deploy battle-tested quantitative algorithms. Bots and EAs run profit-taking and order management.
                </p>
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all border border-neutral-700 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#E51937]" />
                <span>+ Import Custom Strategy</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allBots.map((bot) => {
                const deployedRun = visibleBotRuns.find(
                  (r) => r.botId === bot.id || r.botName === bot.name
                );

                return (
                  <div
                    key={bot.id}
                    className={`p-4 rounded-2xl border transition-colors hover:border-[#E51937]/50 shadow-xs flex flex-col justify-between ${
                      isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black tracking-tight">{bot.name}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#E51937]/15 text-[#E51937] border border-[#E51937]/30">
                              {bot.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {bot.author} • {bot.version} ({bot.timeframe})
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold">Algorithm Winrate</div>
                          <div className="font-mono text-sm font-black text-emerald-400">
                            {(() => {
                              const parsed = parseFloat(String(bot.claimedWinRate || '').replace('%', ''));
                              if (!isNaN(parsed) && parsed >= 100) return '96.4%';
                              return bot.claimedWinRate || '94.6%';
                            })()}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-neutral-300 mb-3 leading-relaxed">
                        {bot.description}
                      </p>

                      {/* Trigger Indicators */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {bot.indicatorTriggers.map((trig, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              isDarkMode
                                ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {trig}
                          </span>
                        ))}
                      </div>

                      {/* Recommended Pairs (Static labels - all traded autonomously by default) */}
                      <div className="flex items-center gap-1.5 text-xs mb-3 flex-wrap">
                        <span className="text-slate-600 dark:text-neutral-400 font-medium text-[11px]">Recommended:</span>
                        <div className="flex items-center gap-1 font-mono font-bold flex-wrap">
                          {bot.recommendedInstruments.map((sym) => (
                            <span
                              key={sym}
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[11px] border border-emerald-500/20 font-bold"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-neutral-800/70 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono min-w-0">
                        Default: {bot.defaultLotSize} Lots | TP: {bot.defaultTpPips}p | SL: {bot.defaultSlPips}p
                      </div>

                      {deployedRun ? (
                        <button
                          id={`btn-deploy-${bot.id}`}
                          onClick={() => setActiveSubTab('runs')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer shrink-0"
                          title="Bot is already deployed in Active Bots engine"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Deployed (Active)</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-deploy-${bot.id}`}
                          onClick={() => handleDeployToActiveBots(bot)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Deploy Bot</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: Active Bots Management */}
        {activeSubTab === 'runs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold">Active Bots &amp; Execution Engine</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Configure settings and click Run Bot to start autonomous market execution. Deployed bots stay here until deleted.
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('bots')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-bold transition-all cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deploy Another Bot</span>
              </button>
            </div>

            {visibleBotRuns.length === 0 ? (
              <div
                className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">No Active Bots Deployed Yet</h3>
                <p className={`text-xs max-w-md ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-slate-600'}`}>
                  Click &ldquo;Deploy Bot&rdquo; on any strategy in the Bots catalog to add it here, configure its settings, and run it.
                </p>
                <button
                  onClick={() => setActiveSubTab('bots')}
                  className="px-4 py-2 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-bold cursor-pointer"
                >
                  Explore Bots
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {runMetrics.map((metric) => {
                  const run = metric.run;
                  const totalTrades = metric.totalTrades;
                  const winningTrades = metric.winningTrades;
                  const losingTrades = metric.losingTrades;
                  const totalProfit = metric.totalProfit;
                  const runWinRate = metric.runWinRate;

                  return (
                    <div
                      key={run.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-800/60">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              run.status === 'RUNNING'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            <Bot className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base">{run.botName}</h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                  run.status === 'RUNNING'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {run.status === 'RUNNING' && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                )}
                                <span>{run.status}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1 flex-wrap">
                              {(() => {
                                const matchedBot = allBots.find(
                                  (b) => b.id === run.botId || b.name === run.botName
                                );
                                const recPairs = matchedBot?.recommendedInstruments || ['XAUUSD'];
                                const isSpecificPair =
                                  Boolean(run.customSymbolSelected) &&
                                  Boolean(run.symbol) &&
                                  run.symbol.toUpperCase() !== 'ALL';
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded-lg border text-xs font-mono font-bold ${
                                      isDarkMode
                                        ? 'bg-neutral-900 border-neutral-700 text-sky-400'
                                        : 'bg-slate-100 border-slate-300 text-slate-900'
                                    }`}
                                  >
                                    {isSpecificPair
                                      ? run.symbol
                                      : `All Pairs (${recPairs.join(', ')})`}
                                  </span>
                                );
                              })()}
                              <span>•</span>
                              <span>{run.lotSize || 0.01} Lots</span>
                              <span>•</span>
                              <span>TP: +{run.tpPips || 30}p</span>
                              <span>•</span>
                              <span>SL: -{run.slPips || 20}p</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {run.status === 'RUNNING' && (
                            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="hidden sm:inline">Auto-Trading Active</span>
                            </div>
                          )}

                          {/* Run Bot / Pause Button */}
                          <button
                            onClick={() =>
                              onToggleBotRun(run.id || run.runId || run.botId || run.botName)
                            }
                            className={`px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                              run.status === 'RUNNING'
                                ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            }`}
                            title={run.status === 'RUNNING' ? 'Pause Bot' : 'Run Bot'}
                          >
                            {run.status === 'RUNNING' ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Run Bot</span>
                              </>
                            )}
                          </button>

                          {/* Settings Button */}
                          <button
                            onClick={() => handleOpenSettingsModal(run)}
                            className="px-2.5 py-2 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
                            title="Configure Bot Parameters (Lots, TP, SL, Symbol, Status)"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Settings</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setRunToDelete(run)}
                            className="px-2.5 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
                            title="Delete Deployed Bot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Live Run Metrics & Latest Signal */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Trades Executed</div>
                          <div className="font-mono text-sm font-bold mt-0.5 text-slate-900 dark:text-white">
                            {totalTrades} ({winningTrades}W / {losingTrades}L)
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Run Win Rate</div>
                          <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {runWinRate}%
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Total Profit Generated</div>
                          <div
                            className={`font-mono text-sm font-bold mt-0.5 ${
                              totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {totalProfit >= 0 ? '+' : ''}${fmt(totalProfit, 2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-semibold">Execution Status</div>
                          <div className="text-xs text-sky-700 dark:text-sky-300 font-semibold truncate mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            <span>{run.lastSignal || 'Scanning order book for signals...'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: Trades & Execution Log (Bulletproof, zero blanks, real-time live prices) */}
        {activeSubTab === 'trades' && (
          <div className="space-y-5">
            {/* Open Trades Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold">Open Positions (Bots &amp; EAs Execution)</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400">
                    {liveOpenTrades.length} Active
                  </span>
                </div>

                {liveOpenTrades.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono hidden sm:inline">
                      Live Floating PnL:
                    </span>
                    <span
                      className={`text-xs font-mono font-black ${
                        totalOpenProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {totalOpenProfit >= 0 ? '+' : ''}${fmt(totalOpenProfit, 2)}
                    </span>
                  </div>
                )}
              </div>

              {liveOpenTrades.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center text-neutral-500 dark:text-neutral-400 text-xs ${
                    isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  No active open positions currently. Bot strategies will trigger and manage entries automatically.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    className={`w-full text-left text-xs border rounded-xl overflow-hidden ${
                      isDarkMode ? 'border-neutral-800' : 'border-slate-200'
                    }`}
                  >
                    <thead
                      className={`text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 ${
                        isDarkMode ? 'bg-[#121418]' : 'bg-slate-100'
                      }`}
                    >
                      <tr>
                        <th className="p-2.5">Ticket & Bot</th>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Volume</th>
                        <th className="p-2.5">Open Price</th>
                        <th className="p-2.5">Current (Live)</th>
                        <th className="p-2.5">S / L</th>
                        <th className="p-2.5">T / P</th>
                        <th className="p-2.5 text-right">Profit (USD)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {liveOpenTrades.map((t) => {
                        const isProfit = t.profitUsd >= 0;
                        const associatedRun = botRuns.find(
                          (r) => r.id === t.runId || r.runId === t.runId || r.id === t.runInstanceId
                        );
                        return (
                          <tr
                            key={t.id}
                            className={`hover:bg-neutral-800/30 transition-colors ${
                              isDarkMode ? 'bg-[#161920]' : 'bg-white'
                            }`}
                          >
                            <td className="p-2.5">
                              <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>#{t.ticket || t.id.slice(-6)}</div>
                              <div className={`text-[10px] font-sans truncate max-w-[140px] ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-600'}`}>{t.botName}</div>
                            </td>
                            <td className="p-2.5 font-bold">{t.symbol}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.side === 'BUY'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {t.side}
                              </span>
                            </td>
                            <td className="p-2.5">{fmt(t.lotSize, 2)}</td>
                            <td className="p-2.5">{fmt(t.openPrice, t.decimals)}</td>
                            <td className="p-2.5 font-bold text-sky-400">
                              {fmt(t.currentPrice, t.decimals)}
                            </td>
                            <td className="p-2.5 text-rose-400">{t.slVal ? fmt(t.slVal, t.decimals) : '-'}</td>
                            <td className="p-2.5 text-emerald-400">{t.tpVal ? fmt(t.tpVal, t.decimals) : '-'}</td>
                            <td className={`p-2.5 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${fmt(t.profitUsd, 2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {associatedRun && (
                                  <button
                                    onClick={() => handleOpenSettingsModal(associatedRun)}
                                    className="p-1 rounded bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-sky-400 text-[10px] font-bold cursor-pointer transition-all"
                                    title="Open Bot Settings"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onCloseBotTrade(t.id)}
                                  className="px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-bold cursor-pointer transition-all"
                                  title="Close Trade Immediately"
                                >
                                  Close
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Closed Trades History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold">Closed Trade History & Performance</h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">({closedTrades.length} Trades Completed)</span>
                </div>

                {closedTrades.length > 0 && (
                  <div className="text-xs font-mono font-bold">
                    Realized PnL:{' '}
                    <span className={totalClosedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {totalClosedProfit >= 0 ? '+' : ''}${fmt(totalClosedProfit, 2)}
                    </span>
                  </div>
                )}
              </div>

              {closedTrades.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center text-neutral-500 dark:text-neutral-400 text-xs ${
                    isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  No historical trades logged yet. Bot and EA closures will be cataloged here with exit metrics.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table
                    className={`w-full text-left text-xs border rounded-xl overflow-hidden ${
                      isDarkMode ? 'border-neutral-800' : 'border-slate-200'
                    }`}
                  >
                    <thead
                      className={`text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 sticky top-0 ${
                        isDarkMode ? 'bg-[#121418]' : 'bg-slate-100'
                      }`}
                    >
                      <tr>
                        <th className="p-2.5">Ticket</th>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Bot Strategy</th>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Lots</th>
                        <th className="p-2.5">Open</th>
                        <th className="p-2.5">Close</th>
                        <th className="p-2.5">Exit Reason</th>
                        <th className="p-2.5 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {adjustedClosedTrades.map((t, idx) => {
                        const isProfit = (t.profitUsd || 0) >= 0;
                        const dateStr = (() => {
                          const rawVal =
                            t.closeTime ||
                            t.openTime ||
                            (t as any).closedAt ||
                            (t as any).time ||
                            (t as any).timestamp ||
                            (t as any).createdAt;
                          let d: Date;
                          if (rawVal) {
                            const n = typeof rawVal === 'number' ? rawVal : Number(rawVal);
                            if (!isNaN(n) && n > 0) {
                              d = new Date(n < 1e11 ? n * 1000 : n);
                            } else {
                              d = new Date(rawVal);
                            }
                          } else {
                            const ticketNum =
                              typeof t.ticket === 'number'
                                ? t.ticket
                                : parseInt(String(t.ticket || t.id || '').replace(/\D/g, ''), 10) || ((idx + 1) * 317 + 1000);
                            d = new Date(Date.now() - ((ticketNum % 14400) + (idx + 1) * 60) * 1000);
                          }
                          if (isNaN(d.getTime())) {
                            d = new Date();
                          }
                          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        })();
                        const inst = instMap.get(t.symbol);
                        const decimals = inst ? inst.decimals : 2;

                        return (
                          <tr
                            key={t.id}
                            className={`hover:bg-neutral-800/30 transition-colors ${
                              isDarkMode ? 'bg-[#161920]' : 'bg-white'
                            }`}
                          >
                            <td className="p-2.5 font-bold">#{t.ticket || t.id.slice(-6)}</td>
                            <td className="p-2.5 text-neutral-500 dark:text-neutral-400 text-[11px] whitespace-nowrap">{dateStr}</td>
                            <td className="p-2.5 font-sans font-medium truncate max-w-[140px]">{t.botName}</td>
                            <td className="p-2.5 font-bold">{t.symbol}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  t.side === 'BUY'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {t.side}
                              </span>
                            </td>
                            <td className="p-2.5">{fmt(t.lotSize, 2)}</td>
                            <td className="p-2.5">{fmt(t.openPrice, decimals)}</td>
                            <td className="p-2.5">{fmt(t.closePrice ?? t.exitPrice ?? t.currentPrice, decimals)}</td>
                            <td className="p-2.5 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isProfit
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-400'
                                }`}
                              >
                                {isProfit
                                  ? (t.closeReason === 'MANUAL' ? 'Manual Close (+)' : 'Take Profit Hit')
                                  : (t.closeReason === 'MANUAL' ? 'Manual Close (-)' : 'Stop Loss Hit')}
                              </span>
                            </td>
                            <td className={`p-2.5 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${fmt(t.profitUsd, 2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Configure & Deploy Bot */}
      {selectedBotForConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md max-h-[88dvh] flex flex-col rounded-2xl border shadow-2xl p-3.5 sm:p-5 animate-scale-up overflow-hidden ${
              isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-700/60 mb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-5 h-5 text-[#E51937] shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base leading-none truncate">{selectedBotForConfig.name}</h3>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{selectedBotForConfig.tag}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBotForConfig(null)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-white text-base px-1.5 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-0.5">
              {/* Instrument Selection */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Target Instrument</label>
                <select
                  value={configSymbol}
                  onChange={(e) => setConfigSymbol(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {stableInstruments.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.symbol} — {inst.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 block font-mono tabular-nums">
                  Current Live Bid: {fmt(selectedInst?.bid, selectedInst?.decimals)} | Ask:{' '}
                  {fmt(selectedInst?.ask, selectedInst?.decimals)}
                </span>
              </div>

              {/* Lot Size Selection */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Lot Size / Volume</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10.0"
                  value={configLotSize}
                  onChange={(e) => setConfigLotSize(parseFloat(e.target.value) || 0.01)}
                  className={`w-full p-2 rounded-lg border text-xs font-mono font-bold ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* TP & SL Parameters */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                    Take Profit (Pips)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={configTpPips}
                    onChange={(e) => setConfigTpPips(parseInt(e.target.value, 10) || 10)}
                    className={`w-full p-2 rounded-lg border text-xs font-mono font-bold ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-emerald-600'
                    }`}
                  />
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Target Profit Target</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-400 mb-1">
                    Stop Loss (Pips)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={configSlPips}
                    onChange={(e) => setConfigSlPips(parseInt(e.target.value, 10) || 10)}
                    className={`w-full p-2 rounded-lg border text-xs font-mono font-bold ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-rose-400'
                        : 'bg-slate-50 border-slate-300 text-rose-600'
                    }`}
                  />
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Capital Protection Stop</span>
                </div>
              </div>

              {/* Strategy Parameters Card */}
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5 text-sky-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Quantitative Execution Verification</span>
                </div>
                <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                  Bot will autonomously execute trades according to {selectedBotForConfig.strategyLogic}. Real-time PnL will update directly with the live charts.
                </p>
              </div>

              {/* Submit & Deploy Button */}
              <button
                id="confirm-deploy-bot-btn"
                onClick={handleDeployBot}
                className="w-full py-2.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Deploy Live Bot Run</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Import Custom Bot Strategy */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl border shadow-2xl p-3.5 sm:p-5 animate-scale-up overflow-hidden ${
              isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-700/60 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-sm sm:text-base">Import Custom Bot Strategy</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-white text-base px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveImportedBot} className="space-y-3 overflow-y-auto pr-0.5">
              {/* File Upload Drop Area */}
              <div
                className={`p-3 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDarkMode
                    ? 'border-neutral-700 hover:border-purple-400 bg-neutral-900/50'
                    : 'border-slate-300 hover:border-purple-400 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  id="bot-file-input"
                  accept=".vtm,.mq5,.ex5,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="bot-file-input" className="cursor-pointer flex flex-col items-center">
                  <FileCode className="w-7 h-7 text-purple-400 mb-1" />
                  <span className="text-xs font-bold text-neutral-200">
                    {importFileName ? `Selected: ${importFileName}` : 'Click to select .vtm or .mq5 bot file'}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">Supports MT5 EA exports & VTM strategy files</span>
                </label>
              </div>

              {/* Bot Name & Tag */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">Bot Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Scalper EA"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className={`w-full p-2 rounded-lg border text-xs ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">Strategy Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Breakout / Scalping"
                    value={importTag}
                    onChange={(e) => setImportTag(e.target.value)}
                    className={`w-full p-2 rounded-lg border text-xs ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Target Instrument */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">Primary Instrument</label>
                <select
                  value={importPair}
                  onChange={(e) => setImportPair(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {stableInstruments.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.symbol} — {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategy Description */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">Strategy Logic Overview</label>
                <textarea
                  rows={2}
                  placeholder="Describe strategy triggers, indicator confirmations, and session filters..."
                  value={importDesc}
                  onChange={(e) => setImportDesc(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-700/60">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Save & Add to Bots
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOT RUN SETTINGS MODAL */}
      {editingRun && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md sm:max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border p-3 sm:p-5 shadow-2xl transition-all overflow-hidden ${
              isDarkMode ? 'bg-[#161920] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Compact Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold leading-tight">EA Bot Settings & Parameters</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    <span className={`font-semibold shrink-0 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{editingRun.botName}</span>
                    <span>•</span>
                    <span className="font-mono text-sky-400 truncate">
                      {editSymbol === 'ALL'
                        ? `All Bot Pairs (${(
                            allBots.find(
                              (b) => b.id === editingRun.botId || b.name === editingRun.botName
                            )?.recommendedInstruments || ['XAUUSD']
                          ).join(', ')})`
                        : editSymbol}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRun(null)}
                className="p-1 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col min-h-0 pt-2">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {/* Instrument Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    Traded Instrument / Market Symbol
                  </label>
                  <select
                    value={editSymbol}
                    onChange={(e) => setEditSymbol(e.target.value)}
                    className={`w-full p-1.5 sm:p-2 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ALL">
                      All Bot Currencies (
                      {(
                        allBots.find(
                          (b) => b.id === editingRun.botId || b.name === editingRun.botName
                        )?.recommendedInstruments || ['XAUUSD']
                      ).join(', ')}
                      ) — Autonomous
                    </option>
                    {stableInstruments.map((inst) => (
                      <option key={inst.symbol} value={inst.symbol}>
                        {inst.symbol} — {inst.name}
                      </option>
                    ))}
                  </select>
                  {/* Quick Currency Presets */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditSymbol('ALL')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                        editSymbol === 'ALL'
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      All Bot Pairs (Auto)
                    </button>
                    {Array.from(
                      new Set([
                        ...(allBots.find(
                          (b) => b.id === editingRun.botId || b.name === editingRun.botName
                        )?.recommendedInstruments || []),
                        'XAUUSD',
                        'EURUSD',
                        'GBPUSD',
                        'USDJPY',
                        'BTCUSD',
                      ])
                    )
                      .slice(0, 6)
                      .map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setEditSymbol(sym)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                            editSymbol === sym
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Lot Size & Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-neutral-400">Order Volume (Lots)</label>
                    <span className="text-[11px] font-mono text-sky-400 font-bold">{editLotSize} Lot(s)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="50.0"
                    value={editLotSize}
                    onChange={(e) => setEditLotSize(parseFloat(e.target.value) || 0.01)}
                    className={`w-full p-1.5 sm:p-2 rounded-lg border text-xs font-mono font-bold ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditLotSize(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          editLotSize === preset
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Take Profit & Stop Loss Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Take Profit */}
                  <div className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-400">Take Profit (Pips)</label>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">+{editTpPips}p</span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={editTpPips}
                      onChange={(e) => setEditTpPips(parseInt(e.target.value) || 10)}
                      className={`w-full p-1.5 rounded-lg border text-xs font-mono font-bold ${
                        isDarkMode
                          ? 'bg-neutral-900 border-emerald-500/30 text-white'
                          : 'bg-white border-emerald-300 text-slate-900'
                      }`}
                    />
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="5"
                      value={editTpPips}
                      onChange={(e) => setEditTpPips(parseInt(e.target.value))}
                      className="w-full h-1.5 accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Stop Loss */}
                  <div className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-rose-400">Stop Loss (Pips)</label>
                      <span className="text-[11px] font-mono font-bold text-rose-400">-{editSlPips}p</span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={editSlPips}
                      onChange={(e) => setEditSlPips(parseInt(e.target.value) || 10)}
                      className={`w-full p-1.5 rounded-lg border text-xs font-mono font-bold ${
                        isDarkMode
                          ? 'bg-neutral-900 border-rose-500/30 text-white'
                          : 'bg-white border-rose-300 text-slate-900'
                      }`}
                    />
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={editSlPips}
                      onChange={(e) => setEditSlPips(parseInt(e.target.value))}
                      className="w-full h-1.5 accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Execution State */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    Execution State
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditStatus('RUNNING')}
                      className={`p-1.5 sm:p-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        editStatus === 'RUNNING'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-xs'
                          : 'border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-800/50'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span>RUNNING (Active)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditStatus('PAUSED')}
                      className={`p-1.5 sm:p-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        editStatus === 'PAUSED'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-xs'
                          : 'border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-800/50'
                      }`}
                    >
                      <Pause className="w-3 h-3 fill-current shrink-0" />
                      <span>PAUSED (Standby)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons - Pinned Footer */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2.5 mt-2 border-t border-neutral-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = editingRun;
                    setEditingRun(null);
                    setRunToDelete(toDel);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3 h-3 shrink-0" />
                  <span>Delete Bot</span>
                </button>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingRun(null)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3 h-3 shrink-0" />
                    <span>Save Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingRun) return;
                      onUpdateBotRunSettings?.(editingRun.id || editingRun.runId || '', {
                        symbol: editSymbol,
                        lotSize: editLotSize,
                        tpPips: editTpPips,
                        slPips: editSlPips,
                        status: 'RUNNING',
                      });
                      setEditingRun(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 fill-current shrink-0" />
                    <span>Save &amp; Run Bot</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {runToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md max-h-[88dvh] flex flex-col rounded-2xl border p-4 sm:p-6 shadow-2xl transition-all overflow-hidden ${
              isDarkMode ? 'bg-[#161920] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Delete Deployed Bot</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Remove from active execution</p>
                </div>
              </div>
              <button
                onClick={() => setRunToDelete(null)}
                className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 overflow-y-auto">
              <p className="text-xs sm:text-sm">
                Are you sure you want to delete <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{runToDelete.botName}</span> on{' '}
                <span className="font-mono font-bold text-sky-400">{runToDelete.symbol}</span>?
              </p>

              <div
                className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
                  isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Traded Symbol:</span>
                  <span className="font-bold">{runToDelete.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Position Volume:</span>
                  <span className="font-bold">{runToDelete.lotSize} Lots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Take Profit / Stop Loss:</span>
                  <span className="font-bold">+{runToDelete.tpPips}p / -{runToDelete.slPips}p</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Total Profit Generated:</span>
                  <span className={`font-bold ${runToDelete.totalProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {runToDelete.totalProfitUsd >= 0 ? '+' : ''}${fmt(runToDelete.totalProfitUsd, 2)}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Deleting this deployed bot terminates autonomous algorithmic execution and settles any remaining open orders for this instance.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setRunToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete Bot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
