-- AlterTable
ALTER TABLE "balances" ADD COLUMN     "demo_winnings" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "frozen_balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "real_balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "real_winnings" DECIMAL(18,8) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "balance_type" TEXT NOT NULL DEFAULT 'demo';
