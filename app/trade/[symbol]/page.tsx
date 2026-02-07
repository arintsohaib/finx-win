
import { TradingView } from '@/components/trading/trading-view';

interface TradePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function TradePage({ params }: TradePageProps) {
  const { symbol } = await params;
  
  return <TradingView symbol={symbol.toUpperCase()} />;
}

export async function generateStaticParams() {
  const symbols = [
    // Crypto
    'btc', 'eth', 'doge', 'ada', 'ltc', 'xrp', 'sol', 'pi', 'usdt',
    // Forex & Foreign Exchange
    'eurusd', 'gbpusd', 'usdjpy', 'audusd', 'usdcad', 'nzdusd', 'usdchf',
    // Precious Metals
    'gold', 'silver', 'platinum', 'palladium'
  ];
  
  return symbols.map((symbol) => ({
    symbol,
  }));
}
