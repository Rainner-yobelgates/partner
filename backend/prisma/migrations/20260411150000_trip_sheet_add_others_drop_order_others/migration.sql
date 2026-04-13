-- Pindahkan kolom others dari Order ke TripSheet
ALTER TABLE "Order" DROP COLUMN IF EXISTS "others";
ALTER TABLE "TripSheet" ADD COLUMN "others" DECIMAL(15,2);
