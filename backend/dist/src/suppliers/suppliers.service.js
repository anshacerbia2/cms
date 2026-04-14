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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createSupplierDto) {
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
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search || '';
        const where = {
            deletedAt: null,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Supplier with ID ${id} not found`);
        }
        return supplier;
    }
    async update(id, updateSupplierDto) {
        const { pics, ...supplierData } = updateSupplierDto;
        const supplierId = BigInt(id);
        await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            await tx.supplier.update({
                where: { id: supplierId },
                data: supplierData,
            });
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.supplier.update({
            where: { id: BigInt(id) },
            data: { deletedAt: new Date() }
        });
    }
    async generateUniqueCode() {
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
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map