import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';

@Injectable()
export class PpnInOutService {
  constructor(private prisma: PrismaService) {}

  private mapDecimals(row: any) {
    return {
      ...row,
      colG: row.colG ? formatDecimal(row.colG) : null,
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
    
    const data = await this.prisma.ppnInOut.findMany({
      where,
      orderBy: {
        id: 'asc' // Sort by id instead of colA
      }
    });

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
        orderBy: { id: 'asc' },
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
}
