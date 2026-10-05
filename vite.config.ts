import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import WebSocket from 'ws';

const TV_LIVE_SYMBOLS: Record<
  string,
  { ticker: string; decimals: number; pipMultiplier: number; baseSpread: number; category: string }
> = {
  // Forex
  EURUSD: { ticker: 'FX:EURUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.30, category: 'Forex' },
  GBPUSD: { ticker: 'FX:GBPUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.32, category: 'Forex' },
  USDJPY: { ticker: 'FX:USDJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.30, category: 'Forex' },
  AUDUSD: { ticker: 'FX:AUDUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.30, category: 'Forex' },
  USDCAD: { ticker: 'FX:USDCAD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.35, category: 'Forex' },
  USDCHF: { ticker: 'FX:USDCHF', decimals: 5, pipMultiplier: 10000, baseSpread: 0.32, category: 'Forex' },
  GBPJPY: { ticker: 'FX:GBPJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.48, category: 'Forex' },
  NZDUSD: { ticker: 'FX:NZDUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.28, category: 'Forex' },
  EURGBP: { ticker: 'FX:EURGBP', decimals: 5, pipMultiplier: 10000, baseSpread: 0.34, category: 'Forex' },
  EURJPY: { ticker: 'FX:EURJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.44, category: 'Forex' },
  AUDJPY: { ticker: 'FX:AUDJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.42, category: 'Forex' },

  // Commodities & Metals
  XAUUSD: { ticker: 'OANDA:XAUUSD', decimals: 3, pipMultiplier: 10, baseSpread: 0.45, category: 'Commodities' },
  XAGUSD: { ticker: 'TVC:SILVER', decimals: 3, pipMultiplier: 100, baseSpread: 0.32, category: 'Commodities' },
  USOIL: { ticker: 'FX:USOIL', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Commodities' },
  UKOIL: { ticker: 'FX:UKOIL', decimals: 2, pipMultiplier: 100, baseSpread: 0.34, category: 'Commodities' },
  NGAS: { ticker: 'OANDA:NATGASUSD', decimals: 3, pipMultiplier: 1000, baseSpread: 0.30, category: 'Commodities' },
  COPPER: { ticker: 'COMEX:HG1!', decimals: 3, pipMultiplier: 1000, baseSpread: 0.28, category: 'Commodities' },
  XPTUSD: { ticker: 'TVC:PLATINUM', decimals: 2, pipMultiplier: 10, baseSpread: 0.55, category: 'Commodities' },

  // Indices
  US500: { ticker: 'SP:SPX', decimals: 2, pipMultiplier: 10, baseSpread: 0.45, category: 'Indices' },
  NAS100: { ticker: 'TVC:IXIC', decimals: 2, pipMultiplier: 1, baseSpread: 0.68, category: 'Indices' },
  US30: { ticker: 'OANDA:US30USD', decimals: 2, pipMultiplier: 1, baseSpread: 0.75, category: 'Indices' },
  GER40: { ticker: 'OANDA:DE30EUR', decimals: 2, pipMultiplier: 1, baseSpread: 0.65, category: 'Indices' },
  UK100: { ticker: 'OANDA:UK100GBP', decimals: 2, pipMultiplier: 1, baseSpread: 0.65, category: 'Indices' },
  JPN225: { ticker: 'INDEX:NKY', decimals: 2, pipMultiplier: 1, baseSpread: 0.78, category: 'Indices' },

  // Stocks
  AAPL: { ticker: 'NASDAQ:AAPL', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  NVDA: { ticker: 'NASDAQ:NVDA', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  TSLA: { ticker: 'NASDAQ:TSLA', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  MSFT: { ticker: 'NASDAQ:MSFT', decimals: 2, pipMultiplier: 100, baseSpread: 0.30, category: 'Stocks' },
  AMZN: { ticker: 'NASDAQ:AMZN', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  GOOGL: { ticker: 'NASDAQ:GOOGL', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  META: { ticker: 'NASDAQ:META', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  AMD: { ticker: 'NASDAQ:AMD', decimals: 2, pipMultiplier: 100, baseSpread: 0.30, category: 'Stocks' },
  NFLX: { ticker: 'NASDAQ:NFLX', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  COIN: { ticker: 'NASDAQ:COIN', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  PLTR: { ticker: 'NASDAQ:PLTR', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  BABA: { ticker: 'NYSE:BABA', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  MSTR: { ticker: 'NASDAQ:MSTR', decimals: 2, pipMultiplier: 100, baseSpread: 0.34, category: 'Stocks' },
  DIS: { ticker: 'NYSE:DIS', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  UBER: { ticker: 'NYSE:UBER', decimals: 2, pipMultiplier: 100, baseSpread: 0.25, category: 'Stocks' },
  INTC: { ticker: 'NASDAQ:INTC', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  JPM: { ticker: 'NYSE:JPM', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  V: { ticker: 'NYSE:V', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  WMT: { ticker: 'NASDAQ:WMT', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },

  // ETFs & Bonds
  SPY: { ticker: 'AMEX:SPY', decimals: 2, pipMultiplier: 100, baseSpread: 0.25, category: 'ETFs' },
  XLE: { ticker: 'AMEX:XLE', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'ETFs' },
  'EUBUND.F': { ticker: 'EUREX:FGBL1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },
  'UKGILT.F': { ticker: 'ICEEUR:R1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },
  'US10YR.F': { ticker: 'CBOT:ZN1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },

  // Crypto 24/7
  BTCUSD: { ticker: 'BINANCE:BTCUSDT', decimals: 2, pipMultiplier: 1, baseSpread: 0.48, category: 'Crypto' },
  ETHUSD: { ticker: 'BINANCE:ETHUSDT', decimals: 2, pipMultiplier: 1, baseSpread: 0.36, category: 'Crypto' },
  SOLUSD: { ticker: 'BINANCE:SOLUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.26, category: 'Crypto' },
  XRPUSD: { ticker: 'BINANCE:XRPUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.30, category: 'Crypto' },
  BNBUSD: { ticker: 'BINANCE:BNBUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.30, category: 'Crypto' },
  DOGEUSD: { ticker: 'BINANCE:DOGEUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.26, category: 'Crypto' },
  ADAUSD: { ticker: 'BINANCE:ADAUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.28, category: 'Crypto' },
  AVAXUSD: { ticker: 'BINANCE:AVAXUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.25, category: 'Crypto' },
  LINKUSD: { ticker: 'BINANCE:LINKUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
  DOTUSD: { ticker: 'BINANCE:DOTUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.22, category: 'Crypto' },
  NEARUSD: { ticker: 'BINANCE:NEARUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
  SUIUSD: { ticker: 'BINANCE:SUIUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
};

const TICKER_TO_SYMBOL: Record<string, string> = {};
Object.entries(TV_LIVE_SYMBOLS).forEach(([sym, cfg]) => {
  TICKER_TO_SYMBOL[cfg.ticker] = sym;
});

function isServerInstrumentMarketOpen(symbol: string, category: string): boolean {
  if (category === 'Crypto') return true;
  const now = new Date();
  const utcDay = now.getUTCDay();
  const timeVal = now.getUTCHours() + now.getUTCMinutes() / 60;

  if (category === 'Stocks' || category === 'ETFs') {
    if (utcDay === 6 || utcDay === 0) return false;
    return timeVal >= 13.5 && timeVal < 20.0;
  }
  if (utcDay === 6) return false;
  if (utcDay === 0 && timeVal < 22.0) return false;
  if (utcDay === 5) {
    const closeHour = category === 'Commodities' || category === 'Indices' || category === 'Bonds' ? 21.0 : 22.0;
    if (timeVal >= closeHour) return false;
  }
  if (utcDay >= 1 && utcDay <= 4) {
    if ((category === 'Commodities' || category === 'Indices' || category === 'Bonds') && timeVal >= 21.0 && timeVal < 22.0) {
      return false;
    }
  }
  return true;
}

function computeAlignedBidAsk(
  symbol: string,
  chartPrice: number,
  decimals: number,
  baseSpread: number,
  isOpen: boolean,
  prevSpread?: number
): { bid: number; ask: number; spread: number } {
  let spread = baseSpread;
  if (isOpen) {
    const startSpr = prevSpread && prevSpread >= 0.15 && prevSpread <= 1.2 ? prevSpread : baseSpread;
    let nextSpr = startSpr + (Math.random() - 0.49) * 0.14;
    if (nextSpr > 0.96 && Math.random() < 0.65) nextSpr -= 0.14;
    if (nextSpr < 0.16) nextSpr = 0.18 + Math.random() * 0.12;
    if (nextSpr > 1.18) nextSpr = 1.16 - Math.random() * 0.14;
    spread = Number(Math.min(1.2, Math.max(0.16, nextSpr)).toFixed(2));
  } else {
    spread = Number(Math.min(1.2, Math.max(0.16, baseSpread)).toFixed(2));
  }

  // Anchor bid 1:1 to TradingView's exact chart price (lp) so buttons and chart move hand-in-hand
  const bid = Number(chartPrice.toFixed(decimals));
  let priceGap = spread;

  if (decimals === 5) {
    priceGap = Math.max(0.00001, Number((spread / 10000).toFixed(5)));
  } else if (decimals === 4) {
    priceGap = Math.max(0.0001, Number((spread / 10000).toFixed(4)));
  } else if (decimals === 3) {
    priceGap = symbol === 'XAUUSD' ? Number(spread.toFixed(3)) : Math.max(0.001, Number((spread * 0.01).toFixed(3)));
  } else {
    // 2 decimals
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

function marketPricesPlugin() {
  const liveQuotes: Record<string, any> = {};
  const rawTvFields: Record<string, Record<string, any>> = {};
  const sseClients = new Set<any>();
  let tvWs: WebSocket | null = null;
  let reconnectTimer: any = null;
  let broadcastTimer: any = null;
  let dirtyQuotes = false;

  const scheduleBroadcast = () => {
    dirtyQuotes = true;
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      if (!dirtyQuotes || sseClients.size === 0) return;
      dirtyQuotes = false;
      const payload = `data: ${JSON.stringify({ timestamp: Date.now(), quotes: liveQuotes })}\n\n`;
      sseClients.forEach((clientRes) => {
        try {
          clientRes.write(payload);
        } catch {
          sseClients.delete(clientRes);
        }
      });
    }, 60);
  };

  const updateSymbolFromTv = (symbol: string, raw: Record<string, any>) => {
    const cfg = TV_LIVE_SYMBOLS[symbol];
    if (!cfg) return;
    const lp = typeof raw.lp === 'number' && raw.lp > 0 ? raw.lp : typeof raw.bid === 'number' && raw.bid > 0 ? raw.bid : null;
    if (!lp || lp <= 0) return;

    const isOpen = isServerInstrumentMarketOpen(symbol, cfg.category);
    const existing = liveQuotes[symbol];
    const { bid, ask, spread } = computeAlignedBidAsk(
      symbol,
      lp,
      cfg.decimals,
      cfg.baseSpread,
      isOpen,
      existing?.spread
    );

    const change24h =
      typeof raw.chp === 'number'
        ? Number(raw.chp.toFixed(2))
        : existing?.change24h ?? 0;
    const high24h =
      typeof raw.high_price === 'number' && raw.high_price > 0
        ? Number(raw.high_price.toFixed(cfg.decimals))
        : existing?.high24h || ask;
    const low24h =
      typeof raw.low_price === 'number' && raw.low_price > 0
        ? Number(raw.low_price.toFixed(cfg.decimals))
        : existing?.low24h || bid;

    liveQuotes[symbol] = {
      bid,
      ask,
      close: bid,
      change24h,
      high24h,
      low24h,
      spread,
      timestamp: Date.now(),
    };
    scheduleBroadcast();
  };

  const connectTradingViewWs = () => {
    if (tvWs) {
      try {
        tvWs.removeAllListeners();
        tvWs.close();
      } catch {}
      tvWs = null;
    }

    try {
      const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket?from=chart%2F&type=chart', {
        headers: {
          Origin: 'https://www.tradingview.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      tvWs = ws;

      const sendTvPacket = (func: string, args: any[]) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const msg = JSON.stringify({ m: func, p: args });
        ws.send(`~m~${msg.length}~m~${msg}`);
      };

      const session = 'qs_vtm_' + Math.random().toString(36).slice(2, 12);

      ws.on('open', () => {
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
        const allTickers = Object.values(TV_LIVE_SYMBOLS).map((s) => s.ticker);
        sendTvPacket('quote_add_symbols', [session, ...allTickers]);
      });

      ws.on('message', (data: any) => {
        const str = data.toString();
        const frames = str.split(/~m~\d+~m~/).filter(Boolean);
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
                rawTvFields[sym] = { ...(rawTvFields[sym] || {}), ...values };
                updateSymbolFromTv(sym, rawTvFields[sym]);
              }
            }
          } catch {
            // ignore non-JSON frame
          }
        }
      });

      ws.on('close', () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectTradingViewWs, 1500);
      });

      ws.on('error', () => {
        try {
          ws.close();
        } catch {}
      });
    } catch {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectTradingViewWs, 2000);
    }
  };

  return {
    name: 'market-prices-api',
    configureServer(server: any) {
      // Start persistent TradingView WebSocket only when dev server runs
      connectTradingViewWs();

      // Gentle spread breather for open markets so spread moves naturally while bid stays 100% locked to TradingView lp
      const breatherInterval = setInterval(() => {
        let anyUpdated = false;
        Object.entries(TV_LIVE_SYMBOLS).forEach(([sym, cfg]) => {
          const raw = rawTvFields[sym];
          if (!raw) return;
          const isOpen = isServerInstrumentMarketOpen(sym, cfg.category);
          if (!isOpen) return;
          updateSymbolFromTv(sym, raw);
          anyUpdated = true;
        });
        if (anyUpdated) {
          scheduleBroadcast();
        }
      }, 900);
      breatherInterval.unref?.();

      // Real-time Server-Sent Events stream for zero-lag chart-to-button synchronization
      server.middlewares.use('/api/market-stream', (req: any, res: any) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(`data: ${JSON.stringify({ timestamp: Date.now(), quotes: liveQuotes })}\n\n`);
        sseClients.add(res);
        req.on('close', () => {
          sseClients.delete(res);
        });
      });

      // Instantaneous JSON snapshot endpoint served directly from live TradingView WebSocket memory
      server.middlewares.use('/api/market-prices', (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify({
            success: true,
            timestamp: Date.now(),
            quotes: liveQuotes,
          })
        );
      });

      // ForexFactory Calendar API endpoint
      server.middlewares.use('/api/forexfactory-calendar', async (_req: any, res: any) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
              'Accept': 'application/json',
            },
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, source: 'www.forexfactory.com', events: data }));
            return;
          }
        } catch (e) {
          // Fallback handled below
        }

        // Return fallback ForexFactory calendar
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            source: 'www.forexfactory.com',
            events: [
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
              {
                title: 'Main Refinancing Rate',
                country: 'EUR',
                date: new Date(Date.now() + 3600000 * 3).toISOString(),
                impact: 'High',
                forecast: '3.65%',
                previous: '3.90%',
                actual: '',
              },
              {
                title: 'Claimant Count Change',
                country: 'GBP',
                date: new Date(Date.now() - 3600000 * 5).toISOString(),
                impact: 'High',
                forecast: '20.2K',
                previous: '23.7K',
                actual: '18.5K',
              },
              {
                title: 'BOJ Core CPI y/y',
                country: 'JPY',
                date: new Date(Date.now() + 3600000 * 8).toISOString(),
                impact: 'High',
                forecast: '2.8%',
                previous: '2.7%',
                actual: '',
              },
              {
                title: 'FOMC Meeting Minutes',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 14).toISOString(),
                impact: 'High',
                forecast: '',
                previous: '',
                actual: '',
              },
              {
                title: 'Unemployment Claims',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 20).toISOString(),
                impact: 'High',
                forecast: '228K',
                previous: '230K',
                actual: '',
              },
              {
                title: 'Retail Sales m/m',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 26).toISOString(),
                impact: 'High',
                forecast: '0.4%',
                previous: '1.0%',
                actual: '',
              },
              {
                title: 'Empire State Manufacturing Index',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 28).toISOString(),
                impact: 'Medium',
                forecast: '-4.1',
                previous: '-4.7',
                actual: '',
              },
            ],
          })
        );
      });

      // Institutional Market News API endpoint (source hidden as requested)
      const handleNewsRequest = async (_req: any, res: any) => {
        const sampleNews = [
          {
            id: 'vtm-news-1',
            title: 'Gold Tests All-Time Highs Above $4,350 as Fed Easing Bets Mount',
            url: '#',
            source: 'VTM Macro Dispatch',
            country: 'XAU',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 12,
            category: 'Fundamental Analysis',
            summary:
              'Bullion capitalizes on cooling US inflation readings and safe-haven accumulation as institutional treasury yields compress across the curve.',
            author: 'Institutional Desk',
          },
          {
            id: 'vtm-news-2',
            title: 'EUR/USD Steadies Near 1.1530 Ahead of Critical Central Bank Rate Decision',
            url: '#',
            source: 'Global Macro Feed',
            country: 'EUR',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 35,
            category: 'Central Banks',
            summary:
              'The single currency defended its weekly support floor as traders price in monetary policy paths with high liquidity in the European session.',
            author: 'Senior FX Strategist',
          },
          {
            id: 'vtm-news-3',
            title: 'GBP/USD Eyes 1.3420 Handle Post Solid UK Employment and Wage Metrics',
            url: '#',
            source: 'VTM Quantitative Research',
            country: 'GBP',
            impact: 'Medium',
            timestamp: Date.now() - 1000 * 60 * 75,
            category: 'Technical Analysis',
            summary:
              'Sterling posted intraday gains following lower-than-anticipated unemployment claims data and sticky core wage inflation in Great Britain.',
            author: 'Market Analysis Group',
          },
          {
            id: 'vtm-news-4',
            title: 'USD/JPY Consolidates Near 148.50 as Asian Central Banks Signal Yield Vigilance',
            url: '#',
            source: 'Asia-Pacific Market Desk',
            country: 'JPY',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 110,
            category: 'Central Banks',
            summary:
              'Cross-currency flows tightened in Tokyo as sovereign debt volatility subsided, providing steady bid support around major technical pivot zones.',
            author: 'Macro Strategist',
          },
          {
            id: 'vtm-news-5',
            title: 'Crude Oil Advances to $82.50 Amid Strategic Energy Stockpile Rebalancing',
            url: '#',
            source: 'Commodities & Energy Terminal',
            country: 'OIL',
            impact: 'Medium',
            timestamp: Date.now() - 1000 * 60 * 180,
            category: 'Commodities',
            summary:
              'WTI and Brent crude futures ticked higher following reports of steady global demand metrics and constrained refinery inventories.',
            author: 'Energy Research Group',
          },
          {
            id: 'vtm-news-6',
            title: 'Bitcoin Holds Robust Ground Above $89,000 as Spot ETF Accumulation Expands',
            url: '#',
            source: 'Digital Asset Intelligence',
            country: 'BTC',
            impact: 'Low',
            timestamp: Date.now() - 1000 * 60 * 240,
            category: 'Crypto Assets',
            summary:
              'Digital asset markets experienced another net positive inflow day driven by institutional spot ETFs and systematic macro funds.',
            author: 'Quant Analyst',
          },
        ];

        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            provider: 'VTM Institutional Intelligence Terminal',
            updatedAt: new Date().toISOString(),
            articles: sampleNews,
          })
        );
      };

      server.middlewares.use('/api/market-news', handleNewsRequest);
      server.middlewares.use('/api/forexfactory-news', handleNewsRequest);
    },
  };
}

function hashbackStkPlugin() {
  const hashbackConfigFile = path.resolve(__dirname, '.hashback-config.json');
  let cachedMerchantLookup: { accountId: string; merchantName: string; fetchedAt: number } = {
    accountId: '',
    merchantName: '',
    fetchedAt: 0,
  };

  const getRuntimeHashbackConfig = () => {
    let savedConfig: { accountId?: string; apiKey?: string; usdKesRate?: number; merchantName?: string } = {};
    try {
      if (fs.existsSync(hashbackConfigFile)) {
        savedConfig = JSON.parse(fs.readFileSync(hashbackConfigFile, 'utf-8') || '{}');
      }
    } catch {
      // ignore read error
    }

    const accountId = (
      process.env.HASHBACK_ACCOUNT_ID ||
      process.env.VITE_HASHBACK_ACCOUNT_ID ||
      savedConfig.accountId ||
      ''
    ).trim();

    const apiKey = (
      process.env.HASHBACK_API_KEY ||
      process.env.VITE_HASHBACK_API_KEY ||
      savedConfig.apiKey ||
      ''
    ).trim();

    const rawRate = Number(
      process.env.USD_KES_RATE ||
      process.env.VITE_USD_KES_RATE ||
      savedConfig.usdKesRate ||
      0
    );
    const usdKesRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 0;

    return {
      accountId,
      apiKey,
      usdKesRate,
      merchantName: savedConfig.merchantName || '',
      configured: Boolean(accountId && apiKey),
    };
  };

  const resolveMerchantAccountName = async (accountId: string, fallbackName?: string): Promise<string> => {
    const cleanAcc = (accountId || '').trim();
    if (!cleanAcc) return fallbackName || 'HASHBACK PAYMENT';

    // Use cached merchant name if same accountId and fetched within last 5 minutes
    if (
      cachedMerchantLookup.accountId === cleanAcc &&
      cachedMerchantLookup.merchantName &&
      Date.now() - cachedMerchantLookup.fetchedAt < 300000
    ) {
      return cachedMerchantLookup.merchantName;
    }

    try {
      const res = await fetch(
        `https://pay.hashback.co.ke/account?account_id=${encodeURIComponent(cleanAcc)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const resolved = String(data?.merchant || data?.account_name || data?.name || '').trim();
        if (resolved) {
          cachedMerchantLookup = {
            accountId: cleanAcc,
            merchantName: resolved,
            fetchedAt: Date.now(),
          };
          return resolved;
        }
      }
    } catch {
      // ignore network error and fall back to cached or saved name
    }

    return cachedMerchantLookup.merchantName || fallbackName || 'HASHBACK PAYMENT';
  };

  // In-memory store for webhook callbacks received from Hashback
  const webhookStore = new Map<string, any>();

  const handleConfigRequest = (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let bodyStr = '';
      req.on('data', (chunk: any) => {
        bodyStr += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(bodyStr || '{}');
          const current = getRuntimeHashbackConfig();
          const nextAccountId = (parsed.accountId ?? parsed.account_id ?? current.accountId ?? '').trim();
          const nextApiKey = (parsed.apiKey ?? parsed.api_key ?? current.apiKey ?? '').trim();
          const nextUsdKesRate = Number(parsed.usdKesRate ?? parsed.usd_kes_rate ?? current.usdKesRate ?? 0);
          const resolvedMerchant = await resolveMerchantAccountName(nextAccountId, current.merchantName);

          const next = {
            accountId: nextAccountId,
            apiKey: nextApiKey,
            usdKesRate: nextUsdKesRate,
            merchantName: resolvedMerchant,
            updatedAt: new Date().toISOString(),
          };
          fs.writeFileSync(hashbackConfigFile, JSON.stringify(next, null, 2), 'utf-8');
          if (next.accountId) {
            process.env.HASHBACK_ACCOUNT_ID = next.accountId;
            process.env.VITE_HASHBACK_ACCOUNT_ID = next.accountId;
          }
          if (next.apiKey) {
            process.env.HASHBACK_API_KEY = next.apiKey;
            process.env.VITE_HASHBACK_API_KEY = next.apiKey;
          }
          if (next.usdKesRate > 0) {
            process.env.USD_KES_RATE = String(next.usdKesRate);
            process.env.VITE_USD_KES_RATE = String(next.usdKesRate);
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          // Never expose accountId or apiKey in the HTTP response
          res.end(
            JSON.stringify({
              success: true,
              usdKesRate: next.usdKesRate,
              merchantName: resolvedMerchant,
              configured: Boolean(next.accountId && next.apiKey),
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save HashBack config' }));
        }
      });
      return;
    }

    (async () => {
      const cfg = getRuntimeHashbackConfig();
      const merchantName = await resolveMerchantAccountName(cfg.accountId, cfg.merchantName);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 200;
      // Never expose sensitive accountId or apiKey to client
      res.end(
        JSON.stringify({
          usdKesRate: cfg.usdKesRate,
          merchantName,
          configured: cfg.configured,
        })
      );
    })();
  };

  const handleStkRequest = async (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const runtimeCfg = getRuntimeHashbackConfig();
        const payload = {
          account_id: parsed.account_id || runtimeCfg.accountId,
          api_key: parsed.api_key || runtimeCfg.apiKey,
          amount: Math.max(1, Math.round(Number(parsed.amount))),
          msisdn: String(parsed.msisdn || parsed.phone || ''),
          reference: parsed.reference || `VTM-${Date.now()}`,
        };

        const response = await fetch('https://api.hashback.co.ke/initiatestk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });

        const data = await response.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = response.status;
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message || 'Internal proxy error' }));
      }
    });
  };

  const handleStatusRequest = async (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const checkoutId = parsed.checkout_id || parsed.checkoutid || parsed.CheckoutRequestID;
        if (!checkoutId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'checkout_id is required' }));
          return;
        }

        // 1. Check if we already received a webhook for this checkoutId
        if (webhookStore.has(checkoutId)) {
          const cached = webhookStore.get(checkoutId);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              confirmed: true,
              pending: false,
              failed: false,
              source: 'webhook',
              resultCode: '0',
              mpesaReceiptNumber: cached.MpesaReceiptNumber || cached.mpesa_receipt || cached.transaction_id,
              resultDesc: cached.ResultDesc || 'Payment confirmed by Hashback webhook.',
              data: cached,
            })
          );
          return;
        }

        // 2. Query Hashback transactionstatus endpoint directly
        const runtimeCfg = getRuntimeHashbackConfig();
        const payload = {
          account_id: parsed.account_id || runtimeCfg.accountId,
          api_key: parsed.api_key || runtimeCfg.apiKey,
          checkoutid: checkoutId,
          checkout_id: checkoutId,
        };

        const response = await fetch('https://api.hashback.co.ke/transactionstatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(6500),
        });

        const data = await response.json();

        // Safaricom Daraja & Hashback ResultCode interpretation:
        // ResultCode 0 = Success
        // ResultCode 1032 = Cancelled by user
        // ResultCode 1037 = Timeout (user phone off or no PIN entered)
        // ResultCode 1 = Insufficient funds
        // Undefined / empty ResultCode = Still pending customer PIN entry
        const rawCode = data.ResultCode !== undefined ? String(data.ResultCode) : undefined;
        const isSuccess = rawCode === '0' || data.status === 'completed' || data.status === 'success';
        const isFailed = rawCode === '1032' || rawCode === '1037' || rawCode === '1' || (rawCode !== undefined && rawCode !== '0');
        const isPending = !isSuccess && !isFailed;

        let receiptNo = data.MpesaReceiptNumber || data.mpesa_receipt;
        if (!receiptNo && data.CallbackMetadata?.Item) {
          const item = data.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber');
          if (item) receiptNo = item.Value;
        }

        if (isSuccess) {
          webhookStore.set(checkoutId, { ...data, MpesaReceiptNumber: receiptNo });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            confirmed: isSuccess,
            pending: isPending,
            failed: isFailed,
            resultCode: rawCode,
            resultDesc: data.ResultDesc || data.ResponseDescription || (isPending ? 'Waiting for M-Pesa PIN entry on phone...' : ''),
            mpesaReceiptNumber: receiptNo,
            data,
          })
        );
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message || 'Internal proxy error' }));
      }
    });
  };

  const handleWebhookCallback = async (req: any, res: any) => {
    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const checkoutId = body.checkout_id || body.CheckoutRequestID || body.checkoutid;
        if (checkoutId) {
          webhookStore.set(checkoutId, body);
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Callback received' }));
      } catch {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
  };

  return {
    name: 'hashback-stk-api',
    configureServer(server: any) {
      server.middlewares.use('/api/hashback-config', handleConfigRequest);
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/hashback-config', handleConfigRequest);
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
  };
}

function supabaseConfigPlugin() {
  const configFile = path.resolve(__dirname, '.supabase-config.json');

  const getConfig = () => {
    // 1. Process environment
    if (
      process.env.VITE_SUPABASE_URL &&
      process.env.VITE_SUPABASE_ANON_KEY &&
      !process.env.VITE_SUPABASE_URL.includes('your-project.supabase.co')
    ) {
      return {
        configured: true,
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      };
    }
    // 2. Persistent file .supabase-config.json
    try {
      if (fs.existsSync(configFile)) {
        const raw = fs.readFileSync(configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey) {
          process.env.VITE_SUPABASE_URL = parsed.url;
          process.env.VITE_SUPABASE_ANON_KEY = parsed.anonKey;
          return { configured: true, url: parsed.url, anonKey: parsed.anonKey };
        }
      }
    } catch {
      // ignore
    }
    return { configured: false };
  };

  const handleGetConfig = (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cfg = getConfig();
    res.end(JSON.stringify(cfg));
  };

  const handleSaveConfig = (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const url = (parsed.url || '').trim().replace(/\/+$/, '');
        const anonKey = (parsed.anonKey || '').trim();

        if (!url || !anonKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'url and anonKey are required' }));
          return;
        }

        fs.writeFileSync(
          configFile,
          JSON.stringify({ url, anonKey, updatedAt: new Date().toISOString() }, null, 2),
          'utf-8'
        );
        process.env.VITE_SUPABASE_URL = url;
        process.env.VITE_SUPABASE_ANON_KEY = anonKey;

        // Also update .env file if present
        try {
          const envFile = path.resolve(__dirname, '.env');
          let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
          if (envContent.includes('VITE_SUPABASE_URL=')) {
            envContent = envContent.replace(/VITE_SUPABASE_URL=.*/g, `VITE_SUPABASE_URL="${url}"`);
          } else {
            envContent += `\nVITE_SUPABASE_URL="${url}"\n`;
          }
          if (envContent.includes('VITE_SUPABASE_ANON_KEY=')) {
            envContent = envContent.replace(/VITE_SUPABASE_ANON_KEY=.*/g, `VITE_SUPABASE_ANON_KEY="${anonKey}"`);
          } else {
            envContent += `VITE_SUPABASE_ANON_KEY="${anonKey}"\n`;
          }
          fs.writeFileSync(envFile, envContent, 'utf-8');
        } catch {
          // ignore env write error
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            message: 'Supabase configuration saved on server for all devices',
            url,
            anonKey,
          })
        );
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save config' }));
      }
    });
  };

  return {
    name: 'supabase-config-api',
    configureServer(server: any) {
      server.middlewares.use('/api/supabase-config', (req: any, res: any) => {
        if (req.method === 'POST') {
          handleSaveConfig(req, res);
        } else {
          handleGetConfig(req, res);
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/supabase-config', (req: any, res: any) => {
        if (req.method === 'POST') {
          handleSaveConfig(req, res);
        } else {
          handleGetConfig(req, res);
        }
      });
    },
  };
}

function safeWsPlugin() {
  return {
    name: 'safe-ws-shim',
    enforce: 'pre' as const,
    configureServer(server: any) {
      if (!server.ws) {
        server.ws = {
          send: () => {},
          on: () => {},
          off: () => {},
          close: () => {},
          clients: new Set(),
        };
      } else if (!server.ws.send) {
        server.ws.send = () => {};
      }
    },
  };
}

export default defineConfig(() => {
  let bakedSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
  let bakedSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  try {
    const sbCfgPath = path.resolve(__dirname, '.supabase-config.json');
    if (fs.existsSync(sbCfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(sbCfgPath, 'utf-8') || '{}');
      if (!bakedSupabaseUrl && parsed.url) bakedSupabaseUrl = parsed.url;
      if (!bakedSupabaseAnonKey && parsed.anonKey) bakedSupabaseAnonKey = parsed.anonKey;
    }
  } catch {
    // ignore
  }

  return {
    plugins: [
      safeWsPlugin(),
      react(),
      tailwindcss(),
      marketPricesPlugin(),
      hashbackStkPlugin(),
      supabaseConfigPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'favicon.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'VTM Markets WebTrader',
          short_name: 'VTM Markets',
          description: 'Global Multi-Asset CFD Broker with Raw Spreads from 0.0 Pips, High-Speed STP Execution, and Advanced WebTrader Terminal.',
          theme_color: '#0B0E14',
          background_color: '#0B0E14',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'any',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(bakedSupabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(bakedSupabaseAnonKey),
      'import.meta.env.VITE_USD_KES_RATE': JSON.stringify(
        process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || ''
      ),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
