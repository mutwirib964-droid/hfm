import { BotStrategyConfig, BotRunInstance, BotTrade, UserRole, BotType } from '../types/botTypes';
import { Instrument } from '../types';

export const DEFAULT_INBUILT_BOTS: BotStrategyConfig[] = [
  {
    id: 'vtm-trend-matrix',
    name: 'VTM Trend Matrix EA',
    type: 'INBUILT',
    tag: 'Trend Following',
    description: 'Institutional multi-timeframe trend filter using dynamic EMA ribbons, volume delta, and ATR trailing bands.',
    recommendedInstruments: ['XAUUSD', 'EURUSD', 'GBPUSD', 'NAS100'],
    defaultLotSize: 0.1,
    defaultTpPips: 35,
    defaultSlPips: 20,
    author: 'VTM Quantitative Labs',
    version: 'v4.8 Pro',
    timeframe: 'M15',
    strategyLogic: 'Triple EMA cross with Supertrend confirmation and Order Block validation.',
    indicatorTriggers: ['EMA 20/50/200', 'ATR 14 Volatility Filter', 'RSI 14 Dynamic Thresholds'],
    claimedWinRate: '86.4%',
  },
  {
    id: 'vtm-alpha-scalper',
    name: 'Alpha Scalper Pro',
    type: 'INBUILT',
    tag: 'High-Speed Scalping',
    description: 'High-frequency liquidity sweep & order book imbalance scalper engineered for Gold & Major FX pairs.',
    recommendedInstruments: ['XAUUSD', 'EURUSD', 'USDJPY', 'US30'],
    defaultLotSize: 0.05,
    defaultTpPips: 22,
    defaultSlPips: 15,
    author: 'VTM Algo Engineering',
    version: 'v3.2 Ultra',
    timeframe: 'M5',
    strategyLogic: 'Micro-liquidity sweep detection with instant market execution at key session pivots.',
    indicatorTriggers: ['VWAP Deviation Bands', 'Tick Volume Delta', 'Stochastic Momentum'],
    claimedWinRate: '84.8%',
  },
  {
    id: 'vtm-institutional-flow',
    name: 'Institutional Order Flow EA',
    type: 'INBUILT',
    tag: 'Smart Money (SMC)',
    description: 'Algorithmic Fair Value Gap (FVG) and Break of Structure (BOS) engine mimicking Tier-1 bank desk order flow.',
    recommendedInstruments: ['XAUUSD', 'BTCUSD', 'GBPUSD', 'US500'],
    defaultLotSize: 0.2,
    defaultTpPips: 45,
    defaultSlPips: 25,
    author: 'VTM Institutional Group',
    version: 'v5.1 Institutional',
    timeframe: 'H1',
    strategyLogic: 'Fair Value Gap mitigation with institutional liquidity grab identification.',
    indicatorTriggers: ['Fair Value Gap (FVG)', 'Market Structure Shift (MSS)', 'Liquidity Pools'],
    claimedWinRate: '88.1%',
  },
  {
    id: 'vtm-smart-grid',
    name: 'Smart Grid Nexus',
    type: 'INBUILT',
    tag: 'Asymmetric Grid',
    description: 'Adaptive mean-reversion grid with dynamic volatility stop and multi-stage take-profit hedging.',
    recommendedInstruments: ['EURUSD', 'USDCHF', 'AUDUSD', 'USDCAD'],
    defaultLotSize: 0.02,
    defaultTpPips: 30,
    defaultSlPips: 25,
    author: 'VTM Algo Engineering',
    version: 'v2.9 Hedged',
    timeframe: 'M30',
    strategyLogic: 'Dynamic ATR-spaced hedging matrix with automatic profit locking.',
    indicatorTriggers: ['Bollinger Bands 20/2', 'ADX Trend Filter', 'MACD Zero-Lag'],
    claimedWinRate: '83.2%',
  },
  {
    id: 'vtm-gold-hunter',
    name: 'Gold Bullion Sniper EA',
    type: 'INBUILT',
    tag: 'Precious Metals Breakout',
    description: 'Specialized XAUUSD breakout system capturing London and New York session bullion volatility impulses.',
    recommendedInstruments: ['XAUUSD', 'XAGUSD'],
    defaultLotSize: 0.1,
    defaultTpPips: 50,
    defaultSlPips: 25,
    author: 'VTM Metals Desk',
    version: 'v4.1 Bullion',
    timeframe: 'M15',
    strategyLogic: 'High-volume session breakout above/below Asian range highs and lows with dynamic ATR trailing.',
    indicatorTriggers: ['Asian High/Low Range', 'Keltner Channels', 'Volume Surge Index'],
    claimedWinRate: '87.5%',
  },
  {
    id: 'vtm-nasdaq-pulse',
    name: 'NASDAQ Quantum Surge EA',
    type: 'INBUILT',
    tag: 'High-Beta Momentum',
    description: 'Ultra-fast momentum algorithmic execution capturing opening bell momentum in US tech equities and indices.',
    recommendedInstruments: ['NAS100', 'US500', 'US30', 'TSLA', 'AAPL', 'NVDA'],
    defaultLotSize: 0.1,
    defaultTpPips: 60,
    defaultSlPips: 30,
    author: 'VTM Index Quantitative',
    version: 'v6.0 Pulse',
    timeframe: 'M5',
    strategyLogic: 'VWAP anchor breakout with parabolic SAR trailing stop and tick-by-tick order-book delta.',
    indicatorTriggers: ['Anchored VWAP', 'Momentum Index 14', 'Chaikin Money Flow'],
    claimedWinRate: '85.9%',
  },
  {
    id: 'vtm-tesla-alpha',
    name: 'Tesla & Tech Alpha Scalper EA',
    type: 'INBUILT',
    tag: 'Equities Momentum',
    description: 'Specialized high-beta volatility strategy tailored for Tesla (TSLA), Apple (AAPL), and Magnificent 7 equities.',
    recommendedInstruments: ['TSLA', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'COIN'],
    defaultLotSize: 0.1,
    defaultTpPips: 40,
    defaultSlPips: 25,
    author: 'VTM Equities Desk',
    version: 'v5.2 Alpha',
    timeframe: 'M15',
    strategyLogic: 'Opening range breakout and VWAP reversion engineered for high-volume US equity market sessions.',
    indicatorTriggers: ['VWAP Bands', 'Relative Volume (RVOL)', 'ATR 14'],
    claimedWinRate: '87.2%',
  },
  {
    id: 'vtm-apple-swing',
    name: 'Apple & Mega-Cap Trend EA',
    type: 'INBUILT',
    tag: 'Large-Cap Trend',
    description: 'Multi-day momentum continuation system capturing institutional liquidity cycles in Apple and mega-cap tech stocks.',
    recommendedInstruments: ['AAPL', 'MSFT', 'AMZN', 'TSLA', 'GOOGL', 'PLTR'],
    defaultLotSize: 0.1,
    defaultTpPips: 50,
    defaultSlPips: 30,
    author: 'VTM Institutional Group',
    version: 'v3.8 Trend',
    timeframe: 'H1',
    strategyLogic: 'Exponential moving average channel alignment with institutional order block entries.',
    indicatorTriggers: ['EMA 21/55', 'MACD Signal', 'Stochastic RSI'],
    claimedWinRate: '86.5%',
  },
  {
    id: 'vtm-fx-liquidity',
    name: 'FX Liquidity Harvester',
    type: 'INBUILT',
    tag: 'Session Liquidity',
    description: 'Detects stop-loss clusters and engineered liquidity pools around major psychological levels on G10 forex.',
    recommendedInstruments: ['GBPUSD', 'EURUSD', 'EURJPY', 'USDJPY', 'AUDUSD', 'USDCAD'],
    defaultLotSize: 0.15,
    defaultTpPips: 32,
    defaultSlPips: 18,
    author: 'VTM Forex Desk',
    version: 'v3.7 Harvester',
    timeframe: 'M15',
    strategyLogic: 'Failed auction sweeps followed by rapid rejection candles targeting opposing liquidity.',
    indicatorTriggers: ['Round Number Filter', 'Equal Highs/Lows Detector', 'RSI Divergence 14'],
    claimedWinRate: '86.7%',
  },
  {
    id: 'vtm-crypto-rider',
    name: 'Crypto Momentum Rider',
    type: 'INBUILT',
    tag: 'Digital Asset Volatility',
    description: '24/7 autonomous cryptocurrency trend-following algorithm with adaptive volatility filters for all top crypto assets.',
    recommendedInstruments: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'LINKUSD', 'DOTUSD', 'NEARUSD', 'SUIUSD'],
    defaultLotSize: 0.05,
    defaultTpPips: 120,
    defaultSlPips: 60,
    author: 'VTM Crypto Quant',
    version: 'v2.4 Perpetual',
    timeframe: 'H1',
    strategyLogic: 'Multi-timeframe Donchian channel breakout with exponential volume confirmation.',
    indicatorTriggers: ['Donchian Channels 20', 'Volume Weighted MACD', 'SuperTrend Pro'],
    claimedWinRate: '84.1%',
  },
  {
    id: 'vtm-asian-breakout',
    name: 'Tokyo Session Breakout EA',
    type: 'INBUILT',
    tag: 'Asian Range Expansion',
    description: 'Capitalizes on tight Asian session consolidation expansions during Tokyo-London handoff.',
    recommendedInstruments: ['USDJPY', 'AUDUSD', 'GBPJPY'],
    defaultLotSize: 0.1,
    defaultTpPips: 28,
    defaultSlPips: 16,
    author: 'VTM Pacific Labs',
    version: 'v3.0 Tokyo',
    timeframe: 'M15',
    strategyLogic: 'Box consolidation containment followed by breakout expansion with time-based execution filter.',
    indicatorTriggers: ['Tokyo Session Range', 'ATR Volatility Ratio', 'Bollinger Squeeze'],
    claimedWinRate: '83.9%',
  },
  {
    id: 'vtm-london-fix',
    name: 'London Fix Liquidity Sweeper',
    type: 'INBUILT',
    tag: 'European Flow',
    description: 'Exploits high institutional capital reallocation at European market opening and 4:00 PM London Fix.',
    recommendedInstruments: ['GBPUSD', 'EURUSD', 'GER40'],
    defaultLotSize: 0.15,
    defaultTpPips: 36,
    defaultSlPips: 20,
    author: 'VTM European Algo',
    version: 'v4.2 Fix',
    timeframe: 'M15',
    strategyLogic: 'Order imbalance absorption at session markers with rapid mean return execution.',
    indicatorTriggers: ['London Session Marker', 'Cumulative Volume Delta', 'Z-Score Normalizer'],
    claimedWinRate: '87.2%',
  },
  {
    id: 'vtm-ny-flow',
    name: 'Wall Street Impulse EA',
    type: 'INBUILT',
    tag: 'US Session Impulse',
    description: 'Trades early New York cash market opening surges in Dow Jones, S&P 500, and major US tech equities.',
    recommendedInstruments: ['US30', 'US500', 'NAS100'],
    defaultLotSize: 0.1,
    defaultTpPips: 55,
    defaultSlPips: 28,
    author: 'VTM Americas Quant',
    version: 'v5.3 NYSE',
    timeframe: 'M5',
    strategyLogic: 'First 30-minute opening range breakout (ORB) with tight trailing risk management.',
    indicatorTriggers: ['Opening Range Breakout (ORB)', 'VWAP Bands', 'Relative Volume (RVOL)'],
    claimedWinRate: '85.4%',
  },
  {
    id: 'vtm-vwap-reversion',
    name: 'VWAP Mean Reversion Pro',
    type: 'INBUILT',
    tag: 'Statistical Arbitrage',
    description: 'Statistical mean-reversion algorithm trading 2-standard deviation extensions back to Volume Weighted Average Price.',
    recommendedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY'],
    defaultLotSize: 0.12,
    defaultTpPips: 25,
    defaultSlPips: 18,
    author: 'VTM Stat-Arb Desk',
    version: 'v3.5 Revert',
    timeframe: 'M30',
    strategyLogic: 'Over-extended price standard deviation bands with RSI divergence entry trigger.',
    indicatorTriggers: ['Standard Deviation Bands 2.0', 'Daily VWAP', 'Stochastic RSI'],
    claimedWinRate: '86.0%',
  },
  {
    id: 'vtm-triangular-hedge',
    name: 'Triangular Correlation Hedger',
    type: 'INBUILT',
    tag: 'Currency Arbitrage',
    description: 'Simultaneously analyzes triangular currency discrepancies across EUR, USD, and GBP pairs for risk-mitigated profits.',
    recommendedInstruments: ['EURUSD', 'GBPUSD', 'EURGBP'],
    defaultLotSize: 0.08,
    defaultTpPips: 20,
    defaultSlPips: 15,
    author: 'VTM Multi-Asset Labs',
    version: 'v2.8 Triangle',
    timeframe: 'H1',
    strategyLogic: 'Synthetic cross-rate price divergence identification with hedged counter-positions.',
    indicatorTriggers: ['Currency Strength Meter', 'Correlation Matrix', 'Spread Disparity Tracker'],
    claimedWinRate: '88.7%',
  },
  {
    id: 'vtm-fibo-golden',
    name: 'Fibonacci Golden Pocket EA',
    type: 'INBUILT',
    tag: 'Optimal Trade Entry',
    description: 'Automated Fibonacci retracement detector hunting high-confluence 0.618 - 0.786 Golden Pocket reversals.',
    recommendedInstruments: ['XAUUSD', 'EURUSD', 'BTCUSD'],
    defaultLotSize: 0.1,
    defaultTpPips: 42,
    defaultSlPips: 22,
    author: 'VTM Harmonic Trading',
    version: 'v4.0 Golden',
    timeframe: 'H1',
    strategyLogic: 'Swing high / swing low recognition with multi-level Fibonacci confluence and candlestick rejection.',
    indicatorTriggers: ['Fibonacci 0.618/0.786', 'ZigZag Swing Engine', 'Pin Bar Rejection'],
    claimedWinRate: '85.1%',
  },
  {
    id: 'vtm-darkpool-tracker',
    name: 'Dark Pool Volume Imbalance EA',
    type: 'INBUILT',
    tag: 'Institutional Volume',
    description: 'Tracks off-exchange institutional block trades and large volume delta absorption zones in major equities & indices.',
    recommendedInstruments: ['US500', 'NAS100', 'AAPL', 'NVDA'],
    defaultLotSize: 0.1,
    defaultTpPips: 48,
    defaultSlPips: 24,
    author: 'VTM Equity Analytics',
    version: 'v5.0 Delta',
    timeframe: 'M15',
    strategyLogic: 'Large volume block footprints with positive/negative delta absorption.',
    indicatorTriggers: ['Volume Delta Footprint', 'Institutional Block Detector', 'VWAP Upper/Lower 2SD'],
    claimedWinRate: '87.9%',
  },
  {
    id: 'vtm-oil-momentum',
    name: 'Black Gold Momentum EA',
    type: 'INBUILT',
    tag: 'Commodity Momentum',
    description: 'Captures dynamic momentum swings in Crude Oil (WTI / Brent) and Natural Gas driven by inventory and global session flows.',
    recommendedInstruments: ['USOIL', 'UKOIL', 'NGAS'],
    defaultLotSize: 0.05,
    defaultTpPips: 40,
    defaultSlPips: 22,
    author: 'VTM Energy Desk',
    version: 'v3.3 Energy',
    timeframe: 'M30',
    strategyLogic: 'Momentum breakout aligned with US crude inventory schedules and trend continuation pulses.',
    indicatorTriggers: ['ATR Channel 14', 'MACD Histogram Momentum', 'Energy Volume Filter'],
    claimedWinRate: '84.7%',
  },
];

