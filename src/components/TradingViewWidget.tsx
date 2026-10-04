import React, { useMemo, useState } from 'react';
import { Timeframe, ChartType } from '../types';
import { TradingViewPriceService } from '../services/tradingViewService';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { Maximize2, Minimize2, RefreshCw, Lock } from 'lucide-react';

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
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  timeframe,
  onTimeframeChange,
  isDarkMode,
  isFullscreen = false,
  onToggleFullscreen,
  bid,
  ask,
  spread,
  decimals = 2,
  pipMultiplier = 10000,
  tickDirection = 'NEUTRAL',
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Live real-time tick detection for top badges
  const prevBidRef = React.useRef(bid);
  const prevAskRef = React.useRef(ask);
  const [bidTick, setBidTick] = useState<'UP' | 'DOWN' | null>(null);
  const [askTick, setAskTick] = useState<'UP' | 'DOWN' | null>(null);

  React.useEffect(() => {
    if (bid !== undefined && prevBidRef.current !== undefined && bid !== prevBidRef.current) {
      setBidTick(bid > prevBidRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setBidTick(null), 650);
      prevBidRef.current = bid;
      return () => clearTimeout(t);
    }
    prevBidRef.current = bid;
  }, [bid]);

  React.useEffect(() => {
    if (ask !== undefined && prevAskRef.current !== undefined && ask !== prevAskRef.current) {
      setAskTick(ask > prevAskRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setAskTick(null), 650);
      prevAskRef.current = ask;
      return () => clearTimeout(t);
    }
    prevAskRef.current = ask;
  }, [ask]);

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

  // Construct official Widget Embed URL with full interactive drawing tools, indicators,
  // and native Bid/Ask scale labels + lines rendered directly at exact price coordinates
  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tv_widget_${symbol}`,
      symbol: tvSymbol,
      interval: tvInterval,
      hidesidetoolbar: '0',
      symboledit: '1',
      saveimage: '0',
      toolbarbg: isDarkMode ? '181B20' : 'F8FAFC',
      studies: JSON.stringify(['RSI@tv-basicstudies', 'MASimple@tv-basicstudies']),
      theme: isDarkMode ? 'dark' : 'light',
      style: '1', // Candlesticks
      timezone: 'Etc/UTC',
      withdateranges: '1',
      showintervals: '1',
      enablepublishing: 'false',
      locale: 'en',
      overrides: JSON.stringify({
        'mainSeriesProperties.bidAsk.visible': true,
        'mainSeriesProperties.bidAsk.lineStyle': 2,
        'mainSeriesProperties.bidAsk.lineWidth': 1,
        'mainSeriesProperties.bidAsk.bidLineColor': '#E51937', // Red for Sell/Bid
        'mainSeriesProperties.bidAsk.askLineColor': '#00C076', // Green for Buy/Ask
        'scalesProperties.showBidAskLabels': true,
        'scalesProperties.showSymbolLabels': true,
        'scalesProperties.showCountdown': true,
      }),
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, tvInterval, isDarkMode]);

  const timeframes: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  return (
    <div
      id="tradingview-live-widget-container"
      className={`relative flex flex-col w-full overflow-hidden transition-all duration-200 border rounded-xl shadow-lg select-none ${
        isDarkMode
          ? 'bg-[#121418] border-neutral-800/90 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-full min-h-[380px] sm:min-h-[440px]'}`}
    >
      {/* Top Chart Bar with status and controls */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs ${
          isDarkMode
            ? 'bg-[#181B20] border-neutral-800/80 text-neutral-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {/* Left: Live Feed indicator + Symbol + Timeframes */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-bold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Quote</span>
          </div>

          <span className="font-mono font-bold text-xs">{symbol}</span>

          {/* Quick Timeframe pills */}
          {onTimeframeChange && (
            <div className="flex items-center gap-1 ml-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    timeframe === tf
                      ? 'bg-[#E51937] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Real-time SELL (Bid) and BUY (Ask) badges synchronized with execution buttons */}
          {bid !== undefined && ask !== undefined && (() => {
            const marketStatus = checkInstrumentMarketHours(symbol);
            return (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {/* Closed Indicator */}
                {!marketStatus.isOpen && (
                  <span className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold tracking-wider uppercase">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Closed</span>
                  </span>
                )}

                {/* SELL / Bid Badge (Red) - Animated reaction on price change */}
                <div
                  title="SELL (Bid) Price - Synchronized with SELL button"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-all ${
                    bidTick === 'UP'
                      ? 'border-emerald-400 ring-1 ring-emerald-400 scale-105'
                      : bidTick === 'DOWN'
                      ? 'border-rose-400 ring-1 ring-rose-400 scale-105'
                      : 'border-red-800/80'
                  } bg-[#1A1215]`}
                >
                  <span className="bg-[#990F20] text-red-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                    SELL
                    {bidTick === 'UP' && <span className="text-emerald-300 text-[10px]">▲</span>}
                    {bidTick === 'DOWN' && <span className="text-rose-300 text-[10px]">▼</span>}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white transition-all ${
                    bidTick === 'UP' ? 'bg-[#00C076]' : bidTick === 'DOWN' ? 'bg-[#FF2E4D]' : 'bg-[#E51937]'
                  }`}>
                    {bid.toFixed(decimals)}
                  </span>
                </div>

                {/* Spread Points Pill */}
                <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded bg-neutral-800/80 text-amber-300 text-[10px] font-semibold border border-neutral-700/60">
                  <span>
                    {(() => {
                      const diff = Math.abs(ask - bid);
                      if (diff === 0) return '0.0 pts';
                      if (symbol === 'XAUUSD') {
                        return `${(diff * 10).toFixed(1)} pts`;
                      }
                      if (symbol === 'XAGUSD' || (symbol.startsWith('X') && symbol.endsWith('USD'))) {
                        return `${(diff * 100).toFixed(1)} pts`;
                      }
                      if (decimals >= 4) {
                        return `${(diff * 10000).toFixed(1)} pts`;
                      }
                      if (decimals === 3) {
                        return `${(diff * 100).toFixed(1)} pts`;
                      }
                      return `${diff.toFixed(1)} pts`;
                    })()}
                  </span>
                </div>

                {/* BUY / Ask Badge (Green) - Animated reaction on price change */}
                <div
                  title="BUY (Ask) Price - Synchronized with BUY button"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-all ${
                    askTick === 'UP'
                      ? 'border-emerald-400 ring-1 ring-emerald-400 scale-105'
                      : askTick === 'DOWN'
                      ? 'border-rose-400 ring-1 ring-rose-400 scale-105'
                      : 'border-emerald-800/80'
                  } bg-[#121A15]`}
                >
                  <span className="bg-[#007A4A] text-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                    BUY
                    {askTick === 'UP' && <span className="text-emerald-300 text-[10px]">▲</span>}
                    {askTick === 'DOWN' && <span className="text-rose-300 text-[10px]">▼</span>}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white transition-all ${
                    askTick === 'UP' ? 'bg-[#00E58D] text-black font-extrabold' : askTick === 'DOWN' ? 'bg-[#FF2E4D]' : 'bg-[#00C076]'
                  }`}>
                    {ask.toFixed(decimals)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Reload Chart */}
          <button
            onClick={() => {
              setIsLoading(true);
              setIframeKey((prev) => prev + 1);
            }}
            title="Refresh Live Chart"
            className={`p-1 rounded transition-colors ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className={`absolute inset-0 top-9 flex flex-col items-center justify-center z-10 ${
            isDarkMode ? 'bg-[#121418]' : 'bg-white'
          }`}
        >
          <div className="w-6 h-6 border-2 border-[#E51937] border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-neutral-400 font-mono">
            Loading Real-Time Market Chart...
          </span>
        </div>
      )}

      {/* TradingView Widget Iframe with Native Real-Time Scale Bid/Ask Lines */}
      <iframe
        key={iframeKey}
        src={widgetUrl}
        onLoad={() => setIsLoading(false)}
        className="w-full h-full flex-1 border-0"
        title={`TradingView Chart - ${symbol}`}
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
