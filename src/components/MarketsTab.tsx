import React, { useState, useMemo } from 'react';
import { Instrument, MarketCategory, Timeframe } from '../types';
import {
  Search,
  Star,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Zap,
  BarChart2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { formatPipPrice } from '../utils/pipFormatter';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { EditInstrumentsModal } from './EditInstrumentsModal';
import { QuickOrderSheet } from './QuickOrderSheet';
import { TradingViewWidget } from './TradingViewWidget';

interface MarketsTabProps {
  instruments: Instrument[];
  onSelectInstrument: (symbol: string) => void;
  onQuickTrade: (symbol: string, side: 'BUY' | 'SELL') => void;
  onToggleFavorite: (symbol: string) => void;
  isDarkMode?: boolean;
  tickStates?: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>;
  oneClickTrading?: boolean;
}

export const MarketsTab: React.FC<MarketsTabProps> = ({
  instruments,
  onSelectInstrument,
  onQuickTrade,
  onToggleFavorite,
  isDarkMode = false,
  tickStates = {},
  oneClickTrading = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('Forex');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'GAINERS' | 'LOSERS' | 'FAVORITES'>('ALL');
  const [previewSymbol, setPreviewSymbol] = useState<string>('XAUUSD');
  const [previewTimeframe, setPreviewTimeframe] = useState<Timeframe>('15M');
  const [previewLotSize, setPreviewLotSize] = useState<number>(0.1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const [orderModalParams, setOrderModalParams] = useState<{
    instrument: Instrument;
    side: 'BUY' | 'SELL';
  } | null>(null);

  // Categories management
  const [categoryList, setCategoryList] = useState<
    { id: MarketCategory; name: string; enabled: boolean }[]
  >([
    { id: 'Favourites', name: 'Favourites', enabled: true },
    { id: 'Forex', name: 'Forex', enabled: true },
    { id: 'Crypto', name: 'Crypto (24/7)', enabled: true },
    { id: 'Commodities', name: 'Commodities', enabled: true },
    { id: 'Indices', name: 'Indices', enabled: true },
    { id: 'Stocks', name: 'Stocks', enabled: true },
    { id: 'ETFs', name: 'ETFs', enabled: true },
    { id: 'Bonds', name: 'Bonds', enabled: true },
  ]);

  const handleToggleCategory = (catId: MarketCategory) => {
    setCategoryList((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, enabled: !c.enabled } : c))
    );
  };

  // Currencies quick filters for Forex matching HFM mobile app
  const currencyFilters = [
    { code: 'USD', flag: '🇺🇸', label: 'USD' },
    { code: 'GBP', flag: '🇬🇧', label: 'GBP' },
    { code: 'EUR', flag: '🇪🇺', label: 'EUR' },
    { code: 'JPY', flag: '🇯🇵', label: 'JPY' },
    { code: 'AUD', flag: '🇦🇺', label: 'AUD' },
    { code: 'CAD', flag: '🇨🇦', label: 'CAD' },
    { code: 'CHF', flag: '🇨🇭', label: 'CHF' },
  ];

  // Benchmark Tickers for Top Ribbon
  const benchmarkSymbols = ['XAUUSD', 'EURUSD', 'BTCUSD', 'US500'];
  const benchmarkInstruments = useMemo(() => {
    return benchmarkSymbols
      .map((sym) => instruments.find((i) => i.symbol === sym || i.symbol.startsWith(sym)))
      .filter((inst): inst is Instrument => Boolean(inst));
  }, [instruments]);

  // Top Gainers & Losers across all instruments
  const sortedByChange = useMemo(() => {
    return [...instruments].sort((a, b) => b.change24h - a.change24h);
  }, [instruments]);

  const topGainers = useMemo(() => sortedByChange.slice(0, 3), [sortedByChange]);
  const topLosers = useMemo(() => [...sortedByChange].reverse().slice(0, 3), [sortedByChange]);

  // Active Preview Instrument for Desktop Panel
  const activePreviewInst = useMemo(() => {
    return (
      instruments.find((i) => i.symbol === previewSymbol) ||
      instruments.find((i) => i.symbol === 'XAUUSD') ||
      instruments[0]
    );
  }, [instruments, previewSymbol]);

  // Filter instruments based on user search, category, currency, and quick filters
  const visibleInstruments = useMemo(() => {
    return instruments.filter((inst) => {
      // Search query filter
      const matchesSearch =
        inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Quick filter tags
      if (quickFilter === 'FAVORITES' && !inst.isFavorite) return false;
      if (quickFilter === 'GAINERS' && inst.change24h <= 0) return false;
      if (quickFilter === 'LOSERS' && inst.change24h >= 0) return false;

      // Category filter (if not in a quick filter mode that overrides)
      if (quickFilter === 'ALL') {
        if (selectedCategory === 'Favourites') {
          if (!inst.isFavorite) return false;
        } else if (selectedCategory === 'Forex') {
          if (inst.category !== 'Forex') return false;
          if (selectedCurrency && !inst.symbol.includes(selectedCurrency)) {
            return false;
          }
        } else if (selectedCategory === 'Crypto') {
          if (inst.category !== 'Crypto') return false;
        } else if (selectedCategory === 'Commodities') {
          if (inst.category !== 'Commodities') return false;
        } else if (selectedCategory === 'Indices') {
          if (inst.category !== 'Indices') return false;
        } else if (selectedCategory === 'Stocks') {
          if (inst.category !== 'Stocks') return false;
        } else if (selectedCategory === 'ETFs') {
          if (inst.category !== 'ETFs') return false;
        } else if (selectedCategory === 'Bonds') {
          if (inst.category !== 'Bonds') return false;
        }
      }

      return true;
    });
  }, [instruments, searchQuery, quickFilter, selectedCategory, selectedCurrency]);

  const handleTradeClick = (e: React.MouseEvent, inst: Instrument, side: 'BUY' | 'SELL') => {
    e.stopPropagation();
    const marketStatus = checkInstrumentMarketHours(inst.symbol, inst.category);
    if (!marketStatus.isOpen) {
      setClosedNotice(
        `Market is currently CLOSED for ${inst.symbol}: ${marketStatus.reason}. (Crypto operates 24/7 unbroken).`
      );
      setTimeout(() => setClosedNotice(null), 4000);
      return;
    }

    if (oneClickTrading) {
      onQuickTrade(inst.symbol, side);
    } else {
      setOrderModalParams({ instrument: inst, side });
    }
  };

  const handleSelectCard = (inst: Instrument) => {
    setPreviewSymbol(inst.symbol);
    // On mobile / tablet, directly navigate to the trading workspace
    if (window.innerWidth < 1024) {
      onSelectInstrument(inst.symbol);
    }
  };

  // Preview prices
  const previewBidParts = formatPipPrice(activePreviewInst.bid, activePreviewInst.decimals, activePreviewInst.category === 'Forex');
  const previewAskParts = formatPipPrice(activePreviewInst.ask, activePreviewInst.decimals, activePreviewInst.category === 'Forex');
  const previewTick = tickStates[activePreviewInst.symbol] || 'NEUTRAL';

  return (
    <div
      id="vtm-markets-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Market Closed Notice Toast Banner */}
      {closedNotice && (
        <div className="mx-2 sm:mx-3 mt-1.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{closedNotice}</span>
          </div>
          <button onClick={() => setClosedNotice(null)} className="text-amber-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Top Benchmark Tickers Ribbon (Responsive Grid: 2 cols on mobile, 4 cols on desktop) */}
      <div className="px-2 sm:px-3 pt-1.5 pb-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {benchmarkInstruments.map((bench) => {
            const isSelected = bench.symbol === activePreviewInst.symbol;
            const isUp = bench.change24h >= 0;
            const tick = tickStates[bench.symbol] || 'NEUTRAL';
            return (
              <div
                key={bench.symbol}
                onClick={() => setPreviewSymbol(bench.symbol)}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between min-w-0 ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-[#1C2028] border-[#E51937] shadow-sm'
                      : 'bg-red-50/70 border-[#E51937] shadow-sm'
                    : isDarkMode
                    ? 'bg-[#16181D] border-neutral-800/80 hover:border-neutral-700'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-xs sm:text-sm tracking-tight truncate">
                      {bench.symbol}
                    </span>
                    {bench.symbol === 'XAUUSD' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 font-bold">
                        Gold
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 block truncate">{bench.name}</span>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`font-mono text-xs sm:text-sm font-bold tracking-tight transition-colors ${
                      tick === 'UP'
                        ? 'text-emerald-500'
                        : tick === 'DOWN'
                        ? 'text-rose-500'
                        : isDarkMode
                        ? 'text-white'
                        : 'text-neutral-900'
                    }`}
                  >
                    {bench.bid.toLocaleString(undefined, {
                      minimumFractionDigits: bench.decimals,
                      maximumFractionDigits: bench.decimals,
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 text-[10px] font-bold">
                    {isUp ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-500" />
                    )}
                    <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                      {isUp ? '+' : ''}
                      {bench.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Container: Responsive Grid (1 col on mobile, multi-column on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start px-2 sm:px-3">
        {/* Main Watchlist Column (12 cols on mobile, 7-8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-w-0 w-full space-y-2.5">
          {/* Search Bar & Quick Filter Badges */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Rounded Search Input */}
            <div
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                isDarkMode
                  ? 'bg-[#181A20] border-neutral-800 text-white'
                  : 'bg-neutral-100/90 border-neutral-200 text-neutral-900'
              }`}
            >
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Search symbols (e.g. XAUUSD, EURUSD, US500)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs w-full focus:outline-none placeholder:text-neutral-400 font-medium"
              />
            </div>

            {/* Quick Filter Badges (All, Gainers, Losers, Favorites) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => setQuickFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  quickFilter === 'ALL'
                    ? 'bg-[#E51937] text-white'
                    : isDarkMode
                    ? 'bg-[#181A20] border border-neutral-800 text-neutral-400 hover:text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setQuickFilter('GAINERS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  quickFilter === 'GAINERS'
                    ? 'bg-emerald-600 text-white'
                    : isDarkMode
                    ? 'bg-[#181A20] border border-neutral-800 text-emerald-400 hover:text-white'
                    : 'bg-white border border-neutral-200 text-emerald-600 hover:text-emerald-700'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Gainers</span>
              </button>
              <button
                onClick={() => setQuickFilter('LOSERS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  quickFilter === 'LOSERS'
                    ? 'bg-rose-600 text-white'
                    : isDarkMode
                    ? 'bg-[#181A20] border border-neutral-800 text-rose-400 hover:text-white'
                    : 'bg-white border border-neutral-200 text-rose-600 hover:text-rose-700'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Losers</span>
              </button>
              <button
                onClick={() => setQuickFilter('FAVORITES')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  quickFilter === 'FAVORITES'
                    ? 'bg-amber-500 text-black font-bold'
                    : isDarkMode
                    ? 'bg-[#181A20] border border-neutral-800 text-amber-400 hover:text-white'
                    : 'bg-white border border-neutral-200 text-amber-600 hover:text-amber-700'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Saved</span>
              </button>

              {/* Sliders / Edit Categories Button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                title="Edit Categories"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Categories Horizontal Tabs */}
          {quickFilter === 'ALL' && (
            <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {categoryList
                .filter((c) => c.enabled)
                .map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedCurrency(null);
                      }}
                      className={`py-2 text-[13.5px] font-semibold whitespace-nowrap relative transition-colors cursor-pointer ${
                        isActive
                          ? isDarkMode
                            ? 'text-white'
                            : 'text-neutral-900'
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {/* Forex Currency Filter Chips */}
          {quickFilter === 'ALL' && selectedCategory === 'Forex' && (
            <div className="py-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {currencyFilters.map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <button
                    key={curr.code}
                    onClick={() =>
                      setSelectedCurrency(isSelected ? null : curr.code)
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-[#E51937] text-white border-[#E51937]'
                        : isDarkMode
                        ? 'bg-[#181A20] border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{curr.flag}</span>
                    <span>{curr.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Watchlist Cards Grid: 1 col on mobile, 2 cols on tablet/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5 pt-1">
            {visibleInstruments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-neutral-400 text-xs">
                No instruments found matching your search.
              </div>
            ) : (
              visibleInstruments.map((inst) => {
                const isCurrentPreview = inst.symbol === activePreviewInst.symbol;
                const mHours = checkInstrumentMarketHours(inst.symbol, inst.category);
                const displaySymbol =
                  inst.category === 'Forex' && !inst.symbol.includes('.')
                    ? `${inst.symbol}.Z`
                    : inst.symbol;

                const bidParts = formatPipPrice(inst.bid, inst.decimals, inst.category === 'Forex');
                const askParts = formatPipPrice(inst.ask, inst.decimals, inst.category === 'Forex');
                const spreadInt = inst.spread > 0 ? (Math.round(inst.spread * 10) || Math.round(inst.spread)) : 0;
                const tick = tickStates[inst.symbol] || 'NEUTRAL';

                // Sparkline path
                const minSpark = Math.min(...inst.sparkline);
                const maxSpark = Math.max(...inst.sparkline);
                const range = maxSpark - minSpark || 1;
                const points = inst.sparkline
                  .map((val, idx) => {
                    const x = (idx / (inst.sparkline.length - 1)) * 52;
                    const y = 22 - ((val - minSpark) / range) * 16;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');

                const sparkColor = inst.change24h >= 0 ? '#22C55E' : '#E51937';

                return (
                  <div
                    key={inst.symbol}
                    onClick={() => handleSelectCard(inst)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs group relative ${
                      isCurrentPreview
                        ? isDarkMode
                          ? 'bg-[#181B22] border-[#E51937] ring-1 ring-[#E51937]/30'
                          : 'bg-red-50/40 border-[#E51937] ring-1 ring-[#E51937]/30'
                        : isDarkMode
                        ? 'bg-[#16181D] border-neutral-800 hover:border-neutral-700'
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {/* Top Row: Symbol + Star (Left) | Sparkline + Spread (Center) | 24h Change (Right) */}
                    <div className="flex items-center justify-between mb-2">
                      {/* Left: Symbol & Favorite Star */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-[15px] tracking-tight truncate">
                          {displaySymbol}
                        </span>
                        {!mHours.isOpen && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0"
                            title={`Market Closed: ${mHours.reason}`}
                          >
                            Closed
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(inst.symbol);
                          }}
                          className="p-0.5 hover:scale-110 transition-transform cursor-pointer shrink-0"
                          title="Toggle Favorite"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              inst.isFavorite
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-neutral-400'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Center Sparkline & Spread Number */}
                      <div className="flex flex-col items-center shrink-0 px-1">
                        <svg width="50" height="22" className="overflow-visible">
                          <polyline
                            fill="none"
                            stroke={sparkColor}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                          />
                        </svg>
                        <span className="text-[10px] text-neutral-400 font-bold -mt-0.5">
                          {spreadInt}
                        </span>
                      </div>

                      {/* Right: 24h Change */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            inst.change24h >= 0
                              ? 'text-emerald-500 bg-emerald-500/10'
                              : 'text-red-500 bg-red-500/10'
                          }`}
                        >
                          {inst.change24h >= 0 ? '+' : ''}
                          {inst.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Dual Action Pricing Boxes (SELL vs BUY) */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      {/* Sell Box */}
                      <button
                        onClick={(e) => handleTradeClick(e, inst, 'SELL')}
                        className={`py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
                          tick === 'DOWN'
                            ? 'bg-rose-500/25 dark:bg-rose-500/30 border-rose-500 text-rose-700 dark:text-rose-200 ring-1 ring-rose-500/40 shadow-xs'
                            : isDarkMode
                            ? 'bg-[#1F222A] border-neutral-700/60 hover:border-rose-500/50 text-white'
                            : 'bg-neutral-50/90 border-neutral-200 hover:border-rose-300 text-neutral-900'
                        }`}
                      >
                        {/* Price Typography with Guaranteed Anti-Overlap */}
                        <div className="flex items-baseline justify-center leading-none mb-1 whitespace-nowrap overflow-hidden max-w-full">
                          {bidParts.isForex ? (
                            <>
                              <span className="text-xs font-normal opacity-80">{bidParts.base}</span>
                              <span className="text-base font-black tracking-tight">{bidParts.bigPips}</span>
                              <span className="text-[10px] font-semibold align-super ml-0.5">{bidParts.fractional}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold font-mono tracking-tight">
                              {bidParts.fullFormatted}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                          <span>Sell</span>
                          {tick === 'DOWN' && <span className="text-rose-500 font-bold text-[10px]">▼</span>}
                        </div>
                      </button>

                      {/* Buy Box */}
                      <button
                        onClick={(e) => handleTradeClick(e, inst, 'BUY')}
                        className={`py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
                          tick === 'UP'
                            ? 'bg-emerald-500/25 dark:bg-emerald-500/30 border-emerald-500 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500/40 shadow-xs'
                            : isDarkMode
                            ? 'bg-[#1F222A] border-neutral-700/60 hover:border-emerald-500/50 text-white'
                            : 'bg-neutral-50/90 border-neutral-200 hover:border-emerald-300 text-neutral-900'
                        }`}
                      >
                        {/* Price Typography with Guaranteed Anti-Overlap */}
                        <div className="flex items-baseline justify-center leading-none mb-1 whitespace-nowrap overflow-hidden max-w-full">
                          {askParts.isForex ? (
                            <>
                              <span className="text-xs font-normal opacity-80">{askParts.base}</span>
                              <span className="text-base font-black tracking-tight">{askParts.bigPips}</span>
                              <span className="text-[10px] font-semibold align-super ml-0.5">{askParts.fractional}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold font-mono tracking-tight">
                              {askParts.fullFormatted}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                          <span>Buy</span>
                          {tick === 'UP' && <span className="text-emerald-500 font-bold text-[10px]">▲</span>}
                        </div>
                      </button>
                    </div>

                    {/* Quick Link to Full Chart on hover */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/40">
                      <span className="truncate">{inst.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInstrument(inst.symbol);
                        }}
                        className="flex items-center gap-0.5 text-neutral-400 hover:text-[#E51937] transition-colors"
                      >
                        <span>Trade</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Desktop Market Intelligence & Quick Action Panel (Hidden on Mobile, 5 cols on lg, 4 cols on xl) */}
        <div className="hidden lg:flex flex-col gap-3.5 lg:col-span-5 xl:col-span-4 sticky top-14 min-w-0">
          {/* 1. Mini Trading Terminal & Chart Preview */}
          <div
            className={`p-4 rounded-2xl border shadow-md transition-colors ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            {/* Header: Selected Instrument info */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg tracking-tight">{activePreviewInst.symbol}</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E51937]/15 text-[#E51937]">
                    {activePreviewInst.category}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 block">{activePreviewInst.name}</span>
              </div>

              <button
                onClick={() => onSelectInstrument(activePreviewInst.symbol)}
                className="flex items-center gap-1 text-xs font-bold text-[#E51937] hover:underline"
              >
                <span>Full Chart</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 mb-2">
              {(['1M', '5M', '15M', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setPreviewTimeframe(tf)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    previewTimeframe === tf
                      ? 'bg-[#E51937] text-white'
                      : isDarkMode
                      ? 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-black'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Embedded Live Chart Preview */}
            <div className="h-60 w-full rounded-xl overflow-hidden border border-neutral-800/80 mb-3 bg-black/40">
              <TradingViewWidget
                symbol={activePreviewInst.symbol}
                timeframe={previewTimeframe}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Lot Size Selector */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1 font-semibold">
                <span>Execution Volume (Lots)</span>
                <span className={`font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{previewLotSize} Lot</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[0.01, 0.05, 0.1, 0.5, 1.0].map((lot) => (
                  <button
                    key={lot}
                    onClick={() => setPreviewLotSize(lot)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      previewLotSize === lot
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode
                        ? 'bg-[#1F222A] border border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        : 'bg-neutral-100 border border-neutral-200 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {lot}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant One-Click Buy & Sell Execution Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onQuickTrade(activePreviewInst.symbol, 'SELL')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  previewTick === 'DOWN'
                    ? 'bg-rose-500/25 border-rose-500 ring-1 ring-rose-500/40 text-rose-300'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-500'
                }`}
              >
                <div className="text-xs font-normal">SELL</div>
                <div className="text-base font-black font-mono tracking-tight">
                  {previewBidParts.fullFormatted}
                </div>
              </button>

              <button
                onClick={() => onQuickTrade(activePreviewInst.symbol, 'BUY')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  previewTick === 'UP'
                    ? 'bg-emerald-500/25 border-emerald-500 ring-1 ring-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-500'
                }`}
              >
                <div className="text-xs font-normal">BUY</div>
                <div className="text-base font-black font-mono tracking-tight">
                  {previewAskParts.fullFormatted}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Top Movers (Gainers & Losers) */}
          <div
            className={`p-3.5 rounded-2xl border shadow-sm transition-colors ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800/60 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#E51937]" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Top Market Movers</h4>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400">Live 24h Volatility</span>
            </div>

            <div className="space-y-1.5">
              {topGainers.map((g) => (
                <div
                  key={g.symbol}
                  onClick={() => setPreviewSymbol(g.symbol)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{g.symbol}</span>
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400">{g.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-neutral-200">${g.bid.toFixed(g.decimals > 2 ? 2 : g.decimals)}</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      +{g.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Global Trading Sessions Status */}
          <div
            className={`p-3.5 rounded-2xl border shadow-sm transition-colors ${
              isDarkMode ? 'bg-[#16181D] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800/60 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Global Trading Sessions</h4>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400">GMT Standard</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-300 block">London</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">08:00 - 16:30</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Open</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-300 block">New York</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">13:00 - 21:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Open</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-300 block">Tokyo</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">00:00 - 09:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-neutral-600" />
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">Closed</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-300 block">Sydney</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">21:00 - 06:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-neutral-600" />
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Instruments Modal */}
      <EditInstrumentsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        categories={categoryList}
        onToggleCategory={handleToggleCategory}
        isDarkMode={isDarkMode}
      />

      {/* Quick Order Sheet if One-Click is off */}
      {orderModalParams && (
        <QuickOrderSheet
          isOpen={true}
          onClose={() => setOrderModalParams(null)}
          instrument={orderModalParams.instrument}
          side={orderModalParams.side}
          onExecute={(p) => {
            onQuickTrade(p.symbol, p.side);
            setOrderModalParams(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
