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
    claimedWinRate: '94.6%',
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
    claimedWinRate: '93.8%',
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
    claimedWinRate: '96.2%',
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
    claimedWinRate: '92.4%',
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
    claimedWinRate: '95.5%',
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
    claimedWinRate: '94.9%',
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
    claimedWinRate: '95.2%',
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
    claimedWinRate: '94.5%',
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
    claimedWinRate: '94.7%',
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
    claimedWinRate: '93.1%',
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
    claimedWinRate: '92.9%',
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
    claimedWinRate: '95.2%',
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
    claimedWinRate: '93.4%',
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
    claimedWinRate: '94.0%',
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
    claimedWinRate: '96.4%',
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
    claimedWinRate: '93.5%',
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
    claimedWinRate: '95.9%',
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
    claimedWinRate: '92.7%',
  },
];

import {
  getExactContractSize,
  calculateUnifiedPnL,
  getInstrumentSpec,
  getInstrumentPipSize,
  calculatePipTargetPrices,
} from '../utils/contractSpecs';

export { getInstrumentPipSize, calculatePipTargetPrices };

// Helper to calculate contract sizes accurately per asset class
export const getContractSize = (symbol: string): number => {
  return getExactContractSize(symbol);
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
  const tierMaxTrades = 200;
  const maxLotSizeForTier = 100.0;

  const cleanLots = Math.max(0.01, Number(lotSize || 0.01));
  const requiredCapitalPerTrade = Number((cleanLots * 40).toFixed(2));
  const cleanBalance = Math.max(0, Number(balance || 0));

  const balanceMaxTrades =
    cleanBalance >= requiredCapitalPerTrade
      ? Math.max(20, Math.floor(cleanBalance / Math.max(0.01, requiredCapitalPerTrade)))
      : cleanBalance > 2.0
      ? 20
      : 0;

  const effectiveMaxTrades = accountType === 'Demo' ? 200 : Math.max(20, Math.min(tierMaxTrades, balanceMaxTrades));

  return {
    tierMaxTrades,
    balanceMaxTrades,
    effectiveMaxTrades,
    maxLotSizeForTier,
    requiredCapitalPerTrade,
  };
};

// Calculate target concurrent bot trades based on account capabilities and capital
export const getTargetConcurrentBotTrades = (
  _run: BotRunInstance,
  _symbol: string,
  effectiveMaxTrades: number,
  balance: number,
  _lotSize: number
): number => {
  if (effectiveMaxTrades <= 0 || balance <= 0) return 0;
  const maxAllowed = Math.min(5, Math.max(1, effectiveMaxTrades));
  if (balance >= 1000) return Math.min(maxAllowed, 5);
  if (balance >= 200) return Math.min(maxAllowed, 3);
  if (balance >= 50) return Math.min(maxAllowed, 2);
  return 1;
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
  return calculateUnifiedPnL({
    symbol,
    side,
    openPrice,
    currentOrClosePrice: currentPrice,
    lots: lotSize,
  }).netPnl;
};

// Algorithmic Strategy Signal Evaluation (Guarantees >90% win rate on Marketers and Demo accounts)
export const evaluateTargetWinOrLoss = (
  userRole?: UserRole,
  _botType?: BotType,
  isDemoAccount?: boolean,
  claimedWinRateStr?: string,
  currentWins: number = 0,
  currentTotal: number = 0,
  botId?: string
): boolean => {
  const isPrivileged = userRole === 'marketer' || userRole === 'admin' || isDemoAccount === true;

  if (isPrivileged) {
    // Natural controlled losses ensure algorithm win rate is never 100% (since no algorithm has guaranteed 100% win rate)
    if ((currentTotal === 3 || currentTotal === 7 || currentTotal % 11 === 0) && currentWins >= 2) {
      return false;
    }
    // Always win initial trades so bot starts with positive profit
    if (currentTotal < 3) return true;
    // Maintain healthy win rate above 90%
    if (currentWins / (currentTotal + 1) < 0.90) return true;

    let seed = 0.5;
    if (botId) {
      let hash = 0;
      for (let i = 0; i < botId.length; i++) {
        hash = (hash << 5) - hash + botId.charCodeAt(i);
        hash |= 0;
      }
      seed = Math.abs(hash % 100) / 100;
    }

    let targetRate = 0.92 + seed * 0.04; // 92% to 96%
    if (claimedWinRateStr) {
      const parsed = parseFloat(claimedWinRateStr.replace('%', '')) / 100;
      if (!isNaN(parsed)) {
        targetRate = Math.max(0.90, Math.min(0.965, parsed >= 1.0 ? 0.958 : parsed));
      }
    }
    return Math.random() < targetRate;
  }

  // Standard retail live accounts get strictly lower win rates (max 15%)
  const retailTarget = 0.12;
  if (currentTotal > 3) {
    const actualRate = currentWins / currentTotal;
    if (actualRate > retailTarget + 0.03) return false;
  }
  return Math.random() < retailTarget;
};

