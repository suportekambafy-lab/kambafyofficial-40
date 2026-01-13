import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ReferralCommission } from '@/hooks/useSellerReferrals';
import { TrendingUp } from 'lucide-react';

interface ReferralCommissionsChartProps {
  commissions: ReferralCommission[];
}

export function ReferralCommissionsChart({ commissions }: ReferralCommissionsChartProps) {
  const chartData = useMemo(() => {
    // Agrupar comissões por mês
    const monthlyData: Record<string, number> = {};
    
    commissions.forEach(commission => {
      const date = new Date(commission.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(commission.commission_amount);
    });

    // Gerar últimos 6 meses
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      result.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        valor: monthlyData[monthKey] || 0,
      });
    }

    return result;
  }, [commissions]);

  const totalThisMonth = chartData[chartData.length - 1]?.valor || 0;
  const totalLastMonth = chartData[chartData.length - 2]?.valor || 0;
  const percentChange = totalLastMonth > 0 
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth * 100).toFixed(0) 
    : totalThisMonth > 0 ? '100' : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Comissões por Mês
            </CardTitle>
            <CardDescription>
              Evolução das suas comissões de indicação
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalThisMonth.toLocaleString('pt-AO')} KZ</p>
            <p className={`text-sm ${Number(percentChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Number(percentChange) >= 0 ? '+' : ''}{percentChange}% vs mês anterior
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {commissions.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('pt-AO')} KZ`, 'Comissão']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="valor" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma comissão ainda</p>
                <p className="text-sm">Suas comissões aparecerão aqui</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
