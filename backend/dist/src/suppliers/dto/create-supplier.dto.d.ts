export declare enum SupplierStatus {
    Active = "Active",
    Inactive = "Inactive"
}
declare class CreateSupplierPicDto {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    notes?: string;
    status?: 'active' | 'inactive';
}
export declare class CreateSupplierDto {
    name: string;
    address?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    status?: SupplierStatus;
    notes?: string;
    pics?: CreateSupplierPicDto[];
}
export {};
