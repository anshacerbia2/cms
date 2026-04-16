import { useQuery, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
}

export function useFinance() {
  const getTransactions = (params: PaginationParams) => 
    useQuery({
      queryKey: ["finance", "transactions", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/transactions", { params });
        return data; // Returns { data, meta }
      },
      placeholderData: keepPreviousData,
    });

  const getSales = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "sales", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/sales", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getAR = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "ar", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/ar", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getAP = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "ap", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/ap", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getAssets = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "assets", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/assets", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getPL = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "pl", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/pl", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getPLCosts = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "pl-costs", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/pl-costs", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getBalanceSheet = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "balance-sheet", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/balance-sheet", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  const getInterAccountTransfers = (params: PaginationParams) =>
    useQuery({
      queryKey: ["finance", "inter-account", params],
      queryFn: async () => {
        const { data } = await api.get("/finance/inter-account-transfers", { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });

  return {
    getTransactions,
    getSales,
    getAR,
    getAP,
    getAssets,
    getPL,
    getPLCosts,
    getBalanceSheet,
    getInterAccountTransfers,
  };
}
