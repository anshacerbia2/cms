import { ProductsService } from './products.service';
import { CreateProductDto, CreateProductCategoryDto } from './dto/create-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    createCategory(dto: CreateProductCategoryDto): Promise<{
        id: bigint;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllCategories(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
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
    }): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
    findOne(id: string): Promise<{
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
    update(id: string, dto: any): Promise<{
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
    remove(id: string): Promise<{
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
}
