import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { billingOptions, pics, ...customerData } = createCustomerDto;
    
    // Generate unique code: CST-YYYYMMDD-RAND5
    const code = await this.generateUniqueCode();

    return this.prisma.customer.create({
      data: {
        ...customerData,
        code,
        billingOptions: billingOptions ? {
          create: billingOptions
        } : undefined,
        pics: pics ? {
          create: pics
        } : undefined
      },
      include: {
        billingOptions: true,
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
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              billingOptions: true,
              pics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: { 
        id: BigInt(id),
        deletedAt: null 
      },
      include: {
        billingOptions: true,
        pics: true
      }
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const { billingOptions, pics, ...customerData } = updateCustomerDto;
    const customerId = BigInt(id);
    
    // Check if exists
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update main customer data
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: customerData,
      });

      // 2. Sync Billing Options (Delete and Recreate)
      if (billingOptions) {
        await tx.billingOption.deleteMany({
          where: { customerId: customerId },
        });
        if (billingOptions.length > 0) {
          await tx.billingOption.createMany({
            data: billingOptions.map(opt => ({
              ...opt,
              customerId: customerId,
            })),
          });
        }
      }

      // 3. Sync PICs (Delete and Recreate)
      if (pics) {
        await tx.customerPic.deleteMany({
          where: { customerId: customerId },
        });
        if (pics.length > 0) {
          await tx.customerPic.createMany({
            data: pics.map(pic => ({
              ...pic,
              customerId: customerId,
            })),
          });
        }
      }

      return tx.customer.findUnique({
        where: { id: customerId },
        include: {
          billingOptions: true,
          pics: true,
        },
      });
    });
  }

  async remove(id: number) {
    // Soft delete
    await this.findOne(id);

    return this.prisma.customer.update({
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
      code = `CST-${dateStr}-${random}`;
      
      const found = await this.prisma.customer.findUnique({
        where: { code }
      });
      
      if (!found) {
        exists = false;
      }
    }

    return code;
  }
}