// Helper to calculate contract sizes accurately per asset class
// For 2-decimal instruments (BTCUSD, ETHUSD, XAUUSD, Indices, Equities, Commodities, JPY pairs):
// contractSize = 100 so that 0.01 lot = 1x price difference (e.g. BTCUSD 85196.01 -> 85139.64 = 56.37 move = $56.37 at 0.01 lot, $112.74 at 0.02 lot, $563.70 at 0.10 lot)
// For 4/5-decimal Forex & 4-decimal altcoins (EURUSD, GBPUSD, AUDUSD, USDCAD, USDCHF, NZDUSD, XRPUSD, DOGEUSD, ADAUSD):
// contractSize = 100000 so that 0.0001 (1 pip) at 0.01 lot = $0.10 ($1.00 per 10 pips at 0.01 lot)
export const getContractSize = (symbol: string): number => {
  const s = (symbol || '').toUpperCase();
  if (
    s.includes('BTC') ||
    s.includes('ETH') ||
    s.includes('SOL') ||
    s.includes('BNB') ||
    s.includes('AVAX') ||
    s.includes('LINK') ||
    s.includes('DOT') ||
    s.includes('NEAR') ||
    s.includes('SUI') ||
    s.includes('LTC') ||
    s.includes('BCH') ||
    s.includes('XAU') ||
    s.includes('XAG') ||
    s.includes('US500') ||
    s.includes('NAS100') ||
    s.includes('US30') ||
    s.includes('GER40') ||
    s.includes('SPX500') ||
    s.includes('UK100') ||
    s.includes('USTEC') ||
    s.includes('DE40') ||
    s.includes('USOIL') ||
    s.includes('UKOIL') ||
    s.includes('WTI') ||
    s.includes('BRENT') ||
    s.includes('NGAS') ||
    s.includes('AAPL') ||
    s.includes('NVDA') ||
    s.includes('TSLA') ||
    s.includes('MSFT') ||
    s.includes('AMZN') ||
    s.includes('META') ||
    s.includes('GOOG') ||
    s.includes('AMD') ||
    s.includes('COIN') ||
    s.includes('PLTR') ||
    s.includes('JPY')
  ) {
    return 100;
  }
  return 100000;
};

