-- PPN In/Out: kolom workbook 2026 yang belum punya tempat.
ALTER TABLE "ppn_in_out" ADD COLUMN "dpp" DECIMAL(19,4),
ADD COLUMN "status" TEXT;
