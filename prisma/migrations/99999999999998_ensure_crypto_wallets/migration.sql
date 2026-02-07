-- Migration: Ensure 10 Crypto Wallets Always Exist
-- These wallets are for deposit/withdrawal functionality
-- Matches SUPPORTED_CRYPTOS in lib/wallet-config.ts

-- Insert crypto wallets if they don't exist
INSERT INTO crypto_wallets (id, currency, wallet_address, is_enabled, network, min_deposit_usdt, min_withdraw_usdt, created_at, updated_at)
VALUES
  -- 1. Bitcoin
  (gen_random_uuid(), 'BTC', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 2. Ethereum
  (gen_random_uuid(), 'ETH', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 3. Tether (USDT)
  (gen_random_uuid(), 'USDT', '', true, 'TRC20', 10.00, 10.00, NOW(), NOW()),
  -- 4. Tron
  (gen_random_uuid(), 'TRX', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 5. Litecoin
  (gen_random_uuid(), 'LTC', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 6. Ripple
  (gen_random_uuid(), 'XRP', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 7. Dogecoin  
  (gen_random_uuid(), 'DOGE', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 8. Cardano
  (gen_random_uuid(), 'ADA', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 9. Solana
  (gen_random_uuid(), 'SOL', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW()),
  -- 10. Binance Coin
  (gen_random_uuid(), 'BNB', '', true, 'Mainnet', 10.00, 10.00, NOW(), NOW())
ON CONFLICT (currency) DO NOTHING;

-- Note: wallet_address is empty initially
-- Admin must configure wallet addresses via Admin Panel > Wallet Settings > Crypto Wallets Management
