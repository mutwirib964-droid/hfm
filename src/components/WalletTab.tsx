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
} from 'lucide-react';
import { UserAuthProfile } from '../types';

interface WalletTabProps {
  accounts: TradingAccount[];
  walletBalance: number;
  transactions: Transaction[];
  onDeposit: (params: { method: string; amount: number; targetAccount: string }) => void;
  onWithdraw: (params: { method: string; amount: number; sourceAccount: string }) => void;
  onTransfer: (params: { fromAccount: string; toAccount: string; amount: number }) => void;
  selectedAccount?: TradingAccount | null;
  onSelectAccount?: (account: TradingAccount) => void;
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
  isDarkMode = false,
  currentUser,
}) => {
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);

  const liveAccounts = accounts.filter((a) => a.type === 'Live');
  const demoAccounts = accounts.filter((a) => a.type === 'Demo');

  // Deposit Form State (Default to VTM Wallet or first Live account)
  const [depositMethod, setDepositMethod] = useState('Visa / Mastercard (*4291)');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositTarget, setDepositTarget] = useState('VTM Wallet');

  // Withdraw Form State
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Wire Transfer');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawSource, setWithdrawSource] = useState('VTM Wallet');

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

  const depositPresets = [100, 250, 500, 1000, 2500, 5000];

  // Calculate withdrawable balance for currently selected source
  const getWithdrawableBalance = (source: string) => {
    if (source === 'VTM Wallet' || source === 'HF Wallet') {
      return walletBalance;
    }
    const liveAcc = liveAccounts.find(
      (a) => a.accountNumber === source || `Account #${a.accountNumber}` === source || a.id === source
    );
    return liveAcc ? Math.max(0, liveAcc.freeMargin || liveAcc.balance) : 0;
  };

  const currentWithdrawable = getWithdrawableBalance(withdrawSource);

  // Calculate transferable balance for currently selected fromAccount
  const getTransferableBalance = (source: string) => {
    if (source === 'VTM Wallet' || source === 'HF Wallet') {
      return walletBalance;
    }
    const liveAcc = liveAccounts.find(
      (a) => a.accountNumber === source || `Account #${a.accountNumber}` === source || a.id === source
    );
    return liveAcc ? Math.max(0, liveAcc.freeMargin || liveAcc.balance) : 0;
  };

  const currentTransferable = getTransferableBalance(transferFrom);

  const handleProcessDeposit = () => {
    if (depositAmount <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }
    onDeposit({
      method: depositMethod,
      amount: depositAmount,
      targetAccount: depositTarget,
    });
    setActiveModal(null);
    setFeedback(`Deposit of $${depositAmount.toFixed(2)} via ${depositMethod} to ${depositTarget} completed successfully!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleProcessWithdraw = () => {
    const maxAvailable = getWithdrawableBalance(withdrawSource);
    if (maxAvailable <= 0) {
      alert('Selected source has $0.00 withdrawable balance. Live accounts must be funded before withdrawal.');
      return;
    }
    if (withdrawAmount > maxAvailable) {
      alert(`Withdrawal amount exceeds available balance ($${maxAvailable.toFixed(2)}).`);
      return;
    }
    if (withdrawAmount <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    onWithdraw({
      method: withdrawMethod,
      amount: withdrawAmount,
      sourceAccount: withdrawSource,
    });
    setActiveModal(null);
    setFeedback(`Withdrawal request for $${withdrawAmount.toFixed(2)} from ${withdrawSource} submitted for processing.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleProcessTransfer = () => {
    if (transferFrom === transferTo) {
      alert('Source and destination accounts must be different.');
      return;
    }
    const maxAvailable = getTransferableBalance(transferFrom);
    if (maxAvailable <= 0) {
      alert('Source account has $0.00 balance available to transfer.');
      return;
    }
    if (transferAmount > maxAvailable) {
      alert(`Transfer amount exceeds available source balance ($${maxAvailable.toFixed(2)}).`);
      return;
    }
    if (transferAmount <= 0) {
      alert('Please enter a valid transfer amount.');
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
        <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
          isDarkMode
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            : 'border-amber-300 bg-amber-50 text-amber-950 shadow-xs'
        }`}>
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
          <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-xl border ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#1C2028] via-[#16181E] to-[#0E1014] border-neutral-800'
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white'
          }`}>
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
                  setDepositTarget('VTM Wallet');
                  setActiveModal('deposit');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/40 transition-all cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Deposit</span>
              </button>

              <button
                id="wallet-withdraw-action"
                onClick={() => {
                  setWithdrawSource('VTM Wallet');
                  setActiveModal('withdraw');
                }}
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
              <span className={`text-[11px] font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Live Accounts Require Deposit • Demo Non-Depositable</span>
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
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>#{acc.accountNumber}</span>
                        <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>({acc.tier})</span>
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

                  <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] ${
                    isDarkMode ? 'border-neutral-800/60' : 'border-slate-200'
                  }`}>
                    {acc.type === 'Live' ? (
                      <>
                        <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-700 font-medium'}>Real Funds Account</span>
                        <button
                          onClick={() => {
                            setDepositTarget(`Account #${acc.accountNumber}`);
                            setActiveModal('deposit');
                          }}
                          className="text-[#E51937] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Deposit to #{acc.accountNumber}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`${isDarkMode ? 'text-amber-400/90' : 'text-amber-800 font-bold'} font-medium`}>Virtual Demo Simulation</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                          isDarkMode
                            ? 'text-neutral-300 bg-neutral-800/80 border-neutral-700'
                            : 'text-slate-700 bg-slate-100 border-slate-300'
                        }`}>
                          Non-Depositable / Non-Withdrawable
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History Log */}
          <div className={`border rounded-xl overflow-hidden shadow-md ${
            isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className={`p-3 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#1A1D24] border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`} />
                <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent Transactions</h3>
              </div>
              <span className={`text-[10px] font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Past 30 Days</span>
            </div>

            <div className={`divide-y p-2 ${isDarkMode ? 'divide-neutral-800/60' : 'divide-slate-200'}`}>
              {transactions.length === 0 ? (
                <div className={`text-center py-6 text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  No transactions recorded yet. Deposit funds to start trading on live accounts.
                </div>
              ) : (
                transactions.map((tx) => {
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isWithdrawal = tx.type === 'WITHDRAWAL';

                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 hover:bg-neutral-900/50 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            isDeposit
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isWithdrawal
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-sky-500/15 text-sky-400'
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
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tx.method}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                              {tx.status}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                            Ref: {tx.reference} • {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isDeposit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isWithdrawal
                              ? 'text-rose-600 dark:text-rose-400'
                              : isDarkMode
                              ? 'text-neutral-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {isDeposit ? '+' : isWithdrawal ? '-' : ''}${tx.amount.toFixed(2)}
                        </span>
                        <span className={`text-[10px] block ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>{tx.details}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-2xl p-4 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <span className={`font-bold text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <ArrowDownToLine className="w-4 h-4 text-[#E51937]" />
                Deposit Funds to VTM
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Payment Method */}
            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Payment Method
              </label>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Visa / Mastercard (*4291)">Credit/Debit Card (Visa / Mastercard) - Instant</option>
                <option value="Tether USDT (TRC20)">Tether USDT (TRC20 Network) - Zero Fee</option>
                <option value="Bitcoin (BTC)">Bitcoin (BTC Crypto Deposit)</option>
                <option value="Skrill">Skrill E-Wallet</option>
                <option value="Neteller">Neteller E-Wallet</option>
                <option value="Bank Wire Transfer">Direct Bank Wire</option>
              </select>
            </div>

            {/* Target account: Only VTM Wallet and Live accounts */}
            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Deposit Destination
              </label>
              <select
                value={depositTarget}
                onChange={(e) => setDepositTarget(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="VTM Wallet">VTM Wallet (Central - Recommended)</option>
                {liveAccounts.map((a) => (
                  <option key={a.id} value={`Account #${a.accountNumber}`}>
                    Live Account #{a.accountNumber} ({a.tier} - Current: ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
              <div className={`p-2 rounded text-[11px] mt-1 border ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
              }`}>
                ℹ️ Demo accounts are simulated practice accounts ($100k credited) and cannot receive cash deposits. Deposits fund your real VTM Wallet or verified Live accounts.
              </div>
            </div>

            {/* Amount input + Presets */}
            <div className="space-y-2">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Amount (USD)
              </label>
              <input
                type="number"
                min="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />

              <div className="grid grid-cols-3 gap-1.5">
                {depositPresets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(amt)}
                    className={`py-1 rounded text-xs font-mono font-semibold transition-all ${
                      depositAmount === amt
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode ? 'bg-neutral-800 text-neutral-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-600 dark:text-emerald-300">
              ✓ 0% Deposit Fees covered by VTM Markets. Instant automated credit.
            </div>

            <button
              onClick={handleProcessDeposit}
              className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/40 transition-all active:scale-[0.98]"
            >
              Confirm Deposit of ${depositAmount.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === 'withdraw' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-2xl p-4 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <span className={`font-bold text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <ArrowUpFromLine className="w-4 h-4 text-[#E51937]" />
                Withdraw Funds
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Withdrawal Method
              </label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Bank Wire Transfer">Bank Wire Transfer (IBAN)</option>
                <option value="Visa / Mastercard (*4291)">Visa / Mastercard Refund</option>
                <option value="Tether USDT (TRC20)">Tether USDT (TRC20 Wallet)</option>
                <option value="Skrill">Skrill E-Wallet</option>
              </select>
            </div>

            {/* Withdrawal Source: Only VTM Wallet and Live accounts */}
            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                Withdrawal Source
              </label>
              <select
                value={withdrawSource}
                onChange={(e) => setWithdrawSource(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="VTM Wallet">VTM Wallet (Available: ${walletBalance.toFixed(2)})</option>
                {liveAccounts.map((a) => (
                  <option key={a.id} value={`Account #${a.accountNumber}`}>
                    Live Account #{a.accountNumber} ({a.tier} - Available: ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
              <div className={`p-2 rounded text-[11px] mt-1 border ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
              }`}>
                ℹ️ Demo accounts are simulated virtual practice funds and cannot be withdrawn. Withdrawals are strictly for real Live accounts and VTM Wallet.
              </div>
            </div>

            {/* Immutable Phone Verification for Withdrawals */}
            <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold flex items-center gap-1.5 text-[11px] ${
                  isDarkMode ? 'text-neutral-300' : 'text-slate-800'
                }`}>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Immutable Registered Phone Security</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Locked &amp; Verified
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600 font-medium'}>Phone on Record:</span>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser?.phone || '+254 712 345 678'}
                </span>
              </div>
              <p className={`text-[10px] leading-tight ${isDarkMode ? 'text-neutral-500' : 'text-slate-600'}`}>
                * Under anti-fraud &amp; AML regulatory rules, your registered phone number cannot be modified during withdrawals. All withdrawal confirmations will be dispatched to this number.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDarkMode ? 'text-neutral-300 font-semibold' : 'text-slate-800 font-semibold'}>Amount (USD):</span>
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>Available: ${currentWithdrawable.toFixed(2)}</span>
              </div>
              <input
                type="number"
                min="10"
                max={currentWithdrawable}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#E51937] ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {currentWithdrawable <= 0 ? (
              <button
                disabled
                className={`w-full py-2.5 font-bold text-xs rounded-xl cursor-not-allowed border ${
                  isDarkMode
                    ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                    : 'bg-slate-100 text-slate-500 border-slate-300 font-semibold'
                }`}
              >
                Insufficient Funds to Withdraw ($0.00 Available)
              </button>
            ) : (
              <button
                onClick={handleProcessWithdraw}
                className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer active:scale-98"
              >
                Submit Withdrawal Request (${withdrawAmount.toFixed(2)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-2xl p-4 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#181B22] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <span className={`font-bold text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <ArrowLeftRight className="w-4 h-4 text-[#E51937]" />
                Internal Transfer Between Live Accounts
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>From Account</label>
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
                    Live #{a.accountNumber} ({a.tier} - ${a.balance.toFixed(2)})
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
              <label className={`text-xs font-semibold block ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>To Destination Account</label>
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
                    Live #{a.accountNumber} ({a.tier} - ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className={`p-2 rounded text-[11px] border ${
              isDarkMode
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
            }`}>
              ℹ️ Note: Demo accounts ($100k virtual credit) cannot participate in internal transfers. Transfers are exclusively between VTM Wallet and real Live trading accounts.
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isDarkMode ? 'text-neutral-300 font-semibold' : 'text-slate-800 font-semibold'}>Transfer Amount (USD):</span>
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>Available: ${currentTransferable.toFixed(2)}</span>
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
    </div>
  );
};
