# 🏦 Bank Mutation Module Summary

## 📝 Overview
Modul **Bank Mutation** adalah dashboard finansial premium yang dirancang untuk melacak, memfilter, dan merekonsiliasi transaksi perbankan (BCA, Mandiri, dll) secara *real-time* dengan akurasi data tingkat tinggi. Modul ini menggunakan pendekatan *Client-Side Engine* untuk memberikan pengalaman filter dan pencarian yang instan (Zero Latency).

---

## 📊 Dashboard Summary Cards
Terdapat 4 card utama di bagian atas dashboard yang berfungsi sebagai indikator posisi keuangan bank yang dipilih:

1.  **Opening Balance (Saldo Awal)**
    *   **Deskripsi**: Saldo awal pada periode transaksi yang ditampilkan.
    *   **Rumus Rekonsiliasi**: `Saldo Baris Terakhir (colE) - (Total Inflow - Total Outflow)`.
    *   **Fungsi**: Menunjukkan posisi saldo sebelum mutasi di periode saat ini dihitung.

2.  **Inflow (Total Kredit)**
    *   **Deskripsi**: Akumulasi seluruh dana yang masuk ke rekening.
    *   **Sumber Data**: Total dari seluruh kolom **Credit (colD)** pada data yang terfilter.

3.  **Outflow (Total Debet)**
    *   **Deskripsi**: Akumulasi seluruh dana yang keluar dari rekening.
    *   **Sumber Data**: Total dari seluruh kolom **Debit (colC)** pada data yang terfilter.

4.  **Closing Balance (Saldo Akhir)**
    *   **Deskripsi**: Saldo final yang sudah mencakup seluruh mutasi hingga transaksi terakhir.
    *   **Rumus Rekonsiliasi**: `Saldo Baris Terakhir (colE) - Debet Terakhir (colC) + Kredit Terakhir (colD)`.
    *   **Fungsi**: Memberikan angka saldo riil yang paling *up-to-date* setelah transaksi paling terakhir dieksekusi.

---

## 🏗️ Table Engine & Features

### 1. Data Grid Logic
Tabel menggunakan struktur data Excel-like dengan identitas kolom sebagai berikut:
- **colB**: Date & Time
- **colC**: Withdrawal (Debit)
- **colD**: Deposit (Credit)
- **colE**: Running Balance (Saldo)
- **colF-H**: Description & Metadata

### 2. Table Footer Reconciliation
Tabel memiliki dua baris ringkasan (footer) yang membantu audit data per halaman:
- **Subtotal (Current Page)**: Menghitung total mutasi (Debet/Kredit) khusus untuk baris yang tampil di halaman saat ini.
- **Total (Running Accumulation)**: Menghitung akumulasi mutasi dari **Halaman 1** sampai **Halaman saat ini**. Ini memudahkan user untuk melihat progres mutasi tanpa harus menjumlahkan manual.
- **Note**: Kolom Saldo dihilangkan di bagian footer untuk menghindari redundansi dan fokus pada volume mutasi.

### 3. Smart Filtering & Sorting
- **Global Search**: Pencarian teks pada seluruh kolom metadata.
- **Excel Column Filter**: Fitur unik untuk memfilter data berdasarkan nilai unik di setiap kolom (Identitas bank, Kategori, dll).
- **Sorting**: Data secara default diurutkan berdasarkan ID secara *Ascending* untuk menjaga integritas urutan saldo.

---

## 📱 Responsive & UI Standards
- **Premium Aesthetics**: Menggunakan `shadow-premium` dan `border-primary/5` untuk efek kedalaman tanpa garis pembatas yang kaku.
- **Micro-Animations**: Transisi halus pada baris tabel dan card summary menggunakan Framer Motion / Tailwind Animate.
- **Adaptive Layout**: Dashboard summary berubah dari 2 kolom (Mobile/Tablet) menjadi 4 kolom (Desktop) secara otomatis untuk mencegah teks terpotong.
- **Border Radius**: Menggunakan standar `rounded-xl` untuk tampilan enterprise yang tajam dan profesional.

---

## 🛠️ Technical Specifications
- **Core Component**: `BankMutationPage.tsx`
- **Data Hook**: `useFinance` -> `getAllTransactions`
- **Numerical Precision**: Menggunakan parsing angka yang ketat untuk menangani string desimal hingga 4 angka di belakang koma (misal: `250052841.6700`).

---

*Last Updated: 2026-04-23*
