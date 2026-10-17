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
} from 'lucide-react';
import { calculateBotPnL } from '../services/botTradingService';

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
}

export const TradesTab: React.FC<TradesTabProps> = ({
  account,
  positions,
  pendingOrders,
  closedTrades,
  onClosePosition,
  onCloseAllPositions,
  onCancelPendingOrder,
  onUpdatePositionTpSl,
  isDarkMode = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editSlValue, setEditSlValue] = useState<string>('');
  const [editTpValue, setEditTpValue] = useState<string>('');

  const totalFloatingPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const memoizedClosedTrades = useMemo(() => closedTrades, [closedTrades]);

  return (
    <div id="vtm-trades-screen" className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
      {/* Header and Subtabs */}
      <div className={`px-4 pt-3 pb-2 border-b ${isDarkMode ? 'border-neutral-800 bg-[#14161C]' : 'border-neutral-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight">Order Positions &amp; History</h1>
          {positions.length > 0 && (
            <button onClick={onCloseAllPositions} className="text-xs text-red-500 hover:text-red-600 font-bold cursor-pointer transition-colors">
              Close All ({positions.length})
            </button>
          )}
        </div>

        {/* Floating P/L Bar */}
        <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="opacity-70 uppercase tracking-wider text-[10px] font-bold">Floating P/L:</span>
          <span className={`font-black text-sm ${totalFloatingPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-around border-b border-neutral-100 dark:border-neutral-800/80 -mb-2">
          <button onClick={() => setActiveSubTab('open')} className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${activeSubTab === 'open' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'}`}>
            <span>Open ({positions.length})</span>
            {activeSubTab === 'open' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />}
          </button>
          <button onClick={() => setActiveSubTab('pending')} className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${activeSubTab === 'pending' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'}`}>
            <span>Pending ({pendingOrders.length})</span>
            {activeSubTab === 'pending' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />}
          </button>
          <button onClick={() => setActiveSubTab('closed')} className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${activeSubTab === 'closed' ? (isDarkMode ? 'text-white' : 'text-neutral-900') : 'text-neutral-400'}`}>
            <span>Closed ({memoizedClosedTrades.length})</span>
            {activeSubTab === 'closed' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'open' && (
          <div className="p-3 sm:p-4">
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                <Smartphone className="w-10 h-10 mb-4 opacity-50" />
                <p className="text-sm font-medium opacity-70">There are no open trades at this time</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {positions.map((pos) => {
                  const isBuy = pos.side === 'BUY';
                  return (
                    <div key={pos.id} className={`p-4 rounded-2xl border shadow-xs transition-all ${isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                      {/* Top Row: Symbol, Side/Lots, Floating PnL */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pos.symbol}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase ${isBuy ? (isDarkMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-950/60 text-red-400' : 'bg-red-100 text-red-700')}`}>
                            {pos.side} {pos.lots}
                          </span>
                          <span className="text-[10px] opacity-60 font-mono">#{pos.ticket}</span>
                        </div>
                        <span className={`text-base font-black ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </span>
                      </div>

                      {/* Prices & TP/SL Summary */}
                      <div className={`flex items-center justify-between text-xs pt-2 pb-2 border-t border-b font-mono ${isDarkMode ? 'border-neutral-800 text-neutral-400' : 'border-slate-100 text-slate-600'}`}>
                        <div>
                          <span>{pos.openPrice}</span> ➔ <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{pos.currentPrice}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={pos.sl ? 'text-red-400 font-bold' : ''}>SL: {pos.sl ?? '—'}</span>
                          <span className={pos.tp ? 'text-emerald-400 font-bold' : ''}>TP: {pos.tp ?? '—'}</span>
                        </div>
                      </div>

                      {/* TP/SL Modify Editor Dropdown */}
                      {editingPosId === pos.id && onUpdatePositionTpSl && (
                        <div className={`mt-2.5 p-3 rounded-xl border grid grid-cols-2 gap-2 ${isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div>
                            <label className="text-[10px] font-bold text-red-400 block mb-1">Stop Loss (Price)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="Price"
                              value={editSlValue}
                              onChange={(e) => setEditSlValue(e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-mono rounded border focus:outline-none ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 block mb-1">Take Profit (Price)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="Price"
                              value={editTpValue}
                              onChange={(e) => setEditTpValue(e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-mono rounded border focus:outline-none ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                          </div>
                          <div className="col-span-2 flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingPosId(null)} className="px-2 py-1 text-xs font-semibold rounded bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/30 cursor-pointer">
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const nextSl = editSlValue.trim() !== '' ? parseFloat(editSlValue) : null;
                                const nextTp = editTpValue.trim() !== '' ? parseFloat(editTpValue) : null;
                                onUpdatePositionTpSl(pos.id, nextSl && !isNaN(nextSl) && nextSl > 0 ? nextSl : null, nextTp && !isNaN(nextTp) && nextTp > 0 ? nextTp : null);
                                setEditingPosId(null);
                              }}
                              className="px-3 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                            >
                              Save TP/SL
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar: Modify & Close */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                        {onUpdatePositionTpSl ? (
                          <button
                            onClick={() => {
                              if (editingPosId === pos.id) {
                                setEditingPosId(null);
                              } else {
                                setEditingPosId(pos.id);
                                setEditSlValue(pos.sl ? String(pos.sl) : '');
                                setEditTpValue(pos.tp ? String(pos.tp) : '');
                              }
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                          >
                            {editingPosId === pos.id ? 'Close Editor' : 'Modify TP / SL'}
                          </button>
                        ) : <span />}

                        <button onClick={() => onClosePosition(pos.id)} className="py-1.5 px-4 text-xs font-black rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-sm cursor-pointer transition-colors">
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
        
        {activeSubTab === 'pending' && (
          <div className="p-4">
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[260px]">
                <Clock className="w-10 h-10 mb-4 opacity-50" />
                <p className="text-sm font-medium opacity-70">No pending orders active</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">{ord.symbol}</span>
                      <button onClick={() => onCancelPendingOrder(ord.id)} className="text-xs text-red-500 font-bold cursor-pointer">Cancel</button>
                    </div>
                    <div className="text-xs opacity-75">Target: <strong>{ord.targetPrice}</strong> ({ord.type})</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'closed' && (
          <div className="p-3 sm:p-4">
            <div className="mb-3 px-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>Closed Trades History ({memoizedClosedTrades.length})</span>
            </div>
            {memoizedClosedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[260px]">
                <p className="text-sm font-medium opacity-70">No trade history recorded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {memoizedClosedTrades.map((cl) => {
                  const exactPnl =
                    cl.openPrice && cl.closePrice && cl.openPrice !== cl.closePrice
                      ? calculateBotPnL(cl.symbol, cl.side, cl.openPrice, cl.closePrice, cl.lots)
                      : cl.pnl;
                  return (
                    <div key={cl.id} className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cl.symbol}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cl.side === 'BUY' ? (isDarkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-950 text-red-400' : 'bg-red-100 text-red-700')}`}>
                            {cl.side} {cl.lots}
                          </span>
                          <span className={`text-[10px] font-mono opacity-60`}>#{cl.ticket}</span>
                        </div>
                        <span className={`font-black text-sm ${exactPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {exactPnl >= 0 ? '+' : ''}${exactPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-xs mt-2 font-mono opacity-75`}>
                        <span>{cl.openPrice} ➔ <strong>{cl.closePrice}</strong></span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/40">{cl.reason}</span>
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
