-- Activity log: setiap insert, update, dan delete di tabel finance dicatat.
--
-- Dicatat oleh trigger di database, bukan oleh kode aplikasi, supaya tidak ada
-- jalur yang lolos karena lupa mencatat - termasuk perubahan lewat SQL manual.
-- Aplikasi hanya menitipkan siapa user-nya dan id request-nya lewat pengaturan
-- sesi (app.user_id, app.user_email, app.request_id) setiap kali meminjam
-- koneksi; lihat src/common/audit/audited-pool.ts.
--
-- Tabel ini hanya ditambah, tidak pernah diubah atau dihapus isinya.

CREATE TABLE "audit_logs" (
  "id"              BIGSERIAL PRIMARY KEY,
  "occurred_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "table_name"      TEXT NOT NULL,
  "row_id"          BIGINT,
  "action"          TEXT NOT NULL,          -- INSERT / UPDATE / DELETE
  "user_id"         BIGINT,                 -- sengaja tanpa FK: catatan harus tetap ada walau user dihapus
  "user_email"      TEXT,
  "request_id"      TEXT,                   -- baris yang disimpan dalam satu kali Save berbagi id ini
  "source"          TEXT NOT NULL,          -- APP (lewat aplikasi) / SQL (di luar aplikasi)
  "db_user"         TEXT NOT NULL DEFAULT current_user,
  "changed_columns" TEXT[],                 -- hanya untuk UPDATE
  "old_data"        JSONB,                  -- baris sebelum (UPDATE, DELETE)
  "new_data"        JSONB                   -- baris sesudah (INSERT, UPDATE)
);

CREATE INDEX "audit_logs_row_idx"     ON "audit_logs" ("table_name", "row_id", "occurred_at");
CREATE INDEX "audit_logs_time_idx"    ON "audit_logs" ("occurred_at");
CREATE INDEX "audit_logs_user_idx"    ON "audit_logs" ("user_id", "occurred_at");
CREATE INDEX "audit_logs_request_idx" ON "audit_logs" ("request_id");

-- Argumen trigger = kolom turunan yang TIDAK dianggap perubahan. Update yang
-- hanya mengubah kolom-kolom itu (plus updated_at) tidak dicatat sama sekali:
-- menghitung ulang saldo Bank Statement menyentuh ribuan baris sekaligus, dan
-- mencatat semuanya hanya menenggelamkan perubahan yang dibuat orang.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  app     TEXT := current_setting('application_name', true);
  -- TG_ARGV bernilai NULL (bukan array kosong) untuk trigger tanpa argumen;
  -- tanpa COALESCE, `k <> ALL (NULL)` membuat setiap UPDATE terlewat.
  ignored TEXT[] := COALESCE(TG_ARGV, '{}');
  old_j   JSONB;
  new_j   JSONB;
  changed TEXT[];
BEGIN
  -- Seeder memuat ulang data dari workbook; isinya bisa dibangun ulang, jadi tidak dicatat.
  IF app = 'cms-seeder' THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN old_j := to_jsonb(OLD); END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN new_j := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k ORDER BY k) INTO changed
      FROM jsonb_object_keys(new_j) AS k
     WHERE (new_j -> k) IS DISTINCT FROM (old_j -> k)
       AND k <> 'updated_at'
       AND k <> ALL (ignored);
    IF changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO "audit_logs"
    ("table_name", "row_id", "action", "user_id", "user_email", "request_id", "source",
     "changed_columns", "old_data", "new_data")
  VALUES
    (TG_TABLE_NAME,
     COALESCE(new_j ->> 'id', old_j ->> 'id')::BIGINT,
     TG_OP,
     NULLIF(current_setting('app.user_id', true), '')::BIGINT,
     NULLIF(current_setting('app.user_email', true), ''),
     NULLIF(current_setting('app.request_id', true), ''),
     CASE WHEN app = 'cms-backend' THEN 'APP' ELSE 'SQL' END,
     changed, old_j, new_j);

  RETURN NULL;
END;
$$;

-- Tabel finance beserta rincian per rekeningnya.
CREATE TRIGGER audit_account_receivables       AFTER INSERT OR UPDATE OR DELETE ON "account_receivables"        FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_account_receivable_amounts AFTER INSERT OR UPDATE OR DELETE ON "account_receivable_amounts" FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_account_payables          AFTER INSERT OR UPDATE OR DELETE ON "account_payables"           FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_account_payable_amounts   AFTER INSERT OR UPDATE OR DELETE ON "account_payable_amounts"    FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_sales_records             AFTER INSERT OR UPDATE OR DELETE ON "sales_records"              FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_sales_record_amounts      AFTER INSERT OR UPDATE OR DELETE ON "sales_record_amounts"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_ppn_in_out                AFTER INSERT OR UPDATE OR DELETE ON "ppn_in_out"                 FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_inter_account             AFTER INSERT OR UPDATE OR DELETE ON "inter_account"              FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_inter_account_amounts     AFTER INSERT OR UPDATE OR DELETE ON "inter_account_amounts"      FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_depreciation              AFTER INSERT OR UPDATE OR DELETE ON "depreciation"               FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_equity_properties         AFTER INSERT OR UPDATE OR DELETE ON "equity_properties"          FOR EACH ROW EXECUTE FUNCTION audit_row_change();

-- Bank Statement: saldo berjalan (col_e) dan nomor urut (row_no) dihitung ulang
-- untuk seluruh tahun setiap ada perubahan; col_f/col_g hanyalah cermin nama
-- Ledger/Sub Ledger 1, yang perubahannya sudah tercatat lewat ledger_id/sub_ledger_id.
CREATE TRIGGER audit_financial_transactions    AFTER INSERT OR UPDATE OR DELETE ON "financial_transactions"     FOR EACH ROW EXECUTE FUNCTION audit_row_change('col_e', 'row_no', 'col_f', 'col_g');

-- Fiscal Period: closing_balance dan is_stale ditulis ulang oleh perhitungan ulang saldo.
CREATE TRIGGER audit_fiscal_periods            AFTER INSERT OR UPDATE OR DELETE ON "fiscal_periods"             FOR EACH ROW EXECUTE FUNCTION audit_row_change('closing_balance', 'is_stale');

-- Master yang menentukan isi laporan.
CREATE TRIGGER audit_ledgers                   AFTER INSERT OR UPDATE OR DELETE ON "ledgers"                    FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_sub_ledgers               AFTER INSERT OR UPDATE OR DELETE ON "sub_ledgers"                FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_internal_accounts         AFTER INSERT OR UPDATE OR DELETE ON "internal_accounts"          FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER audit_banks                     AFTER INSERT OR UPDATE OR DELETE ON "banks"                      FOR EACH ROW EXECUTE FUNCTION audit_row_change();
