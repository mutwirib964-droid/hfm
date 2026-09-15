import React, { useState } from 'react';
import { StrategyProvider, FollowedStrategy, TradingAccount } from '../types';
import {
  Users,
  TrendingUp,
  Shield,
  Award,
  Search,
  CheckCircle2,
  ChevronRight,
  Flame,
  ArrowUpRight,
  HelpCircle,
  X,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react';

interface CopyTradingTabProps {
  providers: StrategyProvider[];
  followedStrategies: FollowedStrategy[];
  currentAccount: TradingAccount;
  onFollowStrategy: (params: {
    providerId: string;
    allocatedAmount: number;
    volumeAllocation: number;
    rescueLevel: number;
  }) => void;
  onUnfollowStrategy: (providerId: string) => void;
}

export const CopyTradingTab: React.FC<CopyTradingTabProps> = ({
  providers,
  followedStrategies,
  currentAccount,
  onFollowStrategy,
  onUnfollowStrategy,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'explore' | 'my-portfolio'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'top-gain' | 'low-drawdown' | 'most-followed'>('all');

  // Selected Provider for Modal
  const [modalProvider, setModalProvider] = useState<StrategyProvider | null>(null);
  const [allocateAmount, setAllocateAmount] = useState<number>(500);
  const [volumePercent, setVolumePercent] = useState<number>(100);
  const [rescueLevel, setRescueLevel] = useState<number>(30);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Filtering
  const filtered = providers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFilter === 'top-gain') return p.returnPercent > 300;
    if (selectedFilter === 'low-drawdown') return p.maxDrawdown < 10;
    if (selectedFilter === 'most-followed') return p.followers > 2500;
    return true;
  });

  const handleStartFollowing = () => {
    if (!modalProvider) return;
    onFollowStrategy({
      providerId: modalProvider.id,
      allocatedAmount: allocateAmount,
      volumeAllocation: volumePercent,
      rescueLevel: rescueLevel,
    });
    setModalProvider(null);
  };

  return (
    <div id="hfm-copytrading-tab" className="flex flex-col w-full pb-20 space-y-4 px-2 sm:px-4 pt-2">
      {/* HFcopy Header Banner */}
      <div className="bg-gradient-to-r from-[#181B22] via-[#202530] to-[#181B22] border border-neutral-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#E51937] text-white text-[10px] font-black uppercase tracking-wider">
                HFcopy
              </span>
              <h1 className="text-base font-bold text-white tracking-tight">
                HFM Copy Trading
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Automatically mirror top-performing strategies in real time. Maintain full control of your capital with custom rescue levels.
            </p>
          </div>

          {/* Quick HFcopy stats */}
          <div className="flex items-center gap-3 text-xs bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
            <div>
              <span className="text-[10px] text-neutral-500 block">Top Provider Return</span>
              <span className="font-bold text-emerald-400 font-mono">+520.8%</span>
            </div>
            <div className="h-6 w-px bg-neutral-800" />
            <div>
              <span className="text-[10px] text-neutral-500 block">Active Followers</span>
              <span className="font-bold text-white font-mono">13,200+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('explore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'explore'
                ? 'bg-[#E51937] text-white shadow-md'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Explore Strategies
          </button>
          <button
            onClick={() => setActiveSubTab('my-portfolio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'my-portfolio'
                ? 'bg-[#E51937] text-white shadow-md'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>My Followed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-900 text-neutral-200">
              {followedStrategies.length}
            </span>
          </button>
        </div>

        {activeSubTab === 'explore' && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                selectedFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('top-gain')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                selectedFilter === 'top-gain' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
              }`}
            >
              High Gain
            </button>
            <button
              onClick={() => setSelectedFilter('low-drawdown')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                selectedFilter === 'low-drawdown' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
              }`}
            >
              Low Risk
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab 1: Explore Strategies */}
      {activeSubTab === 'explore' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search strategy provider by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#161920] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#E51937]"
            />
          </div>

          {/* Strategy Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filtered.map((p) => {
              const isAlreadyFollowed = followedStrategies.some(
                (f) => f.providerId === p.id
              );

              return (
                <div
                  key={p.id}
                  className="bg-[#161920] border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 shadow-md space-y-3 transition-all flex flex-col justify-between"
                >
                  {/* Top: Avatar, Name, Flag, Return */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{p.name}</span>
                            <span>{p.flag}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400">
                            {p.experienceMonths} mos experience • {p.totalTrades} trades
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block">Total Gain</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">
                          +{p.returnPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2">
                      {p.strategyDescription}
                    </p>
                  </div>

                  {/* Mid: Performance Stats Bar */}
                  <div className="grid grid-cols-4 gap-2 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/80 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-neutral-500 block">Max DD</span>
                      <span className="font-bold text-rose-400 font-mono">{p.maxDrawdown}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block">Followers</span>
                      <span className="font-bold text-white font-mono">{p.followers}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block">Fee</span>
                      <span className="font-bold text-neutral-300 font-mono">{p.performanceFee}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block">Risk</span>
                      <span
                        className={`font-bold font-mono ${
                          p.riskScore <= 2
                            ? 'text-emerald-400'
                            : p.riskScore === 3
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {p.riskScore}/5
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Follow Button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-neutral-400">
                      Min Deposit: <strong className="text-white">${p.minDeposit}</strong>
                    </span>

                    {isAlreadyFollowed ? (
                      <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Following</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setModalProvider(p);
                          setAllocateAmount(p.minDeposit);
                        }}
                        className="px-4 py-1.5 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-red-950/30 flex items-center gap-1"
                      >
                        <span>Follow Strategy</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 2: My Followed Strategies */}
      {activeSubTab === 'my-portfolio' && (
        <div className="space-y-3">
          {followedStrategies.length === 0 ? (
            <div className="bg-[#161920] border border-neutral-800 rounded-xl p-8 text-center text-xs text-neutral-500 space-y-2">
              <Users className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="font-semibold text-neutral-300">You are not copying any strategies yet.</p>
              <p className="text-neutral-500 max-w-sm mx-auto">
                Explore the top Strategy Providers above to start automatically replicating their positions.
              </p>
              <button
                onClick={() => setActiveSubTab('explore')}
                className="mt-2 px-4 py-1.5 bg-[#E51937] text-white rounded-lg font-bold"
              >
                Browse Providers
              </button>
            </div>
          ) : (
            followedStrategies.map((f) => (
              <div
                key={f.providerId}
                className="bg-[#161920] border border-neutral-800 rounded-xl p-4 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-semibold uppercase">
                      Strategy Provider
                    </span>
                    <h3 className="font-bold text-white text-sm">{f.providerName}</h3>
                    <span className="text-[10px] text-neutral-400">
                      Started on {f.startDate}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 uppercase block">
                      Profit / Loss
                    </span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      +${f.currentProfit.toFixed(2)} (+{f.profitPercent}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Allocated</span>
                    <span className="font-bold text-white font-mono">${f.allocatedAmount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Volume Allocation</span>
                    <span className="font-bold text-white font-mono">{f.volumeAllocation}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Rescue Level</span>
                    <span className="font-bold text-amber-400 font-mono">{f.rescueLevel}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => onUnfollowStrategy(f.providerId)}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-rose-950/80 text-rose-400 text-xs font-semibold rounded-lg transition-colors border border-rose-900/40"
                  >
                    Stop Following & Settle Funds
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Follow Strategy Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181B22] border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#E51937] text-white text-[10px] font-black">
                  HFcopy
                </span>
                <span className="font-bold text-white text-sm">Follow {modalProvider.name}</span>
              </div>
              <button
                onClick={() => setModalProvider(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Target */}
            <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] text-neutral-400 block">Copying from Account:</span>
                <span className="font-bold text-white">#{currentAccount.accountNumber} ({currentAccount.tier})</span>
              </div>
              <span className="font-mono text-neutral-300">
                Available: ${currentAccount.balance.toLocaleString()}
              </span>
            </div>

            {/* Allocation Amount */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-semibold block">
                Investment Allocation (USD)
              </label>
              <input
                type="number"
                min={modalProvider.minDeposit}
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#E51937]"
              />
              <span className="text-[10px] text-neutral-500">
                Min required for this strategy: ${modalProvider.minDeposit}
              </span>
            </div>

            {/* Rescue Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-semibold">Rescue Level:</span>
                <span className="font-mono font-bold text-amber-400">{rescueLevel}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={rescueLevel}
                onChange={(e) => setRescueLevel(parseInt(e.target.value, 10))}
                className="w-full accent-[#E51937]"
              />
              <span className="text-[10px] text-neutral-400 block">
                Automatically stops copying and closes all copied positions if equity drops by {rescueLevel}%.
              </span>
            </div>

            {/* Volume Allocation */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-semibold">Volume Allocation:</span>
                <span className="font-mono font-bold text-white">{volumePercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={volumePercent}
                onChange={(e) => setVolumePercent(parseInt(e.target.value, 10))}
                className="w-full accent-[#E51937]"
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 text-[11px] text-neutral-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="accent-[#E51937] mt-0.5"
              />
              <span>
                I agree to the HFcopy Strategy Provider Terms & Conditions and understand that past performance does not guarantee future results.
              </span>
            </label>

            {/* Execute Button */}
            <button
              id="confirm-start-follow-btn"
              disabled={!termsAccepted || allocateAmount < modalProvider.minDeposit}
              onClick={handleStartFollowing}
              className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg ${
                termsAccepted && allocateAmount >= modalProvider.minDeposit
                  ? 'bg-[#E51937] hover:bg-[#c9142f] shadow-red-950/40 active:scale-[0.98]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Start Following ({modalProvider.name})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
