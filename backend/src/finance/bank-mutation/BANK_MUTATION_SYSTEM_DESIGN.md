# 🏛️ Bank Mutation System Design (Financial Integrity)

Dokumen ini menjelaskan arsitektur sistem **Bank Mutation** (Mutasi Bank), mulai dari perolehan data di Frontend hingga logika sinkronisasi rekursif di Backend. Sistem ini dirancang dengan standar **Enterprise Grade** untuk menjamin presisi finansial dan integritas audit.

---

## 1. Data Acquisition & Orchestration (Frontend)

Sistem menggunakan strategi **Hybrid Fetching** untuk menyeimbangkan performa UI dan akurasi data.

### A. Fetching Strategy: "Load Heavy, Interact Light"
Berbeda dengan modul lain yang menggunakan *Server-side Pagination*, Bank Mutation menggunakan **Full Fetch per Year** via `getAllTransactions`. 
*   **Alasan**: User membutuhkan pengalaman "Excel-like" di mana filtering, sorting, dan akumulasi total (Debet/Kredit/Saldo) harus terjadi instan tanpa *network latency*.
*   **Implementasi**: Data satu tahun fiskal ditarik sekaligus, kemudian diproses di memori menggunakan `useMemo` untuk filtering dan sorting.

### B. Summary Cards Logic
Data di *Header Cards* (Opening, Inflow, Outflow, Closing) dihitung secara dinamis:
1.  **Opening Balance (Hybrid Discovery)**: 
    *   Jika record `FiscalPeriod` ada: Gunakan `openingBalance` dari record tersebut.
    *   Jika record TIDAK ADA: Gunakan **Anchor Discovery** (mencari saldo terakhir dari transaksi atau record fiskal tahun-tahun sebelumnya secara rekursif).
2.  **Annual Inflow/Outflow (Client Side)**: Hasil kalkulasi instan (`reduce`) dari seluruh array transaksi yang di-fetch.
3.  **Projected Closing (Hybrid Logic)**: 
    *   **Status OPEN**: Mengambil nilai `openingBalance` (karena belum ada transaksi).
    *   **Status ONGOING**: Mengambil nilai `colE` (Saldo) dari transaksi paling terakhir. Jika transaksi kosong, fallback ke `openingBalance`.
    *   **Status CLOSED**: Mengambil nilai snapshot `closingBalance` yang sudah dikunci saat proses audit.

---

## 2. Bulk Mutation Engine (The Entry Flow)

Proses input mutasi dirancang untuk menangani migrasi data besar maupun input harian tanpa menciptakan sampah data (Ghost Records).

### A. AddLedgerModal (The Preview Layer)
*   **Anchor Point**: Saat modal dibuka, sistem memanggil `getAnchorBalance` (Transaction-Aware). 
*   **Lazy Registration**: Sistem **TIDAK AKAN** membuat record `FiscalPeriod` saat transaksi disimpan, kecuali user secara eksplisit memberikan `startingBalance` (Migrasi Awal). Record fiskal akan dibuat secara otomatis ("Self-Healing") hanya saat proses rekalkulasi mendeteksi adanya data.
*   **Editable Anchor**: Input saldo awal hanya terbuka jika sistem mendeteksi ini adalah "Inisialisasi Baru" (tidak ada data sama sekali di sejarah akun tersebut).

---

## 3. Recursive Domino Sync (The Lazy Engine)

Ini adalah jantung dari integritas data ledger. Fungsi `recalculateLedger` memastikan saldo tetap konsisten lintas tahun dengan prinsip efisiensi maksimal.

### A. Linear Recalculation (Internal Year)
Saat data disimpan atau diperbarui, sistem menghitung ulang saldo:
1.  Mulai dari `openingBalance` (hasil *discovery* jika record belum ada).
2.  Iterasi seluruh transaksi berdasarkan urutan `Tanggal ASC, ID ASC`.
3.  Update kolom `colE` di setiap baris. **Strict Integrity**: Tidak ada hardcode "0" sebagai fallback untuk menjamin visibilitas bug saat debugging.

