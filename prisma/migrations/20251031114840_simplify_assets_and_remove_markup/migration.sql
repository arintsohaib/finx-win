
-- Step 1: Clean up all user data completely
TRUNCATE TABLE "activity_logs" CASCADE;
TRUNCATE TABLE "kyc_submissions" CASCADE;
TRUNCATE TABLE "notifications" CASCADE;
TRUNCATE TABLE "chat_messages" CASCADE;
TRUNCATE TABLE "chat_sessions" CASCADE;
TRUNCATE TABLE "chat_typing" CASCADE;
TRUNCATE TABLE "conversions" CASCADE;
TRUNCATE TABLE "withdrawals" CASCADE;
TRUNCATE TABLE "deposits" CASCADE;
TRUNCATE TABLE "deposit_addresses" CASCADE;
TRUNCATE TABLE "trades" CASCADE;
TRUNCATE TABLE "balances" CASCADE;
TRUNCATE TABLE "users" CASCADE;

-- Step 2: Remove obsolete tables
DROP TABLE IF EXISTS "delivery_times" CASCADE;
DROP TABLE IF EXISTS "trading_configs" CASCADE;

-- Step 3: Simplify AssetTradingSettings - Remove individual asset configs
ALTER TABLE "asset_trading_settings" DROP COLUMN IF EXISTS "delivery_times";
ALTER TABLE "asset_trading_settings" DROP COLUMN IF EXISTS "profit_levels";
ALTER TABLE "asset_trading_settings" DROP COLUMN IF EXISTS "min_trade_amount";
ALTER TABLE "asset_trading_settings" DROP COLUMN IF EXISTS "max_trade_amount";
ALTER TABLE "asset_trading_settings" DROP COLUMN IF EXISTS "price_markup_percent";

-- GlobalAssetSettings is already correct (deliveryTime, profitLevel, minUsdt - no max, no markup)
