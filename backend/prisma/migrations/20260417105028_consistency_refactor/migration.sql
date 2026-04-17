/*
  Warnings:

  - You are about to drop the column `end_of_2020_idr` on the `accounts_receivable` table. All the data in the column will be lost.
  - You are about to drop the column `end_of_2020_usd` on the `accounts_receivable` table. All the data in the column will be lost.
  - You are about to drop the column `total_idr` on the `balance_sheet_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "col18" VARCHAR(255),
ADD COLUMN     "col21" VARCHAR(255),
ADD COLUMN     "col9" VARCHAR(255);

-- AlterTable
ALTER TABLE "accounts_receivable" DROP COLUMN "end_of_2020_idr",
DROP COLUMN "end_of_2020_usd",
ADD COLUMN     "col0" VARCHAR(255),
ADD COLUMN     "col16" VARCHAR(255),
ADD COLUMN     "col19" VARCHAR(255),
ADD COLUMN     "col8" VARCHAR(255),
ADD COLUMN     "idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "usd" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "asset_depreciations" ADD COLUMN     "col20" VARCHAR(255),
ADD COLUMN     "col21" VARCHAR(255);

-- AlterTable
ALTER TABLE "balance_sheet_items" DROP COLUMN "total_idr",
ADD COLUMN     "col5" VARCHAR(255),
ADD COLUMN     "col6" VARCHAR(255),
ADD COLUMN     "col7" VARCHAR(255),
ADD COLUMN     "col8" VARCHAR(255),
ADD COLUMN     "rate" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "col_i" TEXT,
ADD COLUMN     "col_j" TEXT,
ADD COLUMN     "col_k" TEXT,
ADD COLUMN     "col_l" TEXT,
ADD COLUMN     "ledger" TEXT,
ADD COLUMN     "sub_ledger_1" TEXT,
ADD COLUMN     "sub_ledger_2" TEXT,
ADD COLUMN     "sub_ledger_3" TEXT;

-- AlterTable
ALTER TABLE "profit_loss_costs" ADD COLUMN     "col10" VARCHAR(255),
ADD COLUMN     "col12" VARCHAR(255),
ADD COLUMN     "col13" VARCHAR(255),
ADD COLUMN     "col14" VARCHAR(255),
ADD COLUMN     "col15" VARCHAR(255),
ADD COLUMN     "sub_category" VARCHAR(255);

-- AlterTable
ALTER TABLE "profit_loss_sales" ADD COLUMN     "col10" VARCHAR(255),
ADD COLUMN     "col12" VARCHAR(255),
ADD COLUMN     "col13" VARCHAR(255),
ADD COLUMN     "col14" VARCHAR(255),
ADD COLUMN     "col15" VARCHAR(255),
ADD COLUMN     "col8" VARCHAR(255),
ADD COLUMN     "col9" VARCHAR(255);

-- AlterTable
ALTER TABLE "sales_records" ADD COLUMN     "col11" VARCHAR(255),
ADD COLUMN     "col27" VARCHAR(255),
ADD COLUMN     "col28" VARCHAR(255),
ADD COLUMN     "col29" VARCHAR(255),
ADD COLUMN     "unknown20" VARCHAR(255);

-- CreateTable
CREATE TABLE "profit_loss_summaries" (
    "id" BIGSERIAL NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "bca" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mandiri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "btn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "non_cb" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "other" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_loss_summaries_pkey" PRIMARY KEY ("id")
);
