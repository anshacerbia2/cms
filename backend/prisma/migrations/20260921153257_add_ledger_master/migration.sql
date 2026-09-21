-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "ledger_id" BIGINT,
ADD COLUMN     "sub_ledger_id" BIGINT;

-- CreateTable
CREATE TABLE "ledgers" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_ledgers" (
    "id" BIGSERIAL NOT NULL,
    "ledger_id" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledgers_code_key" ON "ledgers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ledgers_name_key" ON "ledgers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sub_ledgers_code_key" ON "sub_ledgers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sub_ledgers_ledger_id_name_key" ON "sub_ledgers"("ledger_id", "name");

-- CreateIndex
CREATE INDEX "financial_transactions_ledger_id_idx" ON "financial_transactions"("ledger_id");

-- CreateIndex
CREATE INDEX "financial_transactions_sub_ledger_id_idx" ON "financial_transactions"("sub_ledger_id");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_sub_ledger_id_fkey" FOREIGN KEY ("sub_ledger_id") REFERENCES "sub_ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_ledgers" ADD CONSTRAINT "sub_ledgers_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
