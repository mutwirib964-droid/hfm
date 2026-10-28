import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Gift,
  Coins,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';
import { UserAuthProfile } from '../types/botTypes';
import {
  referralService,
  ReferralState,
  MIN_CLAIM_AMOUNT_USD,
} from '../services/referralService';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  currentUser?: UserAuthProfile | null;
  onClaimCommissionToWallet: (amount: number) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  currentUser,
  onClaimCommissionToWallet,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [claimErrorMsg, setClaimErrorMsg] = useState<string | null>(null);

  const [state, setState] = useState<ReferralState>(() =>
    referralService.getReferralState(currentUser?.email, currentUser?.accountNumber)
  );

  useEffect(() => {
    if (isOpen) {
      const refreshed = referralService.getReferralState(
        currentUser?.email,
        currentUser?.accountNumber
      );
      setState(refreshed);
      setClaimSuccessMsg(null);
      setClaimErrorMsg(null);
    }

    const handleRealtimeUpdate = () => {
      const refreshed = referralService.getReferralState(
        currentUser?.email,
        currentUser?.accountNumber
      );
      setState(refreshed);
    };

    window.addEventListener('vtm_referral_update', handleRealtimeUpdate);
    window.addEventListener('storage', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('vtm_referral_update', handleRealtimeUpdate);
      window.removeEventListener('storage', handleRealtimeUpdate);
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(state.referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(state.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trade on VTM with Institutional Execution',
          text: `Join VTM and trade Forex, Indices & Crypto with 0.0 pip spreads. Use my referral code ${state.referralCode}:`,
          url: state.referralLink,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join VTM with institutional spreads & copy trading! Use my referral code *${state.referralCode}*:\n${state.referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `Join VTM with institutional spreads! Use referral code ${state.referralCode}:`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(state.referralLink)}&text=${text}`, '_blank');
  };

  const handleClaim = () => {
    setClaimErrorMsg(null);
    setClaimSuccessMsg(null);

    const userEmail = currentUser?.email || 'guest@vtm.com';
    const result = referralService.claimCommission(userEmail);

    if (!result.success) {
      setClaimErrorMsg(result.error || 'Failed to claim commission.');
      return;
    }

    setState(result.state);
    onClaimCommissionToWallet(result.claimedAmount);
    setClaimSuccessMsg(
      `Successfully claimed $${result.claimedAmount.toFixed(2)} USD! The funds have been credited directly to your Live Wallet.`
    );
  };

  const isClaimEligible = state.availableCommissionUsd >= MIN_CLAIM_AMOUNT_USD;
  const progressPercent = Math.min(
    100,
    Math.round((state.availableCommissionUsd / MIN_CLAIM_AMOUNT_USD) * 100)
  );
  const remainingUsd = Math.max(0, Number((MIN_CLAIM_AMOUNT_USD - state.availableCommissionUsd).toFixed(2)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-w-0 ${
          isDarkMode
            ? 'bg-[#0E1117] border-neutral-800 text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-3.5 sm:px-5 py-3.5 sm:py-4 border-b ${
            isDarkMode
              ? 'border-neutral-800 bg-gradient-to-r from-[#141822] via-[#10131A] to-[#141822]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 via-blue-500/15 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner shrink-0">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2
                className={`text-sm sm:text-lg font-black tracking-tight font-sans truncate ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Referral &amp; Affiliate Program
              </h2>
              <p
                className={`text-[11px] sm:text-xs font-medium leading-snug ${
                  isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                }`}
              >
                Earn commissions when your referrals deposit (min. $16) • Claim from $20.00
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer border border-transparent shrink-0 ${
              isDarkMode
                ? 'hover:bg-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className={`flex items-center gap-1 px-3.5 sm:px-5 pt-2.5 border-b text-xs font-bold overflow-x-auto no-scrollbar ${
            isDarkMode ? 'border-neutral-800 bg-[#12151D]' : 'border-slate-200 bg-slate-100/60'
          }`}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : isDarkMode
                ? 'border-transparent text-neutral-400 hover:text-neutral-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Refer &amp; Earn</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'referrals'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : isDarkMode
                ? 'border-transparent text-neutral-400 hover:text-neutral-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Referrals ({state.referrals.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overflow-x-hidden space-y-3.5 sm:space-y-4 no-scrollbar min-w-0">
          {/* Notifications */}
          {claimSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-semibold">{claimSuccessMsg}</span>
            </div>
          )}

          {claimErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{claimErrorMsg}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* Program Rule Explainer Banner */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border relative overflow-hidden ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-emerald-950/30 via-[#131922] to-blue-950/20 border-emerald-500/30'
                    : 'bg-emerald-50/80 border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      Deposit Commission Program
                    </span>
                    <h3 className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Earn cash commissions when your referrals deposit.
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      Share your referral link with traders. When your referrals make a deposit of minimum{' '}
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>$16.00</span>, you will earn commissions credited directly to your referral balance. Once your commissions reach{' '}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">$20.00</span>, you can claim the funds directly into your Live Wallet.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-500/20 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                  <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-black/25 border-white/5' : 'bg-white border-emerald-200/80 shadow-2xs'}`}>
                    <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Min. Deposit</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">$16.00</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-black/25 border-white/5' : 'bg-white border-emerald-200/80 shadow-2xs'}`}>
                    <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Min. Claim</span>
                    <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono">$20.00</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-black/25 border-white/5' : 'bg-white border-emerald-200/80 shadow-2xs'}`}>
                    <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Available</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${state.availableCommissionUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings & Claim Progress Card */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider block ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Available Commission to Claim
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                        ${state.availableCommissionUsd.toFixed(2)}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        / ${MIN_CLAIM_AMOUNT_USD.toFixed(2)} Target
                      </span>
                    </div>
                  </div>

                  {isClaimEligible ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs shrink-0">
                      <Unlock className="w-3.5 h-3.5" />
                      Claim Ready!
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      ${remainingUsd.toFixed(2)} Remaining
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-3.5">
                  <div className={`flex items-center justify-between flex-wrap gap-1 text-[10px] sm:text-[11px] font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    <span>Progress: {progressPercent}% of $20.00 goal</span>
                    <span>Referral Deposits: ${state.totalReferralDepositsUsd.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isClaimEligible
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  onClick={handleClaim}
                  disabled={!isClaimEligible}
                  className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                    isClaimEligible
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.99]'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-70'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">
                    {isClaimEligible
                      ? `Claim $${state.availableCommissionUsd.toFixed(2)} to Live Wallet`
                      : `Minimum $20.00 Required to Claim ($${remainingUsd.toFixed(2)} needed)`}
                  </span>
                </button>
              </div>

              {/* Share Box (Compact & Strictly Contained on Mobile Screens) */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 min-w-0 overflow-hidden ${
                  isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Share2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Share Your Link &amp; Code</span>
                  </span>
                  <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Passive Earnings on Referral Deposits
                  </span>
                </div>

                {/* Referral Link Input — stacks vertically on mobile to prevent overflow */}
                <div className="min-w-0 w-full">
                  <label className={`text-[11px] font-medium block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Your Personal Referral Link:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
                    <input
                      type="text"
                      readOnly
                      value={state.referralLink}
                      className={`w-full sm:w-0 sm:flex-1 px-3 py-2 rounded-xl text-xs font-mono border outline-none truncate ${
                        isDarkMode
                          ? 'bg-[#0E1117] border-neutral-700 text-neutral-200'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Referral Code */}
                <div className="min-w-0 w-full">
                  <label className={`text-[11px] font-medium block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Your Referral Code:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
                    <div
                      className={`w-full sm:w-0 sm:flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wider border truncate text-center sm:text-left ${
                        isDarkMode
                          ? 'bg-[#0E1117] border-neutral-700 text-emerald-400'
                          : 'bg-white border-slate-300 text-emerald-700'
                      }`}
                    >
                      {state.referralCode}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Share Buttons */}
                <div className="pt-1.5 grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="min-w-0 py-2 px-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareTelegram}
                    className="min-w-0 py-2 px-2 rounded-xl bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Telegram</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareNative}
                    className="min-w-0 py-2 px-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Share More</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-4 min-w-0">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Referred Traders</span>
                  <span className={`text-sm sm:text-base font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {state.referrals.length}
                  </span>
                </div>

                <div
                  className={`p-2.5 sm:p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Total Deposited</span>
                  <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    ${state.totalReferralDepositsUsd.toFixed(2)}
                  </span>
                </div>

                <div
                  className={`p-2.5 sm:p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] block font-medium truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Total Earned</span>
                  <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ${state.totalCommissionEarnedUsd.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Referrals List */}
              <div
                className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`p-3 border-b font-bold text-xs flex items-center justify-between ${isDarkMode ? 'border-neutral-800/60' : 'border-slate-200 bg-slate-50'}`}>
                  <span>Referred Accounts</span>
                  <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Earned Commissions</span>
                </div>

                {state.referrals.length === 0 ? (
                  <div className={`p-8 text-center text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    No referred traders yet. Share your referral link above to earn commissions when your referrals make a deposit!
                  </div>
                ) : (
                  <div className={`divide-y text-xs ${isDarkMode ? 'divide-neutral-800/40' : 'divide-slate-200'}`}>
                    {state.referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className={`p-3 flex items-center justify-between gap-2 transition-colors ${isDarkMode ? 'hover:bg-neutral-800/20' : 'hover:bg-slate-50'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {ref.referredName}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-200 text-slate-700'}`}>
                              #{ref.referredAccountNumber}
                            </span>
                          </div>
                          <span className={`text-[11px] font-mono block ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                            Joined {new Date(ref.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[11px] block font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                            First Deposit: ${ref.totalDepositedUsd.toFixed(2)}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                            +${ref.totalCommissionUsd.toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Claims History */}
              {state.claims.length > 0 && (
                <div
                  className={`rounded-2xl border overflow-hidden ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`p-3 border-b font-bold text-xs flex items-center justify-between ${isDarkMode ? 'border-neutral-800/60' : 'border-slate-200 bg-slate-50'}`}>
                    <span>Payout &amp; Claim History</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      Total Claimed: ${state.totalClaimedUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className={`divide-y text-xs ${isDarkMode ? 'divide-neutral-800/40' : 'divide-slate-200'}`}>
                    {state.claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            +${claim.amountUsd.toFixed(2)} USD
                          </span>
                          <span className={`text-[10px] block font-mono truncate ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                            Ref: {claim.walletTxReference}
                          </span>
                        </div>
                        <div className={`text-right text-[11px] font-mono shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {new Date(claim.claimedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

