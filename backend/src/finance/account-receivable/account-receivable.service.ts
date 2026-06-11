import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';

@Injectable()
export class AccountReceivableService {
  constructor(private prisma: PrismaService) {}

  async getAR(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.accountReceivable.count(),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        id: Number(item.id),
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
    const data = await this.prisma.accountReceivable.findMany({ where, orderBy: [{ id: 'asc' }] });
    return data.map(item => ({
      ...item,
      id: Number(item.id),
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
    return this.prisma.accountReceivable.create({
      data: {
        ...data,
        colF: data.colF?.toString() || null,
        colG: data.colG?.toString() || null,
        colH: data.colH?.toString() || null,
        colJ: data.colJ?.toString() || null,
        colK: data.colK?.toString() || null,
        colL: data.colL?.toString() || null,
        colM: data.colM?.toString() || null,
        colN: data.colN?.toString() || null,
        colO: data.colO?.toString() || null,
        colP: data.colP?.toString() || null,
        colR: data.colR?.toString() || null,
        colS: data.colS?.toString() || null,
      },
    });
  }

  async createBulkAR(data: any[], tagYear: number) {
    const records = data.map(row => ({
      colA: row.colA || null,
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE || null,
      colF: row.colF?.toString() || null,
      colG: row.colG?.toString() || null,
      colH: row.colH?.toString() || null,
      colI: row.colI || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colL: row.colL?.toString() || null,
      colM: row.colM?.toString() || null,
      colN: row.colN?.toString() || null,
      colO: row.colO?.toString() || null,
      colP: row.colP?.toString() || null,
      colQ: row.colQ || null,
      colR: row.colR?.toString() || null,
      colS: row.colS?.toString() || null,
      tagYear: tagYear,
    }));

    return this.prisma.accountReceivable.createMany({
      data: records,
    });
  }
}
