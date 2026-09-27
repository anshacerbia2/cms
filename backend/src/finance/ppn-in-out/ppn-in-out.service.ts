import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe, parseDecimalSafe } from '../../common/utils/parse.utils';
import { lockPpnYear } from '../common/ledger-lock';

/**
 * Urutan PPN In/Out di mana pun barisnya dibaca berderet: layar, export, dan
 * saldo berjalan colO. `rowNo` yang menentukan; `id` pemecah seri untuk baris
 * yang belum bernomor, yang pada ASC jatuh di ujung.
 */
const PPN_ORDER: Prisma.PpnInOutOrderByWithRelationInput[] = [{ rowNo: 'asc' }, { id: 'asc' }];

/** Batas waktu transaksi tulis PPN In/Out. */
const PPN_TX = { timeout: 60_000, maxWait: 30_000 };

@Injectable()
export class PpnInOutService {
  constructor(private prisma: PrismaService) {}

  private mapDecimals(row: any) {
    return {
      ...row,
      colG: row.colG ? formatDecimal(row.colG) : null,
      dpp: row.dpp ? formatDecimal(row.dpp) : null,
      colH: row.colH ? formatDecimal(row.colH) : null,
      colI: row.colI ? formatDecimal(row.colI) : null,
      colJ: row.colJ ? formatDecimal(row.colJ) : null,
      colK: row.colK ? formatDecimal(row.colK) : null,
      colM: row.colM ? formatDecimal(row.colM) : null,
      colN: row.colN ? formatDecimal(row.colN) : null,
      colO: row.colO ? formatDecimal(row.colO) : null,
    };
  }

  async getAllPpnInOut(year?: number) {
    const where = year ? { tagYear: year } : {};
    const data = await this.prisma.ppnInOut.findMany({ where, orderBy: PPN_ORDER });
    return data.map(this.mapDecimals);
  }

