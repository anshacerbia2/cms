-- Nomor urut Bank Statement jadi 1, 2, 3, ... per rekening-tahun, tanpa pengali.
--
-- Sebelumnya row_no disimpan berjarak 1000 (1000, 2000, 3000) supaya baris bisa
-- disisip di celahnya. Sekarang menyisip menggeser baris-baris sesudahnya, jadi
-- celah itu tidak diperlukan lagi.
--
-- Hanya nomornya yang berubah: urutan tiap rekening-tahun dipertahankan persis
-- (row_no, lalu id - urutan yang dipakai aplikasi), termasuk baris yang row_no-
-- nya pecahan atau kosong. Tidak ada kolom lain yang disentuh. Activity log
-- tidak mencatatnya: trigger mengabaikan perubahan row_no.

UPDATE financial_transactions f
   SET row_no = x.n
  FROM (
         SELECT id,
                row_number() OVER (
                  PARTITION BY internal_account_id, "tagYear"
                  ORDER BY row_no ASC NULLS LAST, id ASC
                ) AS n
           FROM financial_transactions
       ) x
 WHERE f.id = x.id
   AND f.row_no IS DISTINCT FROM x.n;
