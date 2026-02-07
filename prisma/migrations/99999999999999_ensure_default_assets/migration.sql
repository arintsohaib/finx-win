-- Migration: Ensure 20 Default Trading Assets Always Exist
-- These assets will be available for trading on the user dashboard
-- Covers: 9 Crypto + 7 Forex + 4 Precious Metals

-- Insert default trading assets if they don't exist
INSERT INTO asset_trading_settings (id, asset_symbol, asset_type, asset_name, is_enabled, sort_order, created_at, updated_at)
VALUES
  -- Top 9 Crypto (by market cap & trading volume)
  (gen_random_uuid(), 'BTC', 'crypto', 'Bitcoin', true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'ETH', 'crypto', 'Ethereum', true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'USDT', 'crypto', 'Tether', true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'BNB', 'crypto', 'BNB', true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'SOL', 'crypto', 'Solana', true, 5, NOW(), NOW()),
  (gen_random_uuid(), 'XRP', 'crypto', 'XRP', true, 6, NOW(), NOW()),
  (gen_random_uuid(), 'ADA', 'crypto', 'Cardano', true, 7, NOW(), NOW()),
  (gen_random_uuid(), 'DOGE', 'crypto', 'Dogecoin', true, 8, NOW(), NOW()),
  (gen_random_uuid(), 'USDC', 'crypto', 'USDC', true, 9, NOW(), NOW()),
  
  -- 7 Major Forex Pairs
  (gen_random_uuid(), 'EURUSD', 'forex', 'Euro / US Dollar', true, 10, NOW(), NOW()),
  (gen_random_uuid(), 'GBPUSD', 'forex', 'British Pound / US Dollar', true, 11, NOW(), NOW()),
  (gen_random_uuid(), 'USDJPY', 'forex', 'US Dollar / Japanese Yen', true, 12, NOW(), NOW()),
  (gen_random_uuid(), 'AUDUSD', 'forex', 'Australian Dollar / US Dollar', true, 13, NOW(), NOW()),
  (gen_random_uuid(), 'USDCAD', 'forex', 'US Dollar / Canadian Dollar', true, 14, NOW(), NOW()),
  (gen_random_uuid(), 'USDCHF', 'forex', 'US Dollar / Swiss Franc', true, 15, NOW(), NOW()),
  (gen_random_uuid(), 'NZDUSD', 'forex', 'New Zealand Dollar / US Dollar', true, 16, NOW(), NOW()),
  
  -- 4 Precious Metals
  (gen_random_uuid(), 'GOLD', 'precious_metal', 'Gold', true, 17, NOW(), NOW()),
  (gen_random_uuid(), 'SILVER', 'precious_metal', 'Silver', true, 18, NOW(), NOW()),
  (gen_random_uuid(), 'PLATINUM', 'precious_metal', 'Platinum', true, 19, NOW(), NOW()),
  (gen_random_uuid(), 'PALLADIUM', 'precious_metal', 'Palladium', true, 20, NOW(), NOW())
ON CONFLICT (asset_symbol) DO NOTHING;
