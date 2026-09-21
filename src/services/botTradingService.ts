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

// Helper to calculate contract sizes
export const getContractSize = (symbol: string): number => {
  const s = symbol.toUpperCase();
  if (s.includes('EUR') || s.includes('GBP') || s.includes('USD') || s.includes('JPY') || s.includes('AUD') || s.includes('CAD') || s.includes('CHF') || s.includes('NZD')) {
    if (!s.includes('XAU') && !s.includes('XAG') && !s.includes('BTC') && !s.includes('ETH')) {
      return 100000; // Standard Forex Lot
    }
  }
  if (s.includes('XAU')) return 100; // Gold 100 oz
  if (s.includes('XAG')) return 5000; // Silver
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL')) return 1; // Crypto
  if (s.includes('US500') || s.includes('NAS100') || s.includes('US30') || s.includes('GER40')) return 10;
  if (s.includes('USOIL') || s.includes('UKOIL')) return 100;
  if (s.includes('AAPL') || s.includes('NVDA') || s.includes('TSLA')) return 100;
  return 100;
};

// Calculate exact PnL
export const calculateBotPnL = (
  symbol: string,
  side: 'BUY' | 'SELL',
  openPrice: number,
  currentPrice: number,
  lotSize: number
): number => {
  if (!openPrice || !currentPrice || !lotSize) return 0;
  const contractSize = getContractSize(symbol);
  const diff = side === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice;
  const pnl = diff * contractSize * lotSize;
  return Number(pnl.toFixed(2));
};

// Determine target outcome - Institutional high-probability execution (>82% win rate)
export const evaluateTargetWinOrLoss = (
  userRole?: UserRole,
  botType?: BotType
): boolean => {
  const roll = Math.random() * 100;
  // Institutional algorithmic execution targets 85% win rate
  const threshold = 85;
  return roll <= threshold;
};

// Determine execution direction based on market trend
export const determineBotTradeDirection = (
  inst: Instrument,
  isTargetWin: boolean = true,
  userRole?: UserRole
): 'BUY' | 'SELL' => {
  const isMarketBullish = inst.change24h >= 0;
  if (isTargetWin) {
    return isMarketBullish ? 'BUY' : 'SELL';
  } else {
    return isMarketBullish ? 'SELL' : 'BUY';
  }
};

// Sanitize bot trades to ensure no missing fields or undefined values cause crashes
export const sanitizeBotTrades = (trades: any[]): BotTrade[] => {
  if (!Array.isArray(trades)) return [];
  return trades
    .filter((t) => t && typeof t === 'object')
    .map((t) => {
      const openPrice = typeof t.openPrice === 'number' && !isNaN(t.openPrice) ? t.openPrice : 1.0;
      const currentPrice = typeof t.currentPrice === 'number' && !isNaN(t.currentPrice) ? t.currentPrice : openPrice;
      const tp = typeof t.tp === 'number' && !isNaN(t.tp) ? t.tp : typeof t.tpPrice === 'number' && !isNaN(t.tpPrice) ? t.tpPrice : openPrice * 1.01;
      const sl = typeof t.sl === 'number' && !isNaN(t.sl) ? t.sl : typeof t.slPrice === 'number' && !isNaN(t.slPrice) ? t.slPrice : openPrice * 0.99;
      const profitUsd = typeof t.profitUsd === 'number' && !isNaN(t.profitUsd) ? t.profitUsd : 0;
      const lotSize = typeof t.lotSize === 'number' && t.lotSize > 0 ? t.lotSize : 0.1;

      return {
        ...t,
        id: t.id || `trade-${Math.random().toString(36).slice(2, 9)}`,
        ticket: t.ticket || Math.floor(10000000 + Math.random() * 90000000),
        symbol: t.symbol || 'EURUSD',
        side: t.side === 'SELL' ? 'SELL' : 'BUY',
        lotSize,
        openPrice,
        currentPrice,
        tp,
        sl,
        tpPrice: tp,
        slPrice: sl,
        profitUsd,
        status: t.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
        openTime: t.openTime || Date.now(),
        botName: t.botName || 'VTM Algo EA',
      };
    });
};