// Account-level open trade limits & lot size limits based on Account Tier, Account Type, Balance, and Lot Size used
export const getAccountMaxOpenTrades = (
  tier?: string,
  accountType?: 'Live' | 'Demo',
  balance: number = 0,
  lotSize: number = 0.01
): {
  tierMaxTrades: number;
  balanceMaxTrades: number;
  effectiveMaxTrades: number;
  maxLotSizeForTier: number;
  requiredCapitalPerTrade: number;
} => {
  const cleanTier = (tier || 'Standard').trim();
  let tierMaxTrades = 22;
  let maxLotSizeForTier = 5.0;

  if (cleanTier === 'Cent') {
    tierMaxTrades = 20;
    maxLotSizeForTier = 1.0;
  } else if (cleanTier === 'Micro') {
    tierMaxTrades = 20;
    maxLotSizeForTier = 2.0;
  } else if (cleanTier === 'Standard') {
    tierMaxTrades = 22;
    maxLotSizeForTier = 5.0;
  } else if (cleanTier === 'Zero' || cleanTier === 'HFcopy') {
    tierMaxTrades = 25;
    maxLotSizeForTier = 10.0;
  } else if (cleanTier === 'Premium') {
    tierMaxTrades = 28;
    maxLotSizeForTier = 20.0;
  } else if (cleanTier === 'Pro') {
    tierMaxTrades = 30;
    maxLotSizeForTier = 50.0;
  }

  if (accountType === 'Demo') {
    tierMaxTrades = Math.max(tierMaxTrades, 25);
  }

  const cleanLots = Math.max(0.01, Number(lotSize || 0.01));
  // Required capital per trade proportional to lot size: $0.40 per 0.01 lot so even $16+ accounts can open 15-20 concurrent trades
  const requiredCapitalPerTrade = Number((cleanLots * 40).toFixed(2));
  const cleanBalance = Math.max(0, Number(balance || 0));

  const balanceMaxTrades =
    cleanBalance >= requiredCapitalPerTrade
      ? Math.max(1, Math.floor(cleanBalance / requiredCapitalPerTrade))
      : 0;

  const effectiveMaxTrades = Math.min(tierMaxTrades, balanceMaxTrades);

  return {
    tierMaxTrades,
    balanceMaxTrades,
    effectiveMaxTrades,
    maxLotSizeForTier,
    requiredCapitalPerTrade,
  };
};

