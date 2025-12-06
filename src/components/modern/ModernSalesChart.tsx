import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, CheckCircle2 } from 'lucide-react';
interface ChartData {
  time: string;
  vendas: number;
}
interface ModernSalesChartProps {
  timeFilter?: string;
  customDateRange?: { from: Date; to: Date } | null;
}
const getFilterLabel = (filter: string) => {
  const labels: Record<string, string> = {
    'hoje': 'Hoje',
    'ontem': 'Ontem',
    'ultimos-7-dias': 'Últimos 7 dias',
    'ultimos-30-dias': 'Últimos 30 dias',
    'este-mes': 'Este mês',
    'custom': 'Período personalizado'
  };
  return labels[filter] || 'Todos';
};
export function ModernSalesChart({
  timeFilter = 'hoje',
  customDateRange = null
}: ModernSalesChartProps) {
  const {
    user
  } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState(0);
  const [ordersTrend, setOrdersTrend] = useState(0);
  const [paidTrend, setPaidTrend] = useState(0);
  useEffect(() => {
    if (user) {
      fetchChartData();
      const channel = supabase.channel('chart-orders-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchChartData();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, timeFilter, customDateRange]);
  const fetchChartData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const {
        data: userProducts,
        error: productsError
      } = await supabase.from('products').select('id').eq('user_id', user.id);
      if (productsError) throw productsError;
      const userProductIds = userProducts?.map(p => p.id) || [];
      if (userProductIds.length === 0) {
        setChartData([]);
        setOrdersCount(0);
        setPaidOrdersCount(0);
        setOrdersTrend(0);
        setPaidTrend(0);
        return;
      }

      // Determine date range based on filter
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      let prevStartDate = new Date();
      let prevEndDate = new Date();
      let daysInPeriod = 1;

      if (timeFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
        startDate = new Date(customDateRange.from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDateRange.to);
        endDate.setHours(23, 59, 59, 999);
        daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysInPeriod);
        prevEndDate = new Date(startDate);
      } else {
        switch (timeFilter) {
          case 'hoje':
            startDate.setHours(0, 0, 0, 0);
            endDate = now;
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 1);
            prevEndDate = new Date(startDate);
            daysInPeriod = 1;
            break;
          case 'ontem':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 1);
            prevEndDate = new Date(startDate);
            daysInPeriod = 1;
            break;
          case 'ultimos-7-dias':
            startDate.setDate(now.getDate() - 7);
            endDate = now;
            prevStartDate.setDate(now.getDate() - 14);
            prevEndDate.setDate(now.getDate() - 7);
            daysInPeriod = 7;
            break;
          case 'ultimos-30-dias':
            startDate.setDate(now.getDate() - 30);
            endDate = now;
            prevStartDate.setDate(now.getDate() - 60);
            prevEndDate.setDate(now.getDate() - 30);
            daysInPeriod = 30;
            break;
          case 'este-mes':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = now;
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
            daysInPeriod = now.getDate();
            break;
          default:
            startDate.setDate(now.getDate() - 7);
            endDate = now;
            prevStartDate.setDate(now.getDate() - 14);
            prevEndDate.setDate(now.getDate() - 7);
            daysInPeriod = 7;
        }
      }

      // Fetch counts using count queries (no 1000 row limit)
      const [{
        count: totalOrdersCount
      }, {
        count: paidOrdersCountResult
      }, {
        count: prevTotalCount
      }, {
        count: prevPaidCount
      }] = await Promise.all([supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).in('product_id', userProductIds).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()), supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).in('product_id', userProductIds).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()).eq('status', 'completed'), supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).in('product_id', userProductIds).gte('created_at', prevStartDate.toISOString()).lt('created_at', prevEndDate.toISOString()), supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).in('product_id', userProductIds).gte('created_at', prevStartDate.toISOString()).lt('created_at', prevEndDate.toISOString()).eq('status', 'completed')]);

      // Set counts from direct queries
      setOrdersCount(totalOrdersCount || 0);
      setPaidOrdersCount(paidOrdersCountResult || 0);
      setOrdersTrend((totalOrdersCount || 0) - (prevTotalCount || 0));
      setPaidTrend((paidOrdersCountResult || 0) - (prevPaidCount || 0));

      // Fetch orders for chart data (limited to recent for visualization)
      const {
        data: orders,
        error
      } = await supabase.from('orders').select('created_at, amount, seller_commission, currency, product_id, status').in('product_id', userProductIds).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()).eq('status', 'completed').order('created_at', {
        ascending: true
      });
      if (error) return;
      const completedOrders = orders || [];

      // Calculate total revenue from completed orders
      let total = 0;
      completedOrders.forEach(order => {
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          amount = grossAmount * 0.92;
        }
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        total += amount;
      });
      setTotalValue(total);

      // Group data by hour for today/yesterday, or by day for longer periods
      if (timeFilter === 'hoje' || timeFilter === 'ontem') {
        const salesByHour: {
          [key: string]: number;
        } = {};
        for (let i = 0; i < 24; i += 2) {
          const hourKey = `${i.toString().padStart(2, '0')}:00`;
          salesByHour[hourKey] = 0;
        }
        completedOrders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const hour = Math.floor(orderDate.getHours() / 2) * 2;
          const hourKey = `${hour.toString().padStart(2, '0')}:00`;
          let amount = parseFloat(order.seller_commission?.toString() || '0');
          if (amount === 0) {
            const grossAmount = parseFloat(order.amount || '0');
            amount = grossAmount * 0.92;
          }
          if (order.currency && order.currency !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1053,
              'MZN': 14.3
            };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          if (salesByHour[hourKey] !== undefined) {
            salesByHour[hourKey] += amount;
          }
        });
        const formattedData: ChartData[] = Object.entries(salesByHour).map(([time, amount]) => ({
          time,
          vendas: Math.round(amount)
        }));
        setChartData(formattedData);
      } else {
        // Daily view for longer periods
        const salesByDay: {
          [key: string]: number;
        } = {};
        for (let i = daysInPeriod - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toISOString().split('T')[0];
          salesByDay[dayKey] = 0;
        }
        completedOrders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const dayKey = orderDate.toISOString().split('T')[0];
          let amount = parseFloat(order.seller_commission?.toString() || '0');
          if (amount === 0) {
            const grossAmount = parseFloat(order.amount || '0');
            amount = grossAmount * 0.92;
          }
          if (order.currency && order.currency !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1053,
              'MZN': 14.3
            };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          if (salesByDay[dayKey] !== undefined) {
            salesByDay[dayKey] += amount;
          }
        });
        const formattedData: ChartData[] = Object.entries(salesByDay).map(([date, amount]) => ({
          time: new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
          }),
          vendas: Math.round(amount)
        }));
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };
  const chartConfig = {
    vendas: {
      label: "Vendas",
      color: "hsl(var(--primary))"
    }
  };
  const filterLabel = getFilterLabel(timeFilter);
  // KPI cards data structure like Wise
  const kpiCards = [
    {
      icon: ShoppingBag,
      value: ordersCount,
      label: "Pedidos feitos",
      trend: ordersTrend
    },
    {
      icon: CheckCircle2,
      value: paidOrdersCount,
      label: "Pedidos pagos",
      trend: paidTrend
    }
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards - Wise style */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {kpiCards.map((card, index) => (
          <div 
            key={index}
            className="flex-1 min-w-[140px] bg-muted/50 dark:bg-muted/30 rounded-2xl p-4 flex flex-col"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6">
              <card.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5">
              {card.value.toLocaleString()}
            </p>
            <span className="text-sm text-muted-foreground">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Chart Card - Wise style */}
      <div className="bg-muted/50 dark:bg-muted/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-base font-semibold text-foreground">Vendas</span>
          <span className="text-xs text-muted-foreground">{filterLabel}</span>
        </div>
        
        <div className="px-2 pb-4">
          {loading ? (
            <div className="h-[160px] flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Carregando...</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={true} vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="0" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={8} 
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  tickFormatter={value => {
                    if (value === 0) return '0';
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }} 
                  width={40} 
                  domain={[0, 'auto']} 
                />
                <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`${value.toLocaleString()} KZ`, 'Vendas']} />
                <Area 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="hsl(142 76% 36%)" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorVendasGradient)" 
                  dot={false} 
                  activeDot={{ fill: 'hsl(142 76% 36%)', stroke: 'white', strokeWidth: 2, r: 5 }} 
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}