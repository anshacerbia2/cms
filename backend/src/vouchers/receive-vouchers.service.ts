import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  CreateReceiveVoucherDto, InvoiceAllocationDto, ReceiveVoucherQueryDto,
} from './dto/receive-voucher.dto';
import { UpdateReceiveVoucherDto } from './dto/update-voucher.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

@Injectable()
export class ReceiveVouchersService {
  constructor(
    private prisma: PrismaService,
    private invoices: InvoicesService,
  ) {}

  async create(dto: CreateReceiveVoucherDto) {
    const { invoiceAllocations = [], ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      const rv = await tx.receiveVoucher.create({ data: this.toRow(data) });

      if (invoiceAllocations.length > 0) {
        await this.syncInvoices(tx, rv.id, invoiceAllocations, Number(dto.amount));
      }

      return serializeDecimals(await this.loadFull(tx, rv.id));
    });
  }

  async findAll(query: ReceiveVoucherQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {};
    if (query.purpose) where.purpose = query.purpose;
    if (query.payerType) where.payerType = query.payerType;
    if (query.invoiceId) where.invoices = { some: { invoiceId: BigInt(query.invoiceId) } };

    if (search) {
      where.OR = [
        { rvNumber: { contains: search, mode: 'insensitive' as const } },
        { payerNameManual: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.receiveVoucher.findMany({
        where,
        skip,
        take: limit,
        include: {
          internalAccount: { include: { bank: true } },
          invoices: { include: { invoice: { select: { id: true, code: true, invoiceNumber: true } } } },
        },
        orderBy: [{ rvDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.receiveVoucher.count({ where }),
    ]);

    return {
      data: serializeDecimals(data),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return serializeDecimals(await this.findOneRaw(id));
  }

  async update(id: number, dto: UpdateReceiveVoucherDto) {
    const existing = await this.findOneRaw(id);
    const { invoiceAllocations, ...data } = dto;
    const rvId = BigInt(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.receiveVoucher.update({ where: { id: rvId }, data: this.toRow(data) });

      if (invoiceAllocations !== undefined) {
        await this.syncInvoices(
          tx,
          rvId,
          invoiceAllocations,
          Number(dto.amount ?? existing.amount),
        );
      } else if (dto.purpose && dto.purpose !== 'INVOICE') {
        // The voucher no longer settles invoices, so its allocations are released.
        await this.detachAll(tx, rvId);
      }

      return serializeDecimals(await this.loadFull(tx, rvId));
    });
  }

  async remove(id: number) {
    await this.findOneRaw(id);
    const rvId = BigInt(id);

    return this.prisma.$transaction(async (tx) => {
      await this.detachAll(tx, rvId);
      return serializeDecimals(await tx.receiveVoucher.delete({ where: { id: rvId } }));
    });
  }

  /**
   * Replaces the voucher's invoice allocations, then re-reconciles every invoice it
   * touched — the ones it just left included, so their balance due goes back up.
   */
  private async syncInvoices(
    tx: any,
    rvId: bigint,
    allocations: InvoiceAllocationDto[],
    totalRvAmount: number,
  ) {
    const previous = await tx.invoiceReceiveVoucher.findMany({ where: { receiveVoucherId: rvId } });
    const previousByInvoice = new Map(previous.map((row: any) => [row.invoiceId.toString(), row]));

    const rows: any[] = [];
    let totalApplied = 0;

    for (const allocation of allocations) {
      const applied = Number(allocation.amountApplied ?? 0);
      const ppnWapu = Number(allocation.ppnWapuDeduction ?? 0);
      const pph23 = Number(allocation.pph23Deduction ?? 0);
      const bankCharge = Number(allocation.bankCharge ?? 0);
      const others = Number(allocation.othersAdjustment ?? 0);

      // A row with no cash and no deduction carries no information.
      if (!applied && !ppnWapu && !pph23 && !bankCharge && !others) continue;

      const invoice = await tx.invoice.findUnique({ where: { id: BigInt(allocation.invoiceId) } });
      if (!invoice) throw new NotFoundException(`Invoice with ID ${allocation.invoiceId} not found.`);

      const alreadyApplied = Number(
        (previousByInvoice.get(invoice.id.toString()) as any)?.amountApplied ?? 0,
      );
      const maxAllowed = this.round2(Number(invoice.balanceDue) + alreadyApplied);

      if (applied > maxAllowed) {
        throw new BadRequestException(
          `Allocation for invoice ${invoice.code} (${applied}) exceeds its outstanding balance (${maxAllowed}).`,
        );
      }

      rows.push({
        invoiceId: invoice.id,
        receiveVoucherId: rvId,
        amountApplied: applied,
        ppnWapuDeduction: ppnWapu,
        pph23Deduction: pph23,
        bankCharge,
        othersAdjustment: others,
        adjustmentDescription: allocation.adjustmentDescription ?? null,
      });

      totalApplied += applied;
    }

    if (this.round2(totalApplied) > this.round2(totalRvAmount)) {
      throw new BadRequestException(
        `Total allocated (${this.round2(totalApplied)}) exceeds the Receive Voucher amount (${this.round2(totalRvAmount)}).`,
      );
    }

    await tx.invoiceReceiveVoucher.deleteMany({ where: { receiveVoucherId: rvId } });
    if (rows.length > 0) await tx.invoiceReceiveVoucher.createMany({ data: rows });

    const affected = new Set<string>([
      ...previous.map((row: any) => row.invoiceId.toString()),
      ...rows.map((row) => row.invoiceId.toString()),
    ]);

    for (const invoiceId of affected) {
      await this.invoices.recalculateReconciliation(tx, BigInt(invoiceId));
    }
  }

  private async detachAll(tx: any, rvId: bigint) {
    const links = await tx.invoiceReceiveVoucher.findMany({ where: { receiveVoucherId: rvId } });
    if (links.length === 0) return;

    await tx.invoiceReceiveVoucher.deleteMany({ where: { receiveVoucherId: rvId } });

    for (const link of links) {
      await this.invoices.recalculateReconciliation(tx, link.invoiceId);
    }
  }

  private async findOneRaw(id: number) {
    const rv = await this.loadFull(this.prisma, BigInt(id));
    if (!rv) throw new NotFoundException(`Receive Voucher with ID ${id} not found`);
    return rv;
  }

  private loadFull(client: any, id: bigint) {
    return client.receiveVoucher.findUnique({
      where: { id },
      include: {
        internalAccount: { include: { bank: true } },
        paymentVoucher: true,
        invoices: { include: { invoice: { include: { customer: { select: { id: true, name: true } } } } } },
      },
    });
  }

  private toRow(data: any) {
    const row: any = { ...data };

    if (data.rvDate !== undefined) row.rvDate = new Date(data.rvDate);
    if (data.internalAccountId !== undefined) {
      row.internalAccountId = data.internalAccountId ? BigInt(data.internalAccountId) : null;
    }
    if (data.payerId !== undefined) row.payerId = data.payerId ? BigInt(data.payerId) : null;
    if (data.paymentVoucherId !== undefined) {
      row.paymentVoucherId = data.paymentVoucherId ? BigInt(data.paymentVoucherId) : null;
    }

    return row;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
