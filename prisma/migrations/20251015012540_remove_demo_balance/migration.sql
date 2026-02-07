-- Remove demo balance system
-- Drop demo balance columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "demo_balance";
ALTER TABLE "users" DROP COLUMN IF EXISTS "demo_balance_expiry";

-- Drop demo winnings from balances table
ALTER TABLE "balances" DROP COLUMN IF EXISTS "demo_winnings";

-- Drop balance_type from trades table  
ALTER TABLE "trades" DROP COLUMN IF EXISTS "balance_type";
