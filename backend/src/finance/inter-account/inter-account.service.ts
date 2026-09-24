import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import {
  syncAccountAmounts, INTER_ACCOUNT_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';
import { parseIntSafe, parseDecimalSafe } from '../../common/utils/parse.utils';

@Injectable()
export class InterAccountService {
  constructor(private prisma: PrismaService) {}

  private mapDecimals(row: any) {
    return {
      ...row,
      colC: row.colC ? formatDecimal(row.colC) : null,
      colD: row.colD ? formatDecimal(row.colD) : null,
      colE: row.colE ? formatDecimal(row.colE) : null,
      colF: row.colF ? formatDecimal(row.colF) : null,
      colG: row.colG ? formatDecimal(row.colG) : null,
      colH: row.colH ? formatDecimal(row.colH) : null,
      colI: row.colI ? formatDecimal(row.colI) : null,
      colJ: row.colJ ? formatDecimal(row.colJ) : null,
      colK: row.colK ? formatDecimal(row.colK) : null,
      colL: row.colL ? formatDecimal(row.colL) : null,
      colM: row.colM ? formatDecimal(row.colM) : null,
      colN: row.colN ? formatDecimal(row.colN) : null,
      colO: row.colO ? formatDecimal(row.colO) : null,
      colP: row.colP ? formatDecimal(row.colP) : null,
      // The same figures the fixed columns carry, keyed by account.
      amounts: serializeAmounts(row.amounts),
    };
  }

  async getAllInterAccount(year?: number) {
    const where = year ? { tagYear: year } : {};
    
    const data = await this.prisma.interAccount.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { amounts: { select: { internalAccountId: true, amount: true } } },
    });

    return data.map(this.mapDecimals);
  }

  async getPaginatedInterAccount(params: any) {
    const { page = 1, limit = 10, search, year } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (year) {
      where.tagYear = Number(year);
    }
    if (search) {
      where.OR = [
        { colB: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.interAccount.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { id: 'asc' },
        include: { amounts: { select: { internalAccountId: true, amount: true } } },
      }),
      this.prisma.interAccount.count({ where }),
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

  async getInterAccountById(id: number) {
    const item = await this.prisma.interAccount.findUnique({
      where: { id },
      include: { amounts: { select: { internalAccountId: true, amount: true } } },
    });
    if (!item) return null;
    return this.mapDecimals(item);
  }

  async createBulkInterAccount(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const data = payload.map(row => ({
      colB: row.colB || null,
      colC: parseDecimalSafe(row.colC, 'colC'),
      colD: parseDecimalSafe(row.colD, 'colD'),
      colE: parseDecimalSafe(row.colE, 'colE'),
      colF: parseDecimalSafe(row.colF, 'colF'),
      colG: parseDecimalSafe(row.colG, 'colG'),
      colH: parseDecimalSafe(row.colH, 'colH'),
      colI: parseDecimalSafe(row.colI, 'colI'),
      colJ: parseDecimalSafe(row.colJ, 'colJ'),
      colK: parseDecimalSafe(row.colK, 'colK'),
      colL: parseDecimalSafe(row.colL, 'colL'),
      colM: parseDecimalSafe(row.colM, 'colM'),
      colN: parseDecimalSafe(row.colN, 'colN'),
      colO: parseDecimalSafe(row.colO, 'colO'),
      tagYear: parsedTagYear,
    }));

    const savedRows = await this.prisma.interAccount.createManyAndReturn({ data });
    for (const row of savedRows) {
      await syncAccountAmounts(this.prisma, {
        amountModel: this.prisma.interAccountAmount,
        parentKey: 'interAccountId',
        parentId: row.id,
        columns: INTER_ACCOUNT_COLUMNS,
        row,
      });
    }
    return { count: savedRows.length };
  }

  async createInterAccount(data: any) {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const saved = await this.prisma.interAccount.create({
      data: {
        colB: data.colB || null,
        colC: parseDecimalSafe(data.colC, 'colC'),
        colD: parseDecimalSafe(data.colD, 'colD'),
        colE: parseDecimalSafe(data.colE, 'colE'),
        colF: parseDecimalSafe(data.colF, 'colF'),
        colG: parseDecimalSafe(data.colG, 'colG'),
        colH: parseDecimalSafe(data.colH, 'colH'),
        colI: parseDecimalSafe(data.colI, 'colI'),
        colJ: parseDecimalSafe(data.colJ, 'colJ'),
        colK: parseDecimalSafe(data.colK, 'colK'),
        colL: parseDecimalSafe(data.colL, 'colL'),
        colM: parseDecimalSafe(data.colM, 'colM'),
        colN: parseDecimalSafe(data.colN, 'colN'),
        colO: parseDecimalSafe(data.colO, 'colO'),
        tagYear: parsedTagYear,
      },
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.interAccountAmount,
      parentKey: 'interAccountId',
      parentId: saved.id,
      columns: INTER_ACCOUNT_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async updateInterAccount(id: number, data: any) {
    const updateData: any = {};
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC?.toString() || null;
    if ('colD' in data) updateData.colD = data.colD?.toString() || null;
    if ('colE' in data) updateData.colE = data.colE?.toString() || null;
    if ('colF' in data) updateData.colF = data.colF?.toString() || null;
    if ('colG' in data) updateData.colG = data.colG?.toString() || null;
    if ('colH' in data) updateData.colH = data.colH?.toString() || null;
    if ('colI' in data) updateData.colI = data.colI?.toString() || null;
    if ('colJ' in data) updateData.colJ = data.colJ?.toString() || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colL' in data) updateData.colL = data.colL?.toString() || null;
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;

    const saved = await this.prisma.interAccount.update({
      where: { id },
      data: updateData
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.interAccountAmount,
      parentKey: 'interAccountId',
      parentId: saved.id,
      columns: INTER_ACCOUNT_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async deleteInterAccount(id: number) {
    return this.prisma.interAccount.delete({
      where: { id }
    });
  }

  /** The accounts this year's rows were posted against, in display order. */
  async getInterAccountAccounts(year?: number): Promise<AccountColumn[]> {
    return findAccountColumns(this.prisma, {
      amountModel: this.prisma.interAccountAmount,
      parentRelation: 'interAccount',
      year,
    });
  }

}
