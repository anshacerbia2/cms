import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

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
  const queryClient = useQueryClient();

  const getTransactions = (params: PaginationParams, options?: any) => 
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "transactions", params],
      queryFn: async () => {
        const { data } = await api.get("/bank-mutation/transactions", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllTransactions = (accountId?: string, year?: string, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "transactions", "all", accountId, year],
      queryFn: async () => {
        const { data } = await api.get("/bank-mutation/transactions/all", { params: { accountId, year } });
        return Array.isArray(data) ? data : (data as any).data || [];
      },
      ...options,
    });

  const getSales = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "sales", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/sales", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAR = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "ar", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/ar", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAP = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "ap", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/ap", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAssets = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "assets", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/assets", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const createBulkTransactions = () => {
    return async (payload: { data: any[]; accountId: string; year: number; startingBalance?: string }) => {
      const response = await api.post("/bank-mutation/transactions/bulk", payload);
      return response.data;
    };
  };

  const getPL = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "pl", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/pl", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getPLCosts = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "pl-costs", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/pl-costs", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getBalanceSheet = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "balance-sheet", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/balance-sheet", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getInterAccountTransfers = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "inter-account", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/inter-account-transfers", { params });
        return data;
      },
      placeholderData: keepPreviousData,
      ...options,
    });

  const getPLSummary = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "pl-summary"],
      queryFn: async () => {
        const { data } = await api.get("/finance/pl-summary");
        return data;
      },
      ...options,
    });

  const getAllSales = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "sales", "all"],
      queryFn: async () => {
        const { data } = await api.get("/finance/sales/all");
        return Array.isArray(data) ? data : (data as any).data || [];
      },
      ...options,
    });

  const getAllAR = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "ar", "all"],
      queryFn: async () => {
        const { data } = await api.get("/finance/ar/all");
        return Array.isArray(data) ? data : (data as any).data || [];
      },
      ...options,
    });

  const getAllAP = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "ap", "all"],
      queryFn: async () => {
        const { data } = await api.get("/finance/ap/all");
        return Array.isArray(data) ? data : (data as any).data || [];
      },
      ...options,
    });

  const getAnchorBalance = (accountId: string, year: number, options?: any) =>
    useQuery<{ balance: number | null, status: 'OPEN' | 'ONGOING' | 'CLOSED', isStale?: boolean, message?: string, referredYear?: number, canEdit?: boolean } | null>({
      queryKey: ["finance", "bank-mutation", "anchor-balance", accountId, year],
      queryFn: async () => {
        const { data } = await api.get(`/bank-mutation/anchor-balance/${accountId}/${year}`);
        return data;
      },
      enabled: !!accountId && !!year,
      ...options,
    });


  const getFiscalPeriods = (accountId: string, year?: number, options?: any) =>
    useQuery<any | null>({
      queryKey: ["finance", "bank-mutation", "fiscal-periods", accountId, year],
      queryFn: async () => {
        const { data } = await api.get("/bank-mutation/fiscal-periods", { 
          params: { accountId, year } 
        });
        return data;
      },
      enabled: !!accountId,
      ...options,
    });


  const recalculateLedger = () => {
    return async (payload: { accountId: string; year: number }) => {
      const { data } = await api.post("/bank-mutation/recalculate", payload);
      queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
      return data;
    };
  };

  const closeYear = () => {
    return async (payload: { accountId: string; year: number; userId: string }) => {
      const { data } = await api.post("/bank-mutation/close-year", payload);
      queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
      return data;
    };
  };

  return {
    getTransactions,
    getAllTransactions,
    getSales,
    getAllSales,
    getAR,
    getAllAR,
    getAP,
    getAllAP,
    getAssets,
    getPL,
    getPLCosts,
    getPLSummary,
    getBalanceSheet,
    getInterAccountTransfers,
    getFiscalPeriods,
    getAnchorBalance,
    createBulkTransactions,
    recalculateLedger,
    closeYear,
  };

}
