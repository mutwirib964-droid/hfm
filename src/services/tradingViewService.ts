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
  private isFetching = false;
  private lastFetchTime = 0;

  // Fetch quotes from proxy API, TradingView public scanners, and Binance API
  public async fetchRealPrices(): Promise<Map<string, TVQuote>> {
    if (this.isFetching) return this.lastQuotes;
    this.isFetching = true;

    const now = Date.now();

    try {
      let gotProxyQuotes = false;
      // 1. Try our internal server endpoint first (has exact real TradingView quotes)
      try {
        const proxyRes = await fetch('/api/market-prices', { signal: AbortSignal.timeout(2500) });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.quotes && Object.keys(json.quotes).length > 0) {
            gotProxyQuotes = true;
            Object.entries(json.quotes).forEach(([symbol, data]: [string, any]) => {
              const conf = TV_INSTRUMENT_MAP[symbol];
              if (conf && data.bid !== undefined && data.ask !== undefined) {
                const spreadPips = Math.abs(data.ask - data.bid) * conf.pipMultiplier;
                this.lastQuotes.set(symbol, {
                  symbol,
                  tvTicker: conf.ticker,
                  bid: Number(data.bid.toFixed(conf.decimals)),
                  ask: Number(data.ask.toFixed(conf.decimals)),
                  spread: data.spread !== undefined ? data.spread : Number(spreadPips.toFixed(1)),
                  change24h: data.change24h !== undefined ? data.change24h : 0,
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
                const realPrice = close;
                this.lastQuotes.set(sym, {
                  symbol: sym,
                  tvTicker: conf.ticker,
                  bid: Number(realPrice.toFixed(conf.decimals)),
                  ask: Number(realPrice.toFixed(conf.decimals)),
                  spread: 0,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || realPrice).toFixed(conf.decimals)),
                  low24h: Number((row.d[5] || realPrice).toFixed(conf.decimals)),
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
                const realPrice = close;
                this.lastQuotes.set(sym, {
                  symbol: sym,
                  tvTicker: conf.ticker,
                  bid: Number(realPrice.toFixed(conf.decimals)),
                  ask: Number(realPrice.toFixed(conf.decimals)),
                  spread: 0,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || realPrice).toFixed(conf.decimals)),
                  low24h: Number((row.d[5] || realPrice).toFixed(conf.decimals)),
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
              if (conf && price > 0 && !this.lastQuotes.has(symbolBase)) {
                this.lastQuotes.set(symbolBase, {
                  symbol: symbolBase,
                  tvTicker: conf.ticker,
                  bid: Number(price.toFixed(conf.decimals)),
                  ask: Number(price.toFixed(conf.decimals)),
                  spread: 0,
                  change24h: 0,
                  high24h: Number((price * 1.01).toFixed(conf.decimals)),
                  low24h: Number((price * 0.99).toFixed(conf.decimals)),
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
