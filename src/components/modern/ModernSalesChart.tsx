
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  day: string;
  vendas: number;
}

export function ModernSalesChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchChartData();
      
      const channel = supabase
        .channel('chart-orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            fetchChartData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, seller_commission, currency, product_id, order_id')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        return;
      }

      const salesByDay: { [key: string]: number } = {};
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        salesByDay[dayKey] = 0;
      }

      let total = 0;
      orders?.forEach(order => {
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
        total += amount;
      });

      setTotalValue(total);
      setTotalCount(orders?.length || 0);

      const formattedData: ChartData[] = Object.entries(salesByDay).map(([date, amount]) => ({
        day: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        vendas: Math.round(amount)
      }));

      setChartData(formattedData);
    } catch (error) {
      // Error silently handled
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
    <Card className="rounded-[14px] shadow-card border border-border/50 w-full overflow-hidden h-full">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total em transações recebidas</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-0.5">
              {totalValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ
            </h2>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{totalCount}</span> transações (7 dias)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        {loading ? (
          <div className="h-[180px] flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                width={40}
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
                fill="url(#colorVendas)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
