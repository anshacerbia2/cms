-- Sales: urutan baris yang diurus sistem, supaya baris bisa disisip di tengah
-- seperti Bank Statement. Hanya skema; nomor untuk baris yang sudah ada diisi
-- oleh `pnpm renumber:sales-row-no`, bukan di sini.
ALTER TABLE "sales_records" ADD COLUMN "row_no" INTEGER;

CREATE INDEX "sales_records_tagYear_row_no_idx" ON "sales_records"("tagYear", "row_no");

-- Menyisip satu baris menggeser nomor semua baris di bawahnya. Pergeseran itu
-- bukan suntingan siapa pun, jadi tidak dicatat di activity log - sama dengan
-- row_no di financial_transactions.
DROP TRIGGER audit_sales_records ON "sales_records";
CREATE TRIGGER audit_sales_records AFTER INSERT OR UPDATE OR DELETE ON "sales_records"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('row_no');
