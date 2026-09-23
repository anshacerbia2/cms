/**
 * Baris mana yang ikut ke berkas unduhan.
 *
 * Halaman menyaring tabelnya di browser (`useExcelFilter`), dan nilai yang
 * disaring adalah nilai yang sudah diformat untuk layar - "IDR 1.234,00",
 * "-" untuk yang kosong. Server tidak bisa menirukan penyaringan itu tanpa
 * menyalin ulang seluruh pemformatan tiap halaman, dan salinan semacam itu
 * pasti berbeda suatu hari nanti.
 *
 * Jadi yang dikirim halaman bukan filternya, melainkan `id` baris yang lolos
 * filter. Server tetap yang menentukan kolom dan urutannya; yang ditentukan
 * layar hanya baris mana yang ikut.
 *
 * `ids` tidak dikirim sama sekali berarti tanpa filter - seluruh baris ikut,
 * seperti sebelumnya. Daftar kosong berarti filternya memang tidak menyisakan
 * baris apa pun, dan berkasnya memang harus kosong.
 */
export function pickExportRows<T>(rows: T[], ids?: string[] | null): T[] {
  if (!Array.isArray(ids)) return rows;
  const wanted = new Set(ids.map(String));
  return rows.filter(row => wanted.has(String((row as any)?.id)));
}
