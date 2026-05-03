import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { PaginationParams, PaginatedResponse } from "./useFinance";
import { bankMutationService } from "../services/bankMutation.service";

export function useBankMutation() {
  const queryClient = useQueryClient();

  const getTransactions = (params: PaginationParams, options?: any) => 
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "bank-mutation", "transactions", params],
      queryFn: () => bankMutationService.getTransactions(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllTransactions = (accountId?: string, year?: string, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "bank-mutation", "transactions", "all", accountId, year],
      queryFn: () => bankMutationService.getAllTransactions(accountId, year),
      ...options,
    });

  const createBulkTransactions = () => {
    return async (payload: { data: any[]; accountId: string; year: number; startingBalance?: string }) => {
      const data = await bankMutationService.createBulkTransactions(payload);
      queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
      return data;
    };
  };

  const getAnchorBalance = (accountId: string, year: number, options?: any) =>
    useQuery<{ balance: number | null, status: 'OPEN' | 'ONGOING' | 'CLOSED' | 'INITIAL', isStale?: boolean, message?: string, referredYear?: number, canEdit?: boolean } | null>({
      queryKey: ["finance", "bank-mutation", "anchor-balance", accountId, year],
      queryFn: () => bankMutationService.getAnchorBalance(accountId, year),
      enabled: !!accountId && !!year,
      ...options,
    });

  const getFiscalPeriods = (accountId: string, year?: number, options?: any) =>
    useQuery<any | null>({
      queryKey: ["finance", "bank-mutation", "fiscal-periods", accountId, year],
      queryFn: () => bankMutationService.getFiscalPeriods(accountId, year),
      enabled: !!accountId,
      ...options,
    });

  const recalculateLedger = () => {
    return async (payload: { accountId: string; year: number }) => {
      const data = await bankMutationService.recalculateLedger(payload);
      queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
      return data;
    };
  };

  const closeYear = () => {
    return async (payload: { accountId: string; year: number; userId: string }) => {
      const data = await bankMutationService.closeYear(payload);
      queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
      return data;
    };
  };

  return {
    getTransactions,
    getAllTransactions,
    createBulkTransactions,
    getAnchorBalance,
    getFiscalPeriods,
    recalculateLedger,
    closeYear,
  };
}
