import React, { useState, useMemo } from 'react';
import {
  Position,
  PendingOrder,
  ClosedTrade,
  TradingAccount,
  Instrument,
} from '../types';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  X,
  Edit3,
  Check,
  Calendar,
  AlertCircle,
  Shield,
  ShieldCheck,
  Layers,
  ArrowUpDown,
  DollarSign,
  Activity,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { getInstrumentSpec } from '../utils/contractSpecs';
import { reconcileAccount, loadUserLedger, LedgerEntry, ReconciliationReport } from '../utils/financialLedger';
import { UserAuthProfile } from '../types/botTypes';

interface TradesTabProps {
  account: TradingAccount | null;
  positions: Position[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  onClosePosition: (id: string) => void;
  onCloseAllPositions: () => void;
  onCancelPendingOrder: (id: string) => void;
  onUpdatePositionTpSl?: (id: string, sl: number | null, tp: number | null) => void;
  isDarkMode?: boolean;
  instruments?: Instrument[];
  selectedSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  candles?: any[];
  timeframe?: any;
  onTimeframeChange?: (tf: any) => void;
  chartType?: any;
  onChartTypeChange?: (ct: any) => void;
  tickDirection?: 'up' | 'down';
  currentUser?: UserAuthProfile | null;
  ledgerSyncCounter?: number;
}

const fmt = (val: number | undefined | null, decimals = 2): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(decimals);
};

