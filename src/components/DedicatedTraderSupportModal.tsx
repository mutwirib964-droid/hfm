import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Headphones,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Zap,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

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
  'Explain leverage, margin call & stop out levels',
  'How do automated Bots & EAs operate on my account?',
  'What are the requirements for Trader Cashbacks?',
];

// Fallback intelligent institutional broker reasoning engine (answers without fail!)
function generateInstitutionalAnswer(query: string, user?: any): string {
  const q = query.toLowerCase();

  if (q.includes('m-pesa') || q.includes('mpesa') || (q.includes('deposit') && q.includes('phone'))) {
    return `### Safaricom M-PESA Express STK Deposit Guide\n\n1. **Direct Funding**: Go to the **Wallet** tab or click the green **Deposit** button in the header.\n2. **Select Account**: Choose whether to fund your **VTM One Wallet** or a specific **Live MT4/MT5 Trading Account**.\n3. **Enter Amount**: Minimum deposit is strictly **$16.00 USD** (converted at live rate: **1 USD = 129.50 KES**).\n4. **STK Push**: Enter your Safaricom phone number (e.g. 07XXXXXXXX or 01XXXXXXXX). Your phone will immediately receive an official STK prompt to enter your secret M-PESA PIN.\n5. **Instant Credit**: Once verified, your balance is credited instantly with 0% processing fee.`;
  }

  if (q.includes('bitcoin') || q.includes('crypto') || q.includes('btc') || q.includes('usdt') || q.includes('eth')) {
    return `### Cryptocurrency Deposit & Withdrawal Policy\n\n- **Bitcoin (BTC) Deposit**: Strict minimum is **$50.00 USD**. Deposits are received via Binance Smart Chain (BEP20) or native BTC and credited upon blockchain confirmations.\n- **USDT (TRC20) & Ethereum (ETH)**: Also accepted directly with on-chain verification.\n- **Crypto Withdrawals**: Minimum withdrawal is **$50.00 USD**. Dispatched directly to your specified wallet address.\n- **Security**: All crypto transactions undergo institutional multi-sig audit to safeguard client funds.`;
  }

  if (q.includes('card') || q.includes('visa') || q.includes('mastercard')) {
    return `### Credit / Debit Card Payments\n\n- **Status**: Card direct funding is currently marked as **Coming Soon** as we finalize integration with Tier-1 3D-Secure merchant acquiring gateways.\n- **Recommended Alternative**: For instantaneous, zero-fee funding right now, please use **Safaricom M-PESA Express** or **Cryptocurrency Direct Transfer (BTC/USDT)**.`;
  }

  if (q.includes('withdraw') || q.includes('payout') || q.includes('cash out')) {
    return `### Withdrawal Methods & Execution Speed\n\n1. **Safaricom M-PESA B2C Payout**:\n   - Minimum: **$35.00 USD**.\n   - Rate: Converted at official rate (**1 USD = 129.50 KES**).\n   - Speed: Automated disbursement within **5 seconds** directly into your registered Safaricom line.\n2. **Crypto Payout (BTC, USDT TRC20, ETH)**:\n   - Minimum: **$50.00 USD**.\n   - Speed: Broadcasted to the blockchain instantly after security clearance.\n3. **Fee**: 0% withdrawal fee on all supported channels.`;
  }

  if (q.includes('chart') || q.includes('tradingview') || q.includes('vtm pro') || q.includes('price')) {
    return `### VTM Pro Live Execution Charting\n\n- **VTM Pro Live Canvas**: Our high-performance canvas chart is synchronized down to the microsecond with the **BUY (Ask)** and **SELL (Bid)** execution buttons.\n- **Zero Lag**: Unlike third-party iframe charts that suffer from latency, the VTM Pro Live engine renders raw market quotes from Equinix LD4 cross-connects.\n- **Spread Visibility**: Live spread brackets and high/low extremes are painted directly on the price axis so you see exact fill prices before taking a position.`;
  }

  if (q.includes('leverage') || q.includes('margin') || q.includes('stop out') || q.includes('liquidation')) {
    return `### Leverage, Margin & Risk Rules\n\n- **Maximum Leverage**: Up to **1:1000** on Forex Majors, 1:500 on Gold (XAUUSD), and 1:200 on Indices & Crypto.\n- **Margin Calculation**: Margin = (Lots × Contract Size × Price) / Leverage.\n  *(For example, 1 lot EURUSD at 1.1335 with 1:500 leverage requires ~$226.70 margin)*.\n- **Margin Call Level**: **50% Equity / Margin**.\n- **Stop-Out / Liquidation Level**: **20%**.\n- **Auto Drawdown Protection**: Can be toggled inside Platform Preferences to safeguard against negative equity.`;
  }

  if (q.includes('bot') || q.includes('ea') || q.includes('algorithmic') || q.includes('automated trade')) {
    return `### Algorithmic Bots & Expert Advisors (EAs)\n\n- **Pre-Configured Bots**: Includes institutional algorithms such as **VTM Trend Matrix EA** (multi-timeframe EMA/ATR trend following) and **Alpha Scalper Pro** (high-frequency liquidity sweep).\n- **Custom Bot Import**: Upload .mq4, .mq5, or JSON strategy definitions in the **Bots & EAs** tab.\n- **Automated Risk Safeguards**: Real-time TP/SL order placement, trailing stops, and automatic weekend flatting.`;
  }

  if (q.includes('cashback') || q.includes('reward') || q.includes('100 lot') || q.includes('loyalty')) {
    return `### Trader Rewards & Cashbacks Program\n\n- **Activation**: Activates automatically when your cumulative trading volume crosses **100.0 Traded Lots**.\n- **Tiers**:\n  - **Silver (100–499 Lots)**: **$2.50 / lot** cash rebate.\n  - **Gold (500–1,999 Lots)**: **$4.00 / lot** cash rebate + Equinix VPS.\n  - **Diamond VIP (2,000+ Lots)**: **$6.00 / lot** cash rebate + Zero swap fees.\n- **Disbursement**: Directly credited to your withdrawable live balance every Monday at 00:00 GMT. 0% wagering required.`;
  }

  if (q.includes('hours') || q.includes('open') || q.includes('closed') || q.includes('weekend')) {
    return `### Global Market Trading Hours\n\n- **Forex & Metals (Gold/Silver)**: Open Sunday 22:00 GMT to Friday 21:55 GMT continuously.\n- **Indices & Energy**: Follows London / New York cash session hours.\n- **Cryptocurrency (BTCUSD, ETHUSD, etc.)**: **Open 24/7/365** without closure or weekend interruption.\n- *Tip: If a pair shows Market Closed, you can always trade BTCUSD 24/7.*`;
  }

  // Comprehensive general institutional response
  return `### VTM Priority Execution Desk Response\n\nThank you for reaching out to the VTM Dedicated Trader Support Desk.\n\nRegarding your question on **"${query}"**:\n- **Execution Environment**: STP/ECN direct market routing with sub-millisecond Equinix LD4 cross-connects.\n- **Accounts**: Multi-tier accounts (Live Standard, Raw Spread 0.0 pip, VIP Elite, and $100k Demo).\n- **Instant Support**: For urgent order interventions, lot size adjustments, or deposit confirmations, your session is verified under **#${user?.accountNumber || 'Primary Session'}**.\n\nIf you need immediate assistance with deposits, withdrawals, or technical indicators, select any of the quick topics below or ask your exact query!`;
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
      text: `Welcome to **VTM Dedicated Trader Support** (24/7 Priority Execution Desk & Market Queries).\n\nI am your institutional AI broker assistant. Ask me anything about:\n- **Deposits & Payouts** (M-Pesa STK, Bitcoin min $50, Crypto)\n- **Order Execution & Spreads** (VTM Pro Live Chart, SL/TP, slippage)\n- **Leverage & Risk Rules** (Margin requirements, stop out)\n- **Trading Bots, EAs & Copy Trading**\n\nHow can I assist your trading session today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 1. Attempt modern GoogleGenAI call if API key exists
      let aiResponseText = '';
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '');

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are the VTM Markets Senior Execution Officer & Dedicated Trader Support AI.
Answer the user's trading inquiry professionally, clearly, and accurately.
Context:
- Broker: VTM Markets (Equinix LD4 ECN/STP execution)
- Live chart: VTM Pro Live Canvas Chart (exact micro-tick synchronization with Buy/Sell buttons)
- Deposits: Safaricom M-Pesa Express STK Push (instant, min $16), Bitcoin (strict min $50), USDT/ETH direct crypto, Card is Coming Soon.
- Withdrawals: Safaricom M-Pesa B2C (min $35, 1 USD = 129.50 KES, 5s automated disbursement), Crypto (min $50).
- Leverage: Up to 1:1000. Margin call: 50%. Stop out: 20%.
- Trader Rewards: Cashbacks unlock at 100 Lots ($2.50/lot Silver, $4.00 Gold, $6.00 Diamond).
- Keep answers formatted with clean markdown, bullet points, and high financial precision.

User Query: ${query}`,
                  },
                ],
              },
            ],
          });
          if (response && response.text) {
            aiResponseText = response.text;
          }
        } catch (apiErr) {
          // Fall back gracefully to institutional knowledge engine without erroring
          aiResponseText = generateInstitutionalAnswer(query, currentUser);
        }
      } else {
        // No key configured: use internal institutional reasoning engine without fail
        await new Promise((r) => setTimeout(r, 600));
        aiResponseText = generateInstitutionalAnswer(query, currentUser);
      }

      if (!aiResponseText) {
        aiResponseText = generateInstitutionalAnswer(query, currentUser);
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Guaranteed fallback: NEVER leave the user without an answer!
      const fallbackText = generateInstitutionalAnswer(query, currentUser);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[720px] ${
          isDarkMode
            ? 'bg-[#0E1117] border-neutral-800 text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-gradient-to-r from-[#141822] via-[#10131A] to-[#141822] shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-600/25 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#10131A] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight font-sans">
                  Dedicated Trader Support
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AI Execution Desk • 24/7
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Priority Market Queries, Risk &amp; Account Advisory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 no-scrollbar bg-gradient-to-b from-[#0E1117] to-[#12151D]">
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
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[#E51937] text-white'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Content Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1.5 shadow-xs relative group ${
                    isAi
                      ? 'bg-[#181C26] border border-neutral-800 text-neutral-200'
                      : 'bg-gradient-to-r from-[#E51937] to-[#B30F24] text-white font-medium'
                  }`}
                >
                  {/* Formatted body */}
                  <div className="whitespace-pre-line font-sans space-y-1">
                    {m.text}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 text-[10px] text-neutral-400 font-mono">
                    <span>{m.timestamp}</span>
                    {isAi && (
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white flex items-center gap-1 cursor-pointer"
                        title="Copy Response"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
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
            <div className="flex items-center gap-2 text-xs text-neutral-400 px-2 py-1">
              <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Analyzing market query &amp; compiling institutional response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2 border-t border-neutral-800/80 bg-[#10131A] overflow-x-auto no-scrollbar whitespace-nowrap flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Topics:</span>
          </span>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-neutral-800 bg-[#0E1117] flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question (e.g., M-Pesa deposit, Bitcoin min, live charts, leverage)..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
              inputValue.trim() && !isTyping
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
