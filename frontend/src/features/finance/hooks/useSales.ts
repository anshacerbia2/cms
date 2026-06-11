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

  return {
    getSales,
    getAllSales,
    createSales,
    createBulkSales,
  };
}
