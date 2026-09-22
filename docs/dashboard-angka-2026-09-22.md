# Asal angka kartu Dashboard

Diukur di produksi, 22 September 2026 pukul 15:49 WIB. Angka bisa bergeser selama tim
finance masih menginput data.

## Ringkasan

Kartu Dashboard berlabel **FY 2026** / **YTD**, tetapi Dashboard memanggil neraca dan
ringkasan P&L **tanpa tahun**. Backend mengartikan itu sebagai *semua tahun sekaligus*,
jadi keempat angkanya adalah gabungan 2025 dan 2026, bukan angka 2026.

| Kartu | Tampil di Dashboard | Rumus sebenarnya | Angka 2026 yang seharusnya |
|---|---:|---|---:|
| Total Assets | 25.075.505.032,66 | campuran: kas & bank 2026 + pos lain 2025 + 2026 | **13.115.590.774,32** |
| Net Profit (YTD) | 3.209.870.631,31 | PAT 2025 + PAT 2026 | **−61.785.941,71** |
| Total Receivables | 13.228.266.105,00 | AR 2025 + AR 2026 | **7.865.009.846,00** |
| Total Payables | 4.835.703.629,00 | AP 2025 + AP 2026 | **2.107.437.762,00** |

Sumber tiap kartu:

- **Total Assets:** `GET /finance/balance-sheet` → `summary.totalAssets`
- **Net Profit:** `GET /finance/pl-summary` → baris `PROFIT AFTER TAX`
- **Total Receivables:** `GET /finance/balance-sheet` → kategori aset `Account Receivable`
- **Total Payables:** `GET /finance/balance-sheet` → kategori liabilitas `Account Payable`

## 1. Total Assets = 25.075.505.032,66

Bukan 2025 + 2026 (itu 31.250.810.518,35). Tanpa tahun, **kas dan bank** memakai saldo
terakhir (2026), sedangkan **semua pos lain dijumlah 2025 + 2026**.

| Pos | Dashboard | 2025 | 2026 | Cara dihitung |
|---|---:|---:|---:|---|
| Cash | 10.000.000,00 | 754.980,00 | 10.000.000,00 | saldo 2026 |
| Bank Accounts | 526.926.518,65 | 6.174.550.505,70 | 526.926.518,65 | saldo 2026 |
| Deposit to vendor | 8.057.621.340,00 | 5.052.543.582,00 | 3.005.077.758,00 | 2025 + 2026 |
| Time Deposit | 452.625.000,00 | 0,00 | 452.625.000,00 | 2025 + 2026 |
| Account Receivable | 13.228.266.105,00 | 5.363.256.259,00 | 7.865.009.846,00 | 2025 + 2026 |
| Prepaid Tax | 1.204.379.893,00 | 668.931.939,00 | 535.447.954,00 | 2025 + 2026 |
| Fixed Assets (nilai buku) | 1.595.686.176,01 | 875.182.478,33 | 720.503.697,67 | 2025 + 2026 |
| **Total Assets** | **25.075.505.032,66** | **18.135.219.744,03** | **13.115.590.774,32** | |

Menjumlah dua tahun untuk pos saldo menghitung saldo yang sama dua kali:

- **Account Receivable:** sheet AR 2026 dimulai dari kolom *END OF 2025*, jadi saldo AR
  2026 sudah memuat piutang 2025 yang belum lunas. Ditambah AR 2025 lagi, piutang itu
  terhitung dua kali. AR Others 1.385.000.000 dan PPh-25/29 660.377.899, misalnya, hanya
  ada di 2025 tetapi tetap ikut di Dashboard.
- **Fixed Assets:** register aset 2026 memuat aset 2025. Vehicle 967.901.036 ada di kedua
  tahun, jadi di Dashboard menjadi 1.935.802.072 (dua mobil yang sama). Hal yang sama
  terjadi pada Office Equipment dan akumulasi penyusutan.

## 2. Net Profit (YTD) = PAT 2025 + PAT 2026

