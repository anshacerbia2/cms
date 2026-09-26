import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

    const and: Prisma.AuditLogWhereInput[] = [];

    if (query.table) {
      const tables = query.table.split(',').map((t) => t.trim()).filter(Boolean);
      if (query.rowId) {
        // Riwayat satu baris: baris itu sendiri, plus rincian per rekeningnya.
        const rowId = BigInt(query.rowId);
        const either: Prisma.AuditLogWhereInput[] = [{ tableName: { in: tables }, rowId }];
        for (const t of tables) {
          const child = CHILD_TABLES[t];
          if (!child) continue;
          const id = Number(rowId);
          either.push(
            { tableName: child.table, newData: { path: [child.parentKey], equals: id } },
            { tableName: child.table, oldData: { path: [child.parentKey], equals: id } },
          );
        }
        and.push({ OR: either });
      } else {
        const withChildren = tables.flatMap((t) => (CHILD_TABLES[t] ? [t, CHILD_TABLES[t].table] : [t]));
        and.push({ tableName: { in: withChildren } });
      }
    } else if (query.rowId) {
      and.push({ rowId: BigInt(query.rowId) });
    }

    if (query.userId) and.push({ userId: BigInt(query.userId) });
    if (query.action) and.push({ action: { in: query.action.split(',') } });
    if (query.requestId) and.push({ requestId: query.requestId });
    if (query.from) and.push({ occurredAt: { gte: new Date(query.from) } });
    if (query.to) {
      // `to` berupa tanggal: sertakan seluruh hari itu.
      const end = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) end.setDate(end.getDate() + 1);
      and.push({ occurredAt: { lt: end } });
    }

    const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

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
          action: r.action,
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
