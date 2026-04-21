/*
  Warnings:

  - You are about to drop the column `ap_pph_23` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `ap_ppn` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `basic_price` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `bca` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `billing_to` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `bri` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `btn` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `cash_idr` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `danamon` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `management_fee` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `mandiri` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `net_received` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `no` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `non_cb` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `outstanding` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `pph_23` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `ppn` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `ppn_tax` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `sales_records` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `sales_records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sales_records" DROP COLUMN "ap_pph_23",
DROP COLUMN "ap_ppn",
DROP COLUMN "basic_price",
DROP COLUMN "bca",
DROP COLUMN "billing_to",
DROP COLUMN "bri",
DROP COLUMN "btn",
DROP COLUMN "cash_idr",
DROP COLUMN "danamon",
DROP COLUMN "date",
DROP COLUMN "description",
DROP COLUMN "management_fee",
DROP COLUMN "mandiri",
DROP COLUMN "net_received",
DROP COLUMN "no",
DROP COLUMN "non_cb",
DROP COLUMN "outstanding",
DROP COLUMN "pph_23",
DROP COLUMN "ppn",
DROP COLUMN "ppn_tax",
DROP COLUMN "project",
DROP COLUMN "total_amount",
DROP COLUMN "year",
ADD COLUMN     "col1" VARCHAR(50),
ADD COLUMN     "col10" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col12" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col13" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col14" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col15" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col16" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col17" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col18" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col19" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col2" VARCHAR(50),
ADD COLUMN     "col20" VARCHAR(255),
ADD COLUMN     "col21" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col22" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col23" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col24" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col25" VARCHAR(255),
ADD COLUMN     "col26" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col3" INTEGER,
ADD COLUMN     "col4" VARCHAR(255),
ADD COLUMN     "col5" VARCHAR(255),
ADD COLUMN     "col6" TEXT,
ADD COLUMN     "col7" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col8" DECIMAL(19,4) DEFAULT 0,
ADD COLUMN     "col9" DECIMAL(19,4) DEFAULT 0;