| Baris P&L | Dashboard | 2025 | 2026 |
|---|---:|---:|---:|
| COGS | −57.272.348.383,14 | −29.491.629.858,14 | −27.780.718.525,00 |
| Gross Profit | 14.377.480.714,86 | 9.573.402.878,86 | 4.804.077.836,00 |
| Personnel Expense | −8.644.813.943,00 | −5.371.345.265,00 | −3.273.468.678,00 |
| Office Expense | −1.189.436.599,00 | −746.656.844,00 | −442.779.755,00 |
| Marketing Expense | −146.497.897,00 | −105.499.550,00 | −40.998.347,00 |
| Financial Expense | −227.886.154,95 | −66.754.283,95 | −161.131.871,00 |
| Other Income (Expense) | 1.064.790.465,73 | 1.068.816.807,45 | −4.026.341,72 |
| Profit Before Tax | 4.351.948.861,31 | 3.933.734.803,03 | 418.214.058,29 |
| Income Tax | −1.142.078.230,00 | −662.078.230,00 | −480.000.000,00 |
| **Profit After Tax** | **3.209.870.631,31** | **3.271.656.573,03** | **−61.785.941,71** |

P&L adalah arus, jadi penjumlahannya tidak dobel. Tetapi hasilnya laba **kumulatif dua
tahun**, bukan YTD 2026. Laba YTD 2026 saat ini −61.785.941,71.

## 3. Total Receivables = AR 2025 + AR 2026

| Sub-item | Dashboard | 2025 | 2026 |
|---|---:|---:|---:|
| AR Trade | 8.758.017.595 | 3.230.257.176 | 5.527.760.419 |
| AR Cash Advance | 1.576.119.900 | 28.096.000 | 1.548.023.900 |
| AR Others | 1.385.000.000 | 1.385.000.000 | 0 |
| AR Staff Loan | 1.311.261.212 | 527.829.606 | 783.431.606 |
| AR Refund | 197.867.398 | 192.073.477 | 5.793.921 |
| AR Temporary Notes | 0 | 0 | 0 |
| **Total** | **13.228.266.105** | **5.363.256.259** | **7.865.009.846** |

Piutang yang masih terbuka sekarang adalah angka 2026 (7.865.009.846), karena sudah
membawa sisa 2025. Angka Dashboard menghitung sisa 2025 itu dua kali.

## 4. Total Payables = AP 2025 + AP 2026

| Sub-item | Dashboard | 2025 | 2026 |
|---|---:|---:|---:|
| AP Tax | 1.885.291.449 | 947.181.052 | 938.110.397 |
| AP Trade | 1.559.099.990 | 883.027.129 | 676.072.861 |
| AP Expense | 755.137.768 | 504.883.264 | 250.254.504 |
| AP Credit Card | 390.174.422 | 390.174.422 | 0 |
| AP Others | 246.000.000 | 3.000.000 | 243.000.000 |
| AP Leasing | 0 | 0 | 0 |
| **Total** | **4.835.703.629** | **2.728.265.867** | **2.107.437.762** |

Sama seperti AR: utang yang masih terbuka sekarang adalah angka 2026 (2.107.437.762).

## Temuan lain

1. **Subtotal Deposit tidak memuat Time Deposit.** Kategori Deposit di neraca menampilkan
   subtotal 3.005.077.758 (2026), padahal item di bawahnya Deposit to vendor 3.005.077.758
   + Time Deposit 452.625.000. Total Assets sudah menghitung Time Deposit dengan benar;
   yang salah hanya subtotal kategori yang ditampilkan.
2. **Neraca 2026 sekarang balance.** Total Assets 13.115.590.774,32 = Liabilities
   2.460.852.839 + Equity 10.654.737.935,32. Selisih 1,17 M yang terlihat semalam sudah
   hilang setelah tim finance menyelesaikan input.

## Usulan perbaikan

Dashboard mengirim tahun berjalan (`year=2026`) ke kedua panggilan, sesuai label
**FY 2026** / **YTD**. Angkanya lalu sama dengan halaman Financial Reports 2026 (kolom
terakhir tabel Ringkasan). Subtotal Deposit dibetulkan sekalian.
