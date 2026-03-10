/*
  Warnings:

  - You are about to drop the column `lainnya` on the `Shuttle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shuttle" DROP COLUMN "lainnya",
ADD COLUMN     "others" DECIMAL(65,30);
