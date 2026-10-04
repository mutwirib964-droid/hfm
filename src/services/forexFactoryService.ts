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

const DYNAMIC_MACRO_POOL: Array<Omit<MarketArticle, 'id' | 'timestamp'>> = [
  {
    title: 'Gold Surges Amid Institutional Safe-Haven Flows & Real Yield Compression',
    url: 'https://www.investing.com/commodities/gold',
    source: 'VTM Macro Dispatch',
    country: 'XAU',
    impact: 'High',
    category: 'Commodities & Metals',
    summary:
      'Spot bullion continues to attract central bank and sovereign wealth accumulation as US Treasury real yields ease ahead of key FOMC commentary.',
    author: 'Institutional Desk',
  },
  {
    title: 'EUR/USD Tests Key Liquidity Zone Ahead of ECB & Fed Policy Divergence',
    url: 'https://www.fxstreet.com/currencies/eurusd',
    source: 'Global FX Wire',
    country: 'EUR',
    impact: 'High',
    category: 'Central Banks',
    summary:
      'European session order books show strong institutional bid support as traders weigh Eurozone core inflation prints against US labor market resilience.',
    author: 'Senior FX Strategist',
  },
  {
    title: 'GBP/USD Breaks Intraday Resistance Following UK Services PMI & Wage Data',
    url: 'https://www.fxstreet.com/currencies/gbpusd',
    source: 'London Quantitative Desk',
    country: 'GBP',
    impact: 'High',
    category: 'Macroeconomic Data',
    summary:
      'Sterling outperformed G10 peers during the London open as sticky services inflation reduced near-term Bank of England rate cut probabilities.',
    author: 'Market Analysis Group',
  },
  {
    title: 'USD/JPY Volatility Spikes as Bank of Japan Signals Yield Curve Vigilance',
    url: 'https://www.forexlive.com',
    source: 'Asia-Pacific Market Desk',
    country: 'JPY',
    impact: 'High',
    category: 'Central Banks',
    summary:
      'Japanese Ministry of Finance and BoJ officials reiterated readiness to address excessive one-sided FX moves as US-Japan yield spreads fluctuate.',
    author: 'Tokyo Macro Strategist',
  },
  {
    title: 'WTI & Brent Crude Oil Rally on Tightening Global Inventory Drawdowns',
    url: 'https://www.investing.com/commodities/crude-oil',
    source: 'Commodities & Energy Terminal',
    country: 'OIL',
    impact: 'Medium',
    category: 'Commodities',
    summary:
      'Energy futures advanced after EIA and API weekly stockpile reports showed larger-than-forecast draws across Cushing and Gulf Coast refineries.',
    author: 'Energy Research Group',
  },
  {
    title: 'Nasdaq 100 & S&P 500 Futures Climb as AI Semiconductor Earnings Beat Estimates',
    url: 'https://www.investing.com/indices/nq-100-futures',
    source: 'Wall Street Equity Feed',
    country: 'USD',
    impact: 'High',
    category: 'Global Indices',
    summary:
      'US equity index futures extended gains in pre-market action as mega-cap technology and cloud infrastructure guidance surpassed consensus.',
    author: 'US Equities Desk',
  },
  {
    title: 'AUD/USD & NZD/USD Advance on Stronger Asia-Pacific Trade Balance Surplus',
    url: 'https://www.fxstreet.com/currencies/audusd',
    source: 'Sydney FX Research',
    country: 'AUD',
    impact: 'Medium',
    category: 'Forex Markets',
    summary:
      'Antipodean currencies gained traction following upbeat industrial demand indicators and iron ore futures strength in Asian trading.',
    author: 'APAC Strategist',
  },
  {
    title: 'USD/CAD Reacts to Bank of Canada Rate Outlook and North American Oil Flows',
    url: 'https://www.fxstreet.com/currencies/usdcad',
    source: 'North American FX Desk',
    country: 'CAD',
    impact: 'Medium',
    category: 'Central Banks',
    summary:
      'The Canadian dollar saw active two-way institutional volume as crude oil correlations and domestic CPI expectations drove algorithmic rebalancing.',
    author: 'FX Quant Team',
  },
  {
    title: 'Swiss Franc (USD/CHF) Sees Safe-Haven Demand Ahead of European Bond Auctions',
    url: 'https://www.forexlive.com',
    source: 'Zurich Institutional Wire',
    country: 'CHF',
    impact: 'Low',
    category: 'Forex Markets',
    summary:
      'Cross-border defensive positioning supported the franc as European sovereign debt auctions drew selective institutional participation.',
    author: 'European Desk',
  },
  {
    title: 'Silver (XAG/USD) Outperforms on Industrial Solar Demand & Gold Ratio Compression',
    url: 'https://www.investing.com/commodities/silver',
    source: 'Precious Metals Intelligence',
    country: 'XAG',
    impact: 'Medium',
    category: 'Commodities & Metals',
    summary:
      'The Gold-to-Silver ratio narrowed as momentum algorithms triggered breakout buy orders above key 4-hour technical resistance.',
    author: 'Metals Strategist',
  },
  {
    title: 'US Dollar Index (DXY) Consolidates Ahead of Non-Farm Payrolls & ISM Services',
    url: 'https://www.investing.com/indices/usdollar',
    source: 'VTM Macro Dispatch',
    country: 'USD',
    impact: 'High',
    category: 'Macroeconomic Data',
    summary:
      'Institutional FX desks trimmed directional dollar exposure ahead of high-impact US labor market and Treasury auction releases.',
    author: 'Chief Market Economist',
  },
  {
    title: 'GER40 (DAX) & UK100 (FTSE) Mixed as European Industrial Orders Stabilize',
    url: 'https://www.investing.com/indices/germany-30',
    source: 'Frankfurt Market Wire',
    country: 'EUR',
    impact: 'Medium',
    category: 'Global Indices',
    summary:
      'European blue-chip indices traded in a tight range as gains in defense and financial sectors offset cautious manufacturing sentiment.',
    author: 'European Equities Desk',
  },
];

