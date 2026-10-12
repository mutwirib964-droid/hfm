import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  QrCode,
  Sparkles,
} from 'lucide-react';
import {
  formatSecretForDisplay,
  generateTotpCodeSync,
  verifyTotpCode,
  getTotpRemainingSeconds,
  buildOtpAuthUri,
  generateQrMatrix,
} from '../utils/totp';

interface Security2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
  userEmail?: string;
  isMandatory?: boolean;
  onToggle2FA: (enabled: boolean, secret?: string) => void;
  onSignOut?: () => void;
}

export const Security2FAModal: React.FC<Security2FAModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  twoFactorEnabled,
  twoFactorSecret,
  userEmail = 'trader@vtmarkets.com',
  isMandatory = false,
  onToggle2FA,
  onSignOut,
}) => {
  const [step, setStep] = useState<'status' | 'setup' | 'disable_verify'>(
    isMandatory || !twoFactorEnabled ? 'setup' : 'status'
  );
  const [authCode, setAuthCode] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedLiveCode, setCopiedLiveCode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [showQr, setShowQr] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(isMandatory || !twoFactorEnabled ? 'setup' : 'status');
      setAuthCode('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, isMandatory, twoFactorEnabled]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const cleanSecret = (twoFactorSecret || 'JBSWY3DPEHPK3PXP').replace(/\s+/g, '').toUpperCase();
  const formattedSecret = formatSecretForDisplay(cleanSecret);
  const liveTotpCode = useMemo(() => generateTotpCodeSync(cleanSecret, nowMs), [cleanSecret, nowMs]);
  const remainingSec = getTotpRemainingSeconds(nowMs);
  const otpUri = useMemo(() => buildOtpAuthUri(userEmail, cleanSecret), [userEmail, cleanSecret]);
  const qrMatrix = useMemo(() => generateQrMatrix(otpUri), [otpUri]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(cleanSecret).catch(() => {});
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleUseLiveCode = () => {
    setAuthCode(liveTotpCode);
    setErrorMsg(null);
    navigator.clipboard.writeText(liveTotpCode).catch(() => {});
    setCopiedLiveCode(true);
    setTimeout(() => setCopiedLiveCode(false), 1800);
  };

  const handleVerifyAndActivate = () => {
    const cleanInput = authCode.replace(/\D/g, '');
    if (cleanInput.length !== 6) {
      setErrorMsg('Please enter the 6-digit TOTP code from your Authenticator or TOTP generator.');
      return;
    }
    if (!verifyTotpCode(cleanSecret, cleanInput)) {
      setErrorMsg('Invalid or expired 6-digit TOTP code. Please use the current active code.');
      return;
    }
    setErrorMsg(null);
    onToggle2FA(true, cleanSecret);
    setSuccessMsg('Two-Factor Authentication (TOTP) verified and activated!');
    setTimeout(() => {
      setSuccessMsg(null);
      setAuthCode('');
      if (isMandatory) {
        onClose();
      } else {
        setStep('status');
      }
    }, 900);
  };

  const handleVerifyAndDisable = () => {
    const cleanInput = authCode.replace(/\D/g, '');
    if (cleanInput.length !== 6 || !verifyTotpCode(cleanSecret, cleanInput)) {
      setErrorMsg('Enter a valid 6-digit TOTP code to modify 2FA security settings.');
      return;
    }
    setErrorMsg(null);
    onToggle2FA(false, cleanSecret);
    setSuccessMsg('Two-Factor Authentication updated.');
    setTimeout(() => {
      setSuccessMsg(null);
      setAuthCode('');
      setStep('status');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode
            ? 'bg-[#13161C] border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isDarkMode ? 'border-neutral-800/80 bg-[#171B22]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm sm:text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isMandatory ? 'Mandatory 2FA Security Setup' : 'Account Security & TOTP 2FA'}
                </h2>
                {isMandatory && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Required
                  </span>
                )}
              </div>
              <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                {isMandatory
                  ? 'Activate TOTP to secure withdrawals & settings modifications'
                  : 'Time-Based One-Time Password (RFC 6238) Protection'}
              </p>
            </div>
          </div>

          {!isMandatory ? (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode
                  ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {isMandatory && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <span className="font-bold">Security Policy:</span> All VTM Markets accounts require Two-Factor Authentication (2FA) upon login. Your 6-digit TOTP code will be required whenever you{' '}
                <span className="font-bold underline">withdraw funds</span> or{' '}
                <span className="font-bold underline">modify platform settings</span>.
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'status' && !isMandatory ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      twoFactorEnabled
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      TOTP Authenticator Generator
                    </h3>
                    <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {twoFactorEnabled
                        ? 'Securing withdrawals & platform settings'
                        : 'Disabled — Setup required'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                    twoFactorEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}
                >
                  {twoFactorEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>

              {/* Built-in Live TOTP Generator Card so user can always view their current 6-digit code */}
              {twoFactorEnabled && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 ${
                    isDarkMode ? 'bg-[#0E1015] border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Active TOTP Generator (30s Window)</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-neutral-400">
                      Refreshes in {remainingSec}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="font-mono text-2xl font-black tracking-[0.25em] text-emerald-500 tabular-nums">
                      {liveTotpCode.slice(0, 3)} {liveTotpCode.slice(3)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(liveTotpCode).catch(() => {});
                        setCopiedLiveCode(true);
                        setTimeout(() => setCopiedLiveCode(false), 1800);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDarkMode
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                      }`}
                    >
                      {copiedLiveCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(remainingSec / 30) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {twoFactorEnabled ? (
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`font-bold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-800'}`}>
                      Protected Operations:
                    </span>
                    <ul className={`space-y-1.5 text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>All M-PESA, Bank &amp; Crypto withdrawals require 6-digit TOTP verification</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Execution preferences, slippage &amp; risk settings modifications require 2FA</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setAuthCode('');
                      setStep('setup');
                    }}
                    className={`w-full py-2.5 border rounded-xl font-bold transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    View Secret Key / Re-Verify Authenticator
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className={`leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Protect your funds, withdrawals, and terminal settings from unauthorized access by requiring a time-based 6-digit TOTP code.
                  </p>

                  <button
                    onClick={() => setStep('setup')}
                    className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Set Up Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>
          ) : step === 'disable_verify' ? (
            <div className="space-y-4">
              <p className={`text-xs ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Enter your current 6-digit TOTP code to confirm this security change:
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                className={`w-full border rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#E51937] ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className={`w-1/3 py-2.5 rounded-xl font-bold cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndDisable}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Verify TOTP Code
                </button>
              </div>
            </div>
          ) : (
            /* TOTP Setup & Verification Flow */
            <div className="space-y-4">
              {/* Step 1: Secret Key & Optional QR */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                    }`}
                  >
                    Step 1: Authenticator Secret Key
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQr((prev) => !prev)}
                    className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQr ? 'Hide QR Code' : 'Show QR Code'}</span>
                  </button>
                </div>

                {showQr && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <svg
                        viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                        className="w-32 h-32"
                        shapeRendering="crispEdges"
                      >
                        {qrMatrix.map((row, rIdx) =>
                          row.map((cell, cIdx) =>
                            cell ? (
                              <rect
                                key={`${rIdx}-${cIdx}`}
                                x={cIdx}
                                y={rIdx}
                                width={1}
                                height={1}
                                fill="#0B0C0E"
                              />
                            ) : null
                          )
                        )}
                      </svg>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1.5">
                      Scan with Google Authenticator or Authy ({userEmail})
                    </span>
                  </div>
                )}

                <div
                  className={`font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 tracking-widest p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                    isDarkMode ? 'bg-black/40 border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="truncate">{formattedSecret}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className={`px-2 py-1 rounded text-[11px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-800 text-neutral-300 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Built-in Live TOTP Generator Box */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isDarkMode
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Built-In TOTP Code Generator</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-500 tabular-nums">
                    {remainingSec}s remaining
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-2xl font-black tracking-[0.22em] text-emerald-500 tabular-nums">
                      {liveTotpCode}
                    </div>
                    <p className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Live RFC 6238 TOTP code synced to your secret key
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseLiveCode}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    {copiedLiveCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Filled!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Auto-Fill Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(remainingSec / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Step 2: Enter 6-Digit Code */}
              <div className="space-y-1.5">
                <label className={`font-bold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                  Step 2: Enter 6-Digit TOTP Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyAndActivate();
                  }}
                  className={`w-full border rounded-xl px-4 py-3 text-center text-2xl font-mono font-black tracking-[0.35em] tabular-nums focus:outline-none focus:border-[#E51937] ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {!isMandatory && (
                  <button
                    type="button"
                    onClick={() => setStep('status')}
                    className={`w-1/3 py-3 rounded-xl font-bold cursor-pointer ${
                      isDarkMode
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVerifyAndActivate}
                  className="flex-1 py-3 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isMandatory ? 'Verify TOTP & Unlock Terminal' : 'Confirm & Activate 2FA'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TotpVerificationModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  isDarkMode: boolean;
  twoFactorSecret: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const TotpVerificationModal: React.FC<TotpVerificationModalProps> = ({
  isOpen,
  title = '2FA Security Verification Required',
  subtitle = 'Enter your 6-digit TOTP code to authorize this action.',
  actionLabel = 'Verify & Continue',
  isDarkMode,
  twoFactorSecret,
  onVerified,
  onCancel,
}) => {
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [showGenerator, setShowGenerator] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      setNowMs(Date.now());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const cleanSecret = (twoFactorSecret || 'JBSWY3DPEHPK3PXP').replace(/\s+/g, '').toUpperCase();
  const liveCode = useMemo(() => generateTotpCodeSync(cleanSecret, nowMs), [cleanSecret, nowMs]);
  const remainingSec = getTotpRemainingSeconds(nowMs);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = code.replace(/\D/g, '');
    if (cleanInput.length !== 6) {
      setError('Please enter a 6-digit TOTP verification code.');
      return;
    }
    if (!verifyTotpCode(cleanSecret, cleanInput)) {
      setError('Invalid or expired 6-digit TOTP code. Please verify and try again.');
      return;
    }
    setError(null);
    onVerified();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden ${
          isDarkMode
            ? 'bg-[#14171E] border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between px-4 py-3.5 border-b ${
            isDarkMode ? 'border-neutral-800 bg-[#181C24]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">{title}</h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                TOTP 2FA Protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={`p-1 rounded-lg cursor-pointer ${
              isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <p className={`leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
            {subtitle}
          </p>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Built-in TOTP Generator Helper */}
          <div
            className={`p-3 rounded-xl border space-y-2 ${
              isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>TOTP Authenticator Token</span>
              </span>
              <button
                type="button"
                onClick={() => setShowGenerator((prev) => !prev)}
                className="text-[10px] font-bold text-neutral-400 hover:text-white cursor-pointer"
              >
                {showGenerator ? `${remainingSec}s` : 'Show Token'}
              </button>
            </div>

            {showGenerator && (
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xl font-black tracking-[0.22em] text-emerald-500 tabular-nums">
                  {liveCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCode(liveCode);
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={`block font-bold mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              6-Digit TOTP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-center text-xl font-mono font-black tracking-[0.35em] tabular-nums focus:outline-none focus:border-emerald-500 ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className={`w-1/3 py-2.5 rounded-xl font-bold cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#E51937] hover:bg-[#c9142f] text-white font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
