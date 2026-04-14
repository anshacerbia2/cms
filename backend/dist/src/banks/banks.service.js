"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_bank_dto_1 = require("./dto/create-bank.dto");
const mapped_types_1 = require("@nestjs/mapped-types");
class UpdateBankDto extends (0, mapped_types_1.PartialType)(create_bank_dto_1.CreateBankDto) {
}
class UpdateInternalAccountDto extends (0, mapped_types_1.PartialType)(create_bank_dto_1.CreateInternalAccountDto) {
}
let BanksService = class BanksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBank(dto) {
        return this.prisma.bank.create({ data: dto });
    }
    async findAllBanks(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search || '';
        const where = search ? {
            OR: [
                { bankName: { contains: search, mode: 'insensitive' } },
                { bankCode: { contains: search, mode: 'insensitive' } },
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
    async createInternalAccount(dto) {
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
    async findAllInternalAccounts(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search || '';
        const where = search ? {
            OR: [
                { holderName: { contains: search, mode: 'insensitive' } },
                { accountNo: { contains: search, mode: 'insensitive' } },
                { bank: { bankName: { contains: search, mode: 'insensitive' } } },
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
    async findOneInternalAccount(id) {
        const account = await this.prisma.internalAccount.findUnique({
            where: { id: BigInt(id) },
            include: { bank: true },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Internal Account with ID ${id} not found`);
        }
        return account;
    }
    async updateInternalAccount(id, dto) {
        const { bankId, userId, ...data } = dto;
        const updateData = { ...data };
        if (bankId)
            updateData.bankId = BigInt(bankId);
        if (userId)
            updateData.userId = BigInt(userId);
        return this.prisma.internalAccount.update({
            where: { id: BigInt(id) },
            data: updateData,
            include: {
                bank: true,
            }
        });
    }
    async removeInternalAccount(id) {
        await this.findOneInternalAccount(id);
        return this.prisma.internalAccount.delete({
            where: { id: BigInt(id) }
        });
    }
};
exports.BanksService = BanksService;
exports.BanksService = BanksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BanksService);
//# sourceMappingURL=banks.service.js.map