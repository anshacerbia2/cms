export declare class CreateProductCategoryDto {
    name: string;
    description?: string;
}
export declare class CreateProductDto {
    name: string;
    description?: string;
    unit: string;
    categoryId?: string;
    supplierId?: string;
}
