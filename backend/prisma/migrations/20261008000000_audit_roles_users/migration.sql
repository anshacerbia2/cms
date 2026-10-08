-- Activity log untuk akses: siapa membuat atau mengubah role dan user.
--
-- 7 Okt 2026 sebuah role baru dibuat dan grup Settings dicabut dari
-- Administrator lewat aplikasi, dan tidak ada jejaknya selain log request
-- server: roles dan users tidak punya trigger audit.
--
-- Hanya menambah trigger dan memperluas fungsi audit_row_change_redacted();
-- tidak ada data yang diubah.

-- audit_row_change_redacted() kini membaca dua jenis argumen:
--   'kolom'         -> nilainya ditulis "[redacted]" (seperti sebelumnya);
--   'ignore:kolom'  -> perubahan kolom itu saja tidak dicatat (seperti
--                      argumen audit_row_change()).
-- Trigger notification_channels ('secret') tetap berperilaku sama.
CREATE OR REPLACE FUNCTION audit_row_change_redacted() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  app      TEXT := current_setting('application_name', true);
  args     TEXT[] := COALESCE(TG_ARGV, '{}');
  ignored  TEXT[] := '{}';
  redacted TEXT[] := '{}';
  old_j    JSONB;
  new_j    JSONB;
  changed  TEXT[];
  a        TEXT;
  k        TEXT;
BEGIN
  IF app = 'cms-seeder' THEN
    RETURN NULL;
  END IF;

  FOREACH a IN ARRAY args LOOP
    IF a LIKE 'ignore:%' THEN
      ignored := ignored || substr(a, 8);
    ELSE
      redacted := redacted || a;
    END IF;
  END LOOP;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN old_j := to_jsonb(OLD); END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN new_j := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(c ORDER BY c) INTO changed
      FROM jsonb_object_keys(new_j) AS c
     WHERE (new_j -> c) IS DISTINCT FROM (old_j -> c)
       AND c <> 'updated_at'
       AND c <> ALL (ignored);
    IF changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  FOREACH k IN ARRAY redacted LOOP
    IF old_j ? k THEN old_j := jsonb_set(old_j, ARRAY[k], '"[redacted]"'); END IF;
    IF new_j ? k THEN new_j := jsonb_set(new_j, ARRAY[k], '"[redacted]"'); END IF;
  END LOOP;

  INSERT INTO "audit_logs"
    ("table_name", "row_id", "action", "user_id", "user_email", "request_id", "source",
     "changed_columns", "old_data", "new_data")
  VALUES
    (TG_TABLE_NAME,
     COALESCE(new_j ->> 'id', old_j ->> 'id')::BIGINT,
     TG_OP,
     NULLIF(current_setting('app.user_id', true), '')::BIGINT,
     NULLIF(current_setting('app.user_email', true), ''),
     NULLIF(current_setting('app.request_id', true), ''),
     CASE WHEN app = 'cms-backend' THEN 'APP' ELSE 'SQL' END,
     changed, old_j, new_j);

  RETURN NULL;
END;
$$;

-- Nama, slug, deskripsi role. Daftar permission dan menu sebuah role dicatat
-- oleh RolesService sebagai satu entri per simpan (yang dicabut dan yang
-- ditambah) - role_permission dan role_menu dihapus lalu diisi ulang setiap
-- kali disimpan, jadi trigger per baris akan menghasilkan ratusan entri.
CREATE TRIGGER audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON "roles"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

-- User: password dan remember_token disensor; token_version naik di setiap
-- logout (dicatat sebagai event sign-in), jadi diabaikan.
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change_redacted('password', 'remember_token', 'ignore:token_version');
