import React, { useState } from 'react';
import {
  X,
  User,
  TrendingUp,
  BarChart3,
  Globe,
  Award,
  ArrowDownLeft,
  Settings,
  Sliders,
  ChevronRight,
  Copy,
  Check,
  Cpu,
  LogOut,
  Bot,
  Download,
  Headphones,
  Gift,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { UserAuthProfile } from '../types/botTypes';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
  walletBalance: number;
  isDarkMode?: boolean;
  currentUser?: UserAuthProfile | null;
  onSignOut?: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
  onClaimReferralCommission?: (amount: number) => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenDeposit,
  walletBalance,
  isDarkMode = false,
  currentUser,
  onSignOut,
  onOpenInstall,
  isInstalled = false,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(currentUser?.accountNumber || '8842-9102-LIVE');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div
        className={`relative w-[320px] max-w-[85vw] h-full flex flex-col justify-between overflow-y-auto z-50 shadow-2xl border-r transition-colors duration-200 ${
          isDarkMode
            ? 'bg-[#0E1116] border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        <div>
          {/* Top Profile & Account Header */}
          <div
            className={`p-4 border-b ${
              isDarkMode ? 'border-neutral-800 bg-[#141820]' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#E51937] to-amber-500 p-0.5 shadow-md">
                    <div className="w-full h-full rounded-[14px] bg-neutral-900 flex items-center justify-center font-black text-white text-sm">
                      {currentUser?.name
                        ? currentUser.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'TR'}
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0E1116]" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold truncate text-slate-900 dark:text-white">
                    {currentUser?.name || 'Institutional Trader'}
                  </h2>
                  <button
                    onClick={handleCopyAccount}
                    className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1 hover:text-[#E51937] cursor-pointer mt-0.5"
                  >
                    <span>ID: #{currentUser?.accountNumber || '8842-9102-LIVE'}</span>
                    {copiedAccount ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Balance & Fund Card */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDarkMode ? 'bg-[#181D26] border-neutral-800' : 'bg-white border-neutral-200 shadow-2xs'
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium block">
                  Live Wallet
                </span>
                <span className="text-base font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={() => {
                  onOpenDeposit();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deposit</span>
              </button>
            </div>
          </div>

          {/* Menu Sections */}
          <div className="p-3 space-y-4">
            {/* Group 1: Core Trading */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Trading Suite
              </span>

              <button
                onClick={() => {
                  onNavigate('markets');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Live Markets &amp; Quotes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  onNavigate('trades');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>Order Positions &amp; History</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  onNavigate('bots');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 text-red-500" />
                  <span>Bots &amp; EAs</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  onNavigate('hfcopy');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span>Pro Copy Trading Network</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>
            </div>

            {/* Group 2: Analytics & Market Data */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Live Intelligence
              </span>

              <button
                id="menu-ai-market-intelligence-btn"
                onClick={() => {
                  onNavigate('ai-analysis');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold">AI Market Intelligence</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30">
                  AI
                </span>
              </button>

              <button
                onClick={() => {
                  onNavigate('news');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span>Market News &amp; Analysis</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => {
                  onNavigate('calculator');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Risk &amp; Pip Size Calculator</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  onNavigate('rewards');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span>Trader Rewards &amp; Cashbacks</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                id="menu-referral-program-btn"
                onClick={() => {
                  onNavigate('referral');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Gift className="w-4 h-4 text-emerald-500" />
                  <span>Referral Program</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                  Commissions
                </span>
              </button>
            </div>

            {/* Group 3: Account & Security */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Account &amp; Security
              </span>

              <button
                onClick={() => {
                  onNavigate('account');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-500 dark:text-neutral-300" />
                  <span>Profile &amp; Verification</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('more');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-500 dark:text-neutral-300" />
                  <span>Platform Preferences &amp; Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  onNavigate('support');
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-blue-500" />
                  <span>Dedicated Trader Support (24/7 AI)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold">
                  AI Online
                </span>
              </button>

              {/* Install App Trigger */}
              {onOpenInstall && (
                <button
                  id="menu-drawer-install-app-btn"
                  onClick={() => {
                    onClose();
                    onOpenInstall();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-all cursor-pointer mt-2"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-red-500 animate-bounce" />
                    <span>{isInstalled ? 'App Installed on Device' : 'Install VTM App to Device'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold">
                    {isInstalled ? 'Active' : 'Install'}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onSignOut?.();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out to Landing Page</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Drawer Footer */}
        <div
          className={`p-3.5 border-t text-xs flex items-center justify-between ${
            isDarkMode ? 'border-neutral-800 bg-[#141820]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono">Connected</span>
          </div>

          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">v4.8.0</span>
        </div>
      </div>
    </div>
  );
};
