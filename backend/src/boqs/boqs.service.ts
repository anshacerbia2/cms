import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoqDto, BoqItemDto } from './dto/create-boq.dto';
import { UpdateBoqDto } from './dto/update-boq.dto';
import { BoqQueryDto } from './dto/boq-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

@Injectable()
export class BoqsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBoqDto) {
    const { proposalId, items = [] } = dto;

    if (proposalId) await this.assertProposalIsWin(this.prisma, proposalId);

    const code = await this.generateUniqueCode();

    return this.prisma.$transaction(async (tx) => {
      const boq = await tx.boq.create({
        data: {
          code,
          proposalId: proposalId ? BigInt(proposalId) : null,
          totalAmountItems: 0,
        },
      });

      const built = await this.buildItems(tx, items);

      if (built.items.length > 0) {
        await tx.boqItem.createMany({
          data: built.items.map((item) => ({ ...item, boqId: boq.id })),
        });
      }

      await tx.boq.update({
        where: { id: boq.id },
        data: { totalAmountItems: built.total },
      });

      return serializeDecimals(await this.loadFull(tx, boq.id));
    });
  }

  async findAll(query: BoqQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {};
    if (query.proposalId) where.proposalId = BigInt(query.proposalId);
    if (query.unbound === 'true') where.proposalId = null;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' as const } },
        { proposal: { code: { contains: search, mode: 'insensitive' as const } } },
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' as const } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.boq.findMany({
        where,
        skip,
        take: limit,
        include: {
          proposal: { select: { id: true, code: true, status: true, salesCode: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.boq.count({ where }),
    ]);

    return {
      data: serializeDecimals(data),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return serializeDecimals(await this.findOneRaw(id));
  }

  async update(id: number, dto: UpdateBoqDto) {
    const existing = await this.findOneRaw(id);

    // A BoQ attached to a proposal is only editable once that proposal is won.
    if (existing.proposal && existing.proposal.status !== 'WIN') {
      throw new BadRequestException("BoQ cannot be modified because the associated proposal is not 'WIN'.");
    }

    const { proposalId, items } = dto;
    const boqId = BigInt(id);

    if (proposalId) await this.assertProposalIsWin(this.prisma, proposalId);

    return this.prisma.$transaction(async (tx) => {
      if (proposalId !== undefined) {
        await tx.boq.update({
          where: { id: boqId },
          data: { proposalId: proposalId ? BigInt(proposalId) : null },
        });
      }

      if (items !== undefined) {
        await tx.boqItem.deleteMany({ where: { boqId } });

        const built = await this.buildItems(tx, items);

        if (built.items.length > 0) {
          await tx.boqItem.createMany({
            data: built.items.map((item) => ({ ...item, boqId })),
          });
        }

        await tx.boq.update({
          where: { id: boqId },
          data: { totalAmountItems: built.total },
        });
      }

      return serializeDecimals(await this.loadFull(tx, boqId));
    });
  }

  async remove(id: number) {
    await this.findOneRaw(id);
    return serializeDecimals(await this.prisma.boq.delete({ where: { id: BigInt(id) } }));
  }

  async removeMany(boqIds: number[]) {
    const ids = boqIds.map((id) => BigInt(id));
    await this.assertAllExist(ids);

    const { count } = await this.prisma.boq.deleteMany({ where: { id: { in: ids } } });
    return { deleted: count };
  }

  /**
   * Binds BoQs to a proposal. An unbound BoQ is moved as-is; one that already belongs
   * to another proposal is copied (with its items) so the original quotation stays intact.
   */
  async replicate(boqIds: number[], proposalId?: number) {
    const ids = boqIds.map((id) => BigInt(id));

    if (proposalId) await this.assertProposalIsWin(this.prisma, proposalId);
    await this.assertAllExist(ids);

    return this.prisma.$transaction(async (tx) => {
      const boqs = await tx.boq.findMany({ where: { id: { in: ids } }, include: { items: true } });
      const result: any[] = [];

      for (const boq of boqs) {
        if (boq.proposalId === null) {
          result.push(
            await tx.boq.update({
              where: { id: boq.id },
              data: { proposalId: proposalId ? BigInt(proposalId) : null },
              include: { items: true },
            }),
          );
          continue;
        }

        const copy = await tx.boq.create({
          data: {
            code: await this.generateUniqueCode(tx),
            proposalId: proposalId ? BigInt(proposalId) : null,
            totalAmountItems: boq.totalAmountItems,
          },
        });

        if (boq.items.length > 0) {
          await tx.boqItem.createMany({
            data: boq.items.map(({ id, boqId, createdAt, updatedAt, ...item }) => ({
              ...item,
              boqId: copy.id,
            })),
          });
        }

        result.push(await this.loadFull(tx, copy.id));
      }

      return serializeDecimals(result);
    });
  }

  async unbind(boqIds: number[]) {
    const ids = boqIds.map((id) => BigInt(id));
    await this.assertAllExist(ids);

    return this.prisma.$transaction(async (tx) => {
      const boqs = await tx.boq.findMany({ where: { id: { in: ids } } });

      for (const boq of boqs) {
        if (boq.proposalId === null) {
          throw new BadRequestException(`BoQ with ID ${boq.id} is not associated with any proposal.`);
        }
      }

      await tx.boq.updateMany({ where: { id: { in: ids } }, data: { proposalId: null } });

      return serializeDecimals(
        await tx.boq.findMany({ where: { id: { in: ids } }, include: { items: true } }),
      );
    });
  }

  private async findOneRaw(id: number) {
    const boq = await this.loadFull(this.prisma, BigInt(id));
    if (!boq) throw new NotFoundException(`BoQ with ID ${id} not found`);
    return boq;
  }

  private loadFull(client: any, id: bigint) {
    return client.boq.findUnique({
      where: { id },
      include: {
        proposal: { include: { project: { include: { customer: true } } } },
        items: {
          include: { product: { include: { priceVersions: true } }, productPriceVersion: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  /**
   * Snapshots each line against the product's active price version:
   * total = qty x freq x selling price, with the unit copied from the product.
   */
  private async buildItems(tx: any, items: BoqItemDto[]) {
    const built: any[] = [];
    let total = 0;

    for (const item of items) {
      const product = await tx.product.findFirst({
        where: { id: BigInt(item.productId), deletedAt: null },
        include: { priceVersions: { where: { isActive: true }, take: 1 } },
      });

      if (!product) throw new NotFoundException(`Product with ID ${item.productId} not found`);

      const activePriceVersion = product.priceVersions[0];
      if (!activePriceVersion) {
        throw new BadRequestException(`Product ${product.name} has no active price version.`);
      }

      const sellingPrice = Number(item.sellingPrice ?? activePriceVersion.price);
      const totalPrice = this.round2(Number(item.qty) * Number(item.freq) * sellingPrice);

      built.push({
        productId: product.id,
        productPriceVersionId: activePriceVersion.id,
        description: item.description ?? product.description ?? null,
        sellingPrice,
        qty: item.qty,
        qtyUnit: item.qtyUnit ?? product.unit,
        freq: item.freq,
        freqUnit: item.freqUnit ?? null,
        totalPrice,
      });

      total += totalPrice;
    }

    return { items: built, total: this.round2(total) };
  }

  private async assertProposalIsWin(client: any, proposalId: number) {
    const proposal = await client.proposal.findFirst({
      where: { id: BigInt(proposalId), deletedAt: null },
    });

    if (!proposal) throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    if (proposal.status !== 'WIN') {
      throw new BadRequestException("Cannot bind a BoQ to a proposal that is not 'WIN'.");
    }

    return proposal;
  }

  private async assertAllExist(ids: bigint[]) {
    const found = await this.prisma.boq.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const foundIds = new Set(found.map((b) => b.id.toString()));
    const missing = ids.filter((id) => !foundIds.has(id.toString()));

    if (missing.length > 0) {
      throw new NotFoundException(`BoQs with IDs [${missing.join(', ')}] not found.`);
    }
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async generateUniqueCode(client: any = this.prisma): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (;;) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase().padEnd(5, '0');
      const code = `BOQ-${dateStr}-${random}`;
      const found = await client.boq.findUnique({ where: { code } });
      if (!found) return code;
    }
  }
}
