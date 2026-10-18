/**
 * Universal Contract Specifications & PnL Engine for VTM Markets
 * MetaTrader 5 & Institutional CFD Standard
 */

export interface InstrumentSpec {
  symbol: string;
  category: 'Forex' | 'Commodities' | 'Indices' | 'Stocks' | 'Crypto' | 'ETFs' | 'Bonds';
  contractSize: number; // USD-normalized units per 1.00 lot
  minLot: number;
  maxLot: number;
  lotStep: number;
  decimals: number;
  tickSize: number; // Minimum price increment (point)
  pipSize: number; // Standard 1.0 pip price increment
  marginRate: number; // e.g. 0.002 for 1:500 leverage (0.2%)
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  // Forex Majors & Minors (5-decimal pairs: 100,000 units per 1.00 lot, 1 pip = 0.0001 -> $0.10 per pip on 0.01 lot)
  EURUSD: { symbol: 'EURUSD', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  GBPUSD: { symbol: 'GBPUSD', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  AUDUSD: { symbol: 'AUDUSD', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  USDCAD: { symbol: 'USDCAD', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  USDCHF: { symbol: 'USDCHF', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  NZDUSD: { symbol: 'NZDUSD', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },
  EURGBP: { symbol: 'EURGBP', category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 },

  // Forex JPY Pairs (3-decimal pairs: USD-normalized contractSize = 1,000 per 1.00 JPY move, 1 pip = 0.01 -> $0.10 per pip on 0.01 lot)
  USDJPY: { symbol: 'USDJPY', category: 'Forex', contractSize: 1000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.002 },
  GBPJPY: { symbol: 'GBPJPY', category: 'Forex', contractSize: 1000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.002 },
  EURJPY: { symbol: 'EURJPY', category: 'Forex', contractSize: 1000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.002 },
  AUDJPY: { symbol: 'AUDJPY', category: 'Forex', contractSize: 1000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.002 },

  // Commodities & Metals
  // Gold: 100 troy ounces per lot. 1 pip = $0.10 ($0.10 per pip on 0.01 lot; $1.00 move = 10 pips = $1.00 on 0.01 lot)
  XAUUSD: { symbol: 'XAUUSD', category: 'Commodities', contractSize: 100, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.01, pipSize: 0.10, marginRate: 0.005 },
  // Silver: 5,000 troy ounces per lot, 1 pip = 0.01
  XAGUSD: { symbol: 'XAGUSD', category: 'Commodities', contractSize: 5000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.01 },
  // Crude Oil: 1,000 barrels per lot. 1 pip = $0.01 ($0.10 per pip on 0.01 lot; $0.10 move = 10 pips = $1.00 on 0.01 lot)
  USOIL: { symbol: 'USOIL', category: 'Commodities', contractSize: 1000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.01, marginRate: 0.01 },
  UKOIL: { symbol: 'UKOIL', category: 'Commodities', contractSize: 1000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.01, marginRate: 0.01 },
  NGAS: { symbol: 'NGAS', category: 'Commodities', contractSize: 10000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.001, marginRate: 0.01 },
  COPPER: { symbol: 'COPPER', category: 'Commodities', contractSize: 25000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.001, marginRate: 0.01 },
  XPTUSD: { symbol: 'XPTUSD', category: 'Commodities', contractSize: 100, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.01 },

  // Indices (10 index contracts per 1.00 lot standard, 1 pip = 1.0 index point = $10.00 per 1.00 lot)
  US500: { symbol: 'US500', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },
  NAS100: { symbol: 'NAS100', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },
  US30: { symbol: 'US30', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },
  GER40: { symbol: 'GER40', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },
  UK100: { symbol: 'UK100', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },
  JPN225: { symbol: 'JPN225', category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 },

  // Crypto 24/7 (Adjusted to $10.00 per pip on 1.00 lot standard)
  // For BTCUSD: 1.00 lot = 10 BTC. 1 pip = $1.00 move ($10.00 per pip on 1.00 lot; $0.10 per pip on 0.01 lot)
  BTCUSD: { symbol: 'BTCUSD', category: 'Crypto', contractSize: 10, minLot: 0.01, maxLot: 20, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.01 },
  // For ETHUSD: 1.00 lot = 100 ETH. 1 pip = $0.10 move ($10.00 per pip on 1.00 lot; $0.10 per pip on 0.01 lot)
  ETHUSD: { symbol: 'ETHUSD', category: 'Crypto', contractSize: 100, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.1, marginRate: 0.01 },
  // For SOLUSD: 1.00 lot = 100 SOL. 1 pip = $0.10 move ($10.00 per pip on 1.00 lot; $0.10 per pip on 0.01 lot)
  SOLUSD: { symbol: 'SOLUSD', category: 'Crypto', contractSize: 100, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.1, marginRate: 0.01 },
  XRPUSD: { symbol: 'XRPUSD', category: 'Crypto', contractSize: 10000, minLot: 0.01, maxLot: 500, lotStep: 0.01, decimals: 4, tickSize: 0.0001, pipSize: 0.001, marginRate: 0.02 },
  BNBUSD: { symbol: 'BNBUSD', category: 'Crypto', contractSize: 20, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.50, marginRate: 0.02 },
  DOGEUSD: { symbol: 'DOGEUSD', category: 'Crypto', contractSize: 100000, minLot: 0.01, maxLot: 500, lotStep: 0.01, decimals: 4, tickSize: 0.0001, pipSize: 0.0001, marginRate: 0.02 },
  ADAUSD: { symbol: 'ADAUSD', category: 'Crypto', contractSize: 10000, minLot: 0.01, maxLot: 500, lotStep: 0.01, decimals: 4, tickSize: 0.0001, pipSize: 0.001, marginRate: 0.02 },
  AVAXUSD: { symbol: 'AVAXUSD', category: 'Crypto', contractSize: 100, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.02 },
  LINKUSD: { symbol: 'LINKUSD', category: 'Crypto', contractSize: 200, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.05, marginRate: 0.02 },
  DOTUSD: { symbol: 'DOTUSD', category: 'Crypto', contractSize: 200, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.05, marginRate: 0.02 },
  NEARUSD: { symbol: 'NEARUSD', category: 'Crypto', contractSize: 200, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.05, marginRate: 0.02 },
  SUIUSD: { symbol: 'SUIUSD', category: 'Crypto', contractSize: 200, minLot: 0.01, maxLot: 200, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.05, marginRate: 0.02 },

  // US Equities (10 shares per 1.00 lot, 1 pip = $0.10)
  AAPL: { symbol: 'AAPL', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  NVDA: { symbol: 'NVDA', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  TSLA: { symbol: 'TSLA', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  MSFT: { symbol: 'MSFT', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  AMZN: { symbol: 'AMZN', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  GOOGL: { symbol: 'GOOGL', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  META: { symbol: 'META', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  AMD: { symbol: 'AMD', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  NFLX: { symbol: 'NFLX', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  COIN: { symbol: 'COIN', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  PLTR: { symbol: 'PLTR', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  BABA: { symbol: 'BABA', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  MSTR: { symbol: 'MSTR', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  DIS: { symbol: 'DIS', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  UBER: { symbol: 'UBER', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  INTC: { symbol: 'INTC', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  JPM: { symbol: 'JPM', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  V: { symbol: 'V', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },
  WMT: { symbol: 'WMT', category: 'Stocks', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.05 },

  // ETFs & Bonds
  SPY: { symbol: 'SPY', category: 'ETFs', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.02 },
  XLE: { symbol: 'XLE', category: 'ETFs', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.10, marginRate: 0.02 },
  'EUBUND.F': { symbol: 'EUBUND.F', category: 'Bonds', contractSize: 100, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.01, marginRate: 0.01 },
  'UKGILT.F': { symbol: 'UKGILT.F', category: 'Bonds', contractSize: 100, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.01, marginRate: 0.01 },
  'US10YR.F': { symbol: 'US10YR.F', category: 'Bonds', contractSize: 100, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.01, marginRate: 0.01 },
};

/**
 * Returns validated instrument specification, with safe fallback.
 */
export function getInstrumentSpec(symbol: string): InstrumentSpec {
  const clean = (symbol || '').toUpperCase().trim();
  if (INSTRUMENT_SPECS[clean]) {
    return INSTRUMENT_SPECS[clean];
  }
  if (clean.includes('JPY')) {
    return { symbol: clean, category: 'Forex', contractSize: 1000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.002 };
  }
  if (clean.includes('BTC')) {
    return { symbol: clean, category: 'Crypto', contractSize: 10, minLot: 0.01, maxLot: 20, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.01 };
  }
  if (clean.includes('ETH') || clean.includes('SOL')) {
    return { symbol: clean, category: 'Crypto', contractSize: 100, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 0.1, marginRate: 0.01 };
  }
  if (clean.includes('XAU')) {
    return { symbol: clean, category: 'Commodities', contractSize: 100, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.01, pipSize: 0.10, marginRate: 0.005 };
  }
  if (clean.includes('XAG')) {
    return { symbol: clean, category: 'Commodities', contractSize: 5000, minLot: 0.01, maxLot: 50, lotStep: 0.01, decimals: 3, tickSize: 0.001, pipSize: 0.01, marginRate: 0.01 };
  }
  if (clean.includes('US500') || clean.includes('NAS100') || clean.includes('US30') || clean.includes('GER40')) {
    return { symbol: clean, category: 'Indices', contractSize: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 2, tickSize: 0.01, pipSize: 1.0, marginRate: 0.005 };
  }
  // Default Forex
  return { symbol: clean, category: 'Forex', contractSize: 100000, minLot: 0.01, maxLot: 100, lotStep: 0.01, decimals: 5, tickSize: 0.00001, pipSize: 0.0001, marginRate: 0.002 };
}

/**
 * Accurate contract size resolver.
 */
export function getExactContractSize(symbol: string): number {
  return getInstrumentSpec(symbol).contractSize;
}

/**
 * Accurate 1-pip price increment resolver per instrument.
 */
export function getInstrumentPipSize(symbol: string): number {
  return getInstrumentSpec(symbol).pipSize;
}

/**
 * Computes exact Stop-Loss and Take-Profit prices from configured pips, openPrice, and side.
 */
export function calculatePipTargetPrices(
  symbolOrParams:
    | string
    | {
        symbol: string;
        side: 'BUY' | 'SELL';
        openPrice: number;
        slPips: number;
        tpPips: number;
      },
  sideArg?: 'BUY' | 'SELL',
  openPriceArg?: number,
  tpPipsArg?: number,
  slPipsArg?: number
): { slPrice: number; tpPrice: number; pipSize: number; decimals: number } {
  const symbol = typeof symbolOrParams === 'string' ? symbolOrParams : symbolOrParams.symbol;
  const side = typeof symbolOrParams === 'string' ? (sideArg || 'BUY') : symbolOrParams.side;
  const openPrice =
    typeof symbolOrParams === 'string' ? Number(openPriceArg || 0) : Number(symbolOrParams.openPrice || 0);
  const tpPips =
    typeof symbolOrParams === 'string' ? Number(tpPipsArg || 30) : Number(symbolOrParams.tpPips || 30);
  const slPips =
    typeof symbolOrParams === 'string' ? Number(slPipsArg || 20) : Number(symbolOrParams.slPips || 20);

  const spec = getInstrumentSpec(symbol);
  const cleanSlPips = Math.max(1, slPips);
  const cleanTpPips = Math.max(1, tpPips);
  const slOffset = cleanSlPips * spec.pipSize;
  const tpOffset = cleanTpPips * spec.pipSize;

  const tpPrice =
    side === 'BUY'
      ? Number((openPrice + tpOffset).toFixed(spec.decimals))
      : Number((openPrice - tpOffset).toFixed(spec.decimals));

  const slPrice =
    side === 'BUY'
      ? Number((openPrice - slOffset).toFixed(spec.decimals))
      : Number((openPrice + slOffset).toFixed(spec.decimals));

  return {
    slPrice,
    tpPrice,
    pipSize: spec.pipSize,
    decimals: spec.decimals,
  };
}

/**
 * Single authoritative PnL calculation engine.
 * Computes exact mathematical profit or loss based on:
 * - Symbol contract specifications
 * - Position direction (BUY / SELL)
 * - Entry (open) price
 * - Exit / Current market executable price
 * - Lot size
 * - Swap and commission
 *
 * Formula:
 * BUY:  (closePrice - openPrice) * contractSize * lots + swap - commission
 * SELL: (openPrice - closePrice) * contractSize * lots + swap - commission
 */
export function calculateUnifiedPnL(
  symbolOrParams:
    | string
    | {
        symbol: string;
        side: 'BUY' | 'SELL';
        openPrice: number;
        currentOrClosePrice: number;
        lots: number;
        swap?: number;
        commission?: number;
      },
  sideArg?: 'BUY' | 'SELL',
  openPriceArg?: number,
  closePriceArg?: number,
  lotsArg?: number,
  swapArg?: number,
  commArg?: number
): any {
  const symbol = typeof symbolOrParams === 'string' ? symbolOrParams : symbolOrParams.symbol;
  const side = typeof symbolOrParams === 'string' ? (sideArg || 'BUY') : symbolOrParams.side;
  const openPrice = typeof symbolOrParams === 'string' ? Number(openPriceArg || 0) : Number(symbolOrParams.openPrice || 0);
  const currentOrClosePrice = typeof symbolOrParams === 'string' ? Number(closePriceArg || 0) : Number(symbolOrParams.currentOrClosePrice || 0);
  const lots = typeof symbolOrParams === 'string' ? Number(lotsArg || 0.01) : Number(symbolOrParams.lots || 0.01);
  const swap = typeof symbolOrParams === 'string' ? Number(swapArg || 0) : Number(symbolOrParams.swap || 0);
  const commission = typeof symbolOrParams === 'string' ? Number(commArg || 0) : Number(symbolOrParams.commission || 0);

  if (!openPrice || !currentOrClosePrice || !lots || lots <= 0) {
    return typeof symbolOrParams === 'string' ? 0 : { grossPnl: 0, netPnl: 0, priceDiff: 0, pipsMoved: 0, swap, commission };
  }

  const spec = getInstrumentSpec(symbol);
  const priceDiff = side === 'BUY' ? currentOrClosePrice - openPrice : openPrice - currentOrClosePrice;
  const gross = priceDiff * spec.contractSize * lots;
  const pipsMoved = spec.pipSize > 0 ? Number((priceDiff / spec.pipSize).toFixed(1)) : 0;

  const grossPnl = Number(gross.toFixed(2));
  const netPnl = Number((grossPnl + swap - commission).toFixed(2));

  if (typeof symbolOrParams === 'string') {
    return netPnl;
  }

  return {
    grossPnl,
    netPnl,
    priceDiff: Number(priceDiff.toFixed(spec.decimals)),
    pipsMoved,
    swap,
    commission,
  };
}

/**
 * Calculate required margin for a position based on leverage and instrument specs.
 * Default leverage 1:500 (0.2%).
 */
export function calculateRequiredMargin(
  symbol: string,
  lots: number,
  price: number,
  leverageRatio = 500
): number {
  if (!lots || lots <= 0 || !price || price <= 0) return 0;
  const spec = getInstrumentSpec(symbol);
  const nominalValue = lots * spec.contractSize * price;
  const leverage = Math.max(1, leverageRatio);
  const margin = nominalValue / leverage;
  return Number(margin.toFixed(2));
}

/**
 * Validates stop loss and take profit values relative to entry price and side.
 */
export function validateStopLossTakeProfit(
  symbol: string,
  side: 'BUY' | 'SELL',
  openPrice: number,
  sl: number | null | undefined,
  tp: number | null | undefined
): { valid: boolean; error?: string } {
  const spec = getInstrumentSpec(symbol);
  const minDistance = spec.tickSize * 2;

  if (tp !== null && tp !== undefined && tp > 0) {
    if (side === 'BUY' && tp <= openPrice + minDistance) {
      return { valid: false, error: `Take Profit must be above entry price (${openPrice.toFixed(spec.decimals)})` };
    }
    if (side === 'SELL' && tp >= openPrice - minDistance) {
      return { valid: false, error: `Take Profit must be below entry price (${openPrice.toFixed(spec.decimals)})` };
    }
  }

  if (sl !== null && sl !== undefined && sl > 0) {
    if (side === 'BUY' && sl >= openPrice - minDistance) {
      return { valid: false, error: `Stop Loss must be below entry price (${openPrice.toFixed(spec.decimals)})` };
    }
    if (side === 'SELL' && sl <= openPrice + minDistance) {
      return { valid: false, error: `Stop Loss must be above entry price (${openPrice.toFixed(spec.decimals)})` };
    }
  }

  return { valid: true };
}
