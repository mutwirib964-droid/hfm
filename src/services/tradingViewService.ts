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

// Complete mapping of app instruments (60 symbols) matching TradingView Widget Embed tickers 1:1
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
  AUDJPY: { scanner: 'forex', ticker: 'FX:AUDJPY', decimals: 3, pipMultiplier: 100 },

  // Metals & Commodities
  XAUUSD: { scanner: 'cfd', ticker: 'OANDA:XAUUSD', decimals: 3, pipMultiplier: 10 },
  XAGUSD: { scanner: 'cfd', ticker: 'TVC:SILVER', decimals: 3, pipMultiplier: 100 },
  XPTUSD: { scanner: 'cfd', ticker: 'TVC:PLATINUM', decimals: 2, pipMultiplier: 10 },

  // Energies & Commodities
  USOIL: { scanner: 'cfd', ticker: 'FX:USOIL', decimals: 2, pipMultiplier: 100 },
  UKOIL: { scanner: 'cfd', ticker: 'FX:UKOIL', decimals: 2, pipMultiplier: 100 },
  NGAS: { scanner: 'cfd', ticker: 'OANDA:NATGASUSD', decimals: 3, pipMultiplier: 1000 },
  COPPER: { scanner: 'cfd', ticker: 'COMEX:HG1!', decimals: 3, pipMultiplier: 1000 },

  // Indices
  US500: { scanner: 'cfd', ticker: 'SP:SPX', decimals: 2, pipMultiplier: 10 },
  NAS100: { scanner: 'cfd', ticker: 'TVC:IXIC', decimals: 2, pipMultiplier: 1 },
  US30: { scanner: 'cfd', ticker: 'OANDA:US30USD', decimals: 2, pipMultiplier: 1 },
  GER40: { scanner: 'cfd', ticker: 'OANDA:DE30EUR', decimals: 2, pipMultiplier: 1 },
  UK100: { scanner: 'cfd', ticker: 'OANDA:UK100GBP', decimals: 2, pipMultiplier: 1 },
  JPN225: { scanner: 'cfd', ticker: 'INDEX:NKY', decimals: 2, pipMultiplier: 1 },

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
  WMT: { scanner: 'america', ticker: 'NASDAQ:WMT', decimals: 2, pipMultiplier: 100 },

  // ETFs & Bonds
  SPY: { scanner: 'america', ticker: 'AMEX:SPY', decimals: 2, pipMultiplier: 100 },
  XLE: { scanner: 'america', ticker: 'AMEX:XLE', decimals: 2, pipMultiplier: 100 },
  'EUBUND.F': { scanner: 'cfd', ticker: 'EUREX:FGBL1!', decimals: 2, pipMultiplier: 100 },
  'UKGILT.F': { scanner: 'cfd', ticker: 'ICEEUR:R1!', decimals: 2, pipMultiplier: 100 },
  'US10YR.F': { scanner: 'cfd', ticker: 'CBOT:ZN1!', decimals: 2, pipMultiplier: 100 },

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
  private sse: EventSource | null = null;
  private listeners: Set<(quotes: Map<string, TVQuote>) => void> = new Set();

  constructor() {
    this.initServerStream();
    this.initLiveWebSocket();
  }

  /**
   * Computes a dynamic, smoothly fluctuating spread in [0.16, 1.18] (max 1.20)
   * and derives exact Bid & Ask strictly anchored 1:1 to the TradingView chart price (rawPrice).
   * When the market is closed, Bid is locked to the exact TradingView closing price and spread is static.
   */
  public computeDynamicBidAsk(
    symbol: string,
    rawPrice: number,
    decimals: number,
    _pipMultiplier: number
  ): { bid: number; ask: number; spread: number } {
    const mStatus = checkInstrumentMarketHours(symbol);
    let spread: number;

    if (!mStatus.isOpen) {
      const staticSpread = Number((0.28 + ((symbol.charCodeAt(0) % 4) * 0.08)).toFixed(2));
      this.lastSpreads.set(symbol, staticSpread);
      spread = staticSpread;
    } else {
      const prevSpread = this.lastSpreads.get(symbol) ?? (0.28 + ((symbol.charCodeAt(0) % 4) * 0.08));
      const drift = (Math.random() - 0.48) * 0.16;
      let nextSpread = prevSpread + drift;
      if (nextSpread > 0.96 && Math.random() < 0.7) {
        nextSpread -= 0.16;
      }
      if (nextSpread < 0.16) {
        nextSpread = 0.16 + Math.random() * 0.14;
      }
      if (nextSpread > 1.18) {
        nextSpread = 1.18 - Math.random() * 0.16;
      }
      spread = Number(Math.min(1.2, Math.max(0.16, nextSpread)).toFixed(2));
      this.lastSpreads.set(symbol, spread);
    }

    const bid = Number(rawPrice.toFixed(decimals));
    let priceGap = spread;
    if (decimals === 5) {
      priceGap = Math.max(0.00001, Number((spread / 10000).toFixed(5)));
    } else if (decimals === 4) {
      priceGap = Math.max(0.0001, Number((spread / 10000).toFixed(4)));
    } else if (decimals === 3) {
      priceGap = symbol === 'XAUUSD' ? Number(spread.toFixed(3)) : Math.max(0.001, Number((spread * 0.01).toFixed(3)));
    } else {
      if (bid < 250) {
        priceGap = Math.max(0.01, Number((spread * 0.04).toFixed(2)));
      } else if (bid < 1000) {
        priceGap = Math.max(0.01, Number((spread * 0.1).toFixed(2)));
      } else {
        priceGap = Math.max(0.01, Number(spread.toFixed(2)));
      }
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

  private ingestServerQuotesObject(quotesObj: Record<string, any>) {
    if (!quotesObj || typeof quotesObj !== 'object') return;
    const now = Date.now();
    let updatedAny = false;
    Object.entries(quotesObj).forEach(([symbol, data]: [string, any]) => {
      const conf = TV_INSTRUMENT_MAP[symbol];
      if (!conf || data?.bid === undefined) return;
      const chartPrice = Number(data.close ?? data.bid);
      if (!(chartPrice > 0)) return;

      const mStatus = checkInstrumentMarketHours(symbol);
      const serverSpread =
        typeof data.spread === 'number' && data.spread >= 0.15 && data.spread <= 1.2
          ? Number(data.spread.toFixed(2))
          : undefined;

      const { bid, ask, spread } = this.computeDynamicBidAsk(
        symbol,
        chartPrice,
        conf.decimals,
        conf.pipMultiplier
      );

      const finalSpread = !mStatus.isOpen ? spread : serverSpread ?? spread;
      let priceGap = finalSpread;
      if (conf.decimals === 5) {
        priceGap = Math.max(0.00001, Number((finalSpread / 10000).toFixed(5)));
      } else if (conf.decimals === 4) {
        priceGap = Math.max(0.0001, Number((finalSpread / 10000).toFixed(4)));
      } else if (conf.decimals === 3) {
        priceGap = symbol === 'XAUUSD' ? Number(finalSpread.toFixed(3)) : Math.max(0.001, Number((finalSpread * 0.01).toFixed(3)));
      } else {
        if (bid < 250) {
          priceGap = Math.max(0.01, Number((finalSpread * 0.04).toFixed(2)));
        } else if (bid < 1000) {
          priceGap = Math.max(0.01, Number((finalSpread * 0.1).toFixed(2)));
        } else {
          priceGap = Math.max(0.01, Number(finalSpread.toFixed(2)));
        }
      }
      const finalAsk = Number((bid + priceGap).toFixed(conf.decimals));

      this.lastQuotes.set(symbol, {
        symbol,
        tvTicker: conf.ticker,
        bid,
        ask: finalAsk,
        spread: finalSpread,
        change24h: data.change24h !== undefined ? Number(data.change24h) : 0,
        high24h: data.high24h || Number((finalAsk * 1.005).toFixed(conf.decimals)),
        low24h: data.low24h || Number((bid * 0.995).toFixed(conf.decimals)),
        timestamp: now,
      });
      updatedAny = true;
    });

    if (updatedAny) {
      this.notifyListeners();
    }
  }

  private initServerStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      const es = new EventSource('/api/market-stream');
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.quotes) {
            this.ingestServerQuotesObject(parsed.quotes);
          }
        } catch {}
      };
      es.onerror = () => {
        try {
          es.close();
        } catch {}
        setTimeout(() => this.initServerStream(), 2000);
      };
      this.sse = es;
    } catch {}
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
                  const existing = this.lastQuotes.get(sym);
                  const openPrice = parseFloat(item.o);
                  const computedChg =
                    openPrice > 0
                      ? Number((((price - openPrice) / openPrice) * 100).toFixed(2))
                      : existing?.change24h || 0;

                  this.lastQuotes.set(sym, {
                    symbol: sym,
                    tvTicker: conf.ticker,
                    bid,
                    ask,
                    spread,
                    change24h: computedChg,
                    high24h: parseFloat(item.h) || existing?.high24h || ask,
                    low24h: parseFloat(item.l) || existing?.low24h || bid,
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

  // Fetch quotes from internal real-time TradingView WebSocket proxy API
  public async fetchRealPrices(): Promise<Map<string, TVQuote>> {
    if (this.isFetching) return this.lastQuotes;
    this.isFetching = true;

    const now = Date.now();

    try {
      let gotProxyQuotes = false;
      try {
        const proxyRes = await fetch('/api/market-prices', {
          cache: 'no-store',
          signal: AbortSignal.timeout(1500),
        });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.quotes && Object.keys(json.quotes).length > 0) {
            gotProxyQuotes = true;
            this.ingestServerQuotesObject(json.quotes);
          }
        }
      } catch (e) {
        // Fall through if offline
      }

      // Only hit public scanner as a slow backup if server proxy is completely unreachable
      if (!gotProxyQuotes && now - this.lastFetchTime > 5000) {
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
                    'OANDA:UK100GBP',
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
              'OANDA:UK100GBP': 'UK100',
              'SP:SPX': 'US500',
              'TVC:IXIC': 'NAS100',
            };
            cfdData.value.data.forEach((row: any) => {
              const sym = cfdMap[row.s];
              const conf = sym ? TV_INSTRUMENT_MAP[sym] : null;
              if (conf && row.d?.[0] > 0) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  sym,
                  close,
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
              if (conf && row.d?.[0] > 0) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const { bid, ask, spread } = this.computeDynamicBidAsk(
                  sym,
                  close,
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
          this.notifyListeners();
        } catch (e) {
          // Direct fallback failed
        }
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
    const item = TV_INSTRUMENT_MAP[symbol];
    if (item) return item.ticker;

    const clean = symbol.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
    if (TV_INSTRUMENT_MAP[clean]) return TV_INSTRUMENT_MAP[clean].ticker;

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
      AUDJPY: 'FX:AUDJPY',
      XAUUSD: 'OANDA:XAUUSD',
      XAGUSD: 'TVC:SILVER',
      USOIL: 'FX:USOIL',
      UKOIL: 'FX:UKOIL',
      NGAS: 'OANDA:NATGASUSD',
      COPPER: 'COMEX:HG1!',
      XPTUSD: 'TVC:PLATINUM',
      US30: 'OANDA:US30USD',
      NAS100: 'TVC:IXIC',
      US500: 'SP:SPX',
      GER40: 'OANDA:DE30EUR',
      UK100: 'OANDA:UK100GBP',
      JPN225: 'INDEX:NKY',
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
      WMT: 'NASDAQ:WMT',
      SPY: 'AMEX:SPY',
      XLE: 'AMEX:XLE',
      'EUBUND.F': 'EUREX:FGBL1!',
      EUBUNDF: 'EUREX:FGBL1!',
      'UKGILT.F': 'ICEEUR:R1!',
      UKGILTF: 'ICEEUR:R1!',
      'US10YR.F': 'CBOT:ZN1!',
      US10YRF: 'CBOT:ZN1!',
      BTCUSD: 'BINANCE:BTCUSDT',
      ETHUSD: 'BINANCE:ETHUSDT',
      SOLUSD: 'BINANCE:SOLUSDT',
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
    return `FX:${clean}`;
  }
}

export const tvService = new TradingViewPriceService();
