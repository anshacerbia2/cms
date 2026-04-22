import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const formatDecimal = (val: any): string => {
  if (val == null) return "0.0000";
  if (typeof val.toFixed === 'function') {
    try {
      const formatted = val.toFixed(4);
      if (formatted !== 'NaN') return formatted;
    } catch (e) {}
  }
  const num = Number(val.toString());
  if (isNaN(num)) return "0.0000";
  return num.toFixed(4);
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(query: PaginationQueryDto & { name?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';
    const nameFilter = query.name;

    const where: any = {
      AND: [
        nameFilter ? { name: nameFilter } : {},
        {
          OR: [
            { colB: { contains: search, mode: 'insensitive' } }, // description
            { name: { contains: search, mode: 'insensitive' } }, // source
          ],
        },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        skip,
        take: limit,
        where,
        orderBy: [{ id: 'asc' }],
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return {
      data: data.map(t => ({
        ...t,
        id: Number(t.id),
        colC: formatDecimal(t.colC),
        colD: formatDecimal(t.colD),
        colE: formatDecimal(t.colE),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllTransactions(name?: string): Promise<any[]> {
    const where: any = {};
    if (name && name !== 'undefined' && name !== 'null') {
      where.name = { equals: name };
    }
    
    console.log('Prisma Query Where:', JSON.stringify(where));
    
    const data = await this.prisma.financialTransaction.findMany({
      where,
      orderBy: [{ id: 'asc' }],
    });

    return data.map(t => ({
      ...t,
      id: Number(t.id),
      colC: formatDecimal(t.colC),
      colD: formatDecimal(t.colD),
      colE: formatDecimal(t.colE),
    }));
  }

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
        colG: formatDecimal(item.colG),
        colH: formatDecimal(item.colH),
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        colR: formatDecimal(item.colR),
        colS: formatDecimal(item.colS),
        colU: formatDecimal(item.colU),
        colV: formatDecimal(item.colV),
        colW: formatDecimal(item.colW),
        colX: formatDecimal(item.colX),
        colZ: formatDecimal(item.colZ),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };

  }

  async getAllSales(): Promise<any[]> {
    const data = await this.prisma.salesRecord.findMany({ orderBy: [{ id: 'asc' }] });
    return data.map(item => ({
      ...item,
      id: Number(item.id),
      colG: formatDecimal(item.colG),
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
      colU: formatDecimal(item.colU),
      colV: formatDecimal(item.colV),
      colW: formatDecimal(item.colW),
      colX: formatDecimal(item.colX),
      colZ: formatDecimal(item.colZ),
    }));
  }

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
        colU: formatDecimal(item.colU),
        colV: formatDecimal(item.colV),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };

  }

  async getAllAR(): Promise<any[]> {
    const data = await this.prisma.accountReceivable.findMany({ orderBy: [{ id: 'asc' }] });
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
      colU: formatDecimal(item.colU),
      colV: formatDecimal(item.colV),
    }));
  }

  async getAP(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.accountPayable.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.accountPayable.count(),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        id: Number(item.id),
        colE: formatDecimal(item.colE),
        colF: formatDecimal(item.colF),
        colG: formatDecimal(item.colG),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        colR: formatDecimal(item.colR),
        colT: formatDecimal(item.colT),
        colU: formatDecimal(item.colU),
        colW: formatDecimal(item.colW),
        colX: formatDecimal(item.colX),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAP(): Promise<any[]> {
    const data = await this.prisma.accountPayable.findMany({ orderBy: [{ id: 'asc' }] });
    return data.map(item => ({
      ...item,
      id: Number(item.id),
      colE: formatDecimal(item.colE),
      colF: formatDecimal(item.colF),
      colG: formatDecimal(item.colG),
      colK: formatDecimal(item.colK),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
      colW: formatDecimal(item.colW),
      colX: formatDecimal(item.colX),
    }));
  }

  async getAssets(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.assetDepreciation.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.assetDepreciation.count(),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        purchasePrice: formatDecimal(item.purchasePrice),
        accumulated2020: formatDecimal(item.accumulated2020),
        jan: formatDecimal(item.jan),
        feb: formatDecimal(item.feb),
        mar: formatDecimal(item.mar),
        apr: formatDecimal(item.apr),
        may: formatDecimal(item.may),
        jun: formatDecimal(item.jun),
        jul: formatDecimal(item.jul),
        aug: formatDecimal(item.aug),
        sep: formatDecimal(item.sep),
        oct: formatDecimal(item.oct),
        nov: formatDecimal(item.nov),
        dec: formatDecimal(item.dec),
        total2021: formatDecimal(item.total2021),
        accumulated2021: formatDecimal(item.accumulated2021),
        bookValue: formatDecimal(item.bookValue),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };

  }

  async getPL(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.profitLossSales.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(i => ({
        ...i,
        gross: formatDecimal(i.gross),
        vat: formatDecimal(i.vat),
        apVat: formatDecimal(i.apVat),
        creditNote: formatDecimal(i.creditNote),
        apCreditNote: formatDecimal(i.apCreditNote),
        netSales: formatDecimal(i.netSales),
      })),
      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }


  async getPLCosts(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.profitLossCost.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(i => ({
        ...i,
        category: i.category,
        subCategory: i.subCategory,
        bca: formatDecimal(i.bca),
        mandiri: formatDecimal(i.mandiri),
        bri: formatDecimal(i.bri),
        btn: formatDecimal(i.btn),
        cashIdr: formatDecimal(i.cashIdr),
        nonCb: formatDecimal(i.nonCb),
        other: formatDecimal(i.other),
        total: formatDecimal(i.total),
      })),

      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }


  async getBalanceSheet(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.balanceSheetItem.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(item => ({
        ...item,
        idr: formatDecimal(item.idr),
        usd: formatDecimal(item.usd),
        rate: formatDecimal(item.rate),
      })),
      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }


  async getPLSummary(): Promise<any[]> {
    const data = await this.prisma.profitLossSummary.findMany({
      orderBy: [{ id: 'asc' }],
    });

    return data.map(item => ({
      ...item,
      label: item.category, // Map category to label for frontend
      bca: formatDecimal(item.bca),
      mandiri: formatDecimal(item.mandiri),
      bri: formatDecimal(item.bri),
      btn: formatDecimal(item.btn),
      cashIdr: formatDecimal(item.cashIdr),
      nonCb: formatDecimal(item.nonCb),
      other: formatDecimal(item.other),
      total: formatDecimal(item.total),
    }));
  }


  async getInterAccountTransfers(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.interAccountTransfer.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.interAccountTransfer.count(),
    ]);

    return {
      data: data.map(t => ({
        ...t,
        bca: formatDecimal(t.bca),
        mandiri: formatDecimal(t.mandiri),
        bri: formatDecimal(t.bri),
        btn: formatDecimal(t.btn),
        cashIdr: formatDecimal(t.cashIdr),
        nonCashBank: formatDecimal(t.nonCashBank),
        checker: formatDecimal(t.checker),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async createBulkTransactions(data: any[]) {
    return this.prisma.financialTransaction.createMany({
      data: data.map(item => ({
        name: item.name,
        colA: item.colA ? new Date(item.colA) : null,
        colB: item.colB || "",
        colC: item.colC || 0,
        colD: item.colD || 0,
        colE: item.colE || 0,
        colF: item.colF || "",
        colG: item.colG || "",
        colH: item.colH || "",
      })),
    });
  }
}
