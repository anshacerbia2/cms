import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto, CreateInternalAccountDto } from './dto/create-bank.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

class UpdateBankDto extends PartialType(CreateBankDto) {}
class UpdateInternalAccountDto extends PartialType(CreateInternalAccountDto) {}

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  // --- MASTER BANKS ---

  async createBank(dto: CreateBankDto) {
    return this.prisma.bank.create({ data: dto });
  }

  async findAllBanks(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search ? {
      OR: [
        { bankName: { contains: search, mode: 'insensitive' as const } },
        { bankCode: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.bank.findMany({
        where,
        skip,
        take: limit,
        orderBy: { bankName: 'asc' },
      }),
      this.prisma.bank.count({ where }),
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

  // --- INTERNAL ACCOUNTS ---

  async createInternalAccount(dto: CreateInternalAccountDto) {
    const { bankId, userId, ...data } = dto;
    return this.prisma.internalAccount.create({
      data: {
        ...data,
        bankId: BigInt(bankId),
        userId: userId ? BigInt(userId) : undefined,
      },
      include: {
        bank: true,
      }
    });
  }

  async findAllInternalAccounts(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search ? {
      OR: [
        { holderName: { contains: search, mode: 'insensitive' as const } },
        { accountNo: { contains: search, mode: 'insensitive' as const } },
        { bank: { bankName: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.internalAccount.findMany({
        where,
        skip,
        take: limit,
        include: {
          bank: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.internalAccount.count({ where }),
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

  async findOneInternalAccount(id: number) {
    const account = await this.prisma.internalAccount.findUnique({
      where: { id: BigInt(id) },
      include: { bank: true },
    });

    if (!account) {
      throw new NotFoundException(`Internal Account with ID ${id} not found`);
    }

    return account;
  }

  async updateInternalAccount(id: number, dto: UpdateInternalAccountDto) {
    const { bankId, userId, ...data } = dto;
    const updateData: any = { ...data };
    if (bankId) updateData.bankId = BigInt(bankId);
    if (userId) updateData.userId = BigInt(userId);

    return this.prisma.internalAccount.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        bank: true,
      }
    });
  }

  async removeInternalAccount(id: number) {
    await this.findOneInternalAccount(id);
    return this.prisma.internalAccount.delete({
      where: { id: BigInt(id) }
    });
  }
}
