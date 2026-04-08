-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "start_date" TIMESTAMP(3),
ADD COLUMN "finish_date" TIMESTAMP(3),
ADD COLUMN "destination" TEXT;

-- Backfill existing data from legacy columns
UPDATE "Order"
SET
  "start_date" = COALESCE("start_date", "usage_date"),
  "finish_date" = COALESCE("finish_date", "usage_date"),
  "destination" = COALESCE("destination", "dropoff_location");
