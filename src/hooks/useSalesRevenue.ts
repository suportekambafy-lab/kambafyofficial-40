import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getActualCurrency, getActualAmount, calculateSellerEarning } from '@/utils/currencyUtils';

export function useSalesRevenue() {
  const { user } = useAuth();
  const [revenueByMoeda, setRevenueByMoeda] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const calculateSalesRevenue = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First get user's products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return;
      }

      const productIds = products?.map(p => p.id) || [];
      
      if (productIds.length === 0) {
        setRevenueByMoeda({});
        return;
      }

      // Fetch completed orders for user's products
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('amount, original_amount, original_currency, payment_method, currency')
        .in('product_id', productIds)
        .eq('status', 'completed');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
      }

      // Calculate revenue per currency using currencyUtils (same logic as Dashboard)
      const revenue: Record<string, number> = {};
      
      orders?.forEach(order => {
        const actualCurrency = getActualCurrency(order);
        const actualAmount = getActualAmount(order);
        const earning = calculateSellerEarning(actualAmount, actualCurrency);
        
        revenue[actualCurrency] = (revenue[actualCurrency] || 0) + earning;
      });

      setRevenueByMoeda(revenue);
    } catch (error) {
      console.error('Error calculating sales revenue:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      calculateSalesRevenue();
    }
  }, [user, calculateSalesRevenue]);

  // Set up realtime subscription for orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`sales_revenue_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        calculateSalesRevenue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, calculateSalesRevenue]);

  return {
    revenueByMoeda,
    loading,
    refresh: calculateSalesRevenue
  };
}
