import React, { useState } from 'react';
import {
  X,
  Award,
  DollarSign,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface TradersRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentLotsTraded?: number;
}

export const TradersRewardsModal: React.FC<TradersRewardsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  currentLotsTraded = 42.8,
}) => {
  const [sliderLots, setSliderLots] = useState<number>(100);

  if (!isOpen) return null;

  const milestone1Lots = 100;
  const progressPercent = Math.min(100, Math.round((currentLotsTraded / milestone1Lots) * 100));
  const lotsRemaining = Math.max(0, Math.round((milestone1Lots - currentLotsTraded) * 10) / 10);

  // Estimator logic
  const getRebatePerLot = (lots: number) => {
    if (lots < 100) return 0;
    if (lots < 500) return 2.50;
    if (lots < 2000) return 4.00;
    return 6.00;
  };

  const currentRebateRate = getRebatePerLot(sliderLots);
  const estimatedCashback = sliderLots >= 100 ? sliderLots * currentRebateRate : 0;
  const weeklyEstimated = estimatedCashback / 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode
            ? 'bg-[#0E1117] border-neutral-800 text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header - Sleek Institutional Branding */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode
              ? 'border-neutral-800 bg-gradient-to-r from-[#141822] via-[#10131A] to-[#141822]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-emerald-500/15 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base sm:text-lg font-black tracking-tight font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Trader Rewards &amp; Cashbacks
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                  Rebates From 100 Lots
                </span>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                VTM Institutional Direct Volume Rebates &amp; Loyalty Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer border border-transparent ${
              isDarkMode
                ? 'hover:bg-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Key Program Qualification Banner */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              isDarkMode
                ? 'bg-gradient-to-r from-neutral-900 via-[#131720] to-neutral-900 border-neutral-800/90'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Volume Rebate Qualification Criteria</span>
            </div>
            <p className={`leading-relaxed font-sans text-xs ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              Trading rewards activate automatically when cumulative closed volume reaches{' '}
              <strong className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>100.0 Traded Lots</strong>. All standard and raw spread
              trades across Forex, Gold, Silver, Energy, and Global Indices accumulate toward this turnover without expiration.
            </p>
            <div className={`flex items-center gap-2 pt-1 text-[11px] font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Direct weekly cash credited to live balance • 0% wagering, instantly withdrawable.</span>
            </div>
          </div>

          {/* Volume Milestone Status Card */}
          <div
            className={`p-4 rounded-2xl border space-y-3 shadow-inner ${
              isDarkMode
                ? 'bg-gradient-to-b from-[#141720] to-[#0F1218] border-neutral-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Your Volume Milestone Status
              </span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                {currentLotsTraded} / {milestone1Lots}.0 Lots ({progressPercent}%)
              </span>
            </div>

            {/* Glowing Progress Track */}
            <div
              className={`relative w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-200 border-slate-300'
              }`}
            >
              <div
                className="bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
              <div className={`flex items-center gap-1.5 text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Accumulated: <strong className={isDarkMode ? 'text-neutral-200' : 'text-slate-900'}>{currentLotsTraded} lots</strong></span>
              </div>
              <div className="text-[11px] font-bold">
                {lotsRemaining > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    {lotsRemaining} lots remaining to unlock Silver Rebate
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cashback Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reward Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                Cashback Tiers &amp; Weekly Payout Rates
              </span>
              <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Tier unlocks automatically</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Silver Tier */}
              <div
                className={`p-3.5 rounded-xl border transition-colors space-y-2 relative ${
                  isDarkMode
                    ? 'border-neutral-800 bg-[#12151D] hover:border-neutral-700'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Silver Tier</span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-black border ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    100 – 499 Lots
                  </span>
                </div>
                <div className={`text-lg font-black font-mono flex items-baseline gap-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <span>$2.50</span>
                  <span className={`text-[11px] font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ lot rebate</span>
                </div>
                <ul className={`text-[11px] space-y-1 pt-1.5 border-t ${isDarkMode ? 'text-neutral-400 border-neutral-800/80' : 'text-slate-600 border-slate-200'}`}>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Weekly auto-credit to MT4/MT5</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Zero rollover constraints</span>
                  </li>
                </ul>
              </div>

              {/* Gold Tier */}
              <div
                className={`p-3.5 rounded-xl border border-amber-500/40 space-y-2 relative shadow-xs ${
                  isDarkMode
                    ? 'bg-gradient-to-b from-amber-500/10 via-[#12151D] to-[#12151D]'
                    : 'bg-amber-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Gold Tier</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    500 – 1,999 Lots
                  </span>
                </div>
                <div className={`text-lg font-black font-mono flex items-baseline gap-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <span>$4.00</span>
                  <span className={`text-[11px] font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ lot rebate</span>
                </div>
                <ul className={`text-[11px] space-y-1 pt-1.5 border-t ${isDarkMode ? 'text-neutral-400 border-neutral-800/80' : 'text-slate-600 border-slate-200'}`}>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Equinix LD4 Dedicated VPS</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Priority execution queue</span>
                  </li>
                </ul>
              </div>

              {/* Diamond VIP */}
              <div
                className={`p-3.5 rounded-xl border border-emerald-500/40 space-y-2 relative shadow-xs ${
                  isDarkMode
                    ? 'bg-gradient-to-b from-emerald-500/10 via-[#12151D] to-[#12151D]'
                    : 'bg-emerald-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Diamond VIP</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    2,000+ Lots
                  </span>
                </div>
                <div className={`text-lg font-black font-mono flex items-baseline gap-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <span>$6.00</span>
                  <span className={`text-[11px] font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ lot rebate</span>
                </div>
                <ul className={`text-[11px] space-y-1 pt-1.5 border-t ${isDarkMode ? 'text-neutral-400 border-neutral-800/80' : 'text-slate-600 border-slate-200'}`}>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Dedicated Senior Execution Officer</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Zero swap fees on major pairs</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Calculator: What will your cashback look like? */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Monthly Cashback Rebate</span>
              </span>
              <span
                className={`font-mono font-black text-sm px-2 py-0.5 rounded-md border ${
                  isDarkMode
                    ? 'text-white bg-neutral-800 border-neutral-700'
                    : 'text-slate-900 bg-white border-slate-300'
                }`}
              >
                {sliderLots} Lots Traded
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="2500"
              step="25"
              value={sliderLots}
              onChange={(e) => setSliderLots(parseInt(e.target.value, 10))}
              className={`w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg appearance-none ${
                isDarkMode ? 'bg-neutral-800' : 'bg-slate-300'
              }`}
            />

            <div className={`flex items-center justify-between text-[10px] font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              <span>50 lots (Pre-Tier)</span>
              <span>100 lots ($250 min)</span>
              <span>500 lots ($2,000)</span>
              <span>2,500 lots ($15,000)</span>
            </div>

            {/* Calculated Monthly & Weekly Result */}
            <div
              className={`mt-2 p-3.5 rounded-xl border flex items-center justify-between ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <span className={`text-[10px] block uppercase font-mono font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Estimated Cash Payout
                </span>
                <span className={`text-xs mt-0.5 block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {sliderLots < 100 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Requires 100 traded lots to begin weekly disbursements.
                    </span>
                  ) : (
                    <span>
                      Rate: <strong className="text-emerald-600 dark:text-emerald-400">${currentRebateRate.toFixed(2)} / lot</strong> • ~${weeklyEstimated.toFixed(2)} paid weekly
                    </span>
                  )}
                </span>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ${estimatedCashback.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] block font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Per 30-Day Cycle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between ${
            isDarkMode ? 'border-neutral-800 bg-[#11141A]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span className={`text-[11px] flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Automated settlement every Monday 00:00 GMT</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
