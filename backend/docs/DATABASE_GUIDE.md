# Database Management Guide (Prisma)

Dokumen ini berisi panduan standar untuk mengelola database di project CMS ini, terutama untuk menghindari data loss di environment Produksi.

## ⚠️ Aturan Emas (Golden Rules)
1. **JANGAN PERNAH** menjalankan `npx prisma migrate dev` di server Produksi.
2. **JANGAN PERNAH** menjalankan `npx prisma migrate reset` di server Produksi.
3. **SELALU** commit folder `prisma/migrations` ke Git. Folder ini adalah sejarah database lo.

---

## 🛠️ Workflow Development (Lokal)

Gunakan perintah ini saat lo melakukan perubahan di `schema.prisma`.

```bash
# 1. Generate migration baru (otomatis deteksi perubahan)
npx prisma migrate dev --name deskripsi_perubahan

# 2. Update Prisma Client (biar TypeScript nggak error)
npx prisma generate

# 3. (Opsional) Isi ulang data testing dari Excel
npx prisma db seed
```

### Jika Terjadi "Drift" (Database tidak sinkron)
Jika Prisma bilang database "drift", biasanya karena ada file migration yang dihapus manual. Di lokal, aman untuk melakukan:
`npx prisma migrate reset` (Semua data akan hilang dan diulang dari awal).

---

## 🚀 Workflow Production (Server)

Di server, kita tidak membuat migration baru, kita cuma **menjalankan** migration yang sudah dibuat di lokal.

```bash
# Jalankan migration yang sudah ada tanpa reset data
npx prisma migrate deploy

# Update client di server
npx prisma generate
```

---

## 🌱 Seeding Strategy

Seeder kita (`prisma/seeders/finance.seeder.ts`) sekarang sudah **Universal**. Artinya:
- Dia membaca file `prisma/seed-data/financial-report.xlsx`.
- Dia menggunakan skema **Minimalist Column (`colA` - `colM`)**.
- Jika lo menambah kolom di Excel, lo nggak perlu migrasi database lagi, cukup update mapping di seeder saja (kalau perlu).

---

## 📁 Struktur Folder Prisma
- `schema.prisma`: Desain tabel (Source of Truth).
- `migrations/`: Sejarah perubahan database (Jangan dihapus!).
- `seed-data/`: Tempat naruh file Excel/CSV untuk master data.
- `seeders/`: Logic untuk import data dari file ke database.
