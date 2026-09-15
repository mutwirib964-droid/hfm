import React, { useState } from 'react';
import { HFMLogo } from './HFMLogo';
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
} from 'lucide-react';

interface HeaderProps {
  accounts: TradingAccount[];
  selectedAccount: TradingAccount;
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
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  selectedAccount,
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
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      id="hfm-main-header"
      className={`sticky top-0 z-40 w-full border-b px-2.5 sm:px-4 py-2 flex items-center justify-between shadow-xs transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#111317] border-neutral-800 text-white'
          : 'bg-white border-neutral-200 text-neutral-900 shadow-xs'
      }`}
    >
      {/* Left: Hamburger Menu & HFM Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenMenuDrawer && (
          <button
            onClick={onOpenMenuDrawer}
            className="p-1.5 -ml-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Open Menu"
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
          className="flex items-center gap-2 focus:outline-none cursor-pointer"
        >
          <HFMLogo size="sm" showSubtitle={false} />
        </button>
      </div>

      {/* Center: Active Trading Account Dropdown Switcher */}
      <div className="relative">
        <button
          id="account-selector-btn"
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg text-left transition-colors ${
            isDarkMode
              ? 'bg-[#1A1D23] hover:bg-[#22262E] border-neutral-700/70 text-white'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  selectedAccount.type === 'Live'
                    ? 'bg-[#E51937] text-white'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {selectedAccount.type}
              </span>
              <span className="text-xs font-semibold">
                #{selectedAccount.accountNumber}
              </span>
              <span className="text-[10px] text-neutral-400 hidden xs:inline">
                ({selectedAccount.tier})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold tracking-tight">
                ${selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {selectedAccount.currency}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform ${
              showAccountMenu ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Account Selector Dropdown */}
        {showAccountMenu && (
          <div
            id="account-dropdown-menu"
            className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 border rounded-xl shadow-2xl p-2.5 z-50 text-xs ${
              isDarkMode
                ? 'bg-[#1A1D24] border-neutral-700/80 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-700/50 mb-2">
              <span className="font-semibold text-neutral-400">My Trading Accounts</span>
              <button
                id="btn-open-new-acc"
                onClick={() => {
                  setShowAccountMenu(false);
                  onOpenNewAccount();
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-[#E51937] hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Open New</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isSelected = acc.id === selectedAccount.id;
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
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
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
                        <span className="text-[10px] text-neutral-400">({acc.tier})</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E51937]" />}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-neutral-400">
                        Lev: <span className="text-neutral-300">{acc.leverage}</span>
                      </span>
                      <span className="font-bold font-mono">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedAccount.type === 'Demo' && (
              <div className="mt-2 pt-2 border-t border-neutral-700/50">
                <button
                  id="reset-demo-balance-btn"
                  onClick={() => {
                    onResetDemo();
                    setShowAccountMenu(false);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-amber-500 font-medium text-xs transition-colors ${
                    isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Demo to $100,000</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Deposit, Light/Dark Theme, View Mode & Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Deposit Pill Button */}
        <button
          id="header-deposit-btn"
          onClick={onOpenDeposit}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Deposit</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-1.5 rounded-lg transition-colors border ${
            isDarkMode
              ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700/60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 1-Click Trading Toggle */}
        <button
          id="one-click-trading-btn"
          title={`One-Click Trading: ${oneClickTrading ? 'Enabled' : 'Disabled'}`}
          onClick={onToggleOneClick}
          className={`hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
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

        {/* Mobile Mockup vs Desktop Terminal Switcher */}
        <button
          id="toggle-view-mode-btn"
          onClick={onToggleMobileFrame}
          title={isMobileFrame ? 'Switch to Full WebTrader View' : 'Switch to HFM Mobile App View'}
          className={`p-1.5 rounded-lg transition-colors border ${
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
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => {
              setShowNotificationDrawer(!showNotificationDrawer);
              if (unreadCount > 0) onMarkNotificationsRead();
            }}
            className={`p-1.5 rounded-lg transition-colors border relative ${
              isDarkMode
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E51937] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Drawer */}
          {showNotificationDrawer && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 border rounded-xl shadow-2xl p-3 z-50 text-xs ${
                isDarkMode ? 'bg-[#1A1D24] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-700/50">
                <span className="font-bold flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#E51937]" />
                  Notifications & Alerts
                </span>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="text-neutral-400 hover:text-white"
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
      </div>
    </header>
  );
};
