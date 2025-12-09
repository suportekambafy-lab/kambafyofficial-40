import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingCounts {
  kyc: number;
  payments: number;
  withdrawals: number;
  products: number;
}

export function useAdminPendingCounts() {
  const [counts, setCounts] = useState<PendingCounts>({
    kyc: 0,
    payments: 0,
    withdrawals: 0,
    products: 0
  });
  const [loading, setLoading] = useState(true);

  const loadCounts = async () => {
    try {
      // Buscar contagens em paralelo
      const [kycResult, paymentsResult, withdrawalsResult, productsResult] = await Promise.all([
        // KYC pendentes (status em português: 'pendente')
        supabase
          .from('identity_verification')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente'),
        
        // Pagamentos por transferência pendentes (payment_method: 'transfer')
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('payment_method', 'transfer')
          .eq('status', 'pending'),
        
        // Saques pendentes (status em português: 'pendente')
        supabase
          .from('withdrawal_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente'),
        
        // Produtos pendentes de aprovação (status em português: 'Pendente')
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Pendente')
      ]);

      setCounts({
        kyc: kycResult.count || 0,
        payments: paymentsResult.count || 0,
        withdrawals: withdrawalsResult.count || 0,
        products: productsResult.count || 0
      });
    } catch (error) {
      console.error('Error loading pending counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadCounts, 30000);

    // Subscrever a mudanças em tempo real
    const channels = [
      supabase
        .channel('admin-kyc-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'identity_verification' }, loadCounts)
        .subscribe(),
      supabase
        .channel('admin-orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadCounts)
        .subscribe(),
      supabase
        .channel('admin-withdrawals-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, loadCounts)
        .subscribe(),
      supabase
        .channel('admin-products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadCounts)
        .subscribe()
    ];

    return () => {
      clearInterval(interval);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  return { counts, loading, refresh: loadCounts };
}
