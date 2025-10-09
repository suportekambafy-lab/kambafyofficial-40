
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ModernMetricCard } from './ModernMetricCard';
import { ModernSalesChart } from './ModernSalesChart';
import { ModernRecentSales } from './ModernRecentSales';
import { ModernKambaAchievements } from './ModernKambaAchievements';
import { ProductFilter } from '@/components/ProductFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomPeriodSelector, type DateRange } from '@/components/ui/custom-period-selector';
import { DollarSign, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { countTotalSales } from '@/utils/orderUtils';

interface Order {
  id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  product_id: string;
  affiliate_code?: string;
  affiliate_commission?: number;
  seller_commission?: number;
  order_type?: 'own' | 'affiliate';
  earning_amount?: number;
}

export function ModernDashboardHome() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('ultimos-7-dias');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState('todos');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState({
    revenue: true,
    sales: true,
  });

  // Load all orders (own sales + affiliate commissions)
  const loadAllOrders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Primeiro, buscar produtos do usuário
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];

      // Segundo, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      const promises = [];

      // ✅ Vendas próprias - usando product_id
      if (userProductIds.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select('*')
            .in('product_id', userProductIds)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
        );
      }

      // Adicionar vendas como afiliado se houver códigos
      if (userAffiliateCodes.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select('*')
            .in('affiliate_code', userAffiliateCodes)
            .not('affiliate_commission', 'is', null)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
        );
      }

      if (promises.length === 0) {
        setAllOrders([]);
        return;
      }

      const results = await Promise.all(promises);
      let ownOrders: any[] = [];
      let affiliateOrders: any[] = [];

      if (userProductIds.length > 0) {
        const ownOrdersData = results[0];
        ownOrders = ownOrdersData.data || [];
        
        if (userAffiliateCodes.length > 0 && results[1]) {
          const affiliateOrdersData = results[1];
          affiliateOrders = affiliateOrdersData.data || [];
        }
      } else if (userAffiliateCodes.length > 0) {
        const affiliateOrdersData = results[0];
        affiliateOrders = affiliateOrdersData.data || [];
      }

      if (results[0]?.error) {
        console.error('❌ Erro ao carregar orders:', results[0].error);
        return;
      }

      // Combinar vendas próprias e comissões de afiliado
      const allOrdersWithEarnings = [
        // Vendas próprias - usar comissão do vendedor ou converter vendas antigas
        ...(ownOrders || []).map((order: any) => {
          let earning_amount = parseFloat(order.seller_commission?.toString() || '0');
          let earning_currency = 'KZ'; // seller_commission sempre está em KZ
          
          if (earning_amount === 0) {
            // Venda antiga sem comissão registrada - usar valor original
            earning_amount = parseFloat(order.amount || '0');
            earning_currency = order.currency;
          }
          
          return {
            ...order,
            earning_amount,
            earning_currency,
            order_type: 'own'
          };
        }),
        // Vendas como afiliado - usar apenas comissão do afiliado
        ...(affiliateOrders || []).map((order: any) => ({
          ...order,
          earning_amount: parseFloat(order.affiliate_commission?.toString() || '0'),
          order_type: 'affiliate'
        }))
      ];

      // Ordenar por data
      allOrdersWithEarnings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 🔍 DEBUG: Calcular lucro total para comparação
      const totalEarnings = allOrdersWithEarnings
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.earning_amount || 0), 0);

      console.log(`✅ Dashboard carregou ${ownOrders?.length || 0} vendas próprias e ${affiliateOrders?.length || 0} comissões para usuário ${user.id}`);
      console.log(`💰 LUCRO TOTAL (completed): ${totalEarnings.toFixed(2)} KZ`);
      
      setAllOrders(allOrdersWithEarnings);
    } catch (error) {
      console.error('💥 Erro no carregamento do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Filter orders in memory for instant response
  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Apply product filter
    if (selectedProduct !== 'todos') {
      filtered = filtered.filter(order => order.product_id === selectedProduct);
    }

    // Apply time filter (include custom range)
    if (timeFilter === 'custom' && customDateRange) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return isWithinInterval(orderDate, {
          start: customDateRange.from,
          end: customDateRange.to
        });
      });
    } else {
      const now = new Date();
      let startDate = new Date();

      switch (timeFilter) {
        case 'hoje':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'ontem':
          startDate = startOfDay(subDays(now, 1));
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.created_at);
            return isWithinInterval(orderDate, {
              start: startDate,
              end: endOfDay(subDays(now, 1))
            });
          });
          return filtered;
        case 'ultimos-7-dias':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'ultimos-30-dias':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'este-mes':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (timeFilter !== 'ontem') {
        filtered = filtered.filter(order => 
          new Date(order.created_at) >= startDate
        );
      }
    }

    return filtered;
  }, [allOrders, selectedProduct, timeFilter, customDateRange]);

  // Calculate previous period data for comparison
  const previousPeriodData = useMemo(() => {
    const now = new Date();
    let currentStartDate = new Date();
    let previousStartDate = new Date();
    let previousEndDate = new Date();

    switch (timeFilter) {
      case 'hoje':
        currentStartDate.setHours(0, 0, 0, 0);
        previousStartDate.setDate(currentStartDate.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate.setDate(currentStartDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'ultimos-7-dias':
        currentStartDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case 'ultimos-30-dias':
        currentStartDate.setDate(now.getDate() - 30);
        previousStartDate.setDate(now.getDate() - 60);
        previousEndDate.setDate(now.getDate() - 30);
        break;
      case 'este-mes':
        currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }

    const previousOrders = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= previousStartDate && orderDate <= previousEndDate &&
        (selectedProduct === 'todos' || order.product_id === selectedProduct);
    });

    return {
      totalRevenue: previousOrders.reduce((sum, order) => sum + (order.earning_amount || parseFloat(order.amount) || 0), 0),
      totalSales: countTotalSales(previousOrders),
    };
  }, [allOrders, selectedProduct, timeFilter]);

  // Calculate dashboard data from filtered orders using earning_amount
  const dashboardData = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      // Usar earning_amount que já foi calculado baseado no tipo de venda
      const amount = order.earning_amount || parseFloat(order.amount) || 0;
      return sum + amount;
    }, 0);

    return {
      totalRevenue,
      totalSales: countTotalSales(filteredOrders),
      previousRevenue: previousPeriodData.totalRevenue,
      previousSales: previousPeriodData.totalSales,
    };
  }, [filteredOrders, previousPeriodData]);

  useEffect(() => {
    if (user) {
      loadAllOrders();
      
      // Set up real-time subscription for orders
      const channel = supabase
        .channel('dashboard-orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('🔔 Dashboard orders real-time update triggered');
            // Recarregar dados com debounce para evitar multiple calls
            setTimeout(() => loadAllOrders(), 500);
          }
        )
        .subscribe();

      // Removido log desnecessário

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadAllOrders]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full transition-colors duration-300">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
          Acompanhe o desempenho do seu negócio
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <CustomPeriodSelector
          value={timeFilter}
          onValueChange={setTimeFilter}
          onCustomRangeChange={setCustomDateRange}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Produto
          </label>
          <ProductFilter 
            value={selectedProduct} 
            onValueChange={setSelectedProduct}
          />
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <ModernMetricCard
          title="Vendas Realizadas"
          value={showValues.revenue ? `${dashboardData.totalRevenue.toLocaleString('pt-BR')} KZ` : "••••••••"}
          icon={<DollarSign className="w-5 h-5" />}
          trend={calculateTrend(dashboardData.totalRevenue, dashboardData.previousRevenue)}
          trendUp={dashboardData.totalRevenue >= dashboardData.previousRevenue}
          className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowValues(prev => ({ ...prev, revenue: !prev.revenue }))}
              className="h-6 w-6 p-0"
            >
              {showValues.revenue ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          }
        />
        
        <ModernMetricCard
          title="Quantidade de Vendas"
          value={showValues.sales ? dashboardData.totalSales.toString() : "••••"}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={calculateTrend(dashboardData.totalSales, dashboardData.previousSales)}
          trendUp={dashboardData.totalSales >= dashboardData.previousSales}
          className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowValues(prev => ({ ...prev, sales: !prev.sales }))}
              className="h-6 w-6 p-0"
            >
              {showValues.sales ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          }
        />
      </div>

      {/* Gráfico e Vendas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ModernSalesChart />
        <ModernRecentSales />
      </div>

      {/* Conquistas Kamba */}
      <div className="grid grid-cols-1 gap-6">
        <ModernKambaAchievements />
      </div>
    </div>
  );
}
