-- Additive only: one new enum, one new table. No existing object is altered.

-- CreateEnum
CREATE TYPE "PdfTemplateType" AS ENUM ('PROPOSAL', 'INVOICE');

-- CreateTable
CREATE TABLE "pdf_templates" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "PdfTemplateType" NOT NULL,
    "html_content" TEXT NOT NULL,
    "variables" JSONB,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_templates_name_key" ON "pdf_templates"("name");
CREATE INDEX "pdf_templates_type_idx" ON "pdf_templates"("type");
CREATE INDEX "pdf_templates_is_active_idx" ON "pdf_templates"("is_active");
