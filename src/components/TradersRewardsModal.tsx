import React, { useState } from 'react';
import {
  X,
  Award,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Gift,
  ShieldCheck,
  ChevronRight,
  Sparkles,
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
  isDarkMode,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-[#15181E] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Trader Rewards & Cashbacks</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Starts at 100 Lots
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Institutional Volume Rebates & Loyalty Program
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Key Program Rule Explanation */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>How the 100-Lot Reward Qualification Works</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              To reward active and high-volume traders, our Cashbacks & Loyalty tier automatically
              activates once your cumulative trading volume reaches <strong>100 Traded Lots</strong>.
              All trades on Forex majors, Gold, Silver, Energy (Oil), and Global Indices contribute to your turnover.
            </p>
            <p className="text-neutral-400 text-[11px]">
              Once you cross 100 lots, you earn <strong>direct cash rebates starting from $2.50 per lot</strong>,
              deposited weekly straight into your live balance with <strong>zero wagering or rollover restrictions</strong>.
            </p>
          </div>

          {/* User's Live Lot Progress Card */}
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 uppercase tracking-wider text-[11px]">
                Your Volume Milestone Status
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {currentLotsTraded} / 100.0 Lots ({progressPercent}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-neutral-700/60">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Accumulated: <strong>{currentLotsTraded} lots</strong></span>
              </div>
              <div className="text-amber-400 font-semibold text-[11px]">
                {lotsRemaining > 0 ? (
                  <span>{lotsRemaining} lots remaining to unlock Silver Cashback</span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cashbacks Active!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tier Structure Cards */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2 px-1">
              Cashback Reward Tiers & Privileges
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Silver Tier (100 - 499 Lots) */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#161920] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Silver Tier</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-black bg-slate-500/20 text-slate-300">
                    100 - 499 Lots
                  </span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  $2.50 <span className="text-xs font-normal text-neutral-400">/ lot cashback</span>
                </div>
                <ul className="text-[11px] text-neutral-400 space-y-1 pt-1 border-t border-neutral-800">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Weekly auto-payout to balance</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Zero rollover constraints</span>
                  </li>
                </ul>
              </div>

              {/* Gold Tier (500 - 1,999 Lots) */}
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-[#161920] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">Gold Tier</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-black bg-amber-500/20 text-amber-300">
                    500 - 1,999 Lots
                  </span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  $4.00 <span className="text-xs font-normal text-neutral-400">/ lot cashback</span>
                </div>
                <ul className="text-[11px] text-neutral-400 space-y-1 pt-1 border-t border-neutral-800">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Free Ultra-Low Latency VPS</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Priority technical queue</span>
                  </li>
                </ul>
              </div>

              {/* Diamond Tier (2,000+ Lots) */}
              <div className="p-3.5 rounded-xl border border-sky-500/40 bg-gradient-to-b from-sky-500/10 to-[#161920] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400">Diamond Tier</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-black bg-sky-500/20 text-sky-300">
                    2,000+ Lots
                  </span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  $6.00 <span className="text-xs font-normal text-neutral-400">/ lot cashback</span>
                </div>
                <ul className="text-[11px] text-neutral-400 space-y-1 pt-1 border-t border-neutral-800">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>Dedicated Senior Account Exec</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>Zero swap fees on major pairs</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Calculator: What will your cashback look like? */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Simulate Monthly Cashback Rebate</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">
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
              className="w-full accent-purple-500"
            />

            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span>50 lots (Qualification)</span>
              <span>100 lots ($250 min)</span>
              <span>500 lots ($2,000)</span>
              <span>2,500 lots ($15,000)</span>
            </div>

            {/* Simulated Payout Result */}
            <div className="mt-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
                  Estimated Monthly Cash Credited
                </span>
                <span className="text-xs text-neutral-400">
                  {sliderLots < 100 ? (
                    <span className="text-amber-400">
                      Reach 100 lots to start receiving cash rebates
                    </span>
                  ) : (
                    <span>
                      Rate: ${currentRebateRate.toFixed(2)}/lot • Paid directly into MT4/MT5 balance
                    </span>
                  )}
                </span>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ${estimatedCashback.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rebates paid automatically every Monday at 00:00 GMT</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