export const TradesTab: React.FC<TradesTabProps> = ({
  account,
  positions,
  pendingOrders,
  closedTrades,
  onClosePosition,
  onCloseAllPositions,
  onCancelPendingOrder,
  onUpdatePositionTpSl,
  isDarkMode = true,
  instruments = [],
  currentUser,
  ledgerSyncCounter = 0,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'pending' | 'closed' | 'reconciliation'>('open');

  const userLedgerEntries = useMemo(() => {
    return loadUserLedger(currentUser?.email);
  }, [currentUser?.email, account?.balance, closedTrades.length, ledgerSyncCounter]);

  const accountLedgerEntries = useMemo(() => {
    if (!account?.accountNumber) return userLedgerEntries;
    const accNumClean = account.accountNumber.replace('Account #', '').trim();
    return userLedgerEntries.filter((e) => {
      const eAccNumClean = (e.accountNumber || '').replace('Account #', '').trim();
      return !eAccNumClean || eAccNumClean === accNumClean;
    });
  }, [userLedgerEntries, account?.accountNumber]);

  const reconciliationReport = useMemo(() => {
    return reconcileAccount({
      accountNumber: account?.accountNumber || '27330648',
      currentBalance: account?.balance || 0,
      userEmail: currentUser?.email || 'user@vtmmarkets.com',
      closedTrades,
      transactions: account?.transactions || [],
    });
  }, [account?.accountNumber, account?.balance, currentUser?.email, closedTrades, account?.transactions, userLedgerEntries]);


  // History time filter state: 'today' | '7days' | 'month' | 'all' | 'custom'
  const [historyFilter, setHistoryFilter] = useState<'today' | '7days' | 'month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Modify SL/TP state
  const [modifyingPosId, setModifyingPosId] = useState<string | null>(null);
  const [editSl, setEditSl] = useState<string>('');
  const [editTp, setEditTp] = useState<string>('');
  const [modifyError, setModifyError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const totalFloatingPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalMarginUsed = positions.reduce((sum, p) => {
    const spec = getInstrumentSpec(p.symbol);
    const nominal = p.lots * spec.contractSize * (p.openPrice || 1);
    return sum + nominal / 500;
  }, 0);

  const handleStartModify = (pos: Position) => {
    setModifyingPosId(pos.id);
    setEditSl(pos.sl !== null && pos.sl !== undefined ? String(pos.sl) : '');
    setEditTp(pos.tp !== null && pos.tp !== undefined ? String(pos.tp) : '');
    setModifyError(null);
  };

  const handleSaveModify = (pos: Position) => {
    if (onUpdatePositionTpSl) {
      const slVal = editSl.trim() === '' ? null : Number(editSl);
      const tpVal = editTp.trim() === '' ? null : Number(editTp);

      // Validate SL & TP logically
      const currentPrice = pos.currentPrice || pos.openPrice;
      if (slVal !== null) {
        if (pos.side === 'BUY' && slVal >= currentPrice) {
          setModifyError(`BUY Stop Loss must be below current price (${currentPrice})`);
          return;
        }
        if (pos.side === 'SELL' && slVal <= currentPrice) {
          setModifyError(`SELL Stop Loss must be above current price (${currentPrice})`);
          return;
        }
      }
      if (tpVal !== null) {
        if (pos.side === 'BUY' && tpVal <= currentPrice) {
          setModifyError(`BUY Take Profit must be above current price (${currentPrice})`);
          return;
        }
        if (pos.side === 'SELL' && tpVal >= currentPrice) {
          setModifyError(`SELL Take Profit must be below current price (${currentPrice})`);
          return;
        }
      }

      onUpdatePositionTpSl(
        pos.id,
        slVal !== null && !isNaN(slVal) ? slVal : null,
        tpVal !== null && !isNaN(tpVal) ? tpVal : null
      );
    }
    setModifyingPosId(null);
    setModifyError(null);
  };

  const handleExecuteClose = (id: string) => {
    setClosingId(id);
    onClosePosition(id);
    setTimeout(() => setClosingId(null), 1200);
  };

  // Filter closed trades history based on selected date filter
  const filteredClosedTrades = useMemo(() => {
    const now = new Date();
    // Midnight today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    // 1st of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let customStartMs = 0;
    let customEndMs = Infinity;
    if (historyFilter === 'custom') {
      if (customStartDate) {
        customStartMs = new Date(`${customStartDate}T00:00:00`).getTime();
      }
      if (customEndDate) {
        customEndMs = new Date(`${customEndDate}T23:59:59.999`).getTime();
      }
    }

    return closedTrades
      .filter((ct) => {
        const ctTime = ct.closeTime || ct.openTime || Date.now();
        if (historyFilter === 'today') {
          return ctTime >= startOfToday;
        }
        if (historyFilter === '7days') {
          return ctTime >= sevenDaysAgo;
        }
        if (historyFilter === 'month') {
          return ctTime >= startOfMonth;
        }
        if (historyFilter === 'custom') {
          return ctTime >= customStartMs && ctTime <= customEndMs;
        }
        return true; // 'all'
      })
      .sort((a, b) => {
        const timeA = a.closeTime || a.openTime || 0;
        const timeB = b.closeTime || b.openTime || 0;
        return timeB - timeA; // Latest trades at the top
      });
  }, [closedTrades, historyFilter, customStartDate, customEndDate]);

  // Comprehensive summary statistics for the selected period
  const historyStats = useMemo(() => {
    let grossProfit = 0;
    let grossLoss = 0;
    let totalFees = 0;
    let wins = 0;
    let losses = 0;

    filteredClosedTrades.forEach((ct) => {
      const pnl = Number(ct.pnl || 0);
      const swap = Number(ct.swap || 0);
      const commission = Number(ct.commission || 0);
      const fees = Math.abs(swap) + Math.abs(commission);
      totalFees += fees;

      if (pnl >= 0) {
        grossProfit += pnl;
        wins++;
      } else {
        grossLoss += Math.abs(pnl);
        losses++;
      }
    });

    const netPnl = Number((grossProfit - grossLoss - totalFees).toFixed(2));
    const totalTrades = filteredClosedTrades.length;
    const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netPnl,
    };
  }, [filteredClosedTrades]);

  return (
    <div
      id="vtm-trades-screen"
      className={`min-h-[calc(100vh-120px)] w-full max-w-full overflow-x-hidden flex flex-col pb-20 transition-colors duration-200 ${
        isDarkMode ? 'text-white bg-[#0e1015]' : 'text-neutral-900 bg-neutral-50'
      }`}
    >
      {/* ACCOUNT EQUITY & MARGIN BANNER (MT5/HFM STANDARD) */}
      <div
        className={`px-4 py-3 border-b sticky top-0 z-20 backdrop-blur-md ${
          isDarkMode ? 'border-neutral-800 bg-[#14161f]/95' : 'border-neutral-200 bg-white/95'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Trade Terminal</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                account?.type === 'Live' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              }`}>
                {account?.type || 'Live'} • #{account?.accountNumber || '27330648'}
              </span>
            </div>
            <p className={`text-[11px] ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-600'}`}>
              Tier: <strong className={isDarkMode ? 'text-slate-200' : 'text-neutral-900'}>{account?.tier || 'Standard'}</strong> • Leverage: <strong className={isDarkMode ? 'text-slate-200' : 'text-neutral-900'}>{account?.leverage || '1:500'}</strong> • Currency: USD
            </p>
          </div>

          {positions.length > 0 && activeSubTab === 'open' && (
            <button
              onClick={onCloseAllPositions}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close All Positions ({positions.length})</span>
            </button>
          )}
        </div>

        {/* METRICS STRIP: Balance | Equity | Margin | Free Margin | Level */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className={`text-[10px] block font-sans ${isDarkMode ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-600'}`}>Balance</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>${fmt(account?.balance, 2)}</span>
          </div>

          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Equity</span>
            <span className="font-bold text-emerald-500">${fmt(account?.equity ?? account?.balance, 2)}</span>
          </div>

          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Used Margin</span>
            <span className="font-bold">${fmt(account?.margin ?? totalMarginUsed, 2)}</span>
          </div>

          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Free Margin</span>
            <span className="font-bold text-sky-400">${fmt(account?.freeMargin ?? Math.max(0, (account?.balance || 0) - totalMarginUsed), 2)}</span>
          </div>

          <div className={`p-2 rounded-xl border col-span-2 sm:col-span-1 ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Floating P/L</span>
            <span className={`font-bold ${totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalFloatingPnl >= 0 ? '+' : ''}${fmt(totalFloatingPnl, 2)}
            </span>
          </div>
        </div>

        {/* SUBTABS: Open (N) | Pending (N) | History (N) | Audit & Reconciliation */}
        <div className="flex items-center gap-1.5 mt-3 border-t border-neutral-800/60 pt-2 overflow-x-auto no-scrollbar w-full max-w-full pb-1">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'open'
                ? 'bg-[#E51937] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-white'
            }`}
          >
            <span>Open Positions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'pending'
                ? 'bg-[#E51937] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-white'
            }`}
          >
            <span>Pending Orders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('closed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'closed'
                ? 'bg-[#E51937] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-white'
            }`}
          >
            <span>Trade History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {closedTrades.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('reconciliation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'reconciliation'
                ? 'bg-[#E51937] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Audit &amp; Reconciliation</span>
          </button>
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="p-4 flex-1">
        {/* ============================================================ */}
        {/* SUBTAB 1: OPEN POSITIONS (MT5 / HFM EXECUTION EXPERIENCE)     */}
        {/* ============================================================ */}
        {activeSubTab === 'open' && (
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">No Open Positions</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                  Live market orders execute instantaneously. Open a position from the Markets or Trade tab to monitor real-time floating P/L, modify SL/TP, or manually close.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {positions.map((pos) => {
                  const spec = getInstrumentSpec(pos.symbol);
                  const isProfit = (pos.pnl || 0) >= 0;
                  const isModifying = modifyingPosId === pos.id;
                  const decimals = spec.decimals;
                  const usedMargin = Number(((pos.lots * spec.contractSize * (pos.openPrice || 1)) / 500).toFixed(2));
                  const openDateStr = pos.openTime ? new Date(pos.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

                  return (
                    <div
                      key={pos.id}
                      className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                        isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div>
                        {/* Header: Symbol | Side & Lots | Ticket | Floating P/L */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-black text-base tracking-tight">{pos.symbol}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                pos.side === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {pos.side} {pos.lots}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">#{pos.ticket}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-base font-black font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${fmt(pos.pnl, 2)}
                            </span>
                          </div>
                        </div>

                        {/* Second Row: Prices (Entry ➔ Current) | SL / TP */}
                        <div className="flex items-center justify-between text-xs font-mono my-2.5 py-2 border-y border-neutral-800/60">
                          <div className="flex items-center gap-1.5 text-neutral-200 truncate">
                            <span>{fmt(pos.openPrice, decimals)}</span>
                            <span className="text-neutral-500 font-sans">➔</span>
                            <span className="text-sky-400 font-bold">{fmt(pos.currentPrice || pos.openPrice, decimals)}</span>
                          </div>

                          <div className="text-right text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0 font-sans">
                            <span>SL: {pos.sl ? fmt(pos.sl, decimals) : '—'}</span>
                            <span className="mx-1">•</span>
                            <span>TP: {pos.tp ? fmt(pos.tp, decimals) : '—'}</span>
                          </div>
                        </div>

                        {/* SL & TP Modifier Form if active */}
                        {isModifying ? (
                          <div className="my-2 p-3 rounded-xl bg-neutral-900 border border-sky-500/40 space-y-2">
                            <div className="text-[11px] font-bold text-sky-400 flex items-center justify-between">
                              <span>Modify Stop Loss &amp; Take Profit</span>
                              <button onClick={() => setModifyingPosId(null)} className="text-neutral-500 dark:text-neutral-400 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {modifyError && (
                              <div className="text-[11px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/30">
                                {modifyError}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block mb-0.5">
                                  Stop Loss (SL)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editSl}
                                  onChange={(e) => setEditSl(e.target.value)}
                                  placeholder={pos.sl ? String(pos.sl) : 'None'}
                                  className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block mb-0.5">
                                  Take Profit (TP)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editTp}
                                  onChange={(e) => setEditTp(e.target.value)}
                                  placeholder={pos.tp ? String(pos.tp) : 'None'}
                                  className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setModifyingPosId(null)}
                                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveModify(pos)}
                                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Bottom Row: Set TP / SL | Close Position */}
                      <div className="pt-3 border-t border-neutral-800/70 flex items-center justify-between gap-3">
                        <button
                          onClick={() => handleStartModify(pos)}
                          className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all border border-neutral-700/60 cursor-pointer"
                        >
                          Set TP / SL
                        </button>

                        <button
                          onClick={() => handleExecuteClose(pos.id)}
                          disabled={closingId === pos.id}
                          className="px-4 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 disabled:bg-neutral-800 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          {closingId === pos.id ? (
                            <span>Closing...</span>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>Close Position</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SUBTAB 2: PENDING ORDERS                                      */}
        {/* ============================================================ */}
        {activeSubTab === 'pending' && (
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <Clock className="w-10 h-10 text-neutral-500 opacity-60" />
                <h3 className="text-base font-bold">No Pending Orders</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                  Limit and stop pending orders placed on instruments will appear here until triggered by market price.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{ord.symbol}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            {ord.type}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">#{ord.ticket}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 py-1.5 border-y border-neutral-800/60">
                        <div>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Target Price</span>
                          <span className="font-bold text-sky-400">{ord.targetPrice}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Volume</span>
                          <span className="font-bold">{ord.lots} Lots</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onCancelPendingOrder(ord.id)}
                      className="w-full mt-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 text-xs font-bold transition-all cursor-pointer border border-neutral-700"
                    >
                      Cancel Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SUBTAB 3: TRADE HISTORY WITH AUDITABLE METRICS & DATE FILTERS*/}
        {/* ============================================================ */}
        {activeSubTab === 'closed' && (
          <div className="space-y-4">
            {/* Filter Navigation Bar */}
            <div
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Date Filter:
                </span>
                {[
                  { key: 'today', label: 'Today' },
                  { key: '7days', label: 'Last 7 Days' },
                  { key: 'month', label: 'This Month' },
                  { key: 'all', label: 'All History' },
                  { key: 'custom', label: 'Custom Range' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setHistoryFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      historyFilter === f.key
                        ? 'bg-[#E51937] text-white shadow-xs'
                        : isDarkMode
                        ? 'bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:text-white border border-neutral-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {historyFilter === 'custom' && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`px-2 py-1 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`px-2 py-1 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* PERIOD SUMMARY KPI DASHBOARD */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Closed Trades</span>
                <span className="text-base font-black font-mono">{historyStats.totalTrades}</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  {historyStats.wins} Win / {historyStats.losses} Loss
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Win Rate</span>
                <span className="text-base font-black font-mono text-sky-400">{historyStats.winRate}%</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Verified Executions</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Gross Profit</span>
                <span className="text-base font-black font-mono text-emerald-400">+${historyStats.grossProfit.toFixed(2)}</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Winning positions</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Gross Loss</span>
                <span className="text-base font-black font-mono text-rose-400">-${historyStats.grossLoss.toFixed(2)}</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Losing positions</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Total Fees</span>
                <span className="text-base font-black font-mono text-slate-300">${historyStats.totalFees.toFixed(2)}</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Swap &amp; Commission</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-sans">Net Realized P/L</span>
                <span className={`text-base font-black font-mono ${historyStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {historyStats.netPnl >= 0 ? '+' : ''}${historyStats.netPnl.toFixed(2)}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Net cash impact</span>
              </div>
            </div>

            {/* CLOSED TRADES RECORD LIST */}
            {filteredClosedTrades.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <Clock className="w-10 h-10 text-neutral-500 opacity-60" />
                <h3 className="text-base font-bold">No Trades for Selected Period</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                  No historical trades closed in the chosen date range. Switch to "All History" to view all settled executions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredClosedTrades.map((cl) => {
                  const spec = getInstrumentSpec(cl.symbol);
                  const isWin = (cl.pnl || 0) >= 0;
                  const decimals = spec.decimals;
                  const closeDateStr = cl.closeTime ? new Date(cl.closeTime).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }) : 'Recently';

                  return (
                    <div
                      key={cl.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div>
                        {/* Header: Symbol | Side & Lots | Net PnL */}
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-tight">{cl.symbol}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cl.side === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {cl.side} {cl.lots}
                            </span>
                          </div>
                          <span className={`font-mono text-sm font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}${Number(cl.pnl || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Open -> Close Prices */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono my-2 py-1.5 border-y border-neutral-800/60">
                          <div>
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Open ➔ Close</span>
                            <span>{fmt(cl.openPrice, decimals)} ➔ {fmt(cl.closePrice, decimals)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">Closing Reason</span>
                            <span className={`font-bold uppercase ${
                              cl.reason === 'TP' ? 'text-emerald-400' : cl.reason === 'SL' ? 'text-rose-400' : 'text-sky-400'
                            }`}>
                              {cl.reason || 'MANUAL'}
                            </span>
                          </div>
                        </div>

                        {/* SL & TP if available */}
                        {(cl.sl || cl.tp) && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400 py-1">
                            <span>SL: {cl.sl ? fmt(cl.sl, decimals) : 'None'}</span>
                            <span>TP: {cl.tp ? fmt(cl.tp, decimals) : 'None'}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Ticket & Timestamp */}
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800/60">
                        <span>Ticket #{cl.ticket || cl.id.slice(-6)}</span>
                        <span>{closeDateStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SUBTAB 4: FINANCIAL AUDIT & ACCOUNT RECONCILIATION           */}
        {/* ============================================================ */}
        {activeSubTab === 'reconciliation' && (
          <div className="space-y-4">
            {/* Mathematical Integrity Banner */}
            <div
              className={`p-4 rounded-2xl border ${
                reconciliationReport.isConsistent
                  ? isDarkMode
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-emerald-50 border-emerald-300'
                  : isDarkMode
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-rose-50 border-rose-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      reconciliationReport.isConsistent
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Accounting Ledger Reconciliation</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          reconciliationReport.isConsistent
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {reconciliationReport.isConsistent ? '100% Mathematically Consistent' : 'Discrepancy Detected'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {reconciliationReport.auditExplanation}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-xs">
                  <span className="text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 block text-[10px] uppercase font-bold">
                    Discrepancy (Expected vs Recorded)
                  </span>
                  <span
                    className={`font-black text-base ${
                      reconciliationReport.isConsistent ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    ${reconciliationReport.discrepancy >= 0 ? '+' : ''}
                    {fmt(reconciliationReport.discrepancy, 2)}
                  </span>
                </div>
              </div>

              {/* Exact Formula Breakdown */}
              <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-neutral-800/80 text-[11px] font-mono flex flex-wrap items-center gap-2 text-slate-700 dark:text-neutral-300">
                <span className="font-semibold text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400">Formula:</span>
                <span>Opening (${fmt(reconciliationReport.openingBalance, 2)})</span>
                <span>+</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Deposits (${fmt(reconciliationReport.totalDeposits, 2)})
                </span>
                <span>−</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  Withdrawals (${fmt(reconciliationReport.totalWithdrawals, 2)})
                </span>
                <span>+</span>
                <span
                  className={
                    reconciliationReport.totalRealizedTradingPnl >= 0
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-rose-600 dark:text-rose-400 font-bold'
                  }
                >
                  Trading P/L ({reconciliationReport.totalRealizedTradingPnl >= 0 ? '+' : ''}${fmt(reconciliationReport.totalRealizedTradingPnl, 2)})
                </span>
                <span>−</span>
                <span>Fees (${fmt(reconciliationReport.totalFees, 2)})</span>
                <span>±</span>
                <span>Adjustments (${fmt(reconciliationReport.totalAdjustments, 2)})</span>
                <span className="font-bold text-slate-900 dark:text-white">=</span>
                <span className="font-bold text-slate-900 dark:text-white underline decoration-emerald-500 decoration-2">
                  Closing Balance (${fmt(reconciliationReport.recordedBalance, 2)})
                </span>
              </div>
            </div>

            {/* Financial Ledger Movement Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 block font-sans">Opening Balance</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">${fmt(reconciliationReport.openingBalance, 2)}</span>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 block font-sans">Total Realized Net P/L</span>
                <span className={`font-bold text-sm ${reconciliationReport.totalRealizedTradingPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {reconciliationReport.totalRealizedTradingPnl >= 0 ? '+' : ''}${fmt(reconciliationReport.totalRealizedTradingPnl, 2)}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 block font-sans">Deposits Credited</span>
                <span className="font-bold text-sm text-emerald-500">+${fmt(reconciliationReport.totalDeposits, 2)}</span>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 block font-sans">Withdrawals Disbursed</span>
                <span className="font-bold text-sm text-rose-500">-${fmt(reconciliationReport.totalWithdrawals, 2)}</span>
              </div>
            </div>

            {/* Itemized Movements in Ledger */}
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDarkMode ? 'bg-[#14161f] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="p-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Immutable Double-Entry Ledger ({accountLedgerEntries.length} Recorded Movements)
                  </h3>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400">
                    Every balance change has an authorized, verified reason and idempotency control.
                  </span>
                </div>
              </div>

              {accountLedgerEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 dark:text-slate-400 dark:text-neutral-500">
                  No individual balance movements recorded yet for this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-neutral-900/60 text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Reference / Ticket</th>
                        <th className="py-2.5 px-3">Reason / Details</th>
                        <th className="py-2.5 px-3 text-right">Movement</th>
                        <th className="py-2.5 px-3 text-right">Prev Balance</th>
                        <th className="py-2.5 px-3 text-right">New Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                      {accountLedgerEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                          <td className="py-2.5 px-3 text-slate-600 dark:text-neutral-300 whitespace-nowrap">
                            {new Date(e.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                e.type === 'DEPOSIT'
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : e.type === 'WITHDRAWAL'
                                  ? 'bg-rose-500/20 text-rose-500'
                                  : e.type === 'REALIZED_TRADE_PNL'
                                  ? e.amount >= 0
                                    ? 'bg-emerald-500/20 text-emerald-500'
                                    : 'bg-rose-500/20 text-rose-500'
                                  : 'bg-sky-500/20 text-sky-400'
                              }`}
                            >
                              {e.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 font-bold whitespace-nowrap">
                            #{e.referenceId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-neutral-300 max-w-xs truncate">
                            {e.reason}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                              e.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {e.amount >= 0 ? '+' : ''}${fmt(e.amount, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            ${fmt(e.previousBalance, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            ${fmt(e.newBalance, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
