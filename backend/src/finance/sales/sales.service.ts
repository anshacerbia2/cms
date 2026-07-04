import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';

const parseDecimal = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const parseIntSafe = (val: any) => {
  if (!val) return null;
  const parsed = parseInt(String(val));
  return isNaN(parsed) ? null : parsed;
};

const parseDateSafe = (val: any) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

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
    const data = payload.map(row => ({
      colA: row.colA ? String(row.colA) : null,
      colB: row.colB ? String(row.colB) : null,
      colC: parseDateSafe(row.colC),
      colD: parseIntSafe(row.colD),
      colE: row.colE ? String(row.colE) : null,
      colF: row.colF ? String(row.colF) : null,
      colG: row.colG ? String(row.colG) : null,
      colH: parseDecimal(row.colH),
      colI: parseDecimal(row.colI),
      colJ: parseDecimal(row.colJ),
      colK: parseDecimal(row.colK),
      colL: parseDateSafe(row.colL),
      colM: parseDecimal(row.colM),
      colN: parseDecimal(row.colN),
      colO: parseDecimal(row.colO),
      colP: parseDecimal(row.colP),
      colQ: parseDecimal(row.colQ),
      colR: parseDecimal(row.colR),
      colS: parseDecimal(row.colS),
      colT: parseDecimal(row.colT),
      colU: parseDecimal(row.colU),
      colV: parseDecimal(row.colV),
      colW: parseDecimal(row.colW),
      colX: parseDecimal(row.colX),
      colZ: parseDecimal(row.colZ),
      colAA: parseDecimal(row.colAA),
      colAB: parseDecimal(row.colAB),
      colAC: parseDecimal(row.colAC),
      colAD: row.colAD ? String(row.colAD) : null,
      tagYear: tagYear,
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
    if ('colA' in data) updateData.colA = data.colA ? String(data.colA) : null;
    if ('colB' in data) updateData.colB = data.colB ? String(data.colB) : null;
    if ('colC' in data) updateData.colC = parseDateSafe(data.colC);
    if ('colD' in data) updateData.colD = parseIntSafe(data.colD);
    if ('colE' in data) updateData.colE = data.colE ? String(data.colE) : null;
    if ('colF' in data) updateData.colF = data.colF ? String(data.colF) : null;
    if ('colG' in data) updateData.colG = data.colG ? String(data.colG) : null;
    if ('colH' in data) updateData.colH = parseDecimal(data.colH);
    if ('colI' in data) updateData.colI = parseDecimal(data.colI);
    if ('colJ' in data) updateData.colJ = parseDecimal(data.colJ);
    if ('colK' in data) updateData.colK = parseDecimal(data.colK);
    if ('colL' in data) updateData.colL = parseDateSafe(data.colL);
    if ('colM' in data) updateData.colM = parseDecimal(data.colM);
    if ('colN' in data) updateData.colN = parseDecimal(data.colN);
    if ('colO' in data) updateData.colO = parseDecimal(data.colO);
    if ('colP' in data) updateData.colP = parseDecimal(data.colP);
    if ('colQ' in data) updateData.colQ = parseDecimal(data.colQ);
    if ('colR' in data) updateData.colR = parseDecimal(data.colR);
    if ('colS' in data) updateData.colS = parseDecimal(data.colS);
    if ('colT' in data) updateData.colT = parseDecimal(data.colT);
    if ('colU' in data) updateData.colU = parseDecimal(data.colU);
    if ('colV' in data) updateData.colV = parseDecimal(data.colV);
    if ('colW' in data) updateData.colW = parseDecimal(data.colW);
    if ('colX' in data) updateData.colX = parseDecimal(data.colX);
    if ('colZ' in data) updateData.colZ = parseDecimal(data.colZ);
    if ('colAA' in data) updateData.colAA = parseDecimal(data.colAA);
    if ('colAB' in data) updateData.colAB = parseDecimal(data.colAB);
    if ('colAC' in data) updateData.colAC = parseDecimal(data.colAC);
    if ('colAD' in data) updateData.colAD = data.colAD ? String(data.colAD) : null;

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
