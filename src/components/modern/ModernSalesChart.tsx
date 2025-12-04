import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
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
        return;
      }

      // Determine date range based on filter
      const now = new Date();
      let startDate = new Date();
      let prevStartDate = new Date();
      let prevEndDate = new Date();

      if (timeFilter === 'hoje') {
        startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(startDate);
      } else {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
        prevEndDate.setDate(now.getDate() - 7);
      }

      // Fetch current period orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, seller_commission, currency, product_id, status')
        .in('product_id', userProductIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Fetch previous period for trend comparison
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('status')
        .in('product_id', userProductIds)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', prevEndDate.toISOString());

      if (error) return;

      // Calculate totals
      const allOrders = orders || [];
      const completedOrders = allOrders.filter(o => o.status === 'completed');
      const prevAllOrders = prevOrders || [];
      const prevCompletedOrders = prevAllOrders.filter(o => o.status === 'completed');

      setOrdersCount(allOrders.length);
      setPaidOrdersCount(completedOrders.length);
      setOrdersTrend(allOrders.length - prevAllOrders.length);
      setPaidTrend(completedOrders.length - prevCompletedOrders.length);

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

      // Group data by hour for today, or by day for week
      if (timeFilter === 'hoje') {
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
        // Weekly view
        const salesByDay: { [key: string]: number } = {};
        for (let i = 6; i >= 0; i--) {
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

  return (
    <Card className="rounded-[14px] shadow-sm border border-border/40 bg-card overflow-hidden">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">Desempenho de vendas</span>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  tickFormatter={value => {
                    if (value === 0) return '0';
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                  width={45}
                  domain={[0, 'auto']}
                  ticks={[0, 125, 250, 375, 500]}
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
                  dot={{ fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2, r: 6 }}
                />
              </AreaChart>
            </ChartContainer>

            {/* KPI Stats Row */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Pedidos feitos</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    ordersTrend >= 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {ordersTrend >= 0 ? '+' : ''}{ordersTrend}
                    {ordersTrend >= 0 
                      ? <TrendingUp className="w-3 h-3" /> 
                      : <TrendingDown className="w-3 h-3" />
                    }
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Todos</span>
                <p className="text-2xl font-bold text-foreground">{ordersCount}</p>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Pedidos pagos</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    paidTrend >= 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {paidTrend >= 0 ? '+' : ''}{paidTrend < 0 ? paidTrend.toString().replace('-', '-0') : paidTrend.toString().padStart(2, '0')}
                    {paidTrend >= 0 
                      ? <TrendingUp className="w-3 h-3" /> 
                      : <TrendingDown className="w-3 h-3" />
                    }
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Todos</span>
                <p className="text-2xl font-bold text-foreground">{paidOrdersCount}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}