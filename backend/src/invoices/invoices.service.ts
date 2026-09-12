import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(dto.customerId), deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Customer with ID ${dto.customerId} not found.`);

    const project = dto.projectId
      ? await this.prisma.project.findFirst({ where: { id: BigInt(dto.projectId), deletedAt: null } })
      : null;

    if (dto.projectId && !project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found.`);
    }

    return project?.type === 'FIT' ? this.createForFitProject(dto, project) : this.createForProposal(dto);
  }

  /** FIT flow: the project is billed directly, with one summary sales item. */
  private async createForFitProject(dto: CreateInvoiceDto, project: any) {
    const totalAmount = Number(dto.totalAmount ?? 0);
    this.assertBillable(totalAmount, 'The amount given');
    await this.assertNonVatSettlement(dto.taxType, dto.internalAccountId);
    const managementFeeType = dto.managementFeeType ?? 'PERCENT';
    const managementFee = dto.managementFee ?? 0;
    const vatRate = dto.vatRate ?? 11;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          code: await this.generateCodeFromProject(tx, project),
          invoiceNumber: dto.invoiceNumber,
          dueDate: new Date(dto.dueDate),
          projectId: project.id,
          proposalId: null,
          customerId: BigInt(dto.customerId),
          billingOptionId: dto.billingOptionId ? BigInt(dto.billingOptionId) : null,
          internalAccountId: dto.internalAccountId ? BigInt(dto.internalAccountId) : null,
          salesCode: project.salesCode,
          projectName: project.name,
          projectDescription: project.description,
          description: dto.description ?? null,
          billingType: dto.billingType,
          taxType: dto.taxType,
          totalAmount,
          // Nothing is applied yet, so the whole gross figure is outstanding.
          balanceDue: this.grossAmount({
            totalAmount,
            managementFeeType,
            managementFee,
            taxType: dto.taxType,
            vatRate,
          }),
          status: dto.status ?? 'PREPARED',
          paymentStatus: dto.paymentStatus ?? 'UNPAID',
          managementFeeType,
          managementFee,
          vatRate,
        },
      });

      await tx.salesItem.create({
        data: {
          projectId: project.id,
          invoiceId: invoice.id,
          description: dto.description ?? null,
          sellingPrice: totalAmount,
          totalPrice: totalAmount,
          title1Key: 'Qty',
          title1Value: 1,
        },
      });

      return this.present(await this.loadFull(tx, invoice.id));
    });
  }

  /** Regular flow: bills selected sales items of a won proposal. */
  private async createForProposal(dto: CreateInvoiceDto) {
    if (!dto.proposalId) {
      throw new BadRequestException('Proposal ID or a valid FIT Project ID is required.');
    }

    const proposal = await this.loadProposalForBilling(this.prisma, dto.proposalId);
    const itemIds = await this.resolveItemIds(this.prisma, proposal, dto.billingType, dto.itemIds ?? [], null);

    const selected = proposal.salesItems.filter((item: any) => itemIds.includes(item.id.toString()));
    const totalAmount = selected.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
    this.assertBillable(totalAmount, 'The selected proposal items');
    await this.assertNonVatSettlement(dto.taxType, dto.internalAccountId);
    const managementFee = this.proposalFeeValue(proposal, totalAmount);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          code: await this.generateCodeFromProposal(tx, proposal),
          invoiceNumber: dto.invoiceNumber,
          dueDate: new Date(dto.dueDate),
          projectId: proposal.projectId,
          proposalId: proposal.id,
          customerId: BigInt(dto.customerId),
          billingOptionId: dto.billingOptionId ? BigInt(dto.billingOptionId) : null,
          internalAccountId: dto.internalAccountId ? BigInt(dto.internalAccountId) : null,
          salesCode: proposal.salesCode,
          projectName: proposal.project?.name ?? null,
          projectDescription: proposal.project?.description ?? null,
          description: dto.description ?? null,
          billingType: dto.billingType,
          taxType: dto.taxType,
          totalAmount,
          balanceDue: this.grossAmount({
            totalAmount,
            managementFeeType: proposal.managementFeeType,
            managementFee,
            taxType: dto.taxType,
            vatRate: proposal.vatRate,
          }),
          status: dto.status ?? 'PREPARED',
          paymentStatus: dto.paymentStatus ?? 'UNPAID',
          managementFeeType: proposal.managementFeeType,
          managementFee,
          vatRate: proposal.vatRate,
        },
      });

      await tx.salesItem.updateMany({
        where: { id: { in: itemIds.map((id) => BigInt(id)) } },
        data: { invoiceId: invoice.id },
      });

      return this.present(await this.loadFull(tx, invoice.id));
    });
  }

  async findAll(query: InvoiceQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {};
    if (query.customerId) where.customerId = BigInt(query.customerId);
    if (query.projectId) where.projectId = BigInt(query.projectId);
    if (query.proposalId) where.proposalId = BigInt(query.proposalId);
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.unpaid === 'true') where.paymentStatus = { not: 'FULLY_PAID' };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' as const } },
        { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
        { salesCode: { contains: search, mode: 'insensitive' as const } },
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true, type: true } },
          proposal: { select: { id: true, code: true, status: true } },
          internalAccount: { include: { bank: true } },
          _count: { select: { salesItems: true, receiveVouchers: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: data.map((invoice) => this.present(invoice)),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.present(await this.findOneRaw(id));
  }

  async update(id: number, dto: UpdateInvoiceDto) {
    const invoice = await this.findOneRaw(id);

    // Once cash has been applied, the numbers the RV was reconciled against are frozen.
    if (invoice.receiveVouchers.length > 0) {
      const changed: string[] = [];
      if (dto.taxType !== undefined && dto.taxType !== invoice.taxType) changed.push('tax_type');
      if (dto.totalAmount !== undefined && Number(dto.totalAmount) !== Number(invoice.totalAmount)) {
        changed.push('total_amount');
      }
      if (dto.customerId !== undefined && BigInt(dto.customerId) !== invoice.customerId) changed.push('customer_id');

      if (changed.length > 0) {
        throw new BadRequestException(
          `Cannot change sensitive field '${changed[0]}' because this invoice already has linked Receive Vouchers. ` +
            'Please delete the RV first if you need to reconfigure the tax/amount.',
        );
      }
    }

    // Checked against the values the invoice will end up with, since either the
    // tax type or the settlement account may be the one being edited.
    await this.assertNonVatSettlement(
      dto.taxType ?? invoice.taxType,
      dto.internalAccountId ?? (invoice.internalAccountId ? Number(invoice.internalAccountId) : null),
    );

    const invoiceId = BigInt(id);
    const isFit = invoice.project?.type === 'FIT';

    const base: any = {
      invoiceNumber: dto.invoiceNumber,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      billingOptionId: dto.billingOptionId !== undefined
        ? (dto.billingOptionId ? BigInt(dto.billingOptionId) : null)
        : undefined,
      internalAccountId: dto.internalAccountId !== undefined
        ? (dto.internalAccountId ? BigInt(dto.internalAccountId) : null)
        : undefined,
      description: dto.description,
      billingType: dto.billingType,
      taxType: dto.taxType,
      status: dto.status,
      paymentStatus: dto.paymentStatus,
    };

    if (isFit) {
      const totalAmount = dto.totalAmount !== undefined ? Number(dto.totalAmount) : Number(invoice.totalAmount);
      this.assertBillable(totalAmount, 'The amount given');

      return this.prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            ...base,
            totalAmount,
            managementFeeType: dto.managementFeeType,
            managementFee: dto.managementFee,
            vatRate: dto.vatRate,
          },
        });

        // The FIT summary item mirrors the invoice, so it is rewritten on every edit.
        await tx.salesItem.deleteMany({ where: { invoiceId } });
        await tx.salesItem.create({
          data: {
            projectId: invoice.projectId,
            invoiceId,
            description: dto.description ?? invoice.description,
            sellingPrice: totalAmount,
            totalPrice: totalAmount,
            title1Key: 'Qty',
            title1Value: 1,
          },
        });

        await this.recalculateReconciliation(tx, invoiceId);
        return this.present(await this.loadFull(tx, invoiceId));
      });
    }

    const proposal = await this.loadProposalForBilling(this.prisma, Number(invoice.proposalId));
    const billingType = dto.billingType ?? invoice.billingType;
    const itemIds = await this.resolveItemIds(
      this.prisma,
      proposal,
      billingType,
      dto.itemIds ?? invoice.salesItems.map((item: any) => Number(item.id)),
      invoiceId,
    );

    const selected = proposal.salesItems.filter((item: any) => itemIds.includes(item.id.toString()));
    const totalAmount = selected.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
    this.assertBillable(totalAmount, 'The selected proposal items');

    return this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...base,
          totalAmount,
          managementFeeType: proposal.managementFeeType,
          managementFee: this.proposalFeeValue(proposal, totalAmount),
          vatRate: proposal.vatRate,
        },
      });

      await tx.salesItem.updateMany({ where: { invoiceId }, data: { invoiceId: null } });
      await tx.salesItem.updateMany({
        where: { id: { in: itemIds.map((itemId) => BigInt(itemId)) } },
        data: { invoiceId },
      });

      await this.recalculateReconciliation(tx, invoiceId);
      return this.present(await this.loadFull(tx, invoiceId));
    });
  }

  async remove(id: number) {
    const invoice = await this.findOneRaw(id);

    if (invoice.receiveVouchers.length > 0) {
      throw new BadRequestException(
        'Cannot delete an invoice that has linked Receive Vouchers. Please detach the RV first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Proposal items go back into the pool; FIT summary items belong to the invoice.
      await tx.salesItem.deleteMany({ where: { invoiceId: BigInt(id), proposalId: null } });
      await tx.salesItem.updateMany({ where: { invoiceId: BigInt(id) }, data: { invoiceId: null } });

      return serializeDecimals(await tx.invoice.delete({ where: { id: BigInt(id) } }));
    });
  }

  /**
   * Rewrites the reconciliation columns from the invoice's applied receive vouchers:
   *   invoice amount - (applied + PPh23 + bank charge + WAPU + other adjustments)
   *
   * Legacy subtracted from `total_amount` (the item base), which under-states the
   * balance by the management fee and VAT the customer is actually billed for.
   */
  async recalculateReconciliation(client: any, invoiceId: bigint) {
    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
      include: { receiveVouchers: true },
    });
    if (!invoice) return;

    const sum = (field: string) =>
      invoice.receiveVouchers.reduce((acc: number, link: any) => acc + Number(link[field]), 0);

    const totalApplied = sum('amountApplied');
    const totalPph23 = sum('pph23Deduction');
    const totalBankCharge = sum('bankCharge');
    const totalWapu = sum('ppnWapuDeduction');
    const totalOthers = sum('othersAdjustment');

    const invoiceAmount = this.grossAmount(invoice);
    const balanceDue = Math.max(
      0,
      invoiceAmount - (totalApplied + totalPph23 + totalBankCharge + totalWapu + totalOthers),
    );

    let paymentStatus: 'UNPAID' | 'PARTLY_PAID' | 'FULLY_PAID' = 'UNPAID';
    if (balanceDue <= 0 && invoiceAmount > 0) paymentStatus = 'FULLY_PAID';
    else if (totalApplied > 0) paymentStatus = 'PARTLY_PAID';

    await client.invoice.update({
      where: { id: invoiceId },
      data: {
        totalReceivedAmount: totalApplied,
        totalPph23Deduction: totalPph23,
        totalBankCharge: totalBankCharge,
        balanceDue,
        paymentStatus,
      },
    });
  }

  private async findOneRaw(id: number) {
    const invoice = await this.loadFull(this.prisma, BigInt(id));
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
    return invoice;
  }

  private loadFull(client: any, id: bigint) {
    return client.invoice.findUnique({
      where: { id },
      include: {
        project: true,
        proposal: { include: { project: true, salesItems: true } },
        customer: { include: { billingOptions: true } },
        billingOption: true,
        internalAccount: { include: { bank: true } },
        salesItems: { include: { product: true }, orderBy: [{ headerOrder: 'asc' }, { id: 'asc' }] },
        receiveVouchers: { include: { receiveVoucher: true } },
      },
    });
  }

  private async loadProposalForBilling(client: any, proposalId: number) {
    const proposal = await client.proposal.findFirst({
      where: { id: BigInt(proposalId), deletedAt: null },
      include: { project: true, salesItems: true, invoices: true },
    });

    if (!proposal) throw new NotFoundException(`Proposal with ID ${proposalId} not found.`);
    if (proposal.project && proposal.project.type !== 'REGULAR') {
      throw new BadRequestException(
        `Only Regular Projects can generate invoices via Proposals. Type is '${proposal.project.type}'.`,
      );
    }
    if (proposal.status !== 'WIN') {
      throw new BadRequestException('Invoice can only be generated for win proposals.');
    }
    if (!proposal.pricingModel) {
      throw new BadRequestException('Proposal must have a pricing model configured to generate an invoice.');
    }

    return proposal;
  }

  /**
   * A Full Amount invoice must be the proposal's only invoice and must take every item;
   * a Partly Payment invoice may only take items nothing else has billed yet.
   */
  private async resolveItemIds(
    client: any,
    proposal: any,
    billingType: string,
    requestedIds: number[] | string[],
    currentInvoiceId: bigint | null,
  ): Promise<string[]> {
    const owned = (item: any) =>
      item.invoiceId === null || (currentInvoiceId !== null && item.invoiceId === currentInvoiceId);

    if (billingType === 'FULL_AMOUNT') {
      const otherInvoices = proposal.invoices.filter(
        (invoice: any) => currentInvoiceId === null || invoice.id !== currentInvoiceId,
      );
      if (otherInvoices.length > 0) {
        throw new BadRequestException(
          "Cannot create a 'Full' invoice because other invoices already exist for this proposal.",
        );
      }

      const unavailable = proposal.salesItems.filter((item: any) => !owned(item));
      if (unavailable.length > 0) {
        throw new BadRequestException("Cannot create a 'Full' invoice because some items are already invoiced.");
      }

      return proposal.salesItems.map((item: any) => item.id.toString());
    }

    const available = proposal.salesItems.filter(owned).map((item: any) => item.id.toString());
    if (available.length === 0) {
      throw new BadRequestException('No available items to be billed for this proposal.');
    }

    const requested = requestedIds.map((id) => String(id));
    if (requested.length === 0) {
      throw new BadRequestException('Select at least one proposal item to bill.');
    }

    const invalid = requested.filter((id) => !available.includes(id));
    if (invalid.length > 0) {
      throw new BadRequestException('Some selected items are not available for invoicing in this proposal.');
    }

    return requested;
  }

  /**
   * Percent fees carry the rate; nominal fees are split across invoices in proportion
   * to the share of the proposal being billed.
   */
  /**
   * No Tax invoices carry no VAT, so they must settle to the account kept outside
   * the VAT reporting — the form has always said so without enforcing it, and the
   * rule used to be written down as a literal account number, which silently
   * stopped meaning anything the moment that account changed.
   *
   * Enforced only once at least one account is marked: on a database where nobody
   * has designated one yet, there is nothing to check against and refusing every
   * No Tax invoice would be worse than allowing them.
   */
  private async assertNonVatSettlement(taxType: string | undefined, internalAccountId?: number | null) {
    if (taxType !== 'NO_TAX') return;

    const designated = await this.prisma.internalAccount.count({
      where: { isNonVatSettlement: true },
    });
    if (designated === 0) return;

    if (!internalAccountId) {
      throw new BadRequestException(
        'A No Tax invoice must name the non-VAT settlement account.',
      );
    }

    const account = await this.prisma.internalAccount.findUnique({
      where: { id: BigInt(internalAccountId) },
      include: { bank: true },
    });

    if (!account?.isNonVatSettlement) {
      const allowed = await this.prisma.internalAccount.findMany({
        where: { isNonVatSettlement: true },
        include: { bank: true },
      });

      throw new BadRequestException(
        `A No Tax invoice must settle to the non-VAT account (${allowed
          .map((a) => `${a.bank?.bankName ?? 'Cash'} ${a.accountNo ?? ''}`.trim())
          .join(', ')}).`,
      );
    }
  }

  /**
   * An invoice for nothing cannot be collected and has no meaning in the ledger:
   * its balance due is zero, so it is born already settled and no receive voucher
   * can ever apply to it. Adjustments belong on vouchers, not on empty invoices.
   */
  private assertBillable(totalAmount: number, context: string) {
    if (!(totalAmount > 0)) {
      throw new BadRequestException(
        `${context} produces a zero invoice amount. An invoice must bill a positive amount.`,
      );
    }
  }

  private proposalFeeValue(proposal: any, totalAmount: number): number {
    const managementFee = Number(proposal.managementFee ?? 0);
    if (proposal.managementFeeType === 'PERCENT') return managementFee;

    const proposalTotal = proposal.salesItems.reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice),
      0,
    );
    if (proposalTotal <= 0) return 0;

    return this.round2(managementFee * (totalAmount / proposalTotal));
  }

  /** Adds the money the legacy Invoice model exposed as appended accessors. */
  private present(invoice: any) {
    if (!invoice) return invoice;

    return serializeDecimals({ ...invoice, ...this.amounts(invoice) });
  }

  /**
   * management fee (rate or nominal) -> sales amount -> VAT (zero when the invoice is
   * No Tax) -> invoice amount, the gross figure billed to the customer.
   */
  private amounts(invoice: any) {
    const totalAmount = Number(invoice.totalAmount ?? 0);
    const feeValue = Number(invoice.managementFee ?? 0);

    const managementFeeAmount =
      invoice.managementFeeType === 'PERCENT' ? this.round2((totalAmount * feeValue) / 100) : feeValue;
    const salesAmount = this.round2(totalAmount + managementFeeAmount);
    const vatAmount =
      invoice.taxType === 'NO_TAX' ? 0 : this.round2((salesAmount * Number(invoice.vatRate ?? 0)) / 100);

    return {
      managementFeeAmount,
      salesAmount,
      vatAmount,
      invoiceAmount: this.round2(salesAmount + vatAmount),
    };
  }

  private grossAmount(invoice: any): number {
    return this.amounts(invoice).invoiceAmount;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /** Regular flow code: I-{3 first + 5 last of proposal code}-{yymmdd}-{seq}{2 random}. */
  private async generateCodeFromProposal(tx: any, proposal: any): Promise<string> {
    const date = new Date();
    const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const clean = proposal.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefixCode = `${clean.slice(0, 3)}${clean.slice(-5)}`;

    const startOfDay = new Date(date.toISOString().slice(0, 10));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    for (;;) {
      const count = await tx.invoice.count({
        where: { proposalId: proposal.id, createdAt: { gte: startOfDay, lt: endOfDay } },
      });
      const random = Math.random().toString(36).substring(2, 4).toUpperCase().padEnd(2, '0');
      const candidate = `I-${prefixCode}-${yymmdd}-${String(count + 1).padStart(3, '0')}${random}`;

      const clash = await tx.invoice.findUnique({ where: { code: candidate } });
      if (!clash) return candidate;
    }
  }

  /** FIT flow code: I-FIT-{last 5 of project code}-{yymmdd}-{seq}. */
  private async generateCodeFromProject(tx: any, project: any): Promise<string> {
    const date = new Date();
    const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const clean = (project.code ?? String(project.id)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const projLast5 = clean.slice(-5).padStart(5, '0');

    const startOfDay = new Date(date.toISOString().slice(0, 10));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    let sequence = await tx.invoice.count({
      where: { projectId: project.id, createdAt: { gte: startOfDay, lt: endOfDay } },
    });

    for (;;) {
      sequence++;
      const candidate = `I-FIT-${projLast5}-${yymmdd}-${String(sequence).padStart(3, '0')}`;
      const clash = await tx.invoice.findUnique({ where: { code: candidate } });
      if (!clash) return candidate;
    }
  }
}
