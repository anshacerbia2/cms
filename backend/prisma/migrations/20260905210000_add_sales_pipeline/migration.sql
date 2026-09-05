-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('FIT', 'REGULAR');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WIN', 'LOSE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ManagementFeeType" AS ENUM ('NOMINAL', 'PERCENT');

-- CreateEnum
CREATE TYPE "InvoiceBillingType" AS ENUM ('PARTLY_PAYMENT', 'FULL_AMOUNT');

-- CreateEnum
CREATE TYPE "InvoiceTaxType" AS ENUM ('NO_TAX', 'TAX_NON_WAPU', 'TAX_WAPU');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('VOID', 'REVISED', 'PREPARED', 'SENT');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTLY_PAID', 'FULLY_PAID');

-- CreateEnum
CREATE TYPE "VoucherCurrency" AS ENUM ('IDR', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'MYR', 'HKD', 'OTHERS');

-- CreateEnum
CREATE TYPE "VoucherPaymentForm" AS ENUM ('BANK', 'CREDIT_CARD', 'CASH');

-- CreateEnum
CREATE TYPE "VoucherPayerType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'SUPPLIER', 'OTHERS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReceiveVoucherPurpose" AS ENUM ('INVOICE', 'RETURN_REFUND', 'RETURNING_DEPOSIT', 'RETURNING_CASH_ADVANCE', 'STAFF_LOAN', 'OTHERS', 'UNKNOWN');

