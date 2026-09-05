import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Boq, CreateBoqInput } from '../types';
import { PaginatedResponse } from '@/types/pagination';

interface BoqQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  proposalId?: number;
  /** "true" lists only BoQs not yet bound to a proposal. */
  unbound?: string;
}

export const useBoqs = (params: BoqQueryParams = {}, enabled = true) => {
  const queryClient = useQueryClient();

  const boqsQuery = useQuery({
    queryKey: ['boqs', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Boq>>('/boqs', { params });
      return data;
    },
    enabled,
  });

  // A BoQ's binding shows up in the proposal's counts, so both lists go stale together.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['boqs'] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const createBoq = useMutation({
    mutationFn: async (input: CreateBoqInput) => {
      const { data } = await api.post<Boq>('/boqs', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const replicateBoqs = useMutation({
    mutationFn: async (input: { boqIds: number[]; proposalId?: number }) => {
      const { data } = await api.post('/boqs/replicate', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const unbindBoqs = useMutation({
    mutationFn: async (boqIds: number[]) => {
      const { data } = await api.post('/boqs/unbind', { boqIds });
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteBoq = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/boqs/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { boqsQuery, createBoq, replicateBoqs, unbindBoqs, deleteBoq };
};
