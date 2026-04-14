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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCustomerDto) {
        const { billingOptions, pics, ...customerData } = createCustomerDto;
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return customer;
    }
    async update(id, updateCustomerDto) {
        const { billingOptions, pics, ...customerData } = updateCustomerDto;
        const customerId = BigInt(id);
        await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: customerData,
            });
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.customer.update({
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
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map