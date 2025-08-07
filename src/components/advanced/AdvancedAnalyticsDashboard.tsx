import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, Target, Download, Filter } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadingState } from '@/components/ui/accessible-loading';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalSales: number;
    salesGrowth: number;
    totalCustomers: number;
    customerGrowth: number;
    conversionRate: number;
    conversionGrowth: number;
  };
  salesTimeline: Array<{
    date: string;
    sales: number;
    revenue: number;
    customers: number;
  }>;
  productPerformance: Array<{
    name: string;
    sales: number;
    revenue: number;
    conversion: number;
  }>;
  customerSegments: Array<{
    segment: string;
    value: number;
    color: string;
  }>;
  geographicData: Array<{
    location: string;
    sales: number;
    revenue: number;
  }>;
}

export const AdvancedAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar dados de vendas no período
      const { data: salesData } = await supabase
        .from('orders')
        .select(`
          *,
          products!inner(user_id, name)
        `)
        .eq('products.user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Processar dados para analytics
      const processedData = processAnalyticsData(salesData || []);
      setAnalyticsData(processedData);
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (salesData: any[]): AnalyticsData => {
    // Calcular métricas overview
    const totalRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
    const totalSales = salesData.length;
    const uniqueCustomers = new Set(salesData.map(sale => sale.customer_email)).size;

    // Timeline de vendas agrupada por dia
    const salesByDay = salesData.reduce((acc, sale) => {
      const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { sales: 0, revenue: 0, customers: new Set() };
      }
      acc[date].sales += 1;
      acc[date].revenue += parseFloat(sale.amount || 0);
      acc[date].customers.add(sale.customer_email);
      return acc;
    }, {});

    const salesTimeline = Object.entries(salesByDay).map(([date, data]: [string, any]) => ({
      date,
      sales: data.sales,
      revenue: data.revenue,
      customers: data.customers.size
    }));

    // Performance por produto
    const productStats = salesData.reduce((acc, sale) => {
      const productName = sale.products?.name || 'Produto Desconhecido';
      if (!acc[productName]) {
        acc[productName] = { sales: 0, revenue: 0 };
      }
      acc[productName].sales += 1;
      acc[productName].revenue += parseFloat(sale.amount || 0);
      return acc;
    }, {});

    const productPerformance = Object.entries(productStats).map(([name, stats]: [string, any]) => ({
      name,
      sales: stats.sales,
      revenue: stats.revenue,
      conversion: parseFloat((stats.sales / totalSales * 100).toFixed(1))
    }));

    // Segmentação de clientes (mock data)
    const customerSegments = [
      { segment: 'Novos Clientes', value: uniqueCustomers * 0.4, color: '#8884d8' },
      { segment: 'Clientes Recorrentes', value: uniqueCustomers * 0.35, color: '#82ca9d' },
      { segment: 'VIP', value: uniqueCustomers * 0.25, color: '#ffc658' }
    ];

    return {
      overview: {
        totalRevenue,
        revenueGrowth: 12.5, // Mock data
        totalSales,
        salesGrowth: 8.3,
        totalCustomers: uniqueCustomers,
        customerGrowth: 15.2,
        conversionRate: 3.4,
        conversionGrowth: -2.1
      },
      salesTimeline,
      productPerformance,
      customerSegments,
      geographicData: [] // Para implementação futura
    };
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, user]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    growth: number;
    icon: React.ReactNode;
  }> = ({ title, value, growth, icon }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {growth > 0 ? (
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
          )}
          <span className={growth > 0 ? 'text-green-500' : 'text-red-500'}>
            {Math.abs(growth)}%
          </span>
          <span className="ml-1">vs. período anterior</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || !analyticsData) {
    return <LoadingState loading={true} minHeight="min-h-96">Carregando...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Avançado</h2>
          <p className="text-muted-foreground">
            Insights detalhados sobre seu desempenho de vendas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Receita Total"
          value={`${analyticsData.overview.totalRevenue.toFixed(2)} KZ`}
          growth={analyticsData.overview.revenueGrowth}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total de Vendas"
          value={analyticsData.overview.totalSales}
          growth={analyticsData.overview.salesGrowth}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Clientes"
          value={analyticsData.overview.totalCustomers}
          growth={analyticsData.overview.customerGrowth}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${analyticsData.overview.conversionRate}%`}
          growth={analyticsData.overview.conversionGrowth}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline de Vendas</TabsTrigger>
          <TabsTrigger value="products">Performance de Produtos</TabsTrigger>
          <TabsTrigger value="customers">Segmentação de Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas ao Longo do Tempo</CardTitle>
              <CardDescription>
                Evolução das vendas e receita no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData.salesTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="Receita"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    name="Vendas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Produto</CardTitle>
              <CardDescription>
                Análise detalhada de vendas por produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#8884d8" name="Vendas" />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segmentação de Clientes</CardTitle>
              <CardDescription>
                Distribuição dos clientes por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analyticsData.customerSegments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};