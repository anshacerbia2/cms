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



-- =====================================================================
-- Data: master kanonik, lalu setiap transaksi dihubungkan ke master.
--
-- Normalisasi dan alias di sini HARUS sama dengan
-- backend/src/finance/common/ledger-refs.ts, yang dipakai seeder dan
-- tempel-dari-Excel sesudah migrasi ini.
--
-- Di database kosong (migrate reset) bagian penghubungan tidak menyentuh
-- apa pun, tapi masternya tetap terisi.
-- =====================================================================

CREATE FUNCTION pg_temp.ledger_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(regexp_replace(lower(coalesce(t, '')), '[()/]', ' ', 'g'), '\s+', ' ', 'g'))
$$;

CREATE TEMP TABLE _ledger_canon (key text PRIMARY KEY, code text, name text, ord int);
INSERT INTO _ledger_canon (key, code, name, ord) VALUES
  ('cost of goods', 'COGS', 'Cost of Goods', 1),
  ('account receivable', 'ACCOUNT_RECEIVABLE', 'Account Receivable', 2),
  ('inter accounts', 'INTER_ACCOUNTS', 'Inter Accounts', 3),
  ('financial expense', 'FINANCIAL_EXPENSE', 'Financial Expense', 4),
  ('office expense', 'OFFICE_EXPENSE', 'Office Expense', 5),
  ('ayat silang', 'AYAT_SILANG', 'Ayat Silang', 6),
  ('sales', 'SALES', 'Sales', 7),
  ('account payable', 'ACCOUNT_PAYABLE', 'Account Payable', 8),
  ('personnel expense', 'PERSONNEL_EXPENSE', 'Personnel Expense', 9),
  ('other income expense', 'OTHER_INCOME_EXPENSE', 'Other Income/Expense', 10),
  ('marketing expense', 'MARKETING_EXPENSE', 'Marketing Expense', 11),
  ('expenditure', 'EXPENDITURE', 'Expenditure', 12),
  ('retained earnings', 'RETAINED_EARNINGS', 'Retained Earnings', 13),
  ('equity', 'EQUITY', 'Equity', 14),
  ('income tax', 'INCOME_TAX', 'Income Tax', 15);

CREATE TEMP TABLE _ledger_alias (alias text PRIMARY KEY, key text);
INSERT INTO _ledger_alias (alias, key) VALUES
  ('retained earning', 'retained earnings');

CREATE TEMP TABLE _sub_alias (alias text PRIMARY KEY, key text);
INSERT INTO _sub_alias (alias, key) VALUES
  ('bank charges', 'bank charge'),
  ('meal allowance', 'meals allowance'),
  ('deviden', 'dividend');