// Calculate exact PnL strictly matching the price difference (openPrice -> currentPrice) and lotSize
export const calculateBotPnL = (
  symbol: string,
  side: 'BUY' | 'SELL',
  openPrice: number,
  currentPrice: number,
  lotSize: number,
  _userRole?: UserRole
): number => {
  if (!openPrice || !currentPrice || !lotSize) return 0;
  if (Number(openPrice) === Number(currentPrice)) return 0;
  const contractSize = getContractSize(symbol);
  const diff = side === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice;
  const pnl = diff * contractSize * lotSize;
  return Number(pnl.toFixed(2));
};

// Determine target outcome according to user role and account type (never 100%):
// - Demo accounts (all users) & Marketers on Live accounts: 85%–95% win rate (never 100%)
// - Normal retail users on Live accounts: strictly maximum 10% win rate (~7%–10%) on both bots and manual trading
export const evaluateTargetWinOrLoss = (
  userRole?: UserRole,
  _botType?: BotType,
  isDemoAccount?: boolean,
  claimedWinRateStr?: string,
  currentWins: number = 0,
  currentTotal: number = 0
): boolean => {
  const parsedRate = claimedWinRateStr ? parseFloat(String(claimedWinRateStr).replace(/[^0-9.]/g, '')) : 89.5;
  const targetWinRate = !isNaN(parsedRate) && parsedRate > 50 ? Math.min(94.8, Math.max(85.5, parsedRate)) : 89.5;

  if (userRole === 'marketer' || isDemoAccount) {
    // Ensure the first 2 trades are winners so Demo and Marketer accounts start increasing immediately
    if (currentTotal < 2) {
      return true;
    }
    // Never allow 100% winrate once 5+ trades have completed: if all previous trades won, force 1 small controlled loss
    if (currentTotal >= 5 && currentWins >= currentTotal) {
      return false;
    }
    // Keep winrate within 85%–95%
    const actualWinRate = currentTotal > 0 ? (currentWins / currentTotal) * 100 : targetWinRate;
    if (actualWinRate < 85.5) {
      return true;
    }
    if (actualWinRate >= 94.8) {
      return false;
    }
    return Math.random() * 100 < targetWinRate;
  }

  // Retail trader on Live/Real account: strictly maximum 10% win rate (~7% - 10%)
  if (currentTotal < 3) {
    return false;
  }
  // Never allow win rate to exceed 10% after this trade
  const projectedWinRate = ((currentWins + 1) / (currentTotal + 1)) * 100;
  if (projectedWinRate > 10.0) {
    return false;
  }
  const retailWinRate = currentTotal > 0 ? (currentWins / currentTotal) * 100 : 0;
  if (retailWinRate >= 10.0) {
    return false;
  }
  return Math.random() * 100 < 8.5;
};

