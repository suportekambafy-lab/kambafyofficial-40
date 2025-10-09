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
      // Primeiro buscar member_areas do usuário
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', user.id);
      
      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];
      
      const [productsData, ordersData, modulePaymentsData, profileData] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sales, price, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10), // Limitar resultados iniciais
        
        supabase
          .from('orders')
          .select('id, amount, created_at, status, product_id, customer_name, customer_email, order_bump_data')
          .eq('user_id', user.id)
          .eq('status', 'completed') // ✅ Apenas vendas pagas
          .order('created_at', { ascending: false }),
        
        // ✅ Buscar vendas de módulos também
        memberAreaIds.length > 0 ? supabase
          .from('module_payments')
          .select('id, order_id, amount, created_at, status, module_id, student_name, student_email')
          .in('member_area_id', memberAreaIds)
          .eq('status', 'completed') // ✅ Apenas vendas pagas
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
        
        supabase
          .from('profiles')
          .select('full_name, avatar_url, iban')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      // Combinar orders normais + module_payments em um array unificado
      const allOrders = [
        ...(ordersData.data || []),
        ...(modulePaymentsData.data || []).map(mp => ({
          id: mp.id,
          amount: mp.amount?.toString() || '0',
          created_at: mp.created_at,
          status: mp.status,
          product_id: mp.module_id,
          customer_name: mp.student_name,
          customer_email: mp.student_email,
          order_bump_data: null // Module payments não têm order bumps
        }))
      ];

      return {
        products: productsData.data || [],
        orders: allOrders,
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