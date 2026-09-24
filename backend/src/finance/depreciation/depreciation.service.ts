import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseIntSafe, parseDateSafe, parseDecimalSafe } from '../../common/utils/parse.utils';

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

  async getAllDepreciations(year?: number) {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.depreciation.findMany({ 
      where,
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
    const parsedTagYear = parseIntSafe(data.tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    return this.prisma.depreciation.create({
      data: {
        type: data.type,
        colA: parseDateSafe(data.colA),
        colB: data.colB || null,
        colC: data.colC || null,
        colD: parseDecimalSafe(data.colD, 'colD'),
        colE: parseIntSafe(data.colE),
        colF: parseDecimalSafe(data.colF, 'colF'),
        colG: parseDecimalSafe(data.colG, 'colG'),
        colH: parseDecimalSafe(data.colH, 'colH'),
        colI: parseDecimalSafe(data.colI, 'colI'),
        colJ: parseDecimalSafe(data.colJ, 'colJ'),
        colK: parseDecimalSafe(data.colK, 'colK'),
        colL: parseDecimalSafe(data.colL, 'colL'),
        colM: parseDecimalSafe(data.colM, 'colM'),
        colN: parseDecimalSafe(data.colN, 'colN'),
        colO: parseDecimalSafe(data.colO, 'colO'),
        colP: parseDecimalSafe(data.colP, 'colP'),
        colQ: parseDecimalSafe(data.colQ, 'colQ'),
        colR: parseDecimalSafe(data.colR, 'colR'),
        colS: parseDecimalSafe(data.colS, 'colS'),
        colT: parseDecimalSafe(data.colT, 'colT'),
        colU: parseDecimalSafe(data.colU, 'colU'),
        tagYear: parsedTagYear,
      },
    });
  }

  async createBulkDepreciations(data: any[], tagYear: number) {
    const parsedTagYear = parseIntSafe(tagYear);
    if (!parsedTagYear) {
      throw new BadRequestException('tagYear is required and must be a valid number');
    }

    const records = data.map(row => ({
      type: row.type,
      colA: parseDateSafe(row.colA),
      colB: row.colB || null,
      colC: row.colC || null,
      colD: parseDecimalSafe(row.colD, 'colD'),
      colE: parseIntSafe(row.colE),
      colF: parseDecimalSafe(row.colF, 'colF'),
      colG: parseDecimalSafe(row.colG, 'colG'),
      colH: parseDecimalSafe(row.colH, 'colH'),
      colI: parseDecimalSafe(row.colI, 'colI'),
      colJ: parseDecimalSafe(row.colJ, 'colJ'),
      colK: parseDecimalSafe(row.colK, 'colK'),
      colL: parseDecimalSafe(row.colL, 'colL'),
      colM: parseDecimalSafe(row.colM, 'colM'),
      colN: parseDecimalSafe(row.colN, 'colN'),
      colO: parseDecimalSafe(row.colO, 'colO'),
      colP: parseDecimalSafe(row.colP, 'colP'),
      colQ: parseDecimalSafe(row.colQ, 'colQ'),
      colR: parseDecimalSafe(row.colR, 'colR'),
      colS: parseDecimalSafe(row.colS, 'colS'),
      colT: parseDecimalSafe(row.colT, 'colT'),
      colU: parseDecimalSafe(row.colU, 'colU'),
      tagYear: parsedTagYear,
    }));

    return this.prisma.depreciation.createMany({
      data: records,
    });
  }

  async getDepreciationById(id: number) {
    const item = await this.prisma.depreciation.findUnique({
      where: { id }
    });
    if (!item) return null;
    return {
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
    };
  }

  async updateDepreciation(id: number, data: any) {
    const updateData: any = {};
    if ('type' in data) updateData.type = data.type;
    if ('colA' in data) updateData.colA = parseDateSafe(data.colA);
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD?.toString() || null;
    if ('colE' in data) updateData.colE = parseIntSafe(data.colE);
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
    if ('colP' in data) updateData.colP = data.colP?.toString() || null;
    if ('colQ' in data) updateData.colQ = data.colQ?.toString() || null;
    if ('colR' in data) updateData.colR = data.colR?.toString() || null;
    if ('colS' in data) updateData.colS = data.colS?.toString() || null;
    if ('colT' in data) updateData.colT = data.colT?.toString() || null;
    if ('colU' in data) updateData.colU = data.colU?.toString() || null;

    return this.prisma.depreciation.update({
      where: { id },
      data: updateData
    });
  }

  async deleteDepreciation(id: number) {
    return this.prisma.depreciation.delete({
      where: { id }
    });
  }
}
