import { Instrument } from '../types';

export interface AIMarketSignal {
  symbol: string;
  name: string;
  category: string;
  action: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  bullishSentimentPercent: number;
  bearishSentimentPercent: number;
  currentPrice: number;
  entryZone: string;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: string;
  pivotPoint: number;
  supportLevel1: number;
  supportLevel2: number;
  resistanceLevel1: number;
  resistanceLevel2: number;
  summary: string;
  technicalRationale: string;
  catalyst: string;
  timeHorizon: string;
  buzzScore: number;
  isAiGenerated: boolean;
  timestamp: number;
}

export interface AnalyzePairParams {
  symbol: string;
  currentPrice: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  category?: string;
  timeframe?: string;
  style?: string;
  question?: string;
  decimals?: number;
}

export const getSpecificTechnicalReason = (symbol: string, category: string, isBuy: boolean): string => {
  const sym = symbol.toUpperCase();
  if (sym === 'EURUSD') {
    return isBuy
      ? 'ECB rate differential support & 200 EMA golden cross on 15M'
      : 'US Treasury yield surge driving USD demand & resistance breakdown';
  }
  if (sym === 'GBPUSD') {
    return isBuy
      ? 'UK CPI inflation persistence & London session breakout above support'
      : 'BoE dovish sentiment & pullback under Asian session high';
  }
  if (sym === 'USDJPY') {
    return isBuy
      ? 'BoJ yield curve control hold & US yield expansion above 153.20'
      : 'MoF intervention warning & institutional yen short-covering';
  }
  if (sym === 'AUDUSD') {
    return isBuy
      ? 'RBA hawkish hold & commodities rally pushing commodity FX'
      : 'China growth concerns & risk-off liquidation under key pivot';
  }
  if (sym === 'USDCAD') {
    return isBuy
      ? 'BOC rate cut expectations & CAD weakness'
      : 'WTI crude oil surge & CAD momentum above support';
  }
  if (sym === 'USDCHF') {
    return isBuy
      ? 'SNB rate cut trajectory & USD safe-haven demand'
      : 'Swiss franc denominated capital inflows at pivot';
  }
  if (sym === 'EURJPY') {
    return isBuy
      ? 'EUR/JPY cross momentum continuation above 20 EMA'
      : 'Yen cross liquidation & overbought momentum reset';
  }
  if (sym === 'XAUUSD') {
    return isBuy
      ? 'Central bank gold reserve accumulation & safe-haven inflows above $4,020'
      : 'Dollar index strength & profit-taking near all-time high resistance';
  }
  if (sym === 'USOIL' || sym === 'UKOIL') {
    return isBuy
      ? 'OPEC+ supply constraint extension & EIA inventory drawdown'
      : 'Global demand slowdown concerns & technical rejection at resistance';
  }
  if (sym === 'BTCUSD') {
    return isBuy
      ? 'Institutional ETF net inflows & spot order-book accumulation at $89K'
      : 'Miners distribution & derivative leverage liquidation below $90K';
  }
  if (sym === 'ETHUSD') {
    return isBuy
      ? 'L2 staking expansion & DeFi gas volume surge above $2,980'
      : 'Foundation treasury transfers & resistance rejection under $3,050';
  }
  if (sym === 'SOLUSD') {
    return isBuy
      ? 'DEX volume dominance & liquid staking expansion above $195'
      : 'Network congestion fears & profit-taking after 24h expansion';
  }
  if (sym === 'US500') {
    return isBuy
      ? 'Big Tech earnings beat & momentum continuation above 5,880 EMA'
      : 'Hawkish Fed rate guidance & broad market valuation rebalancing';
  }
  if (sym === 'NAS100') {
    return isBuy
      ? 'AI chip demand surge & semiconductor sector breakouts'
      : 'Tech profit-taking & yield curve pressure under 20,500';
  }

  // Category fallback reasons
  if (category === 'Forex') {
    return isBuy
      ? 'EMA 20/50 bullish alignment & MACD histogram expansion above pivot'
      : 'RSI bearish divergence & order-block breakdown below session pivot';
  }
  if (category === 'Commodities') {
    return isBuy
      ? 'Futures curve backwardation & spot liquidity sweep at support'
      : 'Futures contango expansion & supply zone rejection';
  }
  if (category === 'Crypto') {
    return isBuy
      ? 'Perpetual swap funding rate reset & spot volume confirmation'
      : 'Long liquidation cascade & derivative order-book imbalance';
  }
  if (category === 'Indices') {
    return isBuy
      ? 'Breadth expansion & index futures gap fill above key VWAP'
      : 'Sector rotation out of high-beta equity & VWAP breakdown';
  }

  return isBuy
    ? 'Bullish order-block absorption & institutional volume breakout'
    : 'Bearish supply zone rejection & liquidation below key structure';
};

