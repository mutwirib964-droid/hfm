// Real-time Market Price Fetching and Normalization Service
import { checkInstrumentMarketHours } from '../utils/marketHours';

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
  XAUUSD: { scanner: 'cfd', ticker: 'OANDA:XAUUSD', decimals: 3, pipMultiplier: 10 },
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
  MSFT: { scanner: 'america', ticker: 'NASDAQ:MSFT', decimals: 2, pipMultiplier: 100 },
  AMZN: { scanner: 'america', ticker: 'NASDAQ:AMZN', decimals: 2, pipMultiplier: 100 },
  GOOGL: { scanner: 'america', ticker: 'NASDAQ:GOOGL', decimals: 2, pipMultiplier: 100 },
  META: { scanner: 'america', ticker: 'NASDAQ:META', decimals: 2, pipMultiplier: 100 },
  AMD: { scanner: 'america', ticker: 'NASDAQ:AMD', decimals: 2, pipMultiplier: 100 },
  NFLX: { scanner: 'america', ticker: 'NASDAQ:NFLX', decimals: 2, pipMultiplier: 100 },
  COIN: { scanner: 'america', ticker: 'NASDAQ:COIN', decimals: 2, pipMultiplier: 100 },
  PLTR: { scanner: 'america', ticker: 'NASDAQ:PLTR', decimals: 2, pipMultiplier: 100 },
  BABA: { scanner: 'america', ticker: 'NYSE:BABA', decimals: 2, pipMultiplier: 100 },
  MSTR: { scanner: 'america', ticker: 'NASDAQ:MSTR', decimals: 2, pipMultiplier: 100 },
  DIS: { scanner: 'america', ticker: 'NYSE:DIS', decimals: 2, pipMultiplier: 100 },
  UBER: { scanner: 'america', ticker: 'NYSE:UBER', decimals: 2, pipMultiplier: 100 },
  INTC: { scanner: 'america', ticker: 'NASDAQ:INTC', decimals: 2, pipMultiplier: 100 },
  JPM: { scanner: 'america', ticker: 'NYSE:JPM', decimals: 2, pipMultiplier: 100 },
  V: { scanner: 'america', ticker: 'NYSE:V', decimals: 2, pipMultiplier: 100 },
  WMT: { scanner: 'america', ticker: 'NYSE:WMT', decimals: 2, pipMultiplier: 100 },

  // Commodities & Indices
  COPPER: { scanner: 'cfd', ticker: 'COMEX:HG1!', decimals: 3, pipMultiplier: 1000 },
  UK100: { scanner: 'cfd', ticker: 'INDEX:FTSE', decimals: 2, pipMultiplier: 1 },
  JPN225: { scanner: 'cfd', ticker: 'INDEX:NKY', decimals: 2, pipMultiplier: 1 },
  AUDJPY: { scanner: 'forex', ticker: 'FX:AUDJPY', decimals: 3, pipMultiplier: 100 },

  // Crypto
  BTCUSD: { scanner: 'crypto', ticker: 'BINANCE:BTCUSDT', decimals: 2, pipMultiplier: 1 },
  ETHUSD: { scanner: 'crypto', ticker: 'BINANCE:ETHUSDT', decimals: 2, pipMultiplier: 1 },
  SOLUSD: { scanner: 'crypto', ticker: 'BINANCE:SOLUSDT', decimals: 2, pipMultiplier: 10 },
  XRPUSD: { scanner: 'crypto', ticker: 'BINANCE:XRPUSDT', decimals: 4, pipMultiplier: 10000 },
  BNBUSD: { scanner: 'crypto', ticker: 'BINANCE:BNBUSDT', decimals: 2, pipMultiplier: 10 },
  DOGEUSD: { scanner: 'crypto', ticker: 'BINANCE:DOGEUSDT', decimals: 4, pipMultiplier: 10000 },
  ADAUSD: { scanner: 'crypto', ticker: 'BINANCE:ADAUSDT', decimals: 4, pipMultiplier: 10000 },
  AVAXUSD: { scanner: 'crypto', ticker: 'BINANCE:AVAXUSDT', decimals: 2, pipMultiplier: 10 },
  LINKUSD: { scanner: 'crypto', ticker: 'BINANCE:LINKUSDT', decimals: 2, pipMultiplier: 100 },
  DOTUSD: { scanner: 'crypto', ticker: 'BINANCE:DOTUSDT', decimals: 2, pipMultiplier: 100 },
  NEARUSD: { scanner: 'crypto', ticker: 'BINANCE:NEARUSDT', decimals: 2, pipMultiplier: 100 },
  SUIUSD: { scanner: 'crypto', ticker: 'BINANCE:SUIUSDT', decimals: 2, pipMultiplier: 100 },
};

