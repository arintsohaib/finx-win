-- AlterTable: Add processedBy and processedAt for Deposits
ALTER TABLE "deposits" 
ADD COLUMN IF NOT EXISTS "processed_by" TEXT,
ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP(3);

-- AlterTable: Add processedBy for Withdrawals  
ALTER TABLE "withdrawals" 
ADD COLUMN IF NOT EXISTS "processed_by" TEXT;

-- Update existing deposits to set processed_at from approvedAt or rejectedAt
UPDATE "deposits" 
SET "processed_at" = COALESCE("approved_at", "rejected_at")
WHERE "processed_at" IS NULL AND ("approved_at" IS NOT NULL OR "rejected_at" IS NOT NULL);

-- Update existing withdrawals to set processed_at from processedAt or rejectedAt
UPDATE "withdrawals" 
SET "processed_at" = COALESCE("processed_at", "rejected_at")
WHERE "processed_at" IS NULL;