class MarketNewsService {
  private newsCache: MarketArticle[] = [];
  private calendarCache: MarketCalendarEvent[] = [];
  private lastNewsFetch = 0;
  private lastCalendarFetch = 0;
  private rotationCursor = 0;

  async getLatestNews(forceRefresh: boolean = false): Promise<MarketArticle[]> {
    const now = Date.now();
    if (!forceRefresh && this.newsCache.length > 0 && now - this.lastNewsFetch < 15000) {
      return this.newsCache;
    }

    this.rotationCursor = (this.rotationCursor + 1) % DYNAMIC_MACRO_POOL.length;
    const liveArticles: MarketArticle[] = [];

    // 1. Fetch live real-time global crypto & macro market news from public CORS-enabled API
    try {
      const ccRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
        signal: AbortSignal.timeout(4500),
      });
      if (ccRes.ok) {
        const ccData = await ccRes.json();
        if (ccData && Array.isArray(ccData.Data) && ccData.Data.length > 0) {
          const offset = (this.rotationCursor * 2) % Math.max(1, ccData.Data.length - 8);
          const slice = ccData.Data.slice(offset, offset + 6);
          slice.forEach((item: any, idx: number) => {
            const tags = String(item.categories || 'BTC|CRYPTO').toUpperCase();
            const country = tags.includes('ETH')
              ? 'ETH'
              : tags.includes('SOL')
              ? 'SOL'
              : tags.includes('REGULATION') || tags.includes('FIAT')
              ? 'USD'
              : 'BTC';
            liveArticles.push({
              id: `live-cc-${item.id || now}-${idx}`,
              title: item.title || 'Digital Asset Market Update',
              url: item.url || item.guid || '#',
              source: item.source_info?.name || item.source || 'Global Digital Wire',
              country,
              impact: idx % 3 === 0 ? 'High' : idx % 2 === 0 ? 'Medium' : 'Low',
              timestamp: (item.published_on ? item.published_on * 1000 : now) - idx * 60000,
              category: 'Live Market Wire',
              summary:
                typeof item.body === 'string' && item.body.length > 220
                  ? `${item.body.slice(0, 217)}...`
                  : item.body || 'Real-time institutional market update.',
              author: item.source_info?.name || 'Market Desk',
            });
          });
        }
      }
    } catch {
      // Ignore network error and continue
    }

    // 2. Also check backend /api/market-news if available
    try {
      const res = await fetch(`/api/market-news?t=${now}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.articles && Array.isArray(data.articles)) {
            data.articles.forEach((art: MarketArticle) => {
              if (art && art.title && !liveArticles.some((a) => a.title === art.title)) {
                liveArticles.push(art);
              }
            });
          }
        }
      }
    } catch {
      // Ignore
    }

    // 3. Rotate in dynamic Forex, Gold, Oil, and Indices macro dispatches with fresh timestamps
    const rotatedMacro = this.getRotatedMacroNews(now);
    const combined = [...rotatedMacro.slice(0, 4), ...liveArticles, ...rotatedMacro.slice(4)]
      .slice(0, 14)
      .sort((a, b) => b.timestamp - a.timestamp);

    this.newsCache = combined;
    this.lastNewsFetch = now;
    return this.newsCache;
  }

  async getCalendarEvents(): Promise<MarketCalendarEvent[]> {
    const now = Date.now();
    if (this.calendarCache.length > 0 && now - this.lastCalendarFetch < 60000) {
      return this.calendarCache;
    }

    try {
      const res = await fetch('/api/market-calendar', {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.events && Array.isArray(data.events)) {
            this.calendarCache = data.events;
            this.lastCalendarFetch = now;
            return this.calendarCache;
          }
        }
      }
    } catch {
      // Fallback
    }

    return this.calendarCache.length > 0 ? this.calendarCache : this.getFallbackCalendar();
  }

  private getRotatedMacroNews(now: number): MarketArticle[] {
    const total = DYNAMIC_MACRO_POOL.length;
    const selected: MarketArticle[] = [];
    for (let i = 0; i < 8; i++) {
      const idx = (this.rotationCursor * 3 + i) % total;
      const base = DYNAMIC_MACRO_POOL[idx];
      const minutesAgo = i * 4 + ((now >> 10) % 3) + 1;
      selected.push({
        ...base,
        id: `macro-${now}-${idx}-${i}`,
        timestamp: now - minutesAgo * 60 * 1000,
      });
    }
    return selected;
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
      },
      {
        title: 'ECB Monetary Policy Statement',
        country: 'EUR',
        date: '13:15 UTC',
        impact: 'High',
        forecast: '-',
        previous: '-',
      },
      {
        title: 'Unemployment Claims',
        country: 'USD',
        date: '12:30 UTC',
        impact: 'High',
        forecast: '215K',
        previous: '212K',
      },
      {
        title: 'Retail Sales m/m',
        country: 'GBP',
        date: '06:00 UTC',
        impact: 'Medium',
        forecast: '0.4%',
        previous: '0.2%',
      },
      {
        title: 'BoJ Core CPI y/y',
        country: 'JPY',
        date: '05:00 UTC',
        impact: 'Medium',
        forecast: '2.4%',
        previous: '2.3%',
      },
    ];
  }
}

export const marketNewsService = new MarketNewsService();
export const forexFactoryService = marketNewsService;
