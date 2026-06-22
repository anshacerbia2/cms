import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface FetchParams {
  page: number;
  limit?: number;
  search?: string;
  year?: number;
}

export const useInterAccount = ({ page, limit = 10, search, year }: FetchParams) => {
  return useQuery({
    queryKey: ['inter-account', page, limit, search, year],
    queryFn: async () => {
      const { data } = await api.get('/finance/inter-account/paginated', {
        params: { page, limit, search, year },
      });
      return data;
    },
  });
};
