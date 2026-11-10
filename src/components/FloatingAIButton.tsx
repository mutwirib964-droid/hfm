import React from 'react';

interface FloatingAIButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ isActive, onClick }) => {
  return (
    <div className="fixed left-3.5 sm:left-4 bottom-20 sm:bottom-7 z-50 group">
      <button
        id="floating-ai-intelligence-btn"
        onClick={onClick}
        aria-label="AI Market Intelligence"
        title="AI Market Intelligence & Signals"
        className={`relative w-12 h-12 rounded-[18px] bg-[#0B0E17] flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer select-none ${
          isActive
            ? 'ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.7),0_0_10px_rgba(99,102,241,0.6)]'
            : 'ring-[1.5px] ring-purple-500/60 hover:ring-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.4),0_0_8px_rgba(59,130,246,0.3)]'
        }`}
      >
        {/* Subtle inner gradient shimmer */}
        <div className="absolute inset-0 rounded-[18px] bg-gradient-to-tr from-purple-600/20 via-transparent to-blue-500/20 pointer-events-none" />

        {/* Custom AI Sparkle Icon matching image_2dd8b372.png */}
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 text-purple-400 group-hover:text-purple-300 transition-colors drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]"
        >
          {/* Main 4-pointed curved star with smooth rounded arms */}
          <path
            d="M14 4C14 8.5 17.5 12 22 12C17.5 12 14 15.5 14 20C14 15.5 10.5 12 6 12C10.5 12 14 8.5 14 4Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />
          {/* Small circle dot at bottom-left */}
          <circle cx="8" cy="19" r="1.8" fill="currentColor" />
          {/* Small plus sign at top-right */}
          <path
            d="M21 5V9M19 7H23"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {/* Active glowing indicator pill */}
        {isActive && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0B0E17] rounded-full animate-ping" />
        )}
      </button>

      {/* Floating Tooltip */}
      <div className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900/95 text-white text-[11px] font-bold whitespace-nowrap shadow-xl border border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        AI Market Intelligence
      </div>
    </div>
  );
};
