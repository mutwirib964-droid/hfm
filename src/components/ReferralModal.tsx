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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode
            ? 'bg-[#0E1117] border-neutral-800 text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode
              ? 'border-neutral-800 bg-gradient-to-r from-[#141822] via-[#10131A] to-[#141822]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 via-blue-500/15 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
              <Gift className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2
                className={`text-base sm:text-lg font-black tracking-tight font-sans ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Referral &amp; Affiliate Program
              </h2>
              <p
                className={`text-xs font-medium ${
                  isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                }`}
              >
                Earn commissions when your referrals deposit (minimum deposit of $16) • Claim from $20.00
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer border border-transparent ${
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
          className={`flex items-center gap-1 px-5 pt-3 border-b text-xs font-bold ${
            isDarkMode ? 'border-neutral-800 bg-[#12151D]' : 'border-slate-200 bg-slate-100/60'
          }`}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Refer &amp; Earn</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'referrals'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Referrals ({state.referrals.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Notifications */}
          {claimSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold">{claimSuccessMsg}</span>
            </div>
          )}

          {claimErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{claimErrorMsg}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* Program Rule Explainer Banner */}
              <div
                className={`p-4 rounded-2xl border relative overflow-hidden ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-emerald-950/30 via-[#131922] to-blue-950/20 border-emerald-500/30'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-500 block mb-1">
                      Deposit Commission Program
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      Earn cash commissions when your referrals deposit.
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">
                      Share your referral link with traders. When your referrals make a deposit of minimum <span className="font-bold text-slate-900 dark:text-white">$16.00</span>, you will earn commissions credited directly to your referral balance. Once your commissions reach <span className="font-bold text-emerald-500">$20.00</span>, you can claim the funds directly into your Live Wallet.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-500/20 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-black/20">
                    <span className="text-[10px] text-neutral-400 block font-medium">Min. Referral Deposit</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">$16.00</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/20">
                    <span className="text-[10px] text-neutral-400 block font-medium">Minimum Claim</span>
                    <span className="text-sm font-black text-amber-400 font-mono">$20.00</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/20">
                    <span className="text-[10px] text-neutral-400 block font-medium">Available Balance</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ${state.availableCommissionUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings & Claim Progress Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                      Available Commission to Claim
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black font-mono tracking-tight text-emerald-500">
                        ${state.availableCommissionUsd.toFixed(2)}
                      </span>
                      <span className="text-xs text-neutral-400">
                        / ${MIN_CLAIM_AMOUNT_USD.toFixed(2)} Target
                      </span>
                    </div>
                  </div>

                  {isClaimEligible ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                      <Unlock className="w-3.5 h-3.5" />
                      Claim Ready!
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      ${remainingUsd.toFixed(2)} Remaining
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Progress: {progressPercent}% of $20.00 claim goal</span>
                    <span>Total Referral Deposits: ${state.totalReferralDepositsUsd.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden p-0.5">
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
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isClaimEligible
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.99]'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {isClaimEligible
                      ? `Claim $${state.availableCommissionUsd.toFixed(2)} to Live Wallet`
                      : `Minimum $20.00 Required to Claim ($${remainingUsd.toFixed(2)} needed)`}
                  </span>
                </button>
              </div>

              {/* Share Box */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    Share Your Link &amp; Code
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Passive Earnings on Referral Deposits
                  </span>
                </div>

                {/* Referral Link Input */}
                <div>
                  <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                    Your Personal Referral Link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={state.referralLink}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                        isDarkMode
                          ? 'bg-[#0E1117] border-neutral-700 text-neutral-200'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                    Your Referral Code:
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wider border ${
                        isDarkMode
                          ? 'bg-[#0E1117] border-neutral-700 text-emerald-400'
                          : 'bg-white border-slate-300 text-emerald-600'
                      }`}
                    >
                      {state.referralCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Share Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-500 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={handleShareTelegram}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/30 text-sky-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </button>

                  <button
                    onClick={handleShareNative}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share More</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-4">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[10px] text-neutral-400 block font-medium">Referred Traders</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {state.referrals.length}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[10px] text-neutral-400 block font-medium">Total Deposited</span>
                  <span className="text-base font-black text-blue-400 font-mono">
                    ${state.totalReferralDepositsUsd.toFixed(2)}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-[#141822] border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[10px] text-neutral-400 block font-medium">Total Earned</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
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
                <div className="p-3 border-b border-neutral-800/60 font-bold text-xs flex items-center justify-between">
                  <span>Referred Accounts</span>
                  <span className="text-[10px] font-mono text-neutral-400">Earned Commissions</span>
                </div>

                {state.referrals.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 text-xs">
                    No referred traders yet. Share your referral link above to earn commissions when your referrals make a deposit!
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/40 text-xs">
                    {state.referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-3 flex items-center justify-between hover:bg-neutral-800/20 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ref.referredName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                              #{ref.referredAccountNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            Joined {new Date(ref.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-neutral-400 block font-mono">
                            Deposits: ${ref.totalDepositedUsd.toFixed(2)}
                          </span>
                          <span className="font-bold text-emerald-500 font-mono text-xs">
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
                  <div className="p-3 border-b border-neutral-800/60 font-bold text-xs flex items-center justify-between">
                    <span>Payout &amp; Claim History</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Total Claimed: ${state.totalClaimedUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-800/40 text-xs">
                    {state.claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-emerald-400 font-mono">
                            +${claim.amountUsd.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-neutral-400 block font-mono">
                            Ref: {claim.walletTxReference}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-neutral-400 font-mono">
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
