import React, { useState } from 'react';
import { VTMLogo } from './VTMLogo';
import { TradingAccount, ActiveTab } from '../types';
import {
  ChevronDown,
  Bell,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Zap,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  Radio,
  LogOut,
  User,
  Wallet,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { UserAuthProfile } from '../types/botTypes';

interface HeaderProps {
  accounts: TradingAccount[];
  selectedAccount: TradingAccount | null;
  walletBalance?: number;
  onSelectAccount: (acc: TradingAccount) => void;
  onOpenDeposit: () => void;
  onOpenNewAccount: () => void;
  onResetDemo: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  oneClickTrading: boolean;
  onToggleOneClick: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  notifications: Array<{ id: string; title: string; time: string; read: boolean }>;
  onMarkNotificationsRead: () => void;
  onOpenMenuDrawer?: () => void;
  currentUser?: UserAuthProfile | null;
  onSignOut?: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
  onOpenAdminManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  selectedAccount,
  walletBalance = 0,
  onSelectAccount,
  onOpenDeposit,
  onOpenNewAccount,
  onResetDemo,
  isMobileFrame,
  onToggleMobileFrame,
  isDarkMode,
  onToggleTheme,
  oneClickTrading,
  onToggleOneClick,
  setActiveTab,
  notifications,
  onMarkNotificationsRead,
  onOpenMenuDrawer,
  currentUser,
  onSignOut,
  onOpenInstall,
  isInstalled = false,
  onOpenAdminManager,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      id="hfm-main-header"
      className={`sticky top-0 z-40 w-full border-b px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between shadow-xs transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#111317] border-neutral-800 text-white'
          : 'bg-white border-neutral-200 text-neutral-900 shadow-xs'
      }`}
    >
      {/* Left: Hamburger Menu & VTM Logo */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {onOpenMenuDrawer && (
          <button
            onClick={onOpenMenuDrawer}
            className="p-1.5 -ml-0.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            title="Open Menu"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}

        <button
          onClick={() => setActiveTab('markets')}
          className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
        >
          <VTMLogo size="sm" isDarkMode={isDarkMode} />
        </button>
      </div>

      {/* Center: Active Trading Account Dropdown Switcher (Optimized & High-Visibility on Mobile) */}
      <div className="relative mx-1 sm:mx-2 shrink min-w-0">
        {!selectedAccount || accounts.length === 0 ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 border rounded-xl text-left transition-colors ${
                isDarkMode
                  ? 'bg-[#1A1D23] border-neutral-700/70 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-xs'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-neutral-400 leading-none">Wallet</span>
                <span className="text-[11px] sm:text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${(walletBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[9px] text-neutral-400 font-sans">USD</span>
                </span>
              </div>
            </div>
            <button
              id="header-open-acc-btn"
              onClick={onOpenNewAccount}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="Open Live or Demo Trading Account"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Open Account</span>
            </button>
          </div>
        ) : (
          <button
            id="account-selector-btn"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 border rounded-xl text-left transition-all active:scale-[0.98] max-w-[125px] xs:max-w-[160px] sm:max-w-none overflow-hidden ${
              isDarkMode
                ? 'bg-[#1A1D23] hover:bg-[#22262E] border-neutral-700/80 text-white'
                : 'bg-slate-100 hover:bg-slate-200/90 border-slate-300 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex flex-col min-w-0 leading-tight flex-1">
              <div className="flex items-center gap-1">
                <span
                  className={`text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.5 rounded leading-none shrink-0 ${
                    selectedAccount.type === 'Live'
                      ? 'bg-[#E51937] text-white shadow-xs'
                      : 'bg-amber-500 text-black font-extrabold'
                  }`}
                >
                  {selectedAccount.type}
                </span>
                <span className="text-[10px] sm:text-xs font-bold font-mono tracking-tight truncate">
                  #{selectedAccount.accountNumber}
                </span>
                <span className="text-[10px] text-neutral-400 hidden md:inline">
                  ({selectedAccount.tier})
                </span>
              </div>
              <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5 truncate">
                <span className="text-[11px] sm:text-sm font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
                  ${selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[8px] sm:text-[10px] text-neutral-400 font-sans font-semibold shrink-0">
                  {selectedAccount.currency}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-3 h-3 sm:w-4 sm:h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                showAccountMenu ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}

        {/* Account Selector Dropdown - Mobile Responsive Sheet/Dropdown */}
        {showAccountMenu && selectedAccount && (
          <div
            id="account-dropdown-menu"
            className={`fixed sm:absolute left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 top-13 sm:top-full sm:mt-2 sm:w-72 border rounded-xl shadow-2xl p-2.5 z-50 text-xs ${
              isDarkMode
                ? 'bg-[#1A1D24] border-neutral-700/80 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700/50 mb-2">
              <span className="font-semibold text-slate-600 dark:text-neutral-400">My Trading Accounts</span>
              <button
                id="btn-open-new-acc"
                onClick={() => {
                  setShowAccountMenu(false);
                  onOpenNewAccount();
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-[#E51937] hover:underline cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Open New</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isSelected = selectedAccount ? acc.id === selectedAccount.id : false;
                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      onSelectAccount(acc);
                      setShowAccountMenu(false);
                    }}
                    className={`p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-neutral-800/90 border-[#E51937]'
                          : 'bg-red-50 border-[#E51937]'
                        : isDarkMode
                        ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            acc.type === 'Live' ? 'bg-[#E51937] text-white' : 'bg-amber-500 text-black'
                          }`}
                        >
                          {acc.type}
                        </span>
                        <span className="font-semibold">#{acc.accountNumber}</span>
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400">({acc.tier})</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E51937]" />}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-500 dark:text-neutral-400">
                        Lev: <span className="font-semibold text-slate-800 dark:text-neutral-300">{acc.leverage}</span>
                      </span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700/50 space-y-1.5">
              {onOpenAdminManager && currentUser?.role === 'admin' && (
                <button
                  id="btn-admin-manage-accounts"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onOpenAdminManager();
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                    isDarkMode
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Edit Wallet &amp; Accounts</span>
                </button>
              )}

              {selectedAccount?.type === 'Demo' && (
                <button
                  id="reset-demo-balance-btn"
                  onClick={() => {
                    onResetDemo();
                    setShowAccountMenu(false);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-amber-500 font-medium text-xs transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Demo to $100,000</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Deposit, Light/Dark Theme, View Mode & Notifications */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Quick Deposit Pill Button - High Priority on Mobile */}
        <button
          id="header-deposit-btn"
          onClick={onOpenDeposit}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          title="Deposit Funds"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="text-[11px] sm:text-xs">Deposit</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors border shrink-0 cursor-pointer ${
            isDarkMode
              ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700/60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>

        {/* PWA Install Button (Responsive: visible on sm+ screens; also inside Drawer for mobile) */}
        {onOpenInstall && (
          <button
            id="pwa-install-header-btn"
            onClick={onOpenInstall}
            title={isInstalled ? 'VTM Markets App Installed' : 'Install VTM Markets App'}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all bg-gradient-to-r from-[#E51937]/15 to-red-500/20 hover:from-[#E51937]/25 hover:to-red-500/30 border-red-500/40 text-red-500 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px]">{isInstalled ? 'App Ready' : 'Install App'}</span>
          </button>
        )}

        {/* 1-Click Trading Toggle */}
        <button
          id="one-click-trading-btn"
          title={`One-Click Trading: ${oneClickTrading ? 'Enabled' : 'Disabled'}`}
          onClick={onToggleOneClick}
          className={`hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
            oneClickTrading
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
              : isDarkMode
              ? 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${oneClickTrading ? 'fill-amber-500 text-amber-500' : ''}`} />
          <span className="text-[11px]">1-Click</span>
        </button>

        {/* Mobile Mockup vs Desktop Terminal Switcher (Shown only on desktop screens where simulation makes sense) */}
        <button
          id="toggle-view-mode-btn"
          onClick={onToggleMobileFrame}
          title={isMobileFrame ? 'Switch to Full WebTrader View' : 'Switch to VTM Mobile App View'}
          className={`hidden lg:flex p-1.5 rounded-lg transition-colors border shrink-0 cursor-pointer ${
            isDarkMode
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {isMobileFrame ? (
            <Monitor className="w-4 h-4 text-sky-400" />
          ) : (
            <Smartphone className="w-4 h-4 text-[#E51937]" />
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative shrink-0">
          <button
            id="notifications-bell-btn"
            onClick={() => {
              setShowNotificationDrawer(!showNotificationDrawer);
              if (unreadCount > 0) onMarkNotificationsRead();
            }}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors border relative shrink-0 cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E51937] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Drawer - Mobile Responsive */}
          {showNotificationDrawer && (
            <div
              className={`fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-13 sm:top-full sm:mt-2 sm:w-80 border rounded-xl shadow-2xl p-3 z-50 text-xs ${
                isDarkMode ? 'bg-[#1A1D24] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700/50">
                <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <Bell className="w-3.5 h-3.5 text-[#E51937]" />
                  Notifications &amp; Alerts
                </span>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="text-slate-400 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 border rounded-lg text-left ${
                      isDarkMode
                        ? 'bg-neutral-900/80 border-neutral-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <p className="text-xs font-medium">{n.title}</p>
                    <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Sign Out Button (Visible on sm+ screens; on mobile, available in Menu Drawer) */}
        {onSignOut && (
          <div
            className={`hidden sm:flex items-center gap-1.5 pl-1 sm:pl-2 border-l shrink-0 ${
              isDarkMode ? 'border-neutral-700/60' : 'border-slate-300'
            }`}
          >
            <div
              className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs transition-colors ${
                isDarkMode
                  ? 'bg-neutral-800/60 border-neutral-700/60 text-neutral-200'
                  : 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
              }`}
              title={`Logged in as ${currentUser?.name || 'Trader'}`}
            >
              <div className="w-5 h-5 rounded-full bg-[#E51937] text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'T'}
              </div>
              <span className="font-semibold max-w-[100px] truncate">
                {currentUser?.name || 'Trader'}
              </span>
            </div>

            <button
              onClick={onSignOut}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                isDarkMode
                  ? 'border-neutral-700/60 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30'
                  : 'border-slate-300 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-xs'
              }`}
              title="Sign Out to Landing Page"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
