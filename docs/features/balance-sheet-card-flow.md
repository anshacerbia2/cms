# ⚖️ Balance Sheet — Sumber Data Setiap Card

Dokumen ini menjelaskan **dari mana sumber data setiap komponen** pada tab Balance Sheet secara ringkas. Tidak ada referensi ke kolom *raw* database, melainkan menggunakan makna bisnis deskriptif untuk masing-masing nilai.

---

## 🏦 Total Assets

Total aset adalah penjumlahan dari semua komponen berikut:

| Komponen | Tabel Sumber | Keterangan Nilai | Filter / Kondisi |
|---|---|---|---|
| **Bank** | Transaksi Finansial (Internal Accounts) | **Saldo Terakhir (Running Balance)** | Tipe akun adalah `BANK`, ambil saldo terakhir berdasarkan periode berjalan / ≤ tanggal filter |
| **Cash** | Transaksi Finansial (Internal Accounts) | **Saldo Terakhir (Running Balance)** | Tipe akun adalah `CASH`, ambil saldo terakhir berdasarkan periode berjalan / ≤ tanggal filter |
| **AR Receivable** | Account Receivables | **Sisa Tagihan (Outstanding IDR)** | Kategori mencakup: `AR Cash Advance`, `AR Others`, `AR Refund`, `AR Staff Loan`, `AR Temporary`, `AR Trade` |
| **AR Deposit to Vendor** | Account Receivables | **Sisa Tagihan (Outstanding IDR)** | Kategori: `AR Deposit to Vendor` |
| **AR Prepaid Tax** | Account Receivables | **Sisa Tagihan (Outstanding IDR)** | Kategori: `AR Prepaid Tax` |
| **Fixed Assets (Net)** | Depreciation | **Nilai Buku (Book Value)** | Aset yang tanggal pembeliannya ≤ tanggal filter |

```text
Total Assets = Bank + Cash + AR Receivable + AR Deposit to Vendor + AR Prepaid Tax + Net Fixed Assets
```

---

## 💳 Total Liabilities (Payables)

| Komponen | Tabel Sumber | Keterangan Nilai | Filter / Kondisi |
|---|---|---|---|
| **AP Outstanding** | Account Payables | **Sisa Utang (Outstanding IDR)** | Tahun tercatat ≤ tahun filter |

Liabilitas dibagi per kategori utang:
- Deposit dari Customer (`AP Deposit from Customer`)
- Pinjaman Jangka Pendek (`AP Temporary Loan`)
- Utang Usaha & Lainnya (`AP Credit Card`, `AP Expense`, `AP Leasing`, `AP Tax`, `AP Trade`, `AP Others`)

```text
Total Liabilities = Total Sisa Utang (Outstanding) dari seluruh data Account Payables pada rentang tahun filter
```

---

## 💰 Total Equity

Equity dihitung secara dinamis dari properti ekuitas dan bukan dari tabel transaksi biasa:

| Komponen | Sumber |
|---|---|
| **Share Capital** | Nilai Modal Saham (Share Capital) yang dikonfigurasi untuk tahun berjalan |
| **Previous Years RE** | Nilai Laba Ditahan Tahun Sebelumnya (Previous Years RE) untuk tahun berjalan |
| **Dividend** | Nilai Dividen yang dibagikan untuk tahun berjalan |
| **Profit (Loss) Tahun Berjalan** | Hasil perhitungan P&L secara langsung (lihat bagian Net Profit di bawah) |

```text
Total Equity = Share Capital + Previous Years RE - Dividend + Net Profit/Loss Tahun Berjalan
```

---

## 📈 Net Profit / Loss (P&L Sync)

Net Profit dihitung secara *live* dari rekap transaksi sepanjang tahun, bukan dari data diam:

| Komponen | Tabel Sumber | Keterangan Perhitungan | Filter / Kondisi |
|---|---|---|---|
| **Gross Sales** | Sales Records | Total Penjualan Kotor | Transaksi dalam tahun berjalan |
| **VAT** | Sales Records | Total PPN / Pajak | Transaksi dalam tahun berjalan |
| **Net Sales** | — | `Gross Sales - VAT` | — |
| **COGS** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Cost of Goods...`, dalam tahun berjalan |
| **Personnel Expense** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Personnel Expense`, dalam tahun berjalan |
| **Office Expense** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Office Expense`, dalam tahun berjalan |
| **Marketing Expense** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Marketing Expense`, dalam tahun berjalan |
| **Financial Expense** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Financial Expense`, dalam tahun berjalan |
| **Other Income** | Transaksi Finansial | Selisih nilai Kredit - Debit | Kategori: `Other Income`, dalam tahun berjalan |
| **Depreciation** | Depreciation | Total Nilai Penyusutan | Total akumulasi tahun terkait |
| **Income Tax** | Transaksi Finansial | Pengeluaran Kas (Debit) | Kategori spesifik PPh 23 / Prepaid Tax / Non Cash & Bank |

> [!NOTE]
> Semua komponen P&L di atas dapat di-**override** secara manual melalui Equity Settings. Apabila nilai override ditentukan untuk suatu elemen (misal `Override Net Sales`), maka sistem akan menggunakan nilai override tersebut. Jika kosong, sistem otomatis memakai kalkulasi data transaksi di atas.

```text
Net Profit = Net Sales + COGS + (Semua Biaya / Expense Negatif) + Other Income - Depreciation - Income Tax
```

---

## 🔄 Accounting Identity (Validasi)

Untuk memastikan bahwa laporan keuangan *balance*:

```text
Total Assets = Total Liabilities + Total Equity
```

Jika angka seimbang, berarti pemetaan data sudah tepat. Ketidakseimbangan biasanya disebabkan oleh pengelompokan kategori yang belum dikenali atau ada transaksi bank yang tidak wajar.

---

## 📋 Ringkasan Pemetaan Modul

| Metrik Dashboard (Card) | Sumber Modul Utama |
|---|---|
| **Total Assets (Bank/Cash)** | Rekening Internal & Transaksi Finansial |
| **Total Assets (AR)** | Piutang Usaha (Account Receivables) |
| **Total Assets (Fixed Assets)**| Daftar Aset & Penyusutan (Depreciation) |
| **Total Liabilities** | Utang Usaha (Account Payables) |
| **Total Equity** | Konfigurasi Ekuitas (Equity Properties) |
| **Net Profit** | Penjualan, Penyusutan, & Transaksi Kas |
