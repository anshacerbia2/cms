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
        colE: formatDecimal(item.colE),   // EOY IDR
        colF: formatDecimal(item.colF),   // EOY USD
        colG: formatDecimal(item.colG),   // col G
        // colH, colI, colJ are strings
        colK: formatDecimal(item.colK),   // BCA Shardjo
        colL: formatDecimal(item.colL),   // BCA Juanda
        colM: formatDecimal(item.colM),   // Mandiri Mid Plaza
        colN: formatDecimal(item.colN),   // BTN
        colO: formatDecimal(item.colO),   // BRI Shardjo
        colP: formatDecimal(item.colP),   // BRI Tebet
        colQ: formatDecimal(item.colQ),   // Cash IDR
        colR: formatDecimal(item.colR),   // Non CB
        colS: formatDecimal(item.colS),   // AP In and Out
        // colT is string
        colU: formatDecimal(item.colU),   // Outstanding IDR
        colV: formatDecimal(item.colV),   // Outstanding USD
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAccountPayables(year?: number): Promise<any[]> {
    const where: any = {};
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }
    const data = await this.prisma.accountPayable.findMany({ where, orderBy: [{ id: 'asc' }] });
    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      colB: item.colB ? Number(item.colB) : null,
      colE: formatDecimal(item.colE),   // EOY IDR
      colF: formatDecimal(item.colF),   // EOY USD
      colG: formatDecimal(item.colG),   // col G
      // colH, colI, colJ are strings
      colK: formatDecimal(item.colK),   // BCA Shardjo
      colL: formatDecimal(item.colL),   // BCA Juanda
      colM: formatDecimal(item.colM),   // Mandiri Mid Plaza
      colN: formatDecimal(item.colN),   // BTN
      colO: formatDecimal(item.colO),   // BRI Shardjo
      colP: formatDecimal(item.colP),   // BRI Tebet
      colQ: formatDecimal(item.colQ),   // Cash IDR
      colR: formatDecimal(item.colR),   // Non CB
      colS: formatDecimal(item.colS),   // AP In and Out
      // colT is string
      colU: formatDecimal(item.colU),   // Outstanding IDR
      colV: formatDecimal(item.colV),   // Outstanding USD
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
        colE: data.colE?.toString() || null,   // EOY IDR
        colF: data.colF?.toString() || null,   // EOY USD
        colG: data.colG?.toString() || null,   // col G
        // colH, colI, colJ are strings (passed as-is)
        colK: data.colK?.toString() || null,   // BCA Shardjo
        colL: data.colL?.toString() || null,   // BCA Juanda
        colM: data.colM?.toString() || null,   // Mandiri Mid Plaza
        colN: data.colN?.toString() || null,   // BTN
        colO: data.colO?.toString() || null,   // BRI Shardjo
        colP: data.colP?.toString() || null,   // BRI Tebet
        colQ: data.colQ?.toString() || null,   // Cash IDR
        colR: data.colR?.toString() || null,   // Non CB
        colS: data.colS?.toString() || null,   // AP In and Out
        // colT is string (passed as-is)
        colU: data.colU?.toString() || null,   // Outstanding IDR
        colV: data.colV?.toString() || null,   // Outstanding USD
      },
    });
  }

  async updateAccountPayable(id: number, data: any) {
    return this.prisma.accountPayable.update({
      where: { id },
      data: {
        ...data,
        colB: data.colB ? Number(data.colB) : null,
        colE: data.colE?.toString() || null,   // EOY IDR
        colF: data.colF?.toString() || null,   // EOY USD
        colG: data.colG?.toString() || null,   // col G
        colH: data.colH || null,               // col H (string)
        colI: data.colI || null,               // col I (string)
        colJ: data.colJ || null,               // col J (string)
        colK: data.colK?.toString() || null,   // BCA Shardjo
        colL: data.colL?.toString() || null,   // BCA Juanda
        colM: data.colM?.toString() || null,   // Mandiri Mid Plaza
        colN: data.colN?.toString() || null,   // BTN
        colO: data.colO?.toString() || null,   // BRI Shardjo
        colP: data.colP?.toString() || null,   // BRI Tebet
        colQ: data.colQ?.toString() || null,   // Cash IDR
        colR: data.colR?.toString() || null,   // Non CB
        colS: data.colS?.toString() || null,   // AP In and Out
        // colT is string (passed as-is)
        colU: data.colU?.toString() || null,   // Outstanding IDR
        colV: data.colV?.toString() || null,   // Outstanding USD
      },
    });
  }

  async deleteAccountPayable(id: number) {
    return this.prisma.accountPayable.delete({
      where: { id },
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

  async createBulkAccountPayables(data: any[], tagYear: number) {
    const records = data.map(row => ({
      colA: row.colA || null,
      colB: row.colB ? Number(row.colB) : null,
      colC: row.colC || null,
      colD: row.colD || null,
      colE: row.colE?.toString() || null,   // EOY IDR
      colF: row.colF?.toString() || null,   // EOY USD
      colG: row.colG?.toString() || null,   // col G
      colH: row.colH || null,               // col H (string)
      colI: row.colI || null,               // col I (string)
      colJ: row.colJ || null,               // col J (string)
      colK: row.colK?.toString() || null,   // BCA Shardjo
      colL: row.colL?.toString() || null,   // BCA Juanda
      colM: row.colM?.toString() || null,   // Mandiri Mid Plaza
      colN: row.colN?.toString() || null,   // BTN
      colO: row.colO?.toString() || null,   // BRI Shardjo
      colP: row.colP?.toString() || null,   // BRI Tebet
      colQ: row.colQ?.toString() || null,   // Cash IDR
      colR: row.colR?.toString() || null,   // Non CB
      colS: row.colS?.toString() || null,   // AP In and Out
      colT: row.colT || null,               // col T (string)
      colU: row.colU?.toString() || null,   // Outstanding IDR
      colV: row.colV?.toString() || null,   // Outstanding USD
      tagYear: tagYear,
    }));
    return this.prisma.accountPayable.createMany({
      data: records,
    });
  }

  async createBulkTaxLedgers(data: any[], tagYear: number) {
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
      tagYear: tagYear,
    }));

    return this.prisma.taxLedger.createMany({
      data: records,
    });
  }
}
