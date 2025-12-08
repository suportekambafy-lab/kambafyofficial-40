import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, RefreshCw } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { SalesTimeAnalytics } from '@/components/SalesTimeAnalytics';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { ProductFilter } from '@/components/ProductFilter';

interface Sale {
  id: string;
  created_at: string;
  status: string;
  amount: string;
  product_id: string;
}

export default function SellerReports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
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
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

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

      // Buscar vendas
      let query = supabase
        .from('orders')
        .select('id, created_at, status, amount, product_id')
        .in('product_id', userProductIds)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      setSales(orders || []);
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

    return {
      total: filteredSales.length,
      completed: completed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      conversionRate: filteredSales.length > 0 
        ? ((completed.length / filteredSales.length) * 100).toFixed(1)
        : '0'
    };
  }, [filteredSales]);

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
            Análise de horários e padrões de vendas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSalesData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de Vendas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics de Tempo */}
      {filteredSales.length > 0 ? (
        <SalesTimeAnalytics sales={filteredSales} />
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
