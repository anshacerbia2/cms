import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    const { pics, ...supplierData } = createSupplierDto;
    const code = await this.generateUniqueCode();

    return this.prisma.supplier.create({
      data: {
        ...supplierData,
        code,
        pics: pics ? {
          create: pics
        } : undefined
      },
      include: {
        pics: true
      }
    });
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where: any = {
      deletedAt: null,
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { pics: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { 
        id: BigInt(id),
        deletedAt: null 
      },
      include: {
        pics: true
      }
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const { pics, ...supplierData } = updateSupplierDto;
    const supplierId = BigInt(id);
    
    // Check if exists
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update main supplier data
      await tx.supplier.update({
        where: { id: supplierId },
        data: supplierData,
      });

      // 2. Sync PICs (Delete and Recreate)
      if (pics) {
        await tx.supplierPic.deleteMany({
          where: { supplierId: supplierId },
        });
        if (pics.length > 0) {
          await tx.supplierPic.createMany({
            data: pics.map(pic => ({
              ...pic,
              supplierId: supplierId,
            })),
          });
        }
      }

      return tx.supplier.findUnique({
        where: { id: supplierId },
        include: { pics: true },
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() }
    });
  }

  private async generateUniqueCode(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    let code = '';
    let exists = true;

    while (exists) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      code = `SUP-${dateStr}-${random}`;
      
      const found = await this.prisma.supplier.findUnique({
        where: { code }
      });
      
      if (!found) {
        exists = false;
      }
    }

    return code;
  }
}
