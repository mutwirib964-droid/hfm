import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Headphones,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface DedicatedTraderSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  currentUser?: any;
}

const QUICK_PROMPTS = [
  'How do I deposit funds via Safaricom M-PESA?',
  'What is the minimum Bitcoin deposit & withdrawal?',
  'How does the VTM Pro Live Chart execution work?',
  'Explain leverage, free margin & lot size rules',
  'How do automated Bots & EAs operate on my account?',
  'What are the requirements for Trader Cashbacks?',
];

function generateInstitutionalAnswer(query: string, user?: any): string {
  const q = (query || '').toLowerCase();

  if (q.includes('m-pesa') || q.includes('mpesa') || (q.includes('deposit') && q.includes('phone'))) {
    return `### Safaricom M-PESA Express STK Deposit Guide\n\n1. **Direct Funding**: Go to the **Wallet** tab or click the green **Deposit** button in the top navigation bar.\n2. **Select Account**: Choose whether to fund your **VTM One Wallet** or a specific **Live Trading Account**.\n3. **Enter Amount**: Minimum deposit is **$16.00 USD** (converted at **1 USD = 129.50 KES**).\n4. **STK Push**: Enter your Safaricom phone number (e.g. 07XXXXXXXX or 01XXXXXXXX). Your phone will receive an STK prompt to enter your M-PESA PIN.\n5. **Instant Credit**: Once confirmed, your balance is credited immediately with 0% processing fee and synced to the cloud database.`;
  }

  if (q.includes('bitcoin') || q.includes('crypto') || q.includes('btc') || q.includes('usdt') || q.includes('eth')) {
    return `### Cryptocurrency Deposit & Withdrawal Policy\n\n- **Bitcoin (BTC) Deposit**: Minimum is **$50.00 USD**. Deposits are credited upon network confirmation.\n- **USDT (TRC20/ERC20) & Ethereum (ETH)**: Supported directly in the Wallet tab.\n- **Crypto Withdrawals**: Minimum withdrawal is **$35.00 USD**. Processed automatically from Pending (3 seconds) to Completed.\n- **Security**: All transactions are recorded in real time and reflected immediately in your account balance.`;
  }

  if (q.includes('withdraw') || q.includes('payout') || q.includes('cash out')) {
    return `### Withdrawal Methods & Execution Speed\n\n1. **Safaricom M-PESA & Crypto Payouts**:\n   - Minimum Withdrawal: **$35.00 USD**.\n   - Processing Flow: Every withdrawal starts as **PENDING** for **3 seconds**, then automatically transitions to **COMPLETED (Successful)**.\n   - Balance Deduction: The withdrawn amount is immediately deducted from your source account and saved permanently to your cloud profile.\n2. **Fee**: 0% withdrawal fee across all supported payment channels.`;
  }

  if (q.includes('chart') || q.includes('tradingview') || q.includes('vtm pro') || q.includes('price')) {
    return `### VTM Pro Live Execution Charting\n\n- **1:1 Price Synchronization**: The live candlestick chart is synchronized tick-by-tick with the **BUY (Ask)** and **SELL (Bid)** execution buttons.\n- **Accurate P/L**: Floating P/L is calculated directly from the live price difference (\`Current Price - Open Price\` for BUY, \`Open Price - Current Price\` for SELL) multiplied by your lot size and contract size.\n- **Latest 20 Trades**: Your latest 20 closed trades are automatically saved in the cloud database and visible under the Positions tab.`;
  }

  if (q.includes('leverage') || q.includes('margin') || q.includes('lot') || q.includes('stop out') || q.includes('free margin')) {
    return `### Leverage, Free Margin & Lot Size Capital Rules\n\n- **Zero Free Margin Protection**: New trades cannot be opened when your **Free Margin is $0.00** or when your account balance is $0.00.\n- **Lot Size vs. Account Balance**: Every **0.01 lot** requires at least **$10.00 USD** of account capital/free margin (e.g., **0.10 lot** requires at least **$100.00 USD** balance).\n- **Contract Sizes**:\n  - Forex Pairs: 100,000 units per 1.00 lot\n  - Bitcoin / Ethereum (BTCUSD, ETHUSD): 1 coin per 1.00 lot\n  - Gold (XAUUSD): 100 oz per 1.00 lot\n- **Zero-Balance Protection**: Your account balance is protected from going negative; if equity reaches $0, open trades close automatically.`;
  }

  if (q.includes('bot') || q.includes('ea') || q.includes('algorithmic') || q.includes('automated')) {
    return `### Algorithmic Bots & Expert Advisors (EAs)\n\n- **Access**: Click **Bots & EAs** in the navigation bar to launch the Algorithmic Trading Center.\n- **Pre-Configured EAs**: Includes **VTM Trend Matrix EA**, **Alpha Scalper Pro**, **Gold London Breakout**, and **Crypto Momentum Pulse**.\n- **Capital Safeguards**: Bots verify that your Free Margin is above $0 and that your account balance meets the required capital for the configured lot size before opening any position.`;
  }

  if (q.includes('copy') || q.includes('hfcopy') || q.includes('strategy')) {
    return `### Copy Trading (VTM Copy)\n\n- **How It Works**: Browse verified strategy providers, review their historical win rate and drawdown, and allocate capital.\n- **Risk Controls**: Configure your Volume Allocation percentage and Rescue Stop-Loss level at any time.`;
  }

  if (q.includes('cashback') || q.includes('reward') || q.includes('100 lot') || q.includes('loyalty')) {
    return `### Trader Rewards & Cashbacks Program\n\n- **Activation**: Unlocks when your cumulative trading volume reaches **100.0 Traded Lots**.\n- **Tiers**:\n  - **Silver (100–499 Lots)**: **$2.50 / lot** cash rebate.\n  - **Gold (500–1,999 Lots)**: **$4.00 / lot** cash rebate + Equinix VPS.\n  - **Diamond VIP (2,000+ Lots)**: **$6.00 / lot** cash rebate + Zero swap fees.`;
  }

  if (q.includes('verify') || q.includes('kyc') || q.includes('2fa') || q.includes('security')) {
    return `### Account Verification (KYC) & 2FA Security\n\n- **KYC Verification**: Open the **Accounts -> Verification** tab to view your verified profile and KYC status.\n- **Two-Factor Authentication (2FA)**: Enable Google Authenticator or SMS 2FA in the **Security & 2FA** settings to protect sign-ins and withdrawals.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('help') || q.includes('support')) {
    return `### Welcome to VTM Dedicated Trader Support\n\nHello **${user?.name || 'Trader'}**! Our 24/7 Priority Execution Desk is online and ready to help.\n\nYou can ask me about:\n- **Deposits & Withdrawals** (M-PESA STK min $16, withdrawals min $35 with 3s auto-completion)\n- **Lot Size & Margin Requirements** ($10 minimum balance per 0.01 lot, Free Margin protection)\n- **Bots & EAs**, **Live Charts**, or **Account Settings**.\n\nType any question below and I will answer immediately!`;
  }

  return `### VTM Priority Execution Desk Response\n\nThank you for your inquiry regarding **"${query}"**.\n\n- **Account Status**: Active session under **${user?.name || 'Trader'}** (${user?.email || 'Verified Client'}).\n- **Trading Rules**: Ensure your **Free Margin is above $0.00** and your **Account Balance** supports your selected lot size (at least **$10.00 per 0.01 lot**).\n- **Funding & Payouts**: Deposits start from **$16.00** (instant credit), and withdrawals start from **$35.00** (3-second pending to automatic completion).\n- **Trade History**: Your latest 20 closed trades are automatically saved in the cloud database and visible under the **Positions -> Closed** tab.\n\nPlease let us know if you would like specific details on deposits, withdrawals, lot sizes, or EAs!`;
}