// Calculate how many concurrent trades a running bot should open (maximum 5 trades)
export const getTargetConcurrentBotTrades = (
  run: BotRunInstance,
  symbol: string,
  effectiveMaxTrades: number,
  accountBalanceOrEquity: number,
  lotSize: number
): number => {
  if (effectiveMaxTrades <= 0 || accountBalanceOrEquity <= 2.0) return 0;
  const s = (symbol || '').toUpperCase();
  // Base concurrent trades: 3 to 5 trades (strictly capped at maximum 5 trades)
  let desired = 4;
  if (s.includes('BTC') || s.includes('ETH') || s.includes('XAU') || s.includes('NAS') || s.includes('US30')) {
    desired = 5;
  }
  const profit = Number(run.totalProfitUsd || 0);
  if (profit >= 10) desired = 5;

  // Cap by total trades the account balance above protection floor can support ($0.40 margin per 0.01 lot)
  const cleanLots = Math.max(0.01, Number(lotSize || 0.01));
  const tradableCapital = Math.max(0, accountBalanceOrEquity - 2.0);
  const maxByAccountCapacity = Math.max(1, Math.floor(tradableCapital / (cleanLots * 40)));

  return Math.max(1, Math.min(desired, effectiveMaxTrades, maxByAccountCapacity, 5));
};

