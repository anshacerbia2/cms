export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  categoryId?: string;
  supplierId?: string;
  category?: ProductCategory;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  unit: string;
  categoryId?: string;
  supplierId?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export interface CreateProductCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateProductCategoryInput extends Partial<CreateProductCategoryInput> {
  id: string;
}
