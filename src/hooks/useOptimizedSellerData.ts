import { memo } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OptimizedDataFetcherProps {
  queryKey: string;
  queryFn: () => Promise<any>;
  children: (data: any, isLoading: boolean, error: Error | null) => React.ReactNode;
  enabled?: boolean;
  staleTime?: number;
}

// Componente otimizado para buscar dados com cache inteligente
export const OptimizedDataFetcher = memo(({ 
  queryKey, 
  queryFn, 
  children, 
  enabled = true,
  staleTime = 5 * 60 * 1000 // 5 minutos
}: OptimizedDataFetcherProps) => {
  const { data, isLoading, error } = useCachedQuery(
    queryKey, 
    queryFn, 
    { enabled, staleTime }
  );

  return children(data, isLoading, error);
});

// Hook otimizado para dados do vendedor
export const useSellerData = () => {
  const { user } = useAuth();
  
  return useCachedQuery(
    `seller-dashboard-${user?.id}`,
    async () => {
      if (!user) return null;
      
      // Buscar apenas dados essenciais em uma query otimizada
      const [productsData, ordersData, profileData] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sales, price, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10), // Limitar resultados iniciais
        
        supabase
          .from('orders')
          .select('id, amount, created_at, status, product_id, customer_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10), // Limitar resultados iniciais
        
        supabase
          .from('profiles')
          .select('full_name, avatar_url, iban')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      return {
        products: productsData.data || [],
        orders: ordersData.data || [],
        profile: profileData.data,
        productsError: productsData.error,
        ordersError: ordersData.error,
        profileError: profileData.error
      };
    },
    { 
      enabled: !!user,
      staleTime: 3 * 60 * 1000, // 3 minutos para dados do dashboard
      cacheTime: 10 * 60 * 1000 // 10 minutos no cache
    }
  );
};

// Hook para estatísticas rápidas do vendedor
export const useSellerStats = () => {
  const { user } = useAuth();
  
  return useCachedQuery(
    `seller-stats-${user?.id}`,
    async () => {
      if (!user) return null;
      
      // Query otimizada para estatísticas
      const { data, error } = await supabase
        .rpc('get_seller_stats', { seller_id: user.id });
      
      if (error) throw error;
      return data;
    },
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutos para stats
    }
  );
};

OptimizedDataFetcher.displayName = 'OptimizedDataFetcher';