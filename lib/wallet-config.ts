
// Multi-Currency Wallet Configuration

export interface CryptoConfig {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  coingeckoId: string; // For fetching real-time prices
  logoUrl: string; // Logo image URL
  network?: string;
  decimals: number;
  isStablecoin: boolean;
}

export const SUPPORTED_CRYPTOS: Record<string, CryptoConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
    coingeckoId: 'bitcoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    decimals: 8,
    isStablecoin: false,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'Ξ',
    color: '#627EEA',
    coingeckoId: 'ethereum',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    decimals: 8,
    isStablecoin: false,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    icon: '₮',
    color: '#26A17B',
    coingeckoId: 'tether',
    logoUrl: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    network: 'TRC20',
    decimals: 2,
    isStablecoin: true,
  },
  TRX: {
    symbol: 'TRX',
    name: 'Tron',
    icon: 'Ⓣ',
    color: '#EB0029',
    coingeckoId: 'tron',
    logoUrl: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
    decimals: 6,
    isStablecoin: false,
  },
  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    icon: 'Ł',
    color: '#345D9D',
    coingeckoId: 'litecoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
    decimals: 8,
    isStablecoin: false,
  },
  XRP: {
    symbol: 'XRP',
    name: 'Ripple',
    icon: '✕',
    color: '#23292F',
    coingeckoId: 'ripple',
    logoUrl: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    decimals: 6,
    isStablecoin: false,
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    icon: 'Ð',
    color: '#C2A633',
    coingeckoId: 'dogecoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    decimals: 8,
    isStablecoin: false,
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    icon: '₳',
    color: '#0033AD',
    coingeckoId: 'cardano',
    logoUrl: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    decimals: 6,
    isStablecoin: false,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    icon: '◎',
    color: '#14F195',
    coingeckoId: 'solana',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    decimals: 8,
    isStablecoin: false,
  },
  BNB: {
    symbol: 'BNB',
    name: 'Binance Coin',
    icon: 'B',
    color: '#F3BA2F',
    coingeckoId: 'binancecoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    decimals: 8,
    isStablecoin: false,
  },
};

// Cryptocurrencies available for conversion to USDT
export const CONVERTIBLE_CRYPTOS = Object.keys(SUPPORTED_CRYPTOS).filter(
  (symbol) => symbol !== 'USDT'
);

// Trading currency - only USDT can be used for trading
export const TRADING_CURRENCY = 'USDT';

// Minimum amounts for operations (in USDT equivalent)
export const MIN_DEPOSIT_USDT = 10;
export const MIN_WITHDRAWAL_USDT = 10;
export const MIN_CONVERSION_USDT = 5;
