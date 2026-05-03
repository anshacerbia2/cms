import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';

@Injectable()
export class DepreciationService {
  constructor(private prisma: PrismaService) {}

  async getPaginatedDepreciations(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { colC: { contains: search, mode: 'insensitive' } }, // Asset Name
        { colB: { contains: search, mode: 'insensitive' } }, // Bank Ref
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.depreciation.findMany({ 
        where,
        skip, 
        take: limit, 
        orderBy: [{ id: 'asc' }] 
      }),
      this.prisma.depreciation.count({ where }),
    ]);

    return {
      data: data.map((item: any) => ({
        ...item,
        id: Number(item.id),
        colD: formatDecimal(item.colD),
        colF: formatDecimal(item.colF),
        colG: formatDecimal(item.colG),
        colH: formatDecimal(item.colH),
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        colR: formatDecimal(item.colR),
        colS: formatDecimal(item.colS),
        colT: formatDecimal(item.colT),
        colU: formatDecimal(item.colU),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllDepreciations() {
    const data = await this.prisma.depreciation.findMany({ 
      orderBy: [{ id: 'asc' }] 
    });

    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      colD: formatDecimal(item.colD),
      colF: formatDecimal(item.colF),
      colG: formatDecimal(item.colG),
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
    }));
  }

  async createDepreciation(data: any) {
    return this.prisma.depreciation.create({
      data: {
        ...data,
        colA: data.colA ? new Date(data.colA) : null,
        colD: data.colD?.toString() || null,
        colF: data.colF?.toString() || null,
        colG: data.colG?.toString() || null,
        colH: data.colH?.toString() || null,
        colI: data.colI?.toString() || null,
        colJ: data.colJ?.toString() || null,
        colK: data.colK?.toString() || null,
        colL: data.colL?.toString() || null,
        colM: data.colM?.toString() || null,
        colN: data.colN?.toString() || null,
        colO: data.colO?.toString() || null,
        colP: data.colP?.toString() || null,
        colQ: data.colQ?.toString() || null,
        colR: data.colR?.toString() || null,
        colS: data.colS?.toString() || null,
        colT: data.colT?.toString() || null,
        colU: data.colU?.toString() || null,
      },
    });
  }

  async createBulkDepreciations(data: any[]) {
    const records = data.map(row => ({
      colA: row.colA ? new Date(row.colA) : null,
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD?.toString() || null,
      colE: row.colE ? Number(row.colE) : null,
      colF: row.colF?.toString() || null,
      colG: row.colG?.toString() || null,
      colH: row.colH?.toString() || null,
      colI: row.colI?.toString() || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colL: row.colL?.toString() || null,
      colM: row.colM?.toString() || null,
      colN: row.colN?.toString() || null,
      colO: row.colO?.toString() || null,
      colP: row.colP?.toString() || null,
      colQ: row.colQ?.toString() || null,
      colR: row.colR?.toString() || null,
      colS: row.colS?.toString() || null,
      colT: row.colT?.toString() || null,
      colU: row.colU?.toString() || null,
    }));

    return this.prisma.depreciation.createMany({
      data: records,
    });
  }
}
