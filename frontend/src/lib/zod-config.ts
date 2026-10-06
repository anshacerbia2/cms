import { z } from 'zod';

/*
 * Zod 4 menguji `Function('')` untuk memilih mode JIT. CSP produksi (script-src
 * tanpa 'unsafe-eval') memblokirnya: zod tetap jalan tanpa JIT, tetapi setiap
 * halaman mengirim laporan pelanggaran CSP. Dengan jitless ujinya dilewati.
 *
 * Harus dijalankan sebelum schema pertama dibuat, jadi modul ini di-import
 * paling awal di main.tsx - import dievaluasi sebelum isi file yang mengimpornya.
 */
z.config({ jitless: true });
