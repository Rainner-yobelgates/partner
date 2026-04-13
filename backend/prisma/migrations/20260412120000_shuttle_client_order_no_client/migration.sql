-- Shuttle: milik client (dan opsional kontrak). Order: tanpa client_id (hanya kontrak opsional + data pemesan).

ALTER TABLE "Shuttle" ADD COLUMN "client_id" BIGINT;

UPDATE "Shuttle" s
SET "client_id" = c."client_id"
FROM "Contract" c
WHERE s."contract_id" = c."id"
  AND s."client_id" IS NULL;

UPDATE "Shuttle"
SET "client_id" = (SELECT id FROM "Client" WHERE name = 'Legacy Client' LIMIT 1)
WHERE "client_id" IS NULL;

ALTER TABLE "Shuttle" ALTER COLUMN "client_id" SET NOT NULL;

ALTER TABLE "Shuttle"
ADD CONSTRAINT "Shuttle_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Shuttle_client_id_idx" ON "Shuttle"("client_id");

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_client_id_fkey";
DROP INDEX IF EXISTS "Order_client_id_idx";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "client_id";
