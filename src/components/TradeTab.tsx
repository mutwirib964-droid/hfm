import React, { useState } from 'react';
import {
  Instrument,
  Timeframe,
  ChartType,
  Candle,
  Position,
  PendingOrder,
  ClosedTrade,
  TradingAccount,
} from '../types';
import { TradingChart } from './TradingChart';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  X,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  Activity,
  Layers,
  Lock,
} from 'lucide-react';
import { checkInstrumentMarketHours } from '../utils/marketHours';

interface TradeTabProps {
  instruments: Instrument[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  account: TradingAccount | null;
  positions: Position[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  onExecuteMarketOrder: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
  onPlacePendingOrder: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
    targetPrice: number;
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
  onClosePosition: (id: string) => void;
  onCloseAllPositions: () => void;
  onCancelPendingOrder: (id: string) => void;
  isDarkMode?: boolean;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
  isMobileFrame?: boolean;
}

export const TradeTab: React.FC<TradeTabProps> = ({
  instruments,
  selectedSymbol,
  onSelectSymbol,
  candles,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  account,
  positions,
  pendingOrders,
  closedTrades,
  onExecuteMarketOrder,
  onPlacePendingOrder,
  onClosePosition,
  onCloseAllPositions,
  onCancelPendingOrder,
  isDarkMode = true,
  tickDirection = 'NEUTRAL',
  isMobileFrame = false,
}) => {
  const currentInstrument =
    instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

  const [orderType, setOrderType] = useState<
    'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP'
  >('MARKET');
  const [lots, setLots] = useState<number>(0.1);
  const [targetPrice, setTargetPrice] = useState<string>(
    currentInstrument.bid.toString()
  );

  const [useSL, setUseSL] = useState(false);
  const [slPrice, setSlPrice] = useState<string>('');
  const [useTP, setUseTP] = useState(false);
  const [tpPrice, setTpPrice] = useState<string>('');

  const [activeBottomSection, setActiveBottomSection] = useState<
    'positions' | 'orders' | 'history'
  >('positions');
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Calculate Pip value and required margin
  const leverageNum = parseInt(account?.leverage ? account.leverage.split(':')[1] || '500' : '500', 10);
  const contractSize = currentInstrument.category === 'Forex' ? 100000 : 100;
  const notionalValue = lots * contractSize * currentInstrument.ask;
  const requiredMargin = notionalValue / leverageNum;
  const pipValue = (contractSize * lots) / currentInstrument.pipMultiplier;

  // Preset lot buttons
  const lotPresets = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];

  const handleLotsChange = (delta: number) => {
    setLots((prev) => Math.max(0.01, Number((prev + delta).toFixed(2))));
  };

  const handleExecute = (side: 'BUY' | 'SELL') => {
    const marketStatus = checkInstrumentMarketHours(
      currentInstrument.symbol,
      currentInstrument.category
    );

    if (orderType === 'MARKET') {
      if (!marketStatus.isOpen) {
        setFeedbackMsg(
          `Market Closed for ${currentInstrument.symbol}: ${marketStatus.reason}. Continuous trading active on 24/7 Crypto.`
        );
        setTimeout(() => setFeedbackMsg(null), 4500);
        return;
      }

      const sl = useSL && slPrice ? parseFloat(slPrice) : null;
      const tp = useTP && tpPrice ? parseFloat(tpPrice) : null;
      onExecuteMarketOrder({
        symbol: currentInstrument.symbol,
        side,
        lots,
        sl,
        tp,
      });
      setFeedbackMsg(`Executed ${side} ${lots} lots on ${currentInstrument.symbol}`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      if (!marketStatus.isOpen) {
        setFeedbackMsg(
          `Market Closed for ${currentInstrument.symbol}: Cannot place pending order while market is closed (${marketStatus.reason}).`
        );
        setTimeout(() => setFeedbackMsg(null), 4500);
        return;
      }

      const target = parseFloat(targetPrice);
      if (isNaN(target) || target <= 0) return;
      const sl = useSL && slPrice ? parseFloat(slPrice) : null;
      const tp = useTP && tpPrice ? parseFloat(tpPrice) : null;
      onPlacePendingOrder({
        symbol: currentInstrument.symbol,
        side: orderType.startsWith('BUY') ? 'BUY' : 'SELL',
        type: orderType,
        targetPrice: target,
        lots,
        sl,
        tp,
      });
      setFeedbackMsg(`Pending ${orderType} order placed!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // Open positions total floating PnL
  const totalFloatingPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
  const curMarketStatus = checkInstrumentMarketHours(
    currentInstrument.symbol,
    currentInstrument.category
  );

  // Dynamic Highlight Styling for Buy / Sell boxes based on tick direction and user action
  const isPriceUp = tickDirection === 'UP';
  const isPriceDown = tickDirection === 'DOWN';

  return (
    <div
      id="vtm-trade-tab"
      className={`flex flex-col w-full pb-20 space-y-3 px-2 sm:px-4 pt-2 transition-colors duration-200 ${
        isDarkMode ? 'text-neutral-100' : 'text-slate-900'
      }`}
    >
      {/* Instrument Header / Dropdown Selector */}
      <div
        className={`flex flex-wrap items-center justify-between border rounded-xl p-3 shadow-md gap-3 transition-colors ${
          isDarkMode
            ? 'bg-[#161920] border-neutral-800/80'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Symbol Dropdown & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              id="trade-symbol-selector"
              onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-left ${
                isDarkMode
                  ? 'bg-[#20242E] hover:bg-[#282E3A] border-neutral-700/70 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide">
                  {currentInstrument.symbol}
                </span>
                {/* On mobile: subtle raw crowded wording */}
                <span
                  className={`text-[10px] ${
                    isMobileFrame
                      ? 'text-neutral-500 font-mono -mt-0.5 tracking-tight'
                      : 'text-neutral-400'
                  }`}
                >
                  {currentInstrument.name}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  showSymbolDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showSymbolDropdown && (
              <div
                className={`absolute left-0 top-full mt-2 w-64 border rounded-xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto ${
                  isDarkMode ? 'bg-[#1E222A] border-neutral-700' : 'bg-white border-slate-300'
                }`}
              >
                {instruments.map((inst) => (
                  <div
                    key={inst.symbol}
                    onClick={() => {
                      onSelectSymbol(inst.symbol);
                      setShowSymbolDropdown(false);
                      setTargetPrice(inst.bid.toString());
                    }}
                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${
                      inst.symbol === currentInstrument.symbol
                        ? isDarkMode
                          ? 'bg-neutral-800/90 text-[#E51937] font-bold'
                          : 'bg-red-50 text-[#E51937] font-bold'
                        : isDarkMode
                        ? 'text-neutral-300 hover:bg-neutral-800'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{inst.symbol}</span>
                      <span className="text-[10px] text-neutral-400">{inst.name}</span>
                    </div>
                    <span className="font-mono text-[11px]">
                      {inst.ask.toFixed(inst.decimals)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!curMarketStatus.isOpen && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1 shadow-2xs"
              title={`Closed: ${curMarketStatus.reason}. Continuous trading on 24/7 Crypto.`}
            >
              <Clock className="w-3 h-3" />
              <span>Closed ({curMarketStatus.nextSession})</span>
            </span>
          )}
        </div>

        {/* Live Quotes & 24h Metrics */}
        <div
          className={`flex items-center gap-3 sm:gap-4 text-xs font-mono ${
            isMobileFrame ? 'gap-2 tracking-tighter' : ''
          }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase">Spread</span>
            <span
              className={`font-bold transition-all px-1 rounded ${
                isDarkMode ? 'text-neutral-200' : 'text-slate-700'
              }`}
            >
              {currentInstrument.spread.toFixed(1)} pips
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase">24h High</span>
            <span className="font-bold text-emerald-500">
              {currentInstrument.high24h.toFixed(currentInstrument.decimals)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase">24h Low</span>
            <span className="font-bold text-rose-500">
              {currentInstrument.low24h.toFixed(currentInstrument.decimals)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase">24h Chg</span>
            <span
              className={`font-bold ${
                currentInstrument.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {currentInstrument.change24h >= 0 ? '+' : ''}
              {currentInstrument.change24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackMsg && (
        <div className="bg-[#1C2822] border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Trading Area: 2-column responsive layout on desktop (Chart + Order Pad) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] gap-3.5 items-start">
        {/* Left: Real-time Interactive Candlestick Chart */}
        <div className="w-full">
          <TradingChart
            candles={candles}
            symbol={currentInstrument.symbol}
            decimals={currentInstrument.decimals}
            currentBid={currentInstrument.bid}
            currentAsk={currentInstrument.ask}
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
            positions={positions}
            chartType={chartType}
            onChartTypeChange={onChartTypeChange}
            isDarkMode={isDarkMode}
            tickDirection={tickDirection}
          />
        </div>

        {/* Right: HFM Signature Order Execution Pad */}
        <div
          className={`border rounded-xl p-3.5 shadow-xl space-y-3.5 transition-colors ${
            isDarkMode
              ? 'bg-[#161920] border-neutral-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
        {/* Order Type Tabs */}
        <div
          className={`flex items-center justify-between border-b pb-2.5 ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide">
              Order Execution
            </span>
            {/* Live tick badge */}
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isPriceUp
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isPriceDown
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'text-neutral-400'
              }`}
            >
              {isPriceUp ? '▲ Price Rising' : isPriceDown ? '▼ Price Dropping' : '• Steady'}
            </span>
          </div>

          <div
            className={`flex rounded-lg p-0.5 border text-xs ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setOrderType('MARKET')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                orderType === 'MARKET'
                  ? 'bg-[#E51937] text-white'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('BUY_LIMIT')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                orderType !== 'MARKET'
                  ? isDarkMode
                    ? 'bg-neutral-700 text-white'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* If Pending Order: Select Specific Type & Target Price */}
        {orderType !== 'MARKET' && (
          <div
            className={`grid grid-cols-2 gap-2 p-2.5 rounded-lg border ${
              isDarkMode
                ? 'bg-neutral-900/60 border-neutral-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                  isDarkMode
                    ? 'bg-[#181B22] border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="BUY_LIMIT">Buy Limit</option>
                <option value="SELL_LIMIT">Sell Limit</option>
                <option value="BUY_STOP">Buy Stop</option>
                <option value="SELL_STOP">Sell Stop</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                  isDarkMode
                    ? 'bg-[#181B22] border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        )}

        {/* Volume (Lots) Stepper & Presets */}
        <div className="space-y-1.5">
          <div
            className={`flex items-center justify-between text-xs ${
              isMobileFrame ? 'flex-wrap gap-1 leading-tight' : ''
            }`}
          >
            <span className="text-neutral-400 font-medium">Volume (Lots):</span>
            {/* Raw packed wording for phone density when requested */}
            <div
              className={`font-mono text-[11px] ${
                isMobileFrame ? 'flex items-center -space-x-1 tracking-tighter' : ''
              }`}
            >
              <span className="text-neutral-400">
                Req.Margin:<strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>${requiredMargin.toFixed(2)}</strong>
              </span>
              <span
                className={`text-neutral-400 ${
                  isMobileFrame ? '-ml-0.5' : 'mx-1'
                }`}
              >
                |PipVal:<strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>${pipValue.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleLotsChange(-0.1)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              -0.10
            </button>
            <button
              onClick={() => handleLotsChange(-0.01)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              -0.01
            </button>

            <div className="flex-1 relative">
              <input
                id="trade-lots-input"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={lots}
                onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className={`w-full py-1.5 border rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:border-[#E51937] ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button
              onClick={() => handleLotsChange(0.01)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              +0.01
            </button>
            <button
              onClick={() => handleLotsChange(0.1)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              +0.10
            </button>
          </div>

          {/* Quick preset lot pills */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {lotPresets.map((val) => (
              <button
                key={val}
                onClick={() => setLots(val)}
                className={`flex-1 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  lots === val
                    ? 'bg-[#E51937]/30 border border-[#E51937] text-[#E51937] font-bold'
                    : isDarkMode
                    ? 'bg-neutral-900 text-neutral-400 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {val.toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Management: SL & TP Toggles */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Stop Loss */}
          <div
            className={`p-2.5 rounded-lg border space-y-1.5 ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSL}
                  onChange={(e) => setUseSL(e.target.checked)}
                  className="accent-[#FF334B]"
                />
                Stop Loss (SL)
              </label>
            </div>
            {useSL && (
              <input
                type="number"
                step="any"
                placeholder={`e.g. ${(currentInstrument.bid * 0.995).toFixed(currentInstrument.decimals)}`}
                value={slPrice}
                onChange={(e) => setSlPrice(e.target.value)}
                className={`w-full border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-rose-500 ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            )}
          </div>

          {/* Take Profit */}
          <div
            className={`p-2.5 rounded-lg border space-y-1.5 ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTP}
                  onChange={(e) => setUseTP(e.target.checked)}
                  className="accent-[#00C076]"
                />
                Take Profit (TP)
              </label>
            </div>
            {useTP && (
              <input
                type="number"
                step="any"
                placeholder={`e.g. ${(currentInstrument.ask * 1.008).toFixed(currentInstrument.decimals)}`}
                value={tpPrice}
                onChange={(e) => setTpPrice(e.target.value)}
                className={`w-full border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500 ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            )}
          </div>
        </div>

        {/* Market Closed Warning Alert */}
        {!curMarketStatus.isOpen && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-400">Market is Closed ({currentInstrument.symbol})</span>
                <span className="text-neutral-400 block sm:inline sm:ml-1.5">• {curMarketStatus.reason}</span>
                {curMarketStatus.nextOpenTime && (
                  <span className="text-neutral-300 block text-[11px] mt-0.5">Reopens: {curMarketStatus.nextOpenTime}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectSymbol('BTCUSD')}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/40 transition-colors whitespace-nowrap cursor-pointer"
            >
              Trade 24/7 Crypto (BTCUSD) →
            </button>
          </div>
        )}

        {/* Big Dual Execution Buttons with Requested Green / Red Box Highlights */}
        {/* "if its buy to highlight green box and red to price goinng down" */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Sell Button - Highlights red box when price is dropping or sell active */}
          <button
            id="trade-btn-sell"
            onClick={() => handleExecute('SELL')}
            className={`py-3 px-3 active:scale-[0.98] rounded-xl text-white flex flex-col items-center justify-center transition-all border ${
              !curMarketStatus.isOpen
                ? 'bg-neutral-800 border-neutral-700 opacity-60 cursor-not-allowed shadow-none'
                : isPriceDown
                ? 'bg-gradient-to-b from-[#E51937] to-[#B30F24] border-red-400 ring-4 ring-rose-500/70 shadow-[0_0_25px_rgba(229,25,55,0.7)] animate-pulse cursor-pointer'
                : 'bg-gradient-to-b from-[#C5192D] to-[#990F20] hover:from-[#d61e34] hover:to-[#a91225] border-red-700/50 shadow-lg shadow-red-950/40 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-extrabold text-red-100">
              {!curMarketStatus.isOpen ? (
                <span className="flex items-center gap-1 text-neutral-300"><Lock className="w-3 h-3" /> Market Closed</span>
              ) : (
                <>
                  {isPriceDown && <TrendingDown className="w-3.5 h-3.5 text-white" />}
                  <span>{orderType === 'MARKET' ? 'SELL by Market' : `SELL (${orderType})`}</span>
                </>
              )}
            </div>
            <span className="font-mono text-lg font-black tracking-tight text-white mt-0.5">
              {currentInstrument.bid.toFixed(currentInstrument.decimals)}
            </span>
            {curMarketStatus.isOpen && isPriceDown && (
              <span className="text-[9px] bg-red-950/80 px-1.5 py-0.2 rounded font-mono font-bold text-red-200 mt-0.5 border border-red-400/50">
                PRICE FALLING ▼
              </span>
            )}
          </button>

          {/* Buy Button - Highlights green box when price is rising or buy active */}
          <button
            id="trade-btn-buy"
            onClick={() => handleExecute('BUY')}
            className={`py-3 px-3 active:scale-[0.98] rounded-xl text-white flex flex-col items-center justify-center transition-all border ${
              !curMarketStatus.isOpen
                ? 'bg-neutral-800 border-neutral-700 opacity-60 cursor-not-allowed shadow-none'
                : isPriceUp
                ? 'bg-gradient-to-b from-[#00C076] to-[#009E60] border-emerald-300 ring-4 ring-emerald-500/70 shadow-[0_0_25px_rgba(0,192,118,0.7)] animate-pulse cursor-pointer'
                : 'bg-gradient-to-b from-[#009E60] to-[#007A4A] hover:from-[#00b56e] hover:to-[#008d55] border-emerald-600/50 shadow-lg shadow-emerald-950/40 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-extrabold text-emerald-100">
              {!curMarketStatus.isOpen ? (
                <span className="flex items-center gap-1 text-neutral-300"><Lock className="w-3 h-3" /> Market Closed</span>
              ) : (
                <>
                  {isPriceUp && <TrendingUp className="w-3.5 h-3.5 text-white" />}
                  <span>{orderType === 'MARKET' ? 'BUY by Market' : `BUY (${orderType})`}</span>
                </>
              )}
            </div>
            <span className="font-mono text-lg font-black tracking-tight text-white mt-0.5">
              {currentInstrument.ask.toFixed(currentInstrument.decimals)}
            </span>
            {curMarketStatus.isOpen && isPriceUp && (
              <span className="text-[9px] bg-emerald-950/80 px-1.5 py-0.2 rounded font-mono font-bold text-emerald-200 mt-0.5 border border-emerald-400/50">
                BUY HIGHLIGHT ▲
              </span>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* Orders and Positions Management Section */}
      <div
        className={`border rounded-xl overflow-hidden shadow-md transition-colors ${
          isDarkMode ? 'bg-[#161920] border-neutral-800/80' : 'bg-white border-slate-200'
        }`}
      >
        {/* Navigation Tabs Header */}
        <div
          className={`flex items-center justify-between border-b px-3 py-2 ${
            isDarkMode ? 'bg-[#1A1D24] border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBottomSection('positions')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeBottomSection === 'positions'
                  ? isDarkMode
                    ? 'bg-neutral-800 text-white'
                    : 'bg-slate-200 text-slate-900 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Positions</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  positions.length > 0
                    ? 'bg-[#00C076] text-black'
                    : isDarkMode
                    ? 'bg-neutral-700 text-neutral-300'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {positions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveBottomSection('orders')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeBottomSection === 'orders'
                  ? isDarkMode
                    ? 'bg-neutral-800 text-white'
                    : 'bg-slate-200 text-slate-900 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Orders</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {pendingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveBottomSection('history')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeBottomSection === 'history'
                  ? isDarkMode
                    ? 'bg-neutral-800 text-white'
                    : 'bg-slate-200 text-slate-900 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>History</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {closedTrades.length}
              </span>
            </button>
          </div>

          {activeBottomSection === 'positions' && positions.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Total P&L:</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    totalFloatingPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
                </span>
              </div>
              <button
                onClick={onCloseAllPositions}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  isDarkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Close All
              </button>
            </div>
          )}
        </div>

        {/* Content list for active bottom section */}
        <div className="p-2 sm:p-3">
          {/* 1. Open Positions */}
          {activeBottomSection === 'positions' && (
            <div className="space-y-2">
              {positions.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No active open positions. Place an order above to start trading.
                </div>
              ) : (
                positions.map((pos) => {
                  const isBuy = pos.side === 'BUY';
                  return (
                    <div
                      key={pos.id}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isDarkMode
                          ? 'bg-[#191D26] border-neutral-800'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Ticket details - with intentional crowded/overlapping text on mobile if requested */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-1.5 h-10 rounded-full ${
                            isBuy ? 'bg-[#00C076]' : 'bg-[#FF334B]'
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{pos.symbol}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isBuy
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {pos.side} {pos.lots}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                              #{pos.ticket}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5 text-slate-500 dark:text-neutral-400 flex-wrap">
                            <span>Open: {pos.openPrice}</span>
                            <span>→</span>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              Now: {pos.currentPrice}
                            </span>
                            {pos.sl && <span className="text-rose-500">SL: {pos.sl}</span>}
                            {pos.tp && <span className="text-emerald-600 dark:text-emerald-400">TP: {pos.tp}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Profit & Close Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-neutral-800">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">Floating Profit</span>
                          <span
                            className={`text-sm font-mono font-bold ${
                              pos.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-3 py-1.5 bg-[#E51937]/15 hover:bg-[#E51937] text-[#E51937] hover:text-white border border-[#E51937]/40 rounded-lg text-xs font-semibold transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Pending Orders */}
          {activeBottomSection === 'orders' && (
            <div className="space-y-2">
              {pendingOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No active pending orders.
                </div>
              ) : (
                pendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      isDarkMode
                        ? 'bg-[#191D26] border-neutral-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{ord.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                          {ord.type}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {ord.lots} lots @ {ord.targetPrice}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Ticket: #{ord.ticket}
                      </span>
                    </div>

                    <button
                      onClick={() => onCancelPendingOrder(ord.id)}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. Trade History */}
          {activeBottomSection === 'history' && (
            <div className="space-y-2">
              {closedTrades.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No trade history yet.
                </div>
              ) : (
                closedTrades.map((hist) => (
                  <div
                    key={hist.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                      isDarkMode
                        ? 'bg-[#191D26] border-neutral-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          hist.side === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-rose-500/20 text-rose-500'
                        }`}
                      >
                        {hist.side} {hist.lots}
                      </span>
                      <span className="font-bold">{hist.symbol}</span>
                      <span className="text-neutral-400 text-[11px]">
                        {hist.openPrice} → {hist.closePrice}
                      </span>
                    </div>

                    <span
                      className={`font-bold ${
                        hist.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {hist.pnl >= 0 ? '+' : ''}${hist.pnl.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
