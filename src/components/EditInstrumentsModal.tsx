import React from 'react';
import { ArrowLeft, Menu as DragHandle } from 'lucide-react';
import { MarketCategory } from '../types';

interface EditInstrumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: MarketCategory; name: string; enabled: boolean }[];
  onToggleCategory: (cat: MarketCategory) => void;
  isDarkMode?: boolean;
}

export const EditInstrumentsModal: React.FC<EditInstrumentsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onToggleCategory,
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="edit-instruments-screen"
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 ${
        isDarkMode ? 'bg-[#111317] text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-4 py-3.5 flex items-center gap-3 border-b ${
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Edit Instruments</h1>
      </div>

      {/* Subtitle instructions */}
      <div className="px-4 py-3 text-xs text-neutral-500 leading-relaxed border-b border-neutral-100 dark:border-neutral-800/60">
        Choose which instruments will be presented in the Market screen and rearrange their order.
      </div>

      {/* Categories Toggle List */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-neutral-100 dark:divide-neutral-800/80">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="py-4 flex items-center justify-between group"
          >
            <span className="text-[15px] font-medium tracking-tight">
              {cat.name}
            </span>

            <div className="flex items-center gap-4">
              {/* iOS style green switch */}
              <button
                type="button"
                role="switch"
                aria-checked={cat.enabled}
                onClick={() => onToggleCategory(cat.id)}
                className={`w-12 h-7 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${
                  cat.enabled ? 'bg-[#22C55E]' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    cat.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Drag Handle Icon */}
              <div className="text-neutral-400 dark:text-neutral-500 p-1 cursor-grab">
                <DragHandle className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
