
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ModernMetricCard } from './ModernMetricCard';
import { ModernSalesChart } from './ModernSalesChart';
import { ModernRecentSales } from './ModernRecentSales';
import { ModernKambaAchievements } from './ModernKambaAchievements';
import { AppDownloadBanner } from './AppDownloadBanner';
import { ProductFilter } from '@/components/ProductFilter';
import { CustomPeriodSelector, type DateRange } from '@/components/ui/custom-period-selector';
import { QuickFilters } from '@/components/dashboard/QuickFilters';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { DollarSign, ShoppingBag, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { countTotalSales } from '@/utils/orderUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
  const { preferences, updateWidgetVisibility, reorderWidgets, resetPreferences, savePreferences } = useDashboardPreferences();
  const { completeTask } = useOnboardingProgress();
  const [timeFilter, setTimeFilter] = useState(preferences.quickFilter || '7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState('todos');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState({
    revenue: true,
    sales: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Complete onboarding task when dashboard is viewed
  useEffect(() => {
    if (user) {
      completeTask('view-dashboard');
    }
  }, [user]);

  // Load all orders (own sales + affiliate commissions + module payments)
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

      // Buscar member_areas do usuário
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', user.id);
      
      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];
      console.log(`🔍 Dashboard: Usuario ${user.id} tem ${memberAreaIds.length} member areas:`, memberAreaIds);

      // Segundo, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      const promises = [];

      // ✅ Vendas próprias - apenas vendas pagas (completed)
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

      // Adicionar vendas como afiliado se houver códigos (apenas completed)
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

      // ✅ Adicionar pagamentos de módulos (apenas completed)
      if (memberAreaIds.length > 0) {
        console.log(`🔍 Dashboard: Buscando module_payments para ${memberAreaIds.length} member areas:`, memberAreaIds);
        const moduleQuery = supabase
          .from('module_payments')
          .select('id, order_id, amount, created_at, status, module_id, student_name, student_email, currency')
          .in('member_area_id', memberAreaIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });
        
        promises.push(moduleQuery);
        console.log('🔍 Dashboard: Query de module_payments criada');
      }

      if (promises.length === 0) {
        setAllOrders([]);
        return;
      }

      const results = await Promise.all(promises);
      console.log('🔍 Dashboard: Results recebidos:', results.map((r, i) => ({ 
        index: i, 
        hasData: !!r.data, 
        dataLength: r.data?.length || 0, 
        hasError: !!r.error,
        error: r.error 
      })));
      
      let ownOrders: any[] = [];
      let affiliateOrders: any[] = [];
      let modulePayments: any[] = [];

      if (userProductIds.length > 0) {
        const ownOrdersData = results[0];
        ownOrders = ownOrdersData.data || [];
        
        let nextIndex = 1;
        
        if (userAffiliateCodes.length > 0 && results[nextIndex]) {
          const affiliateOrdersData = results[nextIndex];
          affiliateOrders = affiliateOrdersData.data || [];
          nextIndex++;
        }
        
        if (memberAreaIds.length > 0 && results[nextIndex]) {
          const modulePaymentsData = results[nextIndex];
          modulePayments = modulePaymentsData.data || [];
          console.log(`✅ Dashboard: Carregados ${modulePayments.length} module_payments do results[${nextIndex}]`);
          if (modulePaymentsData.error) {
            console.error('❌ Dashboard: Erro ao carregar module_payments:', modulePaymentsData.error);
          }
        }
      } else if (userAffiliateCodes.length > 0) {
        const affiliateOrdersData = results[0];
        affiliateOrders = affiliateOrdersData.data || [];
        
        if (memberAreaIds.length > 0 && results[1]) {
          const modulePaymentsData = results[1];
          modulePayments = modulePaymentsData.data || [];
          console.log(`✅ Dashboard: Carregados ${modulePayments.length} module_payments do results[1]`);
          if (modulePaymentsData.error) {
            console.error('❌ Dashboard: Erro ao carregar module_payments (results[1]):', modulePaymentsData.error);
          }
        }
      } else if (memberAreaIds.length > 0) {
        const modulePaymentsData = results[0];
        modulePayments = modulePaymentsData.data || [];
        console.log(`✅ Dashboard: Carregados ${modulePayments.length} module_payments do results[0]`);
        if (modulePaymentsData.error) {
          console.error('❌ Dashboard: Erro ao carregar module_payments (results[0]):', modulePaymentsData.error);
        }
      }

      if (results[0]?.error) {
        console.error('❌ Erro ao carregar orders:', results[0].error);
        return;
      }

      // Combinar vendas próprias, comissões de afiliado E pagamentos de módulos
      const allOrdersWithEarnings = [
        // Vendas próprias - usar comissão do vendedor ou converter vendas antigas
        ...(ownOrders || []).map((order: any) => {
          let earning_amount = parseFloat(order.seller_commission?.toString() || '0');
          let earning_currency = 'KZ'; // seller_commission sempre está em KZ
          
          if (earning_amount === 0) {
            // ✅ Venda antiga sem comissão registrada - descontar 8% da plataforma
            const grossAmount = parseFloat(order.amount || '0');
            earning_amount = grossAmount * 0.92;
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
        })),
        // ✅ Pagamentos de módulos - converter para formato compatível (descontando 8%)
        ...(modulePayments || []).map((mp: any) => {
          const grossAmount = parseFloat(mp.amount?.toString() || '0');
          const netAmount = grossAmount * 0.92; // Descontar 8% da plataforma
          
          return {
            id: mp.id,
            order_id: mp.order_id,
            amount: netAmount.toString(), // Valor líquido
            currency: mp.currency || 'KZ',
            created_at: mp.created_at,
            status: mp.status,
            product_id: mp.module_id,
            customer_name: mp.student_name,
            customer_email: mp.student_email,
            order_bump_data: null, // Módulos não têm order bumps
            earning_amount: netAmount, // ✅ Valor líquido (já descontado 8%)
            earning_currency: mp.currency || 'KZ',
            order_type: 'module'
          };
        })
      ];

      // Ordenar por data
      allOrdersWithEarnings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 🔍 DEBUG: Calcular lucro total das vendas pagas
      const totalEarnings = allOrdersWithEarnings
        .reduce((sum, o) => sum + (o.earning_amount || 0), 0);

      console.log(`✅ Dashboard carregou ${ownOrders?.length || 0} vendas próprias + ${affiliateOrders?.length || 0} comissões + ${modulePayments?.length || 0} módulos (completed) para usuário ${user.id}`);
      console.log(`💰 LUCRO TOTAL (completed): ${totalEarnings.toFixed(2)} KZ`);
      console.log(`📊 TOTAL VENDAS PAGAS (contando order bumps): ${countTotalSales(allOrdersWithEarnings)}`);
      
      
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

  // Update quick filter preference when it changes
  useEffect(() => {
    if (timeFilter !== preferences.quickFilter) {
      savePreferences({ quickFilter: timeFilter });
    }
  }, [timeFilter, preferences.quickFilter, savePreferences]);

  useEffect(() => {
    if (user) {
      loadAllOrders();
      
      // Set up real-time subscription for orders AND module_payments
      const ordersChannel = supabase
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
      
      const modulePaymentsChannel = supabase
        .channel('dashboard-module-payments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'module_payments'
          },
          (payload) => {
            console.log('🔔 Dashboard module_payments real-time update triggered');
            // Recarregar dados com debounce para evitar multiple calls
            setTimeout(() => loadAllOrders(), 500);
          }
        )
        .subscribe();

      // Removido log desnecessário

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(modulePaymentsChannel);
      };
    }
  }, [user, loadAllOrders]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = preferences.widgets.findIndex((w) => w.id === active.id);
      const newIndex = preferences.widgets.findIndex((w) => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = arrayMove(preferences.widgets, oldIndex, newIndex);
        reorderWidgets(newWidgets);
        completeTask('customize-dashboard');
      }
    }
  };

  const visibleWidgets = useMemo(() => {
    return preferences.widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [preferences.widgets]);

  const getWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'revenue':
        return (
          <ModernMetricCard
            title="Vendas Realizadas"
            value={showValues.revenue ? `${dashboardData.totalRevenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ` : "••••••••"}
            icon={<DollarSign className="w-5 h-5" />}
            trend={calculateTrend(dashboardData.totalRevenue, dashboardData.previousRevenue)}
            trendUp={dashboardData.totalRevenue >= dashboardData.previousRevenue}
            className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(prev => ({ ...prev, revenue: !prev.revenue }))}
                className="h-8 w-8 p-0"
              >
                {showValues.revenue ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            }
          />
        );
      case 'sales':
        return (
          <ModernMetricCard
            title="Total de Vendas"
            value={showValues.sales ? `${dashboardData.totalSales}` : "••••"}
            icon={<ShoppingBag className="w-5 h-5" />}
            trend={calculateTrend(dashboardData.totalSales, dashboardData.previousSales)}
            trendUp={dashboardData.totalSales >= dashboardData.previousSales}
            className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(prev => ({ ...prev, sales: !prev.sales }))}
                className="h-8 w-8 p-0"
              >
                {showValues.sales ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            }
          />
        );
      case 'chart':
        return <ModernSalesChart />;
      case 'recent':
        return <ModernRecentSales />;
      case 'achievements':
        return <ModernKambaAchievements />;
      default:
        return null;
    }
  };

  return (
    <>
      <OnboardingTour tourId="dashboard-tour" />
      <OnboardingChecklist />
      
      <div className="p-4 md:p-6 space-y-6 bg-background min-h-full transition-colors duration-300">
        <AppDownloadBanner />
        
        <div className="mb-6 md:mb-8" data-onboarding="dashboard-header">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Acompanhe o desempenho do seu negócio
              </p>
            </div>
            <OnboardingTrigger />
          </div>
        </div>

      {/* Quick Filters e Customização */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div data-onboarding="quick-filters">
          <QuickFilters
            activeFilter={timeFilter}
            onFilterChange={setTimeFilter}
          />
        </div>
        <div data-onboarding="widget-customizer">
          <WidgetCustomizer
            widgets={preferences.widgets}
            onToggleWidget={updateWidgetVisibility}
            onReset={resetPreferences}
          />
        </div>
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

      {/* Widgets Personalizáveis com Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {visibleWidgets.map((widget, index) => (
              <div 
                key={widget.id}
                data-onboarding={index === 0 ? 'revenue-card' : index === 1 ? 'draggable-widget' : undefined}
              >
                <DraggableWidget
                  id={widget.id}
                  visible={widget.visible}
                  onToggleVisibility={() => updateWidgetVisibility(widget.id, !widget.visible)}
                >
                  {getWidgetContent(widget.id)}
                </DraggableWidget>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      </div>
    </>
  );
}
