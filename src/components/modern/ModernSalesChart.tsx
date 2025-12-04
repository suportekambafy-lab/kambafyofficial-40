import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface ChartData {
  time: string;
  vendas: number;
}

interface ModernSalesChartProps {
  timeFilter?: string;
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

export function ModernSalesChart({ timeFilter = 'hoje' }: ModernSalesChartProps) {
  const { user } = useAuth();
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
  }, [user, timeFilter]);

  const fetchChartData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);
      
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

      // Fetch counts using count queries (no 1000 row limit)
      const [
        { count: totalOrdersCount },
        { count: paidOrdersCountResult },
        { count: prevTotalCount },
        { count: prevPaidCount }
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('product_id', userProductIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('product_id', userProductIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('product_id', userProductIds)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', prevEndDate.toISOString()),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('product_id', userProductIds)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', prevEndDate.toISOString())
          .eq('status', 'completed')
      ]);

      // Set counts from direct queries
      setOrdersCount(totalOrdersCount || 0);
      setPaidOrdersCount(paidOrdersCountResult || 0);
      setOrdersTrend((totalOrdersCount || 0) - (prevTotalCount || 0));
      setPaidTrend((paidOrdersCountResult || 0) - (prevPaidCount || 0));

      // Fetch orders for chart data (limited to recent for visualization)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, seller_commission, currency, product_id, status')
        .in('product_id', userProductIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

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
          const exchangeRates: Record<string, number> = { 'EUR': 1053, 'MZN': 14.3 };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        total += amount;
      });
      setTotalValue(total);

      // Group data by hour for today/yesterday, or by day for longer periods
      if (timeFilter === 'hoje' || timeFilter === 'ontem') {
        const salesByHour: { [key: string]: number } = {};
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
            const exchangeRates: Record<string, number> = { 'EUR': 1053, 'MZN': 14.3 };
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
        const salesByDay: { [key: string]: number } = {};
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
            const exchangeRates: Record<string, number> = { 'EUR': 1053, 'MZN': 14.3 };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          if (salesByDay[dayKey] !== undefined) {
            salesByDay[dayKey] += amount;
          }
        });

        const formattedData: ChartData[] = Object.entries(salesByDay).map(([date, amount]) => ({
          time: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
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

  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* KPI Cards - First on mobile, second on desktop */}
      <div className="flex flex-row md:flex-col gap-2 md:w-40 order-first md:order-last">
        <div className="bg-card rounded-xl border border-border/40 p-3 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-muted-foreground">Pedidos feitos</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
              ordersTrend >= 0 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-600'
            }`}>
              {ordersTrend >= 0 ? '+' : ''}{ordersTrend}
              {ordersTrend >= 0 
                ? <TrendingUp className="w-2.5 h-2.5" /> 
                : <TrendingDown className="w-2.5 h-2.5" />
              }
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{filterLabel}</span>
          <p className="text-xl font-bold text-foreground">{ordersCount.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-xl border border-border/40 p-3 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-muted-foreground">Pedidos pagos</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
              paidTrend >= 0 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-600'
            }`}>
              {paidTrend >= 0 ? '+' : ''}{paidTrend}
              {paidTrend >= 0 
                ? <TrendingUp className="w-2.5 h-2.5" /> 
                : <TrendingDown className="w-2.5 h-2.5" />
              }
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{filterLabel}</span>
          <p className="text-xl font-bold text-foreground">{paidOrdersCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart Card */}
      <Card className="flex-1 rounded-xl shadow-sm border border-border/40 bg-card overflow-hidden order-last md:order-first">
        <CardHeader className="pb-1 px-4 pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Desempenho de vendas</span>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 pb-3">
          {loading ? (
            <div className="h-[180px] flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Carregando...</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={5}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  tickFormatter={value => {
                    if (value === 0) return '0';
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                  width={45}
                  domain={[0, 'auto']}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value: number) => [`${value.toLocaleString()} KZ`, 'Vendas']} 
                />
                <Area 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorVendasGradient)"
                  dot={{ fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2, r: 3 }}
                  activeDot={{ fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2, r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}