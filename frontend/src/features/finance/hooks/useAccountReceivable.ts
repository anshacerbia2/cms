import { useQuery, useMutation, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaginationParams, PaginatedResponse } from "./useFinance";
import { accountReceivableService } from "../services/accountReceivable.service";

export function useAccountReceivable() {
  const queryClient = useQueryClient();

  const getAR = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "account-receivable", params],
      queryFn: () => accountReceivableService.getAR(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllAR = (year?: number, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "account-receivable", "all", year],
      queryFn: () => accountReceivableService.getAllAR(year),
      ...options,
    });

  const createAR = useMutation({
    mutationFn: (payload: any) => accountReceivableService.createAR(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-receivable"] });
    },
  });

  const createBulkAR = useMutation({
    mutationFn: (payload: any[]) => accountReceivableService.createBulkAR(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-receivable"] });
      toast.success("Bulk Account Receivables created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bulk records");
    }
  });

  return {
    getAR,
    getAllAR,
    createAR,
    createBulkAR,
  };
}
