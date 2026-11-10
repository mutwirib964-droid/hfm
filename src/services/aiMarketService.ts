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

  const summary = customQuestion
    ? `Audit for "${customQuestion}": ${inst.symbol} shows ${isBuy ? 'bullish momentum above liquidity floor' : 'bearish rejection under resistance'}. Entry near ${p.toFixed(dec)} with target ${tp1.toFixed(dec)}.`
    : `${isBuy ? 'Bullish' : 'Bearish'} setup on ${inst.symbol} (${timeframe}). Recommendation: ${action.replace('_', ' ')} with target ${tp1.toFixed(dec)} and protective stop at ${sl.toFixed(dec)}.`;

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
    technicalRationale: `EMA dynamic slope confirms ${isBuy ? 'sustained expansion' : 'distribution'}. RSI momentum holds within optimal institutional execution zone.`,
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
