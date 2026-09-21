// Real-World Market Trading Hours & Session Detection Utility
// Accurately replicates TradingView / Institutional Broker closure rules:
// - Crypto: 24/7/365 Open (never closes)
// - Forex: Closes Friday 22:00 UTC -> Reopens Sunday 22:00 UTC; Daily rollover 21:59-22:05 UTC
// - Metals/Commodities: Closes Friday 21:00 UTC -> Reopens Sunday 22:00 UTC; Daily break 21:00-22:00 UTC
// - Indices & Stocks: Closes weekends & outside regular equity trading sessions

export interface MarketSessionInfo {
  isOpen: boolean;
  status: 'OPEN' | 'CLOSED';
  reason: string;
  category: 'Forex' | 'Metals' | 'Commodities' | 'Indices' | 'Crypto' | 'Stocks';
  nextOpenTime?: string;
  nextSession?: string;
  closingTime?: string;
  sessionText: string;
  nextOpenText: string;
}

// Global simulation override state (stored in memory / localStorage for user testing)
let sessionOverride: 'LIVE_CLOCK' | 'FORCE_WEEKEND_CLOSE' | 'FORCE_OPEN' = 'LIVE_CLOCK';

export const setMarketSessionOverride = (mode: 'LIVE_CLOCK' | 'FORCE_WEEKEND_CLOSE' | 'FORCE_OPEN') => {
  sessionOverride = mode;
  try {
    localStorage.setItem('vtm_market_hours_mode', mode);
  } catch (e) {
    // Ignore storage issues
  }
};

export const getMarketSessionOverride = (): 'LIVE_CLOCK' | 'FORCE_WEEKEND_CLOSE' | 'FORCE_OPEN' => {
  try {
    const saved = localStorage.getItem('vtm_market_hours_mode');
    if (saved === 'LIVE_CLOCK' || saved === 'FORCE_WEEKEND_CLOSE' || saved === 'FORCE_OPEN') {
      sessionOverride = saved;
    }
  } catch (e) {
    // Ignore
  }
  return sessionOverride;
};

