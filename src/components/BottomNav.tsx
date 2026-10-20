import React from 'react';
import { ActiveTab } from '../types';
import {
  Menu as MenuIcon,
  ArrowUpDown,
  TrendingUp,
  Bot,
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
      label: 'Positions',
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
      id: 'bots' as ActiveTab,
      label: 'Bots & EAs',
      icon: Bot,
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
      id="vtm-bottom-navigation"
      aria-label="VTM Markets Mobile Navigation"
      className={`w-full py-1.5 px-1 sm:px-2 flex items-center justify-around select-none transition-colors duration-200 overflow-hidden ${
        isDarkMode
          ? 'bg-[#111317] text-[#CBD5E1]'
          : 'bg-white text-[#334155]'
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
            className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 flex-1 min-w-0 rounded-lg transition-colors cursor-pointer ${
              isActive
                ? 'text-[#E51937]'
                : isDarkMode
                ? 'text-[#94A3B8] hover:text-white'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            {/* Top red indicator bar when active */}
            {isActive && (
              <span className="absolute -top-1.5 w-6 h-[2px] bg-[#E51937] rounded-full" />
            )}

            <div className="relative">
              <Icon className="w-[20px] h-[20px] stroke-[1.75]" />
              {tab.badge !== null && (
                <span className="absolute -top-1 -right-2.5 bg-[#E51937] text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                  {tab.badge}
                </span>
              )}
            </div>

            <span className={`text-[10px] tracking-tight mt-1 truncate max-w-full ${isActive ? 'font-bold text-[#E51937]' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
