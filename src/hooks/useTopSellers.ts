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

      // Buscar TODAS as orders sem limite
      let allOrders: any[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('orders')
          .select('amount, products!inner(user_id)')
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString())
          .range(from, from + batchSize - 1);
        
        if (batchError) {
          console.error('❌ useTopSellers: Erro ao buscar batch:', batchError);
          throw batchError;
        }
        
        if (!batch || batch.length === 0) break;
        
        allOrders = [...allOrders, ...batch];
        
        if (batch.length < batchSize) break;
        from += batchSize;
      }
      
      const orders = allOrders;

      console.log('🔍 useTopSellers: Total de orders encontradas:', orders?.length);

      // Agrupar vendas por vendedor
      const salesByUser = orders?.reduce((acc, order) => {
        const sellerId = order.products?.user_id;
        if (!sellerId) return acc;
        
        if (!acc[sellerId]) {
          acc[sellerId] = {
            total_sales: 0,
            total_revenue: 0,
          };
        }
        acc[sellerId].total_sales += 1;
        acc[sellerId].total_revenue += parseFloat(order.amount);
        return acc;
      }, {} as Record<string, { total_sales: number; total_revenue: number }>);

      if (!salesByUser) return [];

      console.log('🔍 useTopSellers: Vendedores agrupados:', Object.keys(salesByUser).length);

      // Pegar os IDs dos top 3 vendedores (filtrar nulls e valores inválidos)
      // Ordenar por RECEITA TOTAL (não por número de vendas)
      const topUserIds = Object.entries(salesByUser)
        .sort((a, b) => {
          const revenueA = (a[1] as { total_sales: number; total_revenue: number }).total_revenue;
          const revenueB = (b[1] as { total_sales: number; total_revenue: number }).total_revenue;
          return revenueB - revenueA;
        })
        .slice(0, 3)
        .map(([userId]) => userId)
        .filter(id => id && id !== 'null' && id !== 'undefined');

      console.log('🔍 useTopSellers: Top 3 IDs:', topUserIds);
      
      if (topUserIds.length === 0) {
        console.log('⚠️ useTopSellers: Nenhum vendedor válido encontrado');
        return [];
      }

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

      // Ordenar por RECEITA TOTAL (não por vendas)
      const sortedResult = result.sort((a, b) => b.total_revenue - a.total_revenue);
      
      console.log('✅ useTopSellers: Resultado final:', sortedResult.map(s => ({
        name: s.full_name,
        sales: s.total_sales,
        revenue: s.total_revenue
      })));
      
      return sortedResult;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
