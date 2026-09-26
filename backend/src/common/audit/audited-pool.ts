import { Pool, PoolClient } from 'pg';
import { auditContext } from './audit-context';

const TAG_SQL =
  "select set_config('app.user_id', $1, false), " +
  "set_config('app.user_email', $2, false), " +
  "set_config('app.request_id', $3, false)";

type ConnectCallback = (err: Error | undefined, client: PoolClient | undefined, done: (release?: any) => void) => void;

/**
 * Pool yang menitipkan identitas user ke setiap koneksi yang dipinjam.
 *
 * Trigger activity log (`audit_row_change`) membaca `app.user_id`,
 * `app.user_email`, dan `app.request_id` dari sesi koneksinya. Karena koneksi
 * dipakai bergantian oleh banyak request, nilainya ditimpa SETIAP kali koneksi
 * dipinjam - termasuk dengan string kosong kalau tidak ada user - sehingga
 * identitas request sebelumnya tidak mungkin terbawa.
 *
 * Konteks dibaca saat `connect()` dipanggil, yaitu di dalam alur request
 * pemanggilnya, bukan saat koneksinya tersedia: kalau pool sedang penuh,
 * koneksi diserahkan dari alur request lain yang baru selesai.
 *
 * `Pool.query` juga meminjam lewat `connect(cb)`, jadi satu titik ini menutup
 * query biasa maupun transaksi.
 */
export class AuditedPool extends Pool {
  connect(): Promise<PoolClient>;
  connect(callback: ConnectCallback): void;
  connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    const store = auditContext.getStore();
    const params = [store?.userId ?? '', store?.email ?? '', store?.requestId ?? ''];

    if (callback) {
      super.connect((err, client, done) => {
        if (err || !client) return callback(err, client, done);
        client.query(TAG_SQL, params).then(
          () => callback(undefined, client, done),
          (tagErr: Error) => {
            done(tagErr);
            callback(tagErr, undefined, () => undefined);
          },
        );
      });
      return;
    }

    return super.connect().then(async (client) => {
      try {
        await client.query(TAG_SQL, params);
      } catch (tagErr) {
        client.release(tagErr as Error);
        throw tagErr;
      }
      return client;
    });
  }
}
