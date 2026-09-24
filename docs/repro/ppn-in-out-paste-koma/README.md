# PPN In/Out: simpan gagal karena angka berkoma

Kejadian di prod, 24 Sep 2026, 05:36–05:41: lima kali simpan satu baris PPN
In/Out (No Faktur 03002500126595376, PT Bank Tabungan Negara), semuanya gagal
dengan 500. Diperbaiki di `7f24851`.

## Penyebab

Clipboard berisi angka gaya Inggris (`56,981,982`). Pembersih paste lama
mengganti tiap koma dengan titik, jadi yang terkirim `56.981.982`. Prisma
menolaknya: `Invalid value for argument colH: invalid digit found in string`.

| Kolom | Field | Di clipboard | Yang terkirim (kode lama) |
|---|---|---|---|
| PPN | colH | 56,981,982 | 56.981.982 |
| WAPU | colI | 56,981,982 | 56.981.982 |
| PAID | colJ | -56,981,982 | -56.981.982 |
| AP PPN Non WAPU | colO | 123,349,900 | 123.349.900 |

## Berkas

- `ppn-gagal-baris-lengkap.tsv` — satu baris, 18 kolom, dipisah tab. Buka di
  text editor (jangan di Excel), copy barisnya, paste ke sel **Masa** di form
  Add PPN In/Out.
- `ppn-gagal-angka-saja.tsv` — hanya PPN sampai AP PPN Non WAPU. Paste ke sel
  **PPN**, lalu isi No Faktur atau Client, karena baris tanpa keduanya
  dilewati saat simpan.
- `ppn-gagal-payload.json` — body request persis yang ditolak server. Kirim ke
  `POST /api/finance/ppn-in-out/bulk`.

## Hasil yang diharapkan

- **Sebelum `7f24851`:** simpan gagal 500, dan log backend menampilkan error di atas.
- **Sesudah `7f24851`:** tersimpan dengan PPN 56.981.982, WAPU 56.981.982,
  PAID −56.981.982, AP PPN Non WAPU 123.349.900.

Setelah fix di-deploy, tes ini **benar-benar menyimpan baris PPN 2025**. Jadi
jalankan di lokal/dev, atau hapus barisnya setelah tes.
