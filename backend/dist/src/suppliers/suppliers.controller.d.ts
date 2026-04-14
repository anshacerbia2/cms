import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(createSupplierDto: CreateSupplierDto): Promise<{
        pics: {
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
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
    }>;
    findAll(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        pics: {
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
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
    }>;
    update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<({
        pics: {
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
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
    }) | null>;
    remove(id: string): Promise<{
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
    }>;
}
