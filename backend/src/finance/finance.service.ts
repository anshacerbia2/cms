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

  async getTransactions(query: PaginationQueryDto & { source?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';
    const sourceFilter = query.source;

    const where: any = {
      AND: [
        sourceFilter ? { source: sourceFilter } : {},
        {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { source: { contains: search, mode: 'insensitive' } },
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
        withdrawal: formatDecimal(t.withdrawal),
        deposit: formatDecimal(t.deposit),
        balance: formatDecimal(t.balance),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
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
        basicPrice: formatDecimal(item.basicPrice),
        managementFee: formatDecimal(item.managementFee),
        ppn: formatDecimal(item.ppn),
        totalAmount: formatDecimal(item.totalAmount),
        bca: formatDecimal(item.bca),
        mandiri: formatDecimal(item.mandiri),
        danamon: formatDecimal(item.danamon),
        bri: formatDecimal(item.bri),
        btn: formatDecimal(item.btn),
        cashIdr: formatDecimal(item.cashIdr),
        nonCb: formatDecimal(item.nonCb),
        outstanding: formatDecimal(item.outstanding),
        pph23: formatDecimal(item.pph23),
        apPph23: formatDecimal(item.apPph23),
        ppnTax: formatDecimal(item.ppnTax),
        apPpn: formatDecimal(item.apPpn),
        netReceived: formatDecimal(item.netReceived),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };

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
        idr: formatDecimal(item.idr),
        usd: formatDecimal(item.usd),
        rate: formatDecimal(item.rate),
        bca: formatDecimal(item.bca),
        mandiri: formatDecimal(item.mandiri),
        bri: formatDecimal(item.bri),
        cashIdr: formatDecimal(item.cashIdr),
        nonCb: formatDecimal(item.nonCb),
        citibank: formatDecimal(item.citibank),
        cashUsd: formatDecimal(item.cashUsd),
        outstandingIdr: formatDecimal(item.outstandingIdr),
        outstandingUsd: formatDecimal(item.outstandingUsd),
        adjustmentIdr: formatDecimal(item.adjustmentIdr),

        adjustmentUsd: formatDecimal(item.adjustmentUsd),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };

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
        idr: formatDecimal(item.idr),
        usd: formatDecimal(item.usd),
        rate: formatDecimal(item.rate),
        bca: formatDecimal(item.bca),
        mandiri: formatDecimal(item.mandiri),
        btn: formatDecimal(item.btn),
        bri: formatDecimal(item.bri),
        cashIdr: formatDecimal(item.cashIdr),
        nonCb: formatDecimal(item.nonCb),
        citibank: formatDecimal(item.citibank),
        cashUsd: formatDecimal(item.cashUsd),
        outstandingIdr: formatDecimal(item.outstandingIdr),
        outstandingUsd: formatDecimal(item.outstandingUsd),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
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
}
