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
          <div className="p-4">
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                <Smartphone className="w-10 h-10 mb-4 opacity-50" />
                <p className="text-sm font-medium opacity-70">No open trades</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {positions.map((pos) => (
                  <div key={pos.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{pos.symbol}</span>
                      <span className={`font-black ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>${pos.pnl.toFixed(2)}</span>
                    </div>
                    <button onClick={() => onClosePosition(pos.id)} className="w-full mt-2 py-1 bg-red-600 text-white text-xs font-bold rounded cursor-pointer">Close</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeSubTab === 'closed' && (
          <div className="p-4">
            <div className="mb-3">
              <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>Closed Trades History</span>
            </div>
            {memoizedClosedTrades.length === 0 ? (
              <div className="text-center p-8 text-sm opacity-70">No closed trades yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {memoizedClosedTrades.map((cl) => (
                  <div key={cl.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181A20] border-neutral-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{cl.symbol}</span>
                      <span className={`font-bold text-xs ${cl.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>${cl.pnl.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] opacity-60 mt-1">{cl.reason} | {cl.side} {cl.lots}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
