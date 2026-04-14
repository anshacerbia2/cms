import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateProductCategoryDto } from './dto/create-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
declare const UpdateProductDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateProductDto>>;
declare class UpdateProductDto extends UpdateProductDto_base {
}
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    createCategory(dto: CreateProductCategoryDto): Promise<{
        id: bigint;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllCategories(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    create(dto: CreateProductDto): Promise<{
        supplier: {
            id: bigint;
            code: string;
            name: string;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            id: bigint;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        id: bigint;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        unit: string;
        categoryId: bigint | null;
        supplierId: bigint | null;
    }>;
    findAll(query: PaginationQueryDto & {
        categoryId?: string;
    }): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        supplier: {
            id: bigint;
            code: string;
            name: string;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            id: bigint;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        id: bigint;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        unit: string;
        categoryId: bigint | null;
        supplierId: bigint | null;
    }>;
    update(id: number, dto: UpdateProductDto): Promise<{
        supplier: {
            id: bigint;
            code: string;
            name: string;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            id: bigint;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        id: bigint;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        unit: string;
        categoryId: bigint | null;
        supplierId: bigint | null;
    }>;
    remove(id: number): Promise<{
        id: bigint;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        unit: string;
        categoryId: bigint | null;
        supplierId: bigint | null;
    }>;
    private generateUniqueCode;
}
export {};