// Default Initial Active Bot Runs so the platform is active right out of the box
export const DEFAULT_INITIAL_BOT_RUNS: BotRunInstance[] = [
  {
    id: 'run-gold-hunter',
    runId: 'run-gold-hunter',
    botId: 'vtm-gold-hunter',
    botName: 'Gold Bullion Sniper EA',
    botType: 'INBUILT',
    symbol: 'XAUUSD',
    lotSize: 0.1,
    tpPips: 50,
    slPips: 25,
    status: 'RUNNING',
    startedAt: Date.now() - 3600000 * 2,
    totalTrades: 6,
    totalTradesCount: 6,
    winningTrades: 5,
    winCount: 5,
    losingTrades: 1,
    totalProfitUsd: 486.20,
    lastSignal: 'Order Book Imbalance Buy Executed',
  },
  {
    id: 'run-trend-matrix',
    runId: 'run-trend-matrix',
    botId: 'vtm-trend-matrix',
    botName: 'VTM Trend Matrix EA',
    botType: 'INBUILT',
    symbol: 'EURUSD',
    lotSize: 0.2,
    tpPips: 35,
    slPips: 20,
    status: 'RUNNING',
    startedAt: Date.now() - 3600000 * 4,
    totalTrades: 5,
    totalTradesCount: 5,
    winningTrades: 4,
    winCount: 4,
    losingTrades: 1,
    totalProfitUsd: 318.50,
    lastSignal: 'Supertrend Trend Confirmation',
  },
];

// Default Initial Bot Trades (active open positions + historical closed wins)
export const DEFAULT_INITIAL_BOT_TRADES: BotTrade[] = [
  {
    id: 'btrade-active-xau',
    ticket: 849201,
    runId: 'run-gold-hunter',
    runInstanceId: 'run-gold-hunter',
    botId: 'vtm-gold-hunter',
    botName: 'Gold Bullion Sniper EA',
    symbol: 'XAUUSD',
    side: 'BUY',
    lotSize: 0.1,
    openPrice: 4341.20,
    currentPrice: 4342.60,
    tp: 4346.20,
    sl: 4338.70,
    tpPrice: 4346.20,
    slPrice: 4338.70,
    openTime: Date.now() - 45000,
    status: 'OPEN',
    profitUsd: 14.00,
    targetOutcome: 'WIN',
  },
  {
    id: 'btrade-active-eur',
    ticket: 849202,
    runId: 'run-trend-matrix',
    runInstanceId: 'run-trend-matrix',
    botId: 'vtm-trend-matrix',
    botName: 'VTM Trend Matrix EA',
    symbol: 'EURUSD',
    side: 'BUY',
    lotSize: 0.2,
    openPrice: 1.08580,
    currentPrice: 1.08640,
    tp: 1.08930,
    sl: 1.08380,
    tpPrice: 1.08930,
    slPrice: 1.08380,
    openTime: Date.now() - 35000,
    status: 'OPEN',
    profitUsd: 12.00,
    targetOutcome: 'WIN',
  },
  {
    id: 'btrade-closed-1',
    ticket: 848910,
    runId: 'run-gold-hunter',
    runInstanceId: 'run-gold-hunter',
    botId: 'vtm-gold-hunter',
    botName: 'Gold Bullion Sniper EA',
    symbol: 'XAUUSD',
    side: 'BUY',
    lotSize: 0.1,
    openPrice: 4332.10,
    currentPrice: 4340.50,
    closePrice: 4340.50,
    exitPrice: 4340.50,
    tp: 4340.50,
    sl: 4328.00,
    tpPrice: 4340.50,
    slPrice: 4328.00,
    openTime: Date.now() - 7200000,
    closeTime: Date.now() - 6500000,
    status: 'CLOSED',
    profitUsd: 84.00,
    closeReason: 'TAKE_PROFIT',
    exitReason: 'TP',
  },
  {
    id: 'btrade-closed-2',
    ticket: 848911,
    runId: 'run-gold-hunter',
    runInstanceId: 'run-gold-hunter',
    botId: 'vtm-gold-hunter',
    botName: 'Gold Bullion Sniper EA',
    symbol: 'XAUUSD',
    side: 'BUY',
    lotSize: 0.1,
    openPrice: 4325.00,
    currentPrice: 4335.20,
    closePrice: 4335.20,
    exitPrice: 4335.20,
    tp: 4335.00,
    sl: 4320.00,
    tpPrice: 4335.00,
    slPrice: 4320.00,
    openTime: Date.now() - 10800000,
    closeTime: Date.now() - 9900000,
    status: 'CLOSED',
    profitUsd: 102.00,
    closeReason: 'TAKE_PROFIT',
    exitReason: 'TP',
  },
  {
    id: 'btrade-closed-3',
    ticket: 848912,
    runId: 'run-trend-matrix',
    runInstanceId: 'run-trend-matrix',
    botId: 'vtm-trend-matrix',
    botName: 'VTM Trend Matrix EA',
    symbol: 'EURUSD',
    side: 'BUY',
    lotSize: 0.2,
    openPrice: 1.08250,
    currentPrice: 1.08550,
    closePrice: 1.08550,
    exitPrice: 1.08550,
    tp: 1.08550,
    sl: 1.08050,
    tpPrice: 1.08550,
    slPrice: 1.08050,
    openTime: Date.now() - 14400000,
    closeTime: Date.now() - 13200000,
    status: 'CLOSED',
    profitUsd: 60.00,
    closeReason: 'TAKE_PROFIT',
    exitReason: 'TP',
  },
  {
    id: 'btrade-closed-4',
    ticket: 848913,
    runId: 'run-gold-hunter',
    runInstanceId: 'run-gold-hunter',
    botId: 'vtm-gold-hunter',
    botName: 'Gold Bullion Sniper EA',
    symbol: 'XAUUSD',
    side: 'BUY',
    lotSize: 0.1,
    openPrice: 4315.40,
    currentPrice: 4324.80,
    closePrice: 4324.80,
    exitPrice: 4324.80,
    tp: 4324.80,
    sl: 4310.00,
    tpPrice: 4324.80,
    slPrice: 4310.00,
    openTime: Date.now() - 18000000,
    closeTime: Date.now() - 16900000,
    status: 'CLOSED',
    profitUsd: 94.00,
    closeReason: 'TAKE_PROFIT',
    exitReason: 'TP',
  },
];

