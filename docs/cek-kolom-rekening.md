# Cek Kolom Rekening

Empat tabel finance tidak lagi punya kolom bank tetap. Kolomnya sekarang lahir dari
rekening yang benar-benar dipakai di tahun itu. Ini daftar yang perlu dibuktikan di
layar, lengkap dengan angka acuan dari `cms_dev`.

Harus sudah ada di lokal: **b173c7e** atau setelahnya. Kalau belum sampai **9f3ca6a**,
halaman Account Payable dan Account Receivable masih blank.

`PPn In and Out` **bukan rekening** — dia posisi kliring PPN, jadi kolomnya tetap ada
di AR, AP dan Inter Account tapi dibaca langsung dari kolomnya sendiri, bukan lewat
relasi. Dia selalu tampil, di tahun mana pun, walau isinya nol.

---

## Sebelum mulai

Urutannya penting — kolom baru tidak ada di Prisma client sampai di-generate.

1. Tarik commit terbaru dan regenerate client:

   ```
   git pull --ff-only server dev
   cd backend && npx prisma generate
   ```

   Kalau ada workbook 2026 baru yang belum dimuat, sebutkan namanya supaya
   tabel lain tidak ikut dibangun ulang:

   ```
   pnpm seed:2026 --only=receivable,payable
   ```

2. Restart API dev dan dev server frontend — bukan cuma refresh browser.
3. Hard reload halaman (Ctrl+Shift+R) supaya bundle lama tidak tersangkut.

- [ ] Tiga langkah di atas selesai, console browser bersih saat halaman Sales dibuka

---

## Account & Bank

*menu Account & Bank → tab Accounts*

Di sinilah nama dan urutan kolom sekarang hidup. Kalau bagian ini benar, sisanya mengikuti.

- [ ] Ada **11 rekening** — `PPn In and Out` **tidak** ada di daftar ini
- [ ] Urutan daftarnya: BCA Sahardjo, BCA Juanda, Mandiri Mid Plaza, Mandiri Plasa
      Mandiri, BRI Sahardjo, BRI Tebet, BTN, Bank Raya, BNI, Cash IDR, Non CB
- [ ] Tombol edit membuka dialog yang punya field **Column header** dan **Position**,
      di antara *Registered Holder* dan checkbox Non-VAT
- [ ] ⚠️ **BUKTI UTAMA** — Ubah *Column header* BCA Juanda jadi `BCA JD` → simpan →
      buka Sales, header kolomnya ikut berubah. Kembalikan lagi.
      *Ini satu-satunya cek yang membuktikan kolom benar-benar diturunkan dari data,
      bukan dari kode.*
- [ ] Kosongkan *Position* satu rekening → di tabel finance dia pindah ke **ujung
      kanan**, bukan ke depan. Kembalikan.

---

## Sales

*menu Sales*

- [ ] Filter tahun **2025 → 8 kolom bank**, **2026 → 7 kolom**
- [ ] 2025 punya `Mandiri Plasa Mandiri`, 2026 tidak punya
- [ ] `BRI Tebet`, `Bank Raya` dan `Cash IDR` tidak muncul di tahun mana pun
      *(dulu tiga kolom ini selalu tampil dan selalu kosong)*

### Grand Total yang harus keluar — Sales

| Rekening | 2025 | 2026 |
|---|---:|---:|
| BCA Sahardjo | 3.219.609.931,00 | 70.239.954,00 |
| BCA Juanda | 4.487.221.366,00 | 264.086.534,00 |
| Mandiri Mid Plaza | 16.837.158.203,34 | 15.845.503.994,72 |
| Mandiri Plasa Mandiri | 3.819.509.838,10 | — |
| BRI Sahardjo | 3.915.394.741,00 | 6.280.866.294,00 |
| BTN | 2.978.073.566,00 | 3.033.471.437,00 |
| BNI | 1.151.031.287,00 | 531.464.374,00 |
| Non CB | 3.154.953.380,56 | 2.823.481.990,28 |

- [ ] Angka Grand Total 2025 cocok semua dengan tabel di atas
- [ ] Angka Grand Total 2026 cocok semua
- [ ] ⚠️ **PALING RAWAN** — Baris *Subtotal* dan *Grand Total* tepat sejajar di bawah
      kolomnya masing-masing.
      *Jumlah kolom sekarang berubah-ubah, jadi kalau ada sel yang kurang atau lebih,
      semua angka footer bergeser satu kolom.*
- [ ] Filter kolom rekening: buka filter di Mandiri Mid Plaza, hilangkan satu nilai,
      tekan **OK** → baris tersaring dan subtotal ikut berubah
- [ ] Sort naik dan turun di salah satu kolom rekening berfungsi
- [ ] Ganti tahun 2025 ↔ 2026 beberapa kali → tidak error, jumlah kolom ikut berubah
      setiap kali