// Generate realistic signal dynamically from live instrument data
export const generateSignalFromInstrument = (
  inst: Instrument,
  timeframe: string = '15M Scalp',
  customQuestion?: string
): AIMarketSignal => {
  const p = inst.bid || inst.ask || 1;
  const dec = typeof inst.decimals === 'number' ? inst.decimals : p > 500 ? 2 : 5;
  const chg = inst.change24h || 0;
  const isBullish = chg >= 0;

  // Determine sentiment percentage based on change24h momentum
  const baseBullish = isBullish
    ? Math.min(88, 55 + Math.round(Math.abs(chg) * 6))
    : Math.max(12, 45 - Math.round(Math.abs(chg) * 6));
  const bullishPercent = Math.max(10, Math.min(92, baseBullish));
  const bearishPercent = 100 - bullishPercent;

  const action: AIMarketSignal['action'] =
    bullishPercent >= 75 ? 'STRONG_BUY' : bullishPercent >= 55 ? 'BUY' : bullishPercent <= 25 ? 'STRONG_SELL' : 'SELL';

  // Calculate SL/TP using asset-class volatility models
  let slDistance = p * 0.006;
  let tp1Distance = p * 0.012;
  let tp2Distance = p * 0.024;

  if (inst.category === 'Forex') {
    const pip = dec === 3 || dec === 2 ? 0.01 : 0.0001;
    slDistance = pip * 25;
    tp1Distance = pip * 45;
    tp2Distance = pip * 80;
  } else if (inst.symbol === 'XAUUSD') {
    slDistance = p * 0.0025; // ~$10
    tp1Distance = p * 0.005; // ~$20
    tp2Distance = p * 0.01;
  } else if (inst.symbol === 'USOIL' || inst.symbol === 'UKOIL') {
    slDistance = p * 0.008; // ~$0.60 - $0.70
    tp1Distance = p * 0.015;
    tp2Distance = p * 0.028;
  } else if (inst.category === 'Crypto') {
    slDistance = p * 0.018;
    tp1Distance = p * 0.035;
    tp2Distance = p * 0.065;
  } else if (inst.category === 'Indices') {
    slDistance = p * 0.006;
    tp1Distance = p * 0.012;
    tp2Distance = p * 0.022;
  }

  const isBuy = action.includes('BUY');
  const slRaw = isBuy ? p - slDistance : p + slDistance;
  const tp1Raw = isBuy ? p + tp1Distance : p - tp1Distance;
  const tp2Raw = isBuy ? p + tp2Distance : p - tp2Distance;

  const sl = Number(slRaw.toFixed(dec));
  const tp1 = Number(tp1Raw.toFixed(dec));
  const tp2 = Number(tp2Raw.toFixed(dec));

  const spread = Math.abs((inst.ask || p) - (inst.bid || p)) || p * 0.0001;
  const entryLow = Number((p - spread * 0.6).toFixed(dec));
  const entryHigh = Number((p + spread * 0.6).toFixed(dec));
  const entryZone = entryLow === entryHigh ? p.toFixed(dec) : `${entryLow.toFixed(dec)} - ${entryHigh.toFixed(dec)}`;

  const technicalRationale = getSpecificTechnicalReason(inst.symbol, inst.category, isBuy);

  const summary = customQuestion
    ? `Audit for "${customQuestion}": ${inst.symbol} shows ${isBuy ? 'bullish momentum above liquidity floor' : 'bearish rejection under resistance'}. Entry near ${p.toFixed(dec)} with target ${tp1.toFixed(dec)}.`
    : `${isBuy ? 'Bullish' : 'Bearish'} setup on ${inst.symbol} (${timeframe}). ${technicalRationale}.`;

  return {
    symbol: inst.symbol,
    name: inst.name,
    category: inst.category,
    action,
    sentiment: isBuy ? 'BULLISH' : 'BEARISH',
    confidence: Math.min(95, 75 + Math.round(Math.abs(chg) * 3)),
    bullishSentimentPercent: bullishPercent,
    bearishSentimentPercent: bearishPercent,
    currentPrice: p,
    entryZone,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskRewardRatio: '1:2.4',
    pivotPoint: Number(p.toFixed(dec)),
    supportLevel1: Number((p - slDistance * 0.8).toFixed(dec)),
    supportLevel2: Number((p - slDistance * 1.6).toFixed(dec)),
    resistanceLevel1: Number((p + tp1Distance * 0.8).toFixed(dec)),
    resistanceLevel2: Number((p + tp1Distance * 1.6).toFixed(dec)),
    summary,
    technicalRationale,
    catalyst: 'Session order flow and liquidity convergence.',
    timeHorizon: timeframe,
    buzzScore: Math.round(Math.min(9.8, 6.5 + Math.abs(chg) * 0.6) * 10) / 10,
    isAiGenerated: true,
    timestamp: Date.now(),
  };
};

