import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Timeframe, ChartType } from '../types';
import { TradingViewPriceService } from '../services/tradingViewService';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Lock,
  PenTool,
} from 'lucide-react';

interface TradingViewWidgetProps {
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  chartType?: ChartType;
  isDarkMode: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  bid?: number;
  ask?: number;
  spread?: number;
  decimals?: number;
  pipMultiplier?: number;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
  externalShowDrawingToolbar?: boolean;
  onToggleExternalDrawingToolbar?: () => void;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  timeframe,
  isDarkMode,
  isFullscreen = false,
  onToggleFullscreen,
  bid,
  ask,
  spread,
  decimals = 2,
  externalShowDrawingToolbar,
  onToggleExternalDrawingToolbar,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalIsFullscreen, setInternalIsFullscreen] = useState(false);
  const effectiveFullscreen = isFullscreen || internalIsFullscreen;

  const handleToggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalIsFullscreen((prev) => !prev);
    }
  }, [onToggleFullscreen]);

  const marketStatus = checkInstrumentMarketHours(symbol);

  // Native TradingView drawing toolbar visibility (Persisted in localStorage; default is false/hidden unless user explicitly clicked to make it visible)
  const DRAW_TOOLBAR_KEY = 'vtm_chart_draw_toolbar';
  const [internalShowDrawingToolbar, setInternalShowDrawingToolbar] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DRAW_TOOLBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const showDrawingToolbar =
    externalShowDrawingToolbar !== undefined ? externalShowDrawingToolbar : internalShowDrawingToolbar;

  const toggleDrawingToolbar = useCallback(() => {
    const next = !showDrawingToolbar;
    try {
      localStorage.setItem(DRAW_TOOLBAR_KEY, next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('vtm_chart_draw_toolbar_changed', { detail: next }));
    } catch {}

    if (onToggleExternalDrawingToolbar) {
      onToggleExternalDrawingToolbar();
    } else {
      setInternalShowDrawingToolbar(next);
    }
    // Force immediate iframe reload with updated hidesidetoolbar parameter
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [showDrawingToolbar, onToggleExternalDrawingToolbar]);

  // Synchronize drawing toolbar across all mounted chart instances
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setInternalShowDrawingToolbar(customEvent.detail);
        setIsLoading(true);
        setIframeKey((prev) => prev + 1);
      }
    };
    window.addEventListener('vtm_chart_draw_toolbar_changed', handleSync);
    return () => window.removeEventListener('vtm_chart_draw_toolbar_changed', handleSync);
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Live real-time tick detection for top badges (disabled when market is closed)
  const prevBidRef = React.useRef(bid);
  const prevAskRef = React.useRef(ask);
  const [bidTick, setBidTick] = useState<'UP' | 'DOWN' | null>(null);
  const [askTick, setAskTick] = useState<'UP' | 'DOWN' | null>(null);

  React.useEffect(() => {
    if (!marketStatus.isOpen) {
      prevBidRef.current = bid;
      setBidTick(null);
      return;
    }
    if (bid !== undefined && prevBidRef.current !== undefined && bid !== prevBidRef.current) {
      setBidTick(bid > prevBidRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setBidTick(null), 650);
      prevBidRef.current = bid;
      return () => clearTimeout(t);
    }
    prevBidRef.current = bid;
  }, [bid, marketStatus.isOpen]);

  React.useEffect(() => {
    if (!marketStatus.isOpen) {
      prevAskRef.current = ask;
      setAskTick(null);
      return;
    }
    if (ask !== undefined && prevAskRef.current !== undefined && ask !== prevAskRef.current) {
      setAskTick(ask > prevAskRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setAskTick(null), 650);
      prevAskRef.current = ask;
      return () => clearTimeout(t);
    }
    prevAskRef.current = ask;
  }, [ask, marketStatus.isOpen]);

  // Map timeframe to TradingView interval string
  const tvInterval = useMemo(() => {
    switch (timeframe) {
      case '1M':
        return '1';
      case '5M':
        return '5';
      case '15M':
        return '15';
      case '1H':
        return '60';
      case '4H':
        return '240';
      case '1D':
        return 'D';
      case '1W':
        return 'W';
      default:
        return '15';
    }
  }, [timeframe]);

  const tvSymbol = useMemo(() => {
    return TradingViewPriceService.getTVSymbolForEmbed(symbol);
  }, [symbol]);

  // Official TradingView Widget URL with native Drawing Toolbar (hidesidetoolbar=0) and native Indicators button (next to +)
  // Native drawings are anchored to exact candlestick timestamps and prices, so drawing on 15m properly scales to 15 candles on 1m
  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tv_widget_${symbol.replace(/[^A-Za-z0-9]/g, '')}`,
      symbol: tvSymbol,
      interval: tvInterval,
      hidesidetoolbar: showDrawingToolbar ? '0' : '1',
      hide_side_toolbar: showDrawingToolbar ? '0' : '1',
      symboledit: '0',
      saveimage: '0',
      toolbarbg: isDarkMode ? '181B20' : 'F8FAFC',
      studies: JSON.stringify([]),
      theme: isDarkMode ? 'dark' : 'light',
      style: '1', // Candlesticks
      timezone: 'Etc/UTC',
      withdateranges: '1',
      showintervals: '1',
      enablepublishing: 'false',
      locale: 'en',
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, tvInterval, isDarkMode, symbol, showDrawingToolbar]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  return (
    <div
      ref={containerRef}
      id="tradingview-live-widget-container"
      className={`relative flex flex-col w-full overflow-hidden transition-all duration-200 border rounded-xl shadow-lg select-none ${
        isDarkMode
          ? 'bg-[#121418] border-neutral-800/90 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      } ${effectiveFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-full min-h-[380px] sm:min-h-[440px]'}`}
    >
      {/* Top Chart Bar: Left retains ONLY Live Quote + Currency; Right retains SELL/BUY quotes + Draw, Refresh & Expand */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs z-30 ${
          isDarkMode
            ? 'bg-[#181B20] border-neutral-800/80 text-neutral-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {/* Left: Live Quote status + Currency Symbol only */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {marketStatus.isOpen ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Quote</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold text-[10px]">
              <Lock className="w-2.5 h-2.5" />
              <span>Market Closed</span>
            </div>
          )}

          <span className="font-mono font-bold text-xs">{symbol}</span>
        </div>

        {/* Right: Live SELL/BUY badges + Draw, Refresh, Expand */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time SELL (Bid) and BUY (Ask) badges synchronized with execution buttons */}
          {bid !== undefined && ask !== undefined && (() => {
            const mStatus = checkInstrumentMarketHours(symbol);
            return (
              <div className="hidden md:flex items-center gap-1 font-mono text-[10px] shrink-0">
                {!mStatus.isOpen && (
                  <span className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold tracking-wider uppercase">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Closed</span>
                  </span>
                )}

                <div
                  title="SELL (Bid) Price"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-colors duration-150 ${
                    bidTick === 'UP'
                      ? 'border-emerald-400'
                      : bidTick === 'DOWN'
                      ? 'border-rose-400'
                      : 'border-red-800/80'
                  } bg-[#1A1215]`}
                >
                  <span className="bg-[#990F20] text-red-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 select-none">
                    SELL
                    {bidTick === 'UP' && <span className="text-emerald-300 text-[9px]">▲</span>}
                    {bidTick === 'DOWN' && <span className="text-rose-300 text-[9px]">▼</span>}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums min-w-[52px] text-right transition-colors duration-150 ${
                      bidTick === 'UP'
                        ? 'bg-[#00C076]'
                        : bidTick === 'DOWN'
                        ? 'bg-[#FF2E4D]'
                        : 'bg-[#E51937]'
                    }`}
                  >
                    {bid.toFixed(decimals)}
                  </span>
                </div>

                <div className="hidden lg:flex items-center px-1.5 py-0.5 rounded bg-neutral-800/80 text-amber-300 text-[9px] font-semibold border border-neutral-700/60 tabular-nums">
                  <span>
                    {`${(spread !== undefined && spread > 0 && spread <= 1.2 ? spread : 0.42).toFixed(2)} pts`}
                  </span>
                </div>

                <div
                  title="BUY (Ask) Price"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-colors duration-150 ${
                    askTick === 'UP'
                      ? 'border-emerald-400'
                      : askTick === 'DOWN'
                      ? 'border-rose-400'
                      : 'border-emerald-800/80'
                  } bg-[#121A15]`}
                >
                  <span className="bg-[#007A4A] text-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 select-none">
                    BUY
                    {askTick === 'UP' && <span className="text-emerald-300 text-[9px]">▲</span>}
                    {askTick === 'DOWN' && <span className="text-rose-300 text-[9px]">▼</span>}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums min-w-[52px] text-right transition-colors duration-150 ${
                      askTick === 'UP'
                        ? 'bg-[#00E58D] text-black font-extrabold'
                        : askTick === 'DOWN'
                        ? 'bg-[#FF2E4D]'
                        : 'bg-[#00C076]'
                    }`}
                  >
                    {ask.toFixed(decimals)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Native TradingView Drawing Tools Toggle Button */}
          <button
            type="button"
            onClick={toggleDrawingToolbar}
            title={showDrawingToolbar ? 'Hide Drawing Toolbar' : 'Show Drawing Toolbar'}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer border ${
              showDrawingToolbar
                ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-xs'
                : isDarkMode
                ? 'border-neutral-700/80 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Draw</span>
          </button>

          {/* Reload / Refresh Chart */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Live Chart"
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Fullscreen / Expand Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={effectiveFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            {effectiveFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className={`absolute inset-0 top-9 flex flex-col items-center justify-center z-10 pointer-events-none ${
            isDarkMode ? 'bg-[#121418]' : 'bg-white'
          }`}
        >
          <div className="w-6 h-6 border-2 border-[#E51937] border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-neutral-400 font-mono">
            Loading Real-Time Market Chart...
          </span>
        </div>
      )}

      {/* Main Chart: Real Native TradingView Chart with Native Drawing Toolbar & Native Indicators */}
      <div className="relative flex-1 w-full h-full flex flex-col overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`tv_iframe_${symbol}_${isDarkMode ? 'dark' : 'light'}_${showDrawingToolbar ? 'draw_on' : 'draw_off'}_${iframeKey}`}
          src={widgetUrl}
          onLoad={() => {
            setIsLoading(false);
          }}
          className="w-full h-full flex-1 border-0"
          style={{ minHeight: '300px', display: 'block' }}
          title={`TradingView Chart - ${symbol}`}
          allow="fullscreen; cross-origin-isolated"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
};
