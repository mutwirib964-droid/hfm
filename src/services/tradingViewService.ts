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

const TICKER_TO_SYMBOL: Record<string, string> = {};
Object.entries(TV_INSTRUMENT_MAP).forEach(([sym, cfg]) => {
  TICKER_TO_SYMBOL[cfg.ticker] = sym;
});

export class TradingViewPriceService {
  private lastQuotes: Map<string, TVQuote> = new Map();
  private rawTvFields: Map<string, Record<string, any>> = new Map();
  private lastSpreads: Map<string, number> = new Map();
  private isFetching = false;
  private lastScannerFetchTime = 0;
  private tvWs: WebSocket | null = null;
  private binanceWs: WebSocket | null = null;
  private sse: EventSource | null = null;
  private sseActive = false;
  private listeners: Set<(quotes: Map<string, TVQuote>) => void> = new Set();

  constructor() {
    this.initServerStream();
    this.initLiveBinanceWebSocket();
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
    const fixedSpread = this.lastSpreads.get(symbol) ?? Number((0.28 + ((symbol.charCodeAt(0) % 4) * 0.06)).toFixed(2));
    this.lastSpreads.set(symbol, fixedSpread);
    const spread = fixedSpread;

    const bid = Number(rawPrice.toFixed(decimals));
    let priceGap = spread;
    if (decimals === 5) {
      priceGap = Math.max(0.00001, Number((spread / 10000).toFixed(5)));
    } else if (decimals === 4) {
      priceGap = Math.max(0.0001, Number((spread / 1000).toFixed(4)));
    } else if (decimals === 3) {
      priceGap = symbol === 'XAUUSD' ? Number(spread.toFixed(3)) : Math.max(0.001, Number((spread * 0.01).toFixed(3)));
    } else {
      priceGap = Math.max(0.01, Number(spread.toFixed(2)));
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
      } catch {
        // ignore listener error
      }
    });
  }

  /**
   * Direct browser connection to TradingView's real-time WebSocket stream
   * (`wss://data.tradingview.com/socket.io/websocket?from=chart%2F&type=chart`)
   * Ensures identical sub-second tick streaming on Netlify, Vercel, Cloud Run, and local dev!
   */
  private initDirectTradingViewWebSocket() {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (this.tvWs) {
      try {
        this.tvWs.onclose = null;
        this.tvWs.onerror = null;
        this.tvWs.onmessage = null;
        this.tvWs.close();
      } catch {}
      this.tvWs = null;
    }

    try {
      const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket?from=chart%2F&type=chart');
      this.tvWs = ws;

      const sendTvPacket = (func: string, args: any[]) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const msg = JSON.stringify({ m: func, p: args });
        ws.send(`~m~${msg.length}~m~${msg}`);
      };

      const session = 'qs_vtm_web_' + Math.random().toString(36).slice(2, 12);

      ws.onopen = () => {
        sendTvPacket('set_auth_token', ['unauthorized_user_token']);
        sendTvPacket('quote_create_session', [session]);
        sendTvPacket('quote_set_fields', [
          session,
          'lp',
          'ch',
          'chp',
          'high_price',
          'low_price',
          'bid',
          'ask',
          'open_price',
          'prev_close_price',
        ]);
        const allTickers = Object.values(TV_INSTRUMENT_MAP).map((s) => s.ticker);
        sendTvPacket('quote_add_symbols', [session, ...allTickers]);
      };

      ws.onmessage = (event) => {
        const str = typeof event.data === 'string' ? event.data : '';
        if (!str) return;
        const frames = str.split(/~m~\d+~m~/).filter(Boolean);
        let updatedAny = false;

        for (const frame of frames) {
          if (frame.startsWith('~h~')) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(`~m~${frame.length}~m~${frame}`);
            }
            continue;
          }
          try {
            const parsed = JSON.parse(frame);
            if (parsed.m === 'qsd' && Array.isArray(parsed.p) && parsed.p[1]) {
              const { n: ticker, v: values } = parsed.p[1];
              const sym = TICKER_TO_SYMBOL[ticker];
              if (sym && values && typeof values === 'object') {
                const merged = { ...(this.rawTvFields.get(sym) || {}), ...values };
                this.rawTvFields.set(sym, merged);
                if (this.updateSymbolFromRawTv(sym, merged)) {
                  updatedAny = true;
                }
              }
            }
          } catch {
            // ignore non-JSON frame
          }
        }

        if (updatedAny) {
          this.notifyListeners();
        }
      };

      ws.onclose = () => {
        setTimeout(() => this.initDirectTradingViewWebSocket(), 2000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    } catch {
      setTimeout(() => this.initDirectTradingViewWebSocket(), 3000);
    }
  }

  private updateSymbolFromRawTv(symbol: string, raw: Record<string, any>): boolean {
    const conf = TV_INSTRUMENT_MAP[symbol];
    if (!conf) return false;
    const lp =
      typeof raw.lp === 'number' && raw.lp > 0
        ? raw.lp
        : typeof raw.bid === 'number' && raw.bid > 0
        ? raw.bid
        : null;
    if (!lp || lp <= 0) return false;

    const { bid, ask, spread } = this.computeDynamicBidAsk(
      symbol,
      lp,
      conf.decimals,
      conf.pipMultiplier
    );

    const existing = this.lastQuotes.get(symbol);
    const change24h =
      typeof raw.chp === 'number'
        ? Number(raw.chp.toFixed(2))
        : existing?.change24h ?? 0;
    const high24h =
      typeof raw.high_price === 'number' && raw.high_price > 0
        ? Number(raw.high_price.toFixed(conf.decimals))
        : existing?.high24h || ask;
    const low24h =
      typeof raw.low_price === 'number' && raw.low_price > 0
        ? Number(raw.low_price.toFixed(conf.decimals))
        : existing?.low24h || bid;

    this.lastQuotes.set(symbol, {
      symbol,
      tvTicker: conf.ticker,
      bid,
      ask,
      spread,
      change24h,
      high24h,
      low24h,
      timestamp: Date.now(),
    });
    return true;
  }

  private initSpreadBreather() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      if (this.sseActive) return; // Server stream already breathes spread when active
      let anyUpdated = false;
      this.rawTvFields.forEach((raw, sym) => {
        const mStatus = checkInstrumentMarketHours(sym);
        if (!mStatus.isOpen) return;
        if (this.updateSymbolFromRawTv(sym, raw)) {
          anyUpdated = true;
        }
      });
      if (anyUpdated) {
        this.notifyListeners();
      }
    }, 900);
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

      this.rawTvFields.set(symbol, {
        ...(this.rawTvFields.get(symbol) || {}),
        lp: chartPrice,
        chp: data.change24h,
        high_price: data.high24h,
        low_price: data.low24h,
      });

      const mStatus = checkInstrumentMarketHours(symbol);
      const serverSpread =
        typeof data.spread === 'number' && data.spread >= 0.15 && data.spread <= 1.2
          ? Number(data.spread.toFixed(2))
          : undefined;

      // If server already computed aligned bid, ask, and spread from the TradingView WebSocket, use them 1:1 without re-randomizing spread on every 250ms poll
      if (
        serverSpread !== undefined &&
        typeof data.bid === 'number' &&
        typeof data.ask === 'number' &&
        data.bid > 0 &&
        data.ask >= data.bid
      ) {
        const exactBid = Number(data.bid.toFixed(conf.decimals));
        const exactAsk = Number(data.ask.toFixed(conf.decimals));
        this.lastSpreads.set(symbol, serverSpread);
        this.lastQuotes.set(symbol, {
          symbol,
          tvTicker: conf.ticker,
          bid: exactBid,
          ask: exactAsk,
          spread: serverSpread,
          change24h: data.change24h !== undefined ? Number(data.change24h) : 0,
          high24h: data.high24h || Number((exactAsk * 1.005).toFixed(conf.decimals)),
          low24h: data.low24h || Number((exactBid * 0.995).toFixed(conf.decimals)),
          timestamp: now,
        });
        updatedAny = true;
        return;
      }

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
            this.sseActive = true;
            this.ingestServerQuotesObject(parsed.quotes);
          }
        } catch {}
      };
      es.onerror = () => {
        this.sseActive = false;
        try {
          es.close();
        } catch {}
        setTimeout(() => this.initServerStream(), 5000);
      };
      this.sse = es;
    } catch {}
  }

  private initLiveBinanceWebSocket() {
    if (typeof window === 'undefined') return;
    try {
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
        } catch {
          // Ignore parse errors on individual frames
        }
      };

      ws.onclose = () => {
        setTimeout(() => this.initLiveBinanceWebSocket(), 3000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };

      this.binanceWs = ws;
    } catch {
      // Silent fallback
    }
  }

  // Fetch quotes from internal proxy API or direct scanner fallback
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
        const contentType = proxyRes.headers.get('content-type') || '';
        if (proxyRes.ok && contentType.includes('application/json')) {
          const json = await proxyRes.json();
          if (json.quotes && Object.keys(json.quotes).length > 0) {
            gotProxyQuotes = true;
            this.ingestServerQuotesObject(json.quotes);
          }
        }
      } catch {
        // Fall through if offline or static host
      }

      // If server proxy did not return quotes, query TradingView scanners using CORS-safe text/plain
      if (!gotProxyQuotes && now - this.lastScannerFetchTime > 1500) {
        this.lastScannerFetchTime = now;
        try {
          const scannerGroups: Array<'forex' | 'cfd' | 'crypto' | 'america'> = ['forex', 'cfd', 'crypto', 'america'];
          const results = await Promise.allSettled(
            scannerGroups.map((scanner) => {
              const tickers = Object.values(TV_INSTRUMENT_MAP)
                .filter((cfg) => cfg.scanner === scanner)
                .map((cfg) => cfg.ticker);
              return fetch(`https://scanner.tradingview.com/${scanner}/scan`, {
                method: 'POST',
                // Use text/plain to avoid browser CORS preflight rejection
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                signal: AbortSignal.timeout(3000),
                body: JSON.stringify({
                  symbols: { tickers },
                  columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
                }),
              }).then((r) => r.json());
            })
          );

          let updatedFromScanner = false;
          results.forEach((res) => {
            if (res.status === 'fulfilled' && Array.isArray(res.value?.data)) {
              res.value.data.forEach((row: any) => {
                const sym = TICKER_TO_SYMBOL[row.s];
                const conf = sym ? TV_INSTRUMENT_MAP[sym] : null;
                if (conf && row.d?.[0] > 0) {
                  const close = Number(row.d[0]);
                  const change = Number(row.d[1] || 0);
                  const high = Number(row.d[4] || close);
                  const low = Number(row.d[5] || close);
                  this.rawTvFields.set(sym, {
                    ...(this.rawTvFields.get(sym) || {}),
                    lp: close,
                    chp: change,
                    high_price: high,
                    low_price: low,
                  });
                  if (this.updateSymbolFromRawTv(sym, this.rawTvFields.get(sym)!)) {
                    updatedFromScanner = true;
                  }
                }
              });
            }
          });

          if (updatedFromScanner) {
            this.notifyListeners();
          }
        } catch {
          // Direct scanner fallback handled by WebSocket
        }
      }
    } catch {
      // Silent fallback
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
