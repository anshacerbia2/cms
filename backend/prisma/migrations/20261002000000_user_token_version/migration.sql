-- Versi token per user: logout dan ganti password menaikkannya, sehingga token
-- yang dibuat sebelumnya ditolak (pentest F-04). Default 0 = token yang sudah
-- beredar (tanpa versi) tetap berlaku sampai kedaluwarsa; tidak ada yang
-- ter-logout saat migrasi ini dijalankan.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
