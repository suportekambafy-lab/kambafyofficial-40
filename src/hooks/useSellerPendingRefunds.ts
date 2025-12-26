import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSellerPendingRefunds() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCount = async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      // Buscar produtos do vendedor
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (!products || products.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      const productIds = products.map(p => p.id);

      // Buscar reembolsos pendentes dos produtos do vendedor
      const { count: pendingCount } = await supabase
        .from('refund_requests')
        .select('id', { count: 'exact', head: true })
        .in('product_id', productIds)
        .eq('status', 'pending');

      setCount(pendingCount || 0);
    } catch (error) {
      console.error('Error loading pending refunds count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCount();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadCount, 30000);

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('seller-refunds-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests' }, loadCount)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { count, loading, refresh: loadCount };
}
