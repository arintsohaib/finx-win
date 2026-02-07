

'use client';

import { useEffect, useRef, memo } from 'react';
import { useTheme } from 'next-themes';

interface TradingViewChartProps {
  symbol: string;
}

function TradingViewChartComponent({ symbol }: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget
    container.current.innerHTML = '';

    // Comprehensive symbol mapping for TradingView
    const symbolMap: Record<string, string> = {
      // Cryptocurrency (Binance)
      'BTC': 'BINANCE:BTCUSDT',
      'ETH': 'BINANCE:ETHUSDT',
      'USDT': 'BINANCE:USDCUSDT',
      'DOGE': 'BINANCE:DOGEUSDT',
      'ADA': 'BINANCE:ADAUSDT',
      'LTC': 'BINANCE:LTCUSDT',
      'XRP': 'BINANCE:XRPUSDT',
      'SOL': 'BINANCE:SOLUSDT',
      'PI': 'BINANCE:PIUSDT',

      // Foreign Exchange / Forex (FX: prefix for major currency pairs)
      'EURUSD': 'FX:EURUSD',
      'GBPUSD': 'FX:GBPUSD',
      'USDJPY': 'FX:USDJPY',
      'AUDUSD': 'FX:AUDUSD',
      'USDCAD': 'FX:USDCAD',
      'NZDUSD': 'FX:NZDUSD',
      'USDCHF': 'FX:USDCHF',

      // Precious Metals (TVC: for Gold/Silver, OANDA: for Platinum/Palladium)
      'GOLD': 'TVC:GOLD',           // Gold spot price
      'SILVER': 'TVC:SILVER',       // Silver spot price
      'PLATINUM': 'OANDA:XPTUSD',   // Platinum vs USD
      'PALLADIUM': 'OANDA:XPDUSD',  // Palladium vs USD

      // US Stocks
      'NVDA': 'NASDAQ:NVDA',
      'GOOGL': 'NASDAQ:GOOGL',
      'AAPL': 'NASDAQ:AAPL',
      'MSFT': 'NASDAQ:MSFT',
      'AMZN': 'NASDAQ:AMZN',
      'META': 'NASDAQ:META',
      'AVGO': 'NASDAQ:AVGO',
      'TSLA': 'NASDAQ:TSLA',
      'BRK.B': 'NYSE:BRK.B',
      'LLY': 'NYSE:LLY',

      // World Stocks
      'TSM': 'NYSE:TSM',           // TSMC
      '2222.SR': 'TADAWUL:2222',   // Saudi Aramco
      '0700.HK': 'HKEX:0700',      // Tencent
      '005930.KS': 'KRX:005930',   // Samsung
      'ASML': 'NASDAQ:ASML',       // ASML
      'BABA': 'NYSE:BABA',         // Alibaba
      '000660.KS': 'KRX:000660',   // SK Hynix
      'ROG.SW': 'SIX:ROG',         // Roche
      '1398.HK': 'HKEX:1398',      // ICBC
      'MC.PA': 'EURONEXT:MC'       // LVMH
    };

    const tradingViewSymbol = symbolMap[symbol] || `BINANCE:${symbol}USDT`;

    console.log(`📊 TradingView Chart: ${symbol} → ${tradingViewSymbol}`);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: '5',
      timezone: 'Etc/UTC',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: 'tradingview_chart'
    });

    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
      <div
        id="tradingview_chart"
        ref={container}
        style={{ height: '500px', width: '100%' }}
      />
    </div>
  );
}

export default memo(TradingViewChartComponent);

