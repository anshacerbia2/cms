import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import {
  syncAccountAmounts, ACCOUNT_RECEIVABLE_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';
import { parseIntSafe, parseDecimalSafe } from '../../common/utils/parse.utils';

@Injectable()
export class AccountReceivableService {
  constructor(private prisma: PrismaService) {}

  async getAR(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        skip,
        take: limit,
        orderBy: [{ id: 'asc' }],
        include: { amounts: { select: { internalAccountId: true, amount: true } } },
      }),
      this.prisma.accountReceivable.count(),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        id: Number(item.id),
        // The same figures the fixed columns carry, keyed by account.
        amounts: serializeAmounts(item.amounts),
        colF: formatDecimal(item.colF),
        colG: formatDecimal(item.colG),
        colH: formatDecimal(item.colH),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colR: formatDecimal(item.colR),
        colS: formatDecimal(item.colS),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAR(year?: number): Promise<any[]> {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.accountReceivable.findMany({
      where,
      orderBy: [{ id: 'asc' }],
      include: { amounts: { select: { internalAccountId: true, amount: true } } },
    });
    return data.map(item => ({
      ...item,
      id: Number(item.id),
      // The same figures the fixed columns carry, keyed by account.
      amounts: serializeAmounts(item.amounts),
      colF: formatDecimal(item.colF),
      colG: formatDecimal(item.colG),
      colH: formatDecimal(item.colH),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
    }));
  }

  async createAR(data: any): Promise<any> {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const saved = await this.prisma.accountReceivable.create({
      data: {
        colB: data.colB || null,
        colC: data.colC || null,
        colD: data.colD || null,
        colE: data.colE || null,
        colF: parseDecimalSafe(data.colF, 'colF'),
        colG: parseDecimalSafe(data.colG, 'colG'),
        colH: parseDecimalSafe(data.colH, 'colH'),
        colJ: parseDecimalSafe(data.colJ, 'colJ'),
        colK: parseDecimalSafe(data.colK, 'colK'),
        colL: parseDecimalSafe(data.colL, 'colL'),
        colM: parseDecimalSafe(data.colM, 'colM'),
        colN: parseDecimalSafe(data.colN, 'colN'),
        colO: parseDecimalSafe(data.colO, 'colO'),
        colP: parseDecimalSafe(data.colP, 'colP'),
        colR: parseDecimalSafe(data.colR, 'colR'),
        colS: parseDecimalSafe(data.colS, 'colS'),
        tagYear: parsedTagYear,
      },
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.accountReceivableAmount,
      parentKey: 'accountReceivableId',
      parentId: saved.id,
      columns: ACCOUNT_RECEIVABLE_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async updateAR(id: number, data: any): Promise<any> {
    const updateData: any = {};
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD || null;
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = data.colF?.toString() || null;
    if ('colG' in data) updateData.colG = data.colG?.toString() || null;
    if ('colH' in data) updateData.colH = data.colH?.toString() || null;
    if ('colJ' in data) updateData.colJ = data.colJ?.toString() || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colL' in data) updateData.colL = data.colL?.toString() || null;
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;
    if ('colP' in data) updateData.colP = data.colP?.toString() || null;
    if ('colR' in data) updateData.colR = data.colR?.toString() || null;
    if ('colS' in data) updateData.colS = data.colS?.toString() || null;

    const saved = await this.prisma.accountReceivable.update({
      where: { id },
      data: updateData,
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.accountReceivableAmount,
      parentKey: 'accountReceivableId',
      parentId: saved.id,
      columns: ACCOUNT_RECEIVABLE_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async deleteAR(id: number): Promise<any> {
    return this.prisma.accountReceivable.delete({
      where: { id },
    });
  }

  async createBulkAR(data: any[], tagYear: number) {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const records = data.map(row => ({
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE || null,
      colF: parseDecimalSafe(row.colF, 'colF'),
      colG: parseDecimalSafe(row.colG, 'colG'),
      colH: parseDecimalSafe(row.colH, 'colH'),
      colJ: parseDecimalSafe(row.colJ, 'colJ'),
      colK: parseDecimalSafe(row.colK, 'colK'),
      colL: parseDecimalSafe(row.colL, 'colL'),
      colM: parseDecimalSafe(row.colM, 'colM'),
      colN: parseDecimalSafe(row.colN, 'colN'),
      colO: parseDecimalSafe(row.colO, 'colO'),
      colP: parseDecimalSafe(row.colP, 'colP'),
      colR: parseDecimalSafe(row.colR, 'colR'),
      colS: parseDecimalSafe(row.colS, 'colS'),
      tagYear: parsedTagYear,
    }));

    const savedRows = await this.prisma.accountReceivable.createManyAndReturn({ data: records });
    for (const row of savedRows) {
      await syncAccountAmounts(this.prisma, {
        amountModel: this.prisma.accountReceivableAmount,
        parentKey: 'accountReceivableId',
        parentId: row.id,
        columns: ACCOUNT_RECEIVABLE_COLUMNS,
        row,
      });
    }
    return { count: savedRows.length };
  }

  /** The accounts this year's rows were posted against, in display order. */
  async getARAccounts(year?: number): Promise<AccountColumn[]> {
    return findAccountColumns(this.prisma, {
      amountModel: this.prisma.accountReceivableAmount,
      parentRelation: 'accountReceivable',
      year,
    });
  }

}
