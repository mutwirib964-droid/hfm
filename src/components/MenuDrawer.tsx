import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Zap,
  TrendingUp,
  BarChart3,
  Globe,
  Award,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Bell,
  Sliders,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Layers,
  Cpu,
  HelpCircle,
  LogOut,
  Bot,
  Download,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { RiskPipCalculatorModal } from './RiskPipCalculatorModal';
import { TradersRewardsModal } from './TradersRewardsModal';
import { Security2FAModal } from './Security2FAModal';
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
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const [isRiskCalcOpen, setIsRiskCalcOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  if (!isOpen && !isRiskCalcOpen && !isRewardsOpen && !is2FAOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('8842-9102-LIVE');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer content (slides in from left) */}
      <div
        className={`relative w-[320px] max-w-[85vw] h-full flex flex-col z-50 shadow-2xl transition-colors duration-200 overflow-y-auto ${
          isDarkMode ? 'bg-[#0E1116] text-white' : 'bg-white text-neutral-900'
        }`}
      >
        {/* Top Profile & Account Header */}
        <div
          className={`p-4 border-b relative ${
            isDarkMode ? 'border-neutral-800 bg-[#141820]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E51937] to-amber-500 p-0.5 shadow-md">
                <div className="w-full h-full rounded-[14px] bg-neutral-900 flex items-center justify-center font-black text-white text-base">
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
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold truncate text-slate-900 dark:text-white">
                  {currentUser?.name || 'Institutional Trader'}
                </h2>
              </div>
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

          {/* Quick Balance & Fund Card */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isDarkMode ? 'bg-[#181D26] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium block">Live Wallet</span>
              <span className="text-base font-black font-mono tracking-tight text-slate-900 dark:text-white">
                ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onOpenDeposit();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deposit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Notifications / Notice */}
        {modalNotice && (
          <div className="m-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between animate-fadeIn">
            <span>{modalNotice}</span>
            <button
              onClick={() => setModalNotice(null)}
              className="text-neutral-400 hover:text-white ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Menu Navigation Sections */}
        <div className="flex-1 px-3 py-2 space-y-4">
          {/* Group 1: Core Trading Suite */}
          <div>
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1">
              Trading Suite
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => handleItemClick(() => onNavigate('markets'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Live Markets &amp; Quotes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => handleItemClick(() => onNavigate('trades'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>Order Positions &amp; History</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => handleItemClick(() => onNavigate('bots'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-red-500" />
                  <span>Bots &amp; EAs</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-500">
                  ACTIVE
                </span>
              </button>

              <button
                onClick={() => handleItemClick(() => onNavigate('hfcopy'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span>Pro Copy Trading Network</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  TOP PnL
                </span>
              </button>
            </div>
          </div>

          {/* Group 2: Intelligence & Tools */}
          <div>
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1">
              Live Intelligence
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => handleItemClick(() => onNavigate('news'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span>Market News &amp; Analysis</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => {
                  setIsRiskCalcOpen(true);
                  onClose();
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Risk &amp; Pip Size Calculator</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  setIsRewardsOpen(true);
                  onClose();
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span>Trader Rewards &amp; Cashbacks</span>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">100 Lots</span>
              </button>
            </div>
          </div>

          {/* Group 3: Account & Platform Security */}
          <div>
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1">
              Account &amp; Security
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => handleItemClick(() => onNavigate('account'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                  <span>Profile &amp; Verification</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
              </button>

              <button
                onClick={() => handleItemClick(() => onNavigate('more'))}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                  <span>Platform Preferences &amp; Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => {
                  setIs2FAOpen(true);
                  onClose();
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Security &amp; 2FA Protection</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">
                  {twoFactorEnabled ? 'Active' : 'Off'}
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
                  className="w-full px-2.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-all cursor-pointer mt-1"
                >
                  <div className="flex items-center gap-2.5">
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
                  onSignOut?.();
                  onClose();
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out to Landing Page</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Drawer Footer */}
        <div
          className={`p-3 border-t text-xs flex items-center justify-between ${
            isDarkMode ? 'border-neutral-800 bg-[#141820]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono">LD4 Gateway: 14ms</span>
          </div>

          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">v4.8.0 (Equinix LD4)</span>
        </div>
      </div>

      {/* Internal Interactive Modals (No external redirection) */}
      <RiskPipCalculatorModal
        isOpen={isRiskCalcOpen}
        onClose={() => setIsRiskCalcOpen(false)}
        isDarkMode={isDarkMode}
      />

      <TradersRewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        isDarkMode={isDarkMode}
      />

      <Security2FAModal
        isOpen={is2FAOpen}
        onClose={() => setIs2FAOpen(false)}
        isDarkMode={isDarkMode}
        twoFactorEnabled={twoFactorEnabled}
        onToggle2FA={setTwoFactorEnabled}
      />
    </div>
  );
};
