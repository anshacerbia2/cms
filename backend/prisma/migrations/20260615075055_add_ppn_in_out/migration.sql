-- CreateTable
CREATE TABLE "ppn_in_out" (
    "id" BIGSERIAL NOT NULL,
    "colA" DATE,
    "colB" TEXT,
    "colC" TEXT,
    "colD" TEXT,
    "colE" TEXT,
    "colF" INTEGER,
    "colG" DECIMAL(19,4),
    "colH" DECIMAL(19,4),
    "colI" DECIMAL(19,4),
    "colJ" DECIMAL(19,4),
    "colK" DECIMAL(19,4),
    "colL" TEXT,
    "colM" DECIMAL(19,4),
    "colN" DECIMAL(19,4),
    "colO" DECIMAL(19,4),
    "colP" TEXT,
    "colQ" TEXT,
    "colR" TEXT,
    "colS" TEXT,
    "tagYear" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppn_in_out_pkey" PRIMARY KEY ("id")
);
