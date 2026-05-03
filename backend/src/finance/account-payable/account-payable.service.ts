import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';

@Injectable()
export class AccountPayableService {
  constructor(private prisma: PrismaService) {}

  async getPaginatedAccountPayables(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.accountPayable.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.accountPayable.count(),
    ]);

    return {
      data: data.map((item: any) => ({
        ...item,
        id: Number(item.id),
        colB: item.colB ? Number(item.colB) : null,
        colE: formatDecimal(item.colE),
        // colF, colG, colH are strings
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        // colR is string
        colS: formatDecimal(item.colS),
        colT: formatDecimal(item.colT),
        colU: formatDecimal(item.colU),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAccountPayables(): Promise<any[]> {
    const data = await this.prisma.accountPayable.findMany({ orderBy: [{ id: 'asc' }] });
    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      colB: item.colB ? Number(item.colB) : null,
      colE: formatDecimal(item.colE),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colS: formatDecimal(item.colS),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
    }));
  }

  async getPaginatedTaxLedger(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || "";
    const type = query.type; // Optional: WAPU or NON_WAPU

    const where: any = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { colC: { contains: search, mode: 'insensitive' } }, // No Faktur
        { colD: { contains: search, mode: 'insensitive' } }, // Client
        { colE: { contains: search, mode: 'insensitive' } }, // Reference
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.taxLedger.findMany({ 
        where,
        skip, 
        take: limit, 
        orderBy: [{ id: 'asc' }] 
      }),
      this.prisma.taxLedger.count({ where }),
    ]);

    return {
      data: data.map((item: any) => ({
        ...item,
        id: Number(item.id),
        colF: item.colF ? Number(item.colF) : null,
        colH: formatDecimal(item.colH),
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllTaxLedger(query: any) {
    const type = query.type;
    const where: any = {};
    if (type) where.type = type;

    const data = await this.prisma.taxLedger.findMany({ 
      where,
      orderBy: [{ id: 'asc' }] 
    });

    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      colF: item.colF ? Number(item.colF) : null,
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
    }));
  }

  async createAccountPayable(data: any) {
    return this.prisma.accountPayable.create({
      data: {
        ...data,
        colB: data.colB ? Number(data.colB) : null,
        colE: data.colE?.toString() || null,
        colI: data.colI?.toString() || null,
        colJ: data.colJ?.toString() || null,
        colK: data.colK?.toString() || null,
        colL: data.colL?.toString() || null,
        colM: data.colM?.toString() || null,
        colN: data.colN?.toString() || null,
        colO: data.colO?.toString() || null,
        colP: data.colP?.toString() || null,
        colQ: data.colQ?.toString() || null,
        colS: data.colS?.toString() || null,
        colT: data.colT?.toString() || null,
        colU: data.colU?.toString() || null,
      },
    });
  }

  async createTaxLedger(data: any) {
    return this.prisma.taxLedger.create({
      data: {
        ...data,
        colA: data.colA ? new Date(data.colA) : null,
        colF: data.colF ? Number(data.colF) : null,
        colH: data.colH?.toString() || null,
        colI: data.colI?.toString() || null,
        colJ: data.colJ?.toString() || null,
        colK: data.colK?.toString() || null,
      },
    });
  }

  async createBulkAccountPayables(data: any[]) {
    const records = data.map(row => ({
      colA: row.colA || null,
      colB: row.colB ? Number(row.colB) : null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE?.toString() || null,
      colF: row.colF || null,
      colG: row.colG || null,
      colH: row.colH || null,
      colI: row.colI?.toString() || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colL: row.colL?.toString() || null,
      colM: row.colM?.toString() || null,
      colN: row.colN?.toString() || null,
      colO: row.colO?.toString() || null,
      colP: row.colP?.toString() || null,
      colQ: row.colQ?.toString() || null,
      colR: row.colR || null,
      colS: row.colS?.toString() || null,
      colT: row.colT?.toString() || null,
      colU: row.colU?.toString() || null,
    }));
    return this.prisma.accountPayable.createMany({
      data: records,
    });
  }

  async createBulkTaxLedgers(data: any[]) {
    const records = data.map(row => ({
      type: row.type,
      colA: row.colA ? new Date(row.colA) : null,
      colB: row.colB || null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE || null,
      colF: row.colF ? Number(row.colF) : null,
      colG: row.colG || null,
      colH: row.colH?.toString() || null,
      colI: row.colI?.toString() || null,
      colJ: row.colJ?.toString() || null,
      colK: row.colK?.toString() || null,
      colL: row.colL || null,
      colM: row.colM || null,
      colN: row.colN || null,
    }));

    return this.prisma.taxLedger.createMany({
      data: records,
    });
  }
}
