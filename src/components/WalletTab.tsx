import React, { useState, useEffect } from 'react';
import { TradingAccount, Transaction } from '../types';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ArrowUpDown,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  FileText,
  AlertCircle,
  Lock,
  Smartphone,
  Zap,
  Coins,
  Check,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { UserAuthProfile } from '../types';
import { MpesaDepositModal } from './MpesaDepositModal';
import {
  USD_KES_RATE,
  USD_KES_WITHDRAW_RATE,
  WELL_KNOWN_AFRICAN_BANKS,
  HASHBACK_ACCOUNT_ID,
} from '../services/hashbackService';

interface WalletTabProps {
  accounts: TradingAccount[];
  walletBalance: number;
  transactions: Transaction[];
  onDeposit: (params: { method: string; amount: number; targetAccount: string; reference?: string }) => void;
  onWithdraw: (params: {
    method: string;
    amount: number;
    sourceAccount: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING';
  }) => void;
  onTransfer: (params: { fromAccount: string; toAccount: string; amount: number }) => void;
  selectedAccount?: TradingAccount | null;
  onSelectAccount?: (account: TradingAccount) => void;
  onDeleteAccount?: (accountIdOrNumber: string) => void;
  isDarkMode?: boolean;
  currentUser?: UserAuthProfile | null;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  accounts,
  walletBalance,
  transactions,
  onDeposit,
  onWithdraw,
  onTransfer,
  selectedAccount,
  onSelectAccount,
  onDeleteAccount,
  isDarkMode = false,
  currentUser,
}) => {
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [depositTarget, setDepositTarget] = useState<string>('VTM One Wallet');

  const liveAccounts = accounts.filter((a) => a.type === 'Live');
  const demoAccounts = accounts.filter((a) => a.type === 'Demo');

  // Withdraw Form State - Strictly Minimum $35 for M-PESA/Bank, $50 for Crypto
  const [withdrawMethod, setWithdrawMethod] = useState<'mpesa' | 'bank' | 'crypto'>('mpesa');
  const [withdrawBankId, setWithdrawBankId] = useState<string>(WELL_KNOWN_AFRICAN_BANKS[0].id);
  const [withdrawBankAccount, setWithdrawBankAccount] = useState<string>('');
  const [withdrawBankHolder, setWithdrawBankHolder] = useState<string>(currentUser?.fullName || '');
  const [withdrawCryptoCoin, setWithdrawCryptoCoin] = useState<'BTC' | 'USDT' | 'ETH'>('BTC');
  const [withdrawCryptoAddress, setWithdrawCryptoAddress] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(35);
  const [withdrawSource, setWithdrawSource] = useState('VTM Wallet');
  const [withdrawStep, setWithdrawStep] = useState<'FORM' | 'PROCESSING' | 'SUCCESS'>('FORM');
  const [withdrawCountdown, setWithdrawCountdown] = useState<number>(5);
  const [withdrawReceipt, setWithdrawReceipt] = useState<string>('');

  // Transfer Form State
  const [transferFrom, setTransferFrom] = useState('VTM Wallet');
  const [transferTo, setTransferTo] = useState(liveAccounts[0]?.accountNumber || '');
  const [transferAmount, setTransferAmount] = useState<number>(100);

  // Keep transfer source and destination valid whenever accounts update
  useEffect(() => {
    if (!transferTo && liveAccounts.length > 0) {
      setTransferTo(liveAccounts[0].accountNumber);
    }
  }, [liveAccounts, transferTo]);

  const handleSwapTransfer = () => {
    const prevFrom = transferFrom;
    const prevTo = transferTo;
    setTransferFrom(prevTo);
    setTransferTo(prevFrom);
  };

  const handleFromChange = (newFrom: string) => {
    setTransferFrom(newFrom);
    if (newFrom === transferTo) {
      if (newFrom === 'VTM Wallet') {
        setTransferTo(liveAccounts[0]?.accountNumber || '');
      } else {
        setTransferTo('VTM Wallet');
      }
    }
  };

  const handleToChange = (newTo: string) => {
    setTransferTo(newTo);
    if (newTo === transferFrom) {
      if (newTo === 'VTM Wallet') {
        setTransferFrom(liveAccounts[0]?.accountNumber || '');
      } else {
        setTransferFrom('VTM Wallet');
      }
    }
  };

  const [feedback, setFeedback] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Calculate withdrawable balance for currently selected source
  const getWithdrawableBalance = (source: string) => {
    if (source === 'VTM Wallet' || source === 'VTM One Wallet' || source === 'HF Wallet') {
      return Number(walletBalance.toFixed(2));
    }
    const cleanSource = source.replace(/^Account\s*#/i, '').trim();
    const liveAcc = liveAccounts.find(
      (a) =>
        a.accountNumber === cleanSource ||
        a.accountNumber === source ||
        `Account #${a.accountNumber}` === source ||
        a.id === source
    );
    if (!liveAcc) return 0;
    const usedMargin = liveAcc.margin || 0;
    return Number(Math.max(0, liveAcc.balance - usedMargin).toFixed(2));
  };

  const currentWithdrawable = getWithdrawableBalance(withdrawSource);

  // Calculate transferable balance for currently selected fromAccount
  const getTransferableBalance = (source: string) => {
    if (source === 'VTM Wallet' || source === 'VTM One Wallet' || source === 'HF Wallet') {
      return Number(walletBalance.toFixed(2));
    }
    const cleanSource = source.replace(/^Account\s*#/i, '').trim();
    const liveAcc = liveAccounts.find(
      (a) =>
        a.accountNumber === cleanSource ||
        a.accountNumber === source ||
        `Account #${a.accountNumber}` === source ||
        a.id === source
    );
    if (!liveAcc) return 0;
    const usedMargin = liveAcc.margin || 0;
    return Number(Math.max(0, liveAcc.balance - usedMargin).toFixed(2));
  };

  const currentTransferable = getTransferableBalance(transferFrom);

  // 3-second countdown timer for withdrawal pending -> automatic success transition
  useEffect(() => {
    let timer: any;
    if (withdrawStep === 'PROCESSING') {
      timer = setInterval(() => {
        setWithdrawCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setWithdrawStep('SUCCESS');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [withdrawStep]);

  // Open Withdraw Modal with smart source selection
  const handleOpenWithdraw = (source?: string, method: 'mpesa' | 'bank' | 'crypto' = 'mpesa') => {
    let resolvedSource = source || 'VTM Wallet';
    // If default VTM Wallet has insufficient funds (< $35) and a Live Account has funds, auto-select the funded Live Account
    if (!source || source === 'VTM Wallet') {
      if (walletBalance < 35 && liveAccounts.length > 0) {
        const fundedSelected =
          selectedAccount && selectedAccount.type === 'Live' && selectedAccount.balance >= 35
            ? selectedAccount
            : liveAccounts.find((a) => a.balance >= 35) || liveAccounts[0];
        if (fundedSelected && fundedSelected.balance > walletBalance) {
          resolvedSource = `Account #${fundedSelected.accountNumber}`;
        }
      }
    }
    setWithdrawSource(resolvedSource);
    setWithdrawMethod(method);
    setWithdrawAmount(method === 'crypto' ? 50 : 35);
    setWithdrawError(null);
    setWithdrawStep('FORM');
    setWithdrawCountdown(3);
    setActiveModal('withdraw');
  };

  // Close Withdraw Modal
  const handleCloseWithdraw = () => {
    setWithdrawError(null);
    setWithdrawStep('FORM');
    setActiveModal(null);
  };

  const selectedBankInfo =
    WELL_KNOWN_AFRICAN_BANKS.find((b) => b.id === withdrawBankId) || WELL_KNOWN_AFRICAN_BANKS[0];

  // Trigger Withdrawal (Validates min $35 for M-PESA/Bank, min $50 for Crypto; records PENDING for 3s then shifts to SUCCESSFUL automatically)
  const handleStartWithdrawal = () => {
    setWithdrawError(null);
    const maxAvailable = getWithdrawableBalance(withdrawSource);
    const methodLabel =
      withdrawMethod === 'crypto'
        ? `Crypto Payout (${withdrawCryptoCoin})`
        : withdrawMethod === 'bank'
        ? `${selectedBankInfo.shortName} Transfer`
        : 'Safaricom M-PESA B2C';

    if (maxAvailable <= 0) {
      setWithdrawError('Selected source has $0.00 withdrawable balance. Live accounts must be funded before withdrawal.');
      onWithdraw({
        method: methodLabel,
        amount: withdrawAmount,
        sourceAccount: withdrawSource,
        reference: `FAIL-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'FAILED' as any,
      });
      return;
    }
    const minRequired = withdrawMethod === 'crypto' ? 50 : 35;
    if (withdrawAmount < minRequired) {
      setWithdrawError(`Minimum withdrawal amount for ${withdrawMethod === 'crypto' ? 'Crypto' : withdrawMethod === 'bank' ? 'Bank Transfer' : 'M-PESA'} is $${minRequired}.00 USD.`);
      onWithdraw({
        method: methodLabel,
        amount: withdrawAmount,
        sourceAccount: withdrawSource,
        reference: `FAIL-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'FAILED' as any,
      });
      return;
    }
    if (withdrawAmount > maxAvailable) {
      setWithdrawError(`Withdrawal amount exceeds available balance ($${maxAvailable.toFixed(2)}).`);
      onWithdraw({
        method: methodLabel,
        amount: withdrawAmount,
        sourceAccount: withdrawSource,
        reference: `FAIL-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'FAILED' as any,
      });
      return;
    }
    if (withdrawMethod === 'crypto' && (!withdrawCryptoAddress.trim() || withdrawCryptoAddress.trim().length < 10)) {
      setWithdrawError(`Please enter a valid destination ${withdrawCryptoCoin} wallet address.`);
      return;
    }
    if (withdrawMethod === 'bank' && (!withdrawBankAccount.trim() || withdrawBankAccount.trim().length < 6)) {
      setWithdrawError(`Please enter a valid ${selectedBankInfo.shortName} account number.`);
      return;
    }

    const receipt =
      withdrawMethod === 'crypto'
        ? `TX-${withdrawCryptoCoin}-${Math.floor(100000000 + Math.random() * 900000000)}`
        : withdrawMethod === 'bank'
        ? `BNK-${selectedBankInfo.id.toUpperCase()}-${Math.floor(10000000 + Math.random() * 90000000)}`
        : `B2C${Math.floor(100000000 + Math.random() * 900000000)}`;
    setWithdrawReceipt(receipt);
    setWithdrawCountdown(3);
    setWithdrawStep('PROCESSING');

    // Immediately deduct from account and record as PENDING; App.tsx automatically transitions it to COMPLETED (SUCCESSFUL) after 3 seconds
    onWithdraw({
      method: methodLabel,
      amount: Number(withdrawAmount.toFixed(2)),
      sourceAccount: withdrawSource,
      reference: receipt,
      status: 'PENDING',
    });
  };

  const handleProcessTransfer = () => {
    setTransferError(null);
    if (transferFrom === transferTo) {
      setTransferError('Source and destination accounts must be different.');
      return;
    }
    const maxAvailable = getTransferableBalance(transferFrom);
    if (maxAvailable <= 0) {
      setTransferError('Source account has $0.00 balance available to transfer.');
      return;
    }
    if (transferAmount > maxAvailable) {
      setTransferError(`Transfer amount exceeds available source balance ($${maxAvailable.toFixed(2)}).`);
      return;
    }
    if (transferAmount <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }
    onTransfer({
      fromAccount: transferFrom,
      toAccount: transferTo,
      amount: transferAmount,
    });
    setActiveModal(null);
    setFeedback(`Internal transfer of $${transferAmount.toFixed(2)} completed instantly!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const userPhone =
    currentUser?.phoneNumber ||
    (currentUser as any)?.phone ||
    'Not linked';

  const exactKesToDisburse = Number((withdrawAmount * USD_KES_WITHDRAW_RATE).toFixed(2));

  return (
    <div id="vtm-wallet-tab" className="flex flex-col w-full pb-20 space-y-4 px-2 sm:px-4 pt-2">
      {/* Toast Feedback */}
      {feedback && (
        <div className="bg-[#1C2822] border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Informational banner when viewing Demo Account */}
      {selectedAccount && selectedAccount.type === 'Demo' && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
            isDarkMode
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-amber-300 bg-amber-50 text-amber-950 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <div>
              <div className={`font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>
                Viewing Demo Account #{selectedAccount.accountNumber} ($100,000 Virtual Practice Credit)
              </div>
              <div className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900 font-medium'}`}>
                Demo accounts are credited with simulated virtual funds and cannot be deposited into or withdrawn from. All deposits and withdrawals operate exclusively on real VTM Wallet &amp; Live trading accounts.
              </div>
            </div>
          </div>
          {liveAccounts.length > 0 && onSelectAccount && (
            <button
              onClick={() => onSelectAccount(liveAccounts[0])}
              className="px-3.5 py-1.5 rounded-lg bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-sm"
            >
              Switch to Live Account
            </button>
          )}
        </div>
      )}

      {/* Main Responsive Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (Core Balance Card & Actions) */}
        <div className="lg:col-span-5 space-y-4">
          {/* VTM Wallet Core Balance Card */}
          <div
            className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-xl border ${
              isDarkMode
                ? 'bg-gradient-to-br from-[#1C2028] via-[#16181E] to-[#0E1014] border-neutral-800'
                : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E51937]/15 border border-[#E51937]/30 flex items-center justify-center text-[#E51937]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    VTM One Wallet
                  </span>
                  <h2 className="text-xs font-bold text-white">Central Client Balance</h2>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>Segregated Client Funds</span>
              </div>
            </div>

            {/* Big Balance Number */}
            <div className="mt-4">
              <span className="text-xs text-neutral-400 block font-medium">Available for Trading / Withdrawal</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-neutral-400 font-bold">USD</span>
              </div>
            </div>

            {/* Action Buttons: Deposit, Withdraw, Transfer */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <button
                id="wallet-deposit-action"
                onClick={() => {
                  setDepositTarget('VTM One Wallet');
                  setIsDepositModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/40 transition-all cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Deposit</span>
              </button>

              <button
                id="wallet-withdraw-action"
                onClick={() => handleOpenWithdraw('VTM Wallet')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 hover:text-white font-bold text-xs rounded-xl border border-neutral-700/60 transition-all cursor-pointer"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                <span>Withdraw</span>
              </button>

              <button
                id="wallet-transfer-action"
                onClick={() => {
                  setTransferFrom('VTM Wallet');
                  setTransferTo(liveAccounts[0]?.accountNumber || '');
                  setActiveModal('transfer');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 hover:text-white font-bold text-xs rounded-xl border border-neutral-700/60 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Transfer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Linked Accounts & Transaction History) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Linked Trading Accounts Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold px-1">
              <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-900'}>Linked Trading Accounts</span>
              <span className={`text-[11px] font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                Live Accounts Require Deposit • Demo Non-Depositable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`border rounded-xl p-3 flex flex-col justify-between text-xs transition-colors ${
                    isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            acc.type === 'Live' ? 'bg-[#E51937] text-white' : 'bg-amber-500 text-black'
                          }`}
                        >
                          {acc.type}
                        </span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          #{acc.accountNumber}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono mt-0.5 block ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                        {acc.server} | {acc.leverage}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] block ${isDarkMode ? 'text-neutral-400' : 'text-slate-600 font-medium'}`}>
                        Eq: ${acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] ${
                      isDarkMode ? 'border-neutral-800/60' : 'border-slate-200'
                    }`}
                  >
                    {acc.type === 'Live' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDepositTarget(`Account #${acc.accountNumber}`);
                            setIsDepositModalOpen(true);
                          }}
                          className="text-[#0066FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Deposit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWithdraw(`Account #${acc.accountNumber}`)}
                          className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <ArrowUpFromLine className="w-3 h-3" />
                          <span>Withdraw</span>
                        </button>
                        {onDeleteAccount && (
                          <button
                            type="button"
                            onClick={() => onDeleteAccount(acc.id)}
                            className="text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer font-bold"
                            title={`Delete Live Account #${acc.accountNumber}${acc.balance > 0 ? ' (Balance transfers to Wallet)' : ''}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-amber-500/80 font-medium text-[10px]">
                          Virtual practice credit (Simulated)
                        </span>
                        {onDeleteAccount && (
                          <button
                            type="button"
                            onClick={() => onDeleteAccount(acc.id)}
                            className="text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                            title={`Delete Demo Account #${acc.accountNumber}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div
            className={`border rounded-2xl p-4 transition-colors ${
              isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className={`font-bold text-xs ${isDarkMode ? 'text-neutral-200' : 'text-slate-900'}`}>
                  Recent Wallet &amp; Payout Activity
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  Last 10 Transactions (Successful &amp; Failed)
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Audit Log
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-xs">
                  No wallet transactions recorded yet. Deposits and withdrawals will appear here.
                </div>
              ) : (
                transactions.slice(0, 10).map((tx) => {
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isWithdrawal = tx.type === 'WITHDRAWAL';
                  const isSuccess = tx.status === 'COMPLETED';
                  const isFailed = tx.status === 'FAILED';
                  const isCancelled = tx.status === 'CANCELLED';
                  const isPending = tx.status === 'PENDING';

                  return (
                    <div
                      key={tx.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isFailed
                          ? isDarkMode ? 'border-rose-900/60 bg-rose-950/20' : 'border-rose-200 bg-rose-50/50'
                          : isDarkMode ? 'border-neutral-800/80 bg-neutral-900/40' : 'border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isFailed
                              ? 'bg-rose-500/20 text-rose-400'
                              : isDeposit
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isWithdrawal
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          ) : isWithdrawal ? (
                            <ArrowUpFromLine className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {tx.method || tx.type}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black tracking-tight inline-flex items-center gap-1 ${
                                isSuccess
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : isFailed
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : isCancelled
                                  ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                              }`}
                            >
                              {isPending && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                              {isSuccess ? 'SUCCESSFUL' : isFailed ? 'FAILED' : isCancelled ? 'CANCELLED' : 'PENDING'}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(tx.timestamp).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • Ref: {tx.reference}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold block ${
                            isFailed
                              ? 'text-rose-400 line-through opacity-80'
                              : isDeposit
                              ? 'text-emerald-500'
                              : isWithdrawal
                              ? 'text-amber-500'
                              : isDarkMode
                              ? 'text-neutral-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {isDeposit ? '+' : isWithdrawal ? '-' : ''}${tx.amount.toFixed(2)}
                        </span>
                        <span className={`text-[10px] block ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          {tx.details || (isWithdrawal ? 'Instant Payout' : 'Funded')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SAFARICOM M-PESA B2C WITHDRAWAL MODAL                                     */}
      {/* Shows rate, B2C payout, exact KSH amount removed, 5s automated success    */}
      {/* ========================================================================= */}
      {activeModal === 'withdraw' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl space-y-4 relative transition-colors max-h-[92vh] overflow-y-auto no-scrollbar ${
              isDarkMode ? 'bg-[#161922] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                  withdrawMethod === 'crypto'
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-[#00A34F]/20 text-[#00A34F]'
                }`}>
                  {withdrawMethod === 'crypto' ? <Coins className="w-4 h-4" /> : 'M'}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {withdrawMethod === 'crypto'
                      ? 'Cryptocurrency Payout'
                      : withdrawMethod === 'bank'
                      ? 'Global & African Bank Payout'
                      : 'Mobile Money / M-PESA Payout'}
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-bold">
                    {withdrawMethod === 'crypto'
                      ? 'Fast Blockchain Processing • Minimum: $50.00'
                      : 'Instant Automated Disbursement • Minimum: $35.00'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseWithdraw}
                className="text-neutral-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Method Tabs: M-PESA | Bank (Kenya & Africa) | Crypto */}
            {withdrawStep === 'FORM' && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod('mpesa');
                    if (withdrawAmount < 35) setWithdrawAmount(35);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    withdrawMethod === 'mpesa'
                      ? 'bg-[#00A34F] text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">M-PESA</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod('bank');
                    if (withdrawAmount < 35) setWithdrawAmount(35);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    withdrawMethod === 'bank'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawMethod('crypto');
                    if (withdrawAmount < 50) setWithdrawAmount(50);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    withdrawMethod === 'crypto'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Crypto</span>
                </button>
              </div>
            )}

            {/* STEP 1: WITHDRAW FORM */}
            {withdrawStep === 'FORM' && (
              <div className="space-y-4">
                {withdrawError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-400 flex items-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{withdrawError}</span>
                  </div>
                )}
                {/* Method Specific Info Banner */}
                {withdrawMethod === 'mpesa' ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                      <span>Safaricom M-PESA Withdrawal Rate:</span>
                      <span className="font-mono text-sm">1 USD = {USD_KES_WITHDRAW_RATE} KES</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-300 leading-tight">
                      Funds are disbursed directly via Safaricom M-PESA into your registered phone number (Deposit Rate: {USD_KES_RATE} KES • Withdrawal Rate: {USD_KES_WITHDRAW_RATE} KES).
                    </p>
                  </div>
                ) : withdrawMethod === 'bank' ? (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400">
                      <span>Kenya &amp; Africa Bank Payout Rate:</span>
                      <span className="font-mono text-sm">1 USD = {USD_KES_WITHDRAW_RATE} KES</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-300 leading-tight">
                      Instant Pesalink &amp; EFT settlement to major Kenyan and Pan-African banks (Equity, KCB, Co-op, NCBA, Absa, Stanbic, Standard Chartered, I&amp;M, DTB, Ecobank, UBA).
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400">
                      <span>Crypto Withdrawal Policy:</span>
                      <span className="font-mono text-xs font-bold">Strict Minimum: $50.00</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-300 leading-tight">
                      Withdraw directly to your personal Bitcoin, USDT (TRC20), or Ethereum wallet address.
                    </p>
                  </div>
                )}

                {/* Source Selection */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                      Withdrawal Source:
                    </span>
                    <span className="text-emerald-500 font-mono">
                      Available: ${currentWithdrawable.toFixed(2)}
                    </span>
                  </div>
                  <select
                    value={withdrawSource}
                    onChange={(e) => setWithdrawSource(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="VTM Wallet">VTM One Wallet (${walletBalance.toFixed(2)})</option>
                    {liveAccounts.map((a) => (
                      <option key={a.id} value={`Account #${a.accountNumber}`}>
                        Live Account #{a.accountNumber} (${a.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Crypto Token Selector if Crypto */}
                {withdrawMethod === 'crypto' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Select Crypto Asset
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'BTC', label: 'Bitcoin (BTC)' },
                        { id: 'USDT', label: 'USDT (TRC20)' },
                        { id: 'ETH', label: 'Ethereum (ETH)' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setWithdrawCryptoCoin(t.id as any)}
                          className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                            withdrawCryptoCoin === t.id
                              ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-xs'
                              : isDarkMode
                              ? 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recipient Field: Phone for M-PESA, Bank Selector for Bank, Address for Crypto */}
                {withdrawMethod === 'mpesa' ? (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Registered Mobile Number:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {userPhone}
                      </span>
                    </div>
                  </div>
                ) : withdrawMethod === 'bank' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Select Bank (Kenya &amp; Africa)
                      </label>
                      <select
                        value={withdrawBankId}
                        onChange={(e) => setWithdrawBankId(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                          isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        {WELL_KNOWN_AFRICAN_BANKS.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} — Paybill {bank.paybill} ({bank.country})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                          Bank Account Number <span className="text-[#0066FF] font-bold">*Required</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 01109283746500"
                          value={withdrawBankAccount}
                          onChange={(e) => setWithdrawBankAccount(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                            isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          placeholder={currentUser?.fullName || 'Account Holder Name'}
                          value={withdrawBankHolder}
                          onChange={(e) => setWithdrawBankHolder(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                            isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Recipient {withdrawCryptoCoin} Wallet Address <span className="text-amber-500 font-bold">*Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder={`Paste your ${withdrawCryptoCoin} destination address...`}
                      value={withdrawCryptoAddress}
                      onChange={(e) => setWithdrawCryptoAddress(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                )}

                {/* Amount Input with minimum $35 for M-PESA, $50 for Crypto */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                      Amount (USD) <span className="text-[#E51937] font-bold">*{withdrawMethod === 'crypto' ? 'Min $50' : 'Min $35'}</span>
                    </span>
                    <span className="text-neutral-400 text-[11px]">
                      Min ${withdrawMethod === 'crypto' ? '50' : '35'} • Max ${currentWithdrawable.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={withdrawMethod === 'crypto' ? 50 : 35}
                    max={currentWithdrawable}
                    step="1"
                    placeholder={`Min $${withdrawMethod === 'crypto' ? 50 : 35}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                      withdrawMethod === 'crypto' ? 'focus:ring-amber-500' : 'focus:ring-[#E51937]'
                    } ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />

                  {/* Preset Pills */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {(withdrawMethod === 'crypto' ? [50, 100, 250, 500] : [35, 50, 100, 250]).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setWithdrawAmount(val)}
                        className={`py-1.5 px-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                          withdrawAmount === val
                            ? withdrawMethod === 'crypto'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-500 font-bold'
                              : 'bg-red-50 dark:bg-red-950/60 border-[#E51937] text-[#E51937] font-bold'
                            : isDarkMode
                            ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(Math.max(withdrawMethod === 'crypto' ? 50 : 35, Math.floor(currentWithdrawable)))}
                      className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        isDarkMode ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* EXACT AMOUNT SUMMARY */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-neutral-400">Total Deducted from Balance:</span>
                    <span className="font-mono font-bold text-rose-500 text-sm">
                      -${withdrawAmount.toFixed(2)} USD
                    </span>
                  </div>

                  {withdrawMethod === 'mpesa' || withdrawMethod === 'bank' ? (
                    <>
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-200 font-bold">
                          {withdrawMethod === 'bank'
                            ? `Exact Payout to ${selectedBankInfo.shortName}:`
                            : 'Exact Payout to Safaricom Line:'}
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                          KES {exactKesToDisburse.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                        * Exactly <strong className="text-slate-900 dark:text-white">KES {exactKesToDisburse.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (Rate: 1 USD = {USD_KES_WITHDRAW_RATE} KES) will be disbursed to your {withdrawMethod === 'bank' ? `${selectedBankInfo.shortName} account (${withdrawBankAccount || 'Account'})` : `Safaricom M-PESA number (${userPhone})`}.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-200 font-bold">
                          Crypto Payout Asset:
                        </span>
                        <span className="font-mono font-black text-amber-500 text-sm">
                          ${withdrawAmount.toFixed(2)} USD in {withdrawCryptoCoin}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                        * Payout will be dispatched directly to your {withdrawCryptoCoin} address on blockchain.
                      </p>
                    </>
                  )}
                </div>

                {/* Submit Button */}
                {currentWithdrawable < (withdrawMethod === 'crypto' ? 50 : 35) ? (
                  <button
                    disabled
                    className="w-full py-3 font-bold text-xs rounded-xl cursor-not-allowed border bg-neutral-800 text-neutral-500 border-neutral-700"
                  >
                    Insufficient Funds (Min ${withdrawMethod === 'crypto' ? '50.00' : '35.00'} • Available: ${currentWithdrawable.toFixed(2)})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartWithdrawal}
                    className={`w-full py-3.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 ${
                      withdrawMethod === 'crypto'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-[#00A34F] hover:bg-[#008F45]'
                    }`}
                  >
                    {withdrawMethod === 'crypto' ? (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Withdraw ${withdrawAmount.toFixed(2)} to {withdrawCryptoCoin} Wallet</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Withdraw KES {exactKesToDisburse.toLocaleString()} (${withdrawAmount.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* STEP 2: 5-SECOND PROCESSING */}
            {withdrawStep === 'PROCESSING' && (
              <div className="p-6 text-center space-y-4">
                {/* Circular Spinner */}
                <div className="relative w-16 h-16 mx-auto my-2">
                  <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin ${
                    withdrawMethod === 'crypto' ? 'border-amber-500/20 border-t-amber-500' : 'border-emerald-500/20 border-t-[#00A34F]'
                  }`} />
                  <div className={`absolute inset-0 flex items-center justify-center font-bold text-xs font-mono ${
                    withdrawMethod === 'crypto' ? 'text-amber-500' : 'text-[#00A34F]'
                  }`}>
                    {withdrawCountdown}s
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Processing {withdrawMethod === 'crypto' ? `${withdrawCryptoCoin} Crypto` : 'Safaricom M-PESA'} Payout
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                    {withdrawMethod === 'crypto'
                      ? `Broadcasting blockchain transaction to ${withdrawCryptoAddress.slice(0, 10)}...`
                      : `Dispatching funds to ${userPhone}...`}
                  </p>
                </div>

                {/* Amount badge */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 max-w-xs mx-auto text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400 block">
                    Disbursing Amount
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {withdrawMethod === 'crypto' ? `$${withdrawAmount.toFixed(2)} USD` : `KES ${exactKesToDisburse.toLocaleString()}`}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                    (-${withdrawAmount.toFixed(2)} USD from {withdrawSource})
                  </span>
                </div>

                {/* Progress bar filling over 3 seconds */}
                <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-1000 ease-linear ${
                      withdrawMethod === 'crypto' ? 'bg-amber-500' : 'bg-[#00A34F]'
                    }`}
                    style={{ width: `${((3 - withdrawCountdown) / 3) * 100}%` }}
                  />
                </div>

                <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono">
                  Pending verification &amp; disbursement... ({withdrawCountdown}s)
                </span>
              </div>
            )}

            {/* STEP 3: SUCCESS AFTER 5 SECONDS */}
            {withdrawStep === 'SUCCESS' && (
              <div className="p-5 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto my-1">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Withdrawal Successful!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    {withdrawMethod === 'crypto'
                      ? `Crypto withdrawal of $${withdrawAmount.toFixed(2)} USD has been dispatched.`
                      : 'Safaricom M-PESA Payout has been disbursed directly to your line.'}
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">Transaction Receipt:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {withdrawReceipt}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">Destination:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {withdrawMethod === 'crypto' ? withdrawCryptoAddress : userPhone}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-neutral-400">Amount Deducted:</span>
                    <span className="font-mono font-bold text-rose-500">
                      -${withdrawAmount.toFixed(2)} USD
                    </span>
                  </div>

                  {withdrawMethod === 'mpesa' ? (
                    <>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-neutral-800">
                        <span className="text-slate-700 dark:text-neutral-200 font-bold">
                          Exact Payout Received:
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          KES {exactKesToDisburse.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Withdrawal Exchange Rate:</span>
                        <span className="font-mono">1 USD = {USD_KES_WITHDRAW_RATE} KES</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-neutral-800">
                      <span className="text-slate-700 dark:text-neutral-200 font-bold">
                        Asset Dispatched:
                      </span>
                      <span className="font-mono font-black text-amber-500 text-sm">
                        ${withdrawAmount.toFixed(2)} in {withdrawCryptoCoin}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseWithdraw}
                  className="w-full py-3 rounded-xl bg-[#00A34F] hover:bg-[#008F45] text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-98"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md border rounded-2xl p-4 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}
            >
              <span
                className={`font-bold text-sm flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-[#E51937]" />
                Internal Transfer Between Live Accounts
              </span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-400 flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{transferError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                From Account
              </label>
              <select
                value={transferFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="VTM Wallet">VTM Wallet (${walletBalance.toFixed(2)})</option>
                {liveAccounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    Live #{a.accountNumber} (${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Swap Direction Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwapTransfer}
                className={`flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Swap transfer direction"
              >
                <ArrowUpDown className="w-3 h-3 text-[#E51937]" />
                <span>Swap Transfer Direction</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                To Destination Account
              </label>
              <select
                value={transferTo}
                onChange={(e) => handleToChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="VTM Wallet">VTM Wallet (${walletBalance.toFixed(2)})</option>
                {liveAccounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    Live #{a.accountNumber} (${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`p-2 rounded text-[11px] border ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
              }`}
            >
              ℹ️ Note: Demo accounts ($100k virtual credit) cannot participate in internal transfers. Transfers are exclusively between VTM Wallet and real Live trading accounts.
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDarkMode ? 'text-neutral-300 font-semibold' : 'text-slate-800 font-semibold'}>
                  Transfer Amount (USD):
                </span>
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                  Available: ${currentTransferable.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                min="10"
                max={currentTransferable}
                value={transferAmount}
                onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {currentTransferable <= 0 ? (
              <button
                disabled
                className={`w-full py-2.5 font-bold text-xs rounded-xl cursor-not-allowed border ${
                  isDarkMode
                    ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                    : 'bg-slate-100 text-slate-500 border-slate-300 font-semibold'
                }`}
              >
                Source Account has $0.00 to Transfer
              </button>
            ) : (
              <button
                onClick={handleProcessTransfer}
                className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Transfer Funds Instantly (${transferAmount.toFixed(2)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preferred Method Deposit Modal (M-PESA Express, Crypto BTC/ETH/USDT, Card) */}
      <MpesaDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        accounts={accounts}
        currentUser={currentUser}
        defaultTarget={depositTarget}
        isDarkMode={isDarkMode}
        onDepositComplete={(res) => {
          onDeposit({
            method: res.method,
            amount: res.amountUsd,
            targetAccount: res.targetAccount,
            reference: res.reference,
          });
          setFeedback(
            `Deposit of $${res.amountUsd.toFixed(2)} (KES ${res.amountKes.toLocaleString()}) via ${res.method} to ${res.targetAccount} completed successfully!`
          );
          setTimeout(() => setFeedback(null), 5000);
        }}
      />
    </div>
  );
};
