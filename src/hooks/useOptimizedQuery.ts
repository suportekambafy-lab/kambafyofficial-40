import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QueryOptions {
  gcTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export const useOptimizedQuery = (
  queryKey: string[],
  queryFn: () => Promise<any>,
  options: QueryOptions = {}
) => {
  return useQuery({
    queryKey,
    queryFn,
    gcTime: options.gcTime || 5 * 60 * 1000, // 5 minutos default
    staleTime: options.staleTime || 2 * 60 * 1000, // 2 minutos default
    refetchOnWindowFocus: options.refetchOnWindowFocus || false,
    retry: 1,
  });
};

// Hook otimizado para dados financeiros
export const useFinancialData = (userId: string) => {
  return useOptimizedQuery(
    ['financial-data', userId],
    async () => {
      const [ordersResponse, withdrawalsResponse] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            amount, 
            currency, 
            created_at, 
            status,
            seller_commission,
            affiliate_commission,
            products!inner(user_id)
          `)
          .eq('products.user_id', userId)
          .in('status', ['completed', 'pending']),
        
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      return {
        orders: ordersResponse.data || [],
        withdrawals: withdrawalsResponse.data || []
      };
    },
    {
      staleTime: 3 * 60 * 1000, // 3 minutos
      gcTime: 5 * 60 * 1000  // 5 minutos
    }
  );
};