import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import {
  syncAccountAmounts, ACCOUNT_PAYABLE_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';
import { parseIntSafe, parseDateSafe, parseDecimalSafe } from '../../common/utils/parse.utils';

@Injectable()
export class AccountPayableService {
  constructor(private prisma: PrismaService) {}

  async getPaginatedAccountPayables(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.accountPayable.findMany({
        skip,
        take: limit,
        orderBy: [{ id: 'asc' }],
        include: { amounts: { select: { internalAccountId: true, amount: true } } },
      }),
      this.prisma.accountPayable.count(),
    ]);

    return {
      data: data.map((item: any) => ({
        ...item,
        id: Number(item.id),
        // The same figures the fixed columns carry, keyed by account.
        amounts: serializeAmounts(item.amounts),
        colB: item.colB ? Number(item.colB) : null,
        colE: formatDecimal(item.colE),   // EOY IDR
        colF: formatDecimal(item.colF),   // EOY USD
        colG: formatDecimal(item.colG),   // col G
        // colH, colI, colJ are strings
        colK: formatDecimal(item.colK),   // BCA Shardjo
        colL: formatDecimal(item.colL),   // BCA Juanda
        colM: formatDecimal(item.colM),   // Mandiri Mid Plaza
        colN: formatDecimal(item.colN),   // BTN
        colO: formatDecimal(item.colO),   // BRI Shardjo
        colP: formatDecimal(item.colP),   // BRI Tebet
        colQ: formatDecimal(item.colQ),   // Cash IDR
        colR: formatDecimal(item.colR),   // Non CB
        colS: formatDecimal(item.colS),   // AP In and Out
        // colT is string
        colU: formatDecimal(item.colU),   // Outstanding IDR
        colV: formatDecimal(item.colV),   // Outstanding USD
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAccountPayables(year?: number): Promise<any[]> {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.accountPayable.findMany({
      where,
      orderBy: [{ id: 'asc' }],
      include: { amounts: { select: { internalAccountId: true, amount: true } } },
    });
    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      // The same figures the fixed columns carry, keyed by account.
      amounts: serializeAmounts(item.amounts),
      colB: item.colB ? Number(item.colB) : null,
      colE: formatDecimal(item.colE),   // EOY IDR
      colF: formatDecimal(item.colF),   // EOY USD
      colG: formatDecimal(item.colG),   // col G
      // colH, colI, colJ are strings
      colK: formatDecimal(item.colK),   // BCA Shardjo
      colL: formatDecimal(item.colL),   // BCA Juanda
      colM: formatDecimal(item.colM),   // Mandiri Mid Plaza
      colN: formatDecimal(item.colN),   // BTN
      colO: formatDecimal(item.colO),   // BRI Shardjo
      colP: formatDecimal(item.colP),   // BRI Tebet
      colQ: formatDecimal(item.colQ),   // Cash IDR
      colR: formatDecimal(item.colR),   // Non CB
      colS: formatDecimal(item.colS),   // AP In and Out
      // colT is string
      colU: formatDecimal(item.colU),   // Outstanding IDR
      colV: formatDecimal(item.colV),   // Outstanding USD
    }));
  }

  async createAccountPayable(data: any) {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const saved = await this.prisma.accountPayable.create({
      data: {
        colA: data.colA || null,
        colB: parseIntSafe(data.colB),
        colC: data.colC || null,
        colD: data.colD || null,
        colE: parseDecimalSafe(data.colE, 'colE'),   // EOY IDR
        colF: parseDecimalSafe(data.colF, 'colF'),   // EOY USD
        colG: parseDecimalSafe(data.colG, 'colG'),   // col G
        colH: data.colH || null,               // col H (string)
        colI: data.colI || null,               // col I (string)
        colK: parseDecimalSafe(data.colK, 'colK'),   // BCA Shardjo
        colL: parseDecimalSafe(data.colL, 'colL'),   // BCA Juanda
        colM: parseDecimalSafe(data.colM, 'colM'),   // Mandiri Mid Plaza
        colN: parseDecimalSafe(data.colN, 'colN'),   // BTN
        colO: parseDecimalSafe(data.colO, 'colO'),   // BRI Shardjo
        colP: parseDecimalSafe(data.colP, 'colP'),   // BRI Tebet
        colQ: parseDecimalSafe(data.colQ, 'colQ'),   // Cash IDR
        colR: parseDecimalSafe(data.colR, 'colR'),   // Non CB
        colS: parseDecimalSafe(data.colS, 'colS'),   // AP In and Out
        colU: parseDecimalSafe(data.colU, 'colU'),   // Outstanding IDR
        colV: parseDecimalSafe(data.colV, 'colV'),   // Outstanding USD
        tagYear: parsedTagYear,
      },
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.accountPayableAmount,
      parentKey: 'accountPayableId',
      parentId: saved.id,
      columns: ACCOUNT_PAYABLE_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async updateAccountPayable(id: number, data: any) {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = data.colA || null;
    if ('colB' in data) updateData.colB = parseIntSafe(data.colB);
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD || null;
    if ('colE' in data) updateData.colE = parseDecimalSafe(data.colE, 'colE');
    if ('colF' in data) updateData.colF = parseDecimalSafe(data.colF, 'colF');
    if ('colG' in data) updateData.colG = parseDecimalSafe(data.colG, 'colG');
    if ('colH' in data) updateData.colH = data.colH || null;
    if ('colI' in data) updateData.colI = data.colI || null;
    if ('colK' in data) updateData.colK = parseDecimalSafe(data.colK, 'colK');
    if ('colL' in data) updateData.colL = parseDecimalSafe(data.colL, 'colL');
    if ('colM' in data) updateData.colM = parseDecimalSafe(data.colM, 'colM');
    if ('colN' in data) updateData.colN = parseDecimalSafe(data.colN, 'colN');
    if ('colO' in data) updateData.colO = parseDecimalSafe(data.colO, 'colO');
    if ('colP' in data) updateData.colP = parseDecimalSafe(data.colP, 'colP');
    if ('colQ' in data) updateData.colQ = parseDecimalSafe(data.colQ, 'colQ');
    if ('colR' in data) updateData.colR = parseDecimalSafe(data.colR, 'colR');
    if ('colS' in data) updateData.colS = parseDecimalSafe(data.colS, 'colS');
    if ('colU' in data) updateData.colU = parseDecimalSafe(data.colU, 'colU');
    if ('colV' in data) updateData.colV = parseDecimalSafe(data.colV, 'colV');

    const saved = await this.prisma.accountPayable.update({
      where: { id },
      data: updateData,
    });
    await syncAccountAmounts(this.prisma, {
      amountModel: this.prisma.accountPayableAmount,
      parentKey: 'accountPayableId',
      parentId: saved.id,
      columns: ACCOUNT_PAYABLE_COLUMNS,
      row: saved,
    });
    return saved;
  }

  async deleteAccountPayable(id: number) {
    return this.prisma.accountPayable.delete({
      where: { id },
    });
  }



  async createBulkAccountPayables(data: any[], tagYear: number) {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const records = data.map(row => ({
      colA: row.colA || null,
      colB: parseIntSafe(row.colB),
      colC: row.colC || null,
      colD: row.colD || null,
      colE: parseDecimalSafe(row.colE, 'colE'),   // EOY IDR
      colF: parseDecimalSafe(row.colF, 'colF'),   // EOY USD
      colG: parseDecimalSafe(row.colG, 'colG'),   // col G
      colH: row.colH || null,               // col H (string)
      colI: row.colI || null,               // col I (string)
      colK: parseDecimalSafe(row.colK, 'colK'),   // BCA Shardjo
      colL: parseDecimalSafe(row.colL, 'colL'),   // BCA Juanda
      colM: parseDecimalSafe(row.colM, 'colM'),   // Mandiri Mid Plaza
      colN: parseDecimalSafe(row.colN, 'colN'),   // BTN
      colO: parseDecimalSafe(row.colO, 'colO'),   // BRI Shardjo
      colP: parseDecimalSafe(row.colP, 'colP'),   // BRI Tebet
      colQ: parseDecimalSafe(row.colQ, 'colQ'),   // Cash IDR
      colR: parseDecimalSafe(row.colR, 'colR'),   // Non CB
      colS: parseDecimalSafe(row.colS, 'colS'),   // AP In and Out
      colU: parseDecimalSafe(row.colU, 'colU'),   // Outstanding IDR
      colV: parseDecimalSafe(row.colV, 'colV'),   // Outstanding USD
      tagYear: parsedTagYear,
    }));
    const savedRows = await this.prisma.accountPayable.createManyAndReturn({ data: records });
    for (const row of savedRows) {
      await syncAccountAmounts(this.prisma, {
        amountModel: this.prisma.accountPayableAmount,
        parentKey: 'accountPayableId',
        parentId: row.id,
        columns: ACCOUNT_PAYABLE_COLUMNS,
        row,
      });
    }
    return { count: savedRows.length };
  }



  /** The accounts this year's rows were posted against, in display order. */
  async getAPAccounts(year?: number): Promise<AccountColumn[]> {
    return findAccountColumns(this.prisma, {
      amountModel: this.prisma.accountPayableAmount,
      parentRelation: 'accountPayable',
      year,
    });
  }

}
