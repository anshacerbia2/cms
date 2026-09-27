-- PPN In/Out: urutan baris yang diurus sistem, supaya baris bisa disisip di
-- tengah seperti Sales dan Bank Statement. Hanya skema; nomor untuk baris yang
-- sudah ada diisi oleh `pnpm renumber:ppn-row-no`, bukan di sini.
ALTER TABLE "ppn_in_out" ADD COLUMN "row_no" INTEGER;

CREATE INDEX "ppn_in_out_tagYear_row_no_idx" ON "ppn_in_out"("tagYear", "row_no");

-- Menyisip menggeser nomor baris di bawahnya dan menghitung ulang saldo
-- berjalan AP PPN Non WAPU (colO). Keduanya bukan suntingan siapa pun, jadi
-- tidak dicatat - sama dengan row_no dan col_e di financial_transactions.
DROP TRIGGER audit_ppn_in_out ON "ppn_in_out";
CREATE TRIGGER audit_ppn_in_out AFTER INSERT OR UPDATE OR DELETE ON "ppn_in_out"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('row_no', 'colO');
