-- Remove contract link from orders (client/contract live on shuttle only)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_contract_id_fkey";
DROP INDEX IF EXISTS "Order_contract_id_idx";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "contract_id";
