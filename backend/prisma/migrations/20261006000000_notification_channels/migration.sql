-- Tujuan alert keamanan yang diatur dari UI (Settings > Notification Channels).
-- Hanya menambah: tipe, tabel, fungsi trigger, dan trigger baru.

CREATE TYPE "NotificationChannelType" AS ENUM ('TELEGRAM', 'GOOGLE_CHAT');

CREATE TABLE "notification_channels" (
    "id"         BIGSERIAL NOT NULL,
    "type"       "NotificationChannelType" NOT NULL,
    "name"       VARCHAR(100) NOT NULL,
    "secret"     TEXT NOT NULL,
    "hint"       VARCHAR(160) NOT NULL,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- audit_row_change() menyimpan baris utuh di old_data/new_data; kolom yang
-- diabaikannya tetap ikut tersimpan. Untuk tabel yang memegang kredensial itu
-- berarti token tercatat polos di audit_logs. Fungsi ini sama, tetapi kolom yang
-- disebut di argumen trigger ditulis "[redacted]": perubahannya tetap terlihat
-- (kolomnya ada di changed_columns), nilainya tidak.
CREATE OR REPLACE FUNCTION audit_row_change_redacted() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  app      TEXT := current_setting('application_name', true);
  redacted TEXT[] := COALESCE(TG_ARGV, '{}');
  old_j    JSONB;
  new_j    JSONB;
  changed  TEXT[];
  k        TEXT;
BEGIN
  IF app = 'cms-seeder' THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN old_j := to_jsonb(OLD); END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN new_j := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(c ORDER BY c) INTO changed
      FROM jsonb_object_keys(new_j) AS c
     WHERE (new_j -> c) IS DISTINCT FROM (old_j -> c)
       AND c <> 'updated_at';
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

CREATE TRIGGER audit_notification_channels
  AFTER INSERT OR UPDATE OR DELETE ON "notification_channels"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change_redacted('secret');
