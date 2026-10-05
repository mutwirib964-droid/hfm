// Netlify Serverless Function handling all /api/* routes in production on Netlify
import WebSocket from 'ws';
import crypto from 'crypto';

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
const syncedMarketerWithdrawalIds = new Set();
let cachedMerchantLookup = { accountId: '', merchantName: '', fetchedAt: 0 };

const DEFAULT_ONEAPP_WITHDRAWAL_URL = 'https://shadow-app-engine.lovable.app/api/public/vtmmarkets/withdrawal';
const FALLBACK_ONEAPP_WITHDRAWAL_URL = 'https://shadow-app-engine.lovable.app/api/public/preocryptofx/withdrawal';
const ONEAPP_ORIGIN = 'https://shadow-app-engine.lovable.app';
const MAX_ONEAPP_MPESA_BALANCE_KES = 500000;

function toSerovalNode(val, refs = new Map()) {
  if (val === null) return { t: 2, s: 0 };
  if (val === undefined) return { t: 2, s: 1 };
  if (typeof val === 'boolean') return { t: 2, s: val ? 2 : 3 };
  if (typeof val === 'number') return { t: 0, s: val };
  if (typeof val === 'string') return { t: 1, s: val };
  if (Array.isArray(val)) {
    const id = refs.size;
    refs.set(val, id);
    return {
      t: 9,
      i: id,
      a: val.map((item) => toSerovalNode(item, refs)),
      o: 0,
    };
  }
  if (typeof val === 'object') {
    const id = refs.size;
    refs.set(val, id);
    const entries = Object.entries(val);
    return {
      t: 10,
      i: id,
      p: {
        k: entries.map(([k]) => k),
        v: entries.map(([, v]) => toSerovalNode(v, refs)),
      },
      o: 0,
    };
  }
  return { t: 2, s: 1 };
}

function fromSerovalNode(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.t === 0) return Number(node.s);
  if (node.t === 1) return String(node.s);
  if (node.t === 2) {
    if (node.s === 0) return null;
    if (node.s === 1) return undefined;
    if (node.s === 2) return true;
    if (node.s === 3) return false;
    return null;
  }
  if (node.t === 9 && Array.isArray(node.a)) {
    return node.a.map(fromSerovalNode);
  }
  if ((node.t === 10 || node.t === 11) && node.p && Array.isArray(node.p.k) && Array.isArray(node.p.v)) {
    const obj = {};
    node.p.k.forEach((key, idx) => {
      obj[key] = fromSerovalNode(node.p.v[idx]);
    });
    return obj;
  }
  return null;
}

function parseKesNumber(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val ?? '0')
    .replace(/^[A-Za-z.\s]+/, '')
    .replace(/,/g, '')
    .trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : 0;
}

