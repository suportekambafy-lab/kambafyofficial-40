import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, RefreshCw, Download, TrendingUp, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Sale {
  id: string;
  created_at: string;
  status: string;
  amount: string;
  product_id: string;
  payment_method?: string;
  currency?: string;
  seller_commission?: number;
}

// Helper function to calculate net revenue (after platform fee) with currency conversion
const calculateNetRevenue = (sale: Sale): number => {
  // Use seller_commission if available, otherwise calculate 92% of gross
  let amount = parseFloat(sale.seller_commission?.toString() || '0');
  if (amount === 0) {
    const grossAmount = parseFloat(sale.amount || '0');
    amount = grossAmount * 0.92; // 8% platform fee
  }
  
  // Convert to KZ if different currency
  if (sale.currency && sale.currency !== 'KZ') {
    const exchangeRates: Record<string, number> = {
      'EUR': 1053,
      'MZN': 14.3
    };
    const rate = exchangeRates[sale.currency.toUpperCase()] || 1;
    amount = Math.round(amount * rate);
  }
  
  return amount;
};

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

      let startDate: Date | undefined;
      if (periodFilter !== "all") {
        const days = parseInt(periodFilter);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      let allSales: Sale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id, created_at, status, amount, product_id, payment_method, currency, seller_commission')
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

  const filteredSales = useMemo(() => {
    if (selectedProduct === "todos") return sales;
    return sales.filter(sale => sale.product_id === selectedProduct);
  }, [sales, selectedProduct]);

  const stats = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const pending = filteredSales.filter(s => s.status === 'pending');
    const cancelled = filteredSales.filter(s => s.status === 'failed' || s.status === 'cancelled');
    
    const totalRevenue = completed.reduce((sum, s) => sum + calculateNetRevenue(s), 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    const days = periodFilter === "all" ? 365 : parseInt(periodFilter);
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - days / 2);
    
    const recentSales = completed.filter(s => new Date(s.created_at) >= midPoint);
    const olderSales = completed.filter(s => new Date(s.created_at) < midPoint);
    
    const recentRevenue = recentSales.reduce((sum, s) => sum + calculateNetRevenue(s), 0);
    const olderRevenue = olderSales.reduce((sum, s) => sum + calculateNetRevenue(s), 0);
    
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

  const revenueOverTime = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const dataByDate: Record<string, { date: string; receita: number; vendas: number }> = {};
    
    completed.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      if (!dataByDate[date]) {
        dataByDate[date] = { date, receita: 0, vendas: 0 };
      }
      dataByDate[date].receita += calculateNetRevenue(sale);
      dataByDate[date].vendas += 1;
    });
    
    return Object.values(dataByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }));
  }, [filteredSales]);

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
      byProduct[sale.product_id].receita += calculateNetRevenue(sale);
    });
    
    return Object.values(byProduct)
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5);
  }, [filteredSales, products]);

  const paymentMethodsData = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed');
    const byMethod: Record<string, number> = {};
    
    completed.forEach(sale => {
      const method = sale.payment_method || 'Outro';
      byMethod[method] = (byMethod[method] || 0) + 1;
    });
    
    const methodNames: Record<string, string> = {
      'multicaixa_express': 'Multicaixa Express',
      'multicaixa_reference': 'Ref. Multicaixa',
      'bank_transfer': 'Transferência',
      'transfer': 'Transferência',
      'stripe': 'Cartão',
      'paypal': 'PayPal',
      'mbway': 'MB WAY',
      'multibanco': 'Multibanco'
    };
    
    return Object.entries(byMethod)
      .map(([method, count]) => ({
        name: methodNames[method] || method,
        value: count
      }))
      .slice(0, 6);
  }, [filteredSales]);

  const statusData = useMemo(() => {
    return [
      { name: 'Aprovadas', value: stats.completed, color: '#22c55e' },
      { name: 'Pendentes', value: stats.pending, color: '#eab308' },
      { name: 'Canceladas', value: stats.cancelled, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [stats]);

  const exportReport = () => {
    const headers = ['Data', 'Hora', 'Produto', 'Valor', 'Moeda', 'Status', 'Método'];
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
      description: `${filteredSales.length} registros exportados`
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <SEO 
        title={`${t('reports.title')} - Kambafy`}
        description={t('reports.subtitle')}
      />
      
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('reports.title')}
            <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase">
              Novo
            </span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Análise completa de vendas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportReport} disabled={filteredSales.length === 0} className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={loadSalesData} className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-40 text-sm">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="w-full sm:w-40">
              <ProductFilter 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="text-base md:text-lg font-bold text-green-600 truncate">
                {formatPriceForSeller(stats.totalRevenue, 'KZ')}
              </p>
              <div className={`flex items-center text-xs ${stats.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{Math.abs(stats.revenueTrend)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Vendas Aprovadas</p>
              <p className="text-base md:text-lg font-bold">{stats.completed}</p>
              <div className={`flex items-center text-xs ${stats.salesTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.salesTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{Math.abs(stats.salesTrend)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-base md:text-lg font-bold text-primary truncate">
              {formatPriceForSeller(stats.avgTicket, 'KZ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="text-base md:text-lg font-bold text-primary">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.pending} pendentes</p>
          </CardContent>
        </Card>
      </div>

      {filteredSales.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs py-2">Geral</TabsTrigger>
            <TabsTrigger value="time" className="text-xs py-2">Horários</TabsTrigger>
            <TabsTrigger value="products" className="text-xs py-2">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Gráfico de Receita */}
            <Card className="rounded-xl shadow-sm border border-border/40 bg-card">
              <CardHeader className="pb-1 px-4 pt-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Receita no Período</span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <AreaChart data={revenueOverTime} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVendasGradientReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="strokeGradientReports" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#16a34a" />
                        <stop offset="50%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#4ade80" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={5} 
                      interval="preserveStartEnd" 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      tickFormatter={(value) => {
                        if (value === 0) return '0';
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }} 
                      width={45} 
                      domain={[0, 'auto']} 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="url(#strokeGradientReports)" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorVendasGradientReports)" 
                      dot={false}
                      activeDot={{ fill: '#22c55e', stroke: 'white', strokeWidth: 3, r: 6 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Status das Vendas - Lista simples */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium">Status das Vendas</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-3">
                  {statusData.map((item, index) => {
                    const total = statusData.reduce((acc, curr) => acc + curr.value, 0);
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                            <span className="text-sm font-semibold" style={{ color: item.color }}>{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Métodos de Pagamento - Lista simples */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium">Métodos de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-3">
                  {paymentMethodsData.map((item, index) => {
                    const total = paymentMethodsData.reduce((acc, curr) => acc + curr.value, 0);
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    const color = COLORS[index % COLORS.length];
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                            <span className="text-sm font-semibold" style={{ color }}>{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <SalesTimeAnalytics sales={filteredSales} />
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            {/* Tabela de Performance - Primeiro */}
            <Card className="rounded-xl shadow-sm border border-border/40 bg-card">
              <CardHeader className="px-4 pt-3 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Performance por Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {productPerformance.length > 0 ? (
                  <div className="space-y-3">
                    {productPerformance.map((product, index) => {
                      const maxVendas = Math.max(...productPerformance.map(p => p.vendas));
                      const percentage = maxVendas > 0 ? (product.vendas / maxVendas) * 100 : 0;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate max-w-[150px]">{product.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{product.vendas} vendas</span>
                              <span className="text-sm font-semibold text-green-600">{formatPriceForSeller(product.receita, 'KZ')}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-600 to-green-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sem dados de produtos</p>
                )}
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold">Sem dados</h3>
            <p className="text-xs text-muted-foreground text-center">
              Não há vendas no período selecionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
