import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RotateCcw, 
  Users, 
  XCircle, 
  ShoppingBag,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import type { DateRange } from '@/components/ui/custom-period-selector';

interface AdvancedKPIsProps {
  timeFilter: string;
  customDateRange?: DateRange;
  selectedProduct: string;
}

interface KPIData {
  refundRate: number;
  refundCount: number;
  totalOrders: number;
  recurringCustomers: number;
  recurringPercentage: number;
  abandonedOrders: number;
  abandonmentRate: number;
  orderBumpAcceptance: number;
  orderBumpCount: number;
  ordersWithBumpPotential: number;
}

export function ModernAdvancedKPIs({ timeFilter, customDateRange, selectedProduct }: AdvancedKPIsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    refundRate: 0,
    refundCount: 0,
    totalOrders: 0,
    recurringCustomers: 0,
    recurringPercentage: 0,
    abandonedOrders: 0,
    abandonmentRate: 0,
    orderBumpAcceptance: 0,
    orderBumpCount: 0,
    ordersWithBumpPotential: 0
  });

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeFilter === 'custom' && customDateRange) {
      return { start: customDateRange.from, end: customDateRange.to };
    }

    switch (timeFilter) {
      case 'hoje':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'ontem':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'ultimos-7-dias':
        startDate = subDays(now, 7);
        endDate = now;
        break;
      case 'ultimos-30-dias':
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case 'este-mes':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      default:
        startDate = subDays(now, 30);
        endDate = now;
    }

    return { start: startDate, end: endDate };
  }, [timeFilter, customDateRange]);

  useEffect(() => {
    const loadKPIs = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get user's products
        const { data: userProducts } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id);

        const productIds = userProducts?.map(p => p.id) || [];
        if (productIds.length === 0) {
          setLoading(false);
          return;
        }

        // Filter by selected product if not "todos"
        const filteredProductIds = selectedProduct === 'todos' 
          ? productIds 
          : [selectedProduct];

        // Fetch all completed orders in date range
        let ordersQuery = supabase
          .from('orders')
          .select('id, customer_email, has_active_refund, order_bump_data, status, expires_at, created_at')
          .in('product_id', filteredProductIds)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());

        const { data: allOrders, error: ordersError } = await ordersQuery;

        if (ordersError) {
          console.error('Error fetching orders for KPIs:', ordersError);
          return;
        }

        const orders = allOrders || [];
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalCompleted = completedOrders.length;

        // 1. Taxa de Reembolso (using has_active_refund)
        const ordersWithRefund = completedOrders.filter(o => o.has_active_refund === true);
        const refundCount = ordersWithRefund.length;
        const refundRate = totalCompleted > 0 ? (refundCount / totalCompleted) * 100 : 0;

        // 2. Vendas Recorrentes (customers who bought more than once)
        const customerEmails = completedOrders.map(o => o.customer_email?.toLowerCase()).filter(Boolean);
        const emailCounts = customerEmails.reduce((acc, email) => {
          acc[email] = (acc[email] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const recurringCustomers = Object.values(emailCounts).filter(count => count > 1).length;
        const uniqueCustomers = Object.keys(emailCounts).length;
        const recurringPercentage = uniqueCustomers > 0 ? (recurringCustomers / uniqueCustomers) * 100 : 0;

        // 3. Abandono (pending orders that have expired)
        const now = new Date();
        const abandonedOrders = orders.filter(o => {
          if (o.status !== 'pending' && o.status !== 'cancelled') return false;
          if (!o.expires_at) return o.status === 'cancelled';
          return new Date(o.expires_at) < now || o.status === 'cancelled';
        });
        const abandonedCount = abandonedOrders.length;
        const totalOrdersInPeriod = orders.length;
        const abandonmentRate = totalOrdersInPeriod > 0 ? (abandonedCount / totalOrdersInPeriod) * 100 : 0;

        // 4. Order Bumps (acceptance rate)
        // Orders that have order_bump_data with at least one item
        const ordersWithBumps = completedOrders.filter(o => {
          if (!o.order_bump_data) return false;
          try {
            const bumpData = typeof o.order_bump_data === 'string' 
              ? JSON.parse(o.order_bump_data) 
              : o.order_bump_data;
            return Array.isArray(bumpData) && bumpData.length > 0;
          } catch {
            return false;
          }
        });
        const orderBumpCount = ordersWithBumps.length;
        
        // For acceptance rate, we need to know how many orders had bump opportunities
        // We'll use completed orders as the base (assuming all had potential for bumps)
        const orderBumpAcceptance = totalCompleted > 0 ? (orderBumpCount / totalCompleted) * 100 : 0;

        setKpiData({
          refundRate,
          refundCount,
          totalOrders: totalCompleted,
          recurringCustomers,
          recurringPercentage,
          abandonedOrders: abandonedCount,
          abandonmentRate,
          orderBumpAcceptance,
          orderBumpCount,
          ordersWithBumpPotential: totalCompleted
        });

      } catch (error) {
        console.error('Error loading KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKPIs();
  }, [user, dateRange, selectedProduct]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Taxa de Reembolso',
      value: `${kpiData.refundRate.toFixed(1)}%`,
      subValue: `${kpiData.refundCount} de ${kpiData.totalOrders}`,
      icon: RotateCcw,
      color: kpiData.refundRate > 5 ? 'text-destructive' : 'text-emerald-500',
      bgColor: kpiData.refundRate > 5 ? 'bg-destructive/10' : 'bg-emerald-500/10',
      trend: kpiData.refundRate > 5 ? 'bad' : 'good'
    },
    {
      label: 'Clientes Recorrentes',
      value: `${kpiData.recurringPercentage.toFixed(1)}%`,
      subValue: `${kpiData.recurringCustomers} clientes`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: kpiData.recurringPercentage > 10 ? 'good' : 'neutral'
    },
    {
      label: 'Taxa de Abandono',
      value: `${kpiData.abandonmentRate.toFixed(1)}%`,
      subValue: `${kpiData.abandonedOrders} pedidos`,
      icon: XCircle,
      color: kpiData.abandonmentRate > 30 ? 'text-destructive' : 'text-amber-500',
      bgColor: kpiData.abandonmentRate > 30 ? 'bg-destructive/10' : 'bg-amber-500/10',
      trend: kpiData.abandonmentRate > 30 ? 'bad' : 'neutral'
    },
    {
      label: 'Aceitação Order Bump',
      value: `${kpiData.orderBumpAcceptance.toFixed(1)}%`,
      subValue: `${kpiData.orderBumpCount} aceitos`,
      icon: ShoppingBag,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: kpiData.orderBumpAcceptance > 15 ? 'good' : 'neutral'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card 
            key={index} 
            className="p-4 border-border/40 hover:border-border/60 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              {kpi.trend === 'good' && (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
              {kpi.trend === 'bad' && (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.subValue}</p>
          </Card>
        );
      })}
    </div>
  );
}
