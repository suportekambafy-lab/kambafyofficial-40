import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import { getActualCurrency, getActualAmount, calculateSellerEarning } from '@/utils/currencyUtils';

interface ChartData {
  day: string;
  vendas: number;
}

interface MobileSalesChartProps {
  selectedCurrency?: string;
}

export function MobileSalesChart({ selectedCurrency = 'KZ' }: MobileSalesChartProps) {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user, selectedCurrency]);

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
        .select('created_at, amount, currency, product_id, payment_method, original_amount, original_currency')
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

      // Somar vendas por dia, filtrando pela moeda selecionada
      orders?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dayKey = orderDate.toISOString().split('T')[0];
        
        const actualCurrency = getActualCurrency(order);
        
        // Só incluir vendas na moeda selecionada
        if (actualCurrency !== selectedCurrency) return;
        
        const actualAmount = getActualAmount(order);
        const sellerAmount = calculateSellerEarning(actualAmount, actualCurrency);
        
        if (salesByDay[dayKey] !== undefined) {
          salesByDay[dayKey] += sellerAmount;
        }
      });

      // Converter para formato do gráfico
      const formattedData: ChartData[] = Object.entries(salesByDay).map(([date, amount]) => ({
        day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        vendas: Math.round(amount * 100) / 100
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
      label: `Vendas (${selectedCurrency})`,
      color: "#10b981"
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Vendas da Semana ({selectedCurrency})</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-gray-500">Carregando...</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <BarChart data={chartData} width={500} height={192} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis hide />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`${formatWithMaxTwoDecimals(value)} ${selectedCurrency}`, 'Vendas']}
              />
              <Bar 
                dataKey="vendas" 
                fill="var(--color-vendas)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
