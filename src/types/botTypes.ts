export type UserRole = 'normal' | 'marketer' | 'admin';

export type BotType = 'INBUILT' | 'IMPORTED';

export interface BotStrategyConfig {
  id: string;
  name: string;
  type: BotType;
  description: string;
  tag: string;
  recommendedInstruments: string[];
  defaultLotSize: number;
  defaultTpPips: number;
  defaultSlPips: number;
  author: string;
  version: string;
  strategyLogic: string;
  indicatorTriggers: string[];
  timeframe: string;
  importedFileName?: string;
  customCodeSnippet?: string;
  claimedWinRate?: string;
}

export interface BotRunInstance {
  id: string;
  runId?: string;
  botId: string;
  botName: string;
  botType: BotType;
  symbol: string;
  lotSize: number;
  tpPips: number;
  slPips: number;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  userRoleAtStart?: UserRole;
  startedAt: number;
  totalTrades?: number;
  totalTradesCount?: number;
  winningTrades?: number;
  winCount?: number;
  losingTrades?: number;
  totalProfitUsd: number;
  activeTradeId?: string;
  lastSignal?: string;
  lastSignalTime?: number;
}

export interface BotTrade {
  id: string;
  runInstanceId?: string;
  runId?: string;
  ticket?: number;
  botId?: string;
  botName: string;
  botType?: BotType;
  symbol: string;
  side: 'BUY' | 'SELL';
  lotSize: number;
  openPrice: number;
  currentPrice: number;
  closePrice?: number;
  exitPrice?: number;
  tpPrice?: number;
  slPrice?: number;
  tp?: number;
  sl?: number;
  tpPips?: number;
  slPips?: number;
  openTime: number;
  closeTime?: number;
  status: 'OPEN' | 'CLOSED';
  profitUsd: number;
  closeReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE' | 'TP' | 'SL';
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE' | 'TP' | 'SL';
  userRole?: UserRole;
  targetOutcome?: 'WIN' | 'LOSS';
}

export interface UserAuthProfile {
  id: string;
  name: string; // Full legal name
  email: string;
  phoneNumber?: string; // Phone number locked for withdrawal security
  countryCode?: string; // e.g. "+254" or "+1"
  countryName?: string; // e.g. "Kenya"
  accountNumber: string;
  role: UserRole;
  isLoggedIn: boolean;
  isNewRegistration?: boolean;
  avatar?: string;
  createdAt: number;
}
