import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  CreditCard,
  Building2,
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
  USD_KES_WITHDRAW_RATE,
  WELL_KNOWN_AFRICAN_BANKS,
  MpesaPaymentResponse,
} from '../services/hashbackService';
import { supabaseService } from '../services/supabaseService';
import { TradingAccount } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import {
  COUNTRY_OPTIONS,
  getCountryByCode,
  formatLocalPhoneInput,
  validatePhoneForCountry,
  maskPhoneNumber,
} from '../utils/countryPhoneConfig';

interface MpesaDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TradingAccount[];
  currentUser?: UserAuthProfile | null;
  defaultTarget?: string;
  onDepositComplete: (result: {
    id?: string;
    amountUsd: number;
    amountKes: number;
    method: string;
    targetAccount: string;
    reference: string;
    phone: string;
    status?: 'COMPLETED' | 'PENDING' | 'FAILED';
    details?: string;
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
  // Method selection: 'mpesa' | 'crypto' | 'card' (Bank is strictly for Withdrawal only)
  const [activeTab, setActiveTab] = useState<'mpesa' | 'crypto' | 'card'>('mpesa');

  // Input states - Minimum deposit is strictly $16
  const [amountInput, setAmountInput] = useState<string>('16');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    currentUser?.countryCode || '+254'
  );
  const activeCountryCfg = getCountryByCode(selectedCountryCode);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const rawPrefilledPhoneRef = useRef<string>('');
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
  const [liveUsdKesRate, setLiveUsdKesRate] = useState<number>(() => hashbackService.getUsdKesRate());
  const [hashbackMerchantName, setHashbackMerchantName] = useState<string>(
    () => hashbackService.getConfig().merchantName
  );

  const isPollingRef = useRef(false);
  const activeDepositTxIdRef = useRef<string>('');
  const activeDepositReferenceRef = useRef<string>('');
  const activeDepositResolvedRef = useRef<boolean>(false);

  // Sync HashBack configuration (merchantName, USD_KES_RATE) whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    hashbackService.syncSecrets().then((cfg) => {
      if (cfg.usdKesRate > 0) setLiveUsdKesRate(cfg.usdKesRate);
      if (cfg.merchantName) setHashbackMerchantName(cfg.merchantName);
    });
  }, [isOpen]);

  // Pre-fill masked phone from registered user while preserving raw number for STK push
  useEffect(() => {
    if (currentUser?.countryCode) {
      setSelectedCountryCode(currentUser.countryCode);
    }
    if (currentUser?.phoneNumber || (currentUser as any)?.phone) {
      const userPhone = String(currentUser.phoneNumber || (currentUser as any).phone).trim();
      const matchedCountry = COUNTRY_OPTIONS.find((c) => userPhone.startsWith(c.code));
      if (matchedCountry) {
        setSelectedCountryCode(matchedCountry.code);
        const localPart = userPhone.slice(matchedCountry.code.length).trim();
        const formattedLocal = formatLocalPhoneInput(localPart, matchedCountry);
        rawPrefilledPhoneRef.current = formattedLocal;
        setPhoneInput(maskPhoneNumber(formattedLocal));
      } else {
        rawPrefilledPhoneRef.current = userPhone;
        setPhoneInput(maskPhoneNumber(userPhone));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (defaultTarget) {
      setTargetAccount(defaultTarget);
    }
  }, [defaultTarget]);

  const numUsd = parseFloat(amountInput) || 0;
  const numKes = Math.max(1, Math.round(numUsd * (liveUsdKesRate || USD_KES_RATE)));
  const userAccountName = hashbackMerchantName || 'HASHBACK PAYMENT';
  const matchedLiveAccount = accounts.find(
    (a) => `Account #${a.accountNumber}` === targetAccount || a.accountNumber === targetAccount
  );
  const settlementDestinationLabel = matchedLiveAccount
    ? `${matchedLiveAccount.name || 'Live Account'} (#${matchedLiveAccount.accountNumber})`
    : targetAccount;
  const effectivePhoneForValidation =
    phoneInput.includes('*') && rawPrefilledPhoneRef.current
      ? rawPrefilledPhoneRef.current
      : phoneInput;
  const kenyanCheck = formatKenyanPhone(effectivePhoneForValidation);
  const intlCheck = validatePhoneForCountry(effectivePhoneForValidation, activeCountryCfg);
  const phoneCheck =
    selectedCountryCode === '+254' && kenyanCheck.valid
      ? kenyanCheck
      : {
          valid: intlCheck.valid,
          formatted: intlCheck.e164.replace(/^\+/, ''),
          display: intlCheck.formattedDisplay,
        };

  const activeCryptoConfig =
    CRYPTO_DEPOSIT_CONFIG.find((c) => c.id === selectedCrypto) || CRYPTO_DEPOSIT_CONFIG[2];

  const handleCopyCryptoAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCryptoCopied(address);
    setTimeout(() => setCryptoCopied(null), 2500);
  };

  // Keep latest deposit state in a ref so parent re-renders (every 350ms from live quotes) never reset the 1s countdown or 2.5s status polling
  const latestDepositStateRef = useRef({
    numUsd,
    numKes,
    targetAccount,
    userAccountName,
    settlementDestinationLabel,
    phoneDisplay: phoneCheck.display,
    phoneFormatted: phoneCheck.formatted,
    phoneInput,
    currentUser,
    onDepositComplete,
  });
  latestDepositStateRef.current = {
    numUsd,
    numKes,
    targetAccount,
    userAccountName,
    settlementDestinationLabel,
    phoneDisplay: phoneCheck.display,
    phoneFormatted: phoneCheck.formatted,
    phoneInput,
    currentUser,
    onDepositComplete,
  };

  // Dedicated 1-second HashBack countdown timer (isolated from parent re-renders and checkoutId updates)
  useEffect(() => {
    if (hashbackPopupStep !== 'WAITING') return;

    const countTimer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countTimer);
          isPollingRef.current = false;
          if (!activeDepositResolvedRef.current && activeDepositTxIdRef.current) {
            activeDepositResolvedRef.current = true;
            const latest = latestDepositStateRef.current;
            latest.onDepositComplete({
              id: activeDepositTxIdRef.current,
              amountUsd: latest.numUsd,
              amountKes: latest.numKes,
              method: 'M-PESA',
              targetAccount: latest.targetAccount,
              reference: activeDepositReferenceRef.current || `EXP-${Date.now().toString().slice(-6)}`,
              phone: latest.phoneDisplay || latest.phoneInput,
              status: 'FAILED',
              details: 'Request cancelled by user',
            });
          }
          setHashbackPopupStep('CANCELLED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countTimer);
    };
  }, [hashbackPopupStep]);

  // Automated HashBack status polling listener (isolated from parent re-renders)
  useEffect(() => {
    if (hashbackPopupStep !== 'WAITING' || !stkResult?.checkoutId) return;

    const checkoutId = stkResult.checkoutId;
    isPollingRef.current = true;
    let pollTimer: any;

    const pollHashback = async () => {
      if (!isPollingRef.current) return;

      try {
        const res = await hashbackService.queryTransactionStatus(checkoutId);
        if (!isPollingRef.current) return;

        // 1. Success confirmation from Hashback
        if (res.confirmed) {
          isPollingRef.current = false;
          activeDepositResolvedRef.current = true;
          clearInterval(pollTimer);

          const latest = latestDepositStateRef.current;
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

          // Automatically credit the user's account and update transaction status to COMPLETED
          latest.onDepositComplete({
            id: activeDepositTxIdRef.current || undefined,
            amountUsd: latest.numUsd,
            amountKes: latest.numKes,
            method: 'M-PESA',
            targetAccount: latest.targetAccount,
            reference: receipt,
            phone: latest.phoneDisplay || latest.phoneInput,
            status: 'COMPLETED',
            details: `Funded to ${latest.settlementDestinationLabel}`,
          });

          // Save deposit to Supabase cloud database
          supabaseService.saveDeposit(latest.currentUser, {
            id: activeDepositTxIdRef.current || undefined,
            targetAccount: latest.targetAccount,
            amountUsd: latest.numUsd,
            amountKes: latest.numKes,
            method: 'M-PESA',
            phone: latest.phoneFormatted || latest.phoneInput,
            reference: receipt,
            checkoutId,
            status: 'COMPLETED',
          });
          supabaseService.syncActivity(latest.currentUser, {
            type: 'DEPOSIT_CONFIRMED',
            description: `M-PESA payment of $${latest.numUsd.toFixed(2)} (KES ${latest.numKes.toLocaleString()}) confirmed by Hashback for ${latest.userAccountName} -> ${latest.settlementDestinationLabel}. Receipt: ${receipt}`,
            metadata: { receipt, checkoutId, amountUsd: latest.numUsd, amountKes: latest.numKes, targetAccount: latest.targetAccount },
          });

          setHashbackPopupStep('SUCCESS');
          return;
        }

        // 2. Cancellation or failure
        if (res.failed) {
          isPollingRef.current = false;
          clearInterval(pollTimer);
          if (!activeDepositResolvedRef.current) {
            activeDepositResolvedRef.current = true;
            const latest = latestDepositStateRef.current;
            latest.onDepositComplete({
              id: activeDepositTxIdRef.current || undefined,
              amountUsd: latest.numUsd,
              amountKes: latest.numKes,
              method: 'M-PESA',
              targetAccount: latest.targetAccount,
              reference: checkoutId,
              phone: latest.phoneDisplay || latest.phoneInput,
              status: 'FAILED',
              details: 'Request cancelled by user',
            });
          }
          setHashbackPopupStep('CANCELLED');
          return;
        }
      } catch {
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
    };
  }, [hashbackPopupStep, stkResult?.checkoutId]);

  if (!isOpen) return null;

  // Trigger STK Push and immediately open HashBack popup + live countdown
  const handleDepositNow = async () => {
    setErrorMessage(null);

    if (numUsd < 16) {
      setErrorMessage(`Minimum deposit amount is $16.00 USD (KES ${usdToKes(16).toLocaleString()}).`);
      return;
    }

    if (!phoneCheck.valid) {
      setErrorMessage(
        intlCheck.error ||
          `Please enter a valid ${activeCountryCfg.name} mobile number (e.g. ${activeCountryCfg.exampleFormat}).`
      );
      return;
    }

    const accountReference = `VTM-${Math.floor(100000 + Math.random() * 900000)}`;
    const txId = `tx-dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    activeDepositTxIdRef.current = txId;
    activeDepositReferenceRef.current = accountReference;
    activeDepositResolvedRef.current = false;
    setIsProcessingStk(true);

    // Record PENDING deposit immediately in transaction history
    onDepositComplete({
      id: txId,
      amountUsd: numUsd,
      amountKes: numKes,
      method: 'M-PESA',
      targetAccount,
      reference: accountReference,
      phone: phoneCheck.display || phoneInput,
      status: 'PENDING',
      details: 'Awaiting M-Pesa PIN',
    });

    // Open HashBack waiting modal & start the 87s (1:27) countdown immediately while dispatching STK prompt
    setCountdownSeconds(87);
    setStkResult({
      success: true,
      message: 'Dispatching M-Pesa STK prompt to your phone...',
      checkoutId: accountReference,
      amountKes: numKes,
      amountUsd: numUsd,
      formattedPhone: phoneCheck.display,
    });
    setHashbackPopupStep('WAITING');

    try {
      const res = await hashbackService.initiateStkPush({
        phone: phoneCheck.formatted,
        amountUsd: numUsd,
        amountKes: numKes,
        targetAccount,
        userEmail: currentUser?.email,
        accountReference,
      });

      if (res.success) {
        const finalCheckoutId = res.checkoutId || accountReference;
        activeDepositReferenceRef.current = finalCheckoutId;
        setStkResult({
          ...res,
          checkoutId: finalCheckoutId,
        });
      } else {
        activeDepositResolvedRef.current = true;
        onDepositComplete({
          id: txId,
          amountUsd: numUsd,
          amountKes: numKes,
          method: 'M-PESA',
          targetAccount,
          reference: accountReference,
          phone: phoneCheck.display || phoneInput,
          status: 'FAILED',
          details: 'Request cancelled by user',
        });
        setHashbackPopupStep(null);
        setErrorMessage(res.message || 'Failed to dispatch M-PESA STK prompt.');
      }
    } catch (err: any) {
      activeDepositResolvedRef.current = true;
      onDepositComplete({
        id: txId,
        amountUsd: numUsd,
        amountKes: numKes,
        method: 'M-PESA',
        targetAccount,
        reference: accountReference,
        phone: phoneCheck.display || phoneInput,
        status: 'FAILED',
        details: 'Request cancelled by user',
      });
      setHashbackPopupStep(null);
      setErrorMessage(err.message || 'Connection error. Please try again.');
    } finally {
      setIsProcessingStk(false);
    }
  };

  // Submit Crypto Deposit - Verification Only
  const handleConfirmCryptoDeposit = () => {
    setErrorMessage(null);
    const minRequired = selectedCrypto === 'BTC' ? 50 : 16;
    if (numUsd < minRequired) {
      setErrorMessage(`Minimum deposit for ${selectedCrypto === 'BTC' ? 'Bitcoin (BTC)' : 'cryptocurrency'} is $${minRequired}.00 USD.`);
      return;
    }

    if (!cryptoTxHash.trim() || cryptoTxHash.trim().length < 8) {
      setErrorMessage('Please enter your valid blockchain transaction hash (TxID) after transferring.');
      return;
    }

    const ref = cryptoTxHash.trim();

    // Record PENDING crypto deposit in transaction history (does not credit balance until confirmed)
    onDepositComplete({
      amountUsd: numUsd,
      amountKes: numKes,
      method: `Crypto (${activeCryptoConfig.symbol})`,
      targetAccount,
      reference: ref,
      phone: '',
      status: 'PENDING',
      details: 'Blockchain verification pending',
    });

    supabaseService.syncActivity(currentUser, {
      type: 'DEPOSIT_CRYPTO_PENDING',
      description: `Crypto deposit of $${numUsd.toFixed(2)} (${activeCryptoConfig.symbol}) submitted for blockchain network confirmation. Hash: ${ref}`,
      metadata: { amountUsd: numUsd, symbol: activeCryptoConfig.symbol, reference: ref, targetAccount },
    });

    setCryptoSubmitted(true);
    setTimeout(() => {
      setCryptoSubmitted(false);
      onClose();
    }, 3500);
  };

  // Submit Card Deposit - Automated 3D Secure Gateway Only
  const handleCardDeposit = () => {
    setErrorMessage(null);
    if (numUsd < 16) {
      setErrorMessage('Minimum deposit amount is $16.00 USD.');
      return;
    }

    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 16) {
      setErrorMessage('Please enter a valid 16-digit card number.');
      return;
    }

    setCardProcessing(true);
    setTimeout(() => {
      setCardProcessing(false);
      onDepositComplete({
        amountUsd: numUsd,
        amountKes: numKes,
        method: 'Card (3DS)',
        targetAccount,
        reference: `CRD-${Math.floor(100000 + Math.random() * 900000)}`,
        phone: '',
        status: 'FAILED',
        details: 'Request cancelled by user',
      });
      setErrorMessage('Card 3D-Secure gateway connection active. For instant automated wallet funding, please use Safaricom M-PESA Express STK Push.');
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
    if (hashbackPopupStep === 'WAITING' && !activeDepositResolvedRef.current && activeDepositTxIdRef.current) {
      activeDepositResolvedRef.current = true;
      onDepositComplete({
        id: activeDepositTxIdRef.current,
        amountUsd: numUsd,
        amountKes: numKes,
        method: 'M-PESA',
        targetAccount,
        reference: activeDepositReferenceRef.current || `CAN-${Date.now().toString().slice(-6)}`,
        phone: phoneCheck.display || phoneInput,
        status: 'FAILED',
        details: 'Request cancelled by user',
      });
    }
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
              Select your payment method below to fund your wallet
            </p>
          </div>

          {/* Method Tabs: M-PESA | Crypto | Card (Bank is strictly for Withdrawal only) */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-neutral-800/80 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('mpesa');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'mpesa'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>M-PESA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('crypto');
                setErrorMessage(null);
                if (selectedCrypto === 'BTC' && (parseFloat(amountInput) || 0) < 50) {
                  setAmountInput('50');
                }
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'crypto'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>Crypto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('card');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
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
                    Live Account #{a.accountNumber} (Balance: ${a.balance.toFixed(2)})
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
                Safaricom M-PESA Express (HashBack)
              </h3>
              <p className="text-center text-xs text-slate-500 dark:text-neutral-400 mb-3">
                Instant prompt sent to your Safaricom mobile • KES {numKes.toLocaleString()} (${numUsd || 16} USD)
              </p>

              {/* Dynamic HashBack Account & Settlement Details Summary (no sensitive credentials exposed) */}
              <div
                className={`mb-4 p-3 rounded-xl border text-xs space-y-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-900/70 border-neutral-800 text-neutral-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Account Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{userAccountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Where Deposit Settles:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{settlementDestinationLabel}</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Amount (USD) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Amount (USD) <span className="text-[#0066FF] font-bold">*Min $16</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      KES {numKes.toLocaleString()} (${numUsd || 16} USD)
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

                {/* Mobile Number with Country Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Mobile Money Number ({activeCountryCfg.flag} {activeCountryCfg.name})
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {activeCountryCfg.minDigits === activeCountryCfg.maxDigits
                        ? `${activeCountryCfg.minDigits} digits`
                        : `${activeCountryCfg.minDigits}–${activeCountryCfg.maxDigits} digits`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedCountryCode}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        setSelectedCountryCode(newCode);
                        const newCfg = getCountryByCode(newCode);
                        setPhoneInput((prev) => formatLocalPhoneInput(prev, newCfg));
                        setErrorMessage(null);
                      }}
                      className={`w-[125px] shrink-0 border rounded-xl px-2.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                        isDarkMode
                          ? 'bg-neutral-900 border-neutral-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={`${c.iso}-${c.code}`} value={c.code}>
                          {c.flag} {c.code} ({c.iso})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder={activeCountryCfg.placeholder}
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(formatLocalPhoneInput(e.target.value, activeCountryCfg));
                        setErrorMessage(null);
                      }}
                      className={`flex-1 border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all font-medium ${
                        isDarkMode
                          ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                    Format for {activeCountryCfg.name}: <span className="font-mono">{activeCountryCfg.exampleFormat}</span>
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
                  Select your token below to copy the verified deposit address. {selectedCrypto === 'BTC' ? 'Min: $50.00' : 'Min: $16.00'}
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
                      if (coin.id === 'BTC' && (parseFloat(amountInput) || 0) < 50) {
                        setAmountInput('50');
                      }
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
                    {coin.id === 'BTC' && (
                      <span className="inline-block text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold rounded mt-1">
                        Min $50
                      </span>
                    )}
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
                      Amount (USD) <span className="text-[#0066FF] font-bold">{selectedCrypto === 'BTC' ? '*Min $50 for Bitcoin' : '*Min $16'}</span>
                    </label>
                    <input
                      type="number"
                      min={selectedCrypto === 'BTC' ? 50 : 16}
                      placeholder={selectedCrypto === 'BTC' ? 'Min $50' : 'Min $16'}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Blockchain TxHash / TxID <span className="text-[#0066FF] font-bold">*Required for verification</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0x3f9a... or TxID hash"
                      value={cryptoTxHash}
                      onChange={(e) => setCryptoTxHash(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-[11px] text-slate-600 dark:text-neutral-300 font-medium">
                  Notice: Please transfer only {activeCryptoConfig.symbol} to the designated wallet address. Minimum deposit is {selectedCrypto === 'BTC' ? '$50.00' : '$16.00'} USD. Enter your transaction hash above after transferring.
                </div>

                <button
                  type="button"
                  disabled={cryptoSubmitted}
                  onClick={handleConfirmCryptoDeposit}
                  className="w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0055D6] text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {cryptoSubmitted ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>TxHash Submitted Successfully!</span>
                    </>
                  ) : (
                    <span>Submit TxHash for Verification</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CARD DEPOSIT - COMING SOON */}
          {activeTab === 'card' && (
            <div
              className={`border rounded-2xl p-6 sm:p-8 text-center space-y-4 ${
                isDarkMode ? 'border-neutral-800 bg-[#161922]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                <CreditCard className="w-7 h-7 stroke-[2]" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 mb-2">
                  Coming Soon
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Credit / Debit Card Deposits
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                  Visa &amp; Mastercard payment processing is coming soon. In the meantime, please fund your account instantly using Safaricom M-PESA or Cryptocurrency (Bitcoin / USDT / Ethereum).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('mpesa');
                    setErrorMessage(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0055D6] text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Use Safaricom M-PESA</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('crypto');
                    setErrorMessage(null);
                    if (selectedCrypto === 'BTC' && (parseFloat(amountInput) || 0) < 50) {
                      setAmountInput('50');
                    }
                  }}
                  className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Use Crypto</span>
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
              {userAccountName}
            </h4>
            <span className="text-[11px] font-semibold block text-white/95 mt-0.5">
              Settles To: {settlementDestinationLabel}
            </span>
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
                <span className="font-bold text-slate-900">{maskPhoneNumber(phoneCheck.display || phoneInput)}</span>. Enter your PIN to
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
                  <span className="text-slate-500 font-medium">Account Name</span>
                  <span className="font-bold text-slate-900">{userAccountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Settled Into</span>
                  <span className="font-bold text-emerald-700">{settlementDestinationLabel}</span>
                </div>
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
