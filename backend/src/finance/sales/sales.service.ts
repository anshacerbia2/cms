import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe } from '../../common/utils/parse.utils';



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

  async getAllSales(year?: number): Promise<any[]> {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.salesRecord.findMany({ where, orderBy: [{ id: 'asc' }] });
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

  async createBulkSales(payload: any[], tagYear: number): Promise<any> {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const data = payload.map(row => ({
      colA: row.colA || null,
      colB: row.colB || null,
      colC: parseDateSafe(row.colC),
      colD: parseIntSafe(row.colD),
      colE: row.colE || null,
      colF: row.colF || null,
      colG: row.colG || null,
      colH: row.colH?.toString() || null,
      colI: row.colI?.toString() || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colL: parseDateSafe(row.colL),
      colM: row.colM?.toString() || null,
      colN: row.colN?.toString() || null,
      colO: row.colO?.toString() || null,
      colP: row.colP?.toString() || null,
      colQ: row.colQ?.toString() || null,
      colR: row.colR?.toString() || null,
      colS: row.colS?.toString() || null,
      colT: row.colT?.toString() || null,
      colU: row.colU?.toString() || null,
      colV: row.colV?.toString() || null,
      colW: row.colW?.toString() || null,
      colX: row.colX?.toString() || null,
      colZ: row.colZ?.toString() || null,
      colAA: row.colAA?.toString() || null,
      colAB: row.colAB?.toString() || null,
      colAC: row.colAC?.toString() || null,
      colAD: row.colAD || null,
      tagYear: parsedTagYear,
    }));

    return this.prisma.salesRecord.createMany({ data });
  }

  async getSalesById(id: number): Promise<any> {
    const item = await this.prisma.salesRecord.findUnique({
      where: { id }
    });
    if (!item) return null;
    return {
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
    };
  }

  async updateSales(id: number, data: any): Promise<any> {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = data.colA || null;
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = parseDateSafe(data.colC);
    if ('colD' in data) updateData.colD = parseIntSafe(data.colD);
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = data.colF || null;
    if ('colG' in data) updateData.colG = data.colG || null;
    if ('colH' in data) updateData.colH = data.colH?.toString() || null;
    if ('colI' in data) updateData.colI = data.colI?.toString() || null;
    if ('colJ' in data) updateData.colJ = data.colJ?.toString() || null;
    if ('colK' in data) updateData.colK = data.colK?.toString() || null;
    if ('colL' in data) updateData.colL = parseDateSafe(data.colL);
    if ('colM' in data) updateData.colM = data.colM?.toString() || null;
    if ('colN' in data) updateData.colN = data.colN?.toString() || null;
    if ('colO' in data) updateData.colO = data.colO?.toString() || null;
    if ('colP' in data) updateData.colP = data.colP?.toString() || null;
    if ('colQ' in data) updateData.colQ = data.colQ?.toString() || null;
    if ('colR' in data) updateData.colR = data.colR?.toString() || null;
    if ('colS' in data) updateData.colS = data.colS?.toString() || null;
    if ('colT' in data) updateData.colT = data.colT?.toString() || null;
    if ('colU' in data) updateData.colU = data.colU?.toString() || null;
    if ('colV' in data) updateData.colV = data.colV?.toString() || null;
    if ('colW' in data) updateData.colW = data.colW?.toString() || null;
    if ('colX' in data) updateData.colX = data.colX?.toString() || null;
    if ('colZ' in data) updateData.colZ = data.colZ?.toString() || null;
    if ('colAA' in data) updateData.colAA = data.colAA?.toString() || null;
    if ('colAB' in data) updateData.colAB = data.colAB?.toString() || null;
    if ('colAC' in data) updateData.colAC = data.colAC?.toString() || null;
    if ('colAD' in data) updateData.colAD = data.colAD || null;

    return this.prisma.salesRecord.update({
      where: { id },
      data: updateData
    });
  }

  async deleteSales(id: number): Promise<any> {
    return this.prisma.salesRecord.delete({
      where: { id }
    });
  }
}