-- CreateTable
CREATE TABLE "projects" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ref_doc_no" VARCHAR(255) NOT NULL,
    "value" DECIMAL(19,4) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "description" TEXT,
    "customer_id" BIGINT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "ProjectType" NOT NULL DEFAULT 'REGULAR',
    "sales_code" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "sales_code" VARCHAR(255),
    "note" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount_items" DECIMAL(19,4),
    "pricing_model" "PricingModel",
    "management_fee_type" "ManagementFeeType" NOT NULL DEFAULT 'PERCENT',
    "management_fee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "vat_rate" INTEGER NOT NULL DEFAULT 11,
    "pricing_model_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boqs" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "proposal_id" BIGINT,
    "total_amount_items" DECIMAL(19,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_items" (
    "id" BIGSERIAL NOT NULL,
    "boq_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "product_price_version_id" BIGINT,
    "description" TEXT,
    "selling_price" DECIMAL(19,4) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "qty_unit" VARCHAR(255),
    "freq" INTEGER NOT NULL DEFAULT 1,
    "freq_unit" VARCHAR(255),
    "total_price" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_versions" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_items" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "proposal_id" BIGINT,
    "invoice_id" BIGINT,
    "product_id" BIGINT,
    "product_price_version_id" BIGINT,
    "description" TEXT,
    "selling_price" DECIMAL(19,4) NOT NULL,
    "title1_key" VARCHAR(255),
    "title1_value" INTEGER,
    "title2_key" VARCHAR(255),
    "title2_value" INTEGER,
    "title3_key" VARCHAR(255),
    "title3_value" INTEGER,
    "title4_key" VARCHAR(255),
    "title4_value" INTEGER,
    "total_price" DECIMAL(19,4) NOT NULL,
    "header" VARCHAR(255),
    "subheader" VARCHAR(255),
    "header_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "invoice_number" VARCHAR(255) NOT NULL,
    "due_date" DATE NOT NULL,
    "sales_code" VARCHAR(255),
    "project_id" BIGINT,
    "proposal_id" BIGINT,
    "customer_id" BIGINT,
    "billing_option_id" BIGINT,
    "internal_account_id" BIGINT,
    "project_name" VARCHAR(255),
    "project_description" TEXT,
    "description" TEXT,
    "billing_type" "InvoiceBillingType" NOT NULL DEFAULT 'FULL_AMOUNT',
    "tax_type" "InvoiceTaxType" NOT NULL DEFAULT 'TAX_NON_WAPU',
    "total_amount" DECIMAL(19,4) NOT NULL,
    "total_received_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_pph23_deduction" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_bank_charge" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PREPARED',
    "payment_status" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "management_fee_type" "ManagementFeeType" NOT NULL DEFAULT 'PERCENT',
    "management_fee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "vat_rate" INTEGER NOT NULL DEFAULT 11,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "pv_number" VARCHAR(255) NOT NULL,
    "issuing_date" DATE NOT NULL,
    "due_date" DATE,
    "currency" VARCHAR(255) NOT NULL DEFAULT 'IDR',
    "amount" DECIMAL(19,4) NOT NULL,
    "payable_type" VARCHAR(255) NOT NULL,
    "payable_id" BIGINT,
    "payable_name_manual" VARCHAR(255),
    "category" VARCHAR(255) NOT NULL,
    "purchase_order_id" BIGINT,
    "expense_type" VARCHAR(255),
    "description" TEXT,
    "source_payment_form" VARCHAR(255) NOT NULL,
    "internal_account_id" BIGINT,
    "payment_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receive_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "rv_number" VARCHAR(255) NOT NULL,
    "rv_date" DATE NOT NULL,
    "currency" "VoucherCurrency" NOT NULL DEFAULT 'IDR',
    "currency_manual" VARCHAR(255),
    "amount" DECIMAL(19,4) NOT NULL,
    "payment_form" "VoucherPaymentForm" NOT NULL,
    "internal_account_id" BIGINT,
    "payment_form_value" VARCHAR(255),
    "payer_type" "VoucherPayerType" NOT NULL,
    "payer_id" BIGINT,
    "payer_name_manual" VARCHAR(255),
    "purpose" "ReceiveVoucherPurpose" NOT NULL DEFAULT 'INVOICE',
    "payment_voucher_id" BIGINT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receive_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_receive_voucher" (
    "id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "receive_voucher_id" BIGINT NOT NULL,
    "amount_applied" DECIMAL(19,4) NOT NULL,
    "ppn_wapu_deduction" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "pph23_deduction" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "bank_charge" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "others_adjustment" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "adjustment_description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_receive_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_sales_code_key" ON "projects"("sales_code");

-- CreateIndex
CREATE INDEX "projects_customer_id_idx" ON "projects"("customer_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_type_idx" ON "projects"("type");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_code_key" ON "proposals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_sales_code_key" ON "proposals"("sales_code");

-- CreateIndex
CREATE INDEX "proposals_project_id_idx" ON "proposals"("project_id");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "boqs_code_key" ON "boqs"("code");

-- CreateIndex
CREATE INDEX "boqs_proposal_id_idx" ON "boqs"("proposal_id");

-- CreateIndex
CREATE INDEX "boq_items_boq_id_idx" ON "boq_items"("boq_id");

-- CreateIndex
CREATE INDEX "boq_items_product_id_idx" ON "boq_items"("product_id");

-- CreateIndex
CREATE INDEX "product_price_versions_product_id_is_active_idx" ON "product_price_versions"("product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_versions_product_id_version_key" ON "product_price_versions"("product_id", "version");

-- CreateIndex
CREATE INDEX "sales_items_project_id_idx" ON "sales_items"("project_id");

-- CreateIndex
CREATE INDEX "sales_items_proposal_id_idx" ON "sales_items"("proposal_id");

-- CreateIndex
CREATE INDEX "sales_items_invoice_id_idx" ON "sales_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_code_key" ON "invoices"("code");

-- CreateIndex
CREATE INDEX "invoices_sales_code_idx" ON "invoices"("sales_code");

-- CreateIndex
CREATE INDEX "invoices_project_id_idx" ON "invoices"("project_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_pv_number_key" ON "payment_vouchers"("pv_number");

-- CreateIndex
CREATE INDEX "payment_vouchers_payable_type_payable_id_idx" ON "payment_vouchers"("payable_type", "payable_id");

-- CreateIndex
CREATE UNIQUE INDEX "receive_vouchers_rv_number_key" ON "receive_vouchers"("rv_number");

-- CreateIndex
CREATE INDEX "receive_vouchers_payer_type_payer_id_idx" ON "receive_vouchers"("payer_type", "payer_id");

-- CreateIndex
CREATE INDEX "receive_vouchers_rv_date_idx" ON "receive_vouchers"("rv_date");

-- CreateIndex
CREATE INDEX "invoice_receive_voucher_invoice_id_idx" ON "invoice_receive_voucher"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_receive_voucher_receive_voucher_id_idx" ON "invoice_receive_voucher"("receive_voucher_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_product_price_version_id_fkey" FOREIGN KEY ("product_price_version_id") REFERENCES "product_price_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_versions" ADD CONSTRAINT "product_price_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_product_price_version_id_fkey" FOREIGN KEY ("product_price_version_id") REFERENCES "product_price_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_option_id_fkey" FOREIGN KEY ("billing_option_id") REFERENCES "billing_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receive_vouchers" ADD CONSTRAINT "receive_vouchers_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receive_vouchers" ADD CONSTRAINT "receive_vouchers_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "payment_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_receive_voucher" ADD CONSTRAINT "invoice_receive_voucher_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_receive_voucher" ADD CONSTRAINT "invoice_receive_voucher_receive_voucher_id_fkey" FOREIGN KEY ("receive_voucher_id") REFERENCES "receive_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

