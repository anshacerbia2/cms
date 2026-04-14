import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(createSupplierDto: CreateSupplierDto): Promise<{
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
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
    }>;
    findAll(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
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
    }>;
    update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<({
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
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
    }) | null>;
    remove(id: string): Promise<{
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
    }>;
}
