-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PicStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('OPEN', 'ONGOING', 'CLOSED');

-- CreateEnum
CREATE TYPE "InternalAccountType" AS ENUM ('BANK', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PpnType" AS ENUM ('WAPU', 'NON_WAPU');

-- CreateEnum
CREATE TYPE "DepreciationType" AS ENUM ('OFFICE_EQUIPMENT', 'VEHICLE', 'INTANGIBLE_ASSET');

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "route" VARCHAR(150) NOT NULL,
    "method" VARCHAR(10),
    "path" VARCHAR(255),
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255),
    "location" VARCHAR(255),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role_id" BIGINT,
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" BIGSERIAL NOT NULL,
    "parent_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(100),
    "permission_id" BIGINT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menu" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(255),
    "bank_account_number" VARCHAR(255),
    "bank_account_name" VARCHAR(255),
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_options" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "cp_name" VARCHAR(255),
    "cp_title_division" VARCHAR(255),
    "cp_email" VARCHAR(255),
    "cp_office_number" VARCHAR(255),
    "cp_mobile_number" VARCHAR(255),
    "is_overseas" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "billing_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_pics" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(255),
    "position" VARCHAR(255),
    "status" "PicStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_pics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(255),
    "email" VARCHAR(255),
    "tax_number" VARCHAR(255),
    "bank_name" VARCHAR(255),
    "bank_account_number" VARCHAR(255),
    "bank_account_name" VARCHAR(255),
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_pics" (
    "id" BIGSERIAL NOT NULL,
    "supplier_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(255),
    "position" VARCHAR(255),
    "status" "PicStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "supplier_pics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(50) NOT NULL,
    "category_id" BIGINT,
    "supplier_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" BIGSERIAL NOT NULL,
    "bank_code" CHAR(3) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "bank_brand" VARCHAR(50) NOT NULL,
    "bank_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_accounts" (
    "id" BIGSERIAL NOT NULL,
    "bank_id" BIGINT,
    "user_id" BIGINT,
    "type" "InternalAccountType" NOT NULL DEFAULT 'BANK',
    "account_no" VARCHAR(50),
    "branch" VARCHAR(255),
    "swift_code" VARCHAR(20),
    "holder_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" BIGSERIAL NOT NULL,
    "internal_account_id" BIGINT NOT NULL,
    "year" INTEGER NOT NULL,
    "opening_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(19,4),
    "status" "FiscalStatus" NOT NULL DEFAULT 'OPEN',
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" BIGSERIAL NOT NULL,
    "internal_account_id" BIGINT,
    "col_a" TIMESTAMP(3),
    "col_b" TEXT,
    "col_c" DECIMAL(19,4) DEFAULT 0,
    "col_d" DECIMAL(19,4) DEFAULT 0,
    "col_e" DECIMAL(19,4) DEFAULT 0,
    "col_f" TEXT,
    "col_g" TEXT,
    "col_h" TEXT,
    "col_i" TEXT,
    "col_j" TEXT,
    "col_k" TEXT,
    "col_l" TEXT,
    "col_m" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_records" (
    "id" BIGSERIAL NOT NULL,
    "colA" VARCHAR(100),
    "colB" VARCHAR(100),
    "colC" TIMESTAMP(3),
    "colD" INTEGER,
    "colE" TEXT,
    "colF" TEXT,
    "colG" TEXT,
    "colH" DECIMAL(19,4),
    "colI" DECIMAL(19,4),
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" TIMESTAMP(3),
    "colM" DECIMAL(19,4),
    "colN" DECIMAL(19,4),
    "colO" DECIMAL(19,4),
    "colP" DECIMAL(19,4),
    "colQ" DECIMAL(19,4),
    "colR" DECIMAL(19,4),
    "colS" DECIMAL(19,4),
    "colT" DECIMAL(19,4),
    "colU" DECIMAL(19,4),
    "colV" DECIMAL(19,4),
    "colW" DECIMAL(19,4),
    "colX" DECIMAL(19,4),
    "colY" TEXT,
    "colZ" DECIMAL(19,4),
    "colAA" DECIMAL(19,4),
    "colAB" DECIMAL(19,4),
    "colAC" DECIMAL(19,4),
    "colAD" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_receivables" (
    "id" BIGSERIAL NOT NULL,
    "colA" VARCHAR(100),
    "colB" VARCHAR(100),
    "colC" TEXT,
    "colD" TEXT,
    "colE" TEXT,
    "colF" DECIMAL(19,4),
    "colG" DECIMAL(19,4),
    "colH" DECIMAL(19,4),
    "colI" TEXT,
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" DECIMAL(19,4),
    "colM" DECIMAL(19,4),
    "colN" DECIMAL(19,4),
    "colO" DECIMAL(19,4),
    "colP" DECIMAL(19,4),
    "colQ" TEXT,
    "colR" DECIMAL(19,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payables" (
    "id" BIGSERIAL NOT NULL,
    "colA" VARCHAR(100),
    "colB" INTEGER,
    "colC" TEXT,
    "colD" TEXT,
    "colE" DECIMAL(19,4),
    "colF" TEXT,
    "colG" TEXT,
    "colH" TEXT,
    "colI" DECIMAL(19,4),
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" DECIMAL(19,4),
    "colM" DECIMAL(19,4),
    "colN" DECIMAL(19,4),
    "colO" DECIMAL(19,4),
    "colP" DECIMAL(19,4),
    "colQ" DECIMAL(19,4),
    "colR" TEXT,
    "colS" DECIMAL(19,4),
    "colT" DECIMAL(19,4),
    "colU" DECIMAL(19,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_ledgers" (
    "id" BIGSERIAL NOT NULL,
    "type" "PpnType" NOT NULL,
    "colA" DATE,
    "colB" VARCHAR(100),
    "colC" VARCHAR(100),
    "colD" TEXT,
    "colE" VARCHAR(255),
    "colF" INTEGER,
    "colG" VARCHAR(100),
    "colH" DECIMAL(19,4),
    "colI" DECIMAL(19,4),
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" VARCHAR(255),
    "colM" VARCHAR(255),
    "colN" VARCHAR(255),
    "colO" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation" (
    "id" BIGSERIAL NOT NULL,
    "col_a" TIMESTAMP(3),
    "col_b" VARCHAR(100),
    "col_c" TEXT,
    "col_d" DECIMAL(19,4) DEFAULT 0,
    "col_e" INTEGER,
    "col_f" DECIMAL(19,4) DEFAULT 0,
    "col_g" DECIMAL(19,4) DEFAULT 0,
    "col_h" DECIMAL(19,4) DEFAULT 0,
    "col_i" DECIMAL(19,4) DEFAULT 0,
    "col_j" DECIMAL(19,4) DEFAULT 0,
    "col_k" DECIMAL(19,4) DEFAULT 0,
    "col_l" DECIMAL(19,4) DEFAULT 0,
    "col_m" DECIMAL(19,4) DEFAULT 0,
    "col_n" DECIMAL(19,4) DEFAULT 0,
    "col_o" DECIMAL(19,4) DEFAULT 0,
    "col_p" DECIMAL(19,4) DEFAULT 0,
    "col_q" DECIMAL(19,4) DEFAULT 0,
    "col_r" DECIMAL(19,4) DEFAULT 0,
    "col_s" DECIMAL(19,4) DEFAULT 0,
    "col_t" DECIMAL(19,4) DEFAULT 0,
    "col_u" DECIMAL(19,4) DEFAULT 0,
    "type" "DepreciationType" NOT NULL DEFAULT 'OFFICE_EQUIPMENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_revenue" (
    "id" BIGSERIAL NOT NULL,
    "colA" VARCHAR(50),
    "colB" VARCHAR(100),
    "colC" TEXT,
    "colD" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "colE" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "colF" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_expenses" (
    "id" BIGSERIAL NOT NULL,
    "colA" VARCHAR(100),
    "colB" DATE,
    "colC" TEXT,
    "colD" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "colE" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "colF" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_loss_summary" (
    "id" BIGSERIAL NOT NULL,
    "category" VARCHAR(100),
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

    CONSTRAINT "profit_loss_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equity_properties" (
    "id" BIGSERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equity_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_route_key" ON "permissions"("route");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_role_id_menu_id_key" ON "role_menu"("role_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "billing_options_customer_id_idx" ON "billing_options"("customer_id");

-- CreateIndex
CREATE INDEX "customer_pics_customer_id_idx" ON "customer_pics"("customer_id");

-- CreateIndex
CREATE INDEX "customer_pics_name_idx" ON "customer_pics"("name");

-- CreateIndex
CREATE INDEX "customer_pics_status_idx" ON "customer_pics"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "supplier_pics_supplier_id_idx" ON "supplier_pics"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_pics_name_idx" ON "supplier_pics"("name");

-- CreateIndex
CREATE INDEX "supplier_pics_status_idx" ON "supplier_pics"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "banks_bank_code_key" ON "banks"("bank_code");

-- CreateIndex
CREATE INDEX "banks_bank_brand_idx" ON "banks"("bank_brand");

-- CreateIndex
CREATE UNIQUE INDEX "internal_accounts_account_no_type_holder_name_branch_key" ON "internal_accounts"("account_no", "type", "holder_name", "branch");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_internal_account_id_year_key" ON "fiscal_periods"("internal_account_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "equity_properties_year_key_key" ON "equity_properties"("year", "key");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_options" ADD CONSTRAINT "billing_options_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pics" ADD CONSTRAINT "customer_pics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_pics" ADD CONSTRAINT "supplier_pics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_accounts" ADD CONSTRAINT "internal_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
