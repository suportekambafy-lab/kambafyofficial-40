import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSellerData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['seller-data', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar produtos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Buscar pedidos
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Buscar member_areas do vendedor
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', user.id);

      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];

      // Buscar module_payments
      let modulePayments: any[] = [];
      if (memberAreaIds.length > 0) {
        const { data: mp } = await supabase
          .from('module_payments')
          .select('*')
          .in('member_area_id', memberAreaIds)
          .eq('status', 'completed');
        
        modulePayments = mp || [];
      }

      // Combinar orders e module_payments com valores diretos (já líquidos)
      const allTransactions = [
        ...(orders || []).map(order => ({
          ...order,
          netAmount: order.seller_commission 
            ? parseFloat(String(order.seller_commission))
            : parseFloat(String(order.amount || '0'))
        })),
        ...(modulePayments || []).map(mp => ({
          ...mp,
          netAmount: parseFloat(String(mp.amount || '0')),
          isModulePayment: true
        }))
      ];

      return {
        products: products || [],
        orders: allTransactions || [],
        rawOrders: orders || [],
        modulePayments: modulePayments || []
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
    refetchOnReconnect: false,
  });
}