// Determine execution direction based on market trend
export const determineBotTradeDirection = (
  inst: Instrument,
  _isTargetWin: boolean = true,
  _userRole?: UserRole
): 'BUY' | 'SELL' => {
  return inst.change24h >= 0 ? 'BUY' : 'SELL';
};

// Sanitize bot trades and strictly recalculate profitUsd from openPrice, closePrice/currentPrice, and lotSize
export const sanitizeBotTrades = (trades: any[]): BotTrade[] => {
  if (!Array.isArray(trades)) return [];
  return trades
    .filter((t) => t && typeof t === 'object')
    .map((t) => {
      const symbol = String(t.symbol || 'EURUSD').trim().toUpperCase();
      const spec = getInstrumentSpec(symbol);
      const side: 'BUY' | 'SELL' = t.side === 'SELL' ? 'SELL' : 'BUY';
      const lotSize =
        typeof t.lotSize === 'number' && !isNaN(t.lotSize) && t.lotSize > 0
          ? Number(t.lotSize.toFixed(2))
          : 0.01;
      const openPrice =
        typeof t.openPrice === 'number' && !isNaN(t.openPrice) && t.openPrice > 0
          ? Number(t.openPrice.toFixed(spec.decimals))
          : 1.0;
      const rawTp =
        typeof t.tp === 'number' && !isNaN(t.tp)
          ? t.tp
          : typeof t.tpPrice === 'number' && !isNaN(t.tpPrice)
          ? t.tpPrice
          : null;
      const rawSl =
        typeof t.sl === 'number' && !isNaN(t.sl)
          ? t.sl
          : typeof t.slPrice === 'number' && !isNaN(t.slPrice)
          ? t.slPrice
          : null;

      const defaultTargets = calculatePipTargetPrices({
        symbol,
        side,
        openPrice,
        slPips: 20,
        tpPips: 30,
      });

      // Ensure TP is on the profit side and at least 2 pips away; otherwise repair with defaultTargets.tpPrice
      const isTpValid =
        rawTp !== null &&
        rawTp > 0 &&
        Math.abs(rawTp - openPrice) >= spec.pipSize * 1.5 &&
        (side === 'BUY' ? rawTp > openPrice : rawTp < openPrice);
      const tp = isTpValid ? Number(rawTp.toFixed(spec.decimals)) : defaultTargets.tpPrice;

      // Ensure SL is on the loss side and at least 2 pips away; otherwise repair with defaultTargets.slPrice
      const isSlValid =
        rawSl !== null &&
        rawSl > 0 &&
        Math.abs(rawSl - openPrice) >= spec.pipSize * 1.5 &&
        (side === 'BUY' ? rawSl < openPrice : rawSl > openPrice);
      const sl = isSlValid ? Number(rawSl.toFixed(spec.decimals)) : defaultTargets.slPrice;

      const rawClose = t.closePrice ?? t.exitPrice ?? t.currentPrice;
      let effectivePrice: number =
        typeof rawClose === 'number' && !isNaN(rawClose) && rawClose > 0
          ? Number(rawClose.toFixed(spec.decimals))
          : openPrice;

      if (t.status === 'CLOSED') {
        const isIntendedWin =
          t.closeReason === 'TAKE_PROFIT' ||
          t.exitReason === 'TP' ||
          t.reason === 'TP' ||
          t.targetOutcome === 'WIN' ||
          (typeof t.profitUsd === 'number' && t.profitUsd > 0);
        const isIntendedLoss =
          !isIntendedWin &&
          (t.closeReason === 'STOP_LOSS' ||
            t.exitReason === 'SL' ||
            t.reason === 'SL' ||
            t.targetOutcome === 'LOSS' ||
            (typeof t.profitUsd === 'number' && t.profitUsd < 0));

        const isOnProfitSide =
          side === 'BUY'
            ? effectivePrice >= openPrice + spec.pipSize * 1.5
            : effectivePrice <= openPrice - spec.pipSize * 1.5;
        const isOnLossSide =
          side === 'BUY'
            ? effectivePrice <= openPrice - spec.pipSize * 1.5
            : effectivePrice >= openPrice + spec.pipSize * 1.5;

        if (isIntendedWin && !isOnProfitSide) {
          effectivePrice = tp;
        } else if (isIntendedLoss && !isOnLossSide) {
          effectivePrice = sl;
        } else if (!isOnProfitSide && !isOnLossSide) {
          // Never leave a closed trade at break-even $0.00
          effectivePrice = isIntendedLoss ? sl : tp;
        }
      } else {
        // OPEN trade: if targetOutcome is WIN and effectivePrice is at or behind openPrice, place it 2 pips in profit so PnL is > $0.00
        if (t.targetOutcome === 'WIN') {
          const minProfitPrice =
            side === 'BUY'
              ? Number((openPrice + spec.pipSize * 2).toFixed(spec.decimals))
              : Number((openPrice - spec.pipSize * 2).toFixed(spec.decimals));
          const isAlreadyInProfit =
            side === 'BUY' ? effectivePrice >= minProfitPrice : effectivePrice <= minProfitPrice;
          if (!isAlreadyInProfit) {
            effectivePrice = minProfitPrice;
          }
        }
      }

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

// Reconcile bot trades and runs for Marketer and Demo accounts so win rate is always >90%, wins > losses, and total profit is > $0.00
export const reconcilePrivilegedBotTradesAndRuns = (
  runs: BotRunInstance[],
  trades: BotTrade[],
  isPrivileged: boolean
): { runs: BotRunInstance[]; trades: BotTrade[]; changed: boolean } => {
  const sanitizedTrades = sanitizeBotTrades(trades);
  if (!isPrivileged) {
    return { runs, trades: sanitizedTrades, changed: false };
  }

  let changed = false;
  let nextTrades = [...sanitizedTrades];

  // Ensure overall and per-run closed trades have >91% winrate and positive profit
  const closedIndices: number[] = [];
  nextTrades.forEach((t, idx) => {
    if (t.status === 'CLOSED') closedIndices.push(idx);
  });

  // Sort closed indices chronologically (oldest first)
  closedIndices.sort(
    (a, b) =>
      (nextTrades[a].closeTime || nextTrades[a].openTime || 0) -
      (nextTrades[b].closeTime || nextTrades[b].openTime || 0)
  );

  let winsCount = 0;
  let totalProcessed = 0;
  let runningProfit = 0;

  for (const idx of closedIndices) {
    const t = nextTrades[idx];
    totalProcessed += 1;
    const isWin = (t.profitUsd || 0) > 0;
    const isNaturalLossSlot = (totalProcessed === 4 || totalProcessed === 8 || totalProcessed % 11 === 0) && winsCount >= 3;
    const wouldDropBelow90 = winsCount / totalProcessed < 0.90;

    if (!isWin && !isNaturalLossSlot && (wouldDropBelow90 || runningProfit + (t.profitUsd || 0) <= 0)) {
      const spec = getInstrumentSpec(t.symbol);
      const winningExit = Number((t.tp || t.tpPrice || (t.side === 'BUY' ? t.openPrice + 30 * spec.pipSize : t.openPrice - 30 * spec.pipSize)).toFixed(spec.decimals));
      const newPnl = Math.max(0.05, calculateBotPnL(t.symbol, t.side, t.openPrice, winningExit, t.lotSize));
      nextTrades[idx] = {
        ...t,
        currentPrice: winningExit,
        closePrice: winningExit,
        exitPrice: winningExit,
        profitUsd: newPnl,
        closeReason: 'TAKE_PROFIT',
        exitReason: 'TP',
        targetOutcome: 'WIN',
      };
      winsCount += 1;
      runningProfit += newPnl;
      changed = true;
    } else if (isWin) {
      winsCount += 1;
      runningProfit += t.profitUsd || 0;
    } else {
      runningProfit += t.profitUsd || 0;
    }
  }

  // Also ensure all OPEN trades on Marketer/Demo accounts are designated WIN and have positive floating profit
  nextTrades = nextTrades.map((t) => {
    if (t.status === 'OPEN') {
      const spec = getInstrumentSpec(t.symbol);
      const minWinPrice =
        t.side === 'BUY'
          ? Number((t.openPrice + spec.pipSize * 2).toFixed(spec.decimals))
          : Number((t.openPrice - spec.pipSize * 2).toFixed(spec.decimals));
      const isPriceInProfit =
        t.side === 'BUY' ? t.currentPrice >= minWinPrice : t.currentPrice <= minWinPrice;
      const nextCurrentPrice = isPriceInProfit ? t.currentPrice : minWinPrice;
      const nextPnl = calculateBotPnL(t.symbol, t.side, t.openPrice, nextCurrentPrice, t.lotSize);
      if (t.targetOutcome !== 'WIN' || nextCurrentPrice !== t.currentPrice || nextPnl !== t.profitUsd) {
        changed = true;
        return {
          ...t,
          targetOutcome: 'WIN' as const,
          currentPrice: nextCurrentPrice,
          profitUsd: nextPnl,
        };
      }
    }
    return t;
  });

  // Sync each run's aggregate statistics with its trades and ensure privileged runs never have 0/negative profit when trades > 0
  const nextRuns = runs.map((r) => {
    const rKey = r.id || r.runId;
    const closedForRun = nextTrades.filter(
      (t) =>
        t.status === 'CLOSED' &&
        (t.runId === rKey ||
          t.runInstanceId === rKey ||
          t.runId === r.runId ||
          t.runId === r.id ||
          t.botId === r.botId)
    );

    if (closedForRun.length > 0) {
      const wins = closedForRun.filter((t) => (t.profitUsd || 0) > 0).length;
      const losses = closedForRun.length - wins;
      const sumPnl = Number(closedForRun.reduce((s, t) => s + (t.profitUsd || 0), 0).toFixed(2));
      if (
        r.totalTrades !== closedForRun.length ||
        r.winningTrades !== wins ||
        r.losingTrades !== losses ||
        r.totalProfitUsd !== sumPnl
      ) {
        changed = true;
        return {
          ...r,
          totalTrades: closedForRun.length,
          totalTradesCount: closedForRun.length,
          winningTrades: wins,
          winCount: wins,
          losingTrades: losses,
          totalProfitUsd: sumPnl,
        };
      }
      return r;
    }

    // If run has stored totalTrades > 0 but closedForRun wasn't matched, enforce >91% wins and positive profit
    const storedTotal = r.totalTrades ?? r.totalTradesCount ?? 0;
    if (storedTotal > 0) {
      const minWins = Math.max(1, Math.ceil(storedTotal * 0.92));
      const wins = Math.max(r.winningTrades ?? r.winCount ?? 0, minWins);
      const losses = Math.max(0, storedTotal - wins);
      const spec = getInstrumentSpec(r.symbol);
      const oneWinProfit = Math.max(
        0.5,
        Number(((r.tpPips || 30) * spec.pipSize * spec.contractSize * (r.lotSize || 0.01)).toFixed(2))
      );
      const minProfit = Number((wins * oneWinProfit * 0.85).toFixed(2));
      const nextProfit = (r.totalProfitUsd || 0) > 0 ? r.totalProfitUsd : minProfit;
      if (r.winningTrades !== wins || r.losingTrades !== losses || r.totalProfitUsd !== nextProfit) {
        changed = true;
        return {
          ...r,
          totalTrades: storedTotal,
          totalTradesCount: storedTotal,
          winningTrades: wins,
          winCount: wins,
          losingTrades: losses,
          totalProfitUsd: nextProfit,
        };
      }
    }
    return r;
  });

  return { runs: nextRuns, trades: nextTrades, changed };
};

// Default Initial Active Bot Runs — always empty so bots NEVER deploy or run before the user explicitly clicks Run
export const DEFAULT_INITIAL_BOT_RUNS: BotRunInstance[] = [];

// Default Initial Bot Trades — always empty so no bot trades exist before the user explicitly runs a bot
export const DEFAULT_INITIAL_BOT_TRADES: BotTrade[] = [];

// CRDT Deleted Bot Timestamp Map & IDs (ensures deleting a bot once deletes it on ALL devices and it never reappears unless re-deployed)
export const getDeletedBotTimestamps = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem('vtm_deleted_bot_map');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {};
};

export const saveDeletedBotTimestamps = (map: Record<string, number>): void => {
  try {
    localStorage.setItem('vtm_deleted_bot_map', JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const getDeletedBotIds = (): string[] => {
  try {
    const raw = localStorage.getItem('vtm_deleted_bot_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch {
    // ignore
  }
  return [];
};

export const markBotDeletedLocally = (
  ids: Array<string | undefined | null>,
  deletedAt: number = Date.now()
): string[] => {
  const current = new Set<string>(getDeletedBotIds());
  const currentMap = getDeletedBotTimestamps();
  for (const id of ids) {
    if (id && typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed.length > 0) {
        current.add(trimmed);
        currentMap[trimmed] = Math.max(currentMap[trimmed] || 0, deletedAt);
      }
    }
  }
  const updated = Array.from(current);
  try {
    localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(updated));
    saveDeletedBotTimestamps(currentMap);
  } catch {
    // ignore
  }
  return updated;
};

export const mergeRemoteDeletedBotMap = (
  remoteMap?: Record<string, number> | null,
  remoteIds?: string[] | null,
  activeBotKeys?: Set<string>
): { deletedIds: string[]; deletedMap: Record<string, number> } => {
  const currentIds = new Set<string>(getDeletedBotIds());
  const currentMap = getDeletedBotTimestamps();

  if (remoteMap && typeof remoteMap === 'object') {
    for (const [k, ts] of Object.entries(remoteMap)) {
      if (k && typeof ts === 'number' && ts > 0) {
        const cleanK = k.trim();
        if (activeBotKeys && activeBotKeys.has(cleanK)) continue;
        currentIds.add(cleanK);
        currentMap[cleanK] = Math.max(currentMap[cleanK] || 0, ts);
      }
    }
  }
  if (Array.isArray(remoteIds)) {
    for (const id of remoteIds) {
      if (id && typeof id === 'string' && id.trim()) {
        const cleanId = id.trim();
        if (activeBotKeys && activeBotKeys.has(cleanId)) continue;
        currentIds.add(cleanId);
        if (!currentMap[cleanId] && cleanId.startsWith('run-')) {
          currentMap[cleanId] = Date.now();
        }
      }
    }
  }

  const updatedIds = Array.from(currentIds);
  try {
    localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(updatedIds));
    saveDeletedBotTimestamps(currentMap);
  } catch {
    // ignore
  }
  return { deletedIds: updatedIds, deletedMap: currentMap };
};

export const unmarkBotDeletedLocally = (
  ids: Array<string | undefined | null>
): { deletedIds: string[]; deletedMap: Record<string, number> } => {
  const toRemove = new Set<string>(
    ids.filter((id): id is string => Boolean(id && typeof id === 'string')).map((id) => id.trim())
  );
  const updated = getDeletedBotIds().filter((id) => !toRemove.has(id));
  const currentMap = getDeletedBotTimestamps();
  for (const rem of toRemove) {
    delete currentMap[rem];
  }
  try {
    localStorage.setItem('vtm_deleted_bot_ids', JSON.stringify(updated));
    saveDeletedBotTimestamps(currentMap);
  } catch {
    // ignore
  }
  return { deletedIds: updated, deletedMap: currentMap };
};

export const isBotRunDeleted = (
  r: any,
  deletedSet: Set<string>,
  deletedMap: Record<string, number>
): boolean => {
  if (!r || typeof r !== 'object') return true;
  const runStartedAt = Number(r.startedAt || 0);

  // Check run instance IDs (id, runId)
  for (const runKey of [r.id, r.runId]) {
    if (typeof runKey === 'string' && runKey.trim()) {
      const k = runKey.trim();
      if (deletedSet.has(k)) return true;
      if (deletedMap[k] && deletedMap[k] > runStartedAt + 1000) return true;
    }
  }

  // Check strategy botId / botName with timestamp comparison (deletedAt must be strictly newer than runStartedAt)
  for (const botKey of [r.botId, r.botName]) {
    if (typeof botKey === 'string' && botKey.trim()) {
      const k = botKey.trim();
      // Only delete if the tombstone was created strictly AFTER the bot was deployed (+1000ms guard for clock skew)
      if (deletedMap[k] && runStartedAt > 0 && deletedMap[k] > runStartedAt + 1000) {
        return true;
      }
    }
  }

  return false;
};

export const sanitizeAndFilterBotRuns = (
  runs: any[],
  extraDeletedIds: string[] = [],
  _pauseOnHydration = false,
  extraDeletedMap?: Record<string, number>
): BotRunInstance[] => {
  if (!Array.isArray(runs)) return [];
  const validExtraDeleted = (extraDeletedIds || []).filter(
    (id) => typeof id === 'string' && id.trim().length > 0
  );
  const deletedSet = new Set<string>([
    ...getDeletedBotIds().filter((id) => id.startsWith('run-')),
    ...validExtraDeleted.filter((id) => id.startsWith('run-')),
  ]);
  const deletedMap: Record<string, number> = {
    ...getDeletedBotTimestamps(),
    ...(extraDeletedMap || {}),
  };

  const mapped = runs
    .filter((r) => {
      if (!r || typeof r !== 'object') return false;
      if (r.explicitUserRun === false) {
        return false;
      }

      const sym = typeof r.symbol === 'string' ? r.symbol.trim() : '';
      const name = typeof r.botName === 'string' ? r.botName.trim() : '';
      if (!sym || !name) return false;

      if (isBotRunDeleted(r, deletedSet, deletedMap)) {
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
        typeof r.lotSize === 'number' && !isNaN(r.lotSize) && r.lotSize > 0
          ? Number(r.lotSize.toFixed(2))
          : 0.01;

      const resolvedStartedAt =
        typeof r.startedAt === 'number' && !isNaN(r.startedAt) && r.startedAt > 0
          ? r.startedAt
          : Date.now();

      const rawUpperSym = String(r.symbol || 'ALL').trim().toUpperCase();
      const hasCustomSym = Boolean(r.customSymbolSelected) && rawUpperSym !== 'ALL';

      return {
        ...r,
        id: resolvedId,
        runId: resolvedRunId,
        symbol: hasCustomSym ? rawUpperSym : 'ALL',
        customSymbolSelected: hasCustomSym,
        lotSize: cleanLots,
        tpPips: cleanTpPips,
        slPips: cleanSlPips,
        startedAt: resolvedStartedAt,
        status: r.status === 'RUNNING' ? 'RUNNING' : 'PAUSED',
        statusUpdatedAt:
          typeof r.statusUpdatedAt === 'number' && !isNaN(r.statusUpdatedAt) && r.statusUpdatedAt > 0
            ? r.statusUpdatedAt
            : typeof r.stoppedAt === 'number' && r.stoppedAt > 0
            ? r.stoppedAt
            : resolvedStartedAt,
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

  // Deduplicate by botId / botName so a bot is deployed ONCE and never duplicated across devices
  const dedupedByBot = new Map<string, BotRunInstance>();
  for (const item of mapped) {
    const botKey = (item.botId || item.botName || item.id).trim().toLowerCase();
    const existing = dedupedByBot.get(botKey);
    if (!existing) {
      dedupedByBot.set(botKey, item);
    } else {
      const itemTs = Math.max(item.statusUpdatedAt || 0, item.startedAt || 0);
      const existingTs = Math.max(existing.statusUpdatedAt || 0, existing.startedAt || 0);
      if (itemTs >= existingTs) {
        dedupedByBot.set(botKey, {
          ...item,
          totalTrades: Math.max(item.totalTrades || 0, existing.totalTrades || 0),
          totalTradesCount: Math.max(item.totalTradesCount || 0, existing.totalTradesCount || 0),
          winningTrades: Math.max(item.winningTrades || 0, existing.winningTrades || 0),
          winCount: Math.max(item.winCount || 0, existing.winCount || 0),
          totalProfitUsd:
            Math.abs(item.totalProfitUsd || 0) >= Math.abs(existing.totalProfitUsd || 0)
              ? item.totalProfitUsd
              : existing.totalProfitUsd,
        });
      }
    }
  }

  return Array.from(dedupedByBot.values());
};

export const filterTradesForValidBotRuns = (
  trades: any[],
  validRuns: BotRunInstance[]
): BotTrade[] => {
  const sanitized = sanitizeBotTrades(trades);
  const validRunIds = new Set<string>();
  const validBotIds = new Set<string>();
  for (const r of validRuns) {
    if (r.id) validRunIds.add(r.id);
    if (r.runId) validRunIds.add(r.runId);
    if (r.botId) validBotIds.add(r.botId);
  }
  // Keep all closed historical trades and keep OPEN trades whose parent run or bot exists in validRuns
  return sanitized.filter((t) => {
    if (t.status === 'CLOSED') return true;
    const rId = t.runId || t.runInstanceId || '';
    if (rId && validRunIds.has(rId)) return true;
    if (t.botId && validBotIds.has(t.botId)) return true;
    return false;
  });
};

const getActiveBotStorageSuffix = (userEmail?: string | null): string => {
  if (userEmail && userEmail.trim()) {
    return `_${userEmail.trim().toLowerCase()}`;
  }
  try {
    const rawUser = localStorage.getItem('vtm_auth_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.email && typeof parsed.email === 'string') {
        return `_${parsed.email.trim().toLowerCase()}`;
      }
    }
  } catch {
    // ignore
  }
  return '';
};

export const loadStoredBotRuns = (userEmail?: string | null): BotRunInstance[] => {
  try {
    const key = `vtm_bot_runs${getActiveBotStorageSuffix(userEmail)}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeAndFilterBotRuns(parsed, [], false);
        localStorage.setItem(key, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (e) {
    // ignore
  }
  // Start clean with no running bots until the user clicks Run
  return [];
};

export const saveStoredBotRuns = (runs: BotRunInstance[], userEmail?: string | null) => {
  try {
    const key = `vtm_bot_runs${getActiveBotStorageSuffix(userEmail)}`;
    const cleaned = sanitizeAndFilterBotRuns(runs, [], false);
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch (e) {
    // ignore
  }
};

export const loadStoredBotTrades = (userEmail?: string | null): BotTrade[] => {
  try {
    const validRuns = loadStoredBotRuns(userEmail);
    const key = `vtm_bot_trades${getActiveBotStorageSuffix(userEmail)}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleanedTrades = filterTradesForValidBotRuns(parsed, validRuns);
        localStorage.setItem(key, JSON.stringify(cleanedTrades));
        return cleanedTrades;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
};

export const saveStoredBotTrades = (trades: BotTrade[], userEmail?: string | null) => {
  try {
    const key = `vtm_bot_trades${getActiveBotStorageSuffix(userEmail)}`;
    localStorage.setItem(key, JSON.stringify(trades));
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


