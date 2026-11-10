import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Target,
  RefreshCw,
  Compass,
  Cpu,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { Instrument } from '../types';
import { AIMarketSignal, aiMarketService } from '../services/aiMarketService';

interface AIMarketSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument;
  isDarkMode?: boolean;
  onExecuteTrade?: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
}

export const AIMarketSignalModal: React.FC<AIMarketSignalModalProps> = ({
  isOpen,
  onClose,
  instrument,
  isDarkMode = false,
  onExecuteTrade,
}) => {
  const [signal, setSignal] = useState<AIMarketSignal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<string>('15M');
  const [lots, setLots] = useState<number>(0.1);
  const [tradeExecuted, setTradeExecuted] = useState<boolean>(false);
  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const result = await aiMarketService.analyzePair(
        {
          symbol: instrument.symbol,
          currentPrice: instrument.bid || instrument.ask,
          change24h: instrument.change24h,
          high24h: instrument.high24h,
          low24h: instrument.low24h,
          category: instrument.category,
          timeframe,
          style: timeframe === '15M' ? 'Scalp' : timeframe === '1H' ? 'Intraday' : 'Swing',
          decimals: instrument.decimals,
        },
        instrument
      );
      setSignal(result);
    } catch {
      // Fallback handled in service
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
      setTradeExecuted(false);
    }
  }, [isOpen, instrument.symbol, timeframe]);

  if (!isOpen) return null;

  const isBuy = signal?.action.includes('BUY') ?? true;
  const actionColor = signal?.action.includes('BUY')
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : signal?.action.includes('SELL')
    ? 'text-rose-500 bg-rose-500/10 border-rose-500/30'
    : 'text-amber-500 bg-amber-500/10 border-amber-500/30';

  const handleExecute = () => {
    if (!onExecuteTrade || !signal) return;
    const side = signal.action.includes('BUY') ? 'BUY' : 'SELL';
    onExecuteTrade({
      symbol: signal.symbol,
      side,
      lots,
      sl: signal.stopLoss,
      tp: signal.takeProfit1,
    });
    setTradeExecuted(true);
    setTimeout(() => {
      setTradeExecuted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#0E1116] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-neutral-800 bg-[#141820]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">{instrument.symbol} AI Signal</h3>
              </div>
              <p className="text-xs text-neutral-400">Institutional Market Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                isDarkMode ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
              } ${loading ? 'opacity-50' : ''}`}
              title="Refresh AI Analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Timeframe selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Trading Horizon:</span>
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
              {['15M', '1H', '4H', '1D'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                    timeframe === tf
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-sm font-bold">Scanning Order Books & Technical Setup...</p>
              <p className="text-xs text-neutral-400 mt-1">Analyzing institutional flows &amp; order-book sentiment</p>
            </div>
          ) : signal ? (
            <>
              {/* Verdict Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isBuy
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Recommended Action
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight">
                      {signal.action.replace('_', ' ')}
                    </span>
                    {isBuy ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Confidence
                  </span>
                  <span className="text-xl font-black font-mono text-purple-400">
                    {signal.confidence}%
                  </span>
                </div>
              </div>

              {/* Sentiment Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {signal.bullishSentimentPercent}% Bullish
                  </span>
                  <span className="text-rose-500 flex items-center gap-1">
                    {signal.bearishSentimentPercent}% Bearish <TrendingDown className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-rose-500/30 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${signal.bullishSentimentPercent}%` }}
                  />
                </div>
              </div>

              {/* Technical Strategy Rationale */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-neutral-300">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Market Summary</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{signal.summary}</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-800/60 pt-1.5">
                  <strong className="text-neutral-300">Technical Catalyst:</strong> {signal.catalyst}
                </p>
              </div>

              {/* Trade Plan Box */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-[#161B24] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1 text-purple-400">
                    <Target className="w-3.5 h-3.5" /> Actionable Setup Plan
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
                    R:R {signal.riskRewardRatio}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block font-medium">Entry Zone</span>
                    <span className="font-mono font-bold text-[11px] truncate block text-neutral-200">
                      {signal.entryZone}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <span className="text-[10px] text-rose-400 block font-medium">Stop Loss (SL)</span>
                    <span className="font-mono font-bold text-[12px] text-rose-400">
                      {signal.stopLoss}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-400 block font-medium">Take Profit (TP)</span>
                    <span className="font-mono font-bold text-[12px] text-emerald-400">
                      {signal.takeProfit1}
                    </span>
                  </div>
                </div>

                {/* Key Support and Resistance */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-mono pt-1 text-neutral-400">
                  <div className="p-1 rounded bg-neutral-800/40">
                    <span className="block text-[9px] text-neutral-500">S1</span>
                    {signal.supportLevel1}
                  </div>
                  <div className="p-1 rounded bg-neutral-800/40">
                    <span className="block text-[9px] text-neutral-500">Pivot</span>
                    {signal.pivotPoint}
                  </div>
                  <div className="p-1 rounded bg-neutral-800/40">
                    <span className="block text-[9px] text-neutral-500">R1</span>
                    {signal.resistanceLevel1}
                  </div>
                  <div className="p-1 rounded bg-neutral-800/40">
                    <span className="block text-[9px] text-neutral-500">R2</span>
                    {signal.resistanceLevel2}
                  </div>
                </div>
              </div>

              {/* Lots control & Trade Execution button */}
              {onExecuteTrade && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Execution Volume:</span>
                    <div className="flex items-center gap-1.5">
                      {[0.05, 0.1, 0.5, 1.0].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLots(l)}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                            lots === l
                              ? 'bg-purple-600 text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExecute}
                    disabled={tradeExecuted}
                    className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      tradeExecuted
                        ? 'bg-emerald-600 text-white'
                        : isBuy
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    }`}
                  >
                    {tradeExecuted ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 animate-scale" />
                        <span>Trade Placed with AI SL &amp; TP!</span>
                      </>
                    ) : (
                      <>
                        <span>Execute {isBuy ? 'BUY' : 'SELL'} {lots} Lots Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
