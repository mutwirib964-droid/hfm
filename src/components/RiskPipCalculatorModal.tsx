import React, { useState } from 'react';
import {
  X,
  Calculator,
  Sliders,
  TrendingUp,
  DollarSign,
  Info,
  CheckCircle2,
  Percent,
} from 'lucide-react';

interface RiskPipCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  defaultBalance?: number;
}

interface PairConfig {
  symbol: string;
  category: 'Forex' | 'Metals' | 'Crypto' | 'Indices';
  pipSize: number;
  contractSize: number;
  defaultPrice: number;
  digits: number;
}

const ASSET_PAIRS: PairConfig[] = [
  { symbol: 'EURUSD', category: 'Forex', pipSize: 0.0001, contractSize: 100000, defaultPrice: 1.08720, digits: 5 },
  { symbol: 'GBPUSD', category: 'Forex', pipSize: 0.0001, contractSize: 100000, defaultPrice: 1.29450, digits: 5 },
  { symbol: 'USDJPY', category: 'Forex', pipSize: 0.01, contractSize: 100000, defaultPrice: 152.400, digits: 3 },
  { symbol: 'XAUUSD', category: 'Metals', pipSize: 0.10, contractSize: 100, defaultPrice: 4280.50, digits: 2 },
  { symbol: 'BTCUSD', category: 'Crypto', pipSize: 1.0, contractSize: 1, defaultPrice: 67800.00, digits: 2 },
  { symbol: 'US30', category: 'Indices', pipSize: 1.0, contractSize: 10, defaultPrice: 43250.00, digits: 1 },
  { symbol: 'NAS100', category: 'Indices', pipSize: 1.0, contractSize: 20, defaultPrice: 20420.00, digits: 1 },
];

