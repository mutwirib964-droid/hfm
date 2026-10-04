import React, { useState } from 'react';
import {
  TradingAccount,
  AccountTier,
  AccountType,
  EconomicEvent,
  MarketAnalysis,
} from '../types';
import {
  User,
  ShieldCheck,
  PlusCircle,
  Calculator,
  Calendar,
  Newspaper,
  MessageSquare,
  Lock,
  ChevronRight,
  X,
  Send,
  HelpCircle,
  ExternalLink,
  Sliders,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { ProfileVerificationSection } from './ProfileVerificationSection';
import { RiskPipCalculatorModal } from './RiskPipCalculatorModal';
import { TradersRewardsModal } from './TradersRewardsModal';
import { UserRole, UserAuthProfile } from '../types/botTypes';

interface AccountTabProps {
  accounts: TradingAccount[];
  selectedAccount: TradingAccount | null;
  onSelectAccount: (acc: TradingAccount) => void;
  onOpenNewAccount: (params: {
    type: AccountType;
    tier: AccountTier;
    currency: string;
    leverage: string;
  }) => void;
  onDeleteAccount?: (accountIdOrNumber: string) => void;
  economicEvents: EconomicEvent[];
  marketAnalyses: MarketAnalysis[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userRole?: UserRole;
  onUpdateUserRole?: (role: UserRole) => void;
  currentUser?: UserAuthProfile | null;
  onOpenAdminManager?: () => void;
  onSignOut?: () => void;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  onOpenNewAccount,
  onDeleteAccount,
  economicEvents,
  marketAnalyses,
  isDarkMode,
  onToggleTheme,
  userRole = 'marketer',
  onUpdateUserRole,
  currentUser,
  onOpenAdminManager,
  onSignOut,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'overview' | 'verification' | 'calculators' | 'rewards' | 'calendar' | 'news' | 'support'
  >('overview');

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);

  // Hidden Admin Role Assignment state (Only accessible by admin)
  const [showAdminRoleModal, setShowAdminRoleModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(userRole === 'admin');
  const [adminPinError, setAdminPinError] = useState('');
  const [assignedRoleValue, setAssignedRoleValue] = useState<UserRole>(userRole);

  // Open Account Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [newAccType, setNewAccType] = useState<AccountType>('Live');
  const [newAccTier, setNewAccTier] = useState<AccountTier>('Premium');
  const [newAccLeverage, setNewAccLeverage] = useState('1:500');
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);

  // Calculator Tool State
  const [calcPair, setCalcPair] = useState('EURUSD');
  const [calcLots, setCalcLots] = useState<number>(1.0);
  const [calcLeverage, setCalcLeverage] = useState<number>(500);
  const [calcEntry, setCalcEntry] = useState<number>(1.0872);
  const [calcExit, setCalcExit] = useState<number>(1.0920);

  // Live Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: `Hello ${currentUser?.name || 'Trader'}! Welcome to VTM Markets 24/7 Global Support. How can our trading desk assist you today?`,
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleCreateAccount = () => {
    onOpenNewAccount({
      type: newAccType,
      tier: newAccTier,
      currency: 'USD',
      leverage: newAccLeverage,
    });
    setShowOpenModal(false);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: nowTime },
    ]);
    setChatInput('');

    // Automated intelligent representative reply
    setTimeout(() => {
      let reply = "Thank you for reaching out to VTM Markets. Our team operates 24/7 to provide institutional grade liquidity and instant order routing. We have flagged your request with our account specialist.";
      if (userMsg.toLowerCase().includes('deposit') || userMsg.toLowerCase().includes('wallet')) {
        reply = "Deposits into your VTM Wallet are processed instantly with 0% fees across Visa/Mastercard, Tether USDT, and local payment rails.";
      } else if (userMsg.toLowerCase().includes('spread') || userMsg.toLowerCase().includes('leverage')) {
        reply = "VTM Markets offers competitive leverage up to 1:2000 and ultra-tight raw spreads from 0.0 pips on our Zero Spread and Pro accounts.";
      } else if (userMsg.toLowerCase().includes('copy') || userMsg.toLowerCase().includes('hfcopy')) {
        reply = "With VTM Copy, you can allocate funds with full risk management, customizable volume allocation, and automated rescue levels.";
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 900);
  };

  // Calculator calculations
  const pipValCalc = (calcLots * 100000) / 10000; // EURUSD standard pip
  const marginReqCalc = (calcLots * 100000 * calcEntry) / calcLeverage;
  const projectedPnlCalc = (calcExit - calcEntry) * 100000 * calcLots;

  return (
    <div id="hfm-account-tab" className="flex flex-col w-full pb-20 space-y-4 px-2 sm:px-4 pt-2">
      {/* User KYC Profile Header */}
      <div
        className={`border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isDarkMode
            ? 'bg-[#161920] border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div
          onClick={() => setActiveSubView('verification')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#E51937] to-neutral-700 flex items-center justify-center text-white font-bold text-lg border-2 border-neutral-700 shadow-md group-hover:border-[#E51937] transition-colors">
            {currentUser?.name
              ? currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'TR'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-[#E51937]'}`}>
                {currentUser?.name || 'Trader'}
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>KYC Tier 2</span>
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              Client ID:{' '}
              <span className={`font-mono ${isDarkMode ? 'text-neutral-200' : 'text-slate-800 font-semibold'}`}>
                #{currentUser?.accountNumber || '8842-9102-LIVE'}
              </span>{' '}
              • {currentUser?.email || 'mutwirib964@gmail.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubView('verification')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl transition-all border active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Profile & KYC</span>
          </button>

          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-950/20 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open New Account</span>
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl transition-all border active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-xs'
              }`}
              title="Sign Out from Platform"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Menu Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <button
          onClick={() => setActiveSubView('overview')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'overview'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <User className="w-4 h-4 text-[#E51937]" />
          <span>Accounts</span>
        </button>

        <button
          onClick={() => setActiveSubView('verification')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'verification'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Verification</span>
        </button>

        <button
          onClick={() => setActiveSubView('calculators')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'calculators'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-500" />
          <span>Risk & Pip</span>
        </button>

        <button
          onClick={() => setActiveSubView('rewards')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'rewards'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Award className="w-4 h-4 text-purple-500" />
          <span>Rewards (100L)</span>
        </button>

        <button
          onClick={() => setActiveSubView('calendar')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'calendar'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setActiveSubView('news')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'news'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Newspaper className="w-4 h-4 text-emerald-500" />
          <span>News</span>
        </button>

        <button
          onClick={() => setActiveSubView('support')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all col-span-2 sm:col-span-1 cursor-pointer ${
            activeSubView === 'support'
              ? isDarkMode
                ? 'bg-neutral-800 border-[#E51937] text-white'
                : 'bg-red-50 border-[#E51937] text-[#E51937] font-bold shadow-xs'
              : isDarkMode
              ? 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <span>24/7 Chat</span>
        </button>
      </div>

      {/* Sub-View 1: Accounts Overview */}
      {activeSubView === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-800'}>
              Trading Accounts ({accounts.length})
            </span>
            <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
              Servers: London & Cyprus
            </span>
          </div>

          {accounts.length === 0 ? (
            <div
              className={`p-8 rounded-2xl border text-center space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E51937]/10 border border-[#E51937]/20 flex items-center justify-center text-[#E51937]">
                <User className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Central VTM Wallet Active
                </h3>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  You have successfully created your account! Your Central Wallet is active with $0.00 balance. To begin trading live instruments or testing strategies, open a Live or Demo trading account below.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="btn-open-live-acc"
                  onClick={() => {
                    setNewAccType('Live');
                    setShowOpenModal(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Open Live Trading Account</span>
                </button>
                <button
                  id="btn-open-demo-acc"
                  onClick={() => {
                    setNewAccType('Demo');
                    setShowOpenModal(true);
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isDarkMode
                      ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-amber-400'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Open Free Demo ($100,000)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {accounts.map((acc) => {
                const isSelected = selectedAccount ? acc.id === selectedAccount.id : false;
                const isDemo = acc.type === 'Demo';
                return (
                  <div
                    key={acc.id}
                    onClick={() => onSelectAccount(acc)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-[#1A1D26] border-[#E51937] shadow-lg shadow-red-950/20'
                          : 'bg-red-50/50 border-[#E51937] shadow-xs'
                        : isDarkMode
                        ? 'bg-[#161920] border-neutral-800 hover:border-neutral-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            acc.type === 'Live' ? 'bg-[#E51937] text-white' : 'bg-amber-500 text-black'
                          }`}
                        >
                          {acc.type}
                        </span>
                        <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          #{acc.accountNumber}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          ${(acc.equity ?? acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] block font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          Settled: ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                      <div>
                        {isDemo ? (
                          <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <span>Simulated $100k Virtual Credit (Non-Depositable)</span>
                          </span>
                        ) : acc.balance === 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                            isDarkMode
                              ? 'text-neutral-400 bg-neutral-800 border-neutral-700'
                              : 'text-slate-600 bg-slate-100 border-slate-300'
                          }`}>
                            <span>Real Account • Deposit Required to Trade</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <span>Active Live Balance • Real Execution</span>
                          </span>
                        )}
                      </div>

                      {onDeleteAccount && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccountToDelete(acc);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                          }`}
                          title={`Delete ${acc.type} Account #${acc.accountNumber}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    <div className={`grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t text-[11px] ${
                      isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'
                    }`}>
                      <div>
                        <span className={`block text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                          Server
                        </span>
                        <span className={`font-mono ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          {acc.server}
                        </span>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                          Leverage
                        </span>
                        <span className={`font-mono font-bold ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                          {acc.leverage}
                        </span>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                          Free Margin
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          ${acc.freeMargin.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-View: Profile & Verification (KYC) */}
      {activeSubView === 'verification' && (
        <div className="space-y-4">
          <ProfileVerificationSection isDarkMode={isDarkMode} currentUser={currentUser} />
        </div>
      )}

      {/* Sub-View 2: Trading Calculators */}
      {activeSubView === 'calculators' && (
        <div className="space-y-4">
          <div
            className={`border rounded-xl p-4 shadow-md space-y-4 text-xs transition-colors ${
              isDarkMode
                ? 'bg-[#161920] border-neutral-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Professional Risk &amp; Pip Calculator
                </h3>
              </div>
              <button
                onClick={() => setIsRiskModalOpen(true)}
                className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                <span>Launch Full Modal Engine</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Currency Pair
                </label>
                <select
                  value={calcPair}
                  onChange={(e) => setCalcPair(e.target.value)}
                  className={`w-full border rounded-lg p-2 ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="EURUSD">EURUSD</option>
                  <option value="GBPUSD">GBPUSD</option>
                  <option value="USDJPY">USDJPY</option>
                  <option value="XAUUSD">XAUUSD (Gold)</option>
                </select>
              </div>

              <div>
                <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Lot Size
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calcLots}
                  onChange={(e) => setCalcLots(parseFloat(e.target.value) || 0.1)}
                  className={`w-full border rounded-lg p-2 font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Leverage
                </label>
                <select
                  value={calcLeverage}
                  onChange={(e) => setCalcLeverage(parseInt(e.target.value, 10))}
                  className={`w-full border rounded-lg p-2 font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="100">1:100</option>
                  <option value="500">1:500</option>
                  <option value="1000">1:1000</option>
                  <option value="2000">1:2000</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={calcEntry}
                  onChange={(e) => setCalcEntry(parseFloat(e.target.value) || 1)}
                  className={`w-full border rounded-lg p-2 font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Projected Exit
                </label>
                <input
                  type="number"
                  step="any"
                  value={calcExit}
                  onChange={(e) => setCalcExit(parseFloat(e.target.value) || 1)}
                  className={`w-full border rounded-lg p-2 font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Calculator Output Displays */}
            <div
              className={`grid grid-cols-3 gap-3 p-3 rounded-xl border text-center ${
                isDarkMode
                  ? 'bg-neutral-900/80 border-neutral-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <span className={`text-[10px] uppercase block font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Pip Value
                </span>
                <span className={`text-base font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  ${pipValCalc.toFixed(2)}
                </span>
              </div>
              <div>
                <span className={`text-[10px] uppercase block font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Required Margin
                </span>
                <span className="text-base font-bold text-amber-500 font-mono">
                  ${marginReqCalc.toFixed(2)}
                </span>
              </div>
              <div>
                <span className={`text-[10px] uppercase block font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Projected Profit
                </span>
                <span
                  className={`text-base font-bold font-mono ${
                    projectedPnlCalc >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {projectedPnlCalc >= 0 ? '+' : ''}${projectedPnlCalc.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View: Traders Rewards & Cashbacks (100 Lots Milestone) */}
      {activeSubView === 'rewards' && (
        <div className="space-y-4">
          <div
            className={`border rounded-2xl p-5 shadow-lg space-y-4 transition-colors ${
              isDarkMode
                ? 'bg-[#161920] border-neutral-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 flex-wrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Trader Rewards &amp; Cashbacks Program
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Tier Qualification
                    </span>
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Earn automated cash rebates directly credited into your live VTM Wallet on every traded lot.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRewardsModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Full Rewards Hub</span>
              </button>
            </div>

            {/* 100 Lots Requirement Explanatory Banner */}
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-950/40 via-purple-950/20 to-neutral-900 border-amber-500/30'
                  : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Eligibility Milestone: Rewards Start At 100 Lots Traded</span>
              </div>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                To activate automated daily cash rebates and institutional cashback payouts, an account must first reach an aggregate turnover of at least{' '}
                <strong className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>100 closed lots</strong> across FX, Metals, Indices, or Commodities.
              </p>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Current Milestone Progress:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">68.4 / 100.0 Lots (68.4%)</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: '68.4%' }}
                  />
                </div>
                <div className={`flex justify-between text-[10px] mt-1 font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <span>Start (0 Lots)</span>
                  <span>31.6 Lots remaining to unlock Silver Rebates</span>
                  <span>Target (100 Lots)</span>
                </div>
              </div>
            </div>

            {/* Cashback Tiers Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isDarkMode
                    ? 'bg-neutral-900/90 border-neutral-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>Silver Rebate</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    100 - 499 Lots
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-amber-500">
                  $2.50 <span className={`text-xs font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ turn lot</span>
                </p>
                <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Instant daily cash deposit into wallet. Standard spread accounts.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-xl border border-amber-500/40 space-y-2 relative overflow-hidden ${
                  isDarkMode ? 'bg-neutral-900/90' : 'bg-amber-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-300">Gold Rebate</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                    500 - 1,499 Lots
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-amber-500">
                  $4.00 <span className={`text-xs font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ turn lot</span>
                </p>
                <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  + Zero withdrawal commission &amp; priority processing.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-xl border border-purple-500/40 space-y-2 ${
                  isDarkMode ? 'bg-neutral-900/90' : 'bg-purple-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-purple-600 dark:text-purple-300">Diamond Rebate</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono">
                    1,500+ Lots
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-emerald-500">
                  $6.00 <span className={`text-xs font-normal ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>/ turn lot</span>
                </p>
                <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  + Raw liquidity rebates and dedicated account manager.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 3: Economic Calendar */}
      {activeSubView === 'calendar' && (
        <div
          className={`border rounded-xl overflow-hidden shadow-md transition-colors ${
            isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`p-3 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#1A1D24] border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                VTM Global Economic Calendar
              </h3>
            </div>
            <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Live Auto-Update</span>
          </div>

          <div className={`divide-y p-2 ${isDarkMode ? 'divide-neutral-800/60' : 'divide-slate-200'}`}>
            {economicEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                  isDarkMode ? 'hover:bg-neutral-900/50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{ev.flag}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ev.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          ev.impact === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {ev.impact}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                      {ev.time} • {ev.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right font-mono text-[11px]">
                  <div>
                    <span className={`text-[9px] block ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Forecast</span>
                    <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>{ev.forecast}</span>
                  </div>
                  <div>
                    <span className={`text-[9px] block ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Previous</span>
                    <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>{ev.previous}</span>
                  </div>
                  {ev.actual && (
                    <div>
                      <span className={`text-[9px] block ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Actual</span>
                      <span className="text-emerald-500 font-bold">{ev.actual}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-View 4: Market News & Analysis */}
      {activeSubView === 'news' && (
        <div className="space-y-3">
          {marketAnalyses.map((art) => (
            <div
              key={art.id}
              className={`border rounded-xl p-4 shadow-md space-y-2 transition-colors ${
                isDarkMode
                  ? 'bg-[#161920] border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#E51937]/15 text-[#E51937] font-bold">
                  {art.category}
                </span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>{art.date}</span>
              </div>

              <h3 className={`font-bold text-sm hover:text-[#E51937] transition-colors cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {art.title}
              </h3>

              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>{art.summary}</p>

              <div className={`flex items-center justify-between pt-2 border-t text-[11px] ${isDarkMode ? 'border-neutral-800/80 text-neutral-500' : 'border-slate-200 text-slate-500'}`}>
                <span>By {art.author} ({art.role})</span>
                <span>{art.readTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-View 5: 24/7 Live Support Chat */}
      {activeSubView === 'support' && (
        <div
          className={`border rounded-xl overflow-hidden shadow-lg flex flex-col h-[400px] transition-colors ${
            isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`p-3 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#1A1D24] border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h4 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  VTM Client Support Desk
                </h4>
                <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Average response time: &lt; 1 min
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              EN / AR / ES / FR
            </span>
          </div>

          {/* Messages scroll */}
          <div className={`flex-1 p-3 overflow-y-auto space-y-2.5 ${isDarkMode ? '' : 'bg-slate-50/50'}`}>
            {chatMessages.map((m, idx) => {
              const isMe = m.sender === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-xl text-xs ${
                      isMe
                        ? 'bg-[#E51937] text-white rounded-tr-none'
                        : isDarkMode
                        ? 'bg-[#222630] text-neutral-200 rounded-tl-none border border-neutral-700/60'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-2xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className={`text-[9px] mt-0.5 font-mono px-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Input field */}
          <div
            className={`p-2.5 border-t flex items-center gap-2 ${
              isDarkMode ? 'bg-[#181B22] border-neutral-800' : 'bg-white border-slate-200'
            }`}
          >
            <input
              type="text"
              placeholder="Type your question or query here..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className={`flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E51937] ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              onClick={handleSendChat}
              className="p-2 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Open New Account Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl space-y-4 text-xs transition-colors ${
              isDarkMode
                ? 'bg-[#181B22] border-neutral-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <span className={`font-bold text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <PlusCircle className="w-4 h-4 text-[#E51937]" />
                Open New Trading Account
              </span>
              <button
                onClick={() => setShowOpenModal(false)}
                className={`cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Type (Live vs Demo) */}
            <div>
              <label className={`font-semibold block mb-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                Account Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewAccType('Live')}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    newAccType === 'Live'
                      ? 'bg-[#E51937] text-white shadow-xs'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Live Real Account
                </button>
                <button
                  type="button"
                  onClick={() => setNewAccType('Demo')}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    newAccType === 'Demo'
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Risk-Free Demo
                </button>
              </div>

              {newAccType === 'Live' ? (
                <div className={`mt-2.5 p-3 rounded-lg border text-[11px] ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700/80 text-neutral-300'
                    : 'bg-red-50/50 border-red-200 text-slate-700'
                }`}>
                  <div className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Real Funds Account • Initial Balance: $0.00</span>
                  </div>
                  <p className={`mt-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Live accounts start with $0.00. You will need to deposit funds via Central Wallet, card, or crypto before placing live orders.
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200">
                  <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Demo Virtual Account • Initial Balance: $100,000.00</span>
                  </div>
                  <p className="mt-1 opacity-90">
                    Pre-credited with $100,000 simulated currency for practicing strategies. Non-depositable and non-withdrawable.
                  </p>
                </div>
              )}
            </div>

            {/* Leverage */}
            <div>
              <label className={`font-semibold block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                Maximum Leverage
              </label>
              <select
                value={newAccLeverage}
                onChange={(e) => setNewAccLeverage(e.target.value)}
                className={`w-full rounded-lg p-2.5 border font-mono transition-colors ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="1:100">1:100 (Conservative)</option>
                <option value="1:500">1:500 (Standard)</option>
                <option value="1:1000">1:1000 (Flexible)</option>
                <option value="1:2000">1:2000 (Maximum Dynamic)</option>
              </select>
            </div>

            <button
              onClick={handleCreateAccount}
              className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
            >
              Confirm & Open Account
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && onDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl space-y-4 text-xs transition-colors ${
              isDarkMode
                ? 'bg-[#181B22] border-neutral-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2.5 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}
            >
              <span className="font-bold text-sm flex items-center gap-2 text-rose-500">
                <Trash2 className="w-4 h-4" />
                Delete {accountToDelete.type} Account #{accountToDelete.accountNumber}
              </span>
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className={`cursor-pointer ${
                  isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className={`leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                Are you sure you want to delete{' '}
                <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                  {accountToDelete.type} Account #{accountToDelete.accountNumber}
                </strong>{' '}
                ({accountToDelete.tier} • {accountToDelete.leverage})?
              </p>

              {accountToDelete.type === 'Live' && accountToDelete.balance > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Automatic Wallet Balance Protection</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Your remaining account balance of{' '}
                    <span className="font-mono font-bold">
                      ${accountToDelete.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>{' '}
                    will be automatically transferred to your Central VTM Wallet immediately upon deletion.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className={`py-2.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAccount(accountToDelete.id);
                  setAccountToDelete(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal Engines */}
      <RiskPipCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      <TradersRewardsModal
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
