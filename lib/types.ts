
import { Decimal } from '@prisma/client/runtime/library';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  image: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface User {
  walletAddress: string;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Balance {
  id: number;
  walletAddress: string;
  currency: string;
  amount: Decimal;
  updatedAt: Date;
}

export interface Trade {
  id: string;
  walletAddress: string;
  asset: string;
  side: string;
  entryPrice: Decimal;
  amountUsd: Decimal;
  duration: string;
  profitMultiplier: string;
  fee: Decimal;
  status: string;
  result: string;
  createdAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
  exitPrice: Decimal | null;
  pnl: Decimal | null;
}

export interface Deposit {
  id: string;
  walletAddress: string;
  currency: string;
  amount: Decimal | null;
  depositAddress: string;
  status: string;
  txHash: string | null;
  createdAt: Date;
  approvedAt: Date | null;
}

export interface Withdrawal {
  id: string;
  walletAddress: string;
  currency: string;
  amount: Decimal;
  destinationAddress: string;
  status: string;
  txHash: string | null;
  fee: Decimal;
  createdAt: Date;
  processedAt: Date | null;
}

export const SUPPORTED_CURRENCIES = [
  'BTC', 'ETH', 'USDT', 'TRX', 'LTC', 'XRP', 'DOGE', 'ADA', 'SOL', 'PI', 'BNB', 'MATIC'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  TRX: 'Tron',
  LTC: 'Litecoin',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  SOL: 'Solana',
  PI: 'Pi Network',
  BNB: 'Binance Coin',
  MATIC: 'Polygon'
};

export const TRADE_DURATIONS = [
  { value: '60s', label: '60 Seconds' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' }
];

export const PROFIT_MULTIPLIERS = [
  { value: '10%', label: '*10%' },
  { value: '20%', label: '*20%' }
];

export interface Web3User {
  address: string;
  balance: string;
  network: string;
}

export interface AuthSession {
  user: Web3User;
  expires: string;
  accessToken: string;
}
