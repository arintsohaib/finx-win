/*
  Warnings:

  - You are about to drop the column `amount` on the `deposits` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_address_id` on the `deposits` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `withdrawals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "deposits" DROP COLUMN "amount",
DROP COLUMN "deposit_address_id",
ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "conversion_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "crypto_amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_screenshot" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "usdt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "trade_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trade_status" TEXT NOT NULL DEFAULT 'automatic';

-- AlterTable
ALTER TABLE "withdrawals" DROP COLUMN "amount",
ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "conversion_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "crypto_amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "usdt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ALTER COLUMN "fee" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "asset_trading_settings" (
    "id" TEXT NOT NULL,
    "asset_symbol" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "delivery_times" TEXT NOT NULL,
    "profit_levels" TEXT NOT NULL,
    "min_trade_amount" DECIMAL(18,2) NOT NULL,
    "max_trade_amount" DECIMAL(18,2) NOT NULL,
    "price_markup_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_trading_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_wallets" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "network" TEXT,
    "min_deposit_usdt" DECIMAL(18,2) NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_trading_settings_asset_symbol_key" ON "asset_trading_settings"("asset_symbol");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_wallets_currency_key" ON "crypto_wallets"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_settings_key_key" ON "wallet_settings"("key");
