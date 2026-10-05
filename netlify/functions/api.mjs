// Netlify Serverless Function handling all /api/* routes in production on Netlify
import WebSocket from 'ws';

const TV_LIVE_SYMBOLS = {
  // Forex
  EURUSD: { scanner: 'forex', ticker: 'FX:EURUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.30, category: 'Forex' },
  GBPUSD: { scanner: 'forex', ticker: 'FX:GBPUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.32, category: 'Forex' },
  USDJPY: { scanner: 'forex', ticker: 'FX:USDJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.30, category: 'Forex' },
  AUDUSD: { scanner: 'forex', ticker: 'FX:AUDUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.30, category: 'Forex' },
  USDCAD: { scanner: 'forex', ticker: 'FX:USDCAD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.35, category: 'Forex' },
  USDCHF: { scanner: 'forex', ticker: 'FX:USDCHF', decimals: 5, pipMultiplier: 10000, baseSpread: 0.32, category: 'Forex' },
  GBPJPY: { scanner: 'forex', ticker: 'FX:GBPJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.48, category: 'Forex' },
  NZDUSD: { scanner: 'forex', ticker: 'FX:NZDUSD', decimals: 5, pipMultiplier: 10000, baseSpread: 0.28, category: 'Forex' },
  EURGBP: { scanner: 'forex', ticker: 'FX:EURGBP', decimals: 5, pipMultiplier: 10000, baseSpread: 0.34, category: 'Forex' },
  EURJPY: { scanner: 'forex', ticker: 'FX:EURJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.44, category: 'Forex' },
  AUDJPY: { scanner: 'forex', ticker: 'FX:AUDJPY', decimals: 3, pipMultiplier: 100, baseSpread: 0.42, category: 'Forex' },

  // Commodities & Metals
  XAUUSD: { scanner: 'cfd', ticker: 'OANDA:XAUUSD', decimals: 3, pipMultiplier: 10, baseSpread: 0.45, category: 'Commodities' },
  XAGUSD: { scanner: 'cfd', ticker: 'TVC:SILVER', decimals: 3, pipMultiplier: 100, baseSpread: 0.32, category: 'Commodities' },
  USOIL: { scanner: 'cfd', ticker: 'FX:USOIL', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Commodities' },
  UKOIL: { scanner: 'cfd', ticker: 'FX:UKOIL', decimals: 2, pipMultiplier: 100, baseSpread: 0.34, category: 'Commodities' },
  NGAS: { scanner: 'cfd', ticker: 'OANDA:NATGASUSD', decimals: 3, pipMultiplier: 1000, baseSpread: 0.30, category: 'Commodities' },
  COPPER: { scanner: 'cfd', ticker: 'COMEX:HG1!', decimals: 3, pipMultiplier: 1000, baseSpread: 0.28, category: 'Commodities' },
  XPTUSD: { scanner: 'cfd', ticker: 'TVC:PLATINUM', decimals: 2, pipMultiplier: 10, baseSpread: 0.55, category: 'Commodities' },

  // Indices
  US500: { scanner: 'cfd', ticker: 'SP:SPX', decimals: 2, pipMultiplier: 10, baseSpread: 0.45, category: 'Indices' },
  NAS100: { scanner: 'cfd', ticker: 'TVC:IXIC', decimals: 2, pipMultiplier: 1, baseSpread: 0.68, category: 'Indices' },
  US30: { scanner: 'cfd', ticker: 'OANDA:US30USD', decimals: 2, pipMultiplier: 1, baseSpread: 0.75, category: 'Indices' },
  GER40: { scanner: 'cfd', ticker: 'OANDA:DE30EUR', decimals: 2, pipMultiplier: 1, baseSpread: 0.65, category: 'Indices' },
  UK100: { scanner: 'cfd', ticker: 'OANDA:UK100GBP', decimals: 2, pipMultiplier: 1, baseSpread: 0.65, category: 'Indices' },
  JPN225: { scanner: 'cfd', ticker: 'INDEX:NKY', decimals: 2, pipMultiplier: 1, baseSpread: 0.78, category: 'Indices' },

  // Stocks
  AAPL: { scanner: 'america', ticker: 'NASDAQ:AAPL', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  NVDA: { scanner: 'america', ticker: 'NASDAQ:NVDA', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  TSLA: { scanner: 'america', ticker: 'NASDAQ:TSLA', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  MSFT: { scanner: 'america', ticker: 'NASDAQ:MSFT', decimals: 2, pipMultiplier: 100, baseSpread: 0.30, category: 'Stocks' },
  AMZN: { scanner: 'america', ticker: 'NASDAQ:AMZN', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  GOOGL: { scanner: 'america', ticker: 'NASDAQ:GOOGL', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  META: { scanner: 'america', ticker: 'NASDAQ:META', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  AMD: { scanner: 'america', ticker: 'NASDAQ:AMD', decimals: 2, pipMultiplier: 100, baseSpread: 0.30, category: 'Stocks' },
  NFLX: { scanner: 'america', ticker: 'NASDAQ:NFLX', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  COIN: { scanner: 'america', ticker: 'NASDAQ:COIN', decimals: 2, pipMultiplier: 100, baseSpread: 0.32, category: 'Stocks' },
  PLTR: { scanner: 'america', ticker: 'NASDAQ:PLTR', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  BABA: { scanner: 'america', ticker: 'NYSE:BABA', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  MSTR: { scanner: 'america', ticker: 'NASDAQ:MSTR', decimals: 2, pipMultiplier: 100, baseSpread: 0.34, category: 'Stocks' },
  DIS: { scanner: 'america', ticker: 'NYSE:DIS', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  UBER: { scanner: 'america', ticker: 'NYSE:UBER', decimals: 2, pipMultiplier: 100, baseSpread: 0.25, category: 'Stocks' },
  INTC: { scanner: 'america', ticker: 'NASDAQ:INTC', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },
  JPM: { scanner: 'america', ticker: 'NYSE:JPM', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  V: { scanner: 'america', ticker: 'NYSE:V', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Stocks' },
  WMT: { scanner: 'america', ticker: 'NASDAQ:WMT', decimals: 2, pipMultiplier: 100, baseSpread: 0.26, category: 'Stocks' },

  // ETFs & Bonds
  SPY: { scanner: 'america', ticker: 'AMEX:SPY', decimals: 2, pipMultiplier: 100, baseSpread: 0.25, category: 'ETFs' },
  XLE: { scanner: 'america', ticker: 'AMEX:XLE', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'ETFs' },
  'EUBUND.F': { scanner: 'cfd', ticker: 'EUREX:FGBL1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },
  'UKGILT.F': { scanner: 'cfd', ticker: 'ICEEUR:R1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },
  'US10YR.F': { scanner: 'cfd', ticker: 'CBOT:ZN1!', decimals: 2, pipMultiplier: 100, baseSpread: 0.28, category: 'Bonds' },

  // Crypto 24/7
  BTCUSD: { scanner: 'crypto', ticker: 'BINANCE:BTCUSDT', decimals: 2, pipMultiplier: 1, baseSpread: 0.48, category: 'Crypto' },
  ETHUSD: { scanner: 'crypto', ticker: 'BINANCE:ETHUSDT', decimals: 2, pipMultiplier: 1, baseSpread: 0.36, category: 'Crypto' },
  SOLUSD: { scanner: 'crypto', ticker: 'BINANCE:SOLUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.26, category: 'Crypto' },
  XRPUSD: { scanner: 'crypto', ticker: 'BINANCE:XRPUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.30, category: 'Crypto' },
  BNBUSD: { scanner: 'crypto', ticker: 'BINANCE:BNBUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.30, category: 'Crypto' },
  DOGEUSD: { scanner: 'crypto', ticker: 'BINANCE:DOGEUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.26, category: 'Crypto' },
  ADAUSD: { scanner: 'crypto', ticker: 'BINANCE:ADAUSDT', decimals: 4, pipMultiplier: 10000, baseSpread: 0.28, category: 'Crypto' },
  AVAXUSD: { scanner: 'crypto', ticker: 'BINANCE:AVAXUSDT', decimals: 2, pipMultiplier: 10, baseSpread: 0.25, category: 'Crypto' },
  LINKUSD: { scanner: 'crypto', ticker: 'BINANCE:LINKUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
  DOTUSD: { scanner: 'crypto', ticker: 'BINANCE:DOTUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.22, category: 'Crypto' },
  NEARUSD: { scanner: 'crypto', ticker: 'BINANCE:NEARUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
  SUIUSD: { scanner: 'crypto', ticker: 'BINANCE:SUIUSDT', decimals: 2, pipMultiplier: 100, baseSpread: 0.24, category: 'Crypto' },
};

const TICKER_TO_SYMBOL = {};
const ALL_TICKERS = [];
Object.entries(TV_LIVE_SYMBOLS).forEach(([sym, cfg]) => {
  TICKER_TO_SYMBOL[cfg.ticker] = sym;
  ALL_TICKERS.push(cfg.ticker);
});

let cachedQuotes = {};
const rawTvFields = {};
let tvWs = null;
let tvSession = null;
let lastWsActivityAt = 0;
const webhookStore = new Map();
let cachedMerchantLookup = { accountId: '', merchantName: '', fetchedAt: 0 };

function computeAlignedBidAsk(symbol, chartPrice, decimals, baseSpread) {
  const spread = Number(Math.min(1.2, Math.max(0.16, baseSpread)).toFixed(2));

  // Anchor bid 1:1 to TradingView's exact chart price (lp) and ask = bid + exact spread so SELL and BUY always move hand-in-hand
  const bid = Number(chartPrice.toFixed(decimals));
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

function updateSymbolFromTv(symbol, raw) {
  const cfg = TV_LIVE_SYMBOLS[symbol];
  if (!cfg) return;
  const lp =
    typeof raw.lp === 'number' && raw.lp > 0
      ? raw.lp
      : typeof raw.bid === 'number' && raw.bid > 0
      ? raw.bid
      : null;
  if (!lp || lp <= 0) return;

  const existing = cachedQuotes[symbol];
  const { bid, ask, spread } = computeAlignedBidAsk(
    symbol,
    lp,
    cfg.decimals,
    cfg.baseSpread
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

  cachedQuotes[symbol] = {
    bid,
    ask,
    close: bid,
    change24h,
    high24h,
    low24h,
    spread,
    timestamp: Date.now(),
  };
}

function sendTvPacket(ws, func, args) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const msg = JSON.stringify({ m: func, p: args });
  ws.send(`~m~${msg.length}~m~${msg}`);
}

/**
 * Persistent TradingView WebSocket stream (`wss://data.tradingview.com/socket.io/websocket`)
 * with `Origin: https://www.tradingview.com` in Node.js — identical to `vite.config.ts` in AI Studio.
 * Keeps subscription open across requests so every live tick updates cachedQuotes continuously.
 */
function pullRealTimeTradingViewWebSocket() {
  return new Promise((resolve) => {
    const now = Date.now();

    // If socket is open and active, drain incoming WebSocket frames on the event loop without unsubscribing
    if (
      tvWs &&
      tvWs.readyState === WebSocket.OPEN &&
      tvSession &&
      Object.keys(cachedQuotes).length >= 15 &&
      now - lastWsActivityAt < 10000
    ) {
      setTimeout(() => resolve(cachedQuotes), 65);
      return;
    }

    // Cold start or stale socket: establish fresh TradingView WebSocket connection
    if (tvWs) {
      try {
        tvWs.removeAllListeners();
        tvWs.close();
      } catch {}
      tvWs = null;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve(cachedQuotes);
    };
    const timeout = setTimeout(finish, 550);

    try {
      const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket?from=chart%2F&type=chart', {
        headers: {
          Origin: 'https://www.tradingview.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      tvWs = ws;
      tvSession = 'qs_vtm_' + Math.random().toString(36).slice(2, 12);

      ws.on('open', () => {
        lastWsActivityAt = Date.now();
        sendTvPacket(ws, 'set_auth_token', ['unauthorized_user_token']);
        sendTvPacket(ws, 'quote_create_session', [tvSession]);
        sendTvPacket(ws, 'quote_set_fields', [
          tvSession,
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
        sendTvPacket(ws, 'quote_add_symbols', [tvSession, ...ALL_TICKERS]);
      });

      ws.on('message', (data) => {
        lastWsActivityAt = Date.now();
        const str = data.toString();
        const frames = str.split(/~m~\d+~m~/).filter(Boolean);
        let updatedCount = 0;

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
                updatedCount++;
              }
            }
          } catch {}
        }

        if (updatedCount > 0 && Object.keys(cachedQuotes).length >= 20) {
          clearTimeout(timeout);
          setTimeout(finish, 45);
        }
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        finish();
      });

      ws.on('close', () => {
        tvWs = null;
        tvSession = null;
        clearTimeout(timeout);
        finish();
      });
    } catch {
      clearTimeout(timeout);
      finish();
    }
  });
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const path = event.path || '';

  // 1. Live Market Prices endpoint (/api/market-prices) powered by real-time TradingView WebSocket
  if (path.includes('market-prices')) {
    try {
      const quotes = await pullRealTimeTradingViewWebSocket();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          timestamp: Date.now(),
          quotes,
        }),
      };
    } catch {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, timestamp: Date.now(), quotes: cachedQuotes }),
      };
    }
  }

  // 2. Supabase Config endpoint (/api/supabase-config)
  if (path.includes('supabase-config')) {
    const url = process.env.VITE_SUPABASE_URL || 'https://seycwqpozegjwpxuewbf.supabase.co';
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        configured: Boolean(url && anonKey),
        url,
        anonKey,
      }),
    };
  }

  // 3. Hashback Config endpoint (/api/hashback-config)
  if (path.includes('hashback-config')) {
    const accountId = (process.env.HASHBACK_ACCOUNT_ID || process.env.VITE_HASHBACK_ACCOUNT_ID || '').trim();
    const apiKey = (process.env.HASHBACK_API_KEY || process.env.VITE_HASHBACK_API_KEY || '').trim();
    const usdKesRate = Number(process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || 0);

    let merchantName = cachedMerchantLookup.merchantName || 'HASHBACK PAYMENT';
    if (accountId) {
      try {
        const res = await fetch(`https://pay.hashback.co.ke/account?account_id=${encodeURIComponent(accountId)}`);
        if (res.ok) {
          const data = await res.json();
          const resolved = String(data?.merchant || data?.account_name || data?.name || '').trim();
          if (resolved) {
            merchantName = resolved;
            cachedMerchantLookup = { accountId, merchantName: resolved, fetchedAt: Date.now() };
          }
        }
      } catch {}
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        usdKesRate: Number.isFinite(usdKesRate) && usdKesRate > 0 ? usdKesRate : 0,
        merchantName,
        configured: Boolean(accountId && apiKey),
      }),
    };
  }

  // 4. Hashback STK Initiation (/api/hashback-stk)
  if (path.includes('hashback-stk')) {
    try {
      const parsed = JSON.parse(event.body || '{}');
      const accountId = (parsed.account_id || process.env.HASHBACK_ACCOUNT_ID || process.env.VITE_HASHBACK_ACCOUNT_ID || '').trim();
      const apiKey = (parsed.api_key || process.env.HASHBACK_API_KEY || process.env.VITE_HASHBACK_API_KEY || '').trim();
      const payload = {
        account_id: accountId,
        api_key: apiKey,
        amount: Math.max(1, Math.round(Number(parsed.amount))),
        msisdn: String(parsed.msisdn || parsed.phone || ''),
        reference: parsed.reference || `VTM-${Date.now()}`,
      };
      const response = await fetch('https://api.hashback.co.ke/initiatestk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return { statusCode: response.status, headers: corsHeaders, body: JSON.stringify(data) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 5. Hashback Transaction Status (/api/hashback-status)
  if (path.includes('hashback-status')) {
    try {
      const parsed = JSON.parse(event.body || '{}');
      const checkoutId = parsed.checkout_id || parsed.checkoutid || parsed.CheckoutRequestID;
      if (webhookStore.has(checkoutId)) {
        const cached = webhookStore.get(checkoutId);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            confirmed: true,
            pending: false,
            failed: false,
            resultCode: '0',
            mpesaReceiptNumber: cached.MpesaReceiptNumber || cached.mpesa_receipt || cached.transaction_id,
            data: cached,
          }),
        };
      }
      const accountId = (parsed.account_id || process.env.HASHBACK_ACCOUNT_ID || process.env.VITE_HASHBACK_ACCOUNT_ID || '').trim();
      const apiKey = (parsed.api_key || process.env.HASHBACK_API_KEY || process.env.VITE_HASHBACK_API_KEY || '').trim();
      const response = await fetch('https://api.hashback.co.ke/transactionstatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, api_key: apiKey, checkoutid: checkoutId, checkout_id: checkoutId }),
      });
      const data = await response.json();
      const rawCode = data.ResultCode !== undefined ? String(data.ResultCode) : undefined;
      const isSuccess = rawCode === '0' || data.status === 'completed' || data.status === 'success';
      const isFailed = rawCode === '1032' || rawCode === '1037' || rawCode === '1' || (rawCode !== undefined && rawCode !== '0');
      const isPending = !isSuccess && !isFailed;
      let receiptNo = data.MpesaReceiptNumber || data.mpesa_receipt;
      if (!receiptNo && data.CallbackMetadata?.Item) {
        const item = data.CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
        if (item) receiptNo = item.Value;
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          confirmed: isSuccess,
          pending: isPending,
          failed: isFailed,
          resultCode: rawCode,
          resultDesc: data.ResultDesc || data.ResponseDescription || '',
          mpesaReceiptNumber: receiptNo,
          data,
        }),
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 6. Webhook Callback (/api/hashback-callback & /api/hashback-webhook)
  if (path.includes('hashback-callback') || path.includes('hashback-webhook')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const checkoutId = body.checkout_id || body.CheckoutRequestID || body.checkoutid;
      if (checkoutId) webhookStore.set(checkoutId, body);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
    } catch {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
  }

  // 7. ForexFactory Calendar (/api/forexfactory-calendar)
  if (path.includes('forexfactory-calendar')) {
    try {
      const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
      if (response.ok) {
        const data = await response.json();
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, source: 'www.forexfactory.com', events: data }),
        };
      }
    } catch {}
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, source: 'www.forexfactory.com', events: [] }),
    };
  }

  // 8. Market News (/api/market-news & /api/forexfactory-news)
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      provider: 'VTM Institutional Intelligence Terminal',
      updatedAt: new Date().toISOString(),
      articles: [],
    }),
  };
}
