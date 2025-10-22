import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, TrendingDown, Calendar, Package } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<string>('30d');

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    if (user && products.length > 0) {
      loadReportData();
    }
  }, [user, selectedProduct, timePeriod, products]);

  const loadProducts = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let days = 30;

    switch (timePeriod) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case 'month':
        return {
          currentStart: startOfMonth(now),
          currentEnd: now,
          previousStart: startOfMonth(subMonths(now, 1)),
          previousEnd: endOfMonth(subMonths(now, 1)),
          days: now.getDate()
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          currentStart: startOfMonth(lastMonth),
          currentEnd: endOfMonth(lastMonth),
          previousStart: startOfMonth(subMonths(lastMonth, 1)),
          previousEnd: endOfMonth(subMonths(lastMonth, 1)),
          days: endOfMonth(lastMonth).getDate()
        };
      default:
        days = 30;
    }

    return {
      currentStart: startOfDay(subDays(now, days - 1)),
      currentEnd: now,
      previousStart: startOfDay(subDays(subDays(now, days - 1), days)),
      previousEnd: startOfDay(subDays(now, days)),
      days
    };
  };

  const loadReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const dateRange = getDateRange();
      const { currentStart, currentEnd, previousStart, previousEnd, days } = dateRange;

      // Filtrar produtos
      let productIds: string[];
      if (selectedProduct === 'all') {
        productIds = products.map(p => p.id);
      } else {
        productIds = [selectedProduct];
      }

      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      // Buscar pedidos do período atual
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString());

      // Buscar pedidos do período anterior
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

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
          .gte('created_at', currentStart.toISOString())
          .lte('created_at', currentEnd.toISOString());

        const { data: previousMP } = await supabase
          .from('module_payments')
          .select('*')
          .in('member_area_id', memberAreaIds)
          .gte('created_at', previousStart.toISOString())
          .lte('created_at', previousEnd.toISOString());

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

      // Preparar dados do gráfico
      const dailyData: DailyData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const currentDate = subDays(currentEnd, i);
        const previousDate = subDays(currentDate, days);
        
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
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada do seu desempenho
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Package className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
              Receita líquida
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <div className="text-4xl font-bold">
              {formatPriceForSeller(netRevenue.current, 'KZ')}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`flex items-center gap-1 font-medium ${netRevenue.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netRevenue.percentageChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(netRevenue.percentageChange).toFixed(2)}%
              </span>
              <span className="text-muted-foreground">
                vs. {formatPriceForSeller(netRevenue.previous, 'KZ')} no período anterior
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div 
                                className="w-3 h-3 rounded-sm" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{entry.name}:</span>
                              <span className="font-medium">
                                {formatPriceForSeller(entry.value, 'KZ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="previousPeriod" 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Período anterior"
                  opacity={0.4}
                />
                <Line 
                  type="monotone" 
                  dataKey="currentPeriod" 
                  stroke="#84cc16"
                  strokeWidth={3}
                  dot={{ fill: '#84cc16', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Período atual"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