---

## Account Receivable

*menu Finance → Account Receivable*

Workbook 2026 baru masuk: 1.241 baris. Dan dia membawa kolom **BNI**, yang tabel ini
tidak punya kolom tetapnya sama sekali — inilah kasus yang dulu pasti hilang.

### Grand Total yang harus keluar — AR

| Rekening | 2025 | 2026 |
|---|---:|---:|
| BCA Sahardjo | -1.312.802.624,00 | 1.665.245.866,00 |
| BCA Juanda | -193.596.229,00 | -2.034.608.434,00 |
| Mandiri Mid Plaza | 4.324.055.188,40 | 636.941.015,00 |
| BRI Sahardjo | -11.333.953,00 | 171.794.700,00 |
| BNI | — | **728.648.649,00** |
| Cash IDR | -2.812.641,00 | -515.401,00 |
| Non CB | -1.223.931.227,00 | 4.335.822.748,00 |
| PPn In and Out *(kolom tetap)* | 0 | 0 |

- [ ] 2025 → **6 kolom rekening**, 2026 → **7 kolom rekening**, dan di dua-duanya ada
      satu kolom tetap `PPn In and Out` di paling kanan sebelum Outstanding
- [ ] ⚠️ **INI YANG PALING PENTING DI HALAMAN INI** — 2026 punya kolom **BNI** berisi
      728.648.649. Tabel `account_receivables` tidak punya kolom tetap untuk BNI;
      angka ini masuk lewat relasi. Sebelum hari ini dia akan terbuang.
- [ ] Header-nya `BCA Sahardjo` dan `BRI Sahardjo` — bukan lagi salah ketik
      `BCA Suhardjo` / `BRI Suhardjo`, dan `Mandiri Mid Plaza` bukan `MANDIRI MP`
- [ ] Angka Grand Total cocok dengan tabel di atas
- [ ] ⚠️ **PALING RAWAN** — Subtotal dan Grand Total sejajar
- [ ] Filter dan sort di kolom rekening berfungsi
- [ ] Pilih tahun yang tidak punya data (2026) → tabel kosong dengan rapi, tulisan
      "No records" tidak melebar keluar tabel

---

## Account Payable

*menu Finance → Account Payable, tab Summary*

> **Satu angka di laptop lo memang beda dari server.**
> `Non CB` di DB lo **1.918.040.013,16**, di `cms_dev` server **2.580.118.243,16**.
>
> Selisihnya 662.078.230,00 — persis baris `AP Tax / PPh Badan 2025` yang diinput lewat
> aplikasi dan tidak ada di workbook mana pun, jadi DB lo yang di-seed dari Excel tidak
> punya baris itu. Bukan bug.

Workbook 2026 baru masuk juga: 138 baris.

### Grand Total yang harus keluar — AP

| Rekening | 2025 di laptop lo | 2025 di server | 2026 |
|---|---:|---:|---:|
| BCA Sahardjo | 686.680.889,00 | 686.680.889,00 | -2.502.112.075,00 |
| BCA Juanda | 149.183.884,00 | 149.183.884,00 | -381.062.971,00 |
| Mandiri Mid Plaza | -393.065.428,00 | -393.065.428,00 | -2.693.223.417,00 |
| BRI Sahardjo | -1.500.000,00 | -1.500.000,00 | 981.875.826,00 |
| BRI Tebet | -154.034.667,00 | -154.034.667,00 | — |
| Cash IDR | -2.892.500,00 | -2.892.500,00 | -204.500,00 |
| Non CB | **1.918.040.013,16** | 2.580.118.243,16 | -219.630.033,00 |
| AP In and Out *(kolom tetap)* | -3.323.562.928,00 | -3.323.562.928,00 | 0 |

- [ ] 2025 → **7 kolom rekening**, 2026 → **6 kolom rekening**, ditambah satu kolom
      tetap `AP In and Out` di dua-duanya
- [ ] `BTN` tidak muncul di tahun mana pun
      *(kolomnya dideklarasikan selama ini padahal tidak pernah dipakai)*
- [ ] Header `BCA Sahardjo` / `BRI Sahardjo` — bukan `Shardjo`
- [ ] Angka Grand Total cocok dengan kolom "di laptop lo"
- [ ] ⚠️ **PALING RAWAN** — Subtotal dan Period Totals sejajar
- [ ] Filter dan sort di kolom rekening berfungsi

---

## Inter Account

*menu Finance → Inter Account*

Yang paling banyak berubah: dulu 13 kolom tetap, sekarang 10 kolom rekening di 2025 dan
9 di 2026, ditambah satu kolom tetap `PPn In and Out` di dua-duanya.
Tabel ini juga satu-satunya yang totalnya sudah tidak menyebut kolom satu per satu.

