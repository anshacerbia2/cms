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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const mapped_types_1 = require("@nestjs/mapped-types");
class UpdateProductDto extends (0, mapped_types_1.PartialType)(create_product_dto_1.CreateProductDto) {
}
class UpdateProductCategoryDto extends (0, mapped_types_1.PartialType)(create_product_dto_1.CreateProductCategoryDto) {
}
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCategory(dto) {
        return this.prisma.productCategory.create({ data: dto });
    }
    async findAllCategories(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search || '';
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
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
    async create(dto) {
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
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = query.search || '';
        const where = {
            deletedAt: null,
            AND: [
                query.categoryId ? { categoryId: BigInt(query.categoryId) } : {},
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { code: { contains: search, mode: 'insensitive' } },
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }
    async update(id, dto) {
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id: BigInt(id) },
            data: { deletedAt: new Date() }
        });
    }
    async generateUniqueCode() {
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map