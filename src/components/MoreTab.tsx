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
} from 'lucide-react';

interface MoreTabProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  oneClickTrading: boolean;
  onToggleOneClick: () => void;
}

export const MoreTab: React.FC<MoreTabProps> = ({
  isDarkMode,
  onToggleTheme,
  oneClickTrading,
  onToggleOneClick,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSpreadBrackets, setShowSpreadBrackets] = useState<boolean>(true);
  const [drawdownProtection, setDrawdownProtection] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
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
          <p className="text-xs text-neutral-400">Trading configuration, charts & security</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Equinix LD4 (12ms)</span>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Section 1: Execution & Order Preferences */}
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
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Slippage Tolerance</h3>
                  <p className="text-xs text-neutral-400">Maximum allowed deviation on market orders</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                {[0.2, 0.5, 1.0, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSlippage(s);
                      showToast(`Slippage tolerance set to ${s} pips`);
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      slippage === s
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {s}p
                  </button>
                ))}
              </div>
            </div>

            {/* Sound FX on Fill */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">Execution Acoustic Alert</h3>
                  <p className="text-xs text-neutral-400">Play chime when TP/SL or market orders execute</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  showToast(`Audio alerts ${!soundEnabled ? 'Enabled' : 'Muted'}`);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  soundEnabled ? 'bg-blue-600' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
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

        {/* Section 2: Charting & TradingView Fidelity */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            Charting & TradingView Engine
          </h2>
          <div
            className={`rounded-2xl border divide-y overflow-hidden ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800 divide-neutral-800/70'
                : 'bg-white border-neutral-200 divide-neutral-100 shadow-xs'
            }`}
          >
            {/* Spread Bracket Markers */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <LineChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Live Bid/Ask Spread Brackets</h3>
                  <p className="text-xs text-neutral-400">Show exact spread pip zones between buy and sell</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSpreadBrackets(!showSpreadBrackets);
                  showToast(`Spread brackets on charts: ${!showSpreadBrackets ? 'ON' : 'OFF'}`);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  showSpreadBrackets ? 'bg-blue-600' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    showSpreadBrackets ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Appearance Theme */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-500/15 text-neutral-400">
                  {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">Theme & Visual Atmosphere</h3>
                  <p className="text-xs text-neutral-400">
                    Currently in {isDarkMode ? 'Pro Dark Canvas' : 'Refined Light Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Toggle {isDarkMode ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Risk Controls & Account Protection */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            Risk & Account Protection
          </h2>
          <div
            className={`rounded-2xl border divide-y overflow-hidden ${
              isDarkMode
                ? 'bg-[#181B20] border-neutral-800 divide-neutral-800/70'
                : 'bg-white border-neutral-200 divide-neutral-100 shadow-xs'
            }`}
          >
            {/* Daily Drawdown Limiter */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Daily Drawdown Limiter</h3>
                  <p className="text-xs text-neutral-400">Lock trading if portfolio drops &gt;5% in 24 hours</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDrawdownProtection(!drawdownProtection);
                  showToast(
                    `Daily Drawdown Shield ${!drawdownProtection ? 'ENABLED (5% Cap)' : 'DISABLED'}`
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
              onClick={() => showToast('Two-Factor Authentication is verified & active.')}
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
                Active
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              </span>
            </div>

            {/* 24/7 Dedicated Support */}
            <div
              onClick={() => showToast('Priority Trading Desk: Live Support Agent connected.')}
              className="p-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">VIP Trader Support</h3>
                  <p className="text-xs text-neutral-400">24/7 Priority Execution Desk & Market Queries</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 pb-6 text-xs text-neutral-400 space-y-1">
          <p className="font-semibold">Terminal Build: v4.8.0 PRO (Equinix LD4 Edition)</p>
          <p className="text-[11px] text-neutral-500">
            STP / ECN Direct Market Access • Low Latency Order Execution
          </p>
        </div>
      </div>
    </div>
  );
};
