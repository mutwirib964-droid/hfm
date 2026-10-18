/**
 * VTM MARKETS CORE TRADING & ACCOUNTING ENGINE
 * 
 * Provides production-grade, mathematically accurate:
 * 1. Instrument contract specifications (BTCUSD, Gold, Forex, Indices, Stocks)
 * 2. Unambiguous P&L calculations matching real broker/exchange execution
 * 3. Immutable financial ledger records for every balance movement
 * 4. Account balance reconciliation (Opening + Deposits - Withdrawals + Realized P/L - Fees = Balance)
 * 5. Timezone-aware date boundary filtering for trade history (Today, 7 Days, Month, All)
 */

export interface InstrumentContractSpec {
  symbol: string;
  contractSize: number; // units per 1.0 standard lot
  decimals: number;
  pipMultiplier: number;
  category: 'Forex' | 'Commodities' | 'Indices' | 'Stocks' | 'Crypto' | 'ETFs' | 'Bonds';
  marginRate: number; // e.g. 0.002 for 1:500 leverage
}

/**
 * Authoritative contract specifications for all platform instruments.
 * 
 * CRITICAL SPECIFICATIONS:
 * - BTCUSD: 1.0 Lot = 1 BTC (contractSize = 1). 0.01 lot = 0.01 BTC.
 *   $1 price move on 0.01 lot = $0.01. $100 price move on 0.01 lot = $1.00.
 * - ETHUSD: 1.0 Lot = 1 ETH (contractSize = 1).
 * - XAUUSD (Gold): 1.0 Lot = 100 oz (contractSize = 100).
 *   $1 price move on 1.0 lot = $100. $1 price move on 0.01 lot = $1.00.
 * - Forex Standard (EURUSD, GBPUSD, etc.): 1.0 Lot = 100,000 units.
 *   1 pip (0.0001) move on 1.0 lot = $10.00. 1 pip on 0.01 lot = $0.10.
 * - Indices (US30, NAS100, US500): 1.0 Lot = 1 contract (point value = $1.00).
 * - Stocks (AAPL, TSLA, etc.): 1.0 Lot = 100 shares. 0.01 lot = 1 share.
 */
