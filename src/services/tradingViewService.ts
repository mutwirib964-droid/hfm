// Real-time Market Price Fetching and Normalization Service

export interface TVQuote {
  symbol: string;
  tvTicker: string;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

// Complete mapping of app instruments
export const TV_INSTRUMENT_MAP: Record<
  string,
  { scanner: 'forex' | 'cfd' | 'crypto' | 'america'; ticker: string; decimals: number; pipMultiplier: number }
> = {
  // Forex
  EURUSD: { scanner: 'forex', ticker: 'FX:EURUSD', decimals: 5, pipMultiplier: 10000 },
  GBPUSD: { scanner: 'forex', ticker: 'FX:GBPUSD', decimals: 5, pipMultiplier: 10000 },
  USDJPY: { scanner: 'forex', ticker: 'FX:USDJPY', decimals: 3, pipMultiplier: 100 },
  AUDUSD: { scanner: 'forex', ticker: 'FX:AUDUSD', decimals: 5, pipMultiplier: 10000 },
  USDCAD: { scanner: 'forex', ticker: 'FX:USDCAD', decimals: 5, pipMultiplier: 10000 },
  USDCHF: { scanner: 'forex', ticker: 'FX:USDCHF', decimals: 5, pipMultiplier: 10000 },
  GBPJPY: { scanner: 'forex', ticker: 'FX:GBPJPY', decimals: 3, pipMultiplier: 100 },
  NZDUSD: { scanner: 'forex', ticker: 'FX:NZDUSD', decimals: 5, pipMultiplier: 10000 },
  EURGBP: { scanner: 'forex', ticker: 'FX:EURGBP', decimals: 5, pipMultiplier: 10000 },
  EURJPY: { scanner: 'forex', ticker: 'FX:EURJPY', decimals: 3, pipMultiplier: 100 },

  // Metals & Commodities
  XAUUSD: { scanner: 'cfd', ticker: 'OANDA:XAUUSD', decimals: 2, pipMultiplier: 10 },
  XAGUSD: { scanner: 'cfd', ticker: 'TVC:SILVER', decimals: 2, pipMultiplier: 100 },
  XPTUSD: { scanner: 'cfd', ticker: 'TVC:PLATINUM', decimals: 2, pipMultiplier: 10 },

  // Energies
  USOIL: { scanner: 'cfd', ticker: 'FX:USOIL', decimals: 2, pipMultiplier: 100 },
  UKOIL: { scanner: 'cfd', ticker: 'FX:UKOIL', decimals: 2, pipMultiplier: 100 },
  NGAS: { scanner: 'cfd', ticker: 'OANDA:NATGASUSD', decimals: 3, pipMultiplier: 1000 },

  // Indices
  US500: { scanner: 'cfd', ticker: 'SP:SPX', decimals: 2, pipMultiplier: 10 },
  NAS100: { scanner: 'cfd', ticker: 'TVC:IXIC', decimals: 2, pipMultiplier: 1 },
  US30: { scanner: 'cfd', ticker: 'OANDA:US30USD', decimals: 2, pipMultiplier: 1 },
  GER40: { scanner: 'cfd', ticker: 'OANDA:DE30EUR', decimals: 2, pipMultiplier: 1 },

  // Stocks
  AAPL: { scanner: 'america', ticker: 'NASDAQ:AAPL', decimals: 2, pipMultiplier: 100 },
  NVDA: { scanner: 'america', ticker: 'NASDAQ:NVDA', decimals: 2, pipMultiplier: 100 },
  TSLA: { scanner: 'america', ticker: 'NASDAQ:TSLA', decimals: 2, pipMultiplier: 100 },

  // Crypto
  BTCUSD: { scanner: 'crypto', ticker: 'BINANCE:BTCUSDT', decimals: 2, pipMultiplier: 1 },
  ETHUSD: { scanner: 'crypto', ticker: 'BINANCE:ETHUSDT', decimals: 2, pipMultiplier: 1 },
  SOLUSD: { scanner: 'crypto', ticker: 'BINANCE:SOLUSDT', decimals: 2, pipMultiplier: 10 },
};

export class TradingViewPriceService {
  private lastQuotes: Map<string, TVQuote> = new Map();
  private isFetching = false;
  private lastFetchTime = 0;

