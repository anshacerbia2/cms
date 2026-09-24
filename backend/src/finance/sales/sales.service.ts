import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe, parseDecimalSafe } from '../../common/utils/parse.utils';
import {
  syncAccountAmounts, SALES_RECORD_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';



@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async getSales(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.salesRecord.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
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
      orderBy: [{ id: 'asc' }],
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

    const data = payload.map(row => ({
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
      tagYear: parsedTagYear,
    }));

    const savedRows = await this.prisma.salesRecord.createManyAndReturn({ data });
    for (const row of savedRows) {
      await syncAccountAmounts(this.prisma, {
        amountModel: this.prisma.salesRecordAmount,
        parentKey: 'salesRecordId',
        parentId: row.id,
        columns: SALES_RECORD_COLUMNS,
        row,
      });
    }
    return { count: savedRows.length };
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
    if ('colH' in data) updateData.colH = data.colH?.toString() || null;
    if ('colI' in data) updateData.colI = data.colI?.toString() || null;
    if ('colJ' in data) updateData.colJ = data.colJ?.toString() || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colL' in data) updateData.colL = parseDateSafe(data.colL);
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;
    if ('colP' in data) updateData.colP = data.colP?.toString() || null;
    if ('colQ' in data) updateData.colQ = data.colQ?.toString() || null;
    if ('colR' in data) updateData.colR = data.colR?.toString() || null;
    if ('colS' in data) updateData.colS = data.colS?.toString() || null;
    if ('colT' in data) updateData.colT = data.colT?.toString() || null;
    if ('colU' in data) updateData.colU = data.colU?.toString() || null;
    if ('colV' in data) updateData.colV = data.colV?.toString() || null;
    if ('colW' in data) updateData.colW = data.colW?.toString() || null;
    if ('colX' in data) updateData.colX = data.colX?.toString() || null;
    if ('colZ' in data) updateData.colZ = data.colZ?.toString() || null;
    if ('colAA' in data) updateData.colAA = data.colAA?.toString() || null;
    if ('colAB' in data) updateData.colAB = data.colAB?.toString() || null;
    if ('colAC' in data) updateData.colAC = data.colAC?.toString() || null;
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
    return this.prisma.salesRecord.delete({
      where: { id }
    });
  }
}
