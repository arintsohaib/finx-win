
'use client';

export function Footer() {
  return (
    <footer className="w-full border-t bg-card mt-auto gradient-overlay">
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="text-center space-y-2">
          {/* API Attribution (Required by free tier) - Enhanced Dark Mode Visibility */}
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/90">
            Price data provided by{' '}
            <a 
              href="https://www.coingecko.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground dark:text-muted-foreground/90 dark:hover:text-foreground underline underline-offset-2 transition-all duration-300 hover:text-[#00D9C0]"
            >
              CoinGecko
            </a>
            {', '}
            <a 
              href="https://www.binance.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground dark:text-muted-foreground/90 dark:hover:text-foreground underline underline-offset-2 transition-all duration-300 hover:text-[#00D9C0]"
            >
              Binance
            </a>
            {', and '}
            <a 
              href="https://coincap.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground dark:text-muted-foreground/90 dark:hover:text-foreground underline underline-offset-2 transition-all duration-300 hover:text-[#00D9C0]"
            >
              CoinCap
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