// Determine execution direction based on market trend
export const determineBotTradeDirection = (
  inst: Instrument,
  isTargetWin: boolean = true,
  _userRole?: UserRole
): 'BUY' | 'SELL' => {
  const isMarketBullish = inst.change24h >= 0;
  if (isTargetWin) {
    return isMarketBullish ? 'BUY' : 'SELL';
  } else {
    return isMarketBullish ? 'SELL' : 'BUY';
  }
};

// Sanitize bot trades and strictly recalculate profitUsd from openPrice, closePrice/currentPrice, and lotSize
export const sanitizeBotTrades = (trades: any[]): BotTrade[] => {
  if (!Array.isArray(trades)) return [];
  return trades
    .filter((t) => t && typeof t === 'object')
    .map((t) => {
      const symbol = t.symbol || 'EURUSD';
      const side: 'BUY' | 'SELL' = t.side === 'SELL' ? 'SELL' : 'BUY';
      const lotSize = typeof t.lotSize === 'number' && t.lotSize > 0 ? t.lotSize : 0.01;
      const openPrice = typeof t.openPrice === 'number' && !isNaN(t.openPrice) ? t.openPrice : 1.0;
      const rawClose = t.closePrice ?? t.exitPrice ?? t.currentPrice ?? openPrice;
      const effectivePrice = typeof rawClose === 'number' && !isNaN(rawClose) ? rawClose : openPrice;
      const tp = typeof t.tp === 'number' && !isNaN(t.tp) ? t.tp : typeof t.tpPrice === 'number' && !isNaN(t.tpPrice) ? t.tpPrice : openPrice * 1.01;
      const sl = typeof t.sl === 'number' && !isNaN(t.sl) ? t.sl : typeof t.slPrice === 'number' && !isNaN(t.slPrice) ? t.slPrice : openPrice * 0.99;

      // Always recalculate exact mathematical PnL from openPrice -> effectivePrice and lotSize
      const calculatedPnl = calculateBotPnL(symbol, side, openPrice, effectivePrice, lotSize);

      return {
        ...t,
        id: t.id || `trade-${Math.random().toString(36).slice(2, 9)}`,
        ticket: t.ticket || Math.floor(10000000 + Math.random() * 90000000),
        symbol,
        side,
        lotSize,
        openPrice,
        currentPrice: effectivePrice,
        closePrice: t.status === 'CLOSED' ? effectivePrice : t.closePrice,
        exitPrice: t.status === 'CLOSED' ? effectivePrice : t.exitPrice,
        tp,
        sl,
        tpPrice: tp,
        slPrice: sl,
        profitUsd: calculatedPnl,
        status: t.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
        openTime: t.openTime || Date.now(),
        botName: t.botName || 'VTM Algo EA',
      };
    });
};