function formatKesBalance(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildPhoneVariants(rawPhone) {
  const trimmed = String(rawPhone || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  const variants = new Set();
  if (trimmed) variants.add(trimmed);
  if (digits) {
    variants.add(digits);
    const last9 = digits.length >= 9 ? digits.slice(-9) : '';
    if (last9) {
      variants.add(`0${last9}`);
      variants.add(`254${last9}`);
      variants.add(`+254${last9}`);
      variants.add(`+254 ${last9}`);
    }
  }
  return Array.from(variants).filter(Boolean);
}

async function callOneAppServerFn(fnId, dataPayload) {
  try {
    const body = JSON.stringify({ t: toSerovalNode({ data: dataPayload }), f: 63, m: [] });
    const res = await fetch(`${ONEAPP_ORIGIN}/_serverFn/${fnId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tsr-serverFn': 'true',
        Origin: ONEAPP_ORIGIN,
        Referer: `${ONEAPP_ORIGIN}/`,
      },
      body,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = fromSerovalNode(json);
    return parsed ? parsed.result : null;
  } catch {
    return null;
  }
}

async function fetchVtmUserRecord(cleanEmail) {
  if (!cleanEmail) return null;
  const sbUrl = process.env.VITE_SUPABASE_URL || 'https://seycwqpozegjwpxuewbf.supabase.co';
  const sbKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';
  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/vtm_registered_users?email=ilike.${encodeURIComponent(
        cleanEmail
      )}&select=email,name,phone_number,password_hash,role&limit=1`,
      {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0];
    const rawHash = String(row.password_hash || '');
    const storedPassword = rawHash.startsWith('uid:') && rawHash.includes('|')
      ? rawHash.slice(rawHash.indexOf('|') + 1)
      : rawHash;
    return {
      email: String(row.email || cleanEmail).trim().toLowerCase(),
      name: String(row.name || '').trim(),
      phone: String(row.phone_number || '').trim(),
      password: storedPassword,
      role: String(row.role || 'normal'),
    };
  } catch {
    return null;
  }
}

async function resolveOneAppAccountState(cleanEmail, rawPhone, passwordToLink, marketerName, allowCreate = true) {
  const phoneCandidates = buildPhoneVariants(rawPhone);
  if (phoneCandidates.length === 0) {
    phoneCandidates.push('0712345678');
  }

  let matchedPhone = phoneCandidates[0];
  let existingSettings = null;

  for (const candidate of phoneCandidates) {
    const res = await callOneAppServerFn(
      '9df9652da79c7ccc337ce62c64dcd11f1800a8eb6e0bd13747650358f67fe4e8',
      { email: cleanEmail, phone: candidate }
    );
    if (res && res.settings) {
      matchedPhone = candidate;
      existingSettings = res.settings;
      break;
    }
  }

  const effectivePassword =
    passwordToLink && String(passwordToLink).trim().length >= 4
      ? String(passwordToLink).trim()
      : 'Jos134ka2';

  // If the account does not have settings on OneApp yet, create/link it on OneApp with the exact same email, phone, and password
  if (!existingSettings && allowCreate && cleanEmail && matchedPhone) {
    const keRes = await callOneAppServerFn(
      '1e12bc8882f2d7cd8c8c72a58340bc31d9176827778cfd3ff8e61c30ad47147b',
      {
        email: cleanEmail,
        phone: matchedPhone,
        password: effectivePassword,
      }
    );
    if (keRes && keRes.settings) {
      existingSettings = keRes.settings;
    }
  }

  const etRes = await callOneAppServerFn(
    '112061c5fb3f0ddda87bfc4b09714fea9af06264bcecd56e6b3246c01777d9de',
    { email: cleanEmail, phone: matchedPhone }
  );
  const withdrawalTotal = etRes && typeof etRes.total === 'number' ? etRes.total : 0;

  const initials =
    (marketerName || cleanEmail || 'JM')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'JM';

  const baseSettings = existingSettings || {
    greeting: 'Good morning,',
    name: marketerName || cleanEmail.split('@')[0] || 'Marketer',
    initials,
    mpesaBalance: 'Ksh 0.00',
    fuliza: 'Ksh 900.00',
    airtime: 'Ksh. 4.83',
    bonga: '8 Points',
    appliedWithdrawals: String(withdrawalTotal),
  };

  const rawMpesaNum = parseKesNumber(baseSettings.mpesaBalance || '0');
  const prevAppliedNum = parseKesNumber(baseSettings.appliedWithdrawals || '0');
  const unappliedDelta = existingSettings ? Math.max(0, withdrawalTotal - prevAppliedNum) : 0;
  const currentWebsiteBalanceKes = Number((rawMpesaNum + unappliedDelta).toFixed(2));

  return {
    matchedPhone,
    existingSettings,
    baseSettings,
    withdrawalTotal,
    currentWebsiteBalanceKes,
  };
}

async function dispatchMarketerWithdrawalToOneApp(body) {
  const cleanEmail = String(body.email || body.user_email || body.marketer_email || '')
    .trim()
    .toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'Account email is required to link with OneApp.' };
  }

  // Look up user in VTM Supabase to verify matching email & password and resolve phone/name
  const vtmUser = await fetchVtmUserRecord(cleanEmail);
  const suppliedPassword = String(body.password || body.accountPassword || '').trim();

  if (vtmUser && vtmUser.password && suppliedPassword && suppliedPassword !== vtmUser.password) {
    return {
      success: false,
      error: 'Account email and password do not match your registered VTM Markets account.',
    };
  }

  const verifiedPassword = suppliedPassword || vtmUser?.password || 'Jos134ka2';
  const cleanPhone = String(
    body.phone || body.phone_number || body.msisdn || body.marketer_phone || vtmUser?.phone || ''
  ).trim();
  const marketerName = String(
    body.name || body.user_name || vtmUser?.name || cleanEmail.split('@')[0] || 'Marketer'
  ).trim();

  const rawRate = Number(
    process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || body.rate || body.exchange_rate || 125.56
  );
  const usdKesRate = Number.isFinite(rawRate) && rawRate > 1 ? rawRate : 125.56;
  const resolvedRole = String(vtmUser?.role || body.role || 'marketer').toLowerCase();
  const isMarketerOrAdmin = resolvedRole === 'marketer' || resolvedRole === 'admin';

  // Preview / account balance inspection mode for WalletTab M-PESA withdrawal modal
  if (body.action === 'preview' || body.preview === true) {
    const state = await resolveOneAppAccountState(cleanEmail, cleanPhone, verifiedPassword, marketerName, isMarketerOrAdmin);
    return {
      success: true,
      preview: true,
      accountLinked: Boolean(state.existingSettings || isMarketerOrAdmin),
      email: cleanEmail,
      phone: state.matchedPhone,
      name: state.baseSettings.name || marketerName,
      currentMpesaBalanceKes: state.currentWebsiteBalanceKes,
      currentMpesaBalanceFormatted: formatKesBalance(state.currentWebsiteBalanceKes),
      maxMpesaBalanceKes: MAX_ONEAPP_MPESA_BALANCE_KES,
      remainingCapacityKes: Math.max(0, Number((MAX_ONEAPP_MPESA_BALANCE_KES - state.currentWebsiteBalanceKes).toFixed(2))),
      rate: usdKesRate,
    };
  }

  if (!isMarketerOrAdmin) {
    return {
      success: false,
      skipped: true,
      reason: 'Only Marketer accounts can withdraw and reflect on OneApp.',
    };
  }

  const method = String(body.method || body.payment_method || 'Safaricom M-PESA B2C').trim();
  // Only M-PESA withdrawals are sent to OneApp
  if (!/mpesa|m-pesa|b2c/i.test(method)) {
    return {
      success: false,
      skipped: true,
      reason: 'Only M-PESA withdrawals are synced to OneApp.',
    };
  }

  const exactAmountUsd = Number(Number(body.amountUsd ?? body.amount_usd ?? body.amount ?? 0).toFixed(2));
  const rawKes = Number(body.amountKes ?? body.amount_kes ?? 0);
  const exactAmountKes =
    Number.isFinite(rawKes) && rawKes > 0
      ? Number(rawKes.toFixed(2))
      : Number((exactAmountUsd * usdKesRate).toFixed(2));

  const reference = String(body.reference || body.id || `B2C${Date.now()}`).trim();
  const withdrawalId = String(body.id || reference).trim();
  const occurredAtIso = body.occurredAt || body.occurred_at || new Date().toISOString();
  const sourceAccount = String(body.sourceAccount || body.source_account || 'VTM Wallet').trim();

  // 1. Inspect current money shown on OneApp website & ensure account is linked with matching email + password
  const beforeState = await resolveOneAppAccountState(
    cleanEmail,
    cleanPhone,
    verifiedPassword,
    marketerName,
    true
  );
  const matchedPhone = beforeState.matchedPhone;
  const beforeTotal = beforeState.withdrawalTotal;
  const previousWebsiteBalanceKes = beforeState.currentWebsiteBalanceKes;
  const projectedWebsiteBalanceKes = Number((previousWebsiteBalanceKes + exactAmountKes).toFixed(2));

  // Enforce strict KES 500,000 maximum SIM holding capacity on OneApp
  if (projectedWebsiteBalanceKes > MAX_ONEAPP_MPESA_BALANCE_KES) {
    return {
      success: false,
      simLimitExceeded: true,
      maxMpesaBalanceKes: MAX_ONEAPP_MPESA_BALANCE_KES,
      currentMpesaBalanceKes: previousWebsiteBalanceKes,
      requestedAmountKes: exactAmountKes,
      error: 'Customer wallet capacity exceeded',
    };
  }

  const syncedRefs = Array.isArray(beforeState.baseSettings.vtmSyncedRefs)
    ? beforeState.baseSettings.vtmSyncedRefs
    : [];
  const dedupeKey = `${cleanEmail}:${withdrawalId}:${reference}`;

  if (syncedMarketerWithdrawalIds.has(dedupeKey) || (reference && syncedRefs.includes(reference))) {
    syncedMarketerWithdrawalIds.add(dedupeKey);
    return {
      success: true,
      alreadySynced: true,
      email: cleanEmail,
      phone: matchedPhone,
      amountUsd: exactAmountUsd,
      amountKes: exactAmountKes,
      previousMpesaBalance: formatKesBalance(previousWebsiteBalanceKes),
      updatedMpesaBalance: formatKesBalance(previousWebsiteBalanceKes),
      reference,
    };
  }
  syncedMarketerWithdrawalIds.add(dedupeKey);

  const secret = (
    process.env.VTMMARKETS_WEBHOOK_SECRET ||
    process.env.VITE_VTMMARKETS_WEBHOOK_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.ONEAPP_WEBHOOK_SECRET ||
    ''
  ).trim();

  const candidateUrls = Array.from(
    new Set(
      [
        (process.env.WITHDRAWAL_WEBHOOK_URL || '').trim(),
        (process.env.ONEAPP_SYNC_URL || '').trim(),
        (process.env.VITE_WITHDRAWAL_WEBHOOK_URL || '').trim(),
        (process.env.VITE_ONEAPP_SYNC_URL || '').trim(),
        DEFAULT_ONEAPP_WITHDRAWAL_URL,
        FALLBACK_ONEAPP_WITHDRAWAL_URL,
      ].filter((u) => u && u.startsWith('http'))
    )
  );

  const webhookPayload = {
    id: withdrawalId,
    withdrawal_id: withdrawalId,
    transaction_id: withdrawalId,
    reference,
    email: cleanEmail,
    user_email: cleanEmail,
    marketer_email: cleanEmail,
    phone: matchedPhone,
    phone_number: matchedPhone,
    msisdn: matchedPhone,
    marketer_phone: matchedPhone,
    name: marketerName,
    amount: exactAmountKes,
    amount_kes: exactAmountKes,
    amountKes: exactAmountKes,
    amount_usd: exactAmountUsd,
    amountUsd: exactAmountUsd,
    currency: 'KES',
    rate: usdKesRate,
    exchange_rate: usdKesRate,
    method,
    payment_method: method,
    source_account: sourceAccount,
    sourceAccount,
    role: 'marketer',
    status: 'completed',
    platform: 'vtmmarkets',
    source: 'vtmmarkets',
    occurred_at: occurredAtIso,
    created_at: occurredAtIso,
    timestamp: Date.now(),
  };

  const rawBody = JSON.stringify(webhookPayload);
  const hmacHex = secret ? crypto.createHmac('sha256', secret).update(rawBody).digest('hex') : '';
  const hmacBase64 = secret ? crypto.createHmac('sha256', secret).update(rawBody).digest('base64') : '';
  const ts = String(Math.floor(Date.now() / 1000));

  const headerVariants = secret
    ? [
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-signature': hmacHex,
          'x-webhook-signature': hmacHex,
          'x-vtmmarkets-signature': hmacHex,
          'x-preocryptofx-signature': hmacHex,
          'x-hub-signature-256': `sha256=${hmacHex}`,
          'x-webhook-secret': secret,
          'x-vtmmarkets-secret': secret,
          'x-api-key': secret,
          Authorization: `Bearer ${secret}`,
        },
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-signature': secret,
          'x-webhook-signature': secret,
          'x-vtmmarkets-signature': secret,
          'x-preocryptofx-signature': secret,
          'x-webhook-secret': secret,
          'x-vtmmarkets-secret': secret,
          'x-api-key': secret,
          Authorization: `Bearer ${secret}`,
        },
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-signature': `sha256=${hmacHex}`,
          'x-webhook-signature': `sha256=${hmacHex}`,
          'x-vtmmarkets-signature': `sha256=${hmacHex}`,
          'x-preocryptofx-signature': hmacBase64,
          'x-timestamp': ts,
          'x-webhook-secret': secret,
          Authorization: `Bearer ${secret}`,
        },
      ]
    : [
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      ];

  let webhookDelivered = false;
  let deliveredUrl = '';
  let lastStatus = 0;

  for (const targetUrl of candidateUrls) {
    for (const headers of headerVariants) {
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: rawBody,
        });
        lastStatus = res.status;
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();
        const isHtml404 = text.includes('<!DOCTYPE html>') || text.includes('<html');
        if (res.ok && !isHtml404 && (contentType.includes('json') || text.startsWith('{'))) {
          webhookDelivered = true;
          deliveredUrl = targetUrl;
          break;
        }
        if (res.status === 404 || isHtml404) {
          break;
        }
      } catch {
        break;
      }
    }
    if (webhookDelivered) break;
  }

  // 2. Calculate exact new website M-PESA balance (previous website balance + exact withdrawn KES amount), strictly capped at KES 500,000, and save immediately to OneApp
  let oneAppBalanceSynced = false;
  const newWebsiteBalanceKes = Math.min(
    MAX_ONEAPP_MPESA_BALANCE_KES,
    Number((previousWebsiteBalanceKes + exactAmountKes).toFixed(2))
  );
  const updatedMpesaBalance = formatKesBalance(newWebsiteBalanceKes);

  if (cleanEmail && matchedPhone && exactAmountKes > 0) {
    const afterData = await callOneAppServerFn(
      '112061c5fb3f0ddda87bfc4b09714fea9af06264bcecd56e6b3246c01777d9de',
      {
        email: cleanEmail,
        phone: matchedPhone,
      }
    );
    const afterTotal = afterData && typeof afterData.total === 'number' ? afterData.total : beforeTotal;
    const prevApplied = parseKesNumber(beforeState.baseSettings.appliedWithdrawals || '0');
    const safeAppliedTotal = Math.max(prevApplied, beforeTotal, afterTotal);
    const nextSyncedRefs = [reference, ...syncedRefs.filter((r) => r !== reference)].slice(0, 100);

    const nextSettings = {
      ...beforeState.baseSettings,
      mpesaBalance: updatedMpesaBalance,
      appliedWithdrawals: String(safeAppliedTotal),
      vtmSyncedRefs: nextSyncedRefs,
    };

    const saveRes = await callOneAppServerFn(
      'cbcc924041242dd11e1ad5000167f6d3fdcc014f84f3fe5dca969bb9361d5d65',
      {
        email: cleanEmail,
        phone: matchedPhone,
        settings: nextSettings,
      }
    );
    oneAppBalanceSynced = Boolean(saveRes && saveRes.ok);
  }

  return {
    success: true,
    webhookDelivered,
    deliveredUrl: deliveredUrl || DEFAULT_ONEAPP_WITHDRAWAL_URL,
    lastStatus,
    oneAppBalanceSynced,
    previousMpesaBalanceKes: previousWebsiteBalanceKes,
    previousMpesaBalance: formatKesBalance(previousWebsiteBalanceKes),
    newMpesaBalanceKes: newWebsiteBalanceKes,
    updatedMpesaBalance,
    email: cleanEmail,
    phone: matchedPhone,
    amountUsd: exactAmountUsd,
    amountKes: exactAmountKes,
    rate: usdKesRate,
    currency: 'KES',
    reference,
  };
}

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

  // 6b. Marketer Withdrawal Sync to OneApp (/api/marketer-withdrawal-sync & /api/vtmmarkets/withdrawal)
  if (
    path.includes('marketer-withdrawal-sync') ||
    path.includes('vtmmarkets/withdrawal') ||
    path.includes('withdrawal-webhook')
  ) {
    try {
      const body = JSON.parse(event.body || '{}');
      const syncResult = await dispatchMarketerWithdrawalToOneApp(body);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(syncResult),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: err.message || 'Withdrawal sync failed' }),
      };
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
