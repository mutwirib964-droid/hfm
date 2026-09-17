import React, { useState } from 'react';
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
} from 'lucide-react';

interface Security2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  twoFactorEnabled: boolean;
  onToggle2FA: (enabled: boolean) => void;
}

export const Security2FAModal: React.FC<Security2FAModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  twoFactorEnabled,
  onToggle2FA,
}) => {
  const [step, setStep] = useState<'status' | 'setup'>('status');
  const [authCode, setAuthCode] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const secretKey = 'J7NM 4KW2 P9LX 8VRQ';

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey.replace(/\s+/g, ''));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleVerifyAndActivate = () => {
    if (authCode.length < 6) {
      setErrorMsg('Please enter a valid 6-digit code from Google Authenticator or Authy.');
      return;
    }
    setErrorMsg(null);
    onToggle2FA(true);
    setSuccessMsg('Two-Factor Authentication successfully enabled!');
    setTimeout(() => {
      setSuccessMsg(null);
      setStep('status');
    }, 1500);
  };

  const handleDisable2FA = () => {
    onToggle2FA(false);
    setSuccessMsg('Two-Factor Authentication disabled.');
    setTimeout(() => {
      setSuccessMsg(null);
      setStep('status');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#15181E] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Account Security & 2FA</h2>
              <p className="text-xs text-neutral-400">Two-Factor Authentication Protection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'status' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${twoFactorEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Authenticator App (TOTP)</h3>
                    <p className="text-neutral-400 text-[11px]">
                      {twoFactorEnabled ? 'Currently protecting logins & withdrawals' : 'Disabled — Not protected'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    twoFactorEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {twoFactorEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>

              {twoFactorEnabled ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <span className="font-bold text-neutral-300 block">Security Features Enabled:</span>
                    <ul className="space-y-1.5 text-[11px] text-neutral-400">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Withdrawal authorization requires 6-digit TOTP code</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Password changes & profile modifications protected</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDisable2FA}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-rose-950/70 text-rose-400 border border-rose-900/40 rounded-xl font-bold transition-colors"
                  >
                    Deactivate Two-Factor Authentication
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-neutral-400 leading-relaxed">
                    Protect your funds, trades, and personal data from unauthorized access by requiring a time-based 6-digit code on sensitive operations.
                  </p>

                  <button
                    onClick={() => setStep('setup')}
                    className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                  >
                    Set Up Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Setup Flow */
            <div className="space-y-4">
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2 text-center">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Step 1: Link Secret Key in Google Authenticator
                </span>
                <div className="font-mono text-base font-black text-amber-400 tracking-widest bg-black/40 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-center gap-2">
                  <span>{secretKey}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-neutral-400 hover:text-white"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-300 block">
                  Step 2: Enter the 6-digit code generated by your app
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-[#E51937]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  className="w-1/3 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndActivate}
                  className="flex-1 py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                >
                  Confirm & Protect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
