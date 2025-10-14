import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TopSeller {
  full_name: string;
  avatar_url: string | null;
  total_sales: number;
  total_revenue: number;
}

export const useTopSellers = () => {
  return useQuery({
    queryKey: ['top-sellers', new Date().getMonth()],
    queryFn: async () => {
      console.log('🔍 useTopSellers: Iniciando busca...');
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      console.log('🔍 useTopSellers: Período:', { startOfMonth, endOfMonth });

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());

      console.log('🔍 useTopSellers: Orders encontradas:', orders?.length);

      if (ordersError) {
        console.error('❌ useTopSellers: Erro ao buscar orders:', ordersError);
        throw ordersError;
      }

      // Agrupar vendas por vendedor
      const salesByUser = orders?.reduce((acc, order) => {
        if (!acc[order.user_id]) {
          acc[order.user_id] = {
            total_sales: 0,
            total_revenue: 0,
          };
        }
        acc[order.user_id].total_sales += 1;
        acc[order.user_id].total_revenue += parseFloat(order.amount);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number }>);

      if (!salesByUser) return [];

      console.log('🔍 useTopSellers: Vendedores agrupados:', Object.keys(salesByUser).length);

      // Pegar os IDs dos top 3 vendedores
      const topUserIds = Object.entries(salesByUser)
        .sort((a, b) => b[1].total_sales - a[1].total_sales)
        .slice(0, 3)
        .map(([userId]) => userId);

      console.log('🔍 useTopSellers: Top 3 IDs:', topUserIds);

      // Buscar perfis dos vendedores
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', topUserIds);

      console.log('🔍 useTopSellers: Perfis encontrados:', profiles?.length);

      if (profilesError) {
        console.error('❌ useTopSellers: Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      // Combinar dados
      const result: TopSeller[] = profiles?.map(profile => ({
        full_name: profile.full_name || 'Vendedor',
        avatar_url: profile.avatar_url,
        total_sales: salesByUser[profile.user_id].total_sales,
        total_revenue: salesByUser[profile.user_id].total_revenue,
      })) || [];

      // Ordenar por vendas
      const sortedResult = result.sort((a, b) => b.total_sales - a.total_sales);
      
      console.log('✅ useTopSellers: Resultado final:', sortedResult);
      
      return sortedResult;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