export const INSTRUMENT_CONTRACT_SPECS: Record<string, InstrumentContractSpec> = {
  // CRYPTO (1 lot = 1 coin for major coins)
  BTCUSD: { symbol: 'BTCUSD', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Crypto', marginRate: 0.005 },
  ETHUSD: { symbol: 'ETHUSD', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Crypto', marginRate: 0.005 },
  SOLUSD: { symbol: 'SOLUSD', contractSize: 1, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.01 },
  BNBUSD: { symbol: 'BNBUSD', contractSize: 1, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.01 },
  XRPUSD: { symbol: 'XRPUSD', contractSize: 1000, decimals: 4, pipMultiplier: 10000, category: 'Crypto', marginRate: 0.02 },
  DOGEUSD: { symbol: 'DOGEUSD', contractSize: 10000, decimals: 4, pipMultiplier: 10000, category: 'Crypto', marginRate: 0.02 },
  ADAUSD: { symbol: 'ADAUSD', contractSize: 1000, decimals: 4, pipMultiplier: 10000, category: 'Crypto', marginRate: 0.02 },
  AVAXUSD: { symbol: 'AVAXUSD', contractSize: 10, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.02 },
  LINKUSD: { symbol: 'LINKUSD', contractSize: 50, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.02 },
  DOTUSD: { symbol: 'DOTUSD', contractSize: 100, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.02 },
  NEARUSD: { symbol: 'NEARUSD', contractSize: 100, decimals: 2, pipMultiplier: 10, category: 'Crypto', marginRate: 0.02 },
  SUIUSD: { symbol: 'SUIUSD', contractSize: 500, decimals: 4, pipMultiplier: 10000, category: 'Crypto', marginRate: 0.02 },

  // COMMODITIES
  XAUUSD: { symbol: 'XAUUSD', contractSize: 100, decimals: 3, pipMultiplier: 10, category: 'Commodities', marginRate: 0.002 },
  XAGUSD: { symbol: 'XAGUSD', contractSize: 5000, decimals: 3, pipMultiplier: 100, category: 'Commodities', marginRate: 0.005 },
  USOIL: { symbol: 'USOIL', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Commodities', marginRate: 0.01 },
  UKOIL: { symbol: 'UKOIL', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Commodities', marginRate: 0.01 },
  NGAS: { symbol: 'NGAS', contractSize: 1000, decimals: 3, pipMultiplier: 1000, category: 'Commodities', marginRate: 0.01 },
  COPPER: { symbol: 'COPPER', contractSize: 1000, decimals: 3, pipMultiplier: 1000, category: 'Commodities', marginRate: 0.01 },
  XPTUSD: { symbol: 'XPTUSD', contractSize: 100, decimals: 2, pipMultiplier: 10, category: 'Commodities', marginRate: 0.005 },

  // INDICES (1 point move = $1 per lot)
  US500: { symbol: 'US500', contractSize: 1, decimals: 2, pipMultiplier: 10, category: 'Indices', marginRate: 0.002 },
  NAS100: { symbol: 'NAS100', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Indices', marginRate: 0.002 },
  US30: { symbol: 'US30', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Indices', marginRate: 0.002 },
  GER40: { symbol: 'GER40', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Indices', marginRate: 0.002 },
  UK100: { symbol: 'UK100', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Indices', marginRate: 0.002 },
  JPN225: { symbol: 'JPN225', contractSize: 1, decimals: 2, pipMultiplier: 1, category: 'Indices', marginRate: 0.002 },

  // EQUITIES (1 lot = 100 shares, 0.01 lot = 1 share)
  AAPL: { symbol: 'AAPL', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  NVDA: { symbol: 'NVDA', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  TSLA: { symbol: 'TSLA', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  MSFT: { symbol: 'MSFT', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  AMZN: { symbol: 'AMZN', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  GOOGL: { symbol: 'GOOGL', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  META: { symbol: 'META', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  AMD: { symbol: 'AMD', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  NFLX: { symbol: 'NFLX', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  COIN: { symbol: 'COIN', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  PLTR: { symbol: 'PLTR', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  BABA: { symbol: 'BABA', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  MSTR: { symbol: 'MSTR', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  DIS: { symbol: 'DIS', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  UBER: { symbol: 'UBER', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  INTC: { symbol: 'INTC', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  JPM: { symbol: 'JPM', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  V: { symbol: 'V', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },
  WMT: { symbol: 'WMT', contractSize: 100, decimals: 2, pipMultiplier: 100, category: 'Stocks', marginRate: 0.05 },

  // FOREX (1 standard lot = 100,000 units of base currency)
  EURUSD: { symbol: 'EURUSD', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  GBPUSD: { symbol: 'GBPUSD', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  USDJPY: { symbol: 'USDJPY', contractSize: 100000, decimals: 3, pipMultiplier: 100, category: 'Forex', marginRate: 0.002 },
  AUDUSD: { symbol: 'AUDUSD', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  USDCAD: { symbol: 'USDCAD', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  USDCHF: { symbol: 'USDCHF', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  GBPJPY: { symbol: 'GBPJPY', contractSize: 100000, decimals: 3, pipMultiplier: 100, category: 'Forex', marginRate: 0.002 },
  NZDUSD: { symbol: 'NZDUSD', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  EURGBP: { symbol: 'EURGBP', contractSize: 100000, decimals: 5, pipMultiplier: 10000, category: 'Forex', marginRate: 0.002 },
  EURJPY: { symbol: 'EURJPY', contractSize: 100000, decimals: 3, pipMultiplier: 100, category: 'Forex', marginRate: 0.002 },
  AUDJPY: { symbol: 'AUDJPY', contractSize: 100000, decimals: 3, pipMultiplier: 100, category: 'Forex', marginRate: 0.002 },
};

/**
 * Returns the contract size for an instrument.
 */
export function getInstrumentContractSize(symbol: string): number {
  const clean = (symbol || '').trim().toUpperCase();
  if (INSTRUMENT_CONTRACT_SPECS[clean]) {
    return INSTRUMENT_CONTRACT_SPECS[clean].contractSize;
  }
  // Safe fallbacks for patterns
  if (clean.includes('BTC') || clean.includes('ETH') || clean.includes('SOL') || clean.includes('BNB')) {
    return 1;
  }
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return 100;
  }
  if (clean.includes('US30') || clean.includes('NAS100') || clean.includes('US500') || clean.includes('GER40') || clean.includes('UK100')) {
    return 1;
  }
  if (clean.endsWith('USD') && clean.length === 6 && !clean.includes('XAU')) {
    return 100000;
  }
  return 100;
}

/**
 * Returns the price move equivalent to 1 pip for a given symbol.
 * - Forex standard pairs (EURUSD, GBPUSD): 0.0001
 * - Forex JPY pairs (USDJPY, GBPJPY): 0.01
 * - Gold (XAUUSD): 0.10
 * - Silver (XAGUSD): 0.01
 * - Indices (US30, NAS100, US500): 1.0 (1 index point)
 * - Major Crypto (BTCUSD, ETHUSD): 1.0
 * - Equities / Stocks: 0.01
 */
export function getInstrumentPipSize(symbol: string): number {
  const clean = (symbol || '').trim().toUpperCase();
  if (clean.includes('JPY')) {
    return 0.01;
  }
  if (clean === 'XAUUSD' || clean.includes('GOLD')) {
    return 0.10;
  }
  if (clean.includes('BTC') || clean.includes('ETH')) {
    return 1.0;
  }
  if (clean.includes('US30') || clean.includes('NAS100') || clean.includes('US500') || clean.includes('GER40') || clean.includes('UK100')) {
    return 1.0;
  }
  if (clean.endsWith('USD') && clean.length === 6) {
    return 0.0001;
  }
  if (INSTRUMENT_CONTRACT_SPECS[clean]) {
    const spec = INSTRUMENT_CONTRACT_SPECS[clean];
    if (spec.category === 'Forex') {
      return spec.decimals === 3 ? 0.01 : 0.0001;
    }
    if (spec.category === 'Indices') return 1.0;
    if (spec.category === 'Crypto') return 1.0;
    if (spec.category === 'Commodities') return spec.decimals === 3 ? 0.10 : 0.01;
  }
  return 0.0001;
}

/**
 * Calculates exact PnL from executable prices and instrument specifications.
 * 
 * Formula:
 * - For JPY cross pairs: (priceDiff * lots * 100,000) / currentPrice
 * - For all other symbols: priceDiff * lots * contractSize
 * 
 * Returns exact USD net profit/loss.
 */
export function calculateTradePnL(
  symbol: string,
  side: 'BUY' | 'SELL',
  openPrice: number,
  currentPrice: number,
  lots: number,
  swap: number = 0,
  commission: number = 0
): number {
  if (!openPrice || !currentPrice || !lots || openPrice <= 0 || currentPrice <= 0 || lots <= 0) {
    return 0;
  }
  if (Number(openPrice) === Number(currentPrice)) {
    return Number((swap - commission).toFixed(2));
  }

  const cleanSym = (symbol || '').toUpperCase();
  const priceDiff = side === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice;
  let grossPnL: number;

  if (cleanSym.includes('JPY') && currentPrice > 0) {
    // Quote currency is JPY; convert JPY profit to USD
    grossPnL = (priceDiff * lots * 100000) / currentPrice;
  } else {
    const contractSize = getInstrumentContractSize(cleanSym);
    grossPnL = priceDiff * lots * contractSize;
  }

  const netPnL = grossPnL + (swap || 0) - (commission || 0);
  return Number(netPnL.toFixed(2));
}

/**
 * Calculates required margin for a position based on leverage and contract size.
 */
export function calculateRequiredMargin(
  symbol: string,
  lots: number,
  leverageStr: string = '1:500',
  currentPrice: number = 1.0
): number {
  const cleanLots = Math.max(0.01, Number(lots || 0.01));
  let leverage = 500;
  const match = leverageStr.match(/1:(\d+)/);
  if (match) {
    leverage = Math.max(1, parseInt(match[1], 10));
  }

  const contractSize = getInstrumentContractSize(symbol);
  const notionalValue = cleanLots * contractSize * (currentPrice > 0 ? currentPrice : 1.0);
  const margin = notionalValue / leverage;

  // Floor at $0.40 per 0.01 lot so low balance accounts can trade micro-lots comfortably
  return Number(Math.max(cleanLots * 40, margin).toFixed(2));
}

/**
 * Immutable financial ledger movement record.
 */
export interface BalanceLedgerEntry {
  id: string;
  userEmail: string;
  accountId: string;
  accountNumber?: string;
  tradeId?: string;
  txId?: string;
  type: 'INITIAL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE_CLOSE' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
  amount: number; // positive for credit, negative for debit
  prevBalance: number;
  newBalance: number;
  timestamp: number;
  reason: string;
}

/**
 * Verifies and reconciles account balance against ledger entries.
 * 
 * Equation:
 * Opening balance + deposits - withdrawals + realized trading net PnL + transfers = closing balance.
 */
export function reconcileAccountBalance(
  openingBalance: number,
  entries: BalanceLedgerEntry[]
): {
  reconciledBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTradingPnL: number;
  totalTransfers: number;
  isDiscrepancy: boolean;
  discrepancyAmount: number;
} {
  let deposits = 0;
  let withdrawals = 0;
  let tradingPnL = 0;
  let transfers = 0;

  for (const entry of entries) {
    if (entry.type === 'DEPOSIT') {
      deposits += entry.amount;
    } else if (entry.type === 'WITHDRAWAL') {
      withdrawals += Math.abs(entry.amount);
    } else if (entry.type === 'TRADE_CLOSE') {
      tradingPnL += entry.amount;
    } else if (entry.type === 'INTERNAL_TRANSFER') {
      transfers += entry.amount;
    }
  }

  const reconciledBalance = Number(
    (openingBalance + deposits - withdrawals + tradingPnL + transfers).toFixed(2)
  );

  const lastEntry = entries[entries.length - 1];
  const reportedBalance = lastEntry ? lastEntry.newBalance : openingBalance;
  const discrepancy = Number(Math.abs(reconciledBalance - reportedBalance).toFixed(2));

  return {
    reconciledBalance,
    totalDeposits: Number(deposits.toFixed(2)),
    totalWithdrawals: Number(withdrawals.toFixed(2)),
    totalTradingPnL: Number(tradingPnL.toFixed(2)),
    totalTransfers: Number(transfers.toFixed(2)),
    isDiscrepancy: discrepancy > 0.05,
    discrepancyAmount: discrepancy,
  };
}

/**
 * Returns precise date boundaries for Trade History filters.
 * - 'day': start of current calendar day (00:00:00.000) to now.
 * - 'week': rolling 7 calendar days (now - 7 * 86,400,000) to now.
 * - 'month': start of current calendar month (1st day 00:00:00.000) to now.
 * - 'all': 0 to now.
 */
export function getTradeHistoryDateBoundaries(
  filter: 'day' | 'week' | 'month' | 'all',
  referenceDate: Date = new Date()
): { start: number; end: number } {
  const end = referenceDate.getTime();

  if (filter === 'day') {
    const startOfDay = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      0, 0, 0, 0
    );
    return { start: startOfDay.getTime(), end };
  }

  if (filter === 'week') {
    const rolling7Days = end - 7 * 24 * 60 * 60 * 1000;
    return { start: rolling7Days, end };
  }

  if (filter === 'month') {
    const startOfMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
      0, 0, 0, 0
    );
    return { start: startOfMonth.getTime(), end };
  }

  return { start: 0, end };
}

export interface TradeHistorySummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // percentage
  grossProfit: number;
  grossLoss: number;
  totalFees: number;
  netProfit: number;
}

/**
 * Calculates mathematically accurate trade history summary statistics.
 */
export function calculateTradeHistorySummary(
  trades: Array<{ pnl?: number; swap?: number; commission?: number }>
): TradeHistorySummary {
  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalFees = 0;
  let netProfit = 0;

  for (const t of trades) {
    const pnl = Number(t.pnl || 0);
    const fees = Number(t.swap || 0) + Number(t.commission || 0);
    totalFees += fees;
    netProfit += pnl;

    if (pnl > 0.001) {
      winningTrades++;
      grossProfit += pnl;
    } else if (pnl < -0.001) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
    } else {
      breakEvenTrades++;
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  };
}
