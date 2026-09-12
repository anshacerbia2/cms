import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto, CreateInternalAccountDto, UpdateBankDto, UpdateInternalAccountDto } from './dto/create-bank.dto';
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
export class BanksService {
  constructor(private prisma: PrismaService) {}

  // --- MASTER BANKS ---

  async createBank(dto: CreateBankDto) {
    await this.assertBankCodeFree(dto.bankCode);
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

  async findOneBank(id: number) {
    const bank = await this.prisma.bank.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { internalAccounts: true } } },
    });

    if (!bank) throw new NotFoundException(`Bank with ID ${id} not found`);
    return bank;
  }

  async updateBank(id: number, dto: UpdateBankDto) {
    await this.findOneBank(id);
    if (dto.bankCode) await this.assertBankCodeFree(dto.bankCode, BigInt(id));

    return this.prisma.bank.update({ where: { id: BigInt(id) }, data: dto });
  }

  async removeBank(id: number) {
    const bank = await this.findOneBank(id);

    // internal_accounts.bank_id is ON DELETE RESTRICT, so this would fail as a
    // raw database error. Name what is actually holding the row instead.
    if (bank._count.internalAccounts > 0) {
      throw new BadRequestException(
        `"${bank.bankName}" is still used by ${bank._count.internalAccounts} internal account(s). Remove those first.`,
      );
    }

    return this.prisma.bank.delete({ where: { id: BigInt(id) } });
  }

  private async assertBankCodeFree(bankCode: string, exceptId?: bigint) {
    const existing = await this.prisma.bank.findUnique({ where: { bankCode } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Bank code "${bankCode}" is already used.`);
    }
  }

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

  // --- FISCAL PERIODS ---

  async findAllFiscalPeriods(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';
    const accountId = query.accountId ? BigInt(query.accountId) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    const where: any = { AND: [] };

    if (accountId) {
      where.AND.push({ internalAccountId: accountId });
    }

    if (year) {
      where.AND.push({ year });
    }

    if (search) {
      where.AND.push({
        OR: [
          { internalAccount: { holderName: { contains: search, mode: 'insensitive' as const } } },
          { internalAccount: { accountNo: { contains: search, mode: 'insensitive' as const } } },
        ],
      });
    }

    // Clean up empty AND
    if (where.AND.length === 0) delete where.AND;

    const [data, total] = await Promise.all([
      this.prisma.fiscalPeriod.findMany({
        where,
        skip,
        take: limit,
        include: {
          internalAccount: {
            include: {
              bank: true,
            }
          },
        },
        orderBy: [{ year: 'desc' }, { internalAccount: { holderName: 'asc' } }],
      }),
      this.prisma.fiscalPeriod.count({ where }),
    ]);

    return {
      data: data.map(p => ({
        ...p,
        id: p.id.toString(),
        internalAccountId: p.internalAccountId.toString(),
        openingBalance: formatDecimal(p.openingBalance),
        closingBalance: p.closingBalance ? formatDecimal(p.closingBalance) : null,
      })),
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
