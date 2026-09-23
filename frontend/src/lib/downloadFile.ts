import api from './api';
import { toast } from 'sonner';

/**
 * Baris mana yang ikut ke berkas unduhan.
 *
 * Tanpa filter aktif, hasilnya `undefined` - permintaannya tetap GET dan server
 * mengirim seluruh baris, persis seperti sebelumnya. Begitu ada filter kolom,
 * pencarian, atau rentang yang aktif, yang dikirim adalah `id` baris yang
 * lolos, dan server hanya mengekspor baris itu. Filternya sendiri tidak dikirim:
 * penyaringan terjadi di browser atas nilai yang sudah diformat untuk layar,
 * dan menirukannya di server berarti menyalin ulang seluruh pemformatan.
 *
 * Daftar kosong tetap dikirim kalau filternya memang tidak menyisakan baris -
 * berkasnya pun harus kosong.
 */
export function exportFilter(isFilterActive: boolean, rows: any[]) {
  if (!isFilterActive) return undefined;
  return { ids: rows.map((row) => String(row?.id)) };
}

export async function downloadExcelFile(url: string, filename: string, body?: unknown) {
  try {
    // Daftar id bisa ribuan, jadi terlalu panjang untuk URL: kalau ada, kirim lewat POST.
    const response = body === undefined
      ? await api.get(url, { responseType: 'blob' })
      : await api.post(url, body, { responseType: 'blob' });

    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success(`${filename} exported successfully!`);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`Failed to export ${filename}`);
  }
}

export async function downloadPdfFile(url: string, filename: string, body?: unknown) {
  try {
    const response = body === undefined
      ? await api.get(url, { responseType: 'blob' })
      : await api.post(url, body, { responseType: 'blob' });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success(`${filename} exported successfully!`);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`Failed to export ${filename}`);
  }
}
