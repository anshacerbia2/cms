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
    mutationFn: (payload: { data: any[], tagYear: number }) => accountReceivableService.createBulkAR(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-receivable"] });
      toast.success("Bulk Account Receivables created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bulk records");
    }
  });

  const updateAR = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => accountReceivableService.updateAR(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-receivable"] });
      toast.success("Account Receivable updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update record");
    }
  });

  const deleteAR = useMutation({
    mutationFn: (id: number) => accountReceivableService.deleteAR(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-receivable"] });
      toast.success("Account Receivable deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete record");
    }
  });

  return {
    getAR,
    getAllAR,
    createAR,
    createBulkAR,
    updateAR,
    deleteAR,
  };
}
