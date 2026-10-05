import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Cpu,
  Users,
  BellRing,
} from 'lucide-react';
import { ActionPopup } from '../../types';

interface ActionToastBannerProps {
  toasts?: ActionPopup[];
  popups?: ActionPopup[];
  onDismiss: (id: string) => void;
  isDarkMode?: boolean;
}

const ToastItem: React.FC<{
  toast: ActionPopup;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Auto-dismiss automatically after 3.2 seconds guaranteed
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismissRef.current(toast.id);
    }, 3200);

    return () => clearTimeout(timer);
  }, [toast.id]);

  const isPriceAlert = toast.type === 'PRICE_ALERT';
  const isSuccess =
    toast.type.includes('SUCCESS') ||
    toast.type === 'TRADE_OPENED' ||
    toast.type === 'TRADE_CLOSED' ||
    toast.type === 'ACCOUNT_SWITCHED' ||
    toast.type === 'ACCOUNT_CREATED' ||
    toast.type === 'DEMO_RESET' ||
    toast.type === 'BOT_STARTED';

  const isError = toast.type.includes('FAILED') || toast.type === 'ERROR';

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-2 ${
        isPriceAlert
          ? 'bg-neutral-900/95 border-amber-500/70 text-white ring-1 ring-amber-500/30'
          : isError
          ? 'bg-neutral-900/95 border-rose-500/40 text-white'
          : isSuccess
          ? 'bg-neutral-900/95 border-emerald-500/40 text-white'
          : 'bg-neutral-900/95 border-neutral-700 text-white'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isPriceAlert && (
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center animate-bounce">
            <BellRing className="w-4 h-4 text-amber-400" />
          </div>
        )}
        {toast.type === 'TRADE_OPENED' && toast.details?.side === 'BUY' && (
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        )}
        {toast.type === 'TRADE_OPENED' && toast.details?.side === 'SELL' && (
          <TrendingDown className="w-5 h-5 text-rose-400" />
        )}
        {toast.type === 'TRADE_CLOSED' && (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        )}
        {toast.type === 'DEPOSIT_SUCCESS' && (
          <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
        )}
        {toast.type === 'WITHDRAWAL_SUCCESS' && (
          <ArrowUpRight className="w-5 h-5 text-blue-400" />
        )}
        {toast.type === 'ACCOUNT_SWITCHED' && (
          <Wallet className="w-5 h-5 text-cyan-400" />
        )}
        {toast.type === 'BOT_STARTED' && (
          <Cpu className="w-5 h-5 text-emerald-400" />
        )}
        {toast.type === 'BOT_STOPPED' && (
          <Cpu className="w-5 h-5 text-amber-400" />
        )}
        {toast.type === 'COPY_STARTED' && (
          <Users className="w-5 h-5 text-blue-400" />
        )}
        {toast.type === 'COPY_STOPPED' && (
          <Users className="w-5 h-5 text-amber-400" />
        )}
        {toast.type === 'DEMO_RESET' && (
          <RefreshCw className="w-5 h-5 text-amber-400" />
        )}
        {isError && (
          <AlertCircle className="w-5 h-5 text-rose-400" />
        )}
        {!isError &&
          !isPriceAlert &&
          toast.type !== 'TRADE_OPENED' &&
          toast.type !== 'TRADE_CLOSED' &&
          toast.type !== 'DEPOSIT_SUCCESS' &&
          toast.type !== 'WITHDRAWAL_SUCCESS' &&
          toast.type !== 'ACCOUNT_SWITCHED' &&
          toast.type !== 'BOT_STARTED' &&
          toast.type !== 'BOT_STOPPED' &&
          toast.type !== 'COPY_STARTED' &&
          toast.type !== 'COPY_STOPPED' &&
          toast.type !== 'DEMO_RESET' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold leading-tight truncate">{toast.title}</h5>
          <span className="text-[10px] text-neutral-400 font-mono ml-2">Just now</span>
        </div>
        {toast.subtitle && (
          <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug line-clamp-2">
            {toast.subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-neutral-400 hover:text-white p-1 -mr-1 -mt-1 rounded transition shrink-0 cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Auto-dismiss timer progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-500/70 animate-[shrink_3.2s_linear_forwards]" />
      </div>
    </div>
  );
};

export const ActionToastBanner: React.FC<ActionToastBannerProps> = ({ toasts, popups, onDismiss }) => {
  const list = toasts || popups || [];
  if (!list || list.length === 0) return null;

  return (
    <div className="fixed top-14 sm:top-4 right-3 sm:right-6 left-3 sm:left-auto z-[120] flex flex-col gap-2 pointer-events-none max-w-sm sm:max-w-md w-auto">
      {list.slice(0, 1).map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

