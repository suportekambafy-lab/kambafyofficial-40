
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SalesData {
  date: string;
  currentPeriod: number;
  previousPeriod: number;
  revenue: number;
}

interface ComparativeSalesChartProps {
  dateFilter: string;
}

export function ComparativeSalesChart({ dateFilter }: ComparativeSalesChartProps) {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<{ percentage: number; direction: 'up' | 'down' | 'neutral' }>({
    percentage: 0,
    direction: 'neutral'
  });

  useEffect(() => {
    if (user) {
      loadComparativeData();
    }
  }, [user, dateFilter]);

  const getDateRanges = () => {
    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    let days = 7;
    
    switch (dateFilter) {
      case "ontem":
        days = 1;
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 1);
        currentStart.setHours(0, 0, 0, 0);
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        break;
        
      case "ultimos-7-dias":
        days = 7;
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 7);
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        break;
        
      case "ultimo-mes":
        days = 30;
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 30);
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 30);
        break;
        
      case "hoje":
      default:
        days = 1;
        currentStart = new Date(now);
        currentStart.setHours(0, 0, 0, 0);
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        break;
    }
    
    return { currentStart, previousStart, days };
  };

  const loadComparativeData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { currentStart, previousStart, days } = getDateRanges();
      
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + days);
      
      const previousEnd = new Date(previousStart);
      previousEnd.setDate(previousEnd.getDate() + days);

      // Buscar produtos do usuário primeiro
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setSalesData([]);
        setTrend({ percentage: 0, direction: 'neutral' });
        return;
      }

      // Buscar dados do período atual - usando product_id (excluir member access)
      const { data: currentOrders, error: currentError } = await supabase
        .from('orders')
        .select('amount, created_at, status, product_id, currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access')
        .gte('created_at', currentStart.toISOString())
        .lt('created_at', currentEnd.toISOString())
        .order('created_at', { ascending: true });

      // Buscar dados do período anterior - usando product_id (excluir member access)
      const { data: previousOrders, error: previousError } = await supabase
        .from('orders')
        .select('amount, created_at, status, product_id, currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString())
        .order('created_at', { ascending: true });

      if (currentError || previousError) {
        console.error('Error loading comparative data:', currentError || previousError);
        return;
      }

      // Processar dados por dia
      const chartData: Record<string, SalesData> = {};
      
      // Inicializar dias
      for (let i = 0; i < days; i++) {
        const date = new Date(currentStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('pt-AO', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        chartData[dateKey] = {
          date: displayDate,
          currentPeriod: 0,
          previousPeriod: 0,
          revenue: 0
        };
      }

      // Agregar dados do período atual
      currentOrders?.forEach(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (chartData[orderDate]) {
          chartData[orderDate].currentPeriod += 1;
          let amount = parseFloat(order.amount) || 0;
          // Converter para KZ se necessário
          if (order.currency && order.currency !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1053, // 1 EUR = ~1053 KZ
              'MZN': 14.3  // 1 MZN = ~14.3 KZ
            };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          chartData[orderDate].revenue += amount;
        }
      });

      // Agregar dados do período anterior
      previousOrders?.forEach(order => {
        const orderDate = new Date(order.created_at);
        // Ajustar a data para corresponder ao período atual
        const adjustedDate = new Date(orderDate);
        adjustedDate.setDate(adjustedDate.getDate() + days);
        const adjustedDateKey = adjustedDate.toISOString().split('T')[0];
        
        if (chartData[adjustedDateKey]) {
          chartData[adjustedDateKey].previousPeriod += 1;
        }
      });

      const finalData = Object.values(chartData);
      setSalesData(finalData);

      // Calcular tendência
      const currentTotal = finalData.reduce((sum, item) => sum + item.currentPeriod, 0);
      const previousTotal = finalData.reduce((sum, item) => sum + item.previousPeriod, 0);
      
      let percentage = 0;
      let direction: 'up' | 'down' | 'neutral' = 'neutral';
      
      if (previousTotal > 0) {
        percentage = ((currentTotal - previousTotal) / previousTotal) * 100;
        direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
      } else if (currentTotal > 0) {
        percentage = 100;
        direction = 'up';
      }

      setTrend({ percentage: Math.abs(percentage), direction });

    } catch (error) {
      console.error('Error loading comparative data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    currentPeriod: {
      label: "Período Atual",
      color: "hsl(var(--chart-1))",
    },
    previousPeriod: {
      label: "Período Anterior",
      color: "hsl(var(--chart-2))",
    },
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Comparativo de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 md:h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = salesData.some(item => item.currentPeriod > 0 || item.previousPeriod > 0);

  if (!hasData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Comparativo de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 md:h-12 w-8 md:w-12 mx-auto mb-2" />
              <p className="text-sm md:text-base">Nenhuma venda no período selecionado</p>
              <p className="text-xs md:text-sm mt-2">Dados insuficientes para comparação</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base md:text-lg">Comparativo de Vendas</CardTitle>
          {trend.direction !== 'neutral' && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">{trend.percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="w-full h-48 md:h-56 lg:h-64">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={salesData} 
                margin={{ 
                  top: 10, 
                  right: 10, 
                  left: 10, 
                  bottom: 10 
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  height={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  width={30}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="previousPeriod"
                  fill="var(--color-previousPeriod)"
                  radius={[2, 2, 0, 0]}
                  opacity={0.7}
                  name="Período Anterior"
                />
                <Bar
                  dataKey="currentPeriod"
                  fill="var(--color-currentPeriod)"
                  radius={[2, 2, 0, 0]}
                  name="Período Atual"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
