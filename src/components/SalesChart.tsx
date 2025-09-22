import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
}

interface SalesChartProps {
  dateFilter: string;
}

export function SalesChart({ dateFilter }: SalesChartProps) {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSalesData();
    }
  }, [user, dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let days = 7;
    
    switch (dateFilter) {
      case "ontem":
        days = 2;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "ultimos-7-dias":
        days = 7;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "ultimo-mes":
        days = 30;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "hoje":
      default:
        days = 1;
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    return { startDate, days };
  };

  const loadSalesData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { startDate, days } = getDateRange();

      // Buscar produtos do usuário primeiro
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setSalesData([]);
        return;
      }

      // Buscar vendas recuperadas para aplicar desconto
      const { data: recoveredPurchases } = await supabase
        .from('abandoned_purchases')
        .select('recovered_order_id')
        .eq('status', 'recovered')
        .not('recovered_order_id', 'is', null);

      const recoveredOrderIds = new Set(
        recoveredPurchases?.map(p => p.recovered_order_id).filter(Boolean) || []
      );

      // Buscar pedidos do período usando product_id
      const { data: orders, error } = await supabase
        .from('orders')
        .select('amount, created_at, status, product_id, order_id, currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading sales data:', error);
        return;
      }

      // Processar dados por dia baseado nos pedidos reais
      const salesByDate: Record<string, { sales: number; revenue: number }> = {};
      
      // Inicializar todos os dias do período com zero
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        salesByDate[dateKey] = { sales: 0, revenue: 0 };
      }

      // Agregar vendas por data (cada pedido = 1 venda)
      orders?.forEach(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (salesByDate[orderDate]) {
          salesByDate[orderDate].sales += 1; // Cada pedido é uma venda
          
          let amount = parseFloat(order.amount) || 0;
          // Se não é KZ, converter para KZ usando as taxas corretas
          if (order.currency && order.currency !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1053, // 1 EUR = ~1053 KZ
              'MZN': 14.3  // 1 MZN = ~14.3 KZ
            };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          // Aplicar desconto de 20% se for venda recuperada
          const isRecovered = recoveredOrderIds.has(order.order_id);
          if (isRecovered) {
            amount = amount * 0.8;
          }
          
          salesByDate[orderDate].revenue += amount;
        }
      });

      // Converter para formato do gráfico
      const chartData = Object.entries(salesByDate).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('pt-AO', { 
          day: '2-digit', 
          month: '2-digit' 
        }),
        sales: data.sales,
        revenue: data.revenue
      }));

      setSalesData(chartData);

    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    sales: {
      label: "Vendas",
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Receita (KZ)",
      color: "hsl(var(--chart-2))",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 md:h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = salesData.some(item => item.sales > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 md:h-12 w-8 md:w-12 mx-auto mb-2" />
              <p className="text-sm md:text-base">Nenhuma venda no período selecionado</p>
              <p className="text-xs md:text-sm mt-2">Crie seu primeiro produto para começar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas ao longo do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 md:h-64">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-sales)", strokeWidth: 2, r: 4 }}
                  name="Vendas"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
