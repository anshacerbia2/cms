import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateProductCategoryDto } from './dto/create-product.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

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
    const { categoryId, supplierId, ...data } = dto;
    const code = await this.generateUniqueCode();

    return this.prisma.product.create({
      data: {
        ...data,
        code,
        categoryId: categoryId ? BigInt(categoryId) : undefined,
        supplierId: supplierId ? BigInt(supplierId) : undefined,
      },
      include: {
        category: true,
        supplier: true,
      }
    });
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
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

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { 
        id: BigInt(id),
        deletedAt: null 
      },
      include: {
        category: true,
        supplier: true,
      }
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    const { categoryId, supplierId, ...data } = dto;
    
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        categoryId: categoryId ? BigInt(categoryId) : undefined,
        supplierId: supplierId ? BigInt(supplierId) : undefined,
      },
      include: {
        category: true,
        supplier: true,
      }
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() }
    });
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
