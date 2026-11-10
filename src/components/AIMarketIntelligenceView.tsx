import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ArrowRight,
  BarChart3,
  Sliders,
  CheckCircle2,
  Compass,
  Flame,
  Activity,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Instrument } from '../types';
import { AIMarketSignal, aiMarketService } from '../services/aiMarketService';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { QuickOrderSheet } from './QuickOrderSheet';

interface AIMarketIntelligenceViewProps {
  instruments: Instrument[];
  isDarkMode?: boolean;
  onSelectInstrument?: (symbol: string) => void;
  onExecuteTrade?: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
}

export const AIMarketIntelligenceView: React.FC<AIMarketIntelligenceViewProps> = ({
  instruments,
  isDarkMode = false,
  onSelectInstrument,
  onExecuteTrade,
}) => {
  const [signals, setSignals] = useState<AIMarketSignal[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<AIMarketSignal[]>([]);
  const [marketSentimentScore, setMarketSentimentScore] = useState<number>(78);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Interactive Order Execution Sheet State (User input lot size & capital validation)
  const [selectedTradeParams, setSelectedTradeParams] = useState<{
    instrument: Instrument;
    side: 'BUY' | 'SELL';
    sl: number | null;
    tp: number | null;
  } | null>(null);

  // Custom Pair Scanner State
  const [scannerSymbol, setScannerSymbol] = useState<string>('XAUUSD');
  const [scannerTimeframe, setScannerTimeframe] = useState<string>('15M');
  const [scannerStyle, setScannerStyle] = useState<string>('Intraday');
  const [scannerQuestion, setScannerQuestion] = useState<string>('');
  const [scannerLoading, setScannerLoading] = useState<boolean>(false);
  const [customSignal, setCustomSignal] = useState<AIMarketSignal | null>(null);

  // Trade Execution Feedback State
  const [executedSymbol, setExecutedSymbol] = useState<string | null>(null);

  // Synchronize signals feed directly from real-time live instruments
  const fetchFeed = useCallback(async () => {
    if (!instruments || instruments.length === 0) return;
    try {
      const res = await aiMarketService.getSignalsFeed(instruments);
      setSignals(res.signals);
      setTopOpportunities(res.topOpportunities);
      setMarketSentimentScore(res.marketSentimentScore);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Feed sync error:', err);
    }
  }, [instruments]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleRunCustomScan = async () => {
    setScannerLoading(true);
    const targetInst = instruments.find((i) => i.symbol === scannerSymbol);
    const livePrice = targetInst?.bid || targetInst?.ask || 1;
    const change24h = targetInst?.change24h || 0;
    try {
      const result = await aiMarketService.analyzePair(
        {
          symbol: scannerSymbol,
          currentPrice: livePrice,
          change24h,
          high24h: targetInst?.high24h,
          low24h: targetInst?.low24h,
          category: targetInst?.category || 'Forex',
          timeframe: scannerTimeframe,
          style: scannerStyle,
          question: scannerQuestion,
          decimals: targetInst?.decimals,
        },
        targetInst
      );
      setCustomSignal(result);
    } catch (e) {
      console.warn('Custom scan error:', e);
    } finally {
      setScannerLoading(false);
    }
  };

  const categories = ['All', 'Forex', 'Commodities', 'Crypto', 'Indices'];

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        s.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === 'Commodities' && (s.symbol === 'XAUUSD' || s.symbol === 'USOIL' || s.symbol === 'UKOIL'));
      const matchesSearch =
        !searchQuery ||
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [signals, selectedCategory, searchQuery]);

  const handleQuickExecute = (signal: AIMarketSignal, side: 'BUY' | 'SELL') => {
    const targetInst = instruments.find((i) => i.symbol === signal.symbol) || {
      symbol: signal.symbol,
      name: signal.name,
      category: (signal.category as any) || 'Forex',
      bid: signal.currentPrice,
      ask: signal.currentPrice,
      spread: 0.2,
      decimals: signal.currentPrice > 500 ? 2 : 5,
      pipMultiplier: 10000,
      change24h: 0,
      high24h: signal.currentPrice * 1.005,
      low24h: signal.currentPrice * 0.995,
      sparkline: [],
      isFavorite: false,
    };

    setSelectedTradeParams({
      instrument: targetInst,
      side,
      sl: signal.stopLoss,
      tp: signal.takeProfit1,
    });
  };

  return (
    <div
      id="ai-market-intelligence-screen"
      className={`min-h-[calc(100vh-100px)] flex flex-col pb-20 transition-colors duration-200 select-none ${
        isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Banner: Minimized, High-Density Header */}
      <div
        className={`px-3 sm:px-5 py-2.5 border-b ${
          isDarkMode ? 'border-neutral-800 bg-[#11151F]' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-xs shrink-0">
              <div className="w-full h-full rounded-[6px] bg-[#0E1116] flex items-center justify-center text-white">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">
                  AI Market Intelligence &amp; Buzz
                </h1>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 border ${
                  isDarkMode
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  <Activity className="w-2.5 h-2.5 text-purple-500" />
                  Live Stream
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Institutional Sentiment Radar &amp; Pre-Calculated Signals
              </p>
            </div>
          </div>

          {/* Quick Metrics & Refresh */}
          <div className="flex items-center gap-2">
            <div
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${
                isDarkMode ? 'bg-[#161B26] border-neutral-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                Buzz:
              </span>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                {marketSentimentScore}% Bullish
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <button
              onClick={() => {
                setLoading(true);
                fetchFeed().finally(() => setLoading(false));
              }}
              disabled={loading}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDarkMode
                  ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
              } ${loading ? 'opacity-50' : ''}`}
              title="Refresh AI Signals"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-purple-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Filters, Search & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-neutral-800/60">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'text-neutral-400 hover:text-white bg-neutral-800/60'
                    : 'text-slate-600 hover:text-black bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (EURUSD, Gold)..."
                className={`w-full pl-7.5 pr-2.5 py-1 rounded-lg text-[11px] border outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-purple-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                }`}
              />
            </div>

            {/* View Mode Switcher: Compact Grid vs Dense Table */}
            <div className="flex items-center border border-slate-300 dark:border-neutral-700 rounded-lg p-0.5 shrink-0 bg-slate-100 dark:bg-neutral-900">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-neutral-400 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="Compact Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-neutral-400 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="Dense Screener List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3 max-w-7xl mx-auto w-full">
        {/* Top High-Conviction Setups: Super Compact, Sleek Cards */}
        {topOpportunities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                  Top High-Conviction Setups
                </h2>
              </div>
              <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-mono">
                Synced {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {topOpportunities.map((opp) => {
                const isBuy = opp.action.includes('BUY');
                const instRef = instruments.find((i) => i.symbol === opp.symbol);
                const dec = instRef?.decimals ?? (opp.currentPrice > 500 ? 2 : 5);
                const mStatus = checkInstrumentMarketHours(opp.symbol, instRef?.category || opp.category);
                return (
                  <div
                    key={opp.symbol}
                    className={`p-2.5 rounded-lg border transition-all duration-200 flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#131722] border-neutral-800 hover:border-purple-500/40 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-400 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Row: Symbol + Price + Buy/Sell Pill + 1-Click Action */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-xs sm:text-sm">{opp.symbol}</span>
                          {!mStatus.isOpen && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              🔒 Closed
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {opp.currentPrice.toFixed(dec)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black border flex items-center gap-0.5 ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isBuy ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            <span>{isBuy ? 'BUY' : 'SELL'}</span>
                          </span>

                          <button
                            onClick={() => handleQuickExecute(opp, isBuy ? 'BUY' : 'SELL')}
                            className={`h-6 px-2 rounded text-[10px] font-bold text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 ${
                              executedSymbol === opp.symbol
                                ? 'bg-emerald-600'
                                : isBuy
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-rose-600 hover:bg-rose-500'
                            }`}
                          >
                            {executedSymbol === opp.symbol ? 'Placed!' : `Trade ${isBuy ? 'Buy' : 'Sell'}`}
                          </button>

                          {onSelectInstrument && (
                            <button
                              onClick={() => onSelectInstrument(opp.symbol)}
                              className="h-6 w-6 rounded border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer"
                              title="Chart"
                            >
                              <BarChart3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slim Sentiment Line */}
                      <div className="h-1 w-full rounded-full bg-rose-500/25 overflow-hidden flex mb-1.5">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${opp.bullishSentimentPercent}%` }}
                        />
                      </div>

                      {/* Compact 3-Cell Level Strip: Entry (Black in light mode) | SL | TP */}
                      <div className="grid grid-cols-3 gap-1 text-center text-xs font-mono py-1 px-1.5 rounded bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-neutral-800 mb-1.5">
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-slate-600 dark:text-neutral-400">
                            Entry
                          </span>
                          <span className="font-black text-black dark:text-amber-300 text-[10px] sm:text-[11px] truncate block">
                            {opp.entryZone}
                          </span>
                        </div>
                        <div className="border-x border-slate-200 dark:border-neutral-800 px-1 min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-rose-600 dark:text-rose-400">
                            SL
                          </span>
                          <span className="font-black text-rose-700 dark:text-rose-300 text-[10px] sm:text-[11px] truncate block">
                            {opp.stopLoss}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-emerald-600 dark:text-emerald-400">
                            TP
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] truncate block">
                            {opp.takeProfit1}
                          </span>
                        </div>
                      </div>

                      {/* Short 1-Line Reason */}
                      <p className="text-[10px] text-slate-600 dark:text-neutral-300 truncate font-sans">
                        <span className="font-semibold text-slate-800 dark:text-neutral-200">Reason: </span>
                        {opp.technicalRationale || (isBuy ? 'Bullish order-flow expansion above liquidity floor' : 'Bearish structural rejection under resistance')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* On-Demand AI Pair Scanner: Sleek & Minimized */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            isDarkMode ? 'bg-[#121620] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-500 flex items-center justify-center shrink-0">
                <Sliders className="w-3 h-3" />
              </div>
              <div>
                <h3 className="font-bold text-xs">On-Demand AI Pair Scanner</h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Inspect institutional order-flow and entry brackets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={scannerSymbol}
                onChange={(e) => setScannerSymbol(e.target.value)}
                className={`px-2 py-0.5 rounded text-xs font-bold border outline-none cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                {instruments.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} - {inst.name}
                  </option>
                ))}
              </select>

              <select
                value={scannerTimeframe}
                onChange={(e) => setScannerTimeframe(e.target.value)}
                className={`px-2 py-0.5 rounded text-xs font-bold border outline-none cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <option value="15M">15M (Scalp)</option>
                <option value="1H">1H (Intraday)</option>
                <option value="4H">4H (Swing)</option>
                <option value="1D">1D (Daily)</option>
              </select>

              <button
                onClick={handleRunCustomScan}
                disabled={scannerLoading}
                className="h-6.5 px-2.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Sparkles className={`w-3 h-3 ${scannerLoading ? 'animate-spin' : ''}`} />
                <span>{scannerLoading ? 'Scanning...' : 'Scan Pair'}</span>
              </button>
            </div>
          </div>

          {/* Compact Scanner Result Strip */}
          {customSignal && (
            <div
              className={`p-2 rounded border mt-2 transition-all ${
                customSignal.action.includes('BUY')
                  ? isDarkMode
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-emerald-50/70 border-emerald-200'
                  : isDarkMode
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {customSignal.symbol}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      customSignal.action.includes('BUY')
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {customSignal.action.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    Confidence: {customSignal.confidence}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      handleQuickExecute(
                        customSignal,
                        customSignal.action.includes('BUY') ? 'BUY' : 'SELL'
                      )
                    }
                    className={`h-6 px-2.5 rounded text-[11px] font-bold text-white transition-all cursor-pointer ${
                      customSignal.action.includes('BUY')
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    Execute {customSignal.action.includes('BUY') ? 'BUY' : 'SELL'}
                  </button>

                  {onSelectInstrument && (
                    <button
                      onClick={() => onSelectInstrument(customSignal.symbol)}
                      className={`h-6 px-2 rounded border text-[11px] font-semibold cursor-pointer ${
                        isDarkMode
                          ? 'border-neutral-600 hover:bg-neutral-800 text-white'
                          : 'border-slate-300 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      Chart
                    </button>
                  )}
                </div>
              </div>

              {/* Compact 4-Box Level Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs font-mono text-center">
                <div
                  className={`p-1 rounded border shadow-xs ${
                    isDarkMode ? 'bg-[#0D111A] border-neutral-700/80' : 'bg-white border-slate-300'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-slate-700 dark:text-amber-400">
                    Entry
                  </span>
                  <span className="font-black text-[11px] tracking-tight block truncate text-black dark:text-amber-300">
                    {customSignal.entryZone}
                  </span>
                </div>
                <div
                  className={`p-1 rounded border shadow-xs ${
                    isDarkMode ? 'bg-[#0D111A] border-rose-800/70' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-rose-700 dark:text-rose-400">
                    Stop Loss
                  </span>
                  <span className="font-black text-[11px] tracking-tight block text-rose-700 dark:text-rose-300">
                    {customSignal.stopLoss}
                  </span>
                </div>
                <div
                  className={`p-1 rounded border shadow-xs ${
                    isDarkMode ? 'bg-[#0D111A] border-emerald-800/70' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-emerald-700 dark:text-emerald-400">
                    TP 1
                  </span>
                  <span className="font-black text-[11px] tracking-tight block text-emerald-700 dark:text-emerald-300">
                    {customSignal.takeProfit1}
                  </span>
                </div>
                <div
                  className={`p-1 rounded border shadow-xs ${
                    isDarkMode ? 'bg-[#0D111A] border-emerald-800/70' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-emerald-700 dark:text-emerald-400">
                    TP 2
                  </span>
                  <span className="font-black text-[11px] tracking-tight block text-emerald-700 dark:text-emerald-300">
                    {customSignal.takeProfit2}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* All Market Signals List: Ultra-Compact Cards or Screener Table */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-purple-500" />
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                All Market Signals ({filteredSignals.length})
              </h2>
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* Super Compact Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredSignals.map((signal) => {
                const isBuy = signal.action.includes('BUY');
                const instRef = instruments.find((i) => i.symbol === signal.symbol);
                const dec = instRef?.decimals ?? (signal.currentPrice > 500 ? 2 : 5);
                const mStatus = checkInstrumentMarketHours(signal.symbol, instRef?.category || signal.category);
                return (
                  <div
                    key={signal.symbol}
                    className={`p-2.5 rounded-lg border transition-all duration-200 flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#121622] border-neutral-800 hover:border-neutral-700 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Row: Symbol + Price + Buy/Sell Pill + 1-Click Trade */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-xs sm:text-sm">{signal.symbol}</span>
                          {!mStatus.isOpen && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              🔒 Closed
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {signal.currentPrice.toFixed(dec)}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                            {signal.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black border flex items-center gap-0.5 ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isBuy ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            <span>{isBuy ? 'BUY' : 'SELL'}</span>
                          </span>

                          <button
                            onClick={() => handleQuickExecute(signal, isBuy ? 'BUY' : 'SELL')}
                            className={`h-6 px-2 rounded text-[10px] font-bold text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 ${
                              executedSymbol === signal.symbol
                                ? 'bg-emerald-600'
                                : isBuy
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-rose-600 hover:bg-rose-500'
                            }`}
                          >
                            {executedSymbol === signal.symbol ? 'Placed!' : `Trade ${isBuy ? 'Buy' : 'Sell'}`}
                          </button>

                          {onSelectInstrument && (
                            <button
                              onClick={() => onSelectInstrument(signal.symbol)}
                              className="h-6 w-6 rounded border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer"
                              title="Chart"
                            >
                              <BarChart3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slim Sentiment Line */}
                      <div className="h-1 w-full rounded-full bg-rose-500/25 overflow-hidden flex mb-1.5">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${signal.bullishSentimentPercent}%` }}
                        />
                      </div>

                      {/* Compact 3-Cell Level Strip: Entry (Black font in light mode) | SL | TP */}
                      <div className="grid grid-cols-3 gap-1 text-center text-xs font-mono py-1 px-1.5 rounded bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-neutral-800 mb-1.5">
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-slate-600 dark:text-neutral-400">
                            Entry
                          </span>
                          <span className="font-black text-black dark:text-amber-300 text-[10px] sm:text-[11px] truncate block">
                            {signal.entryZone}
                          </span>
                        </div>
                        <div className="border-x border-slate-200 dark:border-neutral-800 px-1 min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-rose-600 dark:text-rose-400">
                            SL
                          </span>
                          <span className="font-black text-rose-700 dark:text-rose-300 text-[10px] sm:text-[11px] truncate block">
                            {signal.stopLoss}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase tracking-wider block font-sans font-bold text-emerald-600 dark:text-emerald-400">
                            TP
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] truncate block">
                            {signal.takeProfit1}
                          </span>
                        </div>
                      </div>

                      {/* Minimized 1-Line Reason */}
                      <p className="text-[10px] text-slate-600 dark:text-neutral-300 truncate font-sans">
                        <span className="font-semibold text-slate-800 dark:text-neutral-200">Reason: </span>
                        {signal.technicalRationale || (isBuy ? 'Bullish order-flow expansion above liquidity floor' : 'Bearish structural rejection under resistance')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* High-Density Screener Table View: Fits 15+ currencies per screen! */
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121622] shadow-xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#161B26] text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-2">Price</th>
                    <th className="py-2 px-2">Signal</th>
                    <th className="py-2 px-2">Entry Range</th>
                    <th className="py-2 px-2">Stop Loss</th>
                    <th className="py-2 px-2">Take Profit</th>
                    <th className="py-2 px-3">Reason</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-850 font-mono">
                  {filteredSignals.map((sig) => {
                    const isBuy = sig.action.includes('BUY');
                    const instRef = instruments.find((i) => i.symbol === sig.symbol);
                    const dec = instRef?.decimals ?? (sig.currentPrice > 500 ? 2 : 5);
                    return (
                      <tr
                        key={sig.symbol}
                        className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="py-1.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{sig.symbol}</span>
                            <span className="text-[9px] font-mono text-neutral-400 font-normal">
                              {sig.category}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 font-bold text-slate-900 dark:text-white">
                          {sig.currentPrice.toFixed(dec)}
                        </td>
                        <td className="py-1.5 px-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border inline-flex items-center gap-0.5 ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isBuy ? 'BUY' : 'SELL'} {sig.confidence}%
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-black text-black dark:text-amber-300">
                          {sig.entryZone}
                        </td>
                        <td className="py-1.5 px-2 font-black text-rose-700 dark:text-rose-400">
                          {sig.stopLoss}
                        </td>
                        <td className="py-1.5 px-2 font-black text-emerald-700 dark:text-emerald-400">
                          {sig.takeProfit1}
                        </td>
                        <td className="py-1.5 px-3 font-sans text-[10px] text-slate-600 dark:text-neutral-300 max-w-xs truncate">
                          {sig.technicalRationale || (isBuy ? 'Bullish order-flow expansion above liquidity floor' : 'Bearish structural rejection under resistance')}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1 font-sans">
                            <button
                              onClick={() => handleQuickExecute(sig, isBuy ? 'BUY' : 'SELL')}
                              className={`h-6 px-2.5 rounded text-[10px] font-bold text-white transition-all cursor-pointer ${
                                executedSymbol === sig.symbol
                                  ? 'bg-emerald-600'
                                  : isBuy
                                  ? 'bg-emerald-600 hover:bg-emerald-500'
                                  : 'bg-rose-600 hover:bg-rose-500'
                              }`}
                            >
                              {executedSymbol === sig.symbol ? 'Placed!' : isBuy ? 'Buy' : 'Sell'}
                            </button>
                            {onSelectInstrument && (
                              <button
                                onClick={() => onSelectInstrument(sig.symbol)}
                                className="h-6 w-6 rounded border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer"
                                title="Chart"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredSignals.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              <Compass className="w-6 h-6 mx-auto mb-1.5 text-neutral-500" />
              <p className="text-xs font-semibold">No signals matching current filter</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-1.5 text-xs text-purple-500 underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Order Sheet for AI Trade Execution: User inputs lot size & SL/TP before placement */}
      {selectedTradeParams && (
        <QuickOrderSheet
          isOpen={Boolean(selectedTradeParams)}
          onClose={() => setSelectedTradeParams(null)}
          instrument={selectedTradeParams.instrument}
          side={selectedTradeParams.side}
          initialSl={selectedTradeParams.sl}
          initialTp={selectedTradeParams.tp}
          initialLots={0.01}
          onExecute={(params) => {
            if (onExecuteTrade) {
              onExecuteTrade(params);
            }
            setExecutedSymbol(params.symbol);
            setTimeout(() => setExecutedSymbol(null), 2500);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
