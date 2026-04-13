-- Contract.contract_value was in Prisma schema but had no prior migration (aligns with DECIMAL(15,2))

ALTER TABLE "Contract" ADD COLUMN "contract_value" DECIMAL(15,2);
