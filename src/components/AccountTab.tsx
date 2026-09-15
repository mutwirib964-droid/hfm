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
} from 'lucide-react';

interface AccountTabProps {
  accounts: TradingAccount[];
  selectedAccount: TradingAccount;
  onSelectAccount: (acc: TradingAccount) => void;
  onOpenNewAccount: (params: {
    type: AccountType;
    tier: AccountTier;
    currency: string;
    leverage: string;
  }) => void;
  economicEvents: EconomicEvent[];
  marketAnalyses: MarketAnalysis[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  onOpenNewAccount,
  economicEvents,
  marketAnalyses,
  isDarkMode,
  onToggleTheme,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'overview' | 'calculators' | 'calendar' | 'news' | 'support' | 'security'
  >('overview');

  // Open Account Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [newAccType, setNewAccType] = useState<AccountType>('Live');
  const [newAccTier, setNewAccTier] = useState<AccountTier>('Premium');
  const [newAccLeverage, setNewAccLeverage] = useState('1:500');

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
      text: 'Hello Alex! Welcome to HFM 24/7 Multilingual Support. How can our trading desk assist you today?',
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
      let reply = "Thank you for reaching out to HFM. Our team operates 24/7 to provide institutional grade liquidity and instant order routing. We have flagged your request with our account specialist.";
      if (userMsg.toLowerCase().includes('deposit') || userMsg.toLowerCase().includes('wallet')) {
        reply = "Deposits into your HF Wallet are processed instantly with 0% fees across Visa/Mastercard, Tether USDT, and local payment rails.";
      } else if (userMsg.toLowerCase().includes('spread') || userMsg.toLowerCase().includes('leverage')) {
        reply = "HFM offers competitive leverage up to 1:2000 and ultra-tight raw spreads from 0.0 pips on our Zero Spread and Pro accounts.";
      } else if (userMsg.toLowerCase().includes('copy') || userMsg.toLowerCase().includes('hfcopy')) {
        reply = "With HFcopy, you can allocate funds with full risk management, customizable volume allocation, and automated rescue levels.";
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
      <div className="bg-[#161920] border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#E51937] to-neutral-700 flex items-center justify-center text-white font-bold text-lg border-2 border-neutral-700 shadow-md">
            AM
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Alex Mercer</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Tier 2</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Client ID: <span className="font-mono text-neutral-200">HFM-849102</span> • mutwirib964@gmail.com
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOpenModal(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-950/40 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Open New Account</span>
        </button>
      </div>

      {/* Navigation Sub-Menu Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveSubView('overview')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubView === 'overview'
              ? 'bg-neutral-800 border-[#E51937] text-white'
              : 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 text-[#E51937]" />
          <span>Accounts</span>
        </button>

        <button
          onClick={() => setActiveSubView('calculators')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubView === 'calculators'
              ? 'bg-neutral-800 border-[#E51937] text-white'
              : 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-400" />
          <span>Calculators</span>
        </button>

        <button
          onClick={() => setActiveSubView('calendar')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubView === 'calendar'
              ? 'bg-neutral-800 border-[#E51937] text-white'
              : 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setActiveSubView('news')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubView === 'news'
              ? 'bg-neutral-800 border-[#E51937] text-white'
              : 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4 text-emerald-400" />
          <span>Analysis</span>
        </button>

        <button
          onClick={() => setActiveSubView('support')}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all col-span-2 sm:col-span-1 ${
            activeSubView === 'support'
              ? 'bg-neutral-800 border-[#E51937] text-white'
              : 'bg-[#161920] border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span>24/7 Chat</span>
        </button>
      </div>

      {/* Sub-View 1: Accounts Overview */}
      {activeSubView === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-bold px-1">
            <span>Trading Accounts ({accounts.length})</span>
            <span className="text-[11px] text-neutral-500">Servers: London & Cyprus</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccount.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => onSelectAccount(acc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A1D26] border-[#E51937] shadow-lg shadow-red-950/20'
                      : 'bg-[#161920] border-neutral-800 hover:border-neutral-700'
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
                      <span className="font-bold text-white text-sm">#{acc.accountNumber}</span>
                      <span className="text-xs text-neutral-400 font-medium">({acc.tier})</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-base text-white">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-neutral-400 block font-mono">
                        Equity: ${acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Server</span>
                      <span className="text-neutral-300 font-mono">{acc.server}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Leverage</span>
                      <span className="text-neutral-300 font-mono font-bold">{acc.leverage}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Free Margin</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        ${acc.freeMargin.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-View 2: Trading Calculators */}
      {activeSubView === 'calculators' && (
        <div className="bg-[#161920] border border-neutral-800 rounded-xl p-4 shadow-md space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">HFM Professional Trading Calculators</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Currency Pair</label>
              <select
                value={calcPair}
                onChange={(e) => setCalcPair(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white"
              >
                <option value="EURUSD">EURUSD</option>
                <option value="GBPUSD">GBPUSD</option>
                <option value="USDJPY">USDJPY</option>
                <option value="XAUUSD">XAUUSD (Gold)</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Lot Size</label>
              <input
                type="number"
                step="0.1"
                value={calcLots}
                onChange={(e) => setCalcLots(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Leverage</label>
              <select
                value={calcLeverage}
                onChange={(e) => setCalcLeverage(parseInt(e.target.value, 10))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-mono"
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
              <label className="text-neutral-400 font-semibold block mb-1">Entry Price</label>
              <input
                type="number"
                step="any"
                value={calcEntry}
                onChange={(e) => setCalcEntry(parseFloat(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Projected Exit</label>
              <input
                type="number"
                step="any"
                value={calcExit}
                onChange={(e) => setCalcExit(parseFloat(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Calculator Output Displays */}
          <div className="grid grid-cols-3 gap-3 bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 text-center">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                Pip Value
              </span>
              <span className="text-base font-bold text-white font-mono">
                ${pipValCalc.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                Required Margin
              </span>
              <span className="text-base font-bold text-amber-400 font-mono">
                ${marginReqCalc.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                Projected Profit
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  projectedPnlCalc >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {projectedPnlCalc >= 0 ? '+' : ''}${projectedPnlCalc.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 3: Economic Calendar */}
      {activeSubView === 'calendar' && (
        <div className="bg-[#161920] border border-neutral-800 rounded-xl overflow-hidden shadow-md">
          <div className="p-3 bg-[#1A1D24] border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white">HFM Global Economic Calendar</h3>
            </div>
            <span className="text-[10px] text-neutral-400">Live Auto-Update</span>
          </div>

          <div className="divide-y divide-neutral-800/60 p-2">
            {economicEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 hover:bg-neutral-900/50 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{ev.flag}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{ev.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          ev.impact === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {ev.impact}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {ev.time} • {ev.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-neutral-500 block">Forecast</span>
                    <span className="text-neutral-300">{ev.forecast}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 block">Previous</span>
                    <span className="text-neutral-400">{ev.previous}</span>
                  </div>
                  {ev.actual && (
                    <div>
                      <span className="text-[9px] text-neutral-500 block">Actual</span>
                      <span className="text-emerald-400 font-bold">{ev.actual}</span>
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
              className="bg-[#161920] border border-neutral-800 rounded-xl p-4 shadow-md space-y-2 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#E51937]/15 text-[#E51937] font-bold">
                  {art.category}
                </span>
                <span className="text-neutral-500">{art.date}</span>
              </div>

              <h3 className="font-bold text-white text-sm hover:text-[#E51937] transition-colors cursor-pointer">
                {art.title}
              </h3>

              <p className="text-xs text-neutral-400 leading-relaxed">{art.summary}</p>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-500">
                <span>By {art.author} ({art.role})</span>
                <span>{art.readTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-View 5: 24/7 Live Support Chat */}
      {activeSubView === 'support' && (
        <div className="bg-[#161920] border border-neutral-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[400px]">
          <div className="p-3 bg-[#1A1D24] border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-white">HFM Client Support Desk</h4>
                <span className="text-[10px] text-neutral-400">Average response time: &lt; 1 min</span>
              </div>
            </div>
            <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-mono">
              EN / AR / ES / FR
            </span>
          </div>

          {/* Messages scroll */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
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
                        : 'bg-[#222630] text-neutral-200 rounded-tl-none border border-neutral-700/60'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-0.5 font-mono px-1">
                    {m.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Input field */}
          <div className="p-2.5 bg-[#181B22] border-t border-neutral-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your question or query here..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E51937]"
            />
            <button
              onClick={handleSendChat}
              className="p-2 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Open New Account Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181B22] border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#E51937]" />
                Open New Trading Account
              </span>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Type (Live vs Demo) */}
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Account Category</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewAccType('Live')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    newAccType === 'Live' ? 'bg-[#E51937] text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Live Real Account
                </button>
                <button
                  type="button"
                  onClick={() => setNewAccType('Demo')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    newAccType === 'Demo' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Risk-Free Demo
                </button>
              </div>
            </div>

            {/* Account Tier */}
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Account Tier / Type</label>
              <select
                value={newAccTier}
                onChange={(e) => setNewAccTier(e.target.value as AccountTier)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white"
              >
                <option value="Premium">HFM Premium (Zero Commission, Spreads from 1.2)</option>
                <option value="Pro">HFM Pro (Raw Spreads from 0.5, Low Commission)</option>
                <option value="Zero Spread">HFM Zero Spread (0.0 Spreads for Scalpers & EAs)</option>
                <option value="Cent">HFM Cent (Micro Lots for Strategy Testing)</option>
                <option value="HFcopy">HFcopy Follower Account</option>
              </select>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">Maximum Leverage</label>
              <select
                value={newAccLeverage}
                onChange={(e) => setNewAccLeverage(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-mono"
              >
                <option value="1:100">1:100 (Conservative)</option>
                <option value="1:500">1:500 (Standard)</option>
                <option value="1:1000">1:1000 (Flexible)</option>
                <option value="1:2000">1:2000 (Maximum Dynamic)</option>
              </select>
            </div>

            <button
              onClick={handleCreateAccount}
              className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Confirm & Open Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
