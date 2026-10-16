import React, { useState } from 'react';
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
  TrendingUp,
  TrendingDown,
  X,
  Sliders,
  Check,
  Smartphone,
  ChevronRight,
  Clock,
  CheckCircle2,
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
  // Chart synchronization
  instruments?: Instrument[];
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  candles?: Candle[];
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
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
  instruments = [],
  selectedSymbol = 'EURUSD',
  onSelectSymbol,
  candles = [],
  timeframe = '1H',
  onTimeframeChange = () => {},
  chartType = 'candles',
  onChartTypeChange = () => {},
  tickDirection = 'NEUTRAL',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editSlValue, setEditSlValue] = useState<string>('');
  const [editTpValue, setEditTpValue] = useState<string>('');

  const totalFloatingPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div
      id="vtm-trades-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Header and Subtabs: Open, Pending, Closed */}
      <div
        className={`px-4 pt-3 pb-2 border-b ${
          isDarkMode ? 'border-neutral-800 bg-[#14161C]' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Order Positions &amp; History</h1>
          </div>
          {positions.length > 0 && (
            <button
              onClick={onCloseAllPositions}
              className="text-xs text-red-500 hover:text-red-600 font-bold cursor-pointer transition-colors"
            >
              Close All ({positions.length})
            </button>
          )}
        </div>

        {/* 3 Subtabs: Open, Pending, Closed */}
        <div className="flex items-center justify-around border-b border-neutral-100 dark:border-neutral-800/80 -mb-2">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${
              activeSubTab === 'open'
                ? isDarkMode ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            <span>Open</span>
            {positions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-500 font-bold">
                {positions.length}
              </span>
            )}
            {activeSubTab === 'open' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${
              activeSubTab === 'pending'
                ? isDarkMode ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            <span>Pending</span>
            {pendingOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-neutral-200 dark:bg-neutral-800 font-bold">
                {pendingOrders.length}
              </span>
            )}
            {activeSubTab === 'pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>

            <button
            onClick={() => setActiveSubTab('closed')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${
              activeSubTab === 'closed'
                ? isDarkMode ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            <span>Closed</span>
            {closedTrades.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {closedTrades.length}
              </span>
            )}
            {activeSubTab === 'closed' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`px-2 py-1 text-[10px] rounded-lg border cursor-pointer ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300'}`}
            onChange={(e) => {
              const days = parseInt(e.target.value);
              console.log('Filter by', days, 'days');
            }}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Floating P/L, Equity, and Free Margin Metrics Banner */}
      <div
        className={`px-4 py-3 border-b grid grid-cols-3 gap-2 text-xs ${
          isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-slate-50'
        }`}
      >
        <div>
          <span className={`block text-[10px] uppercase font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Floating P/L</span>
          <span
            className={`font-black text-sm ${
              totalFloatingPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
          </span>
        </div>

        <div>
          <span className={`block text-[10px] uppercase font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Equity</span>
          <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${(account?.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="text-right">
          <span className={`block text-[10px] uppercase font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Free Margin</span>
          <span className={`font-bold text-sm ${(account?.freeMargin ?? 0) <= 0 ? 'text-red-500' : isDarkMode ? 'text-white' : 'text-slate-900'}`}>${(account?.freeMargin ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* OPEN POSITIONS SUBVIEW */}
      {activeSubTab === 'open' && (
        <div className="flex-1 flex flex-col">
          {/* List or Empty State */}
          {positions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
              <div className={`w-20 h-20 mb-4 rounded-2xl flex items-center justify-center border border-dashed ${
                isDarkMode ? 'border-neutral-700 bg-neutral-800/50 text-neutral-400' : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}>
                <Smartphone className="w-10 h-10 stroke-[1.5]" />
              </div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                There are no open trades at this time
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between px-1 mb-3">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {positions.length} Open Position{positions.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={onCloseAllPositions}
                  className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                >
                  Close All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {positions.map((pos) => {
                  const isBuy = pos.side === 'BUY';
                  return (
                    <div
                      key={pos.id}
                      className={`p-3.5 rounded-2xl border shadow-xs transition-all ${
                        isDarkMode
                          ? 'bg-[#181A20] border-neutral-800'
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pos.symbol}</span>
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                              isBuy
                                ? isDarkMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : isDarkMode ? 'bg-red-950/60 text-red-400' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {pos.side} {pos.lots}
                          </span>
                          <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>#{pos.ticket}</span>
                        </div>

                        {/* Profit */}
                        <span
                          className={`text-base font-black ${
                            pos.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between text-xs pt-1 border-t ${
                        isDarkMode ? 'text-neutral-400 border-neutral-800/80' : 'text-slate-500 border-slate-100'
                      }`}>
                        <div>
                          <span>{pos.openPrice}</span> ➔{' '}
                          <span className={isDarkMode ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>
                            {pos.currentPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={pos.sl ? 'text-red-400 font-semibold' : ''}>
                            SL: {pos.sl ?? '—'}{pos.slUsd ? ` (-$${pos.slUsd})` : ''}
                          </span>
                          <span className={pos.tp ? 'text-emerald-400 font-semibold' : ''}>
                            TP: {pos.tp ?? '—'}{pos.tpUsd ? ` (+$${pos.tpUsd})` : ''}
                          </span>
                        </div>
                      </div>

                      {editingPosId === pos.id && onUpdatePositionTpSl && (
                        <div className={`mt-2 p-2.5 rounded-xl border grid grid-cols-2 gap-2 ${
                          isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <label className="text-[10px] font-bold text-red-400 block mb-1">Stop Loss (Price or $)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="Price or $"
                              value={editSlValue}
                              onChange={(e) => setEditSlValue(e.target.value)}
                              className={`w-full px-2 py-1 text-xs font-mono rounded border focus:outline-none ${
                                isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 block mb-1">Take Profit (Price or $)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="Price or $"
                              value={editTpValue}
                              onChange={(e) => setEditTpValue(e.target.value)}
                              className={`w-full px-2 py-1 text-xs font-mono rounded border focus:outline-none ${
                                isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                          <div className="col-span-2 flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingPosId(null)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/30 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const nextSl = editSlValue.trim() !== '' ? parseFloat(editSlValue) : null;
                                const nextTp = editTpValue.trim() !== '' ? parseFloat(editTpValue) : null;
                                onUpdatePositionTpSl(
                                  pos.id,
                                  nextSl && !isNaN(nextSl) && nextSl > 0 ? nextSl : null,
                                  nextTp && !isNaN(nextTp) && nextTp > 0 ? nextTp : null
                                );
                                setEditingPosId(null);
                              }}
                              className="px-3 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                            >
                              Save TP/SL
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 ${
                        isDarkMode ? 'border-neutral-800' : 'border-slate-100'
                      }`}>
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
                            className={`py-1 px-2.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {editingPosId === pos.id ? 'Close Editor' : 'Set TP / SL'}
                          </button>
                        ) : <span />}
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className={`py-1 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'bg-red-950/40 hover:bg-red-900/60 text-red-400'
                              : 'bg-red-50 hover:bg-red-100 text-red-600'
                          }`}
                        >
                          Close Position
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Latest 20 Closed Trades Preview directly visible below Open Positions */}
          {closedTrades.length > 0 && (
            <div className={`p-3 sm:p-4 border-t ${isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between px-1 mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                  Closed Trades History
                </span>
                <button
                  onClick={() => setActiveSubTab('closed')}
                  className="text-xs text-[#E51937] hover:underline font-semibold cursor-pointer"
                >
                  View Full History
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {closedTrades.map((cl) => {
                  const exactPnl =
                    cl.openPrice && cl.closePrice && cl.openPrice !== cl.closePrice
                      ? calculateBotPnL(cl.symbol, cl.side, cl.openPrice, cl.closePrice, cl.lots)
                      : cl.pnl;
                  return (
                    <div
                      key={cl.id}
                      className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cl.symbol}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              cl.side === 'BUY'
                                ? isDarkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : isDarkMode ? 'bg-red-950 text-red-400' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {cl.side} {cl.lots}
                          </span>
                          <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                            #{cl.ticket}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs ${
                            exactPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {exactPnl >= 0 ? '+' : ''}${exactPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-[11px] mt-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        <span>
                          {cl.openPrice} ➔ <strong className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>{cl.closePrice}</strong>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cl.reason}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PENDING ORDERS SUBVIEW */}
      {activeSubTab === 'pending' && (
        <div className="flex-1 p-4">
          {pendingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <div className={`w-20 h-20 mb-4 rounded-2xl flex items-center justify-center border border-dashed ${
                isDarkMode ? 'border-neutral-700 bg-neutral-800/50 text-neutral-400' : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}>
                <Clock className="w-10 h-10 stroke-[1.5]" />
              </div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                No pending orders active
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className={`p-3.5 rounded-2xl border shadow-xs ${
                    isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ord.symbol}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ord.type} {ord.lots}
                      </span>
                    </div>
                    <button
                      onClick={() => onCancelPendingOrder(ord.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Target Price: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{ord.targetPrice}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CLOSED TRADES SUBVIEW */}
      {activeSubTab === 'closed' && (
        <div className="flex-1 p-3 sm:p-4">
          <div className="flex items-center justify-between px-1 mb-3">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              Closed Trades History
            </span>
          </div>
          {closedTrades.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[260px]">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                No closed trades recorded yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {closedTrades.map((cl) => {
                const exactPnl =
                  cl.openPrice && cl.closePrice && cl.openPrice !== cl.closePrice
                    ? calculateBotPnL(cl.symbol, cl.side, cl.openPrice, cl.closePrice, cl.lots)
                    : cl.pnl;
                return (
                  <div
                    key={cl.id}
                    className={`p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cl.symbol}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            cl.side === 'BUY'
                              ? isDarkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                              : isDarkMode ? 'bg-red-950 text-red-400' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {cl.side} {cl.lots}
                        </span>
                        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          #{cl.ticket}
                        </span>
                      </div>
                      <span
                        className={`font-black text-sm ${
                          exactPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {exactPnl >= 0 ? '+' : ''}${exactPnl.toFixed(2)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-xs mt-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      <span>
                        {cl.openPrice} ➔ <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{cl.closePrice}</strong>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Reason: {cl.reason}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
