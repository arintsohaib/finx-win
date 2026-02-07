-- AlterTable
ALTER TABLE "crypto_wallets" ADD COLUMN "min_withdraw_usdt" DECIMAL(18,2) NOT NULL DEFAULT 10;
