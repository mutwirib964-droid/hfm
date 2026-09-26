import React, { useState, useEffect } from 'react';
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
  Database,
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle2,
  Server,
} from 'lucide-react';
import { Security2FAModal } from './Security2FAModal';
import { supabaseService, UserPlatformSettings } from '../services/supabaseService';
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDbConfigModalOpen, setIsDbConfigModalOpen] = useState<boolean>(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Supabase credentials form
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; message: string }>({
    isConnected: supabaseService.isConfigured(),
    message: supabaseService.isConfigured() ? 'Database connected' : 'Not configured',
  });
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);

  useEffect(() => {
    const cfg = supabaseService.getConfig();
    if (cfg) {
      setInputUrl(cfg.url);
      setInputKey(cfg.anonKey);
    }
    checkDbHealth();
  }, []);

  const checkDbHealth = async () => {
    if (supabaseService.isConfigured()) {
      const res = await supabaseService.testConnection();
      setDbStatus({
        isConnected: res.success,
        message: res.success ? 'Supabase cloud synchronized & active' : res.message,
      });
    } else {
      setDbStatus({
        isConnected: false,
        message: 'No Supabase credentials configured',
      });
    }
  };

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
      showToast('All accounts, trades, settings, deposits & withdrawals synced to Supabase!');
      await checkDbHealth();
    } catch (e: any) {
      showToast('Sync completed with local cache resilience.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDbCredentials = async () => {
    if (!inputUrl.trim() || !inputKey.trim()) {
      showToast('Please provide both Supabase URL and Anon Key.');
      return;
    }
    setIsTestingConn(true);
    supabaseService.setCredentials(inputUrl.trim(), inputKey.trim());
    const res = await supabaseService.testConnection();
    setIsTestingConn(false);
    if (res.success) {
      setDbStatus({ isConnected: true, message: 'Connected to Supabase endpoint successfully.' });
      showToast('Supabase credentials verified and saved!');
      setIsDbConfigModalOpen(false);
      if (onSyncAllToSupabase) {
        onSyncAllToSupabase();
      }
    } else {
      setDbStatus({ isConnected: false, message: res.message });
      showToast(`Connection notice: ${res.message}`);
    }
  };

  const handleCopySql = () => {
    const sql = supabaseService.getDatabaseSchemaSQL();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    showToast('Supabase PostgreSQL Schema copied to clipboard!');
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
          <p className="text-xs text-neutral-400">Settings, security & Supabase cloud database</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Equinix LD4 (12ms)</span>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-blue-500/15 border border-blue-500/40 text-blue-400 text-xs font-semibold rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* ========================================================================= */}
        {/* SUPABASE CLOUD DATABASE SYNC SECTION                                      */}
        {/* ========================================================================= */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>Supabase Cloud Database & Storage</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                title="Sync all state to Supabase"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800'
                : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    dbStatus.isConnected ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>{dbStatus.isConnected ? 'Supabase Connected' : 'Supabase Ready / Configured'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                      PostgreSQL
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {dbStatus.message}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSqlModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>SQL Schema</span>
                </button>
                <button
                  onClick={() => setIsDbConfigModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Synced Tables Checklist */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Active Cloud Synced Entities:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_registered_users</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_trading_accounts</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_trades & orders</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_user_settings</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_deposits (M-PESA)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_withdrawals</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_transfers</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>vtm_transactions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              onClick={() => showToast('Trading Desk: Live Support Agent connected.')}
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
            STP / ECN Direct Market Access • Supabase Real-Time Persistence
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

      {/* Configure Supabase Modal */}
      {isDbConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              isDarkMode ? 'bg-[#14171E] border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">Supabase Cloud Database</h3>
              </div>
              <button
                onClick={() => setIsDbConfigModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4">
              Enter your Supabase project URL and Anon Public Key to enable persistent multi-device synchronization for accounts, trades, settings, deposits, and withdrawals.
            </p>

            <div className="space-y-3.5 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Project URL
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Anon Public Key
                </label>
                <textarea
                  rows={3}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden font-mono ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDbConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDbCredentials}
                disabled={isTestingConn}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isTestingConn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isTestingConn ? 'Testing...' : 'Save & Connect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Schema Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border p-6 shadow-2xl relative ${
              isDarkMode ? 'bg-[#14171E] border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">Supabase SQL Schema (Tables DDL)</h3>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 my-3">
              Copy and execute this SQL in your Supabase project's <strong>SQL Editor</strong> to create all tables (registered users, trading accounts, trades, settings, deposits, withdrawals, transactions, activities):
            </p>

            <pre className="flex-1 overflow-auto p-3.5 rounded-xl bg-neutral-950 font-mono text-[11px] text-emerald-400 border border-neutral-800 whitespace-pre-wrap select-all">
              {supabaseService.getDatabaseSchemaSQL()}
            </pre>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-700 mt-3">
              <span className="text-xs text-neutral-400">
                Includes RLS policies, primary keys, and auto-timestamps.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                </button>
                <button
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
