export interface MarketArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  country: string;
  impact: 'High' | 'Medium' | 'Low';
  timestamp: number;
  category: string;
  summary: string;
  author: string;
}

export interface MarketCalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low' | 'Holiday' | string;
  forecast: string;
  previous: string;
  actual?: string;
}

// Backward compatibility aliases
export type ForexFactoryArticle = MarketArticle;
export type ForexFactoryCalendarEvent = MarketCalendarEvent;

class MarketNewsService {
  private newsCache: MarketArticle[] = [];
  private calendarCache: MarketCalendarEvent[] = [];
  private lastNewsFetch = 0;
  private lastCalendarFetch = 0;

  async getLatestNews(): Promise<MarketArticle[]> {
    const now = Date.now();
    if (this.newsCache.length > 0 && now - this.lastNewsFetch < 30000) {
      return this.newsCache;
    }

    try {
      const res = await fetch('/api/market-news');
      if (res.ok) {
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          this.newsCache = data.articles;
          this.lastNewsFetch = now;
          return this.newsCache;
        }
      }
    } catch {
      // Fallback
    }

    return this.newsCache.length > 0 ? this.newsCache : this.getFallbackNews();
  }

  async getCalendarEvents(): Promise<MarketCalendarEvent[]> {
    const now = Date.now();
    if (this.calendarCache.length > 0 && now - this.lastCalendarFetch < 60000) {
      return this.calendarCache;
    }

    try {
      const res = await fetch('/api/market-calendar');
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          this.calendarCache = data.events;
          this.lastCalendarFetch = now;
          return this.calendarCache;
        }
      }
    } catch {
      // Fallback
    }

    return this.calendarCache.length > 0 ? this.calendarCache : this.getFallbackCalendar();
  }

  private getFallbackNews(): MarketArticle[] {
    return [
      {
        id: 'news-1',
        title: 'Gold Tests All-Time Highs Above $4,350 as Fed Easing Bets Mount',
        url: '#',
        source: 'VTM Macro Dispatch',
        country: 'XAU',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 18,
        category: 'Fundamental Analysis',
        summary:
          'Bullion capitalizes on cooling US inflation readings and safe-haven accumulation as institutional treasury yields compress across the curve.',
        author: 'Institutional Desk',
      },
      {
        id: 'news-2',
        title: 'EUR/USD Steadies Near 1.1530 Ahead of Critical Central Bank Rate Decision',
        url: '#',
        source: 'Global Macro Feed',
        country: 'EUR',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 45,
        category: 'Central Banks',
        summary:
          'The single currency defended its weekly support floor as traders price in monetary policy paths with high liquidity in the European session.',
        author: 'Senior FX Strategist',
      },
      {
        id: 'news-3',
        title: 'GBP/USD Eyes 1.3420 Handle Post Solid UK Employment and Wage Metrics',
        url: '#',
        source: 'VTM Quantitative Research',
        country: 'GBP',
        impact: 'Medium',
        timestamp: Date.now() - 1000 * 60 * 90,
        category: 'Technical Analysis',
        summary:
          'Sterling posted intraday gains following lower-than-anticipated unemployment claims data and sticky core wage inflation in Great Britain.',
        author: 'Market Analysis Group',
      },
      {
        id: 'news-4',
        title: 'USD/JPY Consolidates Near 148.50 as Asian Central Banks Signal Yield Vigilance',
        url: '#',
        source: 'Asia-Pacific Market Desk',
        country: 'JPY',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 140,
        category: 'Central Banks',
        summary:
          'Cross-currency flows tightened in Tokyo as sovereign debt volatility subsided, providing steady bid support around major technical pivot zones.',
        author: 'Macro Strategist',
      },
      {
        id: 'news-5',
        title: 'Crude Oil Advances to $82.50 Amid Strategic Energy Stockpile Rebalancing',
        url: '#',
        source: 'Commodities & Energy Terminal',
        country: 'OIL',
        impact: 'Medium',
        timestamp: Date.now() - 1000 * 60 * 210,
        category: 'Commodities',
        summary:
          'WTI and Brent crude futures ticked higher following reports of steady global demand metrics and constrained refinery inventories.',
        author: 'Energy Research Group',
      },
      {
        id: 'news-6',
        title: 'Bitcoin Holds Robust Ground Above $89,000 as Spot ETF Accumulation Expands',
        url: '#',
        source: 'Digital Asset Intelligence',
        country: 'BTC',
        impact: 'Low',
        timestamp: Date.now() - 1000 * 60 * 320,
        category: 'Crypto Assets',
        summary:
          'Digital asset markets experienced another net positive inflow day driven by institutional spot ETFs and systematic macro funds.',
        author: 'Quant Analyst',
      },
    ];
  }

  private getFallbackCalendar(): MarketCalendarEvent[] {
    return [
      {
        title: 'Core CPI m/m',
        country: 'USD',
        date: '12:30 UTC',
        impact: 'High',
        forecast: '0.3%',
        previous: '0.3%',
        actual: '0.2%',
      },
      {
        title: 'Federal Reserve Monetary Policy Statement',
        country: 'USD',
        date: '18:00 UTC',
        impact: 'High',
        forecast: '4.50%',
        previous: '4.75%',
        actual: '',
      },
      {
        title: 'ECB Main Refinancing Rate',
        country: 'EUR',
        date: '13:15 UTC',
        impact: 'High',
        forecast: '3.25%',
        previous: '3.40%',
        actual: '3.25%',
      },
      {
        title: 'Claimant Count Change',
        country: 'GBP',
        date: '07:00 UTC',
        impact: 'Medium',
        forecast: '15.2K',
        previous: '23.7K',
        actual: '12.4K',
      },
    ];
  }
}

export const marketNewsService = new MarketNewsService();
export const forexFactoryService = marketNewsService;