export const RiskPipCalculatorModal: React.FC<RiskPipCalculatorModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  defaultBalance = 10000,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [accountBalance, setAccountBalance] = useState<number>(defaultBalance);
  const [riskMode, setRiskMode] = useState<'percent' | 'cash'>('percent');
  const [riskPercent, setRiskPercent] = useState<number>(2.0);
  const [riskCash, setRiskCash] = useState<number>(200);
  const [stopLossPips, setStopLossPips] = useState<number>(25);
  const [leverage, setLeverage] = useState<number>(500);

  if (!isOpen) return null;

  const currentPair = ASSET_PAIRS.find((p) => p.symbol === selectedSymbol) || ASSET_PAIRS[0];

  // Calculated Risk Amount
  const riskAmountUSD = riskMode === 'percent'
    ? (accountBalance * (riskPercent / 100))
    : riskCash;

  // Pip value for 1.0 standard lot
  let pipValuePerStandardLot = 10; // default for EURUSD/GBPUSD
  if (currentPair.symbol === 'USDJPY') {
    pipValuePerStandardLot = (currentPair.pipSize / currentPair.defaultPrice) * currentPair.contractSize;
  } else if (currentPair.symbol === 'XAUUSD') {
    pipValuePerStandardLot = currentPair.pipSize * currentPair.contractSize; // 0.10 * 100 = $10 per 0.10 move
  } else if (currentPair.symbol === 'BTCUSD') {
    pipValuePerStandardLot = currentPair.pipSize * currentPair.contractSize; // $1 per pip on 1 BTC
  } else if (currentPair.symbol === 'US30') {
    pipValuePerStandardLot = currentPair.pipSize * currentPair.contractSize; // $10 per point
  } else if (currentPair.symbol === 'NAS100') {
    pipValuePerStandardLot = currentPair.pipSize * currentPair.contractSize; // $20 per point
  }

  // Recommended Position Size
  // Loss = Lots * StopLossPips * PipValuePerLot
  // Lots = RiskAmount / (StopLossPips * PipValuePerLot)
  const lossPerLot = stopLossPips * pipValuePerStandardLot;
  const calculatedLots = lossPerLot > 0 ? riskAmountUSD / lossPerLot : 0;
  const roundedLots = Math.max(0.01, Math.round(calculatedLots * 100) / 100);

  // Margin Required
  const notionalValue = roundedLots * currentPair.contractSize * currentPair.defaultPrice;
  const requiredMargin = notionalValue / leverage;

  // Actual Pip Value for the recommended position
  const activePipValue = roundedLots * pipValuePerStandardLot;

  // Risk to Reward Calculations
  const reward1to1 = riskAmountUSD;
  const reward1to2 = riskAmountUSD * 2;
  const reward1to3 = riskAmountUSD * 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-[#15181E] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Risk &amp; Pip Size Calculator
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                Institutional Position Sizing &amp; Margin Requirement Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Pair & Balance Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                Instrument / Currency Pair
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASSET_PAIRS.slice(0, 4).map((p) => (
                  <button
                    key={p.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(p.symbol)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedSymbol === p.symbol
                        ? 'bg-[#E51937] text-white shadow-sm'
                        : isDarkMode
                        ? 'bg-neutral-900 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {p.symbol}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {ASSET_PAIRS.slice(4).map((p) => (
                  <button
                    key={p.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(p.symbol)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedSymbol === p.symbol
                        ? 'bg-[#E51937] text-white shadow-sm'
                        : isDarkMode
                        ? 'bg-neutral-900 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {p.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                Account Equity (USD)
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-2.5 font-mono text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>$</span>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(1, parseFloat(e.target.value) || 0))}
                  className={`w-full border rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1000, 5000, 10000, 50000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setAccountBalance(b)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold'
                    }`}
                  >
                    ${b >= 1000 ? `${b / 1000}k` : b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Model & Stop Loss Input */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Risk Mode */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>Risk Profile</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRiskMode('percent')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      riskMode === 'percent'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : isDarkMode ? 'text-neutral-500' : 'text-slate-500'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiskMode('cash')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      riskMode === 'cash'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : isDarkMode ? 'text-neutral-500' : 'text-slate-500'
                    }`}
                  >
                    $
                  </button>
                </div>
              </div>

              {riskMode === 'percent' ? (
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="10"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <span className={`absolute right-3 top-2.5 font-mono text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>%</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1, 1.5, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRiskPercent(r)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                          riskPercent === r
                            ? 'bg-amber-500 text-black font-bold'
                            : isDarkMode
                            ? 'bg-neutral-800 text-neutral-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 font-mono text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>$</span>
                  <input
                    type="number"
                    value={riskCash}
                    onChange={(e) => setRiskCash(parseFloat(e.target.value) || 0)}
                    className={`w-full border rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Stop Loss in Pips */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                Stop Loss (Pips / Points)
              </label>
              <input
                type="number"
                min="1"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(Math.max(1, parseFloat(e.target.value) || 1))}
                className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                {[15, 20, 30, 50].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStopLossPips(p)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {p}p
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage Setting */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                Account Leverage
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value={100}>1:100</option>
                <option value={200}>1:200</option>
                <option value={500}>1:500 (Standard)</option>
                <option value={1000}>1:1000</option>
                <option value={2000}>1:2000 (Max VTM)</option>
              </select>
            </div>
          </div>

          {/* Real-Time Calculation Results Banner */}
          <div className={`rounded-2xl border p-4 shadow-xl ${
            isDarkMode
              ? 'bg-gradient-to-br from-neutral-900 to-[#191D26] border-neutral-800 text-white'
              : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white shadow-md'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 block mb-3">
              Institutional Mathematical Output
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {/* Position Size */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-700/50">
                <span className="text-[10px] text-neutral-300 block">Recommended Lots</span>
                <span className="text-xl font-black font-mono text-[#ff4d67]">
                  {roundedLots.toFixed(2)}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">
                  Standard Lots ({roundedLots * 100000 >= 1000 ? `${(roundedLots * 100).toFixed(0)}k units` : 'Units'})
                </span>
              </div>

              {/* Pip Value */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-700/50">
                <span className="text-[10px] text-neutral-300 block">Pip Value ($)</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  ${activePipValue.toFixed(2)}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">per pip movement</span>
              </div>

              {/* Total Risk */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-700/50">
                <span className="text-[10px] text-neutral-300 block">Capital at Risk</span>
                <span className="text-xl font-black font-mono text-rose-400">
                  ${riskAmountUSD.toFixed(2)}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">
                  {((riskAmountUSD / accountBalance) * 100).toFixed(1)}% of balance
                </span>
              </div>

              {/* Required Margin */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-700/50">
                <span className="text-[10px] text-neutral-300 block">Required Margin</span>
                <span className="text-xl font-black font-mono text-sky-400">
                  ${requiredMargin.toFixed(2)}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">at 1:{leverage}</span>
              </div>
            </div>

            {/* Risk to Reward Matrix */}
            <div className="mt-4 pt-3 border-t border-neutral-700/60">
              <span className="text-[10px] text-neutral-300 font-bold block mb-2">
                Risk-To-Reward Target Projections
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-700/50">
                  <span className="text-[10px] text-neutral-300 block">1:1 Target ({stopLossPips}p)</span>
                  <span className="font-mono font-bold text-emerald-400">+${reward1to1.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-700/50">
                  <span className="text-[10px] text-neutral-300 block">1:2 Target ({stopLossPips * 2}p)</span>
                  <span className="font-mono font-bold text-emerald-400">+${reward1to2.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-700/50">
                  <span className="text-[10px] text-neutral-300 block">1:3 Target ({stopLossPips * 3}p)</span>
                  <span className="font-mono font-bold text-emerald-400">+${reward1to3.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${
          isDarkMode ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className={`text-[11px] flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span>Real-time local algorithmic calculations — No external dependencies</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
