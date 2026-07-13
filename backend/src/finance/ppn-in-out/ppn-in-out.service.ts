import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe } from '../../common/utils/parse.utils';
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

  async getPpnInOutById(id: number) {
    const item = await this.prisma.ppnInOut.findUnique({
      where: { id }
    });
    if (!item) return null;
    return this.mapDecimals(item);
  }

  async createBulkPpnInOut(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const data = payload.map(row => ({
      colA: parseDateSafe(row.colA),
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE || null,
      colF: parseIntSafe(row.colF),
      colG: row.colG?.toString() || null,
      colH: row.colH?.toString() || null,
      colI: row.colI?.toString() || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colM: row.colM?.toString() || null,
      colN: row.colN?.toString() || null,
      colO: row.colO?.toString() || null,
      colP: row.colP || null,
      colQ: row.colQ || null,
      colR: row.colR || null,
      colS: row.colS || null,
      tagYear: parsedTagYear,
    }));

    return this.prisma.ppnInOut.createMany({ data });
  }

  async createPpnInOut(data: any) {
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    return this.prisma.ppnInOut.create({
      data: {
        colA: parseDateSafe(data.colA),
        colB: data.colB || null,
        colC: data.colC || null,
        colD: data.colD || null,
        colE: data.colE || null,
        colF: parseIntSafe(data.colF),
        colG: data.colG?.toString() || null,
        colH: data.colH?.toString() || null,
        colI: data.colI?.toString() || null,
        colJ: data.colJ?.toString() || null,
        colK: data.colK?.toString() || null,
        colM: data.colM?.toString() || null,
        colN: data.colN?.toString() || null,
        colO: data.colO?.toString() || null,
        colP: data.colP || null,
        colQ: data.colQ || null,
        colR: data.colR || null,
        colS: data.colS || null,
        tagYear: parsedTagYear,
      },
    });
  }

  async updatePpnInOut(id: number, data: any) {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = parseDateSafe(data.colA);
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD || null;
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = parseIntSafe(data.colF);
    if ('colG' in data) updateData.colG = data.colG?.toString() || null;
    if ('colH' in data) updateData.colH = data.colH?.toString() || null;
    if ('colI' in data) updateData.colI = data.colI?.toString() || null;
    if ('colJ' in data) updateData.colJ = data.colJ?.toString() || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;
    if ('colP' in data) updateData.colP = data.colP || null;
    if ('colQ' in data) updateData.colQ = data.colQ || null;
    if ('colR' in data) updateData.colR = data.colR || null;
    if ('colS' in data) updateData.colS = data.colS || null;

    return this.prisma.ppnInOut.update({
      where: { id },
      data: updateData
    });
  }

  async deletePpnInOut(id: number) {
    return this.prisma.ppnInOut.delete({
      where: { id }
    });
  }
}
