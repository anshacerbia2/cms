-- `financial_transactions.col_f` / `col_g` adalah salinan nama Ledger / Sub Ledger 1
-- dari master; `ledger_id` / `sub_ledger_id` sumber kebenarannya. Trigger di sini
-- menjaga salinan itu selalu sama dengan master, apa pun jalur perubahannya -
-- aplikasi, seeder, atau UPDATE langsung di database.

-- 1. Transaksi yang disimpan dengan FK: teksnya selalu diambil dari master.
--    Hanya menyala kalau salah satu dari empat kolom ini ikut ditulis, jadi
--    perantaian saldo (yang hanya menulis col_e) tidak terbebani.
CREATE OR REPLACE FUNCTION financial_transactions_ledger_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ledger_id IS NOT NULL THEN
    SELECT name INTO NEW.col_f FROM ledgers WHERE id = NEW.ledger_id;
  END IF;
  IF NEW.sub_ledger_id IS NOT NULL THEN
    SELECT name INTO NEW.col_g FROM sub_ledgers WHERE id = NEW.sub_ledger_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER financial_transactions_ledger_text
BEFORE INSERT OR UPDATE OF ledger_id, sub_ledger_id, col_f, col_g ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION financial_transactions_ledger_text();

-- 2. Nama master berubah: semua transaksi yang memakainya ikut berubah.
CREATE OR REPLACE FUNCTION ledgers_rename_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE financial_transactions SET col_f = NEW.name
   WHERE ledger_id = NEW.id AND col_f IS DISTINCT FROM NEW.name;
  RETURN NULL;
END;
$$;

CREATE TRIGGER ledgers_rename_text
AFTER UPDATE OF name ON ledgers
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION ledgers_rename_text();

CREATE OR REPLACE FUNCTION sub_ledgers_rename_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE financial_transactions SET col_g = NEW.name
   WHERE sub_ledger_id = NEW.id AND col_g IS DISTINCT FROM NEW.name;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sub_ledgers_rename_text
AFTER UPDATE OF name ON sub_ledgers
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION sub_ledgers_rename_text();