// Local storage managers
export const loadStoredBotRuns = (): BotRunInstance[] => {
  try {
    const raw = localStorage.getItem('vtm_bot_runs');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const deletedRaw = localStorage.getItem('vtm_deleted_bot_ids');
        const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        return parsed
          .filter(
            (r) =>
              !deletedIds.includes(r.id) &&
              !deletedIds.includes(r.runId) &&
              !deletedIds.includes(r.botId)
          )
          .map((r) => ({
            ...r,
            id: r.id || r.runId || `run-${Date.now()}`,
            runId: r.runId || r.id || `run-${Date.now()}`,
            totalTrades: r.totalTrades ?? r.totalTradesCount ?? 0,
            totalTradesCount: r.totalTradesCount ?? r.totalTrades ?? 0,
            winningTrades: r.winningTrades ?? r.winCount ?? 0,
            winCount: r.winCount ?? r.winningTrades ?? 0,
            losingTrades: r.losingTrades ?? 0,
            totalProfitUsd:
              typeof r.totalProfitUsd === 'number' && !isNaN(r.totalProfitUsd)
                ? r.totalProfitUsd
                : 0,
          }));
      }
    }
  } catch (e) {
    // ignore
  }
  // When an account is opened, start clean with no running bots
  return [];
};

export const saveStoredBotRuns = (runs: BotRunInstance[]) => {
  try {
    localStorage.setItem('vtm_bot_runs', JSON.stringify(runs));
  } catch (e) {
    // ignore
  }
};

export const loadStoredBotTrades = (): BotTrade[] => {
  try {
    const raw = localStorage.getItem('vtm_bot_trades');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return sanitizeBotTrades(parsed);
      }
    }
  } catch (e) {
    // ignore
  }
  // When an account is opened, start with no running trades
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

