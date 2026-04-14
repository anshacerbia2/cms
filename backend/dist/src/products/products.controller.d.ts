import { ProductsService } from './products.service';
import { CreateProductDto, CreateProductCategoryDto } from './dto/create-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    createCategory(dto: CreateProductCategoryDto): Promise<{
        name: string;
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllCategories(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
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
    }): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
    findOne(id: string): Promise<{
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
    update(id: string, dto: any): Promise<{
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
    remove(id: string): Promise<{
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
}
