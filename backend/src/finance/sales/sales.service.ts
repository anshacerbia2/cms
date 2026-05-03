import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';

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

  async getAllSales(): Promise<any[]> {
    const data = await this.prisma.salesRecord.findMany({ orderBy: [{ id: 'asc' }] });
    return data.map(item => ({
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
    }));
  }

  async createBulkSales(payload: any[]): Promise<any> {
    const data = payload.map(row => ({
      colA: row.colA ? String(row.colA) : null,
      colB: row.colB ? String(row.colB) : null,
      colC: row.colC ? new Date(row.colC) : null,
      colD: row.colD ? parseInt(String(row.colD)) : null,
      colE: row.colE ? String(row.colE) : null,
      colF: row.colF ? String(row.colF) : null,
      colG: row.colG ? String(row.colG) : null,
      colH: row.colH || 0,
      colI: row.colI || 0,
      colJ: row.colJ || 0,
      colK: row.colK || 0,
      colL: row.colL ? new Date(row.colL) : null,
      colM: row.colM || 0,
      colN: row.colN || 0,
      colO: row.colO || 0,
      colP: row.colP || 0,
      colQ: row.colQ || 0,
      colR: row.colR || 0,
      colS: row.colS || 0,
      colT: row.colT || 0,
      colU: row.colU || 0,
      colV: row.colV || 0,
      colW: row.colW || 0,
      colX: row.colX || 0,
      colZ: row.colZ || 0,
      colAA: row.colAA || 0,
      colAB: row.colAB || 0,
      colAC: row.colAC || 0,
      colAD: row.colAD ? String(row.colAD) : null,
    }));

    return this.prisma.salesRecord.createMany({ data });
  }
}
