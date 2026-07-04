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

  async getPpnInOutById(id: number) {
    const item = await this.prisma.ppnInOut.findUnique({
      where: { id }
    });
    if (!item) return null;
    return this.mapDecimals(item);
  }

  async updatePpnInOut(id: number, data: any) {
    const updateData: any = {};
    if ('colA' in data) updateData.colA = data.colA ? new Date(data.colA) : null;
    if ('colB' in data) updateData.colB = data.colB || null;
    if ('colC' in data) updateData.colC = data.colC || null;
    if ('colD' in data) updateData.colD = data.colD || null;
    if ('colE' in data) updateData.colE = data.colE || null;
    if ('colF' in data) updateData.colF = data.colF || null;
    if ('colG' in data) updateData.colG = data.colG ? Number(data.colG) : null;
    if ('colH' in data) updateData.colH = data.colH ? Number(data.colH) : null;
    if ('colI' in data) updateData.colI = data.colI ? Number(data.colI) : null;
    if ('colJ' in data) updateData.colJ = data.colJ ? Number(data.colJ) : null;
    if ('colK' in data) updateData.colK = data.colK ? Number(data.colK) : null;
    if ('colL' in data) updateData.colL = data.colL || null;
    if ('colM' in data) updateData.colM = data.colM ? Number(data.colM) : null;
    if ('colN' in data) updateData.colN = data.colN ? Number(data.colN) : null;
    if ('colO' in data) updateData.colO = data.colO ? Number(data.colO) : null;
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
