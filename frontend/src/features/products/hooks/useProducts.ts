import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import { 
  Product, 
  ProductQueryParams, 
  CreateProductInput, 
  UpdateProductInput,
  ProductCategory,
  CreateProductCategoryInput
} from "../types";
import { PaginatedResponse, PaginationParams } from "@/types/pagination";

const ProductsService = {
  // Products
  findAll: async (params: ProductQueryParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get("/products", { params });
    return response.data;
  },

  findOne: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductInput): Promise<Product> => {
    const response = await api.post("/products", data);
    return response.data;
  },

  update: async ({ id, ...data }: UpdateProductInput): Promise<Product> => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // Categories
  findAllCategories: async (params: PaginationParams = { limit: 100 }): Promise<PaginatedResponse<ProductCategory>> => {
    const response = await api.get("/products/categories", { params });
    return response.data;
  },

  createCategory: async (data: CreateProductCategoryInput): Promise<ProductCategory> => {
    const response = await api.post("/products/categories", data);
    return response.data;
  },
};

export function useProducts(params: ProductQueryParams = {}) {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", params],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => ProductsService.findAll(params),
    placeholderData: (previousData) => previousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => ProductsService.findAllCategories(),
  });

  const createProduct = useMutation({
    mutationFn: ProductsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ProductsService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: ProductsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const createCategory = useMutation({
    mutationFn: ProductsService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    },
  });

  return {
    productsQuery,
    categoriesQuery,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
  };
}
