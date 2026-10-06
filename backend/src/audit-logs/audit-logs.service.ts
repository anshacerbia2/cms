import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dateParam, idParam } from '../common/utils/query-params';

/**
 * Rincian per rekening disimpan di tabel anaknya sendiri. Riwayat sebuah baris
 * AR, misalnya, harus ikut menampilkan perubahan angka BCA atau Mandiri-nya,
 * yang secara fisik adalah baris di `account_receivable_amounts`.
 */
const CHILD_TABLES: Record<string, { table: string; parentKey: string }> = {
  account_receivables: { table: 'account_receivable_amounts', parentKey: 'account_receivable_id' },
  account_payables: { table: 'account_payable_amounts', parentKey: 'account_payable_id' },
  sales_records: { table: 'sales_record_amounts', parentKey: 'sales_record_id' },
  inter_account: { table: 'inter_account_amounts', parentKey: 'inter_account_id' },
};

export type AuditLogQuery = {
  table?: string;
  rowId?: string;
  userId?: string;
  action?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async list(query: AuditLogQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));

    // Filter dipakai pada entri sesudah dilipat: tabel, id, dan aksi induknya.
    const where: Prisma.Sql[] = [];
    if (query.table) {
      const tables = query.table.split(',').map((t) => t.trim()).filter(Boolean);
      if (tables.length) where.push(Prisma.sql`v.show_table IN (${Prisma.join(tables)})`);
    }
    if (query.rowId) where.push(Prisma.sql`v.show_row_id = ${idParam(query.rowId, 'rowId')!}`);
    if (query.userId) where.push(Prisma.sql`v.user_id = ${idParam(query.userId, 'userId')!}`);
    if (query.action) {
      const actions = query.action.split(',').map((a) => a.trim()).filter(Boolean);
      if (actions.length) where.push(Prisma.sql`v.show_action IN (${Prisma.join(actions)})`);
    }
    if (query.requestId) where.push(Prisma.sql`v.request_id = ${query.requestId}`);
    if (query.from) where.push(Prisma.sql`v.occurred_at >= ${dateParam(query.from, 'from')!}`);
    if (query.to) {
      // Halaman mengirim batas hari menurut jam lokal user sebagai waktu
      // lengkap (eksklusif). Kalau yang datang tanggal polos, seluruh hari
      // itu (UTC) disertakan.
      const end = dateParam(query.to, 'to')!;
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) end.setUTCDate(end.getUTCDate() + 1);
      where.push(Prisma.sql`v.occurred_at < ${end}`);
    }
    const filter = where.length ? Prisma.sql`WHERE ${Prisma.join(where, ' AND ')}` : Prisma.empty;

    const children = Prisma.join(
      Object.entries(CHILD_TABLES).map(
        ([parent, c]) => Prisma.sql`(${c.table}::text, ${parent}::text, ${c.parentKey}::text)`,
      ),
    );

    /*
     * Aksi di log adalah aksi pada RECORD: dibuat, diubah, dihapus. Rincian per
     * rekening disimpan di tabel anak, dan mengisi atau mengosongkan satu
     * rekening di sana tercatat sebagai baris anak yang dibuat/dihapus - padahal
     * bagi record-nya itu perubahan nilai. Jadi entri anak dilipat ke induknya:
     *   - Kalau simpanan yang sama (request_id) juga mencatat induknya, entri
     *     anak disembunyikan - angkanya sudah ada di kolom induk (Non CB, BCA...).
     *   - Kalau tidak (misalnya diubah lewat SQL), entri anak tampil sebagai
     *     Updated pada record induknya.
     * Isi audit_logs sendiri tidak diubah; ini hanya cara membacanya.
     */
    const folded = Prisma.sql`
      WITH e AS (
        SELECT a.id, a.occurred_at, a.table_name, a.row_id, a.action, a.user_id, a.request_id,
               ch.parent AS parent_table,
               (COALESCE(a.new_data, a.old_data) ->> ch.pkey)::bigint AS parent_id
          FROM audit_logs a
          LEFT JOIN (VALUES ${children}) AS ch(child, parent, pkey) ON ch.child = a.table_name
      ), v AS (
        SELECT e.id, e.occurred_at, e.user_id, e.request_id,
               COALESCE(e.parent_table, e.table_name) AS show_table,
               COALESCE(e.parent_id, e.row_id)        AS show_row_id,
               CASE WHEN e.parent_table IS NULL THEN e.action ELSE 'UPDATE' END AS show_action
          FROM e
         WHERE e.parent_table IS NULL
            OR NOT EXISTS (
                 SELECT 1 FROM audit_logs p
                  WHERE p.request_id = e.request_id
                    AND p.table_name = e.parent_table
                    AND p.row_id = e.parent_id
               )
      )`;

    const [picked, counted] = await Promise.all([
      this.prisma.$queryRaw<{ id: bigint; show_action: string }[]>`
        ${folded}
        SELECT v.id, v.show_action FROM v ${filter}
         ORDER BY v.occurred_at DESC, v.id DESC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<{ n: bigint }[]>`${folded} SELECT count(*) AS n FROM v ${filter}`,
    ]);
    const total = Number(counted[0]?.n ?? 0);
    const actionOf = new Map(picked.map((p) => [p.id.toString(), p.show_action]));

    const found = picked.length
      ? await this.prisma.auditLog.findMany({ where: { id: { in: picked.map((p) => p.id) } } })
      : [];
    const byId = new Map(found.map((r) => [r.id.toString(), r]));
    const rows = picked.map((p) => byId.get(p.id.toString())!).filter(Boolean);

    // Nama user dan nama rekening dicari sekali untuk seluruh halaman.
    const userIds = [...new Set(rows.map((r) => r.userId).filter((v): v is bigint => v !== null))];
    const accountIds = new Set<bigint>();
    for (const r of rows) {
      const data = (r.newData ?? r.oldData) as Record<string, any> | null;
      if (data?.internal_account_id != null && r.tableName.endsWith('_amounts')) {
        accountIds.add(BigInt(data.internal_account_id));
      }
    }
    const [users, accounts] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : [],
      accountIds.size
        ? this.prisma.internalAccount.findMany({
            where: { id: { in: [...accountIds] } },
            select: { id: true, displayName: true, holderName: true, bank: { select: { bankBrand: true } } },
          })
        : [],
    ]);
    const userOf = new Map(users.map((u) => [u.id.toString(), u]));
    const accountOf = new Map(
      accounts.map((a) => [a.id.toString(), a.displayName || [a.bank?.bankBrand, a.holderName].filter(Boolean).join(' ')]),
    );

    return {
      data: rows.map((r) => {
        const data = (r.newData ?? r.oldData) as Record<string, any> | null;
        const user = r.userId ? userOf.get(r.userId.toString()) : undefined;
        return {
          id: r.id.toString(),
          occurredAt: r.occurredAt,
          table: r.tableName,
          rowId: r.rowId?.toString() ?? null,
          action: actionOf.get(r.id.toString()) ?? r.action,
          source: r.source,
          user: user ? { id: user.id.toString(), name: user.name, email: user.email } : r.userEmail ? { id: r.userId?.toString() ?? null, name: null, email: r.userEmail } : null,
          dbUser: r.dbUser,
          requestId: r.requestId,
          changedColumns: r.changedColumns,
          before: r.oldData,
          after: r.newData,
          accountLabel:
            data?.internal_account_id != null && r.tableName.endsWith('_amounts')
              ? accountOf.get(String(data.internal_account_id)) ?? null
              : null,
        };
      }),
      meta: { total, page, limit, lastPage: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** User yang pernah muncul di log - untuk pilihan filter. */
  async users() {
    const ids = await this.prisma.auditLog.findMany({
      where: { userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids.map((i) => i.userId!) } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({ id: u.id.toString(), name: u.name, email: u.email }));
  }
}
