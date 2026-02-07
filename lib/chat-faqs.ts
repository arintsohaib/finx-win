
export const CHAT_FAQS = [
  {
    id: 'deposit-crypto',
    category: 'Deposits',
    question: 'How do I deposit cryptocurrency?',
    answer: 'To deposit crypto: 1) Go to Wallet page, 2) Click "Deposit" on your chosen currency, 3) Copy the deposit address or scan QR code, 4) Send crypto from your external wallet, 5) Upload payment proof and transaction hash, 6) Wait for admin approval (usually within 5-15 minutes).',
  },
  {
    id: 'deposit-time',
    category: 'Deposits',
    question: 'How long does deposit approval take?',
    answer: 'Most deposits are approved within 5-15 minutes during business hours. Complex cases or large amounts may take up to 1 hour. You\'ll receive a notification once approved. If it takes longer, please contact support with your transaction hash.',
  },
  {
    id: 'supported-coins',
    category: 'Deposits',
    question: 'Which cryptocurrencies can I deposit?',
    answer: 'We support deposits in: BTC (Bitcoin), ETH (Ethereum), USDT (Tether), DOGE (Dogecoin), ADA (Cardano), LTC (Litecoin), XRP (Ripple), SOL (Solana), and PI (Pi Network). All deposits are converted to USDT for trading.',
  },
  {
    id: 'withdraw-crypto',
    category: 'Withdrawals',
    question: 'How do I withdraw my funds?',
    answer: 'To withdraw: 1) Go to Wallet page, 2) Click "Withdraw" on the currency you want, 3) Enter your external wallet address, 4) Specify the amount (minimum varies by coin), 5) Review fees and confirm, 6) Wait for admin approval. Withdrawals are processed within 1-24 hours.',
  },
  {
    id: 'withdraw-fees',
    category: 'Withdrawals',
    question: 'What are the withdrawal fees and limits?',
    answer: 'Withdrawal fees vary by cryptocurrency (typically 0.5-2% + network gas fees). Minimum withdrawal: BTC: 0.001, ETH: 0.01, USDT: 10. Maximum withdrawal: $50,000 per day (contact support for higher limits). VIP users get reduced fees.',
  },
  {
    id: 'convert-crypto',
    category: 'Conversions',
    question: 'How do I convert between cryptocurrencies?',
    answer: 'To convert crypto: 1) Go to Converter page, 2) Select "From" currency (your current crypto), 3) Select "To" currency (usually USDT for trading), 4) Enter amount, 5) Review the live exchange rate, 6) Click "Convert Now". Conversions are instant with no fees!',
  },
  {
    id: 'conversion-rates',
    category: 'Conversions',
    question: 'How are conversion rates determined?',
    answer: 'Conversion rates are fetched from multiple sources (CoinGecko, CoinMarketCap, Binance) in real-time to ensure fair pricing. We display the live rate, 24h change, and update rates every 10 seconds. No hidden markups - you get the market rate!',
  },
  {
    id: 'start-trading',
    category: 'Trading',
    question: 'How do I start trading?',
    answer: 'To start trading: 1) Ensure you have USDT balance (deposit or convert crypto), 2) Go to Dashboard and select an asset (BTC, ETH, Forex, Metals), 3) Choose Buy/Sell based on your prediction, 4) Select duration (60s to 1h) and profit multiplier (10% to 80%), 5) Enter amount and click "Trade Now". Your trade will execute immediately!',
  },
  {
    id: 'profit-multiplier',
    category: 'Trading',
    question: 'What are profit multipliers and durations?',
    answer: 'Profit multipliers determine your potential profit (10%, 20%, 50%, 80% of your investment). Higher multipliers = higher risk. Durations: 60s (1 min), 5m, 15m, 30m, 1h. Shorter durations are faster but more volatile. Example: $100 trade with 20% multiplier = $120 profit if you win.',
  },
  {
    id: 'trading-fees',
    category: 'Trading',
    question: 'Are there any trading fees?',
    answer: 'Yes, there\'s a small fee (typically 1-3%) deducted from your trade amount. Fees vary by asset type: Crypto: 2%, Forex: 1.5%, Precious Metals: 1.8%. Fees are clearly shown before you confirm the trade. VIP users get up to 50% fee discounts!',
  },
  {
    id: 'account-verification',
    category: 'Account',
    question: 'Do I need to verify my account?',
    answer: 'Basic trading requires just a Web3 wallet connection (MetaMask, Trust Wallet, etc.). For withdrawals above $1,000 per day, KYC verification is required: submit ID, proof of address, and selfie. Verification takes 24-48 hours and unlocks higher limits.',
  },
  {
    id: 'wallet-balance',
    category: 'Account',
    question: 'Why is my wallet balance different from trading balance?',
    answer: 'Your wallet shows "Real Balance" (deposited funds) and "Trading Balance" (available for trading, including winnings). Real Balance can be withdrawn anytime. Bonus/demo funds appear separately. Check Wallet History to see all transactions and understand your balance breakdown.',
  },
];

export function getChatFAQsByCategory(category?: string) {
  if (!category || category === 'all') {
    return CHAT_FAQS;
  }
  return CHAT_FAQS.filter((faq: any) => faq.category.toLowerCase() === category.toLowerCase());
}

export function searchChatFAQs(query: string) {
  const lowerQuery = query.toLowerCase();
  return CHAT_FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery) ||
      faq.category.toLowerCase().includes(lowerQuery)
  );
}
