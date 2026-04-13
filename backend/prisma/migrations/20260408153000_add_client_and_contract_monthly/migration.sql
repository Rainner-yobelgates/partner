-- CreateTable
CREATE TABLE "Client" (
    "id" BIGSERIAL NOT NULL,
    "clients_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contact_person" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_clients_uuid_key" ON "Client"("clients_uuid");
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- Seed a fallback client for legacy records
INSERT INTO "Client" ("clients_uuid", "name", "status", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Client', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- AlterTable Contract (add columns first as nullable)
ALTER TABLE "Contract"
ADD COLUMN "client_id" BIGINT,
ADD COLUMN "contract_month" INTEGER,
ADD COLUMN "contract_year" INTEGER;

-- Backfill existing Contract rows
UPDATE "Contract" c
SET
  "client_id" = COALESCE(c."client_id", (SELECT id FROM "Client" WHERE "name" = 'Legacy Client' LIMIT 1)),
  "contract_month" = COALESCE(c."contract_month", EXTRACT(MONTH FROM COALESCE(c."start_date", CURRENT_DATE))::int),
  "contract_year" = COALESCE(c."contract_year", EXTRACT(YEAR FROM COALESCE(c."start_date", CURRENT_DATE))::int);

-- Enforce NOT NULL after backfill
ALTER TABLE "Contract"
ALTER COLUMN "client_id" SET NOT NULL,
ALTER COLUMN "contract_month" SET NOT NULL,
ALTER COLUMN "contract_year" SET NOT NULL;

-- Contract FK and index
ALTER TABLE "Contract"
ADD CONSTRAINT "Contract_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Contract_client_id_contract_year_contract_month_idx"
ON "Contract"("client_id", "contract_year", "contract_month");

-- AlterTable Order (add columns first as nullable)
ALTER TABLE "Order"
ADD COLUMN "client_id" BIGINT,
ADD COLUMN "contract_id" BIGINT;

-- Try to link order to contract by order/usage/start date month+year
UPDATE "Order" o
SET "contract_id" = c.id
FROM "Contract" c
WHERE o."contract_id" IS NULL
  AND c."deleted_at" IS NULL
  AND EXTRACT(MONTH FROM COALESCE(o."start_date", o."usage_date", o."order_date", CURRENT_DATE))::int = c."contract_month"
  AND EXTRACT(YEAR FROM COALESCE(o."start_date", o."usage_date", o."order_date", CURRENT_DATE))::int = c."contract_year";

-- Backfill client_id from matched contract
UPDATE "Order" o
SET "client_id" = c."client_id"
FROM "Contract" c
WHERE o."client_id" IS NULL
  AND o."contract_id" = c.id;

-- Fallback legacy client for remaining order rows
UPDATE "Order" o
SET "client_id" = (SELECT id FROM "Client" WHERE "name" = 'Legacy Client' LIMIT 1)
WHERE o."client_id" IS NULL;

-- Enforce NOT NULL for order.client_id
ALTER TABLE "Order"
ALTER COLUMN "client_id" SET NOT NULL;

-- Order FK and indexes
ALTER TABLE "Order"
ADD CONSTRAINT "Order_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Order_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_client_id_idx" ON "Order"("client_id");
CREATE INDEX "Order_contract_id_idx" ON "Order"("contract_id");

-- Client audit FKs
ALTER TABLE "Client"
ADD CONSTRAINT "Client_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Client_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Client_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop unused table
DROP TABLE IF EXISTS "ContractInvoice";
