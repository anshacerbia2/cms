export interface SupplierPic {
  id: string;
  supplierId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pics?: SupplierPic[];
  _count?: {
    pics: number;
    products: number;
  };
}

export interface SupplierResponse {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface SupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateSupplierInput {
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  pics?: Partial<Omit<SupplierPic, 'id' | 'supplierId' | 'createdAt' | 'updatedAt'>>[];
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  id: string;
}
