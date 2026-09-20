-- AlterTable
ALTER TABLE "account_payables" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "account_receivables" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "depreciation" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "inter_account" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "ppn_in_out" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "sales_records" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