### Grand Totals yang harus keluar — Inter Account

| Rekening | 2025 | 2026 |
|---|---:|---:|
| BCA Sahardjo | 812.485.814,00 | 1.888.527.113,00 |
| BCA Juanda | 7.665.966.113,00 | 11.314.529.279,00 |
| Mandiri Mid Plaza | -3.763.177.777,00 | -9.512.743.648,00 |
| Mandiri Plasa Mandiri | -3.661.075.922,00 | — |
| BRI Sahardjo | -2.031.205.062,00 | -9.101.254.841,00 |
| BRI Tebet | 148.974.667,00 | — |
| BTN | -6.264.585.000,00 | -3.040.215.348,00 |
| Bank Raya | — | -2.249.831,00 |
| BNI | -1.150.000.000,00 | -1.260.299.052,00 |
| Cash IDR | 132.686.063,00 | 93.226.705,00 |
| Non CB | 4.183.261.449,00 | 9.620.479.623,00 |
| PPn In and Out *(kolom tetap)* | 3.926.669.655,00 | 0 |

- [ ] 2025 → **10 kolom rekening**, 2026 → **9 kolom rekening**, plus kolom tetap
      `PPn In and Out` di dua-duanya
- [ ] `Bank Raya` muncul di 2026 tapi tidak di 2025 — kebalikan dari
      `Mandiri Plasa Mandiri` dan `BRI Tebet`.
      *Ini bukti paling jelas bahwa set kolomnya ikut data, bukan tetap.*
- [ ] `BJB` tidak muncul di tahun mana pun
      *(ada kolomnya di setiap workbook, tidak pernah sekali pun berisi angka)*
- [ ] Header `Mandiri Plasa Mandiri` — bukan salah ketik `Manidiri Plaza Mandiri`
- [ ] Angka Grand Totals cocok, di kedua tahun
- [ ] ⚠️ **PALING RAWAN** — Baris Grand Totals sejajar di bawah kolomnya.
      *Di tabel ini urutan deklarasi kode sempat salah dan bikin error saat render
      pertama; sudah diperbaiki, tapi justru di sini yang perlu dilihat.*

---

## Jalur tulis

Bagian yang paling baru dan paling berisiko: sampai hari ini, menyimpan lewat UI hanya
menulis kolom lama, jadi angkanya tidak akan muncul sama sekali di kolom baru. Sudah
diperbaiki di `eb5d8e5`, dan ini caranya membuktikan.

- [ ] Edit satu invoice Sales, isi nominal di salah satu kolom bank yang sudah tampil,
      simpan → angkanya muncul di sel itu dan Grand Total kolom tersebut naik tepat
      sebesar itu
- [ ] Edit lagi baris yang sama, kosongkan nominal itu, simpan → angkanya hilang dan
      total kembali seperti sebelumnya.
      *Kalau totalnya tidak turun, berarti baris relasi lama tidak terhapus.*
- [ ] ⚠️ **INTI DARI SEMUANYA** — Isi nominal di kolom rekening yang tahun itu *belum
      dipakai* — misalnya Bank Raya di Sales 2025 → setelah simpan dan refresh,
      **kolom baru muncul sendiri**.
      *Inilah yang dulu mustahil tanpa migrasi database. Jangan lupa kosongkan lagi
      setelah dicek.*
- [ ] Hal yang sama di Account Receivable, Account Payable dan Inter Account — tambah
      atau edit satu baris dengan nominal bank
- [ ] Hapus satu baris uji → hilang tanpa error, dan totalnya menyesuaikan

Kalau lo isi nama rekening yang belum terdaftar, server akan menolak dengan pesan
berisi nama rekeningnya, bukan membuang angkanya diam-diam. Itu memang disengaja —
kalau otomatis dibuatkan, satu salah ketik akan jadi rekening baru dan angkanya
terpisah dari yang benar tanpa ada yang sadar.

---

## Yang sengaja belum disentuh

Jangan dianggap bug kalau yang ini masih pakai cara lama:

- Modal detail (tombol mata di Sales) masih memakai label kolom lama `colM..colW`
- Modal Add dan Edit masih menampilkan daftar kolom bank yang tetap
- Export Excel dan PDF masih membaca kolom lama — hasilnya tetap berisi semua kolom
  termasuk yang kosong. Yang perlu dipastikan hanya: **masih bisa diunduh**
- Halaman Depreciation dan PPN In/Out belum diubah sama sekali
- Balance Sheet dan Profit Loss tidak disentuh
- Kolom `colM..colW` dan kawan-kawannya masih ada di database dan masih diisi — itu
  jalan pulang kalau ada angka yang janggal

## Kalau ada yang merah

Kirim tiga hal: nama halaman dan tahun yang dipilih, screenshot tabelnya termasuk baris
footer, dan isi console browser kalau ada error.
