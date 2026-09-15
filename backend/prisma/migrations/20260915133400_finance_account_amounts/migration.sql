
-- CreateTable
CREATE TABLE "inter_account_amounts" (
    "id" BIGSERIAL NOT NULL,
    "inter_account_id" BIGINT NOT NULL,
    "internal_account_id" BIGINT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_account_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_record_amounts" (
    "id" BIGSERIAL NOT NULL,
    "sales_record_id" BIGINT NOT NULL,
    "internal_account_id" BIGINT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_record_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_receivable_amounts" (
    "id" BIGSERIAL NOT NULL,
    "account_receivable_id" BIGINT NOT NULL,
    "internal_account_id" BIGINT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_receivable_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payable_amounts" (
    "id" BIGSERIAL NOT NULL,
    "account_payable_id" BIGINT NOT NULL,
    "internal_account_id" BIGINT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payable_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inter_account_amounts_internal_account_id_idx" ON "inter_account_amounts"("internal_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "inter_account_amounts_inter_account_id_internal_account_id_key" ON "inter_account_amounts"("inter_account_id", "internal_account_id");

-- CreateIndex
CREATE INDEX "sales_record_amounts_internal_account_id_idx" ON "sales_record_amounts"("internal_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_record_amounts_sales_record_id_internal_account_id_key" ON "sales_record_amounts"("sales_record_id", "internal_account_id");

-- CreateIndex
CREATE INDEX "account_receivable_amounts_internal_account_id_idx" ON "account_receivable_amounts"("internal_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_receivable_amounts_account_receivable_id_internal_a_key" ON "account_receivable_amounts"("account_receivable_id", "internal_account_id");

-- CreateIndex
CREATE INDEX "account_payable_amounts_internal_account_id_idx" ON "account_payable_amounts"("internal_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_payable_amounts_account_payable_id_internal_account_key" ON "account_payable_amounts"("account_payable_id", "internal_account_id");

-- AddForeignKey
ALTER TABLE "inter_account_amounts" ADD CONSTRAINT "inter_account_amounts_inter_account_id_fkey" FOREIGN KEY ("inter_account_id") REFERENCES "inter_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_account_amounts" ADD CONSTRAINT "inter_account_amounts_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_record_amounts" ADD CONSTRAINT "sales_record_amounts_sales_record_id_fkey" FOREIGN KEY ("sales_record_id") REFERENCES "sales_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_record_amounts" ADD CONSTRAINT "sales_record_amounts_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_receivable_amounts" ADD CONSTRAINT "account_receivable_amounts_account_receivable_id_fkey" FOREIGN KEY ("account_receivable_id") REFERENCES "account_receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_receivable_amounts" ADD CONSTRAINT "account_receivable_amounts_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_amounts" ADD CONSTRAINT "account_payable_amounts_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "account_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_amounts" ADD CONSTRAINT "account_payable_amounts_internal_account_id_fkey" FOREIGN KEY ("internal_account_id") REFERENCES "internal_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

