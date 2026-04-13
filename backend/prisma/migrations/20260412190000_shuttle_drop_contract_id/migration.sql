-- Antar jemput hanya mengikat klien; kontrak terpisah per klien (tanpa FK shuttle → kontrak)
ALTER TABLE "Shuttle" DROP CONSTRAINT IF EXISTS "Shuttle_contract_id_fkey";
ALTER TABLE "Shuttle" DROP COLUMN IF EXISTS "contract_id";
