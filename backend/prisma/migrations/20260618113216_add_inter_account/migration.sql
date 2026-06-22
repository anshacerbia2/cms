-- CreateTable
CREATE TABLE "inter_account" (
    "id" BIGSERIAL NOT NULL,
    "colA" TEXT,
    "colB" TEXT,
    "colC" DECIMAL(19,4),
    "colD" DECIMAL(19,4),
    "colE" DECIMAL(19,4),
    "colF" DECIMAL(19,4),
    "colG" DECIMAL(19,4),
    "colH" DECIMAL(19,4),
    "colI" DECIMAL(19,4),
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" DECIMAL(19,4),
    "colM" DECIMAL(19,4),
    "colN" DECIMAL(19,4),
    "colO" DECIMAL(19,4),
    "colP" DECIMAL(19,4),
    "tagYear" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_account_pkey" PRIMARY KEY ("id")
);
