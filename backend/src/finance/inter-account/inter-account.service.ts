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
}
