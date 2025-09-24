import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BcvRate } from '@/types';

export const useBcvRate = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['bcv-rate', targetDate],
    queryFn: async (): Promise<BcvRate> => {
      if (import.meta.env.DEV) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          date: targetDate,
          rate: 36.50,
          source: 'BCV'
        };
      }
      const response = await apiClient.get<BcvRate>(`/rates/bcv?date=${targetDate}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
};