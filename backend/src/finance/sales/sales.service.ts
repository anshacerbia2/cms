import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe, parseDecimalSafe } from '../../common/utils/parse.utils';
import {
  syncAccountAmounts, SALES_RECORD_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';
import { lockSalesYear } from '../common/ledger-lock';

/**
 * Urutan register Sales di mana pun barisnya dibaca berderet: layar, export
 * Excel dan PDF. `rowNo` yang menentukan; `id` pemecah seri untuk baris yang
 * belum bernomor, yang pada ASC jatuh di ujung - perilaku lama "paling bawah".
 */
const SALES_ORDER: Prisma.SalesRecordOrderByWithRelationInput[] = [{ rowNo: 'asc' }, { id: 'asc' }];

/** Batas waktu transaksi tulis Sales: tiap baris ikut menulis rincian per rekening. */
const SALES_TX = { timeout: 60_000, maxWait: 30_000 };

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async getSales(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.salesRecord.findMany({ skip, take: limit, orderBy: SALES_ORDER }),
      this.prisma.salesRecord.count(),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        id: Number(item.id),
        colH: formatDecimal(item.colH),
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        colR: formatDecimal(item.colR),
        colS: formatDecimal(item.colS),
        colT: formatDecimal(item.colT),
        colU: formatDecimal(item.colU),
        colV: formatDecimal(item.colV),
        colW: formatDecimal(item.colW),
        colX: formatDecimal(item.colX),
        colZ: formatDecimal(item.colZ),
        colAA: formatDecimal(item.colAA),
        colAB: formatDecimal(item.colAB),
        colAC: formatDecimal(item.colAC),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllSales(year?: number): Promise<any[]> {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.salesRecord.findMany({
      where,
      orderBy: SALES_ORDER,
      include: { amounts: { select: { internalAccountId: true, amount: true } } },
    });
    return data.map(item => ({
      ...item,
      id: Number(item.id),
      // The same payment figures as the colM..colW columns beside them, but
      // keyed by the account rather than by a position the table fixes.
      amounts: serializeAmounts(item.amounts),
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
      colV: formatDecimal(item.colV),
      colW: formatDecimal(item.colW),
      colX: formatDecimal(item.colX),
      colZ: formatDecimal(item.colZ),
      colAA: formatDecimal(item.colAA),
      colAB: formatDecimal(item.colAB),
      colAC: formatDecimal(item.colAC),
    }));
  }

  async getSalesAccounts(year?: number): Promise<AccountColumn[]> {
    return findAccountColumns(this.prisma, {
      amountModel: this.prisma.salesRecordAmount,
      parentRelation: 'salesRecord',
      year,
    });
  }

  async createBulkSales(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    // Ditambahkan di bawah baris terakhir tahun itu.
    return this.writeRows(payload, parsedTagYear, null);
  }

  /**
   * Menyisip satu atau lebih baris tepat di bawah `afterId` (atau paling atas
   * kalau null). Baris baru masuk berurutan sesuai kirimannya; baris di bawahnya
   * bergeser turun sebanyak jumlah baris baru. Sama dengan Bank Statement.
   */
  async insertSales(payload: any[], tagYear: number, afterId: number | null): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }
    return this.writeRows(payload, parsedTagYear, afterId === undefined || afterId === null ? 0 : BigInt(afterId));
  }

  /**
   * `after`: null = tambahkan di ujung, 0 = sisip paling atas, selain itu id
   * baris yang ditumpangi. Semuanya dalam satu transaksi di bawah kunci tahun
   * itu, supaya dua penyimpanan bersamaan tidak memakai nomor yang sama.
   */
  private async writeRows(payload: any[], tagYear: number, after: bigint | 0 | null) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new BadRequestException('No rows to save.');
    }
    const data = payload.map((row) => this.toRecord(row, tagYear));

    const savedRows = await this.prisma.$transaction(async (tx) => {
      await lockSalesYear(tx, tagYear);
      // Rapikan dulu jadi 1..n. Baris yang belum bernomor ikut mendapat nomor di
      // ujung, jadi baris baru tidak mungkin terselip di atasnya.
      await this.repackRowNo(tx, tagYear);

      let floor: number;
      if (after === null) {
        floor = await this.lastRowNo(tx, tagYear);
      } else {
        floor = 0;
        if (after !== 0) {
          const anchor = await tx.salesRecord.findUnique({
            where: { id: after },
            select: { tagYear: true, rowNo: true },
          });
          if (!anchor) throw new NotFoundException(`Sales row ${after} not found`);
          if (anchor.tagYear !== tagYear) {
            throw new BadRequestException(`Sales row ${after} belongs to ${anchor.tagYear}, not ${tagYear}`);
          }
          floor = anchor.rowNo ?? 0;
        }
        // Baris 1 2 3, menyisip dua di bawah baris 2: baris 3 jadi 5, yang baru 3 dan 4.
        await tx.$executeRaw`
          UPDATE sales_records
             SET row_no = row_no + ${data.length}
           WHERE "tagYear" = ${tagYear}
             AND row_no > ${floor}
        `;
      }

      const saved = await tx.salesRecord.createManyAndReturn({
        data: data.map((row, i) => ({ ...row, rowNo: floor + i + 1 })),
      });
      for (const row of saved) {
        await syncAccountAmounts(tx as any, {
          amountModel: tx.salesRecordAmount,
          parentKey: 'salesRecordId',
          parentId: row.id,
          columns: SALES_RECORD_COLUMNS,
          row,
        });
      }
      return saved;
    }, SALES_TX);

    return { count: savedRows.length };
  }

  private toRecord(row: any, tagYear: number) {
    return {
      colA: row.colA || null,
      colB: row.colB || null,
      colC: parseDateSafe(row.colC),
      colD: parseIntSafe(row.colD),
      colE: row.colE || null,
      colF: row.colF || null,
      colG: row.colG || null,
      colH: parseDecimalSafe(row.colH, 'colH'),
      colI: parseDecimalSafe(row.colI, 'colI'),
      colJ: parseDecimalSafe(row.colJ, 'colJ'),
      colK: parseDecimalSafe(row.colK, 'colK'),
      colL: parseDateSafe(row.colL),
      colM: parseDecimalSafe(row.colM, 'colM'),
      colN: parseDecimalSafe(row.colN, 'colN'),
      colO: parseDecimalSafe(row.colO, 'colO'),
      colP: parseDecimalSafe(row.colP, 'colP'),
      colQ: parseDecimalSafe(row.colQ, 'colQ'),
      colR: parseDecimalSafe(row.colR, 'colR'),
      colS: parseDecimalSafe(row.colS, 'colS'),
      colT: parseDecimalSafe(row.colT, 'colT'),
      colU: parseDecimalSafe(row.colU, 'colU'),
      colV: parseDecimalSafe(row.colV, 'colV'),
      colW: parseDecimalSafe(row.colW, 'colW'),
      colX: parseDecimalSafe(row.colX, 'colX'),
      colZ: parseDecimalSafe(row.colZ, 'colZ'),
      colAA: parseDecimalSafe(row.colAA, 'colAA'),
      colAB: parseDecimalSafe(row.colAB, 'colAB'),
      colAC: parseDecimalSafe(row.colAC, 'colAC'),
      colAD: row.colAD || null,
      tagYear,
    };
  }

  /** Nomor baris terakhir yang terpakai di satu tahun, 0 kalau belum ada. */
  private async lastRowNo(db: Prisma.TransactionClient, year: number): Promise<number> {
    const last = await db.salesRecord.findFirst({
      // Yang belum bernomor dilewati: pada DESC Postgres menaruhnya paling depan.
      where: { tagYear: year, rowNo: { not: null } },
      orderBy: [{ rowNo: 'desc' }],
      select: { rowNo: true },
    });
    return last?.rowNo ?? 0;
  }

  /**
   * Menomori ulang satu tahun jadi 1, 2, 3, ... tanpa lubang, mengikuti urutan
   * yang ada sekarang (row_no, lalu id). Yang belum bernomor mendapat nomor di
   * ujung. Hanya baris yang nomornya berubah yang ditulis.
   */
  private async repackRowNo(db: Prisma.TransactionClient, year: number): Promise<void> {
    await db.$executeRaw`
      UPDATE sales_records s
         SET row_no = x.n
        FROM (
               SELECT id, row_number() OVER (ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                 FROM sales_records
                WHERE "tagYear" = ${year}
             ) x
       WHERE s.id = x.id
         AND s.row_no IS DISTINCT FROM x.n
    `;
  }

  async getSalesById(id: number): Promise<any> {
    const item = await this.prisma.salesRecord.findUnique({
      where: { id }
    });
    if (!item) return null;
    return {
      ...item,
      id: Number(item.id),
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
      colV: formatDecimal(item.colV),
      colW: formatDecimal(item.colW),
      colX: formatDecimal(item.colX),
      colZ: formatDecimal(item.colZ),
      colAA: formatDecimal(item.colAA),
      colAB: formatDecimal(item.colAB),
      colAC: formatDecimal(item.colAC),
    };
  }

  async updateSales(id: number, data: any): Promise<any> {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = data.colA || null;
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = parseDateSafe(data.colC);
    if ('colD' in data) updateData.colD = parseIntSafe(data.colD);
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = data.colF || null;
    if ('colG' in data) updateData.colG = data.colG || null;
    if ('colH' in data) updateData.colH = parseDecimalSafe(data.colH, 'colH');
    if ('colI' in data) updateData.colI = parseDecimalSafe(data.colI, 'colI');
    if ('colJ' in data) updateData.colJ = parseDecimalSafe(data.colJ, 'colJ');
    if ('colK' in data) updateData.colK = parseDecimalSafe(data.colK, 'colK');
    if ('colL' in data) updateData.colL = parseDateSafe(data.colL);
    if ('colM' in data) updateData.colM = parseDecimalSafe(data.colM, 'colM');
    if ('colN' in data) updateData.colN = parseDecimalSafe(data.colN, 'colN');
    if ('colO' in data) updateData.colO = parseDecimalSafe(data.colO, 'colO');
    if ('colP' in data) updateData.colP = parseDecimalSafe(data.colP, 'colP');
    if ('colQ' in data) updateData.colQ = parseDecimalSafe(data.colQ, 'colQ');
    if ('colR' in data) updateData.colR = parseDecimalSafe(data.colR, 'colR');
    if ('colS' in data) updateData.colS = parseDecimalSafe(data.colS, 'colS');
    if ('colT' in data) updateData.colT = parseDecimalSafe(data.colT, 'colT');
    if ('colU' in data) updateData.colU = parseDecimalSafe(data.colU, 'colU');
    if ('colV' in data) updateData.colV = parseDecimalSafe(data.colV, 'colV');
    if ('colW' in data) updateData.colW = parseDecimalSafe(data.colW, 'colW');
    if ('colX' in data) updateData.colX = parseDecimalSafe(data.colX, 'colX');
    if ('colZ' in data) updateData.colZ = parseDecimalSafe(data.colZ, 'colZ');
    if ('colAA' in data) updateData.colAA = parseDecimalSafe(data.colAA, 'colAA');
    if ('colAB' in data) updateData.colAB = parseDecimalSafe(data.colAB, 'colAB');
    if ('colAC' in data) updateData.colAC = parseDecimalSafe(data.colAC, 'colAC');
    if ('colAD' in data) updateData.colAD = data.colAD || null;

    const saved = await this.prisma.salesRecord.update({
      where: { id },
      data: updateData
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.salesRecordAmount,
      parentKey: 'salesRecordId',
      parentId: saved.id,
      columns: SALES_RECORD_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async deleteSales(id: number): Promise<any> {
    const existing = await this.prisma.salesRecord.findUnique({ where: { id }, select: { tagYear: true } });
    if (!existing) throw new NotFoundException(`Sales row ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      await lockSalesYear(tx, existing.tagYear);
      const deleted = await tx.salesRecord.delete({ where: { id } });
      // Baris-baris di bawahnya naik satu, supaya nomornya tidak bolong.
      await this.repackRowNo(tx, existing.tagYear);
      return deleted;
    }, SALES_TX);
  }
}
