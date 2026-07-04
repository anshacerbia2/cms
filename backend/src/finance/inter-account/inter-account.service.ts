import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';

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
    };
  }

  async getAllInterAccount(year?: number) {
    const where = year ? { tagYear: year } : {};
    
    const data = await this.prisma.interAccount.findMany({
      where,
      orderBy: { id: 'asc' }
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
      where: { id }
    });
    if (!item) return null;
    return this.mapDecimals(item);
  }

  async updateInterAccount(id: number, data: any) {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = data.colA || null;
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC ? Number(data.colC) : null;
    if ('colD' in data) updateData.colD = data.colD ? Number(data.colD) : null;
    if ('colE' in data) updateData.colE = data.colE ? Number(data.colE) : null;
    if ('colF' in data) updateData.colF = data.colF ? Number(data.colF) : null;
    if ('colG' in data) updateData.colG = data.colG ? Number(data.colG) : null;
    if ('colH' in data) updateData.colH = data.colH ? Number(data.colH) : null;
    if ('colI' in data) updateData.colI = data.colI ? Number(data.colI) : null;
    if ('colJ' in data) updateData.colJ = data.colJ ? Number(data.colJ) : null;
    if ('colK' in data) updateData.colK = data.colK ? Number(data.colK) : null;
    if ('colL' in data) updateData.colL = data.colL ? Number(data.colL) : null;
    if ('colM' in data) updateData.colM = data.colM ? Number(data.colM) : null;
    if ('colN' in data) updateData.colN = data.colN ? Number(data.colN) : null;
    if ('colO' in data) updateData.colO = data.colO ? Number(data.colO) : null;
    if ('colP' in data) updateData.colP = data.colP ? Number(data.colP) : null;

    return this.prisma.interAccount.update({
      where: { id },
      data: updateData
    });
  }

  async deleteInterAccount(id: number) {
    return this.prisma.interAccount.delete({
      where: { id }
    });
  }
}