export const DedicatedTraderSupportModal: React.FC<DedicatedTraderSupportModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  currentUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Welcome to **VTM Dedicated Trader Support** (24/7 Priority Execution Desk).\n\nAsk me anything about:\n- **Deposits & Payouts** (M-PESA STK min $16, Withdrawals min $35)\n- **Order Execution & Margin** (Lot size capital rules, Free Margin protection)\n- **Trading Bots, EAs & Live Charts**\n\nHow can I assist your trading session today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const raw = typeof textToSend === 'string' ? textToSend : inputValue;
    const query = (raw || '').trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (typeof textToSend !== 'string') {
      setInputValue('');
    }
    setIsTyping(true);

    setTimeout(() => {
      try {
        const answer = generateInstitutionalAnswer(query, currentUser);
        const aiMsg: Message = {
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sender: 'ai',
          text: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const fallbackMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Our 24/7 execution desk has received your message. Deposits start at $16, withdrawals at $35, and every 0.01 lot requires at least $10 in account balance.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      } finally {
        setIsTyping(false);
      }
    }, 350);
  };

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[700px] ${
          isDarkMode
            ? 'bg-[#0E1117] border-neutral-800 text-neutral-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isDarkMode
              ? 'border-neutral-800 bg-[#141822]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : 'bg-blue-50 border-blue-200 text-blue-600'
                }`}
              >
                <Headphones className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#10131A]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Dedicated Trader Support
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isDarkMode
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  24/7 Live Desk
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                Priority Market Queries, Risk &amp; Account Advisory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 p-4 overflow-y-auto space-y-3.5 ${
            isDarkMode ? 'bg-[#0E1117]' : 'bg-slate-50/70'
          }`}
        >
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[92%] ${
                  isAi ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-end'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    isAi
                      ? isDarkMode
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-[#E51937] text-white'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Content Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1.5 shadow-xs relative group ${
                    isAi
                      ? isDarkMode
                        ? 'bg-[#181C26] border border-neutral-800 text-neutral-200'
                        : 'bg-white border border-slate-200 text-slate-800'
                      : 'bg-[#E51937] text-white font-medium'
                  }`}
                >
                  <div className="whitespace-pre-line font-sans space-y-1">
                    {m.text}
                  </div>

                  <div
                    className={`flex items-center justify-between gap-3 pt-1 text-[10px] font-mono ${
                      isAi
                        ? isDarkMode
                          ? 'text-neutral-400'
                          : 'text-slate-400'
                        : 'text-white/80'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {isAi && (
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.text)}
                        className="opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                        title="Copy Response"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className={`flex items-center gap-2 text-xs px-2 py-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Compiling institutional response...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div
          className={`px-4 py-2 border-t overflow-x-auto no-scrollbar whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            isDarkMode
              ? 'border-neutral-800 bg-[#10131A]'
              : 'border-slate-200 bg-slate-100'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold mr-1 flex items-center gap-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Topics:</span>
          </span>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
                  : 'bg-white hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 border-slate-300 shadow-2xs'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Message Input Footer */}
        <div
          className={`p-3 border-t flex items-center gap-2 shrink-0 ${
            isDarkMode
              ? 'border-neutral-800 bg-[#0E1117]'
              : 'border-slate-200 bg-white'
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your question (e.g., M-Pesa deposit, Bitcoin min, live charts, leverage)..."
            className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 font-sans ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
              inputValue.trim() && !isTyping
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                : isDarkMode
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
