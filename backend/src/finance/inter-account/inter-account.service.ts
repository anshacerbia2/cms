import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe } from '../../common/utils/parse.utils';

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

  async createBulkInterAccount(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const data = payload.map(row => ({
      colB: row.colB || null,
      colC: row.colC?.toString() || null,
      colD: row.colD?.toString() || null,
      colE: row.colE?.toString() || null,
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
      tagYear: parsedTagYear,
    }));

    return this.prisma.interAccount.createMany({ data });
  }

  async createInterAccount(data: any) {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    return this.prisma.interAccount.create({
      data: {
        colB: data.colB || null,
        colC: data.colC?.toString() || null,
        colD: data.colD?.toString() || null,
        colE: data.colE?.toString() || null,
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
        tagYear: parsedTagYear,
      },
    });
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
