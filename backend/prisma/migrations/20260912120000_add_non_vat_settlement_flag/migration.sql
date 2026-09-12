-- Additive: one nullable-by-default boolean. Existing rows get false, which
-- leaves the No Tax rule unenforced until an account is explicitly marked.
ALTER TABLE "internal_accounts"
  ADD COLUMN "is_non_vat_settlement" BOOLEAN NOT NULL DEFAULT false;
