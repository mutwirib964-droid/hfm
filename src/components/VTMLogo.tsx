import React from 'react';

interface VTMLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'top' | 'full'; // 'top' = just VTM; 'full' = VTM Markets
  showSubtitle?: boolean;
  isDarkMode?: boolean;
}

export const VTMLogo: React.FC<VTMLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'top',
  showSubtitle = false,
  isDarkMode = true,
}) => {
  const dimensions = {
    xs: { iconSize: 22, fontSize: 'text-base', subSize: 'text-[9px]' },
    sm: { iconSize: 26, fontSize: 'text-lg', subSize: 'text-[10px]' },
    md: { iconSize: 32, fontSize: 'text-2xl', subSize: 'text-[11px]' },
    lg: { iconSize: 42, fontSize: 'text-3xl', subSize: 'text-xs' },
    xl: { iconSize: 52, fontSize: 'text-4xl', subSize: 'text-sm' },
  }[size];

  return (
    <div id="vtm-platform-logo" className={`flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      {/* Precision Engineered V-T-M Monogram Emblem */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={dimensions.iconSize}
          height={dimensions.iconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* VTM Primary Red Gradient: High-vibrancy scarlet to deep crimson */}
            <linearGradient id="vtm-monogram-red" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF3352" />
              <stop offset="50%" stopColor="#E51937" />
              <stop offset="100%" stopColor="#A80018" />
            </linearGradient>

            {/* Left Wing / Left M-Pillar Metallic Gradient */}
            <linearGradient id="vtm-pillar-l" x1="4" y1="6" x2="16" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isDarkMode ? '#FFFFFF' : '#0F172A'} />
              <stop offset="100%" stopColor={isDarkMode ? '#94A3B8' : '#334155'} />
            </linearGradient>

            {/* Right Wing / Right M-Pillar Metallic Gradient */}
            <linearGradient id="vtm-pillar-r" x1="32" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isDarkMode ? '#F8FAFC' : '#1E293B'} />
              <stop offset="100%" stopColor={isDarkMode ? '#64748B' : '#475569'} />
            </linearGradient>

            {/* Radiant T-Crown Glow */}
            <filter id="vtm-glow-filter" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#E51937" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* ========================================================================= */}
          {/* 1. THE 'M' ARCHITECTURE: Left & Right Outer Pillars forming the twin peaks */}
          {/* ========================================================================= */}
          {/* Left Flank of M */}
          <path
            d="M 5 10 L 10.5 6 L 13.5 13 L 9.5 40 L 4 40 L 5 10 Z"
            fill="url(#vtm-pillar-l)"
          />

          {/* Right Flank of M */}
          <path
            d="M 43 10 L 37.5 6 L 34.5 13 L 38.5 40 L 44 40 L 43 10 Z"
            fill="url(#vtm-pillar-r)"
          />

          {/* ========================================================================= */}
          {/* 2. THE 'V' CHEVRON: Bold dynamic velocity blades meeting at center vertex  */}
          {/* ========================================================================= */}
          {/* Left Arm of 'V' (Radiant gradient face) */}
          <path
            d="M 12 15.5 L 16.8 15.5 L 24 33 L 24 41.5 L 12 15.5 Z"
            fill="url(#vtm-monogram-red)"
          />

          {/* Right Arm of 'V' (3D shaded facet for depth) */}
          <path
            d="M 36 15.5 L 31.2 15.5 L 24 33 L 24 41.5 L 36 15.5 Z"
            fill="#B8071E"
          />

          {/* ========================================================================= */}
          {/* 3. THE 'T' KEYSTONE: Crowned Crossbar + Vertical Stem pointing into the V  */}
          {/* ========================================================================= */}
          {/* Horizontal Crossbar of 'T' */}
          <path
            d="M 15 6.5 H 33 L 34.8 11.5 H 13.2 L 15 6.5 Z"
            fill="url(#vtm-monogram-red)"
            filter="url(#vtm-glow-filter)"
          />

          {/* Central Vertical Stem of 'T' (Dropping down into the V pocket) */}
          <path
            d="M 21.5 11.5 H 26.5 V 24.5 L 24 28 L 21.5 24.5 V 11.5 Z"
            fill="url(#vtm-monogram-red)"
          />

          {/* Precision Light Sheen on the T's top plane */}
          <path
            d="M 15 6.5 H 33 L 34 9 H 14 L 15 6.5 Z"
            fill="#FFFFFF"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        {variant === 'top' ? (
          /* On the platform on top: Just show VTM */
          <div className="flex items-center tracking-wider">
            <span
              className={`font-black tracking-wider leading-none ${dimensions.fontSize} ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              VTM
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E51937] ml-1.5 self-center inline-block" />
          </div>
        ) : (
          /* Full Brand Presentation: VTM Markets */
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-wider leading-none ${dimensions.fontSize} ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              VTM
            </span>
            <span className={`font-bold tracking-tight leading-none text-[#E51937] ${dimensions.fontSize}`}>
              Markets
            </span>
          </div>
        )}

        {showSubtitle && (
          <span className={`font-semibold tracking-widest uppercase text-neutral-400 mt-0.5 ${dimensions.subSize}`}>
            Global Broker
          </span>
        )}
      </div>
    </div>
  );
};
