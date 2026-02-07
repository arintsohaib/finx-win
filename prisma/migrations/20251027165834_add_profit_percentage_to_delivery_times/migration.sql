-- Add profitPercentage field to DeliveryTime table
ALTER TABLE "delivery_times" ADD COLUMN "profit_percentage" DECIMAL(5,2) NOT NULL DEFAULT 10.00;
