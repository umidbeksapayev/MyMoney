import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';

export function useTransactions(params = {}) {
  const { currency } = useCurrency();
  
  return useQuery({
    queryKey: ['transactions', { ...params, currency }],
    queryFn: async () => {
      const response = await api.get('/transactions', {
        params: {
          ...params,
          display_currency: currency,
        }
      });
      return response.data.transactions || response.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change frequently
  });
}

export function useDashboardData(dateRange) {
  const { currency } = useCurrency();
  
  return useQuery({
    queryKey: ['dashboard', dateRange, currency],
    queryFn: async () => {
      const response = await api.get('/transactions', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: 10000, // Increased from 100 to ensure all transactions are fetched
          display_currency: currency,
        }
      });
      return response.data.transactions || response.data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ['forecast'],
    queryFn: async () => {
      const response = await api.get('/forecast/categories');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - forecast doesn't change often
  });
}
