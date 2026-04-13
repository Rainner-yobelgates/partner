/*
  Warnings:

  - You are about to drop the column `end_date` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `Contract` table. All the data in the column will be lost.
  - You are about to alter the column `cost` on the `VehicleService` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(15,2)`.

*/
-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "end_date",
DROP COLUMN "start_date";

-- AlterTable
ALTER TABLE "VehicleService" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(15,2);
