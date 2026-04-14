import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import { 
  Supplier, 
  SupplierQueryParams, 
  CreateSupplierInput, 
  UpdateSupplierInput 
} from "../types";
import { PaginatedResponse } from "@/types/pagination";

const SuppliersService = {
  findAll: async (params: SupplierQueryParams): Promise<PaginatedResponse<Supplier>> => {
    const response = await api.get("/suppliers", { params });
    return response.data;
  },

  findOne: async (id: string): Promise<Supplier> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: CreateSupplierInput): Promise<Supplier> => {
    const response = await api.post("/suppliers", data);
    return response.data;
  },

  update: async ({ id, ...data }: UpdateSupplierInput): Promise<Supplier> => {
    const response = await api.patch(`/suppliers/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};

export function useSuppliers(params: SupplierQueryParams = {}) {
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", params],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => SuppliersService.findAll(params),
    placeholderData: (previousData) => previousData,
  });

  const createSupplier = useMutation({
    mutationFn: SuppliersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: SuppliersService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: SuppliersService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  return {
    suppliersQuery,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
