import React, { useState } from 'react';
import { TradingAccount, Transaction } from '../types';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface WalletTabProps {
  accounts: TradingAccount[];
  walletBalance: number;
  transactions: Transaction[];
  onDeposit: (params: { method: string; amount: number; targetAccount: string }) => void;
  onWithdraw: (params: { method: string; amount: number; sourceAccount: string }) => void;
  onTransfer: (params: { fromAccount: string; toAccount: string; amount: number }) => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  accounts,
  walletBalance,
  transactions,
  onDeposit,
  onWithdraw,
  onTransfer,
}) => {
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);

  // Deposit Form State
  const [depositMethod, setDepositMethod] = useState('Visa / Mastercard (*4291)');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositTarget, setDepositTarget] = useState('HF Wallet');

  // Withdraw Form State
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Wire Transfer');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(200);
  const [withdrawSource, setWithdrawSource] = useState('HF Wallet');

  // Transfer Form State
  const [transferFrom, setTransferFrom] = useState('HF Wallet');
  const [transferTo, setTransferTo] = useState(accounts[0]?.accountNumber || '');
  const [transferAmount, setTransferAmount] = useState<number>(500);

  const [feedback, setFeedback] = useState<string | null>(null);

  const depositPresets = [100, 250, 500, 1000, 2500, 5000];

  const handleProcessDeposit = () => {
    onDeposit({
      method: depositMethod,
      amount: depositAmount,
      targetAccount: depositTarget,
    });
    setActiveModal(null);
    setFeedback(`Deposit of $${depositAmount.toFixed(2)} via ${depositMethod} was completed successfully!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleProcessWithdraw = () => {
    if (withdrawAmount > walletBalance) {
      alert('Withdrawal amount exceeds available wallet balance.');
      return;
    }
    onWithdraw({
      method: withdrawMethod,
      amount: withdrawAmount,
      sourceAccount: withdrawSource,
    });
    setActiveModal(null);
    setFeedback(`Withdrawal request for $${withdrawAmount.toFixed(2)} submitted for processing.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleProcessTransfer = () => {
    if (transferFrom === transferTo) {
      alert('Source and destination accounts must be different.');
      return;
    }
    if (transferAmount > walletBalance) {
      alert('Transfer amount exceeds available balance.');
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
    <div id="hfm-wallet-tab" className="flex flex-col w-full pb-20 space-y-4 px-2 sm:px-4 pt-2">
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

      {/* Main Responsive Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (Core Balance Card & Actions) */}
        <div className="lg:col-span-5 space-y-4">
          {/* HF Wallet Core Balance Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1C2028] via-[#16181E] to-[#0E1014] border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E51937]/15 border border-[#E51937]/30 flex items-center justify-center text-[#E51937]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    HFM One Wallet
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
                onClick={() => setActiveModal('deposit')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#E51937] hover:bg-[#c9142f] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/40 transition-all cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Deposit</span>
              </button>

              <button
                id="wallet-withdraw-action"
                onClick={() => setActiveModal('withdraw')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#20242E] hover:bg-[#282E3A] active:scale-95 text-neutral-200 hover:text-white font-bold text-xs rounded-xl border border-neutral-700/60 transition-all cursor-pointer"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                <span>Withdraw</span>
              </button>

              <button
                id="wallet-transfer-action"
                onClick={() => setActiveModal('transfer')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#20242E] hover:bg-[#282E3A] active:scale-95 text-neutral-200 hover:text-white font-bold text-xs rounded-xl border border-neutral-700/60 transition-all cursor-pointer"
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
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300 px-1">
              <span>Linked Trading Accounts</span>
              <span className="text-[11px] text-neutral-500">Instant Internal Transfers 0% Fee</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-[#161920] border border-neutral-800 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          acc.type === 'Live' ? 'bg-[#E51937] text-white' : 'bg-amber-500 text-black'
                        }`}
                      >
                        {acc.type}
                      </span>
                      <span className="font-bold text-white">#{acc.accountNumber}</span>
                      <span className="text-[10px] text-neutral-400">({acc.tier})</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
                      {acc.server} | {acc.leverage}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-sm">
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      Eq: ${acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History Log */}
          <div className="bg-[#161920] border border-neutral-800 rounded-xl overflow-hidden shadow-md">
            <div className="p-3 bg-[#1A1D24] border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-bold text-white">Recent Transactions</h3>
              </div>
              <span className="text-[10px] text-neutral-400">Past 30 Days</span>
            </div>

            <div className="divide-y divide-neutral-800/60 p-2">
              {transactions.map((tx) => {
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
                          <span className="font-bold text-white">{tx.method}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                            {tx.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Ref: {tx.reference} • {new Date(tx.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isDeposit
                            ? 'text-emerald-400'
                            : isWithdrawal
                            ? 'text-rose-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {isDeposit ? '+' : isWithdrawal ? '-' : ''}${tx.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">{tx.details}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181B22] border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-[#E51937]" />
                Deposit Funds to HFM
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
              <label className="text-xs text-neutral-300 font-semibold block">
                Payment Method
              </label>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E51937]"
              >
                <option value="Visa / Mastercard (*4291)">Credit/Debit Card (Visa / Mastercard) - Instant</option>
                <option value="Tether USDT (TRC20)">Tether USDT (TRC20 Network) - Zero Fee</option>
                <option value="Bitcoin (BTC)">Bitcoin (BTC Crypto Deposit)</option>
                <option value="Skrill">Skrill E-Wallet</option>
                <option value="Neteller">Neteller E-Wallet</option>
                <option value="Bank Wire Transfer">Direct Bank Wire</option>
              </select>
            </div>

            {/* Target account */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-semibold block">
                Deposit Destination
              </label>
              <select
                value={depositTarget}
                onChange={(e) => setDepositTarget(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="HF Wallet">HF Wallet (Recommended)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={`Account #${a.accountNumber}`}>
                    {a.type} Account #{a.accountNumber} ({a.tier})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount input + Presets */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-semibold block">
                Amount (USD)
              </label>
              <input
                type="number"
                min="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#E51937]"
              />

              <div className="grid grid-cols-3 gap-1.5">
                {depositPresets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(amt)}
                    className={`py-1 rounded text-xs font-mono font-semibold transition-all ${
                      depositAmount === amt
                        ? 'bg-[#E51937] text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
              ✓ 0% Deposit Fees covered by HFM. Instant automated credit.
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
          <div className="w-full max-w-md bg-[#181B22] border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-2">
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
              <label className="text-xs text-neutral-300 font-semibold block">
                Withdrawal Method
              </label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Bank Wire Transfer">Bank Wire Transfer (IBAN)</option>
                <option value="Visa / Mastercard (*4291)">Visa / Mastercard Refund</option>
                <option value="Tether USDT (TRC20)">Tether USDT (TRC20 Wallet)</option>
                <option value="Skrill">Skrill E-Wallet</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-semibold">Amount (USD):</span>
                <span className="text-neutral-400 font-mono">Available: ${walletBalance.toFixed(2)}</span>
              </div>
              <input
                type="number"
                min="50"
                max={walletBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#E51937]"
              />
            </div>

            <button
              onClick={handleProcessWithdraw}
              className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Submit Withdrawal Request
            </button>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181B22] border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#E51937]" />
                Internal Transfer Between Accounts
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-semibold block">From Account</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="HF Wallet">HF Wallet (${walletBalance.toFixed(2)})</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    #{a.accountNumber} ({a.tier} - ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-semibold block">To Destination Account</label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="HF Wallet">HF Wallet</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    #{a.accountNumber} ({a.tier} - ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-semibold block">Transfer Amount (USD)</label>
              <input
                type="number"
                min="10"
                value={transferAmount}
                onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#E51937]"
              />
            </div>

            <button
              onClick={handleProcessTransfer}
              className="w-full py-2.5 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Transfer Funds Instantly
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
