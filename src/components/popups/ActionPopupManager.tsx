import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { ActionPopup } from '../../types';

interface ActionPopupManagerProps {
  currentPopup: ActionPopup | null;
  onDismiss: () => void;
  isDarkMode?: boolean;
}

export const ActionPopupManager: React.FC<ActionPopupManagerProps> = ({
  currentPopup,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState<ActionPopup | null>(null);

  useEffect(() => {
    if (currentPopup) {
      setPopup(currentPopup);
      setVisible(true);

      // Clean auto-dismiss in 3.2 seconds
      const timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 200);
      }, currentPopup.duration || 3200);

      return () => clearTimeout(timeout);
    } else {
      setVisible(false);
    }
  }, [currentPopup, onDismiss]);

  if (!popup || !visible) return null;

  const isError = popup.type === 'ERROR' || popup.type === 'DEPOSIT_FAILED' || popup.type === 'WITHDRAWAL_FAILED';

  // Format concise text matching user's requested style:
  // "trade of (currency) is open, trade of (currency) is closed, bot (started), bot is closed and other relevant"
  const getDisplayMessage = (): string => {
    const symbol = popup.details?.symbol;

    switch (popup.type) {
      case 'TRADE_OPENED':
        return symbol ? `Trade of ${symbol} is open` : (popup.title || 'Trade is open');
      case 'TRADE_CLOSED':
        return symbol ? `Trade of ${symbol} is closed` : (popup.title || 'Trade is closed');
      case 'BOT_STARTED':
        return 'Bot started';
      case 'BOT_STOPPED':
        return 'Bot closed';
      case 'ORDER_CANCELLED':
        return symbol ? `Order cancelled for ${symbol}` : 'Order cancelled';
      case 'DEPOSIT_SUCCESS':
        return 'Deposit completed';
      case 'WITHDRAWAL_SUCCESS':
        return 'Withdrawal submitted';
      case 'TRANSFER_SUCCESS':
        return 'Transfer completed';
      case 'ACCOUNT_SWITCHED':
        return popup.title || 'Account switched';
      case 'ACCOUNT_CREATED':
        return 'Account opened';
      case 'DEMO_RESET':
        return 'Demo balance reset';
      case 'LOGIN_SUCCESS':
        return 'Logged in';
      case 'LOGOUT_SUCCESS':
        return 'Logged out';
      case 'ERROR':
        return popup.title || 'Action error';
      default:
        return popup.title || 'Success';
    }
  };

  const message = getDisplayMessage();

  return (
    <div
      id="action-toast-container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] pointer-events-none flex flex-col items-center w-full max-w-md px-4"
    >
      <div
        id="action-toast-pill"
        className="pointer-events-auto flex items-center gap-3 bg-white text-neutral-900 border border-neutral-200/90 shadow-lg shadow-black/10 rounded-xl px-4 py-3 min-w-[220px] max-w-md transition-all duration-200 animate-in fade-in slide-in-from-top-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left icon: Solid black circle with white checkmark inside (Pic 3 & Pic 4) or Rose circle on error */}
        {isError ? (
          <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        )}

        {/* Message */}
        <span className="text-sm font-semibold text-neutral-900 tracking-tight select-none leading-snug">
          {message}
        </span>

        {/* Dismiss 'x' button */}
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 150);
          }}
          className="ml-auto -mr-1 p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition shrink-0 self-center"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
