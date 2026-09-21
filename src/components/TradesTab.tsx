import React, { useState } from 'react';
import {
  Position,
  PendingOrder,
  ClosedTrade,
  TradingAccount,
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

interface TradesTabProps {
  account: TradingAccount | null;
  positions: Position[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  onClosePosition: (id: string) => void;
  onCloseAllPositions: () => void;
  onCancelPendingOrder: (id: string) => void;
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
  isDarkMode = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'pending' | 'closed'>('open');

  const totalFloatingPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div
      id="vtm-trades-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-4 pt-4 pb-2 border-b ${
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <h1 className="text-xl font-bold tracking-tight mb-3">Trades</h1>

        {/* 3 Subtabs: Open, Pending, Closed */}
        <div className="flex items-center justify-around border-b border-neutral-100 dark:border-neutral-800/80 -mb-2">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`pb-2.5 px-4 text-sm font-semibold relative transition-colors cursor-pointer ${
              activeSubTab === 'open'
                ? isDarkMode ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            <span>Open</span>
            {positions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-neutral-200 dark:bg-neutral-800 font-bold">
                {positions.length}
              </span>
            )}
            {activeSubTab === 'open' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`pb-2.5 px-4 text-sm font-semibold relative transition-colors cursor-pointer ${
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
            className={`pb-2.5 px-4 text-sm font-semibold relative transition-colors cursor-pointer ${
              activeSubTab === 'closed'
                ? isDarkMode ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            <span>Closed</span>
            {activeSubTab === 'closed' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* OPEN POSITIONS SUBVIEW */}
      {activeSubTab === 'open' && (
        <div className="flex-1 flex flex-col">
          {/* Account Summary Banner */}
          <div
            className={`px-4 py-3 border-b grid grid-cols-3 gap-2 text-xs ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-slate-50'
            }`}
          >
            <div>
              <span className="text-slate-500 dark:text-neutral-400 block text-[10px] uppercase font-semibold">Floating P/L</span>
              <span
                className={`font-black text-sm ${
                  totalFloatingPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-neutral-400 block text-[10px] uppercase font-semibold">Equity</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">${(account?.equity ?? 0).toLocaleString()}</span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 dark:text-neutral-400 block text-[10px] uppercase font-semibold">Free Margin</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">${(account?.freeMargin ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* List or Empty State */}
          {positions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              {/* Authentic HFM Empty State Graphic (matching video 00:41) */}
              <div className="w-20 h-20 mb-4 rounded-2xl flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400">
                <Smartphone className="w-10 h-10 stroke-[1.5]" />
              </div>
              <p className="text-sm text-neutral-500 font-medium">
                There are no open trades at this time
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between px-1 mb-3">
                <span className="text-xs text-neutral-400 font-medium">
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
                          <span className="font-black text-sm">{pos.symbol}</span>
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                              isBuy
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {pos.side} {pos.lots}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400">#{pos.ticket}</span>
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

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                        <div>
                          <span>{pos.openPrice}</span> ➔{' '}
                          <span className={isDarkMode ? 'text-white' : 'text-neutral-800'}>
                            {pos.currentPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {pos.sl && <span>SL: {pos.sl}</span>}
                          {pos.tp && <span>TP: {pos.tp}</span>}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="py-1 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}

      {/* PENDING ORDERS SUBVIEW */}
      {activeSubTab === 'pending' && (
        <div className="flex-1 p-4">
          {pendingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <div className="w-20 h-20 mb-4 rounded-2xl flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400">
                <Clock className="w-10 h-10 stroke-[1.5]" />
              </div>
              <p className="text-sm text-neutral-500 font-medium">
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
                      <span className="font-bold text-sm">{ord.symbol}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
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
                  <div className="text-xs text-neutral-400">
                    Target Price: <strong className="text-neutral-800 dark:text-white">{ord.targetPrice}</strong>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {closedTrades.map((cl) => (
              <div
                key={cl.id}
                className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{cl.symbol}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cl.side === 'BUY'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          : 'bg-red-100 dark:bg-red-950 text-red-600'
                      }`}
                    >
                      {cl.side} {cl.lots}
                    </span>
                  </div>
                  <span
                    className={`font-black text-sm ${
                      cl.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {cl.pnl >= 0 ? '+' : ''}${cl.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mt-2">
                  <span>
                    {cl.openPrice} ➔ {cl.closePrice}
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-1.5 py-0.5 rounded">
                    Reason: {cl.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
