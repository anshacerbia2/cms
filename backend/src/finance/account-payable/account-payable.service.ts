import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import {
  syncAccountAmounts, ACCOUNT_PAYABLE_COLUMNS, findAccountColumns, serializeAmounts, type AccountColumn } from '../common/account-columns';
import { parseIntSafe, parseDateSafe } from '../../common/utils/parse.utils';

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
        colE: data.colE?.toString() || null,   // EOY IDR
        colF: data.colF?.toString() || null,   // EOY USD
        colG: data.colG?.toString() || null,   // col G
        colH: data.colH || null,               // col H (string)
        colI: data.colI || null,               // col I (string)
        colK: data.colK?.toString() || null,   // BCA Shardjo
        colL: data.colL?.toString() || null,   // BCA Juanda
        colM: data.colM?.toString() || null,   // Mandiri Mid Plaza
        colN: data.colN?.toString() || null,   // BTN
        colO: data.colO?.toString() || null,   // BRI Shardjo
        colP: data.colP?.toString() || null,   // BRI Tebet
        colQ: data.colQ?.toString() || null,   // Cash IDR
        colR: data.colR?.toString() || null,   // Non CB
        colS: data.colS?.toString() || null,   // AP In and Out
        colU: data.colU?.toString() || null,   // Outstanding IDR
        colV: data.colV?.toString() || null,   // Outstanding USD
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
    if ('colE' in data) updateData.colE = data.colE?.toString() || null;
    if ('colF' in data) updateData.colF = data.colF?.toString() || null;
    if ('colG' in data) updateData.colG = data.colG?.toString() || null;
    if ('colH' in data) updateData.colH = data.colH || null;
    if ('colI' in data) updateData.colI = data.colI || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colL' in data) updateData.colL = data.colL?.toString() || null;
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;
    if ('colP' in data) updateData.colP = data.colP?.toString() || null;
    if ('colQ' in data) updateData.colQ = data.colQ?.toString() || null;
    if ('colR' in data) updateData.colR = data.colR?.toString() || null;
    if ('colS' in data) updateData.colS = data.colS?.toString() || null;
    if ('colU' in data) updateData.colU = data.colU?.toString() || null;
    if ('colV' in data) updateData.colV = data.colV?.toString() || null;

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
      colE: row.colE?.toString() || null,   // EOY IDR
      colF: row.colF?.toString() || null,   // EOY USD
      colG: row.colG?.toString() || null,   // col G
      colH: row.colH || null,               // col H (string)
      colI: row.colI || null,               // col I (string)
      colK: row.colK?.toString() || null,   // BCA Shardjo
      colL: row.colL?.toString() || null,   // BCA Juanda
      colM: row.colM?.toString() || null,   // Mandiri Mid Plaza
      colN: row.colN?.toString() || null,   // BTN
      colO: row.colO?.toString() || null,   // BRI Shardjo
      colP: row.colP?.toString() || null,   // BRI Tebet
      colQ: row.colQ?.toString() || null,   // Cash IDR
      colR: row.colR?.toString() || null,   // Non CB
      colS: row.colS?.toString() || null,   // AP In and Out
      colU: row.colU?.toString() || null,   // Outstanding IDR
      colV: row.colV?.toString() || null,   // Outstanding USD
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
