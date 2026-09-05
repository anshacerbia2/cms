import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateProductCategoryDto } from './dto/create-product.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { serializeDecimals } from '../common/utils/format.utils';

class UpdateProductDto extends PartialType(CreateProductDto) {}
class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) {}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // --- CATEGORIES ---

  async createCategory(dto: CreateProductCategoryDto) {
    return this.prisma.productCategory.create({ data: dto });
  }

  async findAllCategories(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } }
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // --- PRODUCTS ---

  async create(dto: CreateProductDto) {
    const { categoryId, supplierId, price, ...data } = dto;
    const code = await this.generateUniqueCode();

    const product = await this.prisma.product.create({
      data: {
        ...data,
        code,
        categoryId: categoryId ? BigInt(categoryId) : undefined,
        supplierId: supplierId ? BigInt(supplierId) : undefined,
        // A product without a price version cannot be put on a BoQ, so version 1
        // is opened right away whenever a price is supplied.
        priceVersions: price !== undefined
          ? { create: { version: 1, price, isActive: true, effectiveFrom: new Date() } }
          : undefined,
      },
      include: {
        category: true,
        supplier: true,
        priceVersions: { where: { isActive: true }, take: 1 },
      }
    });

    return this.withActivePrice(product);
  }

  async findAll(query: PaginationQueryDto & { categoryId?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {
      deletedAt: null,
      AND: [
        query.categoryId ? { categoryId: BigInt(query.categoryId) } : {},
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      ]
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          supplier: true,
          priceVersions: { where: { isActive: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((product) => this.withActivePrice(product)),
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { 
        id: BigInt(id),
        deletedAt: null 
      },
      include: {
        category: true,
        supplier: true,
        priceVersions: { orderBy: { version: 'desc' } },
      }
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.withActivePrice(product);
  }

  async update(id: number, dto: UpdateProductDto) {
    const { categoryId, supplierId, price, ...data } = dto;
    const productId = BigInt(id);

    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (price !== undefined) {
        await this.rotatePriceVersion(tx, productId, price);
      }

      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...data,
          categoryId: categoryId ? BigInt(categoryId) : undefined,
          supplierId: supplierId ? BigInt(supplierId) : undefined,
        },
        include: {
          category: true,
          supplier: true,
          priceVersions: { where: { isActive: true }, take: 1 },
        }
      });

      return this.withActivePrice(product);
    });
  }

  /**
   * Closes the active price version and opens the next one when the price actually
   * changed, so BoQ/sales items keep pointing at the version they were quoted on.
   */
  private async rotatePriceVersion(tx: any, productId: bigint, price: number) {
    const current = await tx.productPriceVersion.findFirst({
      where: { productId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!current) {
      const latest = await tx.productPriceVersion.findFirst({
        where: { productId },
        orderBy: { version: 'desc' },
      });
      await tx.productPriceVersion.create({
        data: {
          productId,
          version: (latest?.version ?? 0) + 1,
          price,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });
      return;
    }

    if (Number(current.price) === Number(price)) return;

    await tx.productPriceVersion.update({
      where: { id: current.id },
      data: { isActive: false, effectiveUntil: new Date() },
    });

    await tx.productPriceVersion.create({
      data: {
        productId,
        version: current.version + 1,
        price,
        isActive: true,
        effectiveFrom: new Date(),
      },
    });
  }

  /** Exposes the active price version as `activePriceVersion` / `price`. */
  private withActivePrice(product: any) {
    const activePriceVersion = (product.priceVersions ?? []).find((v: any) => v.isActive) ?? null;

    return serializeDecimals({
      ...product,
      activePriceVersion,
      price: activePriceVersion ? activePriceVersion.price : null,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return serializeDecimals(await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() }
    }));
  }

  private async generateUniqueCode(): Promise<string> {
    let code = '';
    let exists = true;

    while (exists) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      code = `PRD-${random}`;
      
      const found = await this.prisma.product.findUnique({
        where: { code }
      });
      
      if (!found) {
        exists = false;
      }
    }

    return code;
  }
}
