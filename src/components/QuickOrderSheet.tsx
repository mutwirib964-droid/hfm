import React, { useState } from 'react';
import { X, Minus, Plus, ShieldAlert, Check } from 'lucide-react';
import { Instrument } from '../types';
import { formatPipPrice } from '../utils/pipFormatter';

interface QuickOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument;
  side: 'BUY' | 'SELL';
  onExecute: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
  isDarkMode?: boolean;
}

export const QuickOrderSheet: React.FC<QuickOrderSheetProps> = ({
  isOpen,
  onClose,
  instrument,
  side: initialSide,
  onExecute,
  isDarkMode = false,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [lots, setLots] = useState<number>(0.1);
  const [hasSL, setHasSL] = useState<boolean>(false);
  const [hasTP, setHasTP] = useState<boolean>(false);
  const [slPrice, setSlPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');

  if (!isOpen) return null;

  const currentPrice = side === 'BUY' ? instrument.ask : instrument.bid;
  const priceParts = formatPipPrice(currentPrice, instrument.decimals);
  const contractSize = instrument.category === 'Forex' ? 100000 : 100;
  const pipValue = ((1 / instrument.pipMultiplier) * lots * contractSize).toFixed(2);

  const handleAdjustLots = (delta: number) => {
    setLots((prev) => Math.max(0.01, Number((prev + delta).toFixed(2))));
  };

  const handleSetExactLots = (val: number) => {
    setLots(val);
  };

  const handleSubmit = () => {
    onExecute({
      symbol: instrument.symbol,
      side,
      lots,
      sl: hasSL && slPrice ? parseFloat(slPrice) : null,
      tp: hasTP && tpPrice ? parseFloat(tpPrice) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={`relative w-full max-w-lg rounded-t-3xl p-5 z-50 shadow-2xl transition-all duration-300 ${
          isDarkMode ? 'bg-[#181A20] text-white' : 'bg-white text-neutral-900'
        }`}
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>{instrument.symbol}</span>
              <span className="text-xs font-normal text-neutral-400">
                {instrument.name}
              </span>
            </h3>
            <span className="text-xs text-neutral-400">
              Spread: {instrument.spread} pips • Pip Value: ~${pipValue}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side Selector (Sell / Buy tabs) */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <button
            onClick={() => setSide('SELL')}
            className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              side === 'SELL'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20 shadow-sm'
                : isDarkMode
                ? 'border-neutral-800 hover:bg-neutral-800/40 text-neutral-400'
                : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider mb-0.5">
              Sell
            </span>
            <div className="flex items-baseline">
              <span className="text-sm font-medium">
                {formatPipPrice(instrument.bid, instrument.decimals).base}
              </span>
              <span className="text-xl font-black text-red-600 dark:text-red-400">
                {formatPipPrice(instrument.bid, instrument.decimals).bigPips}
              </span>
              <span className="text-xs font-medium align-super">
                {formatPipPrice(instrument.bid, instrument.decimals).fractional}
              </span>
            </div>
          </button>

          <button
            onClick={() => setSide('BUY')}
            className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              side === 'BUY'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                : isDarkMode
                ? 'border-neutral-800 hover:bg-neutral-800/40 text-neutral-400'
                : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider mb-0.5">
              Buy
            </span>
            <div className="flex items-baseline">
              <span className="text-sm font-medium">
                {formatPipPrice(instrument.ask, instrument.decimals).base}
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatPipPrice(instrument.ask, instrument.decimals).bigPips}
              </span>
              <span className="text-xs font-medium align-super">
                {formatPipPrice(instrument.ask, instrument.decimals).fractional}
              </span>
            </div>
          </button>
        </div>

        {/* Volume / Lot Size Controller */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span className="font-semibold">Trade Volume (Lots)</span>
            <span>Est. Margin: ~${((lots * contractSize * instrument.bid) / 500).toFixed(2)}</span>
          </div>

          <div
            className={`flex items-center justify-between rounded-xl border p-1 ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <button
              onClick={() => handleAdjustLots(-0.1)}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold active:scale-95 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              step="0.01"
              min="0.01"
              value={lots}
              onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="text-center font-black text-lg bg-transparent focus:outline-none w-28"
            />

            <button
              onClick={() => handleAdjustLots(0.1)}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Lot Presets */}
          <div className="flex items-center gap-2 pt-1">
            {[0.01, 0.05, 0.1, 0.5, 1.0, 5.0].map((v) => (
              <button
                key={v}
                onClick={() => handleSetExactLots(v)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  lots === v
                    ? 'bg-[#E51937] text-white border-[#E51937]'
                    : isDarkMode
                    ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* SL and TP Options */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Stop Loss */}
          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500">Stop Loss</span>
              <input
                type="checkbox"
                checked={hasSL}
                onChange={(e) => setHasSL(e.target.checked)}
                className="accent-red-500 cursor-pointer"
              />
            </div>
            <input
              type="number"
              placeholder={hasSL ? (side === 'BUY' ? (instrument.bid * 0.995).toFixed(instrument.decimals) : (instrument.ask * 1.005).toFixed(instrument.decimals)) : 'Off'}
              disabled={!hasSL}
              value={slPrice}
              onChange={(e) => setSlPrice(e.target.value)}
              className="w-full text-xs font-semibold p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent disabled:opacity-40"
            />
          </div>

          {/* Take Profit */}
          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500">Take Profit</span>
              <input
                type="checkbox"
                checked={hasTP}
                onChange={(e) => setHasTP(e.target.checked)}
                className="accent-emerald-500 cursor-pointer"
              />
            </div>
            <input
              type="number"
              placeholder={hasTP ? (side === 'BUY' ? (instrument.bid * 1.01).toFixed(instrument.decimals) : (instrument.ask * 0.99).toFixed(instrument.decimals)) : 'Off'}
              disabled={!hasTP}
              value={tpPrice}
              onChange={(e) => setTpPrice(e.target.value)}
              className="w-full text-xs font-semibold p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent disabled:opacity-40"
            />
          </div>
        </div>

        {/* Final Execution Button */}
        <button
          onClick={handleSubmit}
          className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
            side === 'SELL' ? 'bg-[#E51937] hover:bg-[#c9142f]' : 'bg-[#22C55E] hover:bg-[#16A34A]'
          }`}
        >
          <span>
            {side === 'SELL' ? 'SELL' : 'BUY'} {lots} {instrument.symbol} @ {currentPrice.toFixed(instrument.decimals)}
          </span>
        </button>
      </div>
    </div>
  );
};
