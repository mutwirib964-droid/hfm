import React from 'react';
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
} from 'lucide-react';
import { ActionPopup } from '../../types';

interface ActionToastBannerProps {
  toasts: ActionPopup[];
  onDismiss: (id: string) => void;
}

export const ActionToastBanner: React.FC<ActionToastBannerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 sm:right-6 z-[120] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.slice(0, 4).map((toast) => {
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
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-2 ${
              isError
                ? 'bg-neutral-900/95 border-rose-500/40 text-white'
                : isSuccess
                ? 'bg-neutral-900/95 border-emerald-500/40 text-white'
                : 'bg-neutral-900/95 border-neutral-700 text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
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
              className="text-neutral-400 hover:text-white p-1 -mr-1 -mt-1 rounded transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
