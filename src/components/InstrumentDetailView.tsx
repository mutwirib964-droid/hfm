import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Star,
} from 'lucide-react';
import { Instrument, Candle, Timeframe } from '../types';
import { formatPipPrice } from '../utils/pipFormatter';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { PriceAlertModal } from './ChartModals';
import { QuickOrderSheet } from './QuickOrderSheet';
import { TradingViewWidget } from './TradingViewWidget';

export interface DrawnObject {
  id: string;
  tool: string;
  points: { x: number; y: number; price?: number }[];
  color: string;
  text?: string;
}

interface InstrumentDetailViewProps {
  instrument: Instrument;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onBack: () => void;
  onToggleFavorite: (symbol: string) => void;
  onExecuteTrade: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
  isDarkMode?: boolean;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
}

export const InstrumentDetailView: React.FC<InstrumentDetailViewProps> = ({
  instrument,
  timeframe,
  onTimeframeChange,
  onBack,
  onToggleFavorite,
  onExecuteTrade,
  isDarkMode = false,
  tickDirection = 'NEUTRAL',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vtm_chart_draw_toolbar') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setShowDrawingToolbar(customEvent.detail);
      }
    };
    window.addEventListener('vtm_chart_draw_toolbar_changed', handleSync);
    return () => window.removeEventListener('vtm_chart_draw_toolbar_changed', handleSync);
  }, []);

  const handleToggleDrawingToolbar = useCallback(() => {
    const next = !showDrawingToolbar;
    setShowDrawingToolbar(next);
    try {
      localStorage.setItem('vtm_chart_draw_toolbar', next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('vtm_chart_draw_toolbar_changed', { detail: next }));
    } catch {}
  }, [showDrawingToolbar]);

  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [quickOrderSide, setQuickOrderSide] = useState<'BUY' | 'SELL' | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const isForex = instrument.category === 'Forex';
  const bidParts = formatPipPrice(instrument.bid, instrument.decimals, isForex);
  const askParts = formatPipPrice(instrument.ask, instrument.decimals, isForex);
  const spreadDisplay = useMemo(() => {
    const s =
      instrument.spread > 0 && instrument.spread <= 1.2
        ? instrument.spread
        : Math.min(1.2, Math.max(0.18, Math.abs(instrument.ask - instrument.bid)));
    return s.toFixed(2);
  }, [instrument.ask, instrument.bid, instrument.spread]);

  // Market Specs
  const specs = [
    { label: 'Trading Hours', value: '00:02-24:00' },
    { label: 'Pip Size', value: `0.00010 (${instrument.decimals} digits)` },
    { label: 'Lot Size', value: instrument.category === 'Forex' ? '100,000' : '100' },
    { label: 'Minimum price change', value: (1 / instrument.pipMultiplier).toFixed(5) },
    { label: 'Minimum trade volume', value: '0.01' },
    { label: 'Maximum trade volume', value: '60' },
    { label: 'Maximum total trade volume', value: '200' },
    { label: 'Stop levels', value: '0 points' },
    { label: 'Swap long', value: '-3.5' },
    { label: 'Swap short', value: '-4.1' },
    { label: '3 Days swaps', value: 'Wednesday' },
  ];

  const marketStatus = checkInstrumentMarketHours(instrument.symbol, instrument.category);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const handleOpenTrade = (side: 'BUY' | 'SELL') => {
    if (!marketStatus.isOpen) {
      setClosedNotice(`Market is CLOSED for ${instrument.symbol}: ${marketStatus.reason}. (Crypto trades 24/7 unbroken).`);
      setTimeout(() => setClosedNotice(null), 4500);
      return;
    }
    setQuickOrderSide(side);
  };

  return (
    <div
      id="instrument-detail-screen"
      ref={containerRef}
      className={`min-h-[calc(100vh-100px)] flex flex-col pb-12 transition-colors duration-200 select-none ${
        isDarkMode ? 'bg-[#111317] text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Market Closed Banner Notice */}
      {!marketStatus.isOpen && (
        <div
          className={`mx-3 mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-colors ${
            isDarkMode
              ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate">
              Market Closed: {marketStatus.reason} {marketStatus.nextOpenTime ? `(Reopens ${marketStatus.nextOpenTime})` : ''}
            </span>
          </div>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 border uppercase tracking-wider ${
              isDarkMode
                ? 'bg-amber-500/25 border-amber-500/40 text-amber-200'
                : 'bg-amber-200/90 border-amber-400 text-amber-950'
            }`}
          >
            Trading Suspended
          </span>
        </div>
      )}

      {closedNotice && (
        <div
          className={`mx-3 mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs ${
            isDarkMode
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <span>⚠️ {closedNotice}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Back to Markets"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight">{instrument.symbol}</h1>
              <button
                onClick={() => onToggleFavorite(instrument.symbol)}
                className="cursor-pointer"
                title="Favorite"
              >
                <Star
                  className={`w-4 h-4 ${
                    instrument.isFavorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-400'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">
              {instrument.name}
            </p>
          </div>
        </div>

        {/* Right Tools: Alerts */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPriceAlertModal(true)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-400 text-[#E51937] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Main Chart Viewport: Unified TradingViewWidget with Price-Anchored Drawings & Indicators */}
      <div
        className={`relative w-full transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#111317] h-screen'
            : 'h-[440px] sm:h-[500px] md:h-[560px]'
        } bg-transparent`}
      >
        <TradingViewWidget
          symbol={instrument.symbol}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          isDarkMode={isDarkMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          bid={instrument.bid}
          ask={instrument.ask}
          spread={instrument.spread}
          decimals={instrument.decimals}
          pipMultiplier={instrument.pipMultiplier}
          tickDirection={tickDirection}
          externalShowDrawingToolbar={showDrawingToolbar}
          onToggleExternalDrawingToolbar={handleToggleDrawingToolbar}
        />
      </div>

      {/* Sticky Dual Trading Bar: SELL | SPREAD | BUY with exact TradingView quotes & big pips */}
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Red Sell Button */}
          <button
            onClick={() => handleOpenTrade('SELL')}
            disabled={!marketStatus.isOpen}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-colors shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-[#C5192D]/85 border border-red-900/60 opacity-85 cursor-not-allowed'
                : 'bg-[#E51937] hover:bg-[#c9142f] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-95 mb-0.5 flex items-center gap-1">
              {!marketStatus.isOpen ? '🔒 Closed' : 'Sell'}
            </span>
            <div className="flex items-baseline justify-center leading-none whitespace-nowrap overflow-hidden max-w-full">
              {bidParts.isForex ? (
                <>
                  <span className="text-xs sm:text-sm font-medium">{bidParts.base}</span>
                  <span className="text-lg sm:text-xl font-black">{bidParts.bigPips}</span>
                  <span className="text-[10px] sm:text-xs font-medium align-super">{bidParts.fractional}</span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight">
                  {bidParts.fullFormatted}
                </span>
              )}
            </div>
          </button>

          {/* Center Spread Badge */}
          <div
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-center border shadow-xs min-w-[54px] ${
              isDarkMode
                ? 'bg-neutral-800/90 border-neutral-700 text-neutral-300'
                : 'bg-white border-neutral-300 text-neutral-700'
            }`}
          >
            <span className="text-[9px] block text-neutral-400 font-normal">
              Spread
            </span>
            <span className="font-mono text-emerald-500 font-extrabold">{spreadDisplay}</span>
          </div>

          {/* Green Buy Button */}
          <button
            onClick={() => handleOpenTrade('BUY')}
            disabled={!marketStatus.isOpen}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-colors shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-[#007A4A]/85 border border-emerald-900/60 opacity-85 cursor-not-allowed'
                : 'bg-[#22C55E] hover:bg-[#16A34A] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-95 mb-0.5 flex items-center gap-1">
              {!marketStatus.isOpen ? '🔒 Closed' : 'Buy'}
            </span>
            <div className="flex items-baseline justify-center leading-none whitespace-nowrap overflow-hidden max-w-full">
              {askParts.isForex ? (
                <>
                  <span className="text-xs sm:text-sm font-medium">{askParts.base}</span>
                  <span className="text-lg sm:text-xl font-black">{askParts.bigPips}</span>
                  <span className="text-[10px] sm:text-xs font-medium align-super">{askParts.fractional}</span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight">
                  {askParts.fullFormatted}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Market Info Tab & Specs */}
      <div className="px-4 pt-1">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
          <button className="text-sm font-bold pb-2 relative text-neutral-900 dark:text-white">
            <span>Market Info &amp; Specifications</span>
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
          </button>
        </div>

        {/* Specs Table */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-[13px]">
          {specs.map((item) => (
            <div key={item.label} className="py-2.5 flex items-center justify-between">
              <span className="text-neutral-500">{item.label}:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <PriceAlertModal
        isOpen={showPriceAlertModal}
        onClose={() => setShowPriceAlertModal(false)}
        instrument={instrument}
        onSetAlert={() => {}}
        isDarkMode={isDarkMode}
      />

      {quickOrderSide && (
        <QuickOrderSheet
          isOpen={true}
          onClose={() => setQuickOrderSide(null)}
          instrument={instrument}
          side={quickOrderSide}
          onExecute={onExecuteTrade}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