  async getPaginatedPpnInOut(params: any) {
    const { page = 1, limit = 10, search, year } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (year) {
      where.tagYear = Number(year);
    }
    if (search) {
      where.OR = [
        { colC: { contains: search, mode: 'insensitive' } }, // No Faktur
        { colD: { contains: search, mode: 'insensitive' } }, // Client/Suplier
        { colE: { contains: search, mode: 'insensitive' } }, // Invoice No
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ppnInOut.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: PPN_ORDER,
      }),
      this.prisma.ppnInOut.count({ where }),
    ]);

    return {
      data: data.map(this.mapDecimals),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getPpnInOutById(id: number) {
    const item = await this.prisma.ppnInOut.findUnique({
      where: { id }
    });
    if (!item) return null;
    return this.mapDecimals(item);
  }

  async createBulkPpnInOut(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }
    // Ditambahkan di bawah baris terakhir tahun itu.
    return this.writeRows(payload, parsedTagYear, null);
  }

  async createPpnInOut(data: any) {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }
    return this.writeRows([data], parsedTagYear, null);
  }

  /**
   * Menyisip satu atau lebih baris tepat di bawah `afterId` (atau paling atas
   * kalau null). Baris di bawahnya bergeser turun, dan saldo AP PPN Non WAPU
   * dihitung ulang dari baris itu. Sama dengan Sales dan Bank Statement.
   */
  async insertPpnInOut(payload: any[], tagYear: number, afterId: number | null): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }
    return this.writeRows(payload, parsedTagYear, afterId === undefined || afterId === null ? 0 : BigInt(afterId));
  }

  /**
   * `after`: null = tambahkan di ujung, 0 = sisip paling atas, selain itu id
   * baris yang ditumpangi. Satu transaksi di bawah kunci tahun itu: nomor
   * baris dan saldo berjalan selesai bersamaan.
   */
  private async writeRows(payload: any[], tagYear: number, after: bigint | 0 | null) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new BadRequestException('No rows to save.');
    }
    const data = payload.map((row) => this.toRecord(row, tagYear));

    const count = await this.prisma.$transaction(async (tx) => {
      await lockPpnYear(tx, tagYear);
      // Rapikan dulu jadi 1..n; baris yang belum bernomor mendapat nomor di ujung.
      await this.repackRowNo(tx, tagYear);

      let floor: number;
      if (after === null) {
        floor = await this.lastRowNo(tx, tagYear);
      } else {
        floor = 0;
        if (after !== 0) {
          const anchor = await tx.ppnInOut.findUnique({ where: { id: after }, select: { tagYear: true, rowNo: true } });
          if (!anchor) throw new NotFoundException(`PPN row ${after} not found`);
          if (anchor.tagYear !== tagYear) {
            throw new BadRequestException(`PPN row ${after} belongs to ${anchor.tagYear}, not ${tagYear}`);
          }
          floor = anchor.rowNo ?? 0;
        }
        // Baris 1 2 3, menyisip dua di bawah baris 2: baris 3 jadi 5, yang baru 3 dan 4.
        await tx.$executeRaw`
          UPDATE ppn_in_out
             SET row_no = row_no + ${data.length}
           WHERE "tagYear" = ${tagYear}
             AND row_no > ${floor}
        `;
      }

      const { count } = await tx.ppnInOut.createMany({
        data: data.map((row, i) => ({ ...row, rowNo: floor + i + 1 })),
      });
      await this.recalcBalance(tx, tagYear);
      return count;
    }, PPN_TX);

    return { count };
  }

  /** Kolom yang diketik. colO (saldo berjalan) tidak termasuk: dihitung sistem. */
  private toRecord(row: any, tagYear: number) {
    return {
      colA: parseDateSafe(row.colA),
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE || null,
      colF: parseIntSafe(row.colF),
      colG: parseDecimalSafe(row.colG, 'colG'),
      dpp: parseDecimalSafe(row.dpp, 'dpp'),
      status: row.status || null,
      colH: parseDecimalSafe(row.colH, 'colH'),
      colI: parseDecimalSafe(row.colI, 'colI'),
      colJ: parseDecimalSafe(row.colJ, 'colJ'),
      colK: parseDecimalSafe(row.colK, 'colK'),
      colM: parseDecimalSafe(row.colM, 'colM'),
      colN: parseDecimalSafe(row.colN, 'colN'),
      colP: row.colP || null,
      colQ: row.colQ || null,
      colR: row.colR || null,
      colS: row.colS || null,
      tagYear,
    };
  }

  async updatePpnInOut(id: number, data: any) {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = parseDateSafe(data.colA);
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD || null;
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = parseIntSafe(data.colF);
    if ('colG' in data) updateData.colG = parseDecimalSafe(data.colG, 'colG');
    if ('dpp' in data) updateData.dpp = parseDecimalSafe(data.dpp, 'dpp');
    if ('status' in data) updateData.status = data.status || null;
    if ('colH' in data) updateData.colH = parseDecimalSafe(data.colH, 'colH');
    if ('colI' in data) updateData.colI = parseDecimalSafe(data.colI, 'colI');
    if ('colJ' in data) updateData.colJ = parseDecimalSafe(data.colJ, 'colJ');
    if ('colK' in data) updateData.colK = parseDecimalSafe(data.colK, 'colK');
    if ('colM' in data) updateData.colM = parseDecimalSafe(data.colM, 'colM');
    if ('colN' in data) updateData.colN = parseDecimalSafe(data.colN, 'colN');
    // colO tidak bisa diketik: saldo berjalan, dihitung ulang di bawah.
    if ('colP' in data) updateData.colP = data.colP || null;
    if ('colQ' in data) updateData.colQ = data.colQ || null;
    if ('colR' in data) updateData.colR = data.colR || null;
    if ('colS' in data) updateData.colS = data.colS || null;

    const existing = await this.prisma.ppnInOut.findUnique({ where: { id }, select: { tagYear: true } });
    if (!existing) throw new NotFoundException(`PPN row ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      await lockPpnYear(tx, existing.tagYear);
      const saved = await tx.ppnInOut.update({ where: { id }, data: updateData });
      // Non WAPU atau Masukan yang berubah menggeser saldo semua baris sesudahnya.
      await this.recalcBalance(tx, existing.tagYear);
      return saved;
    }, PPN_TX);
  }

  async deletePpnInOut(id: number) {
    const existing = await this.prisma.ppnInOut.findUnique({ where: { id }, select: { tagYear: true } });
    if (!existing) throw new NotFoundException(`PPN row ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      await lockPpnYear(tx, existing.tagYear);
      const deleted = await tx.ppnInOut.delete({ where: { id } });
      // Baris-baris di bawahnya naik satu, dan saldonya tidak lagi memuat baris ini.
      await this.repackRowNo(tx, existing.tagYear);
      await this.recalcBalance(tx, existing.tagYear);
      return deleted;
    }, PPN_TX);
  }

  /** Nomor baris terakhir yang terpakai di satu tahun, 0 kalau belum ada. */
  private async lastRowNo(db: Prisma.TransactionClient, year: number): Promise<number> {
    const last = await db.ppnInOut.findFirst({
      // Yang belum bernomor dilewati: pada DESC Postgres menaruhnya paling depan.
      where: { tagYear: year, rowNo: { not: null } },
      orderBy: [{ rowNo: 'desc' }],
      select: { rowNo: true },
    });
    return last?.rowNo ?? 0;
  }

  /**
   * Menomori ulang satu tahun jadi 1, 2, 3, ... tanpa lubang, mengikuti urutan
   * yang ada sekarang (row_no, lalu id). Hanya baris yang nomornya berubah yang ditulis.
   */
  private async repackRowNo(db: Prisma.TransactionClient, year: number): Promise<void> {
    await db.$executeRaw`
      UPDATE ppn_in_out s
         SET row_no = x.n
        FROM (
               SELECT id, row_number() OVER (ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                 FROM ppn_in_out
                WHERE "tagYear" = ${year}
             ) x
       WHERE s.id = x.id
         AND s.row_no IS DISTINCT FROM x.n
    `;
  }

  /**
   * AP PPN Non WAPU (colO) sebagai saldo berjalan satu tahun, persis rumus
   * workbook: O = O baris sebelumnya - Non WAPU + Masukan, mulai 0 tiap tahun,
   * menurut urutan baris. Satu UPDATE; hanya baris yang saldonya berubah yang ditulis.
   */
  private async recalcBalance(db: Prisma.TransactionClient, year: number): Promise<void> {
    await db.$executeRaw`
      UPDATE ppn_in_out s
         SET "colO" = x.saldo
        FROM (
               SELECT id,
                      SUM(COALESCE("colN", 0) - COALESCE("colM", 0))
                        OVER (ORDER BY row_no ASC NULLS LAST, id ASC
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS saldo
                 FROM ppn_in_out
                WHERE "tagYear" = ${year}
             ) x
       WHERE s.id = x.id
         AND s."colO" IS DISTINCT FROM x.saldo
    `;
  }
}
