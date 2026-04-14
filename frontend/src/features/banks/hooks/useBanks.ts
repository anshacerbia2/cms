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
};

export function useBanks(params: {
  banks?: PaginationParams;
  accounts?: PaginationParams;
} = {}) {
  const queryClient = useQueryClient();

  const banksQuery = useQuery({
    queryKey: ["banks", params.banks],
    queryFn: () => BanksService.findAllBanks(params.banks),
  });

  const internalAccountsQuery = useQuery({
    queryKey: ["internal-accounts", params.accounts],
    queryFn: () => BanksService.findAllInternalAccounts(params.accounts),
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

  return {
    banksQuery,
    internalAccountsQuery,
    createBank,
    createInternalAccount,
    updateInternalAccount,
    deleteInternalAccount,
  };
}
