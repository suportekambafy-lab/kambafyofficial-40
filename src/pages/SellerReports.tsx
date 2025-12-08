import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, RefreshCw, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { SalesTimeAnalytics } from '@/components/SalesTimeAnalytics';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { ProductFilter } from '@/components/ProductFilter';
import { useToast } from '@/hooks/use-toast';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Sale {
  id: string;
  created_at: string;
  status: string;
  amount: string;
  product_id: string;
  payment_method?: string;
  currency?: string;
}

interface Product {
  id: string;
  name: string;
}

export default function SellerReports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("90");
  const [selectedProduct, setSelectedProduct] = useState("todos");

  useEffect(() => {
    if (user) {
      loadSalesData();
    }
  }, [user, periodFilter]);

  const loadSalesData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar produtos do usuário
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      setProducts(userProducts || []);
      const userProductIds = userProducts?.map(p => p.id) || [];

      if (userProductIds.length === 0) {
        setSales([]);
        return;
      }

      // Calcular data de início
      let startDate: Date | undefined;
      if (periodFilter !== "all") {
        const days = parseInt(periodFilter);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Buscar TODAS as vendas com paginação
      let allSales: Sale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id, created_at, status, amount, product_id, payment_method, currency')
          .in('product_id', userProductIds)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        if (orders && orders.length > 0) {
          allSales = [...allSales, ...orders];
          hasMore = orders.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setSales(allSales);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por produto se selecionado
  const filteredSales = useMemo(() => {
    if (selectedProduct === "todos") return sales;
    return sales.filter(sale => sale.product_id === selectedProduct);
  }, [sales, selectedProduct]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const pending = filteredSales.filter(s => s.status === 'pending');
    const cancelled = filteredSales.filter(s => s.status === 'failed' || s.status === 'cancelled');
    
    const totalRevenue = completed.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Calcular período anterior para comparação
    const days = periodFilter === "all" ? 365 : parseInt(periodFilter);
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - days / 2);
    
    const recentSales = completed.filter(s => new Date(s.created_at) >= midPoint);
    const olderSales = completed.filter(s => new Date(s.created_at) < midPoint);
    
    const recentRevenue = recentSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const olderRevenue = olderSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    
    const revenueTrend = olderRevenue > 0 
      ? ((recentRevenue - olderRevenue) / olderRevenue * 100).toFixed(1)
      : '0';
    
    const salesTrend = olderSales.length > 0 
      ? ((recentSales.length - olderSales.length) / olderSales.length * 100).toFixed(1)
      : '0';

    return {
      total: filteredSales.length,
      completed: completed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      totalRevenue,
      avgTicket,
      conversionRate: filteredSales.length > 0 
        ? ((completed.length / filteredSales.length) * 100).toFixed(1)
        : '0',
      revenueTrend: parseFloat(revenueTrend),
      salesTrend: parseFloat(salesTrend)
    };
  }, [filteredSales, periodFilter]);

  // Dados para gráfico de receita ao longo do tempo
  const revenueOverTime = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const dataByDate: Record<string, { date: string; receita: number; vendas: number }> = {};
    
    completed.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      if (!dataByDate[date]) {
        dataByDate[date] = { date, receita: 0, vendas: 0 };
      }
      dataByDate[date].receita += parseFloat(sale.amount) || 0;
      dataByDate[date].vendas += 1;
    });
    
    return Object.values(dataByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }));
  }, [filteredSales]);

  // Dados para gráfico de produtos mais vendidos
  const productPerformance = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const byProduct: Record<string, { name: string; vendas: number; receita: number }> = {};
    
    completed.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      const name = product?.name || 'Produto';
      if (!byProduct[sale.product_id]) {
        byProduct[sale.product_id] = { name, vendas: 0, receita: 0 };
      }
      byProduct[sale.product_id].vendas += 1;
      byProduct[sale.product_id].receita += parseFloat(sale.amount) || 0;
    });
    
    return Object.values(byProduct)
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5);
  }, [filteredSales, products]);

  // Dados para gráfico de métodos de pagamento
  const paymentMethodsData = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const byMethod: Record<string, number> = {};
    
    completed.forEach(sale => {
      const method = sale.payment_method || 'Outro';
      byMethod[method] = (byMethod[method] || 0) + 1;
    });
    
    const methodNames: Record<string, string> = {
      'multicaixa_express': 'Multicaixa Express',
      'multicaixa_reference': 'Referência Multicaixa',
      'bank_transfer': 'Transferência',
      'transfer': 'Transferência',
      'stripe': 'Cartão (Stripe)',
      'paypal': 'PayPal',
      'mbway': 'MB WAY',
      'multibanco': 'Multibanco'
    };
    
    return Object.entries(byMethod).map(([method, count]) => ({
      name: methodNames[method] || method,
      value: count
    }));
  }, [filteredSales]);

  // Dados para gráfico de status
  const statusData = useMemo(() => {
    return [
      { name: 'Aprovadas', value: stats.completed, color: '#22c55e' },
      { name: 'Pendentes', value: stats.pending, color: '#eab308' },
      { name: 'Canceladas', value: stats.cancelled, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [stats]);

  // Exportar relatório
  const exportReport = () => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    
    const headers = ['Data', 'Hora', 'Produto', 'Valor', 'Moeda', 'Status', 'Método de Pagamento'];
    const rows = filteredSales.map(sale => {
      const product = products.find(p => p.id === sale.product_id);
      const date = new Date(sale.created_at);
      return [
        date.toLocaleDateString('pt-BR'),
        date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        product?.name || 'Produto',
        sale.amount,
        sale.currency || 'KZ',
        sale.status === 'completed' ? 'Aprovada' : sale.status === 'pending' ? 'Pendente' : 'Cancelada',
        sale.payment_method || 'N/A'
      ];
    });

    // Adicionar resumo no final
    rows.push([]);
    rows.push(['=== RESUMO ===']);
    rows.push(['Total de Vendas', stats.total.toString()]);
    rows.push(['Vendas Aprovadas', stats.completed.toString()]);
    rows.push(['Receita Total', formatPriceForSeller(stats.totalRevenue, 'KZ')]);
    rows.push(['Ticket Médio', formatPriceForSeller(stats.avgTicket, 'KZ')]);
    rows.push(['Taxa de Conversão', `${stats.conversionRate}%`]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-vendas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Relatório exportado",
      description: `${filteredSales.length} registros exportados com sucesso`
    });
  };

  const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  const chartConfig = {
    receita: { label: "Receita", color: "hsl(var(--chart-1))" },
    vendas: { label: "Vendas", color: "hsl(var(--chart-2))" },
  };

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <SEO 
        title={`${t('reports.title')} - Kambafy`}
        description={t('reports.subtitle')}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('reports.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise completa de vendas e desempenho
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportReport} disabled={filteredSales.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadSalesData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="w-full sm:w-48">
              <ProductFilter 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {formatPriceForSeller(stats.totalRevenue, 'KZ')}
                </p>
              </div>
              <div className={`flex items-center text-xs ${stats.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueTrend >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(stats.revenueTrend)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vendas Aprovadas</p>
                <p className="text-xl md:text-2xl font-bold">{stats.completed}</p>
              </div>
              <div className={`flex items-center text-xs ${stats.salesTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.salesTrend >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(stats.salesTrend)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-xl md:text-2xl font-bold text-primary">
              {formatPriceForSeller(stats.avgTicket, 'KZ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            <p className="text-xl md:text-2xl font-bold text-primary">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.pending} pendentes</p>
          </CardContent>
        </Card>
      </div>

      {filteredSales.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="time">Análise Temporal</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Gráfico de Receita */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Receita ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueOverTime}>
                        <defs>
                          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="displayDate" 
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="receita" 
                          stroke="hsl(var(--chart-1))" 
                          fillOpacity={1} 
                          fill="url(#colorReceita)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status das Vendas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Status das Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Métodos de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Métodos de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {paymentMethodsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="time">
            <SalesTimeAnalytics sales={filteredSales} />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {/* Top Produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos Mais Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productPerformance.length > 0 ? (
                  <div className="h-64">
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productPerformance} layout="vertical">
                          <XAxis type="number" axisLine={false} tickLine={false} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={150}
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="vendas" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados de produtos</p>
                )}
              </CardContent>
            </Card>

            {/* Tabela de Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Detalhes por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Produto</th>
                        <th className="text-right py-2 font-medium">Vendas</th>
                        <th className="text-right py-2 font-medium">Receita</th>
                        <th className="text-right py-2 font-medium">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerformance.map((product, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2 truncate max-w-[200px]">{product.name}</td>
                          <td className="py-2 text-right">{product.vendas}</td>
                          <td className="py-2 text-right text-green-600">{formatPriceForSeller(product.receita, 'KZ')}</td>
                          <td className="py-2 text-right">{formatPriceForSeller(product.receita / product.vendas, 'KZ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Sem dados para análise</h3>
            <p className="text-sm text-muted-foreground text-center">
              Não há vendas no período selecionado para gerar relatórios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
