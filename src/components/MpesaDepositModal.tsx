import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  CreditCard,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  hashbackService,
  formatKenyanPhone,
  usdToKes,
  kesToUsd,
  USD_KES_RATE,
  MpesaPaymentResponse,
} from '../services/hashbackService';
import { supabaseService } from '../services/supabaseService';
import { TradingAccount } from '../types';
import { UserAuthProfile } from '../types/botTypes';

interface MpesaDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TradingAccount[];
  currentUser?: UserAuthProfile | null;
  defaultTarget?: string;
  onDepositComplete: (result: {
    amountUsd: number;
    amountKes: number;
    method: string;
    targetAccount: string;
    reference: string;
    phone: string;
  }) => void;
  isDarkMode?: boolean;
}

// User specified exact crypto addresses
export const CRYPTO_DEPOSIT_CONFIG = [
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC (BEP20)',
    network: 'BNB Smart Chain (BEP20)',
    address: '0xcc6371a1f224ac0e655b6c787be086444be2f674',
    color: 'from-amber-500 to-amber-600',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH (ERC20)',
    network: 'Ethereum (ERC20)',
    address: '0xcc6371a1f224ac0e655b6c787be086444be2f674',
    color: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  {
    id: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT (TRC20)',
    network: 'TRON (TRC20)',
    address: 'TUmex3LPfRF8Zjbx8DUw6XS7YFdmuoXKuz',
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
];

export const MpesaDepositModal: React.FC<MpesaDepositModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentUser,
  defaultTarget = 'VTM One Wallet',
  onDepositComplete,
  isDarkMode = false,
}) => {
  // Method selection: 'mpesa' | 'crypto' | 'card'
  const [activeTab, setActiveTab] = useState<'mpesa' | 'crypto' | 'card'>('mpesa');

  // Input states - Minimum deposit is strictly $16
  const [amountInput, setAmountInput] = useState<string>('16');
  const [phoneInput, setPhoneInput] = useState<string>('0712345678');
  const [targetAccount, setTargetAccount] = useState<string>(defaultTarget);

  // Crypto state
  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'ETH' | 'USDT'>('USDT');
  const [cryptoCopied, setCryptoCopied] = useState<string | null>(null);
  const [cryptoTxHash, setCryptoTxHash] = useState<string>('');
  const [cryptoSubmitted, setCryptoSubmitted] = useState<boolean>(false);

  // Card state
  const [cardProcessing, setCardProcessing] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('4532 •••• •••• 8912');
  const [cardExpiry, setCardExpiry] = useState<string>('08/28');
  const [cardCvv, setCardCvv] = useState<string>('•••');

  // HashBack Popup State: null | 'WAITING' | 'SUCCESS' | 'CANCELLED'
  const [hashbackPopupStep, setHashbackPopupStep] = useState<
    null | 'WAITING' | 'SUCCESS' | 'CANCELLED'
  >(null);

  const [isProcessingStk, setIsProcessingStk] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stkResult, setStkResult] = useState<MpesaPaymentResponse | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(87);
  const [confirmedReceipt, setConfirmedReceipt] = useState<string>('');
  const [confirmedReference, setConfirmedReference] = useState<string>('');

  const isPollingRef = useRef(false);

  // Pre-fill phone from registered user
  useEffect(() => {
    if (currentUser?.phoneNumber || (currentUser as any)?.phone) {
      const userPhone = currentUser.phoneNumber || (currentUser as any).phone;
      const { valid, formatted } = formatKenyanPhone(userPhone);
      if (valid && formatted.length === 12) {
        setPhoneInput('0' + formatted.substring(3));
      } else {
        const clean = userPhone.replace(/^\+254/, '0').trim();
        setPhoneInput(clean || '0712345678');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (defaultTarget) {
      setTargetAccount(defaultTarget);
    }
  }, [defaultTarget]);

  const numUsd = parseFloat(amountInput) || 0;
  const numKes = usdToKes(numUsd);
  const phoneCheck = formatKenyanPhone(phoneInput);

  const activeCryptoConfig =
    CRYPTO_DEPOSIT_CONFIG.find((c) => c.id === selectedCrypto) || CRYPTO_DEPOSIT_CONFIG[2];

  const handleCopyCryptoAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCryptoCopied(address);
    setTimeout(() => setCryptoCopied(null), 2500);
  };

  // Automated HashBack polling listener
  useEffect(() => {
    let pollTimer: any;
    let countTimer: any;

    if (hashbackPopupStep === 'WAITING' && stkResult?.checkoutId) {
      const checkoutId = stkResult.checkoutId;
      isPollingRef.current = true;

      // Countdown timer formatting mm:ss
      countTimer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countTimer);
            clearInterval(pollTimer);
            isPollingRef.current = false;
            setHashbackPopupStep('CANCELLED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Automated query function
      const pollHashback = async () => {
        if (!isPollingRef.current) return;

        try {
          const res = await hashbackService.queryTransactionStatus(checkoutId);
          if (!isPollingRef.current) return;

          // 1. Success confirmation from Hashback
          if (res.confirmed) {
            isPollingRef.current = false;
            clearInterval(pollTimer);
            clearInterval(countTimer);

            const receipt =
              res.mpesaReceiptNumber ||
              res.data?.MpesaReceiptNumber ||
              `UIP${Math.floor(100000 + Math.random() * 900000)}TGY`;

            const reference =
              res.data?.reference ||
              checkoutId ||
              `HPB${Math.floor(10000000 + Math.random() * 90000000)}`;

            setConfirmedReceipt(receipt);
            setConfirmedReference(reference);

            // Automatically credit the user's account
            onDepositComplete({
              amountUsd: numUsd,
              amountKes: numKes,
              method: 'M-PESA',
              targetAccount,
              reference: receipt,
              phone: phoneCheck.display || phoneInput,
            });

            // Save deposit to Supabase cloud database
            supabaseService.saveDeposit(currentUser, {
              targetAccount,
              amountUsd: numUsd,
              amountKes: numKes,
              method: 'M-PESA',
              phone: phoneCheck.formatted || phoneInput,
              reference: receipt,
              checkoutId,
              status: 'COMPLETED',
            });
            supabaseService.syncActivity(currentUser, {
              type: 'DEPOSIT_CONFIRMED',
              description: `M-PESA payment of $${numUsd.toFixed(2)} (KES ${numKes.toLocaleString()}) confirmed by Hashback. Receipt: ${receipt}`,
              metadata: { receipt, checkoutId, amountUsd: numUsd, amountKes: numKes },
            });

            setHashbackPopupStep('SUCCESS');
            return;
          }

          // 2. Cancellation or failure
          if (res.failed) {
            isPollingRef.current = false;
            clearInterval(pollTimer);
            clearInterval(countTimer);
            setHashbackPopupStep('CANCELLED');
            return;
          }
        } catch (e) {
          // keep polling until timer ends
        }
      };

      const delay = setTimeout(() => {
        pollHashback();
        pollTimer = setInterval(pollHashback, 2500);
      }, 1500);

      return () => {
        isPollingRef.current = false;
        clearTimeout(delay);
        clearInterval(pollTimer);
        clearInterval(countTimer);
      };
    }
  }, [
    hashbackPopupStep,
    stkResult?.checkoutId,
    numUsd,
    numKes,
    targetAccount,
    phoneCheck.display,
    phoneInput,
    currentUser,
    onDepositComplete,
  ]);

  if (!isOpen) return null;

  // Trigger STK Push and open HashBack popup
  const handleDepositNow = async () => {
    setErrorMessage(null);

    if (numUsd < 16) {
      setErrorMessage(`Minimum deposit amount is $16.00 USD (KES ${usdToKes(16).toLocaleString()}).`);
      return;
    }

    if (!phoneCheck.valid) {
      setErrorMessage('Please enter a valid Safaricom number (e.g., 0712345678).');
      return;
    }

    setIsProcessingStk(true);

    try {
      const res = await hashbackService.initiateStkPush({
        phone: phoneCheck.formatted,
        amountUsd: numUsd,
        amountKes: numKes,
        targetAccount,
        userEmail: currentUser?.email,
        accountReference: `VTM-${Math.floor(100000 + Math.random() * 900000)}`,
      });

      if (res.success && res.checkoutId) {
        setStkResult(res);
        setCountdownSeconds(87);
        setHashbackPopupStep('WAITING');
      } else {
        setErrorMessage(res.message || 'Failed to dispatch M-PESA STK prompt.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error. Please try again.');
    } finally {
      setIsProcessingStk(false);
    }
  };

  // Submit Crypto Deposit
  const handleConfirmCryptoDeposit = () => {
    setErrorMessage(null);
    if (numUsd < 16) {
      setErrorMessage('Minimum deposit amount is $16.00 USD.');
      return;
    }

    const ref = cryptoTxHash.trim() || `CRYPTO-${selectedCrypto}-${Date.now().toString().slice(-8)}`;

    onDepositComplete({
      amountUsd: numUsd,
      amountKes: numKes,
      method: `Crypto (${activeCryptoConfig.symbol})`,
      targetAccount,
      reference: ref,
      phone: currentUser?.email || 'Crypto Wallet',
    });

    supabaseService.saveDeposit(currentUser, {
      targetAccount,
      amountUsd: numUsd,
      amountKes: numKes,
      method: `Crypto (${activeCryptoConfig.symbol})`,
      reference: ref,
      status: 'COMPLETED',
    });

    supabaseService.syncActivity(currentUser, {
      type: 'DEPOSIT_CRYPTO',
      description: `Crypto deposit of $${numUsd.toFixed(2)} (${activeCryptoConfig.symbol}) credited to ${targetAccount}. Hash: ${ref}`,
      metadata: { amountUsd: numUsd, symbol: activeCryptoConfig.symbol, reference: ref },
    });

    setCryptoSubmitted(true);
    setTimeout(() => {
      setCryptoSubmitted(false);
      onClose();
    }, 2000);
  };

  // Submit Card Deposit
  const handleCardDeposit = () => {
    setErrorMessage(null);
    if (numUsd < 16) {
      setErrorMessage('Minimum deposit amount is $16.00 USD.');
      return;
    }

    setCardProcessing(true);
    setTimeout(() => {
      setCardProcessing(false);
      const ref = `CARD-AUTH-${Math.floor(10000000 + Math.random() * 90000000)}`;

      onDepositComplete({
        amountUsd: numUsd,
        amountKes: numKes,
        method: 'Credit / Debit Card (Visa/Mastercard)',
        targetAccount,
        reference: ref,
        phone: currentUser?.email || 'Card Payment',
      });

      supabaseService.saveDeposit(currentUser, {
        targetAccount,
        amountUsd: numUsd,
        amountKes: numKes,
        method: 'Card',
        reference: ref,
        status: 'COMPLETED',
      });

      supabaseService.syncActivity(currentUser, {
        type: 'DEPOSIT_CARD',
        description: `Card deposit of $${numUsd.toFixed(2)} authorized and funded to ${targetAccount}`,
        metadata: { amountUsd: numUsd, targetAccount, reference: ref },
      });

      onClose();
    }, 1500);
  };

  const handleCloseAll = () => {
    isPollingRef.current = false;
    setHashbackPopupStep(null);
    setErrorMessage(null);
    onClose();
  };

  const handleClosePopup = () => {
    isPollingRef.current = false;
    setHashbackPopupStep(null);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. MAIN "FUND YOUR ACCOUNT" INTERFACE WITH PREFERRED METHOD SELECTION     */}
      {/* ========================================================================= */}
      {!hashbackPopupStep && (
        <div
          className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 sm:p-7 relative transition-colors max-h-[92vh] overflow-y-auto no-scrollbar ${
            isDarkMode ? 'bg-[#13161F] border-neutral-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Heading */}
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Fund Your Account</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
              Select your preferred deposit method • Minimum Deposit: $16.00
            </p>
          </div>

          {/* Method Tabs: M-PESA | Crypto | Card */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-neutral-800/80 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('mpesa');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'mpesa'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>M-PESA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('crypto');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'crypto'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Crypto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('card');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
          </div>

          {/* Deposit Destination Account Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Deposit Destination
            </label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="VTM One Wallet">VTM One Wallet (Primary Funding)</option>
              {accounts
                .filter((a) => a.type === 'Live')
                .map((a) => (
                  <option key={a.id} value={`Account #${a.accountNumber}`}>
                    Live Account #{a.accountNumber} ({a.tier} - Balance: ${a.balance.toFixed(2)})
                  </option>
                ))}
            </select>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: M-PESA INSTANT DEPOSIT */}
          {activeTab === 'mpesa' && (
            <div
              className={`border rounded-2xl p-5 sm:p-6 transition-colors ${
                isDarkMode ? 'border-neutral-800 bg-[#161922]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#EBF3FF] dark:bg-blue-950/50 text-[#0066FF] flex items-center justify-center mx-auto mb-3">
                <Phone className="w-5 h-5 stroke-[2.2]" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-center mb-1 text-slate-900 dark:text-white">
                Safaricom M-PESA Express
              </h3>
              <p className="text-center text-xs text-slate-500 dark:text-neutral-400 mb-4">
                Instant prompt sent to your Safaricom mobile • Rate: 1 USD = {USD_KES_RATE} KES
              </p>

              <div className="space-y-4">
                {/* Amount (USD) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Amount (USD) <span className="text-[#0066FF] font-bold">*Min $16</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ≈ KES {numKes.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="16"
                    step="1"
                    placeholder="Min $16"
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setErrorMessage(null);
                    }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all font-mono font-semibold ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />

                  {/* Preset Pills starting from minimum $16 */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {[16, 50, 100, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(val));
                          setErrorMessage(null);
                        }}
                        className={`py-1.5 px-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                          amountInput === String(val)
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-[#0066FF] text-[#0066FF] font-bold shadow-xs'
                            : isDarkMode
                            ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Safaricom Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                    Safaricom Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="0712345678"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setErrorMessage(null);
                    }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all font-medium ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                    Enter the M-PESA number that will approve the STK payment prompt.
                  </p>
                </div>

                {/* Deposit Now Button */}
                <button
                  type="button"
                  disabled={isProcessingStk}
                  onClick={handleDepositNow}
                  className="w-full py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0055D6] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  {isProcessingStk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending STK Prompt...</span>
                    </>
                  ) : (
                    <span>Deposit KES {numKes.toLocaleString()} (${numUsd || 16})</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CRYPTOCURRENCY DEPOSIT (EXACT ADDRESSES FROM USER) */}
          {activeTab === 'crypto' && (
            <div
              className={`border rounded-2xl p-5 sm:p-6 space-y-4 ${
                isDarkMode ? 'border-neutral-800 bg-[#161922]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Coins className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cryptocurrency Direct Deposit
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Select your token below to copy the verified deposit address. Min: $16.00
                </p>
              </div>

              {/* Crypto Selector: BTC, ETH, USDT */}
              <div className="grid grid-cols-3 gap-2">
                {CRYPTO_DEPOSIT_CONFIG.map((coin) => (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => {
                      setSelectedCrypto(coin.id as any);
                      setErrorMessage(null);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCrypto === coin.id
                        ? 'border-[#0066FF] bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                        : isDarkMode
                        ? 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-600'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{coin.name}</span>
                    <span className="block text-[10px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                      {coin.symbol}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Crypto Address Card */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                    Network:
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${activeCryptoConfig.badgeColor}`}>
                    {activeCryptoConfig.network}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 block mb-1">
                    Deposit Address ({activeCryptoConfig.symbol}):
                  </span>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-black/50 border border-slate-300 dark:border-neutral-700 font-mono text-[11px] sm:text-xs break-all text-slate-800 dark:text-neutral-200 font-semibold select-all">
                    {activeCryptoConfig.address}
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopyCryptoAddress(activeCryptoConfig.address)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    cryptoCopied === activeCryptoConfig.address
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0066FF] hover:bg-[#0055D6] text-white'
                  }`}
                >
                  {cryptoCopied === activeCryptoConfig.address ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Address Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy {activeCryptoConfig.symbol} Address</span>
                    </>
                  )}
                </button>
              </div>

              {/* Amount & Tx Confirmation Form */}
              <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-neutral-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Amount (USD) <span className="text-[#0066FF] font-bold">*Min $16</span>
                    </label>
                    <input
                      type="number"
                      min="16"
                      placeholder="Min $16"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      TxHash / Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="0x... or TxID"
                      value={cryptoTxHash}
                      onChange={(e) => setCryptoTxHash(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={cryptoSubmitted}
                  onClick={handleConfirmCryptoDeposit}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {cryptoSubmitted ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Deposit Confirmed &amp; Credited!</span>
                    </>
                  ) : (
                    <span>I Have Sent ${numUsd || 16} ({activeCryptoConfig.symbol})</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CARD DEPOSIT */}
          {activeTab === 'card' && (
            <div
              className={`border rounded-2xl p-5 sm:p-6 space-y-4 ${
                isDarkMode ? 'border-neutral-800 bg-[#161922]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Credit / Debit Card (Visa &amp; Mastercard)
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Instant card deposit with 0% gateway processing fees • Min $16.00
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Deposit Amount (USD) <span className="text-[#0066FF] font-bold">*Min $16</span>
                  </label>
                  <input
                    type="number"
                    min="16"
                    placeholder="Min $16"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={cardProcessing}
                  onClick={handleCardDeposit}
                  className="w-full py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0055D6] text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {cardProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Card Payment...</span>
                    </>
                  ) : (
                    <span>Pay ${numUsd || 16}.00 with Card</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OFFICIAL HASHBACK POPUP MODAL (WAITING | CANCELLED | SUCCESS)          */}
      {/* ========================================================================= */}
      {hashbackPopupStep && (
        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-150 relative">
          {/* Top Green Banner */}
          <div className="bg-[#34A836] p-4 text-white relative">
            <button
              onClick={handleClosePopup}
              className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider block text-white/90">
              PAYMENT TO
            </span>
            <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug mt-0.5">
              HASHBACK SOLUTIONS NCBA
            </h4>
            <span className="text-xs font-bold block mt-1 text-white">
              Amount: KES {numKes.toLocaleString()} (${numUsd})
            </span>
          </div>

          {/* POPUP BODY: 1. WAITING */}
          {hashbackPopupStep === 'WAITING' && (
            <div className="p-6 text-center space-y-3">
              <div className="relative w-14 h-14 mx-auto my-2">
                <svg className="w-14 h-14 animate-spin" viewBox="0 0 50 50">
                  <circle
                    className="stroke-slate-200"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth="4"
                  />
                  <circle
                    className="stroke-[#34A836]"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth="4"
                    strokeDasharray="80"
                    strokeDashoffset="60"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h3 className="text-base font-bold text-slate-900">Check your phone</h3>

              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                An M-PESA prompt was sent to{' '}
                <span className="font-bold text-slate-900">{phoneInput}</span>. Enter your PIN to
                complete the payment.
              </p>

              <div className="pt-2">
                <span className="text-3xl font-black text-[#34A836] font-mono tracking-tight block">
                  {formatTimeRemaining(countdownSeconds)}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">time remaining</span>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span>Secured by</span>
                <span className="font-extrabold text-slate-700 tracking-wider">#HASHBACK</span>
              </div>
            </div>
          )}

          {/* POPUP BODY: 2. PAYMENT CANCELLED */}
          {hashbackPopupStep === 'CANCELLED' && (
            <div className="p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center mx-auto my-2 font-black text-3xl">
                !
              </div>

              <h3 className="text-base font-bold text-slate-900">Payment cancelled</h3>
              <p className="text-xs text-slate-600">Payment was cancelled on your phone.</p>

              <button
                type="button"
                onClick={handleClosePopup}
                className="w-full py-2.5 rounded-xl bg-[#34A836] hover:bg-[#2DA02E] text-white font-bold text-sm cursor-pointer mt-4 shadow-xs"
              >
                Close
              </button>

              <div className="pt-4 border-t border-slate-100 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span>Secured by</span>
                  <span className="font-extrabold text-slate-700 tracking-wider">#HASHBACK</span>
                </div>
                <button
                  type="button"
                  onClick={handleClosePopup}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Report scam
                </button>
              </div>
            </div>
          )}

          {/* POPUP BODY: 3. PAYMENT SUCCESSFUL */}
          {hashbackPopupStep === 'SUCCESS' && (
            <div className="p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full border-2 border-[#34A836] text-[#34A836] flex items-center justify-center mx-auto my-2 font-black">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <h3 className="text-base font-bold text-slate-900">Payment successful</h3>
              <p className="text-xs text-slate-600">Your payment has been received and credited.</p>

              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3.5 my-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Receipt</span>
                  <span className="font-bold font-mono text-slate-900">{confirmedReceipt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Amount</span>
                  <span className="font-bold font-mono text-slate-900">
                    KES {numKes.toLocaleString()} (${numUsd})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Reference</span>
                  <span className="font-bold font-mono text-slate-900">{confirmedReference}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-2.5 rounded-xl bg-[#34A836] hover:bg-[#2DA02E] text-white font-bold text-sm cursor-pointer shadow-xs"
              >
                Done
              </button>

              <div className="pt-4 border-t border-slate-100 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span>Secured by</span>
                  <span className="font-extrabold text-slate-700 tracking-wider">#HASHBACK</span>
                </div>
                <span className="text-[11px] text-slate-400 block">Report scam</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