  // Fetch quotes from proxy API, Binance public API, and direct scanners
  public async fetchRealPrices(): Promise<Map<string, TVQuote>> {
    if (this.isFetching) return this.lastQuotes;
    this.isFetching = true;

    const now = Date.now();

    try {
      // 1. Try our internal server endpoint first (has exact real TradingView quotes)
      try {
        const proxyRes = await fetch('/api/market-prices', { signal: AbortSignal.timeout(3500) });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.quotes && Object.keys(json.quotes).length > 0) {
            Object.entries(json.quotes).forEach(([symbol, data]: [string, any]) => {
              const conf = TV_INSTRUMENT_MAP[symbol];
              if (conf && data.bid && data.ask) {
                const spreadPips = Math.abs(data.ask - data.bid) * conf.pipMultiplier;
                this.lastQuotes.set(symbol, {
                  symbol,
                  tvTicker: conf.ticker,
                  bid: Number(data.bid.toFixed(conf.decimals)),
                  ask: Number(data.ask.toFixed(conf.decimals)),
                  spread: data.spread !== undefined ? data.spread : Number(spreadPips.toFixed(1)),
                  change24h: data.change24h !== undefined ? data.change24h : 0.1,
                  high24h: data.high24h || Number((data.ask * 1.008).toFixed(conf.decimals)),
                  low24h: data.low24h || Number((data.bid * 0.992).toFixed(conf.decimals)),
                  timestamp: now,
                });
              }
            });
          }
        }
      } catch (e) {
        // Fall through to client-side direct public feeds
      }

      // 2. Client-side direct public feeds for Crypto only
      try {
        const binanceRes = await fetch(
          'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D',
          { signal: AbortSignal.timeout(3000) }
        );
        if (binanceRes.ok) {
          const items = await binanceRes.json();
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const price = parseFloat(item.price);
              if (item.symbol === 'BTCUSDT' && price > 10000 && !this.lastQuotes.has('BTCUSD')) {
                const conf = TV_INSTRUMENT_MAP['BTCUSD'];
                this.lastQuotes.set('BTCUSD', {
                  symbol: 'BTCUSD',
                  tvTicker: conf.ticker,
                  bid: Number((price - 1.5).toFixed(2)),
                  ask: Number((price + 1.5).toFixed(2)),
                  spread: 3.0,
                  change24h: 0.5,
                  high24h: Number((price * 1.015).toFixed(2)),
                  low24h: Number((price * 0.985).toFixed(2)),
                  timestamp: now,
                });
              } else if (item.symbol === 'ETHUSDT' && price > 500 && !this.lastQuotes.has('ETHUSD')) {
                const conf = TV_INSTRUMENT_MAP['ETHUSD'];
                this.lastQuotes.set('ETHUSD', {
                  symbol: 'ETHUSD',
                  tvTicker: conf.ticker,
                  bid: Number((price - 0.25).toFixed(2)),
                  ask: Number((price + 0.25).toFixed(2)),
                  spread: 0.5,
                  change24h: 0.4,
                  high24h: Number((price * 1.018).toFixed(2)),
                  low24h: Number((price * 0.982).toFixed(2)),
                  timestamp: now,
                });
              } else if (item.symbol === 'SOLUSDT' && price > 10 && !this.lastQuotes.has('SOLUSD')) {
                const conf = TV_INSTRUMENT_MAP['SOLUSD'];
                this.lastQuotes.set('SOLUSD', {
                  symbol: 'SOLUSD',
                  tvTicker: conf.ticker,
                  bid: Number((price - 0.03).toFixed(2)),
                  ask: Number((price + 0.03).toFixed(2)),
                  spread: 0.06,
                  change24h: 0.6,
                  high24h: Number((price * 1.025).toFixed(2)),
                  low24h: Number((price * 0.975).toFixed(2)),
                  timestamp: now,
                });
              }
            });
          }
        }
      } catch (e) {
        // Continue
      }

      this.lastFetchTime = now;
    } catch (err) {
      console.warn('Real price service warning:', err);
    } finally {
      this.isFetching = false;
    }

    return this.lastQuotes;
  }

  public static getTVSymbolForEmbed(symbol: string): string {
    const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const directMap: Record<string, string> = {
      EURUSD: 'FX:EURUSD',
      GBPUSD: 'FX:GBPUSD',
      USDJPY: 'FX:USDJPY',
      AUDUSD: 'FX:AUDUSD',
      USDCAD: 'FX:USDCAD',
      USDCHF: 'FX:USDCHF',
      GBPJPY: 'FX:GBPJPY',
      NZDUSD: 'FX:NZDUSD',
      EURGBP: 'FX:EURGBP',
      EURJPY: 'FX:EURJPY',
      XAUUSD: 'OANDA:XAUUSD',
      XAGUSD: 'OANDA:XAGUSD',
      USOIL: 'FX:USOIL',
      UKOIL: 'FX:UKOIL',
      NGAS: 'OANDA:NATGASUSD',
      US30: 'OANDA:US30USD',
      NAS100: 'TVC:IXIC',
      US500: 'SP:SPX',
      GER40: 'OANDA:DE30EUR',
      BTCUSD: 'BINANCE:BTCUSDT',
      ETHUSD: 'BINANCE:ETHUSDT',
      SOLUSD: 'BINANCE:SOLUSDT',
      AAPL: 'NASDAQ:AAPL',
      NVDA: 'NASDAQ:NVDA',
      TSLA: 'NASDAQ:TSLA',
    };

    if (directMap[clean]) return directMap[clean];
    const item = TV_INSTRUMENT_MAP[symbol];
    if (item) return item.ticker;
    return `FX:${clean}`;
  }
}

export const tvService = new TradingViewPriceService();