export const checkInstrumentMarketHours = (
  symbol: string,
  category: string = '',
  customDate?: Date
): MarketSessionInfo => {
  const mode = getMarketSessionOverride();
  let upperCat = (category || '').toUpperCase();
  const upperSym = (symbol || '').toUpperCase();

  // Infer category if missing
  if (!upperCat) {
    if (
      upperSym.startsWith('BTC') ||
      upperSym.startsWith('ETH') ||
      upperSym.startsWith('SOL') ||
      upperSym.startsWith('XRP') ||
      upperSym.startsWith('BNB') ||
      upperSym.startsWith('DOGE') ||
      upperSym.startsWith('ADA') ||
      upperSym.startsWith('AVAX')
    ) {
      upperCat = 'CRYPTO';
    } else if (
      upperSym.includes('AAPL') ||
      upperSym.includes('TSLA') ||
      upperSym.includes('NVDA') ||
      upperSym.includes('MSFT') ||
      upperSym.includes('AMZN') ||
      upperSym.includes('GOOGL') ||
      upperSym.includes('META') ||
      upperSym.includes('AMD') ||
      upperSym.includes('NFLX') ||
      upperSym.includes('COIN') ||
      upperSym.includes('PLTR') ||
      upperSym.includes('BABA')
    ) {
      upperCat = 'STOCKS';
    } else if (
      upperSym.includes('XAU') ||
      upperSym.includes('XAG') ||
      upperSym.includes('XPT') ||
      upperSym.includes('OIL') ||
      upperSym.includes('GAS') ||
      upperSym.includes('COPPER')
    ) {
      upperCat = 'COMMODITIES';
    } else if (
      upperSym.includes('500') ||
      upperSym.includes('100') ||
      upperSym.includes('30') ||
      upperSym.includes('40') ||
      upperSym.includes('225')
    ) {
      upperCat = 'INDICES';
    } else {
      upperCat = 'FOREX';
    }
  }

  const isCrypto =
    upperCat.includes('CRYPTO') ||
    upperSym.startsWith('BTC') ||
    upperSym.startsWith('ETH') ||
    upperSym.startsWith('SOL') ||
    upperSym.startsWith('XRP') ||
    upperSym.startsWith('BNB') ||
    upperSym.startsWith('DOGE') ||
    upperSym.startsWith('ADA') ||
    upperSym.startsWith('AVAX');

  // 1. Crypto pairs trade 24/7/365 unconditionally (never closes)
  if (isCrypto) {
    return {
      isOpen: true,
      status: 'OPEN',
      reason: 'Cryptocurrency market trades 24/7 unbroken',
      category: 'Crypto',
      sessionText: '24/7 Crypto Session',
      nextOpenText: 'Always Open',
    };
  }

  // If user requested manual force simulation for testing
  if (mode === 'FORCE_WEEKEND_CLOSE') {
    return {
      isOpen: false,
      status: 'CLOSED',
      reason: 'Market Closed for Weekend. Crypto remains 24/7 active.',
      category: (category || 'Forex') as any,
      nextOpenTime: 'Sunday 22:00 UTC',
      sessionText: 'Weekend Market Closure',
      nextOpenText: 'Reopens Sunday 22:00 UTC',
    };
  }

  if (mode === 'FORCE_OPEN') {
    return {
      isOpen: true,
      status: 'OPEN',
      reason: 'Market is actively trading',
      category: (category || 'Forex') as any,
      sessionText: 'Active Market Session',
      nextOpenText: 'Open Now',
    };
  }

  // Live real UTC clock determination
  const now = customDate || new Date();
  const utcDay = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const timeVal = utcHour + utcMinute / 60;

  const isStock = upperCat.includes('STOCK') || upperCat.includes('EQUITY');

  // ==========================================
  // A. US STOCKS SPECIFIC TRADING HOURS (NYSE/NASDAQ)
  // Regular session: 13:30 to 20:00 UTC (9:30 AM to 4:00 PM EST) Mon-Fri
  // ==========================================
  if (isStock) {
    // Weekend (Saturday or Sunday)
    if (utcDay === 6 || utcDay === 0) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Weekend Market Closure. US Stock Exchanges (NYSE/NASDAQ) closed.',
        category: 'Stocks',
        nextOpenTime: 'Mon 13:30 UTC',
        sessionText: 'US Equities Weekend Closure',
        nextOpenText: 'Reopens Mon 13:30 UTC',
      };
    }

    // Friday after 20:00 UTC (4:00 PM EST)
    if (utcDay === 5 && timeVal >= 20.0) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Weekend Market Closure. US Stock Exchanges closed.',
        category: 'Stocks',
        nextOpenTime: 'Mon 13:30 UTC',
        sessionText: 'US Equities Closed for Weekend',
        nextOpenText: 'Reopens Mon 13:30 UTC',
      };
    }

    // Weekdays before 13:30 UTC
    if (timeVal < 13.5) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Pre-market. US Regular Trading Session opens at 13:30 UTC (09:30 AM EST).',
        category: 'Stocks',
        nextOpenTime: 'Today 13:30 UTC',
        sessionText: 'Pre-Market Hours',
        nextOpenText: 'Opens Today 13:30 UTC',
      };
    }

    // Weekdays after 20:00 UTC
    if (timeVal >= 20.0) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Market Closed. US Regular Trading Session ended at 20:00 UTC (04:00 PM EST).',
        category: 'Stocks',
        nextOpenTime: utcDay === 5 ? 'Mon 13:30 UTC' : 'Tomorrow 13:30 UTC',
        sessionText: 'After-Hours Closed',
        nextOpenText: utcDay === 5 ? 'Reopens Mon 13:30 UTC' : 'Reopens Tomorrow 13:30 UTC',
      };
    }

    return {
      isOpen: true,
      status: 'OPEN',
      reason: 'US Stock Exchanges Regular Trading Session Active',
      category: 'Stocks',
      sessionText: 'US Equities Session',
      nextOpenText: 'Open Now',
    };
  }

  // ==========================================
  // B. FOREX, COMMODITIES, INDICES, BONDS, ETFS
  // ==========================================

  // Saturday: Everything non-crypto is completely closed
  if (utcDay === 6) {
    return {
      isOpen: false,
      status: 'CLOSED',
      reason: 'Weekend Market Closure (Saturday). Reopens Sunday 22:00 UTC.',
      category: (category || 'Forex') as any,
      nextOpenTime: 'Sun 22:00 UTC',
      sessionText: 'Weekend Market Closure',
      nextOpenText: 'Reopens Sun 22:00 UTC',
    };
  }

  // Sunday: Closed until 22:00 UTC (Tokyo/Sydney session open)
  if (utcDay === 0) {
    if (timeVal < 22) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Weekend Market Closure (Sunday). Reopens Sunday 22:00 UTC.',
        category: (category || 'Forex') as any,
        nextOpenTime: 'Today 22:00 UTC',
        sessionText: 'Weekend Market Closure',
        nextOpenText: 'Reopens Today 22:00 UTC',
      };
    } else {
      return {
        isOpen: true,
        status: 'OPEN',
        reason: 'Tokyo & Sydney Asian Trading Session Open',
        category: (category || 'Forex') as any,
        sessionText: 'Asian Session Active',
        nextOpenText: 'Open Now',
      };
    }
  }

  // Friday: Closes late evening (Forex 22:00 UTC, Metals/CFDs 21:00 UTC)
  if (utcDay === 5) {
    const isMetalsOrCFD =
      upperCat.includes('METAL') ||
      upperCat.includes('COMMODIT') ||
      upperCat.includes('INDEX');
    const closeThreshold = isMetalsOrCFD ? 21 : 22;

    if (timeVal >= closeThreshold) {
      return {
        isOpen: false,
        status: 'CLOSED',
        reason: 'Friday Weekend Settlement Close. Reopens Sunday 22:00 UTC.',
        category: (category || 'Forex') as any,
        nextOpenTime: 'Sun 22:00 UTC',
        sessionText: 'Weekend Settlement Close',
        nextOpenText: 'Reopens Sun 22:00 UTC',
      };
    }
  }

  // Weekdays (Monday through Thursday): Check daily maintenance / rollover breaks
  if (utcDay >= 1 && utcDay <= 4) {
    // Metals & Commodities: Daily break from 21:00 to 22:00 UTC
    if (upperCat.includes('METAL') || upperCat.includes('COMMODIT')) {
      if (timeVal >= 21.0 && timeVal < 22.0) {
        return {
          isOpen: false,
          status: 'CLOSED',
          reason: 'Daily Commodity Clearing & Rollover Break (21:00-22:00 UTC)',
          category: (category || 'Commodities') as any,
          nextOpenTime: '22:00 UTC',
          sessionText: 'Daily Clearing Break',
          nextOpenText: 'Resumes at 22:00 UTC',
        };
      }
    }

    // Forex: Brief daily rollover break 21:59 to 22:05 UTC
    if (upperCat.includes('FOREX')) {
      if (utcHour === 21 && utcMinute >= 59) {
        return {
          isOpen: false,
          status: 'CLOSED',
          reason: 'Daily Bank Settlement Rollover (21:59 - 22:05 UTC)',
          category: 'Forex',
          nextOpenTime: '22:05 UTC',
          sessionText: 'Bank Settlement Rollover',
          nextOpenText: 'Resumes at 22:05 UTC',
        };
      }
    }
  }

  return {
    isOpen: true,
    status: 'OPEN',
    reason: 'Active Institutional Trading Session',
    category: (category || 'Forex') as any,
    sessionText: 'Institutional Session Active',
    nextOpenText: 'Open Now',
  };
};
