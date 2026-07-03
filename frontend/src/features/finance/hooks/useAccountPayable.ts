import { useQuery, useMutation, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaginationParams, PaginatedResponse } from "./useFinance";
import { accountPayableService } from "../services/accountPayable.service";

export function useAccountPayable() {
  const queryClient = useQueryClient();

  const getAP = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "account-payable", params],
      queryFn: () => accountPayableService.getAP(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllAP = (year?: number, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "account-payable", "all", year],
      queryFn: () => accountPayableService.getAllAP(year),
      ...options,
    });

  const getApTaxLedger = (params: PaginationParams & { type?: 'WAPU' | 'NON_WAPU' }, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "account-payable", "tax-ledger", params],
      queryFn: () => accountPayableService.getApTaxLedger(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllApTaxLedger = (params: { type?: 'WAPU' | 'NON_WAPU' }, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "account-payable", "tax-ledger", "all", params],
      queryFn: () => accountPayableService.getAllApTaxLedger(params),
      ...options,
    });

  const createAP = useMutation({
    mutationFn: (payload: any) => accountPayableService.createAP(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable"] });
    },
  });

  const createBulkAP = useMutation({
    mutationFn: (payload: { data: any[], tagYear: number }) => accountPayableService.createBulkAP(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable"] });
      toast.success("Bulk Account Payables created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bulk records");
    }
  });

  const createTaxLedger = useMutation({
    mutationFn: (payload: any) => accountPayableService.createTaxLedger(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable", "tax-ledger"] });
    },
  });

  const createBulkTaxLedger = useMutation({
    mutationFn: (payload: { data: any[], tagYear: number }) => accountPayableService.createBulkTaxLedger(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable", "tax-ledger"] });
      toast.success("Bulk Tax Ledger records created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bulk tax records");
    }
  });

  const updateAP = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => accountPayableService.updateAP(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable"] });
      toast.success("Account Payable updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update record");
    }
  });

  const deleteAP = useMutation({
    mutationFn: (id: number) => accountPayableService.deleteAP(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-payable"] });
      toast.success("Account Payable deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete record");
    }
  });

  return {
    getAP,
    getAllAP,
    getApTaxLedger,
    getAllApTaxLedger,
    createAP,
    createBulkAP,
    createTaxLedger,
    createBulkTaxLedger,
    updateAP,
    deleteAP,
  };
}
