import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto, ProposalItemDto, PricingModel } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

/** Sales item row as built by the pricing engine, before it gets a proposal id. */
interface BuiltItem {
  productId: bigint | null;
  productPriceVersionId: bigint | null;
  description: string | null;
  sellingPrice: number;
  totalPrice: number;
  title1Key: string | null;
  title1Value: number | null;
  title2Key: string | null;
  title2Value: number | null;
  title3Key: string | null;
  title3Value: number | null;
  title4Key: string | null;
  title4Value: number | null;
  header: string | null;
  subheader: string | null;
  headerOrder: number;
}

@Injectable()
export class ProposalsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProposalDto) {
    const { items = [], projectId, totalAmountItems, ...rest } = dto;

    const project = await this.prisma.project.findFirst({
      where: { id: BigInt(projectId), deletedAt: null },
    });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);
    if (project.type === 'FIT') {
      throw new BadRequestException('FIT projects bill directly and cannot have proposals.');
    }

    const code = await this.generateUniqueCode();

    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({
        data: {
          ...rest,
          code,
          projectId: BigInt(projectId),
          totalAmountItems: 0,
        },
      });

      const built = await this.buildItems(tx, dto.pricingModel, items, {
        totalAmountItems,
        pricingModelDescription: rest.pricingModelDescription,
      });

      if (built.items.length > 0) {
        await tx.salesItem.createMany({
          data: built.items.map((item) => ({ ...item, proposalId: proposal.id })),
        });
      }

      await tx.proposal.update({
        where: { id: proposal.id },
        data: { totalAmountItems: built.total },
      });

      return this.presentOne(await this.loadFull(tx, proposal.id));
    });
  }

  async findAll(query: ProposalQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = { deletedAt: null };
    if (query.projectId) where.projectId = BigInt(query.projectId);
    if (query.status) where.status = query.status;
    if (query.pricingModel) where.pricingModel = query.pricingModel;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' as const } },
        { salesCode: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { project: { name: { contains: search, mode: 'insensitive' as const } } },
        { project: { code: { contains: search, mode: 'insensitive' as const } } },
        { project: { customer: { name: { contains: search, mode: 'insensitive' as const } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: { include: { customer: { select: { id: true, code: true, name: true } } } },
          _count: { select: { salesItems: true, boqs: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: data.map((proposal) => this.presentOne(proposal)),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.presentOne(await this.findOneRaw(id));
  }

  async update(id: number, dto: UpdateProposalDto) {
    const existing = await this.findOneRaw(id);

    if (existing.status === 'WIN') {
      throw new BadRequestException("Proposal with status 'WIN' cannot be modified.");
    }

    const { items, projectId, totalAmountItems, ...rest } = dto;
    const proposalId = BigInt(id);
    const pricingModel = (dto.pricingModel ?? existing.pricingModel) as PricingModel | null;

    if (projectId !== undefined) {
      const project = await this.prisma.project.findFirst({
        where: { id: BigInt(projectId), deletedAt: null },
      });
      if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);
      if (project.type === 'FIT') {
        throw new BadRequestException('FIT projects bill directly and cannot have proposals.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const data: any = { ...rest };
      if (projectId !== undefined) data.projectId = BigInt(projectId);

      await tx.proposal.update({ where: { id: proposalId }, data });

      // Items are rebuilt wholesale: the pricing model decides every derived column,
      // so a partial merge would leave stale totals behind.
      const rebuildItems = items !== undefined || dto.pricingModel !== undefined || totalAmountItems !== undefined;

      if (rebuildItems) {
        if (!pricingModel) {
          throw new BadRequestException('Pricing model is required to rebuild proposal items.');
        }

        // Items already billed on an invoice are left alone; only unbilled ones are replaced.
        // Today this is defensive: an invoice requires a WIN proposal, and a WIN proposal is
        // rejected above, so no billed item can reach here. It keeps the total honest if that
        // lock is ever relaxed.
        const billed = await tx.salesItem.findMany({
          where: { proposalId, invoiceId: { not: null } },
          select: { totalPrice: true },
        });
        await tx.salesItem.deleteMany({ where: { proposalId, invoiceId: null } });

        const built = await this.buildItems(tx, pricingModel, items ?? [], {
          totalAmountItems,
          pricingModelDescription: rest.pricingModelDescription ?? existing.pricingModelDescription ?? undefined,
        });

        if (built.items.length > 0) {
          await tx.salesItem.createMany({
            data: built.items.map((item) => ({ ...item, proposalId })),
          });
        }

        // The retained billed items are still part of the proposal, so they stay in its
        // total — otherwise editing an unbilled row would silently shrink the proposal
        // below what has already been invoiced against it.
        const billedTotal = billed.reduce((acc, item) => acc + Number(item.totalPrice), 0);

        await tx.proposal.update({
          where: { id: proposalId },
          data: { totalAmountItems: this.round2(billedTotal + built.total) },
        });
      }

      // Winning the proposal is what mints its sales code — invoices are issued against it.
      if (dto.status === 'WIN' && !existing.salesCode) {
        await tx.proposal.update({
          where: { id: proposalId },
          data: { salesCode: await this.generateSalesCode(tx, proposalId, existing.code) },
        });
      }

      return this.presentOne(await this.loadFull(tx, proposalId));
    });
  }

  async remove(id: number) {
    const existing = await this.findOneRaw(id);

    if (existing.status === 'WIN') {
      throw new BadRequestException("Proposal with status 'WIN' cannot be modified.");
    }

    return serializeDecimals(
      await this.prisma.proposal.update({
        where: { id: BigInt(id) },
        data: { deletedAt: new Date() },
      }),
    );
  }

  private async findOneRaw(id: number) {
    const proposal = await this.loadFull(this.prisma, BigInt(id));

    if (!proposal) throw new NotFoundException(`Proposal with ID ${id} not found`);

    return proposal;
  }

  private loadFull(client: any, id: bigint) {
    return client.proposal.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { include: { customer: { include: { billingOptions: true } } } },
        salesItems: {
          include: { product: { include: { priceVersions: true } }, productPriceVersion: true },
          orderBy: [{ headerOrder: 'asc' }, { id: 'asc' }],
        },
        boqs: { include: { items: { include: { product: true } } } },
        invoices: {
          include: { salesItems: true, internalAccount: { include: { bank: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Turns the request payload into sales_items rows according to the pricing model:
   *  - A: one summary row carrying the manually entered proposal total.
   *  - B: selling price x qty, with qty snapshotted as title1.
   *  - C/D: selling price multiplied by every filled title value (title1..title4).
   */
  private async buildItems(
    tx: any,
    pricingModel: PricingModel,
    items: ProposalItemDto[],
    context: { totalAmountItems?: number; pricingModelDescription?: string | null },
  ): Promise<{ items: BuiltItem[]; total: number }> {
    if (pricingModel === PricingModel.A) {
      // Model A is a lump sum: the figure comes from totalAmountItems, and line
      // items have no meaning. Accepting them silently discarded the caller's
      // data and produced a zero-total proposal with no complaint.
      if (items.length > 0) {
        throw new BadRequestException(
          'Pricing model A bills a single lump sum. Send totalAmountItems instead of items.',
        );
      }

      const total = Number(context.totalAmountItems ?? 0);

      return {
        total,
        items: [
          {
            ...this.emptyItem(),
            description: context.pricingModelDescription ?? null,
            sellingPrice: total,
            totalPrice: total,
            title1Key: 'Qty',
            title1Value: 1,
          },
        ],
      };
    }

    const built: BuiltItem[] = [];
    let total = 0;

    for (const item of items) {
      const sellingPrice = Number(item.sellingPrice ?? 0);
      const product = item.productId
        ? await tx.product.findFirst({
            where: { id: BigInt(item.productId), deletedAt: null },
            include: { priceVersions: { where: { isActive: true }, take: 1 } },
          })
        : null;

      if (item.productId && !product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      let totalPrice: number;
      let title1Key = item.title1Key ?? null;
      let title1Value = item.title1Value ?? null;

      if (pricingModel === PricingModel.B) {
        const qty = Number(item.qty ?? item.title1Value ?? 0);
        title1Key = item.title1Key ?? 'Qty';
        title1Value = qty;
        totalPrice = qty * sellingPrice;
      } else {
        totalPrice = [item.title1Value, item.title2Value, item.title3Value, item.title4Value].reduce<number>(
          (acc, value) => (value ? acc * Number(value) : acc),
          sellingPrice,
        );
      }

      // Description falls back from manual entry to the product, then to the pricing model note.
      const description =
        item.description ?? product?.description ?? context.pricingModelDescription ?? null;

      built.push({
        productId: item.productId ? BigInt(item.productId) : null,
        productPriceVersionId: item.productPriceVersionId
          ? BigInt(item.productPriceVersionId)
          : (product?.priceVersions?.[0]?.id ?? null),
        description,
        sellingPrice,
        totalPrice,
        title1Key,
        title1Value,
        title2Key: item.title2Key ?? null,
        title2Value: item.title2Value ?? null,
        title3Key: item.title3Key ?? null,
        title3Value: item.title3Value ?? null,
        title4Key: item.title4Key ?? null,
        title4Value: item.title4Value ?? null,
        header: item.header ?? null,
        subheader: item.subheader ?? product?.name ?? description ?? null,
        headerOrder: item.headerOrder ?? 0,
      });

      total += totalPrice;
    }

    return { items: built, total };
  }

  private emptyItem(): BuiltItem {
    return {
      productId: null,
      productPriceVersionId: null,
      description: null,
      sellingPrice: 0,
      totalPrice: 0,
      title1Key: null,
      title1Value: null,
      title2Key: null,
      title2Value: null,
      title3Key: null,
      title3Value: null,
      title4Key: null,
      title4Value: null,
      header: null,
      subheader: null,
      headerOrder: 0,
    };
  }

  /** Adds the money the legacy Proposal model exposed as appended accessors. */
  private presentOne(proposal: any) {
    if (!proposal) return proposal;

    const basic = Number(proposal.totalAmountItems ?? 0);
    const fee = Number(proposal.managementFee ?? 0);
    const vatRate = Number(proposal.vatRate ?? 0);

    const calculatedManagementFee =
      proposal.managementFeeType === 'PERCENT' ? this.round2(basic * (fee / 100)) : this.round2(fee);
    const salesAmount = this.round2(basic + calculatedManagementFee);
    const vatAmount = this.round2(salesAmount * (vatRate / 100));
    const invoiceAmount = this.round2(salesAmount + vatAmount);

    return serializeDecimals({
      ...proposal,
      calculatedManagementFee,
      salesAmount,
      vatAmount,
      invoiceAmount,
    });
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async generateUniqueCode(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (;;) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase().padEnd(5, '0');
      const code = `PRP-${dateStr}-${random}`;
      const found = await this.prisma.proposal.findUnique({ where: { code } });
      if (!found) return code;
    }
  }

  /**
   * Regular-flow sales code: REG-{last 5 of proposal code}-{YYYYMMDD}-{3 digit sequence},
   * continuing from the proposal's latest invoice so it never collides with one already issued.
   */
  private async generateSalesCode(tx: any, proposalId: bigint, proposalCode: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const propCodeLast5 = (proposalCode ?? String(proposalId)).slice(-5).padStart(5, '0');

    const latestInvoice = await tx.invoice.findFirst({
      where: { proposalId },
      orderBy: { id: 'desc' },
    });

    const match = latestInvoice?.code?.match(/-(\d{3})$/);
    let sequence = match ? parseInt(match[1], 10) + 1 : 1;

    for (;;) {
      const candidate = `REG-${propCodeLast5}-${dateStr}-${String(sequence).padStart(3, '0')}`;

      const [invoiceClash, proposalClash] = await Promise.all([
        tx.invoice.findUnique({ where: { code: candidate } }),
        tx.proposal.findFirst({ where: { salesCode: candidate, id: { not: proposalId } } }),
      ]);

      if (!invoiceClash && !proposalClash) return candidate;
      sequence++;
    }
  }
}
