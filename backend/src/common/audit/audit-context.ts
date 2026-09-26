import { AsyncLocalStorage } from 'async_hooks';

/**
 * Siapa yang sedang membuat request ini - dibaca oleh `AuditedPool` setiap kali
 * sebuah query meminjam koneksi database, lalu diteruskan ke trigger activity
 * log lewat pengaturan sesi PostgreSQL.
 *
 * Dibuat oleh middleware di awal setiap request (hanya `requestId`), lalu
 * dilengkapi oleh `AuditUserInterceptor` sesudah guard JWT mengenali user-nya.
 * Objeknya sama sepanjang request, jadi pengisian belakangan terlihat oleh
 * query yang berjalan sesudahnya.
 */
export type AuditStore = {
  requestId: string;
  userId?: string;
  email?: string;
};

export const auditContext = new AsyncLocalStorage<AuditStore>();
