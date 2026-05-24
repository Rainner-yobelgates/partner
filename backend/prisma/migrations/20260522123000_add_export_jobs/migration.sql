CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "ExportJob" (
    "id" BIGSERIAL NOT NULL,
    "export_jobs_uuid" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB NOT NULL,
    "file_name" TEXT,
    "file_path" TEXT,
    "error_message" TEXT,
    "created_by" BIGINT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExportJob_export_jobs_uuid_key" ON "ExportJob"("export_jobs_uuid");
CREATE INDEX "ExportJob_module_name_status_created_at_idx" ON "ExportJob"("module_name", "status", "created_at");
CREATE INDEX "ExportJob_created_by_module_name_created_at_idx" ON "ExportJob"("created_by", "module_name", "created_at");
