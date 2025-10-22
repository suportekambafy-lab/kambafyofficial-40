import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { SEO } from '@/components/SEO';

interface DailyData {
  date: string;
  currentPeriod: number;
  previousPeriod: number;
  displayDate: string;
}

interface MetricData {
  current: number;
  previous: number;
  percentageChange: number;
}

export default function SellerReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [netRevenue, setNetRevenue] = useState<MetricData>({ current: 0, previous: 0, percentageChange: 0 });
  const [approvalRate, setApprovalRate] = useState<MetricData>({ current: 0, previous: 0, percentageChange: 0 });
  const [averageTicket, setAverageTicket] = useState<MetricData>({ current: 0, previous: 0, percentageChange: 0 });

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user]);

  const loadReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Definir períodos: últimos 30 dias (período atual) e 30 dias anteriores (período anterior)
      const currentEndDate = new Date();
      const currentStartDate = startOfDay(subDays(currentEndDate, 29));
      const previousEndDate = startOfDay(subDays(currentStartDate, 1));
      const previousStartDate = startOfDay(subDays(previousEndDate, 29));

      // Buscar produtos do usuário
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const productIds = products?.map(p => p.id) || [];

      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      // Buscar pedidos do período atual
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', currentStartDate.toISOString())
        .lte('created_at', currentEndDate.toISOString());

      // Buscar pedidos do período anterior
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      // Buscar member_areas e module_payments
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', user.id);

      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];

      let currentModulePayments: any[] = [];
      let previousModulePayments: any[] = [];

      if (memberAreaIds.length > 0) {
        const { data: currentMP } = await supabase
          .from('module_payments')
          .select('*')
          .in('member_area_id', memberAreaIds)
          .gte('created_at', currentStartDate.toISOString())
          .lte('created_at', currentEndDate.toISOString());

        const { data: previousMP } = await supabase
          .from('module_payments')
          .select('*')
          .in('member_area_id', memberAreaIds)
          .gte('created_at', previousStartDate.toISOString())
          .lte('created_at', previousEndDate.toISOString());

        currentModulePayments = currentMP || [];
        previousModulePayments = previousMP || [];
      }

      // Calcular métricas
      const calculateMetrics = (orders: any[], modulePayments: any[]) => {
        const completedOrders = orders?.filter(o => o.status === 'completed') || [];
        const completedMP = modulePayments?.filter(mp => mp.status === 'completed') || [];
        
        // Receita líquida (com taxa de 8.99% descontada)
        const ordersRevenue = completedOrders.reduce((sum, order) => {
          const amount = parseFloat(order.seller_commission || order.amount || '0');
          return sum + (amount * 0.9101); // Aplica taxa se não tiver seller_commission
        }, 0);

        const mpRevenue = completedMP.reduce((sum, mp) => {
          const amount = parseFloat(mp.amount || '0');
          return sum + (amount * 0.92); // Taxa de 8% para módulos
        }, 0);

        const totalRevenue = ordersRevenue + mpRevenue;

        // Taxa de aprovação (completed vs total)
        const totalOrders = (orders?.length || 0) + (modulePayments?.length || 0);
        const approvedOrders = completedOrders.length + completedMP.length;
        const approvalRate = totalOrders > 0 ? (approvedOrders / totalOrders) * 100 : 0;

        // Ticket médio
        const avgTicket = approvedOrders > 0 ? totalRevenue / approvedOrders : 0;

        return { totalRevenue, approvalRate, avgTicket };
      };

      const current = calculateMetrics(currentOrders || [], currentModulePayments);
      const previous = calculateMetrics(previousOrders || [], previousModulePayments);

      // Calcular variações percentuais
      const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
      };

      setNetRevenue({
        current: current.totalRevenue,
        previous: previous.totalRevenue,
        percentageChange: calculateChange(current.totalRevenue, previous.totalRevenue)
      });

      setApprovalRate({
        current: current.approvalRate,
        previous: previous.approvalRate,
        percentageChange: calculateChange(current.approvalRate, previous.approvalRate)
      });

      setAverageTicket({
        current: current.avgTicket,
        previous: previous.avgTicket,
        percentageChange: calculateChange(current.avgTicket, previous.avgTicket)
      });

      // Preparar dados do gráfico (últimos 30 dias)
      const dailyData: DailyData[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const currentDate = subDays(currentEndDate, i);
        const previousDate = subDays(currentDate, 30);
        
        const currentDayOrders = currentOrders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return format(orderDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') && o.status === 'completed';
        }) || [];

        const previousDayOrders = previousOrders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return format(orderDate, 'yyyy-MM-dd') === format(previousDate, 'yyyy-MM-dd') && o.status === 'completed';
        }) || [];

        const currentDayMP = currentModulePayments?.filter(mp => {
          const mpDate = new Date(mp.created_at);
          return format(mpDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') && mp.status === 'completed';
        }) || [];

        const previousDayMP = previousModulePayments?.filter(mp => {
          const mpDate = new Date(mp.created_at);
          return format(mpDate, 'yyyy-MM-dd') === format(previousDate, 'yyyy-MM-dd') && mp.status === 'completed';
        }) || [];

        const currentDayRevenue = [
          ...currentDayOrders.map(o => parseFloat(String(o.seller_commission || o.amount || '0')) * 0.9101),
          ...currentDayMP.map(mp => parseFloat(String(mp.amount || '0')) * 0.92)
        ].reduce((sum, val) => sum + val, 0);

        const previousDayRevenue = [
          ...previousDayOrders.map(o => parseFloat(String(o.seller_commission || o.amount || '0')) * 0.9101),
          ...previousDayMP.map(mp => parseFloat(String(mp.amount || '0')) * 0.92)
        ].reduce((sum, val) => sum + val, 0);

        dailyData.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          displayDate: format(currentDate, 'd MMM', { locale: ptBR }),
          currentPeriod: Math.round(currentDayRevenue),
          previousPeriod: Math.round(previousDayRevenue)
        });
      }

      setChartData(dailyData);

    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    currentPeriod: {
      label: 'Período atual',
      color: 'hsl(var(--chart-1))',
    },
    previousPeriod: {
      label: 'Período anterior',
      color: 'hsl(var(--chart-2))',
    },
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    previousValue, 
    isPercentage = false,
    isCurrency = false 
  }: { 
    title: string; 
    value: number; 
    change: number; 
    previousValue: number;
    isPercentage?: boolean;
    isCurrency?: boolean;
  }) => {
    const isPositive = change >= 0;
    const formattedValue = isCurrency 
      ? formatPriceForSeller(value, 'KZ')
      : isPercentage 
        ? `${value.toFixed(2)}%`
        : value.toFixed(2);
    
    const formattedPrevious = isCurrency
      ? formatPriceForSeller(previousValue, 'KZ')
      : isPercentage
        ? `${previousValue.toFixed(2)}%`
        : previousValue.toFixed(2);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
            <Info className="h-4 w-4 text-muted-foreground/50" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">{formattedValue}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`flex items-center gap-1 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(change).toFixed(2)}%
            </span>
            <span className="text-muted-foreground">
              vs. {formattedPrevious} no período anterior
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <SEO 
          title="Relatórios - Kambafy"
          description="Analise suas métricas de vendas e desempenho"
        />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SEO 
        title="Relatórios - Kambafy"
        description="Analise suas métricas de vendas e desempenho"
      />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise detalhada do seu desempenho nos últimos 30 dias
        </p>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Receita líquida"
          value={netRevenue.current}
          previousValue={netRevenue.previous}
          change={netRevenue.percentageChange}
          isCurrency
        />
        <MetricCard
          title="Taxa de aprovação"
          value={approvalRate.current}
          previousValue={approvalRate.previous}
          change={approvalRate.percentageChange}
          isPercentage
        />
        <MetricCard
          title="Ticket médio"
          value={averageTicket.current}
          previousValue={averageTicket.previous}
          change={averageTicket.percentageChange}
          isCurrency
        />
      </div>

      {/* Gráfico de evolução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Receita líquida - Últimos 30 dias
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: any) => [`${formatPriceForSeller(value, 'KZ')}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="currentPeriod" 
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Período atual"
                />
                <Line 
                  type="monotone" 
                  dataKey="previousPeriod" 
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                  strokeDasharray="5 5"
                  name="Período anterior"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
