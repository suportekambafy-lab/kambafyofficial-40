import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard } from 'lucide-react';

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Cartão': 'hsl(142, 71%, 45%)',
  'Referência': 'hsl(38, 92%, 50%)',
  'M-Pesa': 'hsl(0, 84%, 60%)',
  'Multicaixa Express': 'hsl(217, 91%, 60%)',
  'Outro': 'hsl(240, 4%, 65%)',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'card': 'Cartão',
  'stripe': 'Cartão',
  'reference': 'Referência',
  'mpesa': 'M-Pesa',
  'multicaixa_express': 'Multicaixa Express',
  'express': 'Multicaixa Express',
};

export function ModernPaymentMethodsChart() {
  const { user } = useAuth();
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPaymentMethodsData();
    }
  }, [user]);

  const fetchPaymentMethodsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: userProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setData([]);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('orders')
        .select('payment_method')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const methodCounts: Record<string, number> = {};
      
      orders?.forEach(order => {
        const method = order.payment_method?.toLowerCase() || 'outro';
        const label = PAYMENT_METHOD_LABELS[method] || 'Outro';
        methodCounts[label] = (methodCounts[label] || 0) + 1;
      });

      const chartData: PaymentMethodData[] = Object.entries(methodCounts)
        .map(([name, value]) => ({
          name,
          value,
          color: PAYMENT_METHOD_COLORS[name] || PAYMENT_METHOD_COLORS['Outro']
        }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
      setTotal(orders?.length || 0);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.value} ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-[14px] shadow-card border border-border/50 overflow-hidden h-full">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-semibold">Métodos de Pagamento</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <div className="h-[180px] flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Sem dados</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
