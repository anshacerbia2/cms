import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import { 
  Bank, 
  CreateBankInput,
  InternalAccount,
  CreateInternalAccountInput,
  UpdateInternalAccountInput
} from "../types";
import { PaginatedResponse, PaginationParams } from "@/types/pagination";

const BanksService = {
  // Master Banks
  findAllBanks: async (params: PaginationParams = {}): Promise<PaginatedResponse<Bank>> => {
    const response = await api.get("/banks", { params });
    return response.data;
  },

  createBank: async (data: CreateBankInput): Promise<Bank> => {
    const response = await api.post("/banks", data);
    return response.data;
  },

  updateBank: async ({ id, ...data }: { id: string } & Partial<CreateBankInput>): Promise<Bank> => {
    const response = await api.patch(`/banks/${id}`, data);
    return response.data;
  },

  removeBank: async (id: string): Promise<void> => {
    await api.delete(`/banks/${id}`);
  },

  // Internal Accounts
  findAllInternalAccounts: async (params: PaginationParams = {}): Promise<PaginatedResponse<InternalAccount>> => {
    const response = await api.get("/banks/internal-accounts", { params });
    return response.data;
  },

  createInternalAccount: async (data: CreateInternalAccountInput): Promise<InternalAccount> => {
    const response = await api.post("/banks/internal-accounts", data);
    return response.data;
  },

  updateInternalAccount: async ({ id, ...data }: UpdateInternalAccountInput): Promise<InternalAccount> => {
    const response = await api.patch(`/banks/internal-accounts/${id}`, data);
    return response.data;
  },

  removeInternalAccount: async (id: string): Promise<void> => {
    await api.delete(`/banks/internal-accounts/${id}`);
  },
  // Fiscal Periods
  findAllFiscalPeriods: async (params: PaginationParams = {}): Promise<PaginatedResponse<any>> => {
    const response = await api.get("/banks/fiscal-periods", { params });
    return response.data;
  },
};

export function useBanks(params: {
  banks?: PaginationParams & { enabled?: boolean };
  accounts?: PaginationParams & { enabled?: boolean };
  fiscalPeriods?: PaginationParams & { enabled?: boolean; accountId?: string; year?: string };
} = {}) {
  const queryClient = useQueryClient();

  const banksQuery = useQuery({
    queryKey: ["banks", params.banks],
    queryFn: () => {
      const { enabled, ...apiParams } = params.banks || {};
      return BanksService.findAllBanks(apiParams);
    },
    enabled: Boolean(params.banks?.enabled),
  });

  const internalAccountsQuery = useQuery({
    queryKey: ["internal-accounts", params.accounts],
    queryFn: () => {
      const { enabled, ...apiParams } = params.accounts || {};
      return BanksService.findAllInternalAccounts(apiParams);
    },
    enabled: Boolean(params.accounts?.enabled),
  });

  const fiscalPeriodsQuery = useQuery({
    queryKey: ["fiscal-periods", params.fiscalPeriods],
    queryFn: () => {
      const { enabled, ...apiParams } = params.fiscalPeriods || {};
      return BanksService.findAllFiscalPeriods(apiParams);
    },
    enabled: Boolean(params.fiscalPeriods?.enabled),
  });

  const createBank = useMutation({
    mutationFn: BanksService.createBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
  });

  const createInternalAccount = useMutation({
    mutationFn: BanksService.createInternalAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-accounts"] });
    },
  });

  const updateInternalAccount = useMutation({
    mutationFn: BanksService.updateInternalAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-accounts"] });
    },
  });

  const deleteInternalAccount = useMutation({
    mutationFn: BanksService.removeInternalAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-accounts"] });
    },
  });

  const updateBank = useMutation({
    mutationFn: BanksService.updateBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
  });

  const deleteBank = useMutation({
    mutationFn: BanksService.removeBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
  });

  return {
    banksQuery,
    internalAccountsQuery,
    fiscalPeriodsQuery,
    createBank,
    updateBank,
    deleteBank,
    createInternalAccount,
    updateInternalAccount,
    deleteInternalAccount,
  };
}
