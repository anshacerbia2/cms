import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { Proposal, CreateProposalInput, UpdateProposalInput, ProposalQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useProposals = (params: ProposalQueryParams = {}) => {
  const queryClient = useQueryClient();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Proposal>>('/proposals', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // BoQ rows and invoices both hang off proposals, so their lists go stale together.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    queryClient.invalidateQueries({ queryKey: ['boqs'] });
  };

  const createProposalMutation = useMutation({
    mutationFn: async (newProposal: CreateProposalInput) => {
      const { data } = await api.post<Proposal>('/proposals', newProposal);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateProposalInput) => {
      const { data } = await api.patch<Proposal>(`/proposals/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/proposals/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    proposalsQuery,
    createProposal: createProposalMutation,
    updateProposal: updateProposalMutation,
    deleteProposal: deleteProposalMutation,
  };
};

/** Full proposal, including its sales items — the invoice form bills from these. */
export const useProposal = (id?: string | null) =>
  useQuery({
    queryKey: ['proposals', id],
    queryFn: async () => {
      const { data } = await api.get<Proposal>(`/proposals/${id}`);
      return data;
    },
    enabled: !!id,
  });

export const useProposalOptions = (params: ProposalQueryParams = {}) =>
  useQuery({
    queryKey: ['proposals', 'options', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Proposal>>('/proposals', {
        params: { limit: 100, ...params },
      });
      return data.data;
    },
  });
