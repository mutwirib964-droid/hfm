export interface ForexFactoryArticle {
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

export interface ForexFactoryCalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low' | 'Holiday' | string;
  forecast: string;
  previous: string;
  actual?: string;
}

class ForexFactoryService {
  private newsCache: ForexFactoryArticle[] = [];
  private calendarCache: ForexFactoryCalendarEvent[] = [];
  private lastNewsFetch = 0;
  private lastCalendarFetch = 0;

  async getLatestNews(): Promise<ForexFactoryArticle[]> {
    const now = Date.now();
    if (this.newsCache.length > 0 && now - this.lastNewsFetch < 30000) {
      return this.newsCache;
    }

    try {
      const res = await fetch('/api/forexfactory-news');
      if (res.ok) {
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          this.newsCache = data.articles;
          this.lastNewsFetch = now;
          return this.newsCache;
        }
      }
    } catch (e) {
      console.warn('ForexFactory news fetch error:', e);
    }

    return this.newsCache.length > 0 ? this.newsCache : this.getFallbackNews();
  }

  async getCalendarEvents(): Promise<ForexFactoryCalendarEvent[]> {
    const now = Date.now();
    if (this.calendarCache.length > 0 && now - this.lastCalendarFetch < 60000) {
      return this.calendarCache;
    }

    try {
      const res = await fetch('/api/forexfactory-calendar');
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          this.calendarCache = data.events;
          this.lastCalendarFetch = now;
          return this.calendarCache;
        }
      }
    } catch (e) {
      console.warn('ForexFactory calendar fetch error:', e);
    }

    return this.calendarCache.length > 0 ? this.calendarCache : this.getFallbackCalendar();
  }

  private getFallbackNews(): ForexFactoryArticle[] {
    return [
      {
        id: 'ff-1',
        title: 'Gold Tests All-Time Highs Above $4,280 as Fed Easing Bets Mount',
        url: '#',
        source: 'Global Financial Wire',
        country: 'XAU',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 18,
        category: 'Fundamental Analysis',
        summary:
          'Bullion capitalizes on cooling US inflation readings and safe-haven accumulation as institutional treasury yields compress across the curve.',
        author: 'Market Intelligence Desk',
      },
      {
        id: 'ff-2',
        title: 'EUR/USD Steadies Near 1.0870 Ahead of Critical ECB Rate Decision',
        url: '#',
        source: 'Macro Economic Feed',
        country: 'EUR',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 45,
        category: 'Central Banks',
        summary:
          'The single currency defended its weekly support floor as traders price in a 25 basis point reduction with Lagarde press conference in focus.',
        author: 'Institutional Macro Research',
      },
      {
        id: 'ff-3',
        title: 'GBP/USD Eyes 1.2950 Handle Post Solid UK Employment and Wage Metrics',
        url: '#',
        source: 'Global Technical Desk',
        country: 'GBP',
        impact: 'Medium',
        timestamp: Date.now() - 1000 * 60 * 90,
        category: 'Technical Analysis',
        summary:
          'Sterling posted intraday gains following lower-than-anticipated unemployment claims data and sticky core wage inflation in Great Britain.',
        author: 'Chief Technical Analyst',
      },
      {
        id: 'ff-4',
        title: 'USD/JPY Slips to 152.40 as BOJ Ueda Reiterates Hawkish Tightening Stance',
        url: '#',
        source: 'Asia-Pacific Currency Feed',
        country: 'JPY',
        impact: 'High',
        timestamp: Date.now() - 1000 * 60 * 140,
        category: 'Central Banks',
        summary:
          'Bank of Japan Governor Kazuo Ueda remarked in parliamentary testimony that policy normalisation will continue if economic metrics hit targets.',
        author: 'Currency Strategy Group',
      },
    ];
  }

  private getFallbackCalendar(): ForexFactoryCalendarEvent[] {
    return [
      {
        title: 'CPI m/m (Consumer Price Index)',
        country: 'USD',
        date: new Date().toISOString(),
        impact: 'High',
        forecast: '0.2%',
        previous: '0.2%',
        actual: '0.3%',
      },
      {
        title: 'Core CPI m/m',
        country: 'USD',
        date: new Date().toISOString(),
        impact: 'High',
        forecast: '0.3%',
        previous: '0.2%',
        actual: '0.3%',
      },
      {
        title: 'ECB Monetary Policy Statement',
        country: 'EUR',
        date: new Date(Date.now() + 3600000 * 2).toISOString(),
        impact: 'High',
        forecast: '3.65%',
        previous: '3.90%',
        actual: '',
      },
    ];
  }
}

export const forexFactoryService = new ForexFactoryService();
