-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" BIGSERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "withdrawal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deposit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "category" VARCHAR(100),
    "sub_category" VARCHAR(100),
    "reference" VARCHAR(255),
    "extra_info" TEXT,
    "source" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_records" (
    "id" BIGSERIAL NOT NULL,
    "no" VARCHAR(20),
    "date" VARCHAR(50),
    "year" INTEGER,
    "billing_to" VARCHAR(255),
    "project" VARCHAR(255),
    "description" TEXT,
    "basic_price" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "management_fee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ppn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bca" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mandiri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "danamon" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "btn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "non_cb" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "outstanding" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "pph_23" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ap_pph_23" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ppn_tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ap_ppn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_received" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" BIGSERIAL NOT NULL,
    "ar_type" VARCHAR(255),
    "sub_category" VARCHAR(255),
    "entity_name" VARCHAR(255),
    "description" TEXT,
    "end_of_2020_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "end_of_2020_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "rate" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bca" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mandiri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "non_cb" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "citibank" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "outstanding_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "outstanding_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "adjustment_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "adjustment_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" BIGSERIAL NOT NULL,
    "payable" VARCHAR(255),
    "year" VARCHAR(50),
    "vendor" VARCHAR(255),
    "keterangan" TEXT,
    "idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "rate" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cost_category" VARCHAR(255),
    "project_ref" TEXT,
    "bca" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mandiri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "btn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "non_cb" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "citibank" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "outstanding_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "outstanding_usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "notes_yogi" TEXT,
    "koreksi_selisih" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciations" (
    "id" BIGSERIAL NOT NULL,
    "purchase_date" VARCHAR(50),
    "bank_ref" VARCHAR(100),
    "asset_name" VARCHAR(255) NOT NULL,
    "purchase_price" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "useful_life_months" INTEGER NOT NULL DEFAULT 0,
    "accumulated_2020" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "jan" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "feb" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mar" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "apr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "may" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "jun" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "jul" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "aug" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "sep" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "oct" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "nov" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "dec" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_2021" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "accumulated_2021" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "book_value" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_depreciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_loss_accounts" (
    "id" BIGSERIAL NOT NULL,
    "no" INTEGER,
    "account_name" VARCHAR(255) NOT NULL,
    "gross" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "vat" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ap_vat" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit_note" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ap_credit_note" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_sales" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_loss_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheet_items" (
    "id" BIGSERIAL NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "usd" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_account_transfers" (
    "id" BIGSERIAL NOT NULL,
    "description" VARCHAR(255),
    "bca" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "mandiri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bri" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "btn" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_idr" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "non_cash_bank" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "checker" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_transactions_date_idx" ON "financial_transactions"("date");

-- CreateIndex
CREATE INDEX "financial_transactions_source_idx" ON "financial_transactions"("source");

