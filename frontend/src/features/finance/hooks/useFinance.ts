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

  const getBalanceSheet = (date?: string, options?: any) =>
    useQuery<any>({
      queryKey: ["finance", "balance-sheet", date],
      queryFn: () => financeService.getBalanceSheet(date),
      ...options,
    });

  const getDashboardActivities = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "recent-activities"],
      queryFn: () => financeService.getDashboardActivities(),
      ...options,
    });

  const getPLSummary = (year?: string, date?: string, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "pl-summary", year || "all", date || "now"],
      queryFn: () => financeService.getPLSummary(year, date),
      ...options,
    });

  const getPLStatement = (year?: string, date?: string, options?: any) =>
    useQuery<any>({
      queryKey: ["finance", "pl-statement", year || "all", date || "now"],
      queryFn: () => financeService.getPLStatement(year, date),
      ...options,
    });

  const getPLDetails = (year?: string, ledger?: string, date?: string, subItem?: string, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "pl-details", year || "all", ledger, subItem || "all", date || "now"],
      queryFn: () => financeService.getPLDetails(year, ledger, date, subItem),
      enabled: !!ledger,
      ...options,
    });

  const getSalesCogsDetails = (year?: string, date?: string, options?: any) =>
    useQuery<any>({
      queryKey: ["finance", "sales-cogs-details", year || "all", date || "now"],
      queryFn: () => financeService.getSalesCogsDetails(year, date),
      ...options,
    });

  const getDepreciationDetails = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "depreciation-details"],
      queryFn: () => financeService.getDepreciationDetails(),
      ...options,
    });

  const getBSDetails = (category: string, subItem?: string, date?: string, accountId?: string, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "balance-sheet-details", category, subItem, date || "now", accountId],
      queryFn: () => financeService.getBSDetails(category, subItem, date, accountId),
      enabled: !!category,
      ...options,
    });

  return {
    getRevenue,
    getExpenses,
    getPLSummary,
    getPLStatement,
    getPLDetails,
    getSalesCogsDetails,
    getBalanceSheet,
    getDepreciationDetails,
    getBSDetails,
    getDashboardActivities,
  };
}
