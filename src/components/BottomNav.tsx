import React from 'react';
import { ActiveTab } from '../types';
import {
  Menu as MenuIcon,
  ArrowUpDown,
  TrendingUp,
  Newspaper,
  MoreHorizontal,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  openPositionsCount: number;
  isDarkMode?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  openPositionsCount,
  isDarkMode = false,
}) => {
  const tabs = [
    {
      id: 'menu' as ActiveTab,
      label: 'Menu',
      icon: MenuIcon,
      badge: null,
    },
    {
      id: 'trades' as ActiveTab,
      label: 'Trades',
      icon: ArrowUpDown,
      badge: openPositionsCount > 0 ? openPositionsCount : null,
    },
    {
      id: 'markets' as ActiveTab,
      label: 'Markets',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'news' as ActiveTab,
      label: 'News',
      icon: Newspaper,
      badge: null,
    },
    {
      id: 'more' as ActiveTab,
      label: 'More',
      icon: MoreHorizontal,
      badge: null,
    },
  ];

  return (
    <nav
      id="hfm-bottom-navigation"
      aria-label="HFM Mobile Platform Navigation"
      className={`sticky bottom-0 z-40 w-full border-t py-1.5 px-2 flex items-center justify-around select-none transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#111317] border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        // If current subview is instrument-detail, treat 'markets' as active
        const isActive =
          activeTab === tab.id ||
          (tab.id === 'markets' && activeTab === 'instrument-detail') ||
          (tab.id === 'trades' && activeTab === 'trade');

        return (
          <button
            key={tab.id}
            id={`bottom-nav-${tab.id}`}
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[58px] rounded-lg transition-colors cursor-pointer ${
              isActive
                ? 'text-[#E51937]'
                : isDarkMode
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {/* Top red indicator bar when active (matching video) */}
            {isActive && (
              <span className="absolute -top-1.5 w-6 h-[2px] bg-[#E51937] rounded-full" />
            )}

            <div className="relative">
              <Icon className="w-[21px] h-[21px] stroke-[1.75]" />
              {tab.badge !== null && (
                <span className="absolute -top-1 -right-3 bg-[#E51937] text-white text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center leading-tight">
                  {tab.badge}
                </span>
              )}
            </div>

            <span className={`text-[10px] tracking-tight mt-1 ${isActive ? 'font-semibold' : 'font-normal'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
