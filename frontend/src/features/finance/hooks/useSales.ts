import { useQuery, useMutation, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaginationParams, PaginatedResponse } from "./useFinance";
import { salesService } from "../services/sales.service";

export function useSales() {
  const queryClient = useQueryClient();

  const getSales = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "sales", params],
      queryFn: () => salesService.getSales(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllSales = (year?: number, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "sales", "all", year],
      queryFn: () => salesService.getAllSales(year),
      ...options,
    });

  const createSales = useMutation({
    mutationFn: (payload: any) => salesService.createSales(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "sales"] });
    },
  });

  const createBulkSales = useMutation({
    mutationFn: (payload: { data: any[], tagYear: number }) => salesService.createBulkSales(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "sales"] });
      toast.success("Bulk Sales records created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bulk sales records");
    }
  });

  const getSalesById = (id: number | null, options?: any) => 
    useQuery<any>({
      queryKey: ["finance", "sales", id],
      queryFn: () => salesService.getSalesById(id!),
      enabled: !!id,
      ...options,
    });

  const updateSales = useMutation({
      mutationFn: ({ id, data }: { id: number, data: any }) => salesService.updateSales(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "sales"] });
      }
    });

  const deleteSales = useMutation({
      mutationFn: (id: number) => salesService.deleteSales(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "sales"] });
        toast.success("Sales record deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete sales record");
      }
    });

  return {
    getSales,
    getAllSales,
    createSales,
    createBulkSales,
    getSalesById,
    updateSales,
    deleteSales,
  };
}
