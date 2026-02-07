
-- AlterTable
ALTER TABLE "trades" ADD COLUMN "manual_outcome_preset" TEXT,
ADD COLUMN "manual_preset_by" TEXT,
ADD COLUMN "manual_preset_at" TIMESTAMP(3);