export class TradingViewPriceService {
  private lastQuotes: Map<string, TVQuote> = new Map();
  private lastSpreads: Map<string, number> = new Map();
  private isFetching = false;
  private lastFetchTime = 0;
  private ws: WebSocket | null = null;
  private listeners: Set<(quotes: Map<string, TVQuote>) => void> = new Set();

  constructor() {
    this.initLiveWebSocket();
  }

  /**
   * Computes a dynamic, smoothly fluctuating spread in [0.15, 1.18] (predominantly 0.18 - 0.96, max 1.20)
   * that changes on every tick so it is never stuck on one static number, and derives exact Bid & Ask.
   */
  public computeDynamicBidAsk(
    symbol: string,
    rawPrice: number,
    decimals: number,
    _pipMultiplier: number
  ): { bid: number; ask: number; spread: number } {
    const mStatus = checkInstrumentMarketHours(symbol);
    if (!mStatus.isOpen) {
      const existing = this.lastQuotes.get(symbol);
      if (existing && existing.bid > 0 && existing.ask > 0) {
        return {
          bid: existing.bid,
          ask: existing.ask,
          spread: existing.spread,
        };
      }
      const staticSpread = Number((0.28 + ((symbol.charCodeAt(0) % 5) * 0.11)).toFixed(2));
      this.lastSpreads.set(symbol, staticSpread);
      const bid = Number(rawPrice.toFixed(decimals));
      let priceGap = staticSpread;
      if (decimals === 5) {
        priceGap = Math.max(0.00001, Number((staticSpread / 10000).toFixed(5)));
      } else if (decimals === 4) {
        priceGap = Math.max(0.0001, Number((staticSpread * 0.001).toFixed(4)));
      } else if (decimals === 3 && symbol.includes('JPY')) {
        priceGap = Math.max(0.001, Number((staticSpread * 0.01).toFixed(3)));
      } else if (decimals === 3) {
        priceGap = symbol === 'XAUUSD' ? staticSpread : Math.max(0.001, Number((staticSpread * 0.01).toFixed(3)));
      }
      const ask = Number((bid + priceGap).toFixed(decimals));
      return { bid, ask, spread: staticSpread };
    }

    const prevSpread = this.lastSpreads.get(symbol) ?? (0.28 + ((symbol.charCodeAt(0) % 5) * 0.11));
    // Random step between -0.14 and +0.14, biased toward 0.22 - 0.92 ("0.something"), strictly capped at 1.20
    const drift = (Math.random() - 0.48) * 0.24;
    let nextSpread = prevSpread + drift;
    if (nextSpread > 0.96 && Math.random() < 0.7) {
      nextSpread -= 0.18;
    }
    if (nextSpread < 0.16) {
      nextSpread = 0.16 + Math.random() * 0.18;
    }
    if (nextSpread > 1.18) {
      nextSpread = 1.18 - Math.random() * 0.22;
    }
    const spread = Number(Math.min(1.2, Math.max(0.15, nextSpread)).toFixed(2));
    this.lastSpreads.set(symbol, spread);

    const bid = Number(rawPrice.toFixed(decimals));
    let priceGap = spread;
    if (decimals === 5) {
      // 5-decimal Forex: 1.0 pip = 0.00010, so spread 0.35 pips = 0.000035 -> rounded to 5 decimals
      priceGap = Math.max(0.00001, Number((spread / 10000).toFixed(5)));
    } else if (decimals === 4) {
      // 4-decimal Crypto (XRP, DOGE, ADA)
      priceGap = Math.max(0.0001, Number((spread * 0.001).toFixed(4)));
    } else if (decimals === 3 && symbol.includes('JPY')) {
      // 3-decimal JPY Forex pairs
      priceGap = Math.max(0.001, Number((spread * 0.01).toFixed(3)));
    } else if (decimals === 3) {
      // 3-decimal commodities (NGAS, COPPER, XAUUSD)
      priceGap = symbol === 'XAUUSD' ? spread : Math.max(0.001, Number((spread * 0.01).toFixed(3)));
    }

    const ask = Number((bid + priceGap).toFixed(decimals));
    return { bid, ask, spread };
  }

