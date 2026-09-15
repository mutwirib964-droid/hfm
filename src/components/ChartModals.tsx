import React, { useState } from 'react';
import {
  X,
  Trash2,
  Minus,
  Plus,
  Bell,
  Check,
  TrendingUp,
  Sliders,
  Maximize2,
  PenTool,
  MoveVertical,
  ArrowUpRight,
  AlignJustify,
  Circle,
  Square,
  Type,
  Share2,
  GitCommit,
} from 'lucide-react';
import { Instrument } from '../types';

export interface DrawingToolItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface DrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: string) => void;
  isDarkMode?: boolean;
}

export const DrawingModal: React.FC<DrawingModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  const sections: { title: string; tools: DrawingToolItem[] }[] = [
    {
      title: 'Lines',
      tools: [
        { id: 'Horizontal', name: 'Horizontal', icon: Minus, description: 'Horizontal price ray/level' },
        { id: 'Vertical', name: 'Vertical', icon: MoveVertical, description: 'Vertical time line' },
        { id: 'Trendline', name: 'Trendline', icon: TrendingUp, description: 'Diagonal trend line' },
        { id: 'Arrowed', name: 'Arrowed', icon: ArrowUpRight, description: 'Directional arrow pointer' },
        { id: 'Equidistant', name: 'Equidistant', icon: AlignJustify, description: 'Parallel trend channel' },
      ],
    },
    {
      title: 'Fibonacci',
      tools: [
        { id: 'Retracements', name: 'Retracements', icon: Sliders, description: 'Fibonacci golden ratio levels' },
      ],
    },
    {
      title: 'Shapes',
      tools: [
        { id: 'Ellipse', name: 'Ellipse', icon: Circle, description: 'Zone circle / ellipse' },
        { id: 'Rectangle', name: 'Rectangle', icon: Square, description: 'Support / resistance box' },
      ],
    },
    {
      title: 'Other & Harmonics',
      tools: [
        { id: 'Text', name: 'Text Note', icon: Type, description: 'Text label on chart' },
        { id: 'XABCD', name: 'XABCD Pattern', icon: Share2, description: 'Harmonic 5-point pattern' },
        { id: 'ABCD', name: 'ABCD Wave', icon: GitCommit, description: 'ABCD harmonic wave' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div
        className={`relative w-full max-w-md rounded-t-3xl p-5 z-50 shadow-2xl transition-colors ${
          isDarkMode ? 'bg-[#181A20] text-white border-t border-neutral-800' : 'bg-white text-neutral-900'
        }`}
      >
        <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold">Drawing Tools</h3>
            <p className="text-xs text-neutral-400">Select a TradingView tool to draw directly on canvas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectTool('clear');
                onClose();
              }}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 py-1 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>{sec.title}</span>
                <span className="text-[10px] font-normal text-neutral-500">({sec.tools.length})</span>
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {sec.tools.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onSelectTool(tool.id);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group ${
                        isDarkMode
                          ? 'border-neutral-800 hover:border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800 text-neutral-200'
                          : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50/70 hover:bg-white text-neutral-800 shadow-xs'
                      }`}
                      title={tool.description}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-200/50 dark:bg-neutral-800 group-hover:scale-110 transition-transform text-[#E51937]">
                        <ToolIcon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <span className="truncate w-full font-semibold">{tool.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument;
  onSetAlert: (price: number) => void;
  isDarkMode?: boolean;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  instrument,
  onSetAlert,
  isDarkMode = false,
}) => {
  const [alertPrice, setAlertPrice] = useState<number>(instrument.bid);
  const [confirmed, setConfirmed] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAdjust = (delta: number) => {
    const step = 1 / instrument.pipMultiplier;
    setAlertPrice((p) => Number((p + delta * step).toFixed(instrument.decimals)));
  };

  const handleConfirm = () => {
    onSetAlert(alertPrice);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-md rounded-t-3xl p-5 z-50 shadow-2xl transition-colors ${
          isDarkMode ? 'bg-[#181A20] text-white' : 'bg-white text-neutral-900'
        }`}
      >
        <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold">Set Alert ({instrument.symbol})</h3>
            <p className="text-xs text-neutral-400">{instrument.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          <div className="text-xs text-neutral-500 font-medium">Price</div>

          <div
            className={`flex items-center justify-between p-2 rounded-xl border ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <button
              onClick={() => handleAdjust(-10)}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold active:scale-95 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              value={alertPrice}
              onChange={(e) => setAlertPrice(parseFloat(e.target.value) || instrument.bid)}
              className="text-center font-bold text-lg bg-transparent focus:outline-none w-36"
            />

            <button
              onClick={() => handleAdjust(10)}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleConfirm}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${
              confirmed
                ? 'bg-emerald-600 text-white'
                : isDarkMode
                ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
            }`}
          >
            {confirmed ? (
              <>
                <Check className="w-4 h-4" />
                <span>Alert Saved!</span>
              </>
            ) : (
              <span>Set alert</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
