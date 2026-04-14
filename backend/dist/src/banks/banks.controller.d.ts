import { BanksService } from './banks.service';
import { CreateBankDto, CreateInternalAccountDto } from './dto/create-bank.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class BanksController {
    private readonly banksService;
    constructor(banksService: BanksService);
    createBank(dto: CreateBankDto): Promise<{
        id: bigint;
        bankName: string;
        createdAt: Date;
        updatedAt: Date;
        bankCode: string;
        bankBrand: string | null;
        bankAddress: string | null;
    }>;
    findAllBanks(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
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
    findAllInternalAccounts(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
    findOneInternalAccount(id: string): Promise<{
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
    updateInternalAccount(id: string, dto: any): Promise<{
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
    removeInternalAccount(id: string): Promise<{
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
