import React from 'react';

interface HFMLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const HFMLogo: React.FC<HFMLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const dimensions = {
    sm: { height: 24, fontSize: 'text-lg', subSize: 'text-[9px]' },
    md: { height: 32, fontSize: 'text-2xl', subSize: 'text-[10px]' },
    lg: { height: 42, fontSize: 'text-3xl', subSize: 'text-xs' },
  }[size];

  return (
    <div id="hfm-brand-logo" className={`flex items-center gap-2 select-none ${className}`}>
      {/* Dynamic Vector HFM Brandmark */}
      <div className="flex items-center">
        {/* Bold HF Letters */}
        <span className={`font-black tracking-tight leading-none ${dimensions.fontSize} text-white dark:text-white`}>
          HF
        </span>

        {/* Custom Red Graphic 'M' */}
        <div className="relative inline-flex items-center ml-0.5">
          <svg
            height={dimensions.height}
            viewBox="0 0 32 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="inline-block drop-shadow-sm"
          >
            {/* Left upward slash */}
            <path
              d="M3 28L11 4H15.5L7.5 28H3Z"
              fill="#E51937"
            />
            {/* Center chevron peak */}
            <path
              d="M13 28L19 10.5L25 28H21L19 22L17 28H13Z"
              fill="#E51937"
            />
            {/* Right upward slant */}
            <path
              d="M23 4H27.5L20 28H15.5L23 4Z"
              fill="#FF2E4D"
            />
          </svg>
        </div>
      </div>

      {showSubtitle && (
        <div className="flex flex-col -space-y-0.5 border-l border-neutral-700/60 pl-2">
          <span className={`font-extrabold tracking-widest text-[#E51937] ${dimensions.subSize} uppercase`}>
            MARKETS
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-neutral-400 uppercase">
            Leader in Trading
          </span>
        </div>
      )}
    </div>
  );
};
