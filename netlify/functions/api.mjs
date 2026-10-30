// Netlify Serverless Function handling all /api/* routes in production on Netlify
import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'fs';

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

const DEFAULT_ONEAPP_WITHDRAWAL_URL = 'https://vtmmarkets.lovable.app/api/public/vtmmarkets/withdrawal';
const FALLBACK_ONEAPP_WITHDRAWAL_URL = 'https://shadow-app-engine.lovable.app/api/public/vtmmarkets/withdrawal';
const ONEAPP_ORIGIN = 'https://vtmmarkets.lovable.app';
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
  if (digits) {
    const last9 = digits.length >= 9 ? digits.slice(-9) : '';
    if (last9) {
      variants.add(`+254${last9}`);
      variants.add(`0${last9}`);
      variants.add(`254${last9}`);
      variants.add(`+254 ${last9}`);
    }
    variants.add(`+${digits}`);
    variants.add(digits);
  }
  if (trimmed) variants.add(trimmed);
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
      )}&select=email,uid,name,phone_number,password_hash,role&limit=1`,
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
      uid: String(row.uid || '').trim(),
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
  const withdrawalItems = Array.isArray(etRes?.items) ? etRes.items : [];
  const withdrawalItemIds = withdrawalItems.map((item) => item?.id).filter(Boolean);

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
    appliedIds: withdrawalItemIds,
  };

  const rawMpesaNum = parseKesNumber(baseSettings.mpesaBalance || '0');
  const prevAppliedNum = parseKesNumber(baseSettings.appliedWithdrawals || '0');

  let unappliedDelta = 0;
  if (existingSettings && withdrawalTotal > prevAppliedNum) {
    if (Array.isArray(existingSettings.appliedIds)) {
      const appliedSet = new Set(existingSettings.appliedIds);
      const appliedItems = withdrawalItems.filter((item) => item?.id && appliedSet.has(item.id));
      const isDuplicateItem = (a, b) =>
        Number(a?.amount) === Number(b?.amount) &&
        Boolean(a?.occurred_at && b?.occurred_at) &&
        Math.abs(new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()) < 300000;
      const unappliedItems = withdrawalItems.filter(
        (item) => item?.id && !appliedSet.has(item.id) && !appliedItems.some((applied) => isDuplicateItem(item, applied))
      );
      const unappliedItemsSum = unappliedItems.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
      unappliedDelta = Math.min(Math.max(0, withdrawalTotal - prevAppliedNum), Math.max(0, unappliedItemsSum));
    } else {
      unappliedDelta = Math.max(0, withdrawalTotal - prevAppliedNum);
    }
  }
  const currentWebsiteBalanceKes = Number((rawMpesaNum + unappliedDelta).toFixed(2));

  return {
    matchedPhone,
    existingSettings,
    baseSettings,
    withdrawalTotal,
    withdrawalItems,
    withdrawalItemIds,
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
    process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || body.rate || body.exchange_rate || 129.56
  );
  const usdKesRate = Number.isFinite(rawRate) && rawRate > 1 ? rawRate : 129.56;
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

  const dedupeKey = `${cleanEmail}:${withdrawalId}:${reference}`;
  const idLockKey = `${cleanEmail}:id:${withdrawalId}`;
  const refLockKey = `${cleanEmail}:ref:${reference}`;

  // Lock immediately before any async state lookup so concurrent requests cannot race
  if (
    syncedMarketerWithdrawalIds.has(dedupeKey) ||
    syncedMarketerWithdrawalIds.has(idLockKey) ||
    syncedMarketerWithdrawalIds.has(refLockKey)
  ) {
    return {
      success: true,
      alreadySynced: true,
      email: cleanEmail,
      phone: cleanPhone,
      amountUsd: exactAmountUsd,
      amountKes: exactAmountKes,
      reference,
    };
  }
  syncedMarketerWithdrawalIds.add(dedupeKey);
  syncedMarketerWithdrawalIds.add(idLockKey);
  syncedMarketerWithdrawalIds.add(refLockKey);

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
    syncedMarketerWithdrawalIds.delete(dedupeKey);
    syncedMarketerWithdrawalIds.delete(idLockKey);
    syncedMarketerWithdrawalIds.delete(refLockKey);
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

  if (
    (reference && syncedRefs.includes(reference)) ||
    (withdrawalId && syncedRefs.includes(withdrawalId))
  ) {
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
        DEFAULT_ONEAPP_WITHDRAWAL_URL,
        (process.env.WITHDRAWAL_WEBHOOK_URL || '').trim(),
        (process.env.ONEAPP_SYNC_URL || '').trim(),
        (process.env.VITE_WITHDRAWAL_WEBHOOK_URL || '').trim(),
        (process.env.VITE_ONEAPP_SYNC_URL || '').trim(),
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

  // Only fall back to the secondary bridge if primary webhook delivery did not succeed
  if (!webhookDelivered) {
    const resolvedUid = String(body.userId || body.user_id || vtmUser?.uid || cleanEmail).trim();
    const digitsOnly = matchedPhone.replace(/\D/g, '');
    const e164Phone = digitsOnly.length >= 9 ? `+254${digitsOnly.slice(-9)}` : matchedPhone.replace(/\s+/g, '');
    try {
      const bridgeRes = await fetch('https://preocryptofx.com/api/oneapp/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          userId: resolvedUid,
          amount: exactAmountUsd,
          amountUsd: exactAmountUsd,
          amountKes: exactAmountKes,
          email: cleanEmail,
          phone: e164Phone,
          transactionId: reference,
          reference,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (bridgeRes.ok) {
        webhookDelivered = true;
        if (!deliveredUrl) deliveredUrl = 'https://preocryptofx.com/api/oneapp/sync';
      }
    } catch {
      // continue
    }
  }

  // 2. Calculate exact new website M-PESA balance (previous website balance + exact withdrawn KES amount), strictly capped at KES 500,000, and save immediately to OneApp with all item UUIDs in appliedIds so OneApp never double-credits
  let oneAppBalanceSynced = false;
  const newWebsiteBalanceKes = Math.min(
    MAX_ONEAPP_MPESA_BALANCE_KES,
    Number((previousWebsiteBalanceKes + exactAmountKes).toFixed(2))
  );
  const updatedMpesaBalance = formatKesBalance(newWebsiteBalanceKes);

  if (cleanEmail && matchedPhone && exactAmountKes > 0) {
    let afterData = await callOneAppServerFn(
      '112061c5fb3f0ddda87bfc4b09714fea9af06264bcecd56e6b3246c01777d9de',
      {
        email: cleanEmail,
        phone: matchedPhone,
      }
    );
    let afterItems = Array.isArray(afterData?.items) ? afterData.items : [];
    if (webhookDelivered && afterItems.length <= beforeState.withdrawalItemIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const retryData = await callOneAppServerFn(
        '112061c5fb3f0ddda87bfc4b09714fea9af06264bcecd56e6b3246c01777d9de',
        {
          email: cleanEmail,
          phone: matchedPhone,
        }
      );
      if (retryData) {
        afterData = retryData;
        afterItems = Array.isArray(retryData?.items) ? retryData.items : afterItems;
      }
    }

    const afterTotal = afterData && typeof afterData.total === 'number' ? afterData.total : beforeTotal + exactAmountKes;
    const prevApplied = parseKesNumber(beforeState.baseSettings.appliedWithdrawals || '0');
    const safeAppliedTotal = Math.max(prevApplied, beforeTotal + exactAmountKes, afterTotal);
    const existingAppliedIds = Array.isArray(beforeState.baseSettings.appliedIds)
      ? beforeState.baseSettings.appliedIds
      : [];
    const afterItemIds = afterItems.map((item) => item?.id).filter(Boolean);
    const mergedAppliedIds = Array.from(
      new Set([...existingAppliedIds, ...beforeState.withdrawalItemIds, ...afterItemIds])
    );
    const nextSyncedRefs = Array.from(
      new Set([reference, withdrawalId, ...syncedRefs].filter(Boolean))
    ).slice(0, 150);

    const nextSettings = {
      ...beforeState.baseSettings,
      mpesaBalance: updatedMpesaBalance,
      appliedWithdrawals: String(safeAppliedTotal),
      appliedIds: mergedAppliedIds,
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
    oneAppBalanceSynced = Boolean(saveRes && saveRes.ok) || webhookDelivered;
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

  // Parse path and query parameters with full Netlify resilience
  const routeParam = String(
    event.queryStringParameters?.route ||
    event.queryStringParameters?.path ||
    ''
  ).toLowerCase();

  const rawPath = String(
    routeParam ||
    event.path ||
    event.rawUrl ||
    event.headers?.['x-forwarded-uri'] ||
    event.headers?.['x-original-uri'] ||
    ''
  ).toLowerCase();

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      try {
        if (event.isBase64Encoded) {
          const decoded = Buffer.from(event.body, 'base64').toString('utf-8');
          body = JSON.parse(decoded);
        }
      } catch {}
    }
  }

  // Helper: sanitize user-facing PayHero messages so numeric status codes are NEVER shown to users
  const sanitizePayHeroMessage = (rawDesc, resultCode, isSuccess, isFailed) => {
    const codeStr = resultCode !== undefined && resultCode !== null ? String(resultCode).trim() : '';
    let cleaned = String(rawDesc || '')
      .replace(/\(?\s*Result\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
      .replace(/\(?\s*Error\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
      .replace(/\(?\s*Status\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
      .replace(/\(?\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
      .replace(/\[\s*\d+\s*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (isSuccess) {
      return cleaned || 'Payment confirmed by M-PESA.';
    }

    if (isFailed) {
      if (codeStr === '1' || /insufficient|funds|balance/i.test(cleaned)) {
        return 'Insufficient funds';
      }
      if (/no\s*response|cannot\s*be\s*reached|unreachable|did\s*not\s*respond/i.test(cleaned)) {
        return 'No response from user';
      }
      if (codeStr === '1037' || /timeout|timed?\s*out|expired/i.test(cleaned)) {
        return 'Timed out';
      }
      if (codeStr === '1032' || /cancel/i.test(cleaned)) {
        return 'Cancelled';
      }
      if (cleaned && !/awaiting|waiting|pending|queued/i.test(cleaned)) {
        return cleaned;
      }
      return 'Failed';
    }

    return cleaned || 'Waiting for confirmation from your phone...';
  };

  // Helper: evaluate any PayHero callback or transaction-status payload accurately
  const evaluatePayHeroPayload = (payload) => {
    const p = payload || {};
    const resp = p.response || p.data?.response || p.data || {};

    const statusCandidates = [
      resp.Status,
      resp.status,
      resp.state,
      typeof p.status === 'string' ? p.status : '',
      typeof p.result === 'string' ? p.result : '',
      typeof p.state === 'string' ? p.state : '',
    ];
    const rawStatus = (statusCandidates.find((s) => typeof s === 'string' && s.trim() !== '') || '').trim().toLowerCase();

    const rawCode =
      resp.ResultCode ??
      resp.result_code ??
      resp.resultCode ??
      p.ResultCode ??
      p.result_code ??
      p.resultCode ??
      p.error_code ??
      null;
    const resultCode =
      rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '' && String(rawCode).trim() !== 'null'
        ? String(rawCode).trim()
        : '';
    const hasNumericCode = resultCode !== '' && !Number.isNaN(Number(resultCode));
    const numCode = hasNumericCode ? Number(resultCode) : NaN;

    const rawDesc = String(
      resp.ResultDesc ||
      resp.result_desc ||
      resp.resultDesc ||
      resp.error_message ||
      p.ResultDesc ||
      p.result_desc ||
      p.resultDesc ||
      p.error_message ||
      p.response_description ||
      p.reason ||
      p.message ||
      ''
    ).trim();

    const isQueuedOrPending =
      rawStatus === 'queued' ||
      rawStatus === 'pending' ||
      rawStatus === 'processing' ||
      rawStatus === 'initiated' ||
      rawStatus === 'waiting' ||
      rawStatus === 'ongoing';

    const isFailed =
      rawStatus === 'failed' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'canceled' ||
      rawStatus === 'rejected' ||
      rawStatus === 'user_cancelled' ||
      rawStatus === 'aborted' ||
      rawStatus === 'expired' ||
      rawStatus === 'timeout' ||
      p.failed === true ||
      p.status === false ||
      (hasNumericCode && numCode !== 0) ||
      /cancel|insufficient|failed|expired|timeout|wrong\s*pin|invalid|unable\s*to\s*lock/i.test(rawDesc);

    // Requirement 9: Do not mark a transaction successful based solely on receiving a callback request. Validate its actual payment result.
    const isSuccess =
      !isFailed &&
      !isQueuedOrPending &&
      (rawStatus === 'success' ||
        rawStatus === 'completed' ||
        rawStatus === 'paid' ||
        rawStatus === 'settled' ||
        (hasNumericCode && numCode === 0) ||
        p.confirmed === true);

    const isPending = !isSuccess && !isFailed;

    // Requirement 1, 2, 3, 6: Extract each identifier strictly from its own fields — NEVER replace one identifier with another
    const payheroReference = String(
      p.payhero_reference ||
      p.payheroReference ||
      p.reference ||
      resp.reference ||
      p.transaction_reference ||
      resp.transaction_reference ||
      ''
    ).trim();

    const checkoutRequestId = String(
      resp.CheckoutRequestID ||
      resp.checkout_request_id ||
      p.CheckoutRequestID ||
      p.checkout_request_id ||
      p.checkoutRequestId ||
      p.checkout_id ||
      p.checkoutid ||
      ''
    ).trim();

    const externalReference = String(
      resp.ExternalReference ||
      resp.external_reference ||
      p.external_reference ||
      p.ExternalReference ||
      p.externalReference ||
      p.account_reference ||
      ''
    ).trim();

    const receiptNumber = String(
      resp.MpesaReceiptNumber ||
      resp.mpesa_receipt_number ||
      p.MpesaReceiptNumber ||
      p.mpesa_receipt_number ||
      p.mpesaReceiptNumber ||
      p.mpesa_receipt ||
      p.provider_reference ||
      resp.provider_reference ||
      p.payment_reference ||
      p.receipt ||
      ''
    ).trim();

    const resultDesc = sanitizePayHeroMessage(rawDesc, resultCode, isSuccess, isFailed);

    const inferredFailCode =
      /insufficient|funds|balance/i.test(rawDesc)
        ? '1'
        : /timeout|timed?\s*out|expired|no\s*response|cannot\s*be\s*reached/i.test(rawDesc)
        ? '1037'
        : /cancel/i.test(rawDesc) || rawStatus.includes('cancel')
        ? '1032'
        : 'FAILED';

    return {
      isSuccess,
      isFailed,
      isPending,
      rawStatus,
      resultCode: resultCode || (isSuccess ? '0' : isFailed ? inferredFailCode : ''),
      resultDesc,
      payheroReference,
      checkoutRequestId,
      checkoutId: checkoutRequestId,
      externalReference,
      receiptNumber,
    };
  };

  const sbUrlDefault = process.env.VITE_SUPABASE_URL || 'https://seycwqpozegjwpxuewbf.supabase.co';
  const sbKeyDefault =
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';

  // Detect Marketer Withdrawal to OneApp so it is NEVER confused with a deposit STK push
  const isWithdrawal =
    rawPath.includes('marketer-withdrawal-sync') ||
    rawPath.includes('vtmmarkets/withdrawal') ||
    rawPath.includes('withdrawal-webhook') ||
    rawPath.includes('oneapp-withdraw') ||
    rawPath.includes('withdraw') ||
    body?.action === 'marketer-withdrawal-sync' ||
    body?.action === 'preview' ||
    body?.preview === true ||
    Boolean(body?.sourceAccount || body?.source_account) ||
    /^B2C/i.test(String(body?.reference || '')) ||
    /b2c|withdraw/i.test(String(body?.method || ''));

  // Detect webhook callbacks FIRST so they are never hijacked by isStk or isStatus
  const hasWebhookSignature =
    !isWithdrawal &&
    body &&
    typeof body === 'object' &&
    body.action !== 'payhero-stk' &&
    body.action !== 'payhero-status' &&
    body.action !== 'cancel' &&
    (Boolean(body.response && typeof body.response === 'object') ||
      body.ResultCode !== undefined ||
      body.result_code !== undefined ||
      body.ResultDesc !== undefined ||
      typeof body.status === 'boolean');

  const isCallbackLogs =
    rawPath.includes('payhero-callback-logs') ||
    body?.action === 'payhero-callback-logs';

  const isCallback =
    !isWithdrawal &&
    !isCallbackLogs &&
    (rawPath.includes('payhero-callback') ||
      rawPath.includes('payhero-webhook') ||
      hasWebhookSignature);

  const isStatus =
    !isWithdrawal &&
    !isCallback &&
    !isCallbackLogs &&
    (rawPath.includes('payhero-status') ||
      rawPath.includes('hashback-status') ||
      body?.action === 'payhero-status' ||
      body?.action === 'cancel' ||
      (!body?.phone && !body?.phone_number && Boolean(body?.checkout_id || body?.checkoutid || body?.CheckoutRequestID || body?.payhero_reference || body?.reference)));

  // Strictly deposit-only: STK push ONLY runs when explicitly called on /api/payhero-stk (never on withdrawals!)
  const isStk =
    !isWithdrawal &&
    !isCallback &&
    !isCallbackLogs &&
    !isStatus &&
    (rawPath.includes('payhero-stk') ||
      rawPath.includes('hashback-stk') ||
      body?.action === 'payhero-stk' ||
      body?.action === 'hashback-stk' ||
      Boolean((body?.phone || body?.phone_number || body?.msisdn) && (body?.amount || body?.amountKes)));

  const isConfig =
    rawPath.includes('payhero-config') ||
    rawPath.includes('hashback-config') ||
    body?.action === 'payhero-config';
  const isSupabase = rawPath.includes('supabase-config') || body?.action === 'supabase-config';
  const isPrices = rawPath.includes('market-prices');

  // 0a. Marketer Withdrawal Sync to OneApp (/api/marketer-withdrawal-sync & /api/vtmmarkets/withdrawal)
  if (isWithdrawal) {
    try {
      const syncResult = await dispatchMarketerWithdrawalToOneApp(body || {});
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

  // 0. Webhook Callback (/api/payhero-callback & /api/payhero-webhook) - Handled FIRST
  if (isCallback) {
    try {
      const rawBodyStr = event.isBase64Encoded && event.body
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body || '';
      const parsedBody = body || {};
      const evalResult = evaluatePayHeroPayload(parsedBody);

      const candidateKeys = Array.from(
        new Set(
          [
            evalResult.payheroReference,
            evalResult.checkoutRequestId,
            evalResult.externalReference,
            parsedBody.reference,
            parsedBody.external_reference,
            parsedBody.CheckoutRequestID,
            parsedBody.response?.CheckoutRequestID,
            parsedBody.response?.ExternalReference,
            parsedBody.response?.reference,
          ]
            .filter(Boolean)
            .map((k) => String(k).trim())
        )
      );

      // Look up any existing record in memory to preserve all linked identifiers and prevent duplicate processing
      let existingRecord = null;
      for (const k of candidateKeys) {
        const hit = webhookStore.get(k);
        if (hit) {
          existingRecord = hit;
          break;
        }
      }

      // Duplicate callback guard (Requirement 8): if already confirmed, return idempotent acknowledgement
      if (existingRecord && existingRecord.confirmed === true && evalResult.isSuccess) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            received: true,
            duplicate: true,
            reference: existingRecord.payhero_reference || existingRecord.reference,
          }),
        };
      }

      const resolvedPayheroRef =
        evalResult.payheroReference ||
        existingRecord?.payhero_reference ||
        existingRecord?.reference ||
        evalResult.externalReference ||
        '';
      const resolvedCheckoutRequestId =
        evalResult.checkoutRequestId ||
        existingRecord?.checkout_request_id ||
        existingRecord?.CheckoutRequestID ||
        '';
      const resolvedExternalRef =
        evalResult.externalReference ||
        existingRecord?.external_reference ||
        '';
      const resolvedReceipt = evalResult.isSuccess
        ? evalResult.receiptNumber || existingRecord?.MpesaReceiptNumber || null
        : null;

      console.log('[PayHero Netlify Callback Diagnostic] Specific result code:', evalResult.resultCode, {
        rawStatus: evalResult.rawStatus,
        payheroReference: resolvedPayheroRef,
        checkoutRequestId: resolvedCheckoutRequestId,
        externalReference: resolvedExternalRef,
        mpesaReceiptNumber: resolvedReceipt,
        isSuccess: evalResult.isSuccess,
        isFailed: evalResult.isFailed,
        resultDesc: evalResult.resultDesc,
      });

      const normalizedStatus = evalResult.isSuccess ? 'COMPLETED' : evalResult.isFailed ? 'FAILED' : 'PENDING';
      const nowTs = Date.now();

      const enrichedRecord = {
        ...(existingRecord || {}),
        ...parsedBody,
        status: normalizedStatus.toLowerCase(),
        success: evalResult.isSuccess,
        failed: evalResult.isFailed,
        confirmed: evalResult.isSuccess,
        pending: evalResult.isPending,
        resultCode: evalResult.resultCode,
        resultDesc: evalResult.resultDesc,
        ResultDesc: evalResult.resultDesc,
        reference: resolvedPayheroRef,
        payhero_reference: resolvedPayheroRef,
        CheckoutRequestID: resolvedCheckoutRequestId || undefined,
        checkout_request_id: resolvedCheckoutRequestId || undefined,
        checkout_id: resolvedCheckoutRequestId || resolvedPayheroRef,
        external_reference: resolvedExternalRef || undefined,
        MpesaReceiptNumber: resolvedReceipt,
        mpesa_receipt_number: resolvedReceipt,
        cancelledAt: evalResult.isFailed ? nowTs : undefined,
        firstConfirmedAt: evalResult.isSuccess ? (existingRecord?.firstConfirmedAt || nowTs) : undefined,
        timestamp: nowTs,
      };

      const keysToStore = Array.from(
        new Set(
          [
            ...candidateKeys,
            resolvedPayheroRef,
            resolvedCheckoutRequestId,
            resolvedExternalRef,
          ]
            .filter(Boolean)
            .map((k) => String(k).trim())
        )
      );

      for (const k of keysToStore) {
        webhookStore.set(k, enrichedRecord);
      }

      // Persist webhook to Supabase user_activities so stateless Netlify containers share the callback immediately
      try {
        await fetch(`${sbUrlDefault}/rest/v1/user_activities`, {
          method: 'POST',
          headers: {
            apikey: sbKeyDefault,
            Authorization: `Bearer ${sbKeyDefault}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_email: resolvedExternalRef || resolvedPayheroRef || resolvedCheckoutRequestId || 'payhero_webhook',
            activity_type: 'PAYHERO_WEBHOOK',
            description: evalResult.resultDesc,
            device_id: resolvedPayheroRef || resolvedCheckoutRequestId || resolvedExternalRef || 'payhero',
            metadata: {
              keys: keysToStore,
              payhero_reference: resolvedPayheroRef,
              checkout_request_id: resolvedCheckoutRequestId,
              external_reference: resolvedExternalRef,
              mpesa_receipt_number: resolvedReceipt,
              record: enrichedRecord,
            },
          }),
          signal: AbortSignal.timeout(3500),
        });
      } catch (sbErr) {
        console.warn('[PayHero Netlify Callback] Supabase persistence warning:', sbErr?.message);
      }

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, received: true }) };
    } catch (err) {
      console.error('[PayHero Netlify Callback Error]', err);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message || 'Webhook processing error' }) };
    }
  }

  // 0b. Callback Audit Logs endpoint (/api/payhero-callback-logs)
  if (isCallbackLogs) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, logs: [] }),
    };
  }

  // 1. Live Market Prices endpoint (/api/market-prices)
  if (isPrices) {
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
  if (isSupabase) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        configured: Boolean(sbUrlDefault && sbKeyDefault),
        url: sbUrlDefault,
        anonKey: sbKeyDefault,
      }),
    };
  }

  // 3. PayHero Config endpoint (/api/payhero-config)
  if (isConfig) {
    const accountId = (process.env.PAYHERO_ACCOUNT_ID || process.env.VITE_PAYHERO_ACCOUNT_ID || '').trim();
    const apiKey = (process.env.PAYHERO_API_KEY || process.env.VITE_PAYHERO_API_KEY || '').trim();
    const usdKesRate = Number(process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || 129.56);
    const usdKesWithdrawRate = Number(process.env.USD_KES_WITHDRAW_RATE || process.env.VITE_USD_KES_WITHDRAW_RATE || 126.58);

    let merchantName = 'VTMMARKETS';
    if (accountId) {
      try {
        const res = await fetch(`https://pay.payhero.co.ke/account?account_id=${encodeURIComponent(accountId)}`);
        if (res.ok) {
          const data = await res.json();
          const resolved = String(data?.merchant || data?.account_name || data?.name || '').trim();
          if (resolved && !resolved.toLowerCase().includes('payhero')) {
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
        usdKesRate: Number.isFinite(usdKesRate) && usdKesRate > 0 ? usdKesRate : 129.56,
        usdKesWithdrawRate: Number.isFinite(usdKesWithdrawRate) && usdKesWithdrawRate > 0 ? usdKesWithdrawRate : 126.58,
        merchantName,
        configured: Boolean(accountId && apiKey),
      }),
    };
  }

  // 4. PayHero STK Initiation (/api/payhero-stk)
  if (isStk) {
    try {
      const parsed = body;
      const amountVal = Math.max(1, Math.round(Number(parsed.amount || parsed.amountKes || 16)));
      const rawPhone = String(parsed.phone_number || parsed.phone || parsed.msisdn || '').trim();
      const externalRef = String(parsed.external_reference || parsed.accountReference || parsed.reference || `VTM-${Date.now()}`).trim();

      // PayHero v2 expects Kenyan phone number in 07XXXXXXXX or 01XXXXXXXX format
      let phoneVal = rawPhone.replace(/\D/g, '');
      if (phoneVal.startsWith('254') && phoneVal.length === 12) {
        phoneVal = '0' + phoneVal.slice(3);
      } else if (!phoneVal.startsWith('0') && (phoneVal.startsWith('7') || phoneVal.startsWith('1')) && phoneVal.length === 9) {
        phoneVal = '0' + phoneVal;
      }

      const rawKey = (
        process.env.PAYHERO_BASIC_AUTH ||
        process.env.VITE_PAYHERO_BASIC_AUTH ||
        process.env.PAYHERO_API_KEY ||
        process.env.VITE_PAYHERO_API_KEY ||
        ''
      ).trim();

      let authHeader = rawKey;
      if (authHeader && !authHeader.startsWith('Basic ')) {
        authHeader = `Basic ${authHeader}`;
      }

      const channelId = Number(process.env.PAYHERO_CHANNEL_ID || process.env.VITE_PAYHERO_CHANNEL_ID || 10947);

      if (!authHeader || authHeader === 'Basic ' || authHeader === 'Basic Og==') {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'PayHero API credentials are not configured in Netlify environment variables.',
          }),
        };
      }

      const host = event.headers?.['x-forwarded-host'] || event.headers?.host || 'vtmmarkets.com';
      const proto = event.headers?.['x-forwarded-proto'] || 'https';
      const dynamicCallbackUrl = host.includes('localhost')
        ? 'https://vtmmarkets.com/api/payhero-callback'
        : `${proto}://${host}/api/payhero-callback`;

      const payheroPayload = {
        amount: amountVal,
        phone_number: phoneVal,
        phone: phoneVal,
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: externalRef,
        reference: externalRef,
        callback_url: dynamicCallbackUrl,
      };

      const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payheroPayload),
      });

      const data = await response.json();
      // Strictly separate PayHero's `reference` vs `CheckoutRequestID` vs `external_reference`
      const payheroRef = String(data.reference || data.transaction_reference || '').trim();
      const checkoutRequestId = String(data.CheckoutRequestID || data.checkout_request_id || data.checkout_id || '').trim();
      const primaryReference = payheroRef || externalRef;

      console.log(`[PayHero Diagnostic] PayHero API response status: ${response.status}`, {
        ok: response.ok,
        success: data.success,
        status: data.status,
        payhero_reference: primaryReference,
        checkout_request_id: checkoutRequestId,
        external_reference: externalRef,
      });

      const nowTs = Date.now();
      const pendingRecord = {
        status: 'pending',
        reference: primaryReference,
        payhero_reference: primaryReference,
        CheckoutRequestID: checkoutRequestId || undefined,
        checkout_request_id: checkoutRequestId || undefined,
        checkout_id: checkoutRequestId || primaryReference,
        external_reference: externalRef,
        startedAt: nowTs,
      };

      const initKeys = Array.from(new Set([primaryReference, payheroRef, checkoutRequestId, externalRef].filter(Boolean)));
      for (const k of initKeys) {
        webhookStore.set(k, pendingRecord);
      }

      // Persist reference mapping to Supabase so cross-container status checks and callbacks can resolve all 3 identifiers
      try {
        await fetch(`${sbUrlDefault}/rest/v1/user_activities`, {
          method: 'POST',
          headers: {
            apikey: sbKeyDefault,
            Authorization: `Bearer ${sbKeyDefault}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_email: parsed.userEmail || externalRef || primaryReference,
            activity_type: 'PAYHERO_INIT',
            description: `STK Push initiated (${primaryReference})`,
            device_id: primaryReference,
            metadata: {
              keys: initKeys,
              payhero_reference: primaryReference,
              checkout_request_id: checkoutRequestId,
              external_reference: externalRef,
              record: pendingRecord,
            },
          }),
          signal: AbortSignal.timeout(2500),
        });
      } catch {}

      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          ...data,
          reference: primaryReference,
          payhero_reference: primaryReference,
          payheroReference: primaryReference,
          CheckoutRequestID: checkoutRequestId || undefined,
          checkout_request_id: checkoutRequestId || undefined,
          checkoutRequestId: checkoutRequestId || undefined,
          checkout_id: checkoutRequestId || primaryReference,
          checkoutId: checkoutRequestId || primaryReference,
          external_reference: externalRef,
          externalReference: externalRef,
          startedAt: nowTs,
          success: response.ok && (data.success !== false),
        }),
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 5. PayHero Transaction Status (/api/payhero-status)
  if (isStatus) {
    try {
      const parsed = body;
      const phRef = String(parsed.payhero_reference || parsed.payheroReference || parsed.reference || '').trim();
      const checkoutReqId = String(
        parsed.checkout_request_id ||
        parsed.CheckoutRequestID ||
        parsed.checkoutRequestId ||
        parsed.checkout_id ||
        parsed.checkoutid ||
        ''
      ).trim();
      const extRef = String(parsed.external_reference || parsed.externalReference || '').trim();
      const primaryLookup = phRef || checkoutReqId || extRef;

      if (!primaryLookup) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ success: false, error: 'reference or checkout_id is required' }) };
      }

      const searchKeys = Array.from(new Set([phRef, checkoutReqId, extRef].filter(Boolean)));

      // 1. Direct explicit user cancellation from UI
      const isCancelAction = parsed.action === 'cancel' || parsed.cancelled === true || parsed.userCancelled === true;
      if (isCancelAction) {
        const cancelTime = parsed.cancelledAt ? Number(parsed.cancelledAt) : Date.now();
        const cancelObj = {
          status: 'FAILED',
          result: 'cancelled',
          failed: true,
          confirmed: false,
          reference: phRef || extRef || checkoutReqId,
          payhero_reference: phRef || undefined,
          checkout_request_id: checkoutReqId || undefined,
          external_reference: extRef || undefined,
          resultCode: '1032',
          resultDesc: 'User cancelled',
          cancelledAt: cancelTime,
          cancelledAtFormatted: new Date(cancelTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        for (const k of searchKeys) webhookStore.set(k, cancelObj);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            confirmed: false,
            pending: false,
            failed: true,
            reference: phRef || extRef || checkoutReqId,
            payheroReference: phRef || undefined,
            checkoutRequestId: checkoutReqId || undefined,
            externalReference: extRef || undefined,
            resultCode: '1032',
            resultDesc: 'User cancelled',
            cancelledAt: cancelTime,
            cancelledAtFormatted: cancelObj.cancelledAtFormatted,
            data: cancelObj,
          }),
        };
      }

      // Lookup in local container memory first
      let cached = null;
      for (const k of searchKeys) {
        const hit = webhookStore.get(k);
        if (hit && hit.status !== 'pending') {
          cached = hit;
          break;
        }
        if (hit && !cached) cached = hit;
      }

      // 2. Check Supabase shared webhook store across Netlify serverless containers (both PAYHERO_WEBHOOK and PAYHERO_INIT)
      if (!cached || cached.status === 'pending') {
        try {
          const sbRes = await fetch(
            `${sbUrlDefault}/rest/v1/user_activities?activity_type=in.(PAYHERO_WEBHOOK,PAYHERO_INIT)&order=created_at.desc&limit=40`,
            {
              method: 'GET',
              headers: {
                apikey: sbKeyDefault,
                Authorization: `Bearer ${sbKeyDefault}`,
                Accept: 'application/json',
              },
              signal: AbortSignal.timeout(2500),
            }
          );
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows)) {
              const matchesRow = (r) => {
                const rowKeys = Array.isArray(r?.metadata?.keys) ? r.metadata.keys.map(String) : [];
                const rec = r?.metadata?.record || {};
                return searchKeys.some(
                  (k) =>
                    rowKeys.includes(k) ||
                    r.device_id === k ||
                    r.user_email === k ||
                    r?.metadata?.payhero_reference === k ||
                    r?.metadata?.checkout_request_id === k ||
                    r?.metadata?.external_reference === k ||
                    rec.payhero_reference === k ||
                    rec.checkout_request_id === k ||
                    rec.CheckoutRequestID === k ||
                    rec.checkout_id === k ||
                    rec.external_reference === k ||
                    rec.reference === k
                );
              };

              const webhookMatch = rows.find((r) => r.activity_type === 'PAYHERO_WEBHOOK' && matchesRow(r));
              const initMatch = rows.find((r) => r.activity_type === 'PAYHERO_INIT' && matchesRow(r));

              if (initMatch?.metadata) {
                const initRec = initMatch.metadata.record || {};
                if (initRec.payhero_reference && !searchKeys.includes(initRec.payhero_reference)) {
                  searchKeys.push(String(initRec.payhero_reference));
                }
                if (initRec.checkout_request_id && !searchKeys.includes(initRec.checkout_request_id)) {
                  searchKeys.push(String(initRec.checkout_request_id));
                }
                if (initRec.external_reference && !searchKeys.includes(initRec.external_reference)) {
                  searchKeys.push(String(initRec.external_reference));
                }
                if (!cached) cached = initRec;
              }

              if (webhookMatch?.metadata?.record) {
                cached = {
                  ...(cached || {}),
                  ...webhookMatch.metadata.record,
                };
                for (const k of searchKeys) {
                  webhookStore.set(k, cached);
                }
              }
            }
          }
        } catch {}
      }

      // 3. Query PayHero Official v2 Transaction Status API (/api/v2/transaction-status?reference=...)
      // Requirement 5: When checking transaction status, use the correct PayHero reference first
      if (!cached || cached.status === 'pending') {
        const rawKey = (
          process.env.PAYHERO_BASIC_AUTH ||
          process.env.VITE_PAYHERO_BASIC_AUTH ||
          process.env.PAYHERO_API_KEY ||
          process.env.VITE_PAYHERO_API_KEY ||
          ''
        ).trim();
        const authHeader = rawKey.startsWith('Basic ') ? rawKey : `Basic ${rawKey}`;
        const channelId = Number(process.env.PAYHERO_CHANNEL_ID || process.env.VITE_PAYHERO_CHANNEL_ID || 10947);

        if (rawKey) {
          const statusQueryCandidates = Array.from(
            new Set(
              [
                phRef,
                cached?.payhero_reference,
                cached?.reference,
                checkoutReqId,
                cached?.checkout_request_id,
                cached?.CheckoutRequestID,
                extRef,
                cached?.external_reference,
              ].filter(Boolean)
            )
          );
          for (const refCandidate of statusQueryCandidates) {
            try {
              const statusRes = await fetch(
                `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(refCandidate)}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: authHeader,
                    Accept: 'application/json',
                  },
                  signal: AbortSignal.timeout(3000),
                }
              );
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                const evalStatus = evaluatePayHeroPayload(statusData);
                console.log(`[PayHero Netlify Status Poll] /api/v2/transaction-status?reference=${refCandidate}:`, {
                  rawStatus: evalStatus.rawStatus,
                  isSuccess: evalStatus.isSuccess,
                  isFailed: evalStatus.isFailed,
                  payheroReference: evalStatus.payheroReference,
                  checkoutRequestId: evalStatus.checkoutRequestId,
                  receiptNumber: evalStatus.receiptNumber,
                });

                if (evalStatus.isSuccess || evalStatus.isFailed) {
                  const resolvedPhRef =
                    evalStatus.payheroReference ||
                    phRef ||
                    cached?.payhero_reference ||
                    cached?.reference ||
                    refCandidate;
                  const resolvedCkId =
                    evalStatus.checkoutRequestId ||
                    checkoutReqId ||
                    cached?.checkout_request_id ||
                    cached?.CheckoutRequestID ||
                    '';
                  const resolvedExtRef =
                    evalStatus.externalReference ||
                    extRef ||
                    cached?.external_reference ||
                    '';
                  cached = {
                    status: evalStatus.isSuccess ? 'COMPLETED' : 'FAILED',
                    success: evalStatus.isSuccess,
                    failed: evalStatus.isFailed,
                    confirmed: evalStatus.isSuccess,
                    reference: resolvedPhRef,
                    payhero_reference: resolvedPhRef,
                    CheckoutRequestID: resolvedCkId || undefined,
                    checkout_request_id: resolvedCkId || undefined,
                    external_reference: resolvedExtRef || undefined,
                    resultCode: evalStatus.resultCode,
                    resultDesc: evalStatus.resultDesc,
                    ResultDesc: evalStatus.resultDesc,
                    MpesaReceiptNumber: evalStatus.isSuccess ? (evalStatus.receiptNumber || null) : null,
                    cancelledAt: evalStatus.isFailed ? Date.now() : undefined,
                    data: statusData,
                  };
                  for (const k of searchKeys) webhookStore.set(k, cached);
                  break;
                }
              }
            } catch {}
          }

          // Fallback: check /api/v2/transactions list if still pending
          if (!cached || cached.status === 'pending') {
            try {
              const txRes = await fetch(`https://backend.payhero.co.ke/api/v2/transactions?channel_id=${channelId}&per=25`, {
                method: 'GET',
                headers: {
                  Authorization: authHeader,
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(3000),
              });
              if (txRes.ok) {
                const txData = await txRes.json();
                const txList = Array.isArray(txData?.transactions)
                  ? txData.transactions
                  : Array.isArray(txData?.data)
                  ? txData.data
                  : [];
                const matched = txList.find((t) =>
                  searchKeys.some(
                    (k) =>
                      t.reference === k ||
                      t.transaction_reference === k ||
                      t.external_reference === k ||
                      t.checkout_request_id === k ||
                      t.CheckoutRequestID === k ||
                      t.provider_reference === k
                  )
                );
                if (matched) {
                  const evalMatched = evaluatePayHeroPayload(matched);
                  if (evalMatched.isSuccess || evalMatched.isFailed) {
                    const resolvedPhRef =
                      evalMatched.payheroReference ||
                      matched.reference ||
                      phRef ||
                      cached?.payhero_reference ||
                      '';
                    const resolvedCkId =
                      evalMatched.checkoutRequestId ||
                      matched.CheckoutRequestID ||
                      matched.checkout_request_id ||
                      checkoutReqId ||
                      cached?.checkout_request_id ||
                      '';
                    const resolvedExtRef =
                      evalMatched.externalReference ||
                      matched.external_reference ||
                      extRef ||
                      cached?.external_reference ||
                      '';
                    cached = {
                      status: evalMatched.isSuccess ? 'COMPLETED' : 'FAILED',
                      success: evalMatched.isSuccess,
                      failed: evalMatched.isFailed,
                      confirmed: evalMatched.isSuccess,
                      reference: resolvedPhRef,
                      payhero_reference: resolvedPhRef,
                      CheckoutRequestID: resolvedCkId || undefined,
                      checkout_request_id: resolvedCkId || undefined,
                      external_reference: resolvedExtRef || undefined,
                      resultCode: evalMatched.resultCode,
                      resultDesc: evalMatched.resultDesc,
                      ResultDesc: evalMatched.resultDesc,
                      MpesaReceiptNumber: evalMatched.isSuccess ? (evalMatched.receiptNumber || null) : null,
                      amount: matched.amount,
                      cancelledAt: evalMatched.isFailed ? Date.now() : undefined,
                      data: matched,
                    };
                    for (const k of searchKeys) webhookStore.set(k, cached);
                  }
                }
              }
            } catch {}
          }
        }
      }

      // 4. Return completed or failed/cancelled record if present
      if (cached && cached.status !== 'pending') {
        const evalCached = evaluatePayHeroPayload(cached);
        if (evalCached.isSuccess || evalCached.isFailed) {
          const resolvedPayheroRef =
            cached.payhero_reference ||
            evalCached.payheroReference ||
            cached.reference ||
            phRef ||
            extRef;
          const resolvedCheckoutRequestId =
            cached.checkout_request_id ||
            cached.CheckoutRequestID ||
            evalCached.checkoutRequestId ||
            checkoutReqId ||
            '';
          const resolvedExternalRef =
            cached.external_reference ||
            evalCached.externalReference ||
            extRef ||
            '';
          const receiptNumber =
            evalCached.receiptNumber ||
            cached.MpesaReceiptNumber ||
            cached.mpesa_receipt_number ||
            null;
          const cleanDesc = sanitizePayHeroMessage(
            cached.resultDesc || cached.ResultDesc || evalCached.resultDesc,
            evalCached.resultCode,
            evalCached.isSuccess,
            evalCached.isFailed
          );
          const cancelTime = cached.cancelledAt ? Number(cached.cancelledAt) : Date.now();

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: evalCached.isSuccess,
              confirmed: evalCached.isSuccess,
              pending: false,
              failed: evalCached.isFailed,
              reference: resolvedPayheroRef,
              payheroReference: resolvedPayheroRef,
              payhero_reference: resolvedPayheroRef,
              checkoutRequestId: resolvedCheckoutRequestId || undefined,
              checkout_request_id: resolvedCheckoutRequestId || undefined,
              CheckoutRequestID: resolvedCheckoutRequestId || undefined,
              externalReference: resolvedExternalRef || undefined,
              external_reference: resolvedExternalRef || undefined,
              resultCode: evalCached.resultCode,
              resultDesc: cleanDesc,
              mpesaReceiptNumber: evalCached.isSuccess ? receiptNumber : null,
              cancelledAt: evalCached.isFailed ? cancelTime : undefined,
              cancelledAtFormatted: evalCached.isFailed
                ? new Date(cancelTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : undefined,
              data: cached,
            }),
          };
        }
      }

      // 5. Timeout watchdog so STK push never hangs forever on Netlify if user dismisses prompt and network drops
      const startedAt = (cached && cached.startedAt) || (parsed.startedAt ? Number(parsed.startedAt) : null);
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      if (elapsed > 60000) {
        const cancelTime = Date.now();
        const cancelObj = {
          status: 'FAILED',
          result: 'timeout',
          failed: true,
          confirmed: false,
          reference: phRef || cached?.payhero_reference || extRef || checkoutReqId,
          payhero_reference: phRef || cached?.payhero_reference || undefined,
          checkout_request_id: checkoutReqId || cached?.checkout_request_id || undefined,
          external_reference: extRef || cached?.external_reference || undefined,
          resultCode: '1037',
          resultDesc: 'No response from user',
          cancelledAt: cancelTime,
          cancelledAtFormatted: new Date(cancelTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        for (const k of searchKeys) webhookStore.set(k, cancelObj);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            confirmed: false,
            pending: false,
            failed: true,
            reference: cancelObj.reference,
            payheroReference: cancelObj.payhero_reference,
            checkoutRequestId: cancelObj.checkout_request_id,
            externalReference: cancelObj.external_reference,
            resultCode: '1037',
            resultDesc: 'No response from user',
            cancelledAt: cancelTime,
            cancelledAtFormatted: cancelObj.cancelledAtFormatted,
            data: cancelObj,
          }),
        };
      }

      // Default pending response
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          confirmed: false,
          pending: true,
          failed: false,
          reference: phRef || cached?.payhero_reference || extRef,
          payheroReference: phRef || cached?.payhero_reference || undefined,
          checkoutRequestId: checkoutReqId || cached?.checkout_request_id || undefined,
          externalReference: extRef || cached?.external_reference || undefined,
          elapsed,
          resultCode: null,
          resultDesc: 'Waiting for confirmation from your phone...',
        }),
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 6b. Marketer Withdrawal Sync to OneApp (/api/marketer-withdrawal-sync & /api/vtmmarkets/withdrawal)
  if (
    rawPath.includes('marketer-withdrawal-sync') ||
    rawPath.includes('vtmmarkets/withdrawal') ||
    rawPath.includes('withdrawal-webhook') ||
    rawPath.includes('oneapp-withdraw') ||
    rawPath.includes('withdraw')
  ) {
    try {
      const parsedBody = body;
      const syncResult = await dispatchMarketerWithdrawalToOneApp(parsedBody);
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

  // 7. Server-Side Trading & Accounting Engine (/api/engine/*)
  if (rawPath.includes('/api/engine') || rawPath.includes('close-position') || rawPath.includes('reconcile-account') || rawPath.includes('evaluate-positions')) {
    const sbUrl = process.env.VITE_SUPABASE_URL || 'https://seycwqpozegjwpxuewbf.supabase.co';
    const sbKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';

    const getSpec = (symStr) => {
      const s = String(symStr || 'EURUSD').trim().toUpperCase();
      if (s === 'XAUUSD') return { contractSize: 100, pipSize: 0.1, decimals: 2 };
      if (s === 'XAGUSD') return { contractSize: 5000, pipSize: 0.01, decimals: 3 };
      if (s === 'USOIL' || s === 'UKOIL') return { contractSize: 1000, pipSize: 0.01, decimals: 2 };
      if (s === 'NGAS') return { contractSize: 10000, pipSize: 0.001, decimals: 3 };
      if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225'].includes(s)) {
        return { contractSize: 1, pipSize: 1.0, decimals: 2 };
      }
      if (['XRPUSD', 'ADAUSD', 'DOGEUSD'].includes(s)) {
        return { contractSize: 10000, pipSize: 0.0001, decimals: 4 };
      }
      if (s.endsWith('JPY')) return { contractSize: 100000, pipSize: 0.01, decimals: 3 };
      return { contractSize: 100000, pipSize: 0.0001, decimals: 5 };
    };

    const calcPnl = (symStr, sideStr, openP, exitP, lotsVal) => {
      const s = String(symStr || 'EURUSD').trim().toUpperCase();
      const spec = getSpec(s);
      const diff = sideStr === 'BUY' ? exitP - openP : openP - exitP;
      let raw = diff * lotsVal * spec.contractSize;
      if ((s.endsWith('JPY') || s.endsWith('CAD') || s.endsWith('CHF')) && exitP > 0) {
        raw = raw / exitP;
      }
      return Number(raw.toFixed(2));
    };

    if (rawPath.includes('reconcile-account')) {
      const userEmail = String(body.userEmail || body.email || '').trim().toLowerCase();
      const accountNumber = String(body.accountNumber || '').trim();
      if (!userEmail) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ success: false, error: 'userEmail is required' }) };
      }
      try {
        const finRes = await fetch(
          `${sbUrl}/rest/v1/vtm_user_finances?user_email=eq.${encodeURIComponent(userEmail)}&select=*&order=last_updated.desc`,
          { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
        );
        const finRows = finRes.ok ? await finRes.json() : [];
        const fin = Array.isArray(finRows) && finRows.length > 0 ? finRows[0] : null;
        const accounts = Array.isArray(fin?.accounts) ? fin.accounts : [];
        const targetAcc = accountNumber
          ? accounts.find((a) => a.accountNumber === accountNumber || a.id === accountNumber)
          : accounts[0];
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            userEmail,
            walletBalance: Number(fin?.wallet_balance || 0),
            selectedAccountId: fin?.selected_account_id || null,
            account: targetAcc || null,
            reconciled: true,
            timestamp: Date.now(),
          }),
        };
      } catch (err) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
      }
    }

    const positions = Array.isArray(body.positions) ? body.positions : [];
    const quotes = body.quotes || cachedQuotes || {};
    const evaluated = positions.map((pos) => {
      const sym = String(pos.symbol || 'EURUSD').trim().toUpperCase();
      const spec = getSpec(sym);
      const side = pos.side === 'SELL' ? 'SELL' : 'BUY';
      const lots = Math.max(0.01, Number(pos.lots || pos.lotSize || 0.01));
      const openPrice = Number(pos.openPrice || 0);
      const q = quotes[sym];
      const execPrice = Number(
        (side === 'BUY' ? q?.bid ?? pos.currentPrice ?? openPrice : q?.ask ?? pos.currentPrice ?? openPrice).toFixed(spec.decimals)
      );
      const floatingPnl = calcPnl(sym, side, openPrice, execPrice, lots);
      return {
        id: pos.id,
        ticket: pos.ticket,
        symbol: sym,
        side,
        lots,
        openPrice,
        currentPrice: execPrice,
        pnl: floatingPnl,
      };
    });
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, evaluated, timestamp: Date.now() }) };
  }

  // 7b. Platform Database Fallback (/api/platform-db)
  if (rawPath.includes('platform-db')) {
    const dbFilePath = '/tmp/.platform-db.json';
    const now = Date.now();
    const getSeedData = () => ({
      users: {
        'mutwirib964@gmail.com': {
          id: '84a1e1db-f302-4dac-a077-291128ae0cea',
          name: 'mutwiri',
          email: 'mutwirib964@gmail.com',
          phoneNumber: '+254 741114162',
          phone: '+254 741114162',
          countryCode: '+254',
          countryName: 'Kenya',
          accountNumber: '27330648',
          role: 'admin',
          isLoggedIn: true,
          createdAt: 1790257470000,
        },
        'joelndungu1022@gmail.com': {
          id: 'c2940f1a-8e33-411b-a910-763566710220',
          name: 'Joel Ndungu',
          email: 'joelndungu1022@gmail.com',
          phoneNumber: '+254 700000000',
          phone: '+254 700000000',
          countryCode: '+254',
          countryName: 'Kenya',
          accountNumber: '7635667',
          role: 'marketer',
          isLoggedIn: true,
          createdAt: 1790340000000,
        },
        'kelvinmunene263@gmail.com': {
          id: 'b1839e2b-7c44-422c-b821-849201402630',
          name: 'Kelvin Munene',
          email: 'kelvinmunene263@gmail.com',
          phoneNumber: '+254 712345678',
          phone: '+254 712345678',
          countryCode: '+254',
          countryName: 'Kenya',
          accountNumber: '8492014',
          role: 'normal',
          isLoggedIn: true,
          createdAt: 1790420000000,
        },
      },
      passwords: {},
      financesByEmail: {
        'mutwirib964@gmail.com': {
          walletBalance: 0,
          accounts: [
            {
              id: 'acc-27330648',
              accountNumber: '27330648',
              server: 'VTMarkets-LiveServer1',
              type: 'Live',
              tier: 'Premium',
              balance: 0,
              equity: 0,
              margin: 0,
              freeMargin: 0,
              marginLevel: 0,
              currency: 'USD',
              leverage: '1:500',
              createdAt: 1790257470000,
            },
          ],
          selectedAccountId: 'acc-27330648',
          transactions: [],
          lastUpdated: now,
        },
        'joelndungu1022@gmail.com': {
          walletBalance: 352.0,
          accounts: [
            {
              id: 'acc-7635667',
              accountNumber: '7635667',
              server: 'VTMarkets-LiveServer1',
              type: 'Live',
              tier: 'Premium',
              balance: 201.39,
              equity: 201.39,
              margin: 0,
              freeMargin: 201.39,
              marginLevel: 0,
              currency: 'USD',
              leverage: '1:500',
              createdAt: 1790340000000,
            },
            {
              id: 'acc-7821884',
              accountNumber: '7821884',
              server: 'VTMarkets-DemoServer',
              type: 'Demo',
              tier: 'Premium',
              balance: 131936.92,
              equity: 131936.92,
              margin: 0,
              freeMargin: 131936.92,
              marginLevel: 0,
              currency: 'USD',
              leverage: '1:500',
              createdAt: 1790340000000,
            },
          ],
          selectedAccountId: 'acc-7635667',
          transactions: [
            {
              id: 'tx-joel-dep-1',
              type: 'DEPOSIT',
              method: 'M-Pesa Express',
              amount: 352.0,
              currency: 'USD',
              status: 'COMPLETED',
              timestamp: 1790341000000,
              reference: 'MPESA-JOEL-352',
              accountNumber: 'VTM Wallet',
              details: 'M-Pesa Deposit to VTM Wallet',
            },
          ],
          lastUpdated: now,
        },
        'kelvinmunene263@gmail.com': {
          walletBalance: 0,
          accounts: [
            {
              id: 'acc-8492014',
              accountNumber: '8492014',
              server: 'VTMarkets-LiveServer1',
              type: 'Live',
              tier: 'Premium',
              balance: 16.0,
              equity: 16.0,
              margin: 0,
              freeMargin: 16.0,
              marginLevel: 0,
              currency: 'USD',
              leverage: '1:500',
              createdAt: 1790420000000,
            },
          ],
          selectedAccountId: 'acc-8492014',
          transactions: [
            {
              id: 'tx-kelvin-dep-1',
              type: 'DEPOSIT',
              method: 'M-Pesa Express',
              amount: 16.0,
              currency: 'USD',
              status: 'COMPLETED',
              timestamp: 1790421000000,
              reference: 'MPESA-KELVIN-16',
              accountNumber: '8492014',
              details: 'M-Pesa Deposit to #8492014',
            },
          ],
          lastUpdated: now,
        },
      },
      cloudStates: {},
    });

    const loadDb = () => {
      const seed = getSeedData();
      try {
        if (fs.existsSync(dbFilePath)) {
          const parsed = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
          return {
            users: { ...seed.users, ...(parsed.users || {}) },
            passwords: { ...seed.passwords, ...(parsed.passwords || {}) },
            financesByEmail: { ...seed.financesByEmail, ...(parsed.financesByEmail || {}) },
            cloudStates: { ...seed.cloudStates, ...(parsed.cloudStates || {}) },
          };
        }
      } catch {}
      return seed;
    };

    const saveDb = (db) => {
      try {
        fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
      } catch {}
    };

    const db = loadDb();

    if (event.httpMethod === 'GET') {
      const emailParam = String(event.queryStringParameters?.email || '').trim().toLowerCase();
      const stateKeyParam = String(event.queryStringParameters?.stateKey || '').trim();

      if (emailParam && stateKeyParam) {
        const data = db.cloudStates?.[emailParam]?.[stateKeyParam] || null;
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, data }) };
      }

      if (emailParam) {
        const isAdmin =
          emailParam === 'mutwirib964@gmail.com' ||
          emailParam === 'mutwrib@gmail.com' ||
          emailParam === 'mutwirib@gmail.com';
        const lookupEmail = isAdmin ? 'mutwirib964@gmail.com' : emailParam;
        const user = db.users[lookupEmail] || null;
        const password = db.passwords[lookupEmail] || '';
        const finances = db.financesByEmail[lookupEmail] || null;
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, user, password, finances }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          users: Object.values(db.users),
          passwords: db.passwords,
          financesByEmail: db.financesByEmail,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const action = body.action;
      if (action === 'upsert_user' && body.user?.email) {
        const rawEmail = String(body.user.email).trim().toLowerCase();
        const isAdmin =
          rawEmail === 'mutwirib964@gmail.com' ||
          rawEmail === 'mutwrib@gmail.com' ||
          rawEmail === 'mutwirib@gmail.com';
        const cleanEmail = isAdmin ? 'mutwirib964@gmail.com' : rawEmail;
        const existing = db.users[cleanEmail] || {};
        db.users[cleanEmail] = {
          ...existing,
          ...body.user,
          email: cleanEmail,
          id: isAdmin
            ? '84a1e1db-f302-4dac-a077-291128ae0cea'
            : body.user.id || existing.id,
          role: isAdmin
            ? 'admin'
            : body.user.role === 'marketer' || existing.role === 'marketer'
            ? 'marketer'
            : 'normal',
          createdAt: existing.createdAt || body.user.createdAt || Date.now(),
        };
        if (body.password && String(body.password).trim()) {
          db.passwords[cleanEmail] = String(body.password).trim();
        }
        saveDb(db);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, user: db.users[cleanEmail] }),
        };
      }

      if (action === 'bulk_upsert_users' && Array.isArray(body.users)) {
        let count = 0;
        body.users.forEach((rawUser) => {
          if (!rawUser || !rawUser.email) return;
          const rawEmail = String(rawUser.email).trim().toLowerCase();
          const isAdmin =
            rawEmail === 'mutwirib964@gmail.com' ||
            rawEmail === 'mutwrib@gmail.com' ||
            rawEmail === 'mutwirib@gmail.com';
          const cleanEmail = isAdmin ? 'mutwirib964@gmail.com' : rawEmail;
          const existing = db.users[cleanEmail] || {};
          const resolvedUid = isAdmin
            ? '84a1e1db-f302-4dac-a077-291128ae0cea'
            : rawUser.uid || rawUser.id || existing.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const safeRole = isAdmin
            ? 'admin'
            : rawUser.role === 'marketer' || existing.role === 'marketer'
            ? 'marketer'
            : 'normal';

          db.users[cleanEmail] = {
            ...existing,
            ...rawUser,
            email: cleanEmail,
            id: resolvedUid,
            name: isAdmin ? 'mutwiri' : rawUser.name || existing.name || cleanEmail.split('@')[0],
            role: safeRole,
            createdAt: existing.createdAt || rawUser.createdAt || (rawUser.created_at ? new Date(rawUser.created_at).getTime() : Date.now()),
            accountNumber: rawUser.account_number || rawUser.accountNumber || existing.accountNumber || String(Math.floor(10000000 + Math.random() * 90000000)),
            countryCode: rawUser.country_code || rawUser.countryCode || existing.countryCode || '+254',
            countryName: rawUser.country_name || rawUser.countryName || existing.countryName || 'Kenya',
            phoneNumber: rawUser.phone_number || rawUser.phoneNumber || existing.phoneNumber || '',
            phone: rawUser.phone_number || rawUser.phoneNumber || existing.phone || '',
            referredByCode: rawUser.referred_by_code || rawUser.referredByCode || existing.referredByCode || undefined,
          };

          if (rawUser.password_hash) {
            const match = String(rawUser.password_hash).match(/^uid:[^|]+\|(.*)$/);
            if (match && match[1]) {
              db.passwords[cleanEmail] = match[1];
            }
          } else if (rawUser.password) {
            db.passwords[cleanEmail] = String(rawUser.password).trim();
          }

          count++;
        });

        saveDb(db);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, count, totalUsers: Object.keys(db.users).length }),
        };
      }

      if (action === 'update_role' && body.email) {
        const rawEmail = String(body.email).trim().toLowerCase();
        const isAdmin =
          rawEmail === 'mutwirib964@gmail.com' ||
          rawEmail === 'mutwrib@gmail.com' ||
          rawEmail === 'mutwirib@gmail.com';
        const cleanEmail = isAdmin ? 'mutwirib964@gmail.com' : rawEmail;
        const safeRole = isAdmin ? 'admin' : body.role === 'marketer' ? 'marketer' : 'normal';
        if (db.users[cleanEmail]) {
          db.users[cleanEmail].role = safeRole;
        }
        saveDb(db);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, user: db.users[cleanEmail] }),
        };
      }

      if (action === 'upsert_finances' && body.email && body.finances) {
        const rawEmail = String(body.email).trim().toLowerCase();
        const isAdmin =
          rawEmail === 'mutwirib964@gmail.com' ||
          rawEmail === 'mutwrib@gmail.com' ||
          rawEmail === 'mutwirib@gmail.com';
        const cleanEmail = isAdmin ? 'mutwirib964@gmail.com' : rawEmail;
        db.financesByEmail[cleanEmail] = {
          ...(db.financesByEmail[cleanEmail] || {}),
          ...body.finances,
          lastUpdated: Date.now(),
        };
        saveDb(db);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'upsert_cloud_state' && body.email && body.stateKey) {
        const cleanEmail = String(body.email).trim().toLowerCase();
        if (!db.cloudStates[cleanEmail]) db.cloudStates[cleanEmail] = {};
        db.cloudStates[cleanEmail][body.stateKey] = body.data;
        saveDb(db);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false }) };
    }
  }

  // 8. ForexFactory Calendar (/api/forexfactory-calendar)
  if (rawPath.includes('forexfactory-calendar')) {
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

  // 9. Market News (/api/market-news & /api/forexfactory-news)
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
