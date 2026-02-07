-- CreateTable
CREATE TABLE "trading_configs" (
    "id" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "profit_percentage" DECIMAL(5,2) NOT NULL,
    "min_purchase_price" DECIMAL(18,2) NOT NULL,
    "max_purchase_price" DECIMAL(18,2) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trading_configs_duration_key" ON "trading_configs"("duration");
