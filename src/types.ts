export type MarketCategory =
  | 'Favourites'
  | 'Forex'
  | 'Commodities'
  | 'Indices'
  | 'Stocks'
  | 'ETFs'
  | 'Bonds'
  | 'Crypto'
  | 'All';

export interface Instrument {
  symbol: string;
  name: string;
  category: MarketCategory;
  bid: number;
  ask: number;
  spread: number; // in pips/points
  decimals: number;
  pipMultiplier: number;
  change24h: number; // percentage
  high24h: number;
  low24h: number;
  sparkline: number[];
  isFavorite?: boolean;
}

export type Timeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D' | '1W';
export type ChartType = 'candles' | 'line' | 'area' | 'bars';

export type { UserAuthProfile } from './types/botTypes';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  ticket: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  currentPrice: number;
  sl: number | null;
  tp: number | null;
  pnl: number;
  swap: number;
  commission: number;
  openTime: number;
}

export interface PendingOrder {
  id: string;
  ticket: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  targetPrice: number;
  lots: number;
  sl: number | null;
  tp: number | null;
  status: 'PENDING' | 'TRIGGERED' | 'CANCELLED';
  createdAt: number;
}

export interface ClosedTrade {
  id: string;
  ticket: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  closePrice: number;
  pnl: number;
  openTime: number;
  closeTime: number;
  reason: 'TP' | 'SL' | 'MANUAL';
}

export type AccountType = 'Live' | 'Demo';
export type AccountTier = 'Premium' | 'Pro' | 'Zero Spread' | 'Cent' | 'HFcopy';

export interface TradingAccount {
  id: string;
  accountNumber: string;
  server: string;
  type: AccountType;
  tier: AccountTier;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number; // percentage
  currency: string;
  leverage: string;
  isDefault?: boolean;
}

export interface StrategyProvider {
  id: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  returnPercent: number;
  maxDrawdown: number;
  followers: number;
  performanceFee: number; // percentage, e.g., 20
  riskScore: number; // 1-5
  equityHistory: number[];
  winRate: number;
  totalTrades: number;
  strategyDescription: string;
  experienceMonths: number;
  minDeposit: number;
}

export interface FollowedStrategy {
  providerId: string;
  providerName: string;
  allocatedAmount: number;
  currentProfit: number;
  profitPercent: number;
  volumeAllocation: number; // e.g., 100%
  rescueLevel: number; // e.g., 30%
  startDate: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTERNAL_TRANSFER';
  method: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  timestamp: number;
  reference: string;
  accountNumber?: string;
  details?: string;
}

export interface EconomicEvent {
  id: string;
  time: string;
  country: string;
  flag: string;
  currency: string;
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast: string;
  previous: string;
}

export interface MarketAnalysis {
  id: string;
  title: string;
  author: string;
  role: string;
  date: string;
  category: string;
  summary: string;
  readTime: string;
}

export type ActiveTab =
  | 'menu'
  | 'trades'
  | 'markets'
  | 'bots'
  | 'news'
  | 'more'
  | 'trade'
  | 'hfcopy'
  | 'wallet'
  | 'account'
  | 'instrument-detail';

export interface ActionPopup {
  id: string;
  type:
    | 'TRADE_OPENED'
    | 'TRADE_CLOSED'
    | 'ORDER_CANCELLED'
    | 'DEPOSIT_SUCCESS'
    | 'DEPOSIT_FAILED'
    | 'WITHDRAWAL_SUCCESS'
    | 'WITHDRAWAL_FAILED'
    | 'TRANSFER_SUCCESS'
    | 'TRANSFER_FAILED'
    | 'ACCOUNT_SWITCHED'
    | 'ACCOUNT_CREATED'
    | 'DEMO_RESET'
    | 'BOT_STARTED'
    | 'BOT_STOPPED'
    | 'COPY_STARTED'
    | 'COPY_STOPPED'
    | 'LOGIN_SUCCESS'
    | 'LOGOUT_SUCCESS'
    | 'SUCCESS'
    | 'ERROR'
    | 'INFO';
  title: string;
  subtitle?: string;
  timestamp: number;
  details?: {
    symbol?: string;
    side?: 'BUY' | 'SELL';
    lots?: number;
    price?: number;
    ticket?: number | string;
    pnl?: number;
    amount?: number;
    accountNumber?: string;
    reason?: string;
    method?: string;
    reference?: string;
    sl?: number | null;
    tp?: number | null;
    [key: string]: any;
  };
  duration?: number;
}
