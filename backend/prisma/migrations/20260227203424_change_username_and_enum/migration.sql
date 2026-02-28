/*
  Warnings:

  - The values [CADANGAN,UTAMA] on the enum `DriverType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DriverType_new" AS ENUM ('ASSISTANT', 'RESERVE', 'MAIN');
ALTER TABLE "Driver" ALTER COLUMN "type" TYPE "DriverType_new" USING ("type"::text::"DriverType_new");
ALTER TYPE "DriverType" RENAME TO "DriverType_old";
ALTER TYPE "DriverType_new" RENAME TO "DriverType";
DROP TYPE "public"."DriverType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
