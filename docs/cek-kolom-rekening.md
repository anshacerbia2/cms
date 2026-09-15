# Cek Kolom Rekening

Empat tabel finance tidak lagi punya kolom bank tetap. Kolomnya sekarang lahir dari
rekening yang benar-benar dipakai di tahun itu. Ini daftar yang perlu dibuktikan di
layar, lengkap dengan angka acuan dari `cms_dev`.

Harus sudah ada di lokal: **9f3ca6a** (perbaikan total yang hilang) dan **eb5d8e5**
(jalur tulis). Kalau belum, halaman Account Payable dan Account Receivable masih blank.

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

- [ ] Ada **12 rekening**, dan yang ke-12 adalah `PPn In and Out` bertipe `OTHER` tanpa bank
- [ ] Urutan daftarnya: BCA Sahardjo, BCA Juanda, Mandiri Mid Plaza, Mandiri Plasa
      Mandiri, BRI Sahardjo, BRI Tebet, BTN, Bank Raya, BNI, Cash IDR, Non CB,
      PPn In and Out
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

Hanya ada data 2025. Dulu tujuh kolom dideklarasikan, sekarang enam.

### Grand Total yang harus keluar — AR 2025

| Rekening | 2025 |
|---|---:|
| BCA Sahardjo | -1.312.802.624,00 |
| BCA Juanda | -193.596.229,00 |
| Mandiri Mid Plaza | 4.324.055.188,40 |
| BRI Sahardjo | -11.333.953,00 |
| Cash IDR | -2.812.641,00 |
| Non CB | -1.223.931.227,00 |

- [ ] 2025 menampilkan **6 kolom**, dan `PPn In and Out` **tidak** muncul
      *(kolomnya ada di Excel tapi isinya nol sepanjang 2025)*
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

### Grand Total yang harus keluar — AP 2025

| Rekening | di laptop lo | di cms_dev server |
|---|---:|---:|
| BCA Sahardjo | 686.680.889,00 | 686.680.889,00 |
| BCA Juanda | 149.183.884,00 | 149.183.884,00 |
| Mandiri Mid Plaza | -393.065.428,00 | -393.065.428,00 |
| BRI Sahardjo | -1.500.000,00 | -1.500.000,00 |
| BRI Tebet | -154.034.667,00 | -154.034.667,00 |
| Cash IDR | -2.892.500,00 | -2.892.500,00 |
| Non CB | **1.918.040.013,16** | 2.580.118.243,16 |
| PPn In and Out | -3.323.562.928,00 | -3.323.562.928,00 |

- [ ] 2025 menampilkan **8 kolom**, dan `BTN` **tidak** muncul
      *(kolom BTN dideklarasikan selama ini padahal tidak pernah ada pembayaran lewat
      sana di 2025)*
- [ ] Kolom terakhir bernama `PPn In and Out`, bukan lagi `AP In and Out` yang terpisah
      dari yang lain
- [ ] Header `BCA Sahardjo` / `BRI Sahardjo` — bukan `Shardjo`
- [ ] Angka Grand Total cocok dengan kolom "di laptop lo"
- [ ] ⚠️ **PALING RAWAN** — Subtotal dan Period Totals sejajar
- [ ] Filter dan sort di kolom rekening berfungsi

---

## Inter Account

*menu Finance → Inter Account*

Yang paling banyak berubah: dulu 13 kolom tetap, sekarang 11 di 2025 dan 9 di 2026.
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
| PPn In and Out | 3.926.669.655,00 | — |

- [ ] 2025 → **11 kolom**, 2026 → **9 kolom**
- [ ] `Bank Raya` muncul di 2026 tapi tidak di 2025 — kebalikan dari
      `Mandiri Plasa Mandiri`, `BRI Tebet` dan `PPn In and Out`.
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