  public subscribe(callback: (quotes: Map<string, TVQuote>) => void): () => void {
    this.listeners.add(callback);
    if (this.lastQuotes.size > 0) {
      callback(new Map(this.lastQuotes));
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    if (this.listeners.size === 0) return;
    const snapshot = new Map(this.lastQuotes);
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in price listener:', err);
      }
    });
  }

  private initLiveWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      // Connect to official Binance miniTicker WebSocket stream (real-time ticks matching TradingView BINANCE feeds)
      const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const list = JSON.parse(event.data);
          if (Array.isArray(list)) {
            let hasChanged = false;
            const now = Date.now();
            list.forEach((item: any) => {
              if (!item.s || !item.c) return;
              const sym = item.s.replace('USDT', 'USD');
              const conf = TV_INSTRUMENT_MAP[sym];
              if (conf) {
                const price = parseFloat(item.c);
                if (price > 0) {
                  const { bid, ask, spread } = this.computeDynamicBidAsk(
                    sym,
                    price,
                    conf.decimals,
                    conf.pipMultiplier
                  );

                  this.lastQuotes.set(sym, {
                    symbol: sym,
                    tvTicker: conf.ticker,
                    bid,
                    ask,
                    spread,
                    change24h: 0,
                    high24h: parseFloat(item.h) || ask,
                    low24h: parseFloat(item.l) || bid,
                    timestamp: now,
                  });
                  hasChanged = true;
                }
              }
            });

            if (hasChanged) {
              this.notifyListeners();
            }
          }
        } catch (e) {
          // Ignore parse errors on individual frames
        }
      };

      ws.onclose = () => {
        setTimeout(() => this.initLiveWebSocket(), 3000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (e) {}
      };

      this.ws = ws;
    } catch (e) {
      console.warn('Live WebSocket initialization notice:', e);
    }
  }

  // Fetch quotes from proxy API, TradingView public scanners, and Binance API
  public async fetchRealPrices(): Promise<Map<string, TVQuote>> {
    if (this.isFetching) return this.lastQuotes;
    this.isFetching = true;

    const now = Date.now();

    try {
      let gotProxyQuotes = false;
      // 1. Try our internal server endpoint first (has exact real TradingView quotes)
      try {
        const proxyRes = await fetch('/api/market-prices', { signal: AbortSignal.timeout(1500) });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.quotes && Object.keys(json.quotes).length > 0) {
            gotProxyQuotes = true;
            Object.entries(json.quotes).forEach(([symbol, data]: [string, any]) => {
              const conf = TV_INSTRUMENT_MAP[symbol];
              if (conf && data.bid !== undefined) {
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  symbol,
                  Number(data.bid),
                  conf.decimals,
                  conf.pipMultiplier
                );
                this.lastQuotes.set(symbol, {
                  symbol,
                  tvTicker: conf.ticker,
                  bid,
                  ask,
                  spread,
                  change24h: data.change24h !== undefined ? data.change24h : 0,
                  high24h: data.high24h || Number((ask * 1.008).toFixed(conf.decimals)),
                  low24h: data.low24h || Number((bid * 0.992).toFixed(conf.decimals)),
                  timestamp: now,
                });
              }
            });
            this.notifyListeners();
          }
        }
      } catch (e) {
        // Fall through to client-side direct public feeds
      }

      // 2. Direct client-side fetch to TradingView Scanners if proxy failed or missing key symbols
      if (!gotProxyQuotes || this.lastQuotes.size < 10) {
        try {
          const [cfdData, forexData] = await Promise.allSettled([
            fetch('https://scanner.tradingview.com/cfd/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'OANDA:XAUUSD',
                    'TVC:SILVER',
                    'FX:USOIL',
                    'FX:UKOIL',
                    'OANDA:NATGASUSD',
                    'OANDA:US30USD',
                    'OANDA:DE30EUR',
                    'SP:SPX',
                    'TVC:IXIC',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
            fetch('https://scanner.tradingview.com/forex/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'FX:EURUSD',
                    'FX:GBPUSD',
                    'FX:USDJPY',
                    'FX:USDCHF',
                    'FX:AUDUSD',
                    'FX:USDCAD',
                    'FX:GBPJPY',
                    'FX:NZDUSD',
                    'FX:EURGBP',
                    'FX:EURJPY',
                    'FX:AUDJPY',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
          ]);

          if (cfdData.status === 'fulfilled' && cfdData.value?.data) {
            const cfdMap: Record<string, string> = {
              'OANDA:XAUUSD': 'XAUUSD',
              'TVC:SILVER': 'XAGUSD',
              'FX:USOIL': 'USOIL',
              'FX:UKOIL': 'UKOIL',
              'OANDA:NATGASUSD': 'NGAS',
              'OANDA:US30USD': 'US30',
              'OANDA:DE30EUR': 'GER40',
              'SP:SPX': 'US500',
              'TVC:IXIC': 'NAS100',
            };
            cfdData.value.data.forEach((row: any) => {
              const sym = cfdMap[row.s];
              const conf = sym ? TV_INSTRUMENT_MAP[sym] : null;
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const rawBid = row.d[2];
                const basePrice = rawBid && rawBid > 0 ? rawBid : close;
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  sym,
                  basePrice,
                  conf.decimals,
                  conf.pipMultiplier
                );
                this.lastQuotes.set(sym, {
                  symbol: sym,
                  tvTicker: conf.ticker,
                  bid,
                  ask,
                  spread,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || ask).toFixed(conf.decimals)),
                  low24h: Number((row.d[5] || bid).toFixed(conf.decimals)),
                  timestamp: now,
                });
              }
            });
          }

          if (forexData.status === 'fulfilled' && forexData.value?.data) {
            const forexMap: Record<string, string> = {
              'FX:EURUSD': 'EURUSD',
              'FX:GBPUSD': 'GBPUSD',
              'FX:USDJPY': 'USDJPY',
              'FX:USDCHF': 'USDCHF',
              'FX:AUDUSD': 'AUDUSD',
              'FX:USDCAD': 'USDCAD',
              'FX:GBPJPY': 'GBPJPY',
              'FX:NZDUSD': 'NZDUSD',
              'FX:EURGBP': 'EURGBP',
              'FX:EURJPY': 'EURJPY',
              'FX:AUDJPY': 'AUDJPY',
            };
            forexData.value.data.forEach((row: any) => {
              const sym = forexMap[row.s];
              const conf = sym ? TV_INSTRUMENT_MAP[sym] : null;
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const rawBid = row.d[2];
                const basePrice = rawBid && rawBid > 0 ? rawBid : close;
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  sym,
                  basePrice,
                  conf.decimals,
                  conf.pipMultiplier
                );
                this.lastQuotes.set(sym, {
                  symbol: sym,
                  tvTicker: conf.ticker,
                  bid,
                  ask,
                  spread,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || ask).toFixed(conf.decimals)),
                  low24h: Number((row.d[5] || bid).toFixed(conf.decimals)),
                  timestamp: now,
                });
              }
            });
          }
        } catch (e) {
          // Direct fallback failed
        }
      }

      // 3. Client-side direct public feeds for Crypto 24/7
      try {
        const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT', 'NEARUSDT', 'SUIUSDT'];
        const binanceRes = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(cryptoSymbols))}`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (binanceRes.ok) {
          const items = await binanceRes.json();
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const price = parseFloat(item.price);
              const symbolBase = item.symbol.replace('USDT', 'USD');
              const conf = TV_INSTRUMENT_MAP[symbolBase];
              if (conf && price > 0) {
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  symbolBase,
                  price,
                  conf.decimals,
                  conf.pipMultiplier
                );
                this.lastQuotes.set(symbolBase, {
                  symbol: symbolBase,
                  tvTicker: conf.ticker,
                  bid,
                  ask,
                  spread,
                  change24h: this.lastQuotes.get(symbolBase)?.change24h || 0,
                  high24h: this.lastQuotes.get(symbolBase)?.high24h || Number((price * 1.01).toFixed(conf.decimals)),
                  low24h: this.lastQuotes.get(symbolBase)?.low24h || Number((price * 0.99).toFixed(conf.decimals)),
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
      XAGUSD: 'TVC:SILVER',
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
      MSFT: 'NASDAQ:MSFT',
      AMZN: 'NASDAQ:AMZN',
      GOOGL: 'NASDAQ:GOOGL',
      META: 'NASDAQ:META',
      AMD: 'NASDAQ:AMD',
      NFLX: 'NASDAQ:NFLX',
      COIN: 'NASDAQ:COIN',
      PLTR: 'NASDAQ:PLTR',
      BABA: 'NYSE:BABA',
      MSTR: 'NASDAQ:MSTR',
      DIS: 'NYSE:DIS',
      UBER: 'NYSE:UBER',
      INTC: 'NASDAQ:INTC',
      JPM: 'NYSE:JPM',
      V: 'NYSE:V',
      WMT: 'NYSE:WMT',
      COPPER: 'COMEX:HG1!',
      XPTUSD: 'TVC:PLATINUM',
      UK100: 'INDEX:FTSE',
      JPN225: 'INDEX:NKY',
      AUDJPY: 'FX:AUDJPY',
      XRPUSD: 'BINANCE:XRPUSDT',
      BNBUSD: 'BINANCE:BNBUSDT',
      DOGEUSD: 'BINANCE:DOGEUSDT',
      ADAUSD: 'BINANCE:ADAUSDT',
      AVAXUSD: 'BINANCE:AVAXUSDT',
      LINKUSD: 'BINANCE:LINKUSDT',
      DOTUSD: 'BINANCE:DOTUSDT',
      NEARUSD: 'BINANCE:NEARUSDT',
      SUIUSD: 'BINANCE:SUIUSDT',
    };

    if (directMap[clean]) return directMap[clean];
    const item = TV_INSTRUMENT_MAP[symbol];
    if (item) return item.ticker;
    return `FX:${clean}`;
  }
}

export const tvService = new TradingViewPriceService();
