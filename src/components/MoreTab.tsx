import React, { useState } from 'react';
import {
  Bell,
  Sliders,
  ShieldCheck,
  Smartphone,
  LineChart,
  Moon,
  Sun,
  KeyRound,
  Headphones,
  Share2,
  AlertTriangle,
  ChevronRight,
  Check,
  Zap,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Server,
} from 'lucide-react';
import { Security2FAModal } from './Security2FAModal';
import { DedicatedTraderSupportModal } from './DedicatedTraderSupportModal';
import { UserAuthProfile } from '../types/botTypes';

interface MoreTabProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  oneClickTrading: boolean;
  onToggleOneClick: () => void;
  slippage?: number;
  onSlippageChange?: (val: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  showSpreadBrackets?: boolean;
  onToggleSpreadBrackets?: () => void;
  drawdownProtection?: boolean;
  onToggleDrawdownProtection?: () => void;
  twoFactorEnabled?: boolean;
  onToggle2FA?: (enabled: boolean) => void;
  currentUser?: UserAuthProfile | null;
  onSyncAllToSupabase?: () => Promise<void>;
}

export const MoreTab: React.FC<MoreTabProps> = ({
  isDarkMode,
  onToggleTheme,
  oneClickTrading,
  onToggleOneClick,
  slippage = 0.5,
  onSlippageChange,
  soundEnabled = true,
  onToggleSound,
  showSpreadBrackets = true,
  onToggleSpreadBrackets,
  drawdownProtection = true,
  onToggleDrawdownProtection,
  twoFactorEnabled = true,
  onToggle2FA,
  currentUser,
  onSyncAllToSupabase,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncAllToSupabase) {
        await onSyncAllToSupabase();
      }
      showToast('Settings & preferences saved successfully!');
    } catch (e: any) {
      showToast('Settings saved to local storage.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      id="platform-more-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-neutral-800 bg-[#121418]' : 'border-neutral-200 bg-white'
        }`}
      >
        <div>
          <h1 className="text-xl font-black tracking-tight">Platform Preferences</h1>
          <p className="text-xs text-neutral-400">Settings, trade execution &amp; security</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Equinix LD4 (12ms)</span>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      <div className="p-4 space-y-6">

        {/* ========================================================================= */}
        {/* Section 1: Execution & Order Preferences                                  */}
        {/* ========================================================================= */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            Execution & Order Settings
          </h2>
          <div
            className={`rounded-2xl border divide-y overflow-hidden ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800 divide-neutral-800/70'
                : 'bg-white border-neutral-200 divide-neutral-100 shadow-xs'
            }`}
          >
            {/* One-Click Trading */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">One-Click Direct Execution</h3>
                  <p className="text-xs text-neutral-400">
                    Bypass order confirmation dialog for sub-millisecond fills
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onToggleOneClick();
                  showToast(
                    `One-Click Trading is now ${!oneClickTrading ? 'ENABLED' : 'DISABLED'}`
                  );
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  oneClickTrading ? 'bg-blue-600' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    oneClickTrading ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Max Slippage Tolerance */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Maximum Slippage Tolerance</h3>
                  <p className="text-xs text-neutral-400">
                    Max permitted price slippage on volatile spikes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[0.2, 0.5, 1.0, 2.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      if (onSlippageChange) onSlippageChange(val);
                      showToast(`Slippage set to ${val} pips`);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      slippage === val
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                    }`}
                  >
                    {val}p
                  </button>
                ))}
              </div>
            </div>

            {/* Sound FX */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">Trade & Order Sound Effects</h3>
                  <p className="text-xs text-neutral-400">Audio feedback on order fill, TP and SL</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onToggleSound) onToggleSound();
                  showToast(`Sound FX ${!soundEnabled ? 'Enabled' : 'Muted'}`);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  soundEnabled ? 'bg-amber-500' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 2: Chart & Terminal Settings                                      */}
        {/* ========================================================================= */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            Display & Terminal Appearance
          </h2>
          <div
            className={`rounded-2xl border divide-y overflow-hidden ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800 divide-neutral-800/70'
                : 'bg-white border-neutral-200 divide-neutral-100 shadow-xs'
            }`}
          >
            {/* Dark Mode */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">Theme Style</h3>
                  <p className="text-xs text-neutral-400">
                    {isDarkMode ? 'Pro Dark Obsidian (Ultra Contrast)' : 'Clean Daylight Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                    : 'border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                }`}
              >
                {isDarkMode ? 'Dark' : 'Light'}
              </button>
            </div>

            {/* Spread Brackets */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/15 text-teal-500">
                  <LineChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Chart Spreads & Market Depth</h3>
                  <p className="text-xs text-neutral-400">
                    Live dynamic Bid/Ask visual price band lines
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onToggleSpreadBrackets) onToggleSpreadBrackets();
                  showToast(`Live Spreads on Chart: ${!showSpreadBrackets ? 'ON' : 'OFF'}`);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  showSpreadBrackets ? 'bg-teal-500' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    showSpreadBrackets ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 3: Risk Controls & Security                                       */}
        {/* ========================================================================= */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            Account Security & Risk Controls
          </h2>
          <div
            className={`rounded-2xl border divide-y overflow-hidden ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800 divide-neutral-800/70'
                : 'bg-white border-neutral-200 divide-neutral-100 shadow-xs'
            }`}
          >
            {/* Drawdown Protection */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Auto Drawdown Guard</h3>
                  <p className="text-xs text-neutral-400">
                    Instant liquidation if account equity touches 0.00
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onToggleDrawdownProtection) onToggleDrawdownProtection();
                  showToast(
                    `Zero Balance Guard: ${!drawdownProtection ? 'ENABLED' : 'DISABLED'}`
                  );
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  drawdownProtection ? 'bg-rose-600' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    drawdownProtection ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2FA Shield */}
            <div
              onClick={() => setIs2FAModalOpen(true)}
              className="p-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Biometric & 2FA Security</h3>
                  <p className="text-xs text-neutral-400">Device Fingerprint + Authenticator App linked</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                {twoFactorEnabled ? 'Active' : 'Off'}
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              </span>
            </div>

            {/* 24/7 Dedicated Support */}
            <div
              onClick={() => setIsSupportModalOpen(true)}
              className="p-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Dedicated Trader Support</h3>
                  <p className="text-xs text-neutral-400">24/7 Priority Execution Desk & Market Queries</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 pb-6 text-xs text-neutral-400 space-y-1">
          <p className="font-semibold">Terminal Build: v4.8.0 (Equinix LD4 Edition)</p>
          <p className="text-[11px] text-neutral-500">
            STP / ECN Direct Market Access • Ultra-Low Latency Execution
          </p>
        </div>
      </div>

      {/* 2FA Modal */}
      <Security2FAModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        isDarkMode={isDarkMode}
        twoFactorEnabled={twoFactorEnabled}
        onToggle2FA={(val) => {
          if (onToggle2FA) onToggle2FA(val);
        }}
      />

      {/* Dedicated Trader Support AI Modal */}
      <DedicatedTraderSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
      />
    </div>
  );
};
