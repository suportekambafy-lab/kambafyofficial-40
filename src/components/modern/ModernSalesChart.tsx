
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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

  useEffect(() => {
    if (user) {
      fetchChartData();
      
      // Set up real-time subscription for chart updates
      const channel = supabase
        .channel('chart-orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Chart data update triggered:', payload);
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
      
      // Buscar vendas dos últimos 7 dias - CORRIGIDO para usar user_id diretamente
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      console.log('📊 Chart carregando vendas dos últimos 7 dias para:', user.id);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, currency')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar dados do chart:', error);
        return;
      }

      console.log(`✅ Chart carregou ${orders?.length || 0} vendas dos últimos 7 dias`);

      // Processar dados por dia
      const salesByDay: { [key: string]: number } = {};
      
      // Inicializar todos os dias com 0
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        salesByDay[dayKey] = 0;
      }

      // Somar vendas por dia
      orders?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dayKey = orderDate.toISOString().split('T')[0];
        
        let amount = parseFloat(order.amount || '0');
        const currency = order.currency || 'KZ';
        
        // Converter para KZ
        if (currency === 'EUR') {
          amount *= 833;
        } else if (currency === 'MZN') {
          amount *= 13;
        }
        
        if (salesByDay[dayKey] !== undefined) {
          salesByDay[dayKey] += amount;
        }
      });

      // Converter para formato do gráfico
      const formattedData: ChartData[] = Object.entries(salesByDay).map(([date, amount]) => ({
        day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        vendas: Math.round(amount)
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    vendas: {
      label: "Vendas",
      color: "#10b981"
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Vendas dos Últimos 7 Dias</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <span className="text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis hide />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${value.toLocaleString()} KZ`, 'Vendas']}
                />
                <Bar 
                  dataKey="vendas" 
                  fill="var(--color-vendas)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
