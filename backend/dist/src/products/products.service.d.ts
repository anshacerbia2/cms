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
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllCategories(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    create(dto: CreateProductDto): Promise<{
        supplier: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            createdAt: Date;
            updatedAt: Date;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            notes: string | null;
            code: string;
            deletedAt: Date | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            name: string;
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        code: string;
        deletedAt: Date | null;
        supplierId: bigint | null;
        unit: string;
        categoryId: bigint | null;
    }>;
    findAll(query: PaginationQueryDto & {
        categoryId?: string;
    }): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        supplier: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            createdAt: Date;
            updatedAt: Date;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            notes: string | null;
            code: string;
            deletedAt: Date | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            name: string;
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        code: string;
        deletedAt: Date | null;
        supplierId: bigint | null;
        unit: string;
        categoryId: bigint | null;
    }>;
    update(id: number, dto: UpdateProductDto): Promise<{
        supplier: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.SupplierStatus;
            createdAt: Date;
            updatedAt: Date;
            bankName: string | null;
            bankAccountNumber: string | null;
            bankAccountName: string | null;
            notes: string | null;
            code: string;
            deletedAt: Date | null;
            address: string | null;
            contactPerson: string | null;
            taxNumber: string | null;
        } | null;
        category: {
            name: string;
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null;
    } & {
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        code: string;
        deletedAt: Date | null;
        supplierId: bigint | null;
        unit: string;
        categoryId: bigint | null;
    }>;
    remove(id: number): Promise<{
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        code: string;
        deletedAt: Date | null;
        supplierId: bigint | null;
        unit: string;
        categoryId: bigint | null;
    }>;
    private generateUniqueCode;
}
export {};
