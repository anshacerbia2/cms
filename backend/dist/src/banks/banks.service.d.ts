import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto, CreateInternalAccountDto } from './dto/create-bank.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
declare const UpdateInternalAccountDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateInternalAccountDto>>;
declare class UpdateInternalAccountDto extends UpdateInternalAccountDto_base {
}
export declare class BanksService {
    private prisma;
    constructor(prisma: PrismaService);
    createBank(dto: CreateBankDto): Promise<{
        id: bigint;
        bankName: string;
        createdAt: Date;
        updatedAt: Date;
        bankCode: string;
        bankBrand: string | null;
        bankAddress: string | null;
    }>;
    findAllBanks(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    createInternalAccount(dto: CreateInternalAccountDto): Promise<{
        bank: {
            id: bigint;
            bankName: string;
            createdAt: Date;
            updatedAt: Date;
            bankCode: string;
            bankBrand: string | null;
            bankAddress: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        bankId: bigint;
        userId: bigint | null;
        type: import("@prisma/client").$Enums.InternalAccountType;
        accountNo: string;
        branch: string | null;
        swiftCode: string | null;
        holderName: string;
    }>;
    findAllInternalAccounts(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findOneInternalAccount(id: number): Promise<{
        bank: {
            id: bigint;
            bankName: string;
            createdAt: Date;
            updatedAt: Date;
            bankCode: string;
            bankBrand: string | null;
            bankAddress: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        bankId: bigint;
        userId: bigint | null;
        type: import("@prisma/client").$Enums.InternalAccountType;
        accountNo: string;
        branch: string | null;
        swiftCode: string | null;
        holderName: string;
    }>;
    updateInternalAccount(id: number, dto: UpdateInternalAccountDto): Promise<{
        bank: {
            id: bigint;
            bankName: string;
            createdAt: Date;
            updatedAt: Date;
            bankCode: string;
            bankBrand: string | null;
            bankAddress: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        bankId: bigint;
        userId: bigint | null;
        type: import("@prisma/client").$Enums.InternalAccountType;
        accountNo: string;
        branch: string | null;
        swiftCode: string | null;
        holderName: string;
    }>;
    removeInternalAccount(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        bankId: bigint;
        userId: bigint | null;
        type: import("@prisma/client").$Enums.InternalAccountType;
        accountNo: string;
        branch: string | null;
        swiftCode: string | null;
        holderName: string;
    }>;
}
export {};
