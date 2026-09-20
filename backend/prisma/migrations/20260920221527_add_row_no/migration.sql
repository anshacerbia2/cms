-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "row_no" INTEGER;

-- CreateIndex
CREATE INDEX "financial_transactions_internal_account_id_tagYear_row_no_idx" ON "financial_transactions"("internal_account_id", "tagYear", "row_no");