CREATE TEMP TABLE _sub_canon (ledger_key text, key text, name text, code text, PRIMARY KEY (ledger_key, key));
INSERT INTO _sub_canon (ledger_key, key, name, code) VALUES
  ('account payable', 'ap trade', 'AP Trade', NULL),
  ('account payable', 'ap tax', 'AP Tax', NULL),
  ('account payable', 'ap temporary loan', 'AP Temporary Loan', NULL),
  ('account payable', 'ap expense', 'AP Expense', NULL),
  ('account payable', 'ap deposit from customer', 'AP Deposit from customer', NULL),
  ('account payable', 'ap credit card', 'AP Credit Card', NULL),
  ('account payable', 'ap others', 'AP Others', NULL),
  ('account payable', 'ap deposit to customer', 'AP Deposit to customer', NULL),
  ('account receivable', 'ar deposit to vendor', 'AR Deposit to vendor', NULL),
  ('account receivable', 'ar prepaid tax', 'AR Prepaid Tax', NULL),
  ('account receivable', 'ar trade', 'AR Trade', NULL),
  ('account receivable', 'ar staff loan', 'AR Staff Loan', NULL),
  ('account receivable', 'ar cash advance', 'AR Cash Advance', NULL),
  ('account receivable', 'ar others', 'AR Others', NULL),
  ('account receivable', 'ar refund', 'AR Refund', NULL),
  ('account receivable', 'ar time deposit', 'AR Time Deposit', NULL),
  ('account receivable', 'ar temporary notes', 'AR Temporary Notes', NULL),
  ('ayat silang', 'ayat silang', 'Ayat Silang', NULL),
  ('cost of goods', 'cogs', 'COGS', NULL),
  ('equity', 'retained earnings', 'Retained Earnings', NULL),
  ('expenditure', 'fixed asset', 'Fixed Asset', NULL),
  ('financial expense', 'bank charge', 'Bank Charge', NULL),
  ('financial expense', 'interest loan', 'Interest Loan', NULL),
  ('income tax', 'income tax', 'Income Tax', NULL),
  ('inter accounts', 'mandiri mid plaza to bca juanda', 'Mandiri Mid Plaza to BCA Juanda', NULL),
  ('inter accounts', 'mandiri mid plaza to non cash bank', 'Mandiri Mid Plaza to Non Cash Bank', NULL),
  ('inter accounts', 'bca juanda to non cash bank', 'BCA Juanda to Non Cash Bank', NULL),
  ('inter accounts', 'non cash bank to ppn in and out', 'Non Cash Bank to PPn In and Out', NULL),
  ('inter accounts', 'non cash bank to bca juanda', 'Non Cash Bank to BCA Juanda', NULL),
  ('inter accounts', 'bca juanda to ap in and out', 'BCA Juanda to AP In and Out', NULL),
  ('inter accounts', 'bri sahardjo to non cash bank', 'BRI Sahardjo to Non Cash Bank', NULL),
  ('inter accounts', 'bca juanda to mandiri mid plaza', 'BCA Juanda to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'bca juanda to cash idr', 'BCA Juanda to Cash IDR', NULL),
  ('inter accounts', 'non cash bank to bca sahardjo', 'Non Cash Bank to BCA Sahardjo', NULL),
  ('inter accounts', 'bri sahardjo to mandiri mid plaza', 'BRI Sahardjo to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'bri sahardjo to bca juanda', 'BRI Sahardjo to BCA Juanda', NULL),
  ('inter accounts', 'mandiri mid plaza to bri sahardjo', 'Mandiri Mid Plaza to BRI Sahardjo', NULL),
  ('inter accounts', 'btn to bca juanda', 'BTN to BCA Juanda', NULL),
  ('inter accounts', 'btn to mandiri mid plaza', 'BTN to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'mandiri mid plaza to ppn in and out', 'Mandiri Mid Plaza to PPn In and Out', NULL),
  ('inter accounts', 'bca juanda to bca sahardjo', 'BCA Juanda to BCA Sahardjo', NULL),
  ('inter accounts', 'btn to bca sahardjo', 'BTN to BCA Sahardjo', NULL),
  ('inter accounts', 'mandiri plasa mandiri to mandiri mid plaza', 'Mandiri Plasa Mandiri to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'non cash bank to mandiri mid plaza', 'Non Cash Bank to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'bni to bca juanda', 'BNI to BCA Juanda', NULL),
  ('inter accounts', 'mandiri plasa mandiri to bca juanda', 'Mandiri Plasa Mandiri to BCA Juanda', NULL),
  ('inter accounts', 'bca sahardjo to btn', 'BCA Sahardjo to BTN', NULL),
  ('inter accounts', 'bca sahardjo to mandiri mid plaza', 'BCA Sahardjo to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'mandiri mid plaza to mandiri plasa mandiri', 'Mandiri Mid Plaza to Mandiri Plasa Mandiri', NULL),
  ('inter accounts', 'bni to mandiri mid plaza', 'BNI to Mandiri Mid Plaza', NULL),
  ('inter accounts', 'mandiri mid plaza to bca sahardjo', 'Mandiri Mid Plaza to BCA Sahardjo', NULL),
  ('inter accounts', 'non cash bank to bri sahardjo', 'Non Cash Bank to BRI Sahardjo', NULL),
  ('inter accounts', 'bca sahardjo to bca juanda', 'BCA Sahardjo to BCA Juanda', NULL),
  ('inter accounts', 'bri sahardjo to bca sahardjo', 'BRI Sahardjo to BCA Sahardjo', NULL),
  ('inter accounts', 'cash idr to bca juanda', 'Cash IDR to BCA Juanda', NULL),
  ('inter accounts', 'mandiri plasa mandiri to bri sahardjo', 'Mandiri Plasa Mandiri to BRI Sahardjo', NULL),
  ('inter accounts', 'btn to bri sahardjo', 'BTN to BRI Sahardjo', NULL),
  ('inter accounts', 'cash idr to bca sahardjo', 'Cash IDR to BCA Sahardjo', NULL),
  ('inter accounts', 'mandiri plasa mandiri to non cash bank', 'Mandiri Plasa Mandiri to Non Cash Bank', NULL),
  ('inter accounts', 'bca juanda to bri sahardjo', 'BCA Juanda to BRI Sahardjo', NULL),
  ('inter accounts', 'ppn in and out to non cash bank', 'PPn In and Out to Non Cash Bank', NULL),
  ('inter accounts', 'bank raya to bca juanda', 'Bank Raya to BCA Juanda', NULL),
  ('inter accounts', 'cash idr to non cash bank', 'Cash IDR to Non Cash Bank', NULL),
  ('inter accounts', 'mandiri mid plaza to bri tebet', 'Mandiri Mid Plaza to BRI Tebet', NULL),
  ('inter accounts', 'mandiri mid plaza to btn', 'Mandiri Mid Plaza to BTN', NULL),
  ('inter accounts', 'bri tebet to bca sahardjo', 'BRI Tebet to BCA Sahardjo', NULL),
  ('inter accounts', 'bca sahardjo to non cash bank', 'BCA Sahardjo to Non Cash Bank', NULL),
  ('inter accounts', 'bca juanda to ppn in and out', 'BCA Juanda to PPn In and Out', NULL),
  ('marketing expense', 'sales and promotion', 'Sales and Promotion', NULL),
  ('marketing expense', 'entertainment', 'Entertainment', NULL),
  ('marketing expense', 'research,training and product development', 'Research,Training and Product Development', NULL),
  ('marketing expense', 'notarial fee', 'Notarial Fee', NULL),
  ('office expense', 'transportation', 'Transportation', NULL),
  ('office expense', 'telephone', 'Telephone', NULL),
  ('office expense', 'groceries and household misc', 'Groceries and Household Misc', NULL),
  ('office expense', 'maintenance', 'Maintenance', NULL),
  ('office expense', 'internet and emails', 'Internet and emails', NULL),
  ('office expense', 'post and stamps', 'Post and stamps', NULL),
  ('office expense', 'computer supplies', 'Computer Supplies', NULL),
  ('office expense', 'stationary', 'Stationary', NULL),
  ('office expense', 'office rent', 'Office Rent', NULL),
  ('office expense', 'photocopy', 'Photocopy', NULL),
  ('office expense', 'building management', 'Building Management', NULL),
  ('office expense', 'subscription', 'Subscription', NULL),
  ('office expense', 'car insurance', 'Car Insurance', NULL),
  ('office expense', 'donation', 'Donation', NULL),
  ('office expense', 'license', 'License', NULL),
  ('other income expense', 'interest income', 'Interest Income', NULL),
  ('other income expense', 'other expense', 'Other Expense', NULL),
  ('other income expense', 'other income', 'Other Income', NULL),
  ('other income expense', 'forex gain loss', 'Forex Gain (Loss)', NULL),
  ('personnel expense', 'medical allowance', 'Medical Allowance', NULL),
  ('personnel expense', 'meals allowance', 'Meals Allowance', NULL),
  ('personnel expense', 'overtime', 'Overtime', NULL),
  ('personnel expense', 'salary and thr', 'Salary and THR', NULL),
  ('personnel expense', 'hr development', 'HR Development', NULL),
  ('personnel expense', 'bpjs tenaga kerja', 'BPJS Tenaga Kerja', NULL),
  ('personnel expense', 'bpjs kesehatan', 'BPJS Kesehatan', NULL),
  ('personnel expense', 'honorarium', 'Honorarium', NULL),
  ('personnel expense', 'incentive and bonus', 'Incentive and Bonus', NULL),
  ('retained earnings', 'dividend', 'Dividend', 'DIVIDEND'),
  ('sales', 'sales invoice', 'Sales Invoice', NULL);

-- Kunci tiap transaksi, sesudah alias.
CREATE TEMP TABLE _tx AS
SELECT f.id,
       coalesce(la.key, pg_temp.ledger_key(f.col_f)) AS lk,
       coalesce(sa.key, pg_temp.ledger_key(f.col_g)) AS sk,
       f.col_f, f.col_g
  FROM financial_transactions f
  LEFT JOIN _ledger_alias la ON la.alias = pg_temp.ledger_key(f.col_f)
  LEFT JOIN _sub_alias   sa ON sa.alias = pg_temp.ledger_key(f.col_g);

-- Nilai di data yang tidak ada di daftar kanonik (mis. database lokal yang
-- datanya sedikit berbeda) tetap dijadikan master, supaya tidak ada baris yang
-- kehilangan Ledger-nya - laporan menyaring lewat FK, baris tanpa FK hilang.
INSERT INTO _ledger_canon (key, code, name, ord)
SELECT lk, NULL, (array_agg(col_f ORDER BY c DESC, col_f))[1], 1000
  FROM (SELECT lk, col_f, count(*) c FROM _tx WHERE lk <> '' GROUP BY 1, 2) x
 WHERE lk NOT IN (SELECT key FROM _ledger_canon)
 GROUP BY lk;

INSERT INTO _sub_canon (ledger_key, key, name, code)
SELECT lk, sk, (array_agg(col_g ORDER BY c DESC, col_g))[1], NULL
  FROM (SELECT lk, sk, col_g, count(*) c FROM _tx WHERE lk <> '' AND sk <> '' GROUP BY 1, 2, 3) x
 WHERE (lk, sk) NOT IN (SELECT ledger_key, key FROM _sub_canon)
 GROUP BY lk, sk;

INSERT INTO ledgers (code, name, order_index, updated_at)
SELECT code, name, ord, now() FROM _ledger_canon;

INSERT INTO sub_ledgers (ledger_id, code, name, updated_at)
SELECT l.id, s.code, s.name, now()
  FROM _sub_canon s
  JOIN _ledger_canon lc ON lc.key = s.ledger_key
  JOIN ledgers l        ON l.name = lc.name;

-- Hubungkan, dan tulis ulang cermin teksnya ke nama kanonik.
UPDATE financial_transactions f
   SET ledger_id = l.id, col_f = l.name
  FROM _tx t
  JOIN _ledger_canon lc ON lc.key = t.lk
  JOIN ledgers l        ON l.name = lc.name
 WHERE f.id = t.id;

UPDATE financial_transactions f
   SET sub_ledger_id = sl.id, col_g = sl.name
  FROM _tx t
  JOIN _ledger_canon lc ON lc.key = t.lk
  JOIN ledgers l        ON l.name = lc.name
  JOIN _sub_canon sc    ON sc.ledger_key = t.lk AND sc.key = t.sk
  JOIN sub_ledgers sl   ON sl.ledger_id = l.id AND sl.name = sc.name
 WHERE f.id = t.id;