### B. Gap-Skipping Cascading (The Lazy Jump)
Setelah perhitungan tahun berjalan selesai, sistem akan mengalirkan saldo ke masa depan:
1.  **Direct Jump**: Sistem mencari record `FiscalPeriod` **berikutnya yang tersedia** di database (misal: saat ini 2020, data berikutnya ada di 2025).
2.  **No Ghost Periods**: Sistem **TIDAK AKAN** membuat record jembatan untuk tahun-tahun kosong (2021-2024). Saldo akan langsung di-update ke saldo pembuka tahun 2025.
3.  **Recursive Trigger**: Memanggil dirinya sendiri untuk tahun target (`recalculateLedger(2025)`) untuk memastikan domino saldo terus berlanjut hingga tahun terbaru.

---

## 4. Closing Year (Audit Locking)

Proses `closeYear` adalah finalisasi audit yang bersifat permanen:
1.  **Final Recalculate**: Menjalankan sinkronisasi penuh untuk memastikan angka terakhir benar-benar akurat.
2.  **Snapshotting**: Menyalin saldo akhir ke kolom `closingBalance` (sebagai bukti audit yang tidak berubah).
3.  **Locking**: Mengubah status periode menjadi `CLOSED` sehingga transaksi tidak bisa ditambah/ubah/hapus.
4.  **Chain Initialization**: Memaksa pembuatan/update `openingBalance` untuk tahun fiskal berikutnya (Year+1) untuk memastikan kesinambungan audit.

---

---

## 5. Frontend Integrity & UX Standards

Sistem Ledger menuntut presisi matematis dan navigasi data yang intuitif.

### A. Strict Financial Arithmetic (Decimal.js)
Untuk menghindari *Floating Point Error* (seperti `0.1 + 0.2 = 0.30000000000000004`), sistem menggunakan library **`decimal.js`** di seluruh lapisan:
1.  **Calculations**: Akumulasi saldo, total debet, dan kredit dilakukan 100% menggunakan object `Decimal`.
2.  **Formatting**: Konversi ke native `number` hanya dilakukan pada titik terakhir sebelum formatting (via `formatCurrency`) untuk menjamin akurasi hingga digit terakhir.
3.  **State Management**: Data ringkasan (`summaryStats`) disimpan dalam bentuk object `Decimal` asli di memori.

### B. Cascading (Excel-like) Filter Chaining
Untuk mempermudah audit data ribuan baris, sistem mengimplementasikan **Chained Filtering**:
1.  **Context-Aware**: List opsi di dropdown filter kolom akan berubah secara dinamis berdasarkan filter yang aktif di kolom lain.
2.  **Logic**: Opsi unik untuk kolom `X` diambil dari data yang telah lolos filter Global Search + Semua Filter Kolom Lain (kecuali kolom `X` itu sendiri).
3.  **Instant Feedback**: Memanfaatkan `useMemo` untuk memastikan proses pemfilteran tetap berada di bawah ambang batas persepsi manusia (instan).

### C. Rendering Discipline & Stability
Mengingat volume data yang besar, stabilitas re-render sangat dijaga:
1.  **Memoized Dependencies**: Data API (internal accounts) di-memoize untuk mencegah *Infinite Re-render Loop* yang sering terjadi pada inisialisasi state awal.
2.  **Primitive Scope**: Penggunaan `yearNum` (memoized primitive) sebagai dependensi utama hook untuk memastikan network requests hanya ter-trigger saat ada perubahan input yang valid.

---

## 6. Database Schema Reference
*   **internal_accounts**: Master data akun (Bank/Kas).
*   **fiscal_periods**: Tabel index tahunan (Opening, Closing, Status).
*   **financial_transactions**: Ledger detail (Debet, Kredit, Saldo/colE).

**Last Updated:** 2026-04-27
**Architecture Grade:** 10/10 (High-Precision Financial Ledger)
