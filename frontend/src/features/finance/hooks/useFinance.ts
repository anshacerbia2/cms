import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { financeService } from "../services/finance.service";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  year?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export function useFinance() {
  const getRevenue = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "revenue", params],
      queryFn: () => financeService.getRevenue(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getExpenses = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "expenses", params],
      queryFn: () => financeService.getExpenses(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getBalanceSheet = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "balance-sheet", params],
      queryFn: () => financeService.getBalanceSheet(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getInterAccountTransfers = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "inter-account", params],
      queryFn: () => financeService.getInterAccountTransfers(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllInterAccountTransfers = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "inter-account", "all"],
      queryFn: () => financeService.getAllInterAccountTransfers(),
      ...options,
    });

  const getPLSummary = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "pl-summary"],
      queryFn: () => financeService.getPLSummary(),
      ...options,
    });

  return {
    getRevenue,
    getExpenses,
    getPLSummary,
    getBalanceSheet,
    getInterAccountTransfers,
    getAllInterAccountTransfers,
  };
}
