import React, { useState, useMemo } from 'react';
import {
  Position,
  PendingOrder,
  ClosedTrade,
  TradingAccount,
  Instrument,
  Candle,
  Timeframe,
  ChartType,
} from '../types';
import {
  Smartphone,
  Clock,
  TrendingUp,
  TrendingDown,
  X,
  Edit3,
  Check,
  Sliders,
  DollarSign,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { getTradeHistoryDateBoundaries, calculateTradeHistorySummary } from '../utils/tradingEngine';

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
}

const fmt = (val: number | undefined | null, decimals = 4): string => {
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
  selectedSymbol = 'EURUSD',
  onSelectSymbol,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'pending' | 'closed'>('open');
  
  // History time filter state: 'day' | 'week' | 'month' | 'all'
  const [historyFilter, setHistoryFilter] = useState<'day' | 'week' | 'month' | 'all'>('week');

  // Modify SL/TP state
  const [modifyingPosId, setModifyingPosId] = useState<string | null>(null);
  const [editSl, setEditSl] = useState<string>('');
  const [editTp, setEditTp] = useState<string>('');

  const totalFloatingPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  const handleStartModify = (pos: Position) => {
    setModifyingPosId(pos.id);
    setEditSl(pos.sl !== null && pos.sl !== undefined ? String(pos.sl) : '');
    setEditTp(pos.tp !== null && pos.tp !== undefined ? String(pos.tp) : '');
  };

  const handleSaveModify = (posId: string) => {
    if (onUpdatePositionTpSl) {
      const slVal = editSl.trim() === '' ? null : Number(editSl);
      const tpVal = editTp.trim() === '' ? null : Number(editTp);
      onUpdatePositionTpSl(
        posId,
        slVal !== null && !isNaN(slVal) ? slVal : null,
        tpVal !== null && !isNaN(tpVal) ? tpVal : null
      );
    }
    setModifyingPosId(null);
  };

  // Filter closed trades history based on exact date boundaries (Exact Day, Past 7 Days, Month, All)
  const filteredClosedTrades = useMemo(() => {
    const boundaries = getTradeHistoryDateBoundaries(historyFilter);
    return closedTrades.filter((ct) => {
      const ctTime = ct.closeTime || ct.openTime || Date.now();
      return ctTime >= boundaries.start && ctTime <= boundaries.end;
    });
  }, [closedTrades, historyFilter]);

  const historySummary = useMemo(() => {
    return calculateTradeHistorySummary(filteredClosedTrades);
  }, [filteredClosedTrades]);

  const historyTotalProfit = historySummary.netProfit;

  return (
    <div
      id="vtm-trades-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-20 transition-colors duration-200 ${
        isDarkMode ? 'text-white bg-[#101216]' : 'text-neutral-900 bg-neutral-50'
      }`}
    >
      {/* Header and Subtabs */}
      <div
        className={`px-4 pt-3 pb-2 border-b sticky top-0 z-10 backdrop-blur-md ${
          isDarkMode ? 'border-neutral-800 bg-[#14161C]/95' : 'border-neutral-200 bg-white/95'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight">Manual Trading &amp; Open Positions</h1>
            <p className="text-[11px] text-neutral-400">
              Account #{account?.accountNumber || 'Demo'} • {account?.type || 'Live'} ({account?.tier || 'Standard'})
            </p>
          </div>

          {positions.length > 0 && (
            <button
              onClick={onCloseAllPositions}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Close All ({positions.length})
            </button>
          )}
        </div>

        {/* Subtabs */}
        <div className="flex items-center justify-around border-b border-neutral-200 dark:border-neutral-800/80 -mb-2">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold relative transition-colors cursor-pointer ${
              activeSubTab === 'open' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'
            }`}
          >
            <span>Open Positions ({positions.length})</span>
            {activeSubTab === 'open' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold relative transition-colors cursor-pointer ${
              activeSubTab === 'pending' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'
            }`}
          >
            <span>Pending ({pendingOrders.length})</span>
            {activeSubTab === 'pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('closed')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold relative transition-colors cursor-pointer ${
              activeSubTab === 'closed' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'
            }`}
          >
            <span>History ({closedTrades.length})</span>
            {activeSubTab === 'closed' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-3 sm:p-4">
        {/* SUBTAB 1: OPEN POSITIONS (MT5 / HFM Style) */}
        {activeSubTab === 'open' && (
          <div className="space-y-3">
            {/* Floating PnL Summary Banner */}
            {positions.length > 0 && (
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Floating Profit / Loss</div>
                <div
                  className={`text-base font-black font-mono ${
                    totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
                </div>
              </div>
            )}

            {positions.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">No Open Positions</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Open trades from the Markets or Trade tab will appear here in exact MT5 / HFM terminal style with TP &amp; SL modification.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {positions.map((pos) => {
                  const isProfit = (pos.pnl || 0) >= 0;
                  const isModifying = modifyingPosId === pos.id;
                  const decimals = pos.symbol.includes('JPY') ? 3 : 5;

                  return (
                    <div
                      key={pos.id}
                      className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                        isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div>
                        {/* Top Row: Symbol, Side Badge, Lots, Ticket */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base">{pos.symbol}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                pos.side === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {pos.side} {pos.lots}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono text-neutral-400">#{pos.ticket || pos.id.slice(-6)}</span>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-neutral-800/60 font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase block">Open Price</span>
                            <span className="font-bold">{fmt(pos.openPrice, decimals)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 uppercase block">Current Market</span>
                            <span className="font-bold text-sky-400">{fmt(pos.currentPrice || pos.openPrice, decimals)}</span>
                          </div>
                        </div>

                        {/* SL & TP Display or Inline Modifier Form */}
                        {isModifying ? (
                          <div className="my-2 p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-700 space-y-2">
                            <div className="text-[11px] font-bold text-sky-400 flex items-center justify-between">
                              <span>Modify Stop Loss &amp; Take Profit</span>
                              <button onClick={() => setModifyingPosId(null)} className="text-neutral-400 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">Stop Loss (SL)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editSl}
                                  onChange={(e) => setEditSl(e.target.value)}
                                  placeholder="0.0000"
                                  className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">Take Profit (TP)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editTp}
                                  onChange={(e) => setEditTp(e.target.value)}
                                  placeholder="0.0000"
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
                                onClick={() => handleSaveModify(pos.id)}
                                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Save SL / TP</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between my-2 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-[10px] text-neutral-400 uppercase block">SL</span>
                                <span className="text-rose-400 font-bold">{pos.sl ? fmt(pos.sl, decimals) : 'None'}</span>
                              </div>
                              <span className="text-neutral-600">|</span>
                              <div>
                                <span className="text-[10px] text-neutral-400 uppercase block">TP</span>
                                <span className="text-emerald-400 font-bold">{pos.tp ? fmt(pos.tp, decimals) : 'None'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleStartModify(pos)}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Modify</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Profit & Close Button */}
                      <div className="pt-3 border-t border-neutral-800/70 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase block">Profit (USD)</span>
                          <span className={`text-sm font-black font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${Number(pos.pnl || 0).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          Close Position
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: PENDING ORDERS */}
        {activeSubTab === 'pending' && (
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <Clock className="w-10 h-10 text-neutral-500 opacity-60" />
                <h3 className="text-base font-bold">No Pending Orders</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Limit and stop pending orders placed on instruments will appear here until triggered.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{ord.symbol}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            {ord.type}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">#{ord.ticket}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 py-1.5 border-y border-neutral-800/60">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Target Price</span>
                          <span className="font-bold text-sky-400">{ord.targetPrice}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Volume</span>
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

        {/* SUBTAB 3: CLOSED TRADES HISTORY (Categorized by Exact Day, Past 7 Days, Month) */}
        {activeSubTab === 'closed' && (
          <div className="space-y-4">
            {/* History Time Filter Bar & Total Profit Generated */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Total Profit Generated</div>
                <div
                  className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${
                    historyTotalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {historyTotalProfit >= 0 ? '+' : ''}${historyTotalProfit.toFixed(2)}
                  <span className="text-xs font-normal text-neutral-400 ml-2">
                    ({filteredClosedTrades.length} trades • {historySummary.winningTrades}W / {historySummary.losingTrades}L • {historySummary.winRate}% Win Rate in {historyFilter === 'day' ? 'Exact Day' : historyFilter === 'week' ? 'Past 7 Days' : historyFilter === 'month' ? 'A Month' : 'All Time'})
                  </span>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setHistoryFilter('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === 'day' ? 'bg-[#E51937] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Exact Day
                </button>
                <button
                  onClick={() => setHistoryFilter('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === 'week' ? 'bg-[#E51937] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Past 7 Days
                </button>
                <button
                  onClick={() => setHistoryFilter('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === 'month' ? 'bg-[#E51937] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  A Month
                </button>
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === 'all' ? 'bg-[#E51937] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {filteredClosedTrades.length === 0 ? (
              <div
                className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                  isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <Clock className="w-10 h-10 text-neutral-500 opacity-60" />
                <h3 className="text-base font-bold">No Closed Trade History</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  No completed manual trades found for the selected time filter ({historyFilter}).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredClosedTrades.map((cl) => {
                  const isWin = (cl.pnl || 0) >= 0;
                  const decimals = cl.symbol.includes('JPY') ? 3 : 5;
                  const closeDateStr = cl.closeTime ? new Date(cl.closeTime).toLocaleString() : 'Recently';

                  return (
                    <div
                      key={cl.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between ${
                        isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{cl.symbol}</span>
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
                          <span className={`font-mono text-xs font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}${Number(cl.pnl || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono my-2 py-1.5 border-y border-neutral-800/60">
                          <div>
                            <span className="text-[10px] text-neutral-400 block">Open ➔ Close</span>
                            <span>{fmt(cl.openPrice, decimals)} ➔ {fmt(cl.closePrice, decimals)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block">Reason</span>
                            <span className="font-bold uppercase text-sky-400">{cl.reason || 'MANUAL'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800/60">
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
      </div>
    </div>
  );
};
