import { useEnhancedCache } from './useEnhancedCache';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { memo } from 'react';

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
  staleTime = 30 * 1000 // 30 segundos
}: OptimizedDataFetcherProps) => {
  const { data, isLoading, error } = useEnhancedCache(
    [queryKey], 
    queryFn, 
    { staleTime }
  );

  return children(data, isLoading, error);
});

// Hook otimizado para dados do vendedor com cache ultra-agressivo
export const useSellerData = () => {
  const { user } = useAuth();
  
  return useEnhancedCache(
    ['seller-dashboard', user?.id],
    async () => {
      if (!user) return null;
      
      // Buscar member_areas do usuário
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
          .limit(10),
        
        supabase
          .from('orders')
          .select('id, amount, created_at, status, product_id, customer_name, customer_email, order_bump_data')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
        
        memberAreaIds.length > 0 ? supabase
          .from('module_payments')
          .select('id, order_id, amount, created_at, status, module_id, student_name, student_email')
          .in('member_area_id', memberAreaIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
        
        supabase
          .from('profiles')
          .select('full_name, avatar_url, iban')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      // Combinar orders normais + module_payments
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
          order_bump_data: null
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
      staleTime: 30 * 1000, // 30 segundos
      refetchInterval: 60 * 1000, // Atualizar automaticamente a cada 60 segundos
      enableMemoryCache: true,
      prefetchRelated: ['seller-stats'] // Prefetch de stats relacionadas
    }
  );
};

// Hook para estatísticas rápidas do vendedor
export const useSellerStats = () => {
  const { user } = useAuth();
  
  return useEnhancedCache(
    ['seller-stats', user?.id],
    async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .rpc('get_seller_stats', { seller_id: user.id });
      
      if (error) throw error;
      return data;
    },
    { 
      staleTime: 30 * 1000, // 30 segundos
      refetchInterval: 60 * 1000, // Atualizar a cada 60 segundos
      enableMemoryCache: true,
    }
  );
};

OptimizedDataFetcher.displayName = 'OptimizedDataFetcher';