export const aiMarketService = {
  async getSignalsFeed(liveInstruments?: Instrument[]): Promise<{
    signals: AIMarketSignal[];
    topOpportunities: AIMarketSignal[];
    marketSentimentScore: number;
  }> {
    // If live instruments are provided, calculate signals DIRECTLY from real-time live quotes!
    // This ensures 100% price accuracy, exact decimal formatting, and zero mismatch between Entry and SL/TP.
    if (liveInstruments && liveInstruments.length > 0) {
      const generated = liveInstruments.map((inst) => generateSignalFromInstrument(inst));

      // Prioritize top opportunities based on highest momentum/conviction
      const top = [...generated]
        .sort((a, b) => Math.abs(b.bullishSentimentPercent - 50) - Math.abs(a.bullishSentimentPercent - 50))
        .slice(0, 4);

      const avgSentiment = Math.round(
        generated.reduce((acc, curr) => acc + curr.bullishSentimentPercent, 0) / generated.length
      );

      return {
        signals: generated,
        topOpportunities: top,
        marketSentimentScore: avgSentiment,
      };
    }

    return {
      signals: [],
      topOpportunities: [],
      marketSentimentScore: 78,
    };
  },

  async analyzePair(params: AnalyzePairParams, instrumentRef?: Instrument): Promise<AIMarketSignal> {
    const liveInst: Instrument = instrumentRef || {
      symbol: params.symbol,
      name: `${params.symbol} CFD`,
      category: (params.category as any) || 'Forex',
      bid: params.currentPrice,
      ask: params.currentPrice,
      spread: 0.2,
      decimals: typeof params.decimals === 'number' ? params.decimals : params.currentPrice > 500 ? 2 : 5,
      pipMultiplier: 10000,
      change24h: params.change24h || 0,
      high24h: params.high24h || params.currentPrice * 1.005,
      low24h: params.low24h || params.currentPrice * 0.995,
      sparkline: [],
      isFavorite: false,
    };

    return generateSignalFromInstrument(liveInst, params.timeframe || '15M Scalp', params.question);
  },
};
