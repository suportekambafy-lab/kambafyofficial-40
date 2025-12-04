
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, CheckCircle } from 'lucide-react';

interface ChartData {
  day: string;
  vendas: number;
}

export function MobileSalesChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  useEffect(() => {
    if (user) {
      fetchChartData();
      fetchOrderCounts();
    }
  }, [user]);

  const fetchOrderCounts = async () => {
    if (!user) return;

    try {
      // Buscar produtos do usuário primeiro
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setTotalOrders(0);
        setCompletedOrders(0);
        return;
      }

      // Contar total de pedidos
      const { count: totalCount, error: totalError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('product_id', userProductIds);

      if (!totalError && totalCount !== null) {
        setTotalOrders(totalCount);
      }

      // Contar pedidos pagos
      const { count: completedCount, error: completedError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('product_id', userProductIds)
        .eq('status', 'completed');

      if (!completedError && completedCount !== null) {
        setCompletedOrders(completedCount);
      }
    } catch (error) {
      console.error('Error fetching order counts:', error);
    }
  };

  const fetchChartData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Buscar produtos do usuário primeiro
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

      // Buscar vendas dos últimos 7 dias usando product_id
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, currency, product_id')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        return;
      }

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
        // Converter para KZ se necessário (APENAS UMA VEZ)
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053, // 1 EUR = ~1053 KZ
            'MZN': 14.3  // 1 MZN = ~14.3 KZ
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
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
      // Error silently handled
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
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">Desempenho - Últimos 7 Dias</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex gap-2">
          {/* Chart section */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <span className="text-gray-500 text-sm">Carregando...</span>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-32 w-full">
                <BarChart data={chartData} width={300} height={128} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
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
              </ChartContainer>
            )}
          </div>

          {/* KPI Cards */}
          <div className="flex flex-col gap-2 w-24 shrink-0">
            {/* Pedidos feitos */}
            <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center justify-center flex-1">
              <ShoppingCart className="h-4 w-4 text-blue-600 mb-1" />
              <span className="text-lg font-bold text-blue-900">{totalOrders.toLocaleString()}</span>
              <span className="text-[10px] text-blue-600 text-center leading-tight">Pedidos feitos</span>
            </div>

            {/* Pedidos pagos */}
            <div className="bg-green-50 rounded-lg p-2 flex flex-col items-center justify-center flex-1">
              <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
              <span className="text-lg font-bold text-green-900">{completedOrders.toLocaleString()}</span>
              <span className="text-[10px] text-green-600 text-center leading-tight">Pedidos pagos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
