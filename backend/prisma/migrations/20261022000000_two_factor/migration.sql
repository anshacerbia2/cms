-- Verifikasi dua langkah (Google Authenticator / TOTP) - insiden 19 Okt 2026:
-- password finance@ bocor dan dipakai dari luar; password saja tidak boleh
-- lagi cukup untuk masuk.
--
-- Hanya menambah kolom dan mengganti argumen trigger audit users; tidak ada
-- data yang diubah. Semua user mulai tanpa 2FA dan diminta mendaftar saat
-- login berikutnya.

-- Kunci rahasia TOTP, terenkripsi AES-256-GCM (NOTIFICATION_SECRET_KEY).
ALTER TABLE "users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "two_factor_enabled_at" TIMESTAMP(3);
-- Langkah waktu (30 detik) kode terakhir yang diterima: kode yang sama tidak
-- bisa dipakai dua kali.
ALTER TABLE "users" ADD COLUMN "two_factor_last_step" INTEGER;

-- Trigger users: rahasia 2FA disensor seperti password; two_factor_last_step
-- berubah di setiap login (dicatat sebagai event sign-in), jadi diabaikan.
DROP TRIGGER IF EXISTS audit_users ON "users";
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change_redacted(
    'password', 'remember_token', 'two_factor_secret', 'ignore:token_version', 'ignore:two_factor_last_step');