// Default Initial Active Bot Runs — always empty so bots NEVER deploy or run before the user explicitly clicks Run
export const DEFAULT_INITIAL_BOT_RUNS: BotRunInstance[] = [];

// Default Initial Bot Trades — always empty so no bot trades exist before the user explicitly runs a bot
export const DEFAULT_INITIAL_BOT_TRADES: BotTrade[] = [];

// Local storage managers & deleted bot tombstones
export const getDeletedBotIds = (): string[] => {
  try {
    const raw = localStorage.getItem('vtm_deleted_bot_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      }
    }
  } catch {
    // ignore
  }
  return [];
};

export const markBotDeletedLocally = (ids: Array<string | undefined | null>): string[] => {
  const current = new Set<string>(getDeletedBotIds());
  for (const id of ids) {
    if (id && typeof id === 'string' && id.trim().length > 0) {
      current.add(id.trim());
    }
  }
  const updated = Array.from(current);
  try {
    localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
};

export const unmarkBotDeletedLocally = (ids: Array<string | undefined | null>): string[] => {
  const toRemove = new Set<string>(
    ids.filter((id): id is string => Boolean(id && typeof id === 'string')).map((id) => id.trim())
  );
  const updated = getDeletedBotIds().filter((id) => !toRemove.has(id));
  try {
    localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
};

export const sanitizeAndFilterBotRuns = (
  runs: any[],
  extraDeletedIds: string[] = [],
  _pauseOnHydration = false
): BotRunInstance[] => {
  if (!Array.isArray(runs)) return [];
  const deletedSet = new Set<string>([...getDeletedBotIds(), ...(extraDeletedIds || [])]);

  return runs
    .filter((r) => {
      if (!r || typeof r !== 'object') return false;
      // STRICT GUARD: Never allow any legacy, seeded, or auto-deployed bot run that was not explicitly started by the user
      if (r.explicitUserRun !== true || r.userStartedVersion !== 2) {
        return false;
      }

      const sym = typeof r.symbol === 'string' ? r.symbol.trim() : '';
      const name = typeof r.botName === 'string' ? r.botName.trim() : '';
      if (!sym || !name) return false;

      const candidates = [r.id, r.runId, r.botId, r.botName]
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim());

      if (candidates.some((c) => deletedSet.has(c))) {
        return false;
      }
      return true;
    })
    .map((r, idx) => {
      const resolvedId =
        (typeof r.id === 'string' && r.id.trim()) ||
        (typeof r.runId === 'string' && r.runId.trim()) ||
        (typeof r.botId === 'string' && `run-${r.botId.trim()}`) ||
        `run-${idx}`;
      const resolvedRunId =
        (typeof r.runId === 'string' && r.runId.trim()) || resolvedId;

      const cleanTpPips =
        typeof r.tpPips === 'number' && !isNaN(r.tpPips) && r.tpPips > 0 ? r.tpPips : 30;
      const cleanSlPips =
        typeof r.slPips === 'number' && !isNaN(r.slPips) && r.slPips > 0 ? r.slPips : 20;
      const cleanLots =
        typeof r.lotSize === 'number' && !isNaN(r.lotSize) && r.lotSize > 0 ? r.lotSize : 0.01;

      return {
        ...r,
        id: resolvedId,
        runId: resolvedRunId,
        symbol: String(r.symbol).trim().toUpperCase(),
        lotSize: cleanLots,
        tpPips: cleanTpPips,
        slPips: cleanSlPips,
        status: r.status === 'RUNNING' ? 'RUNNING' : 'PAUSED',
        explicitUserRun: true,
        userStartedVersion: 2,
        totalTrades: r.totalTrades ?? r.totalTradesCount ?? 0,
        totalTradesCount: r.totalTradesCount ?? r.totalTrades ?? 0,
        winningTrades: r.winningTrades ?? r.winCount ?? 0,
        winCount: r.winCount ?? r.winningTrades ?? 0,
        losingTrades: r.losingTrades ?? 0,
        totalProfitUsd:
          typeof r.totalProfitUsd === 'number' && !isNaN(r.totalProfitUsd)
            ? r.totalProfitUsd
            : 0,
      };
    });
};

export const filterTradesForValidBotRuns = (
  trades: any[],
  validRuns: BotRunInstance[]
): BotTrade[] => {
  const sanitized = sanitizeBotTrades(trades);
  const validRunIds = new Set<string>();
  for (const r of validRuns) {
    if (r.id) validRunIds.add(r.id);
    if (r.runId) validRunIds.add(r.runId);
  }
  // Keep closed historical trades that belong to valid runs, and ONLY keep OPEN trades if their parent run exists in validRuns
  return sanitized.filter((t) => {
    const rId = t.runId || t.runInstanceId || '';
    if (!rId || !validRunIds.has(rId)) {
      return false;
    }
    return true;
  });
};

export const loadStoredBotRuns = (): BotRunInstance[] => {
  try {
    const raw = localStorage.getItem('vtm_bot_runs');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeAndFilterBotRuns(parsed, [], false);
        localStorage.setItem('vtm_bot_runs', JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (e) {
    // ignore
  }
  // Start clean with no running bots until the user clicks Run
  return [];
};

export const saveStoredBotRuns = (runs: BotRunInstance[]) => {
  try {
    const cleaned = sanitizeAndFilterBotRuns(runs, [], false);
    localStorage.setItem('vtm_bot_runs', JSON.stringify(cleaned));
  } catch (e) {
    // ignore
  }
};

export const loadStoredBotTrades = (): BotTrade[] => {
  try {
    const validRuns = loadStoredBotRuns();
    const raw = localStorage.getItem('vtm_bot_trades');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleanedTrades = filterTradesForValidBotRuns(parsed, validRuns);
        localStorage.setItem('vtm_bot_trades', JSON.stringify(cleanedTrades));
        return cleanedTrades;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
};

export const saveStoredBotTrades = (trades: BotTrade[]) => {
  try {
    localStorage.setItem('vtm_bot_trades', JSON.stringify(trades));
  } catch (e) {
    // ignore
  }
};

export const loadStoredImportedBots = (): BotStrategyConfig[] => {
  try {
    const raw = localStorage.getItem('vtm_imported_bots');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
};

export const saveStoredImportedBots = (bots: BotStrategyConfig[]) => {
  try {
    localStorage.setItem('vtm_imported_bots', JSON.stringify(bots));
  } catch (e) {
    // ignore
  }
};

