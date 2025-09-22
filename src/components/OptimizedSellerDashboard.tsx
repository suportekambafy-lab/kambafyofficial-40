import { memo, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { OptimizedMetricsGrid } from '@/components/ui/optimized-metric-card';
import { OptimizedProductGrid } from '@/components/ui/optimized-product-grid';
import { OptimizedVirtualTable } from '@/components/ui/optimized-virtual-table';
import { OptimizedContainer, AnimatedWrapper } from '@/components/ui/optimized-containers';
import { useSellerData } from '@/hooks/useOptimizedSellerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Dashboard do vendedor otimizado
const OptimizedSellerDashboard = memo(() => {
  const navigate = useNavigate();
  const { 
    data: sellerData, 
    isLoading, 
    error, 
    refetch 
  } = useSellerData();

  const handleProductView = (id: string) => {
    navigate(`/vendedor/produtos/${id}`);
  };

  const handleOrderView = (id: string) => {
    navigate(`/vendedor/vendas/${id}`);
  };

  const handleAddProduct = () => {
    navigate('/vendedor/produtos/novo');
  };

  if (error) {
    return (
      <OptimizedContainer error={error.message} className="min-h-screen">
        <div />
      </OptimizedContainer>
    );
  }

  // Estatísticas calculadas
  const stats = {
    totalSales: sellerData?.orders?.length || 0,
    totalRevenue: sellerData?.orders?.reduce((sum: number, order: any) => {
      let amount = parseFloat(order.amount) || 0;
      // Converter para KZ se necessário
      if (order.currency && order.currency !== 'KZ') {
        const exchangeRates: Record<string, number> = {
          'EUR': 1053, // 1 EUR = ~1053 KZ
          'MZN': 14.3  // 1 MZN = ~14.3 KZ
        };
        const rate = exchangeRates[order.currency.toUpperCase()] || 1;
        amount = Math.round(amount * rate);
      }
      return sum + amount;
    }, 0) || 0,
    totalProducts: sellerData?.products?.length || 0,
    totalCustomers: new Set(sellerData?.orders?.map((order: any) => order.customer_email))?.size || 0
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header otimizado */}
      <AnimatedWrapper>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral dos seus produtos e vendas
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>
      </AnimatedWrapper>

      {/* Métricas otimizadas */}
      <AnimatedWrapper delay={100}>
        <OptimizedMetricsGrid 
          metrics={stats}
          loading={isLoading}
        />
      </AnimatedWrapper>

      {/* Grid de produtos otimizado */}
      <AnimatedWrapper delay={200}>
        <Card>
          <CardHeader>
            <CardTitle>Produtos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <OptimizedContainer
              loading={isLoading}
              empty={!sellerData?.products?.length}
              emptyMessage="Nenhum produto encontrado. Crie seu primeiro produto!"
            >
              <OptimizedProductGrid
                products={sellerData?.products?.slice(0, 6)?.map((product: any) => ({
                  ...product,
                  onView: handleProductView
                })) || []}
                loading={isLoading}
                onView={handleProductView}
              />
            </OptimizedContainer>
          </CardContent>
        </Card>
      </AnimatedWrapper>

      {/* Tabela virtual de vendas otimizada */}
      <AnimatedWrapper delay={300}>
        <OptimizedVirtualTable
          items={sellerData?.orders?.map((order: any) => {
            let amount = parseFloat(order.amount) || 0;
            // Converter para KZ se necessário
            if (order.currency && order.currency !== 'KZ') {
              const exchangeRates: Record<string, number> = {
                'EUR': 1053, // 1 EUR = ~1053 KZ
                'MZN': 14.3  // 1 MZN = ~14.3 KZ
              };
              const rate = exchangeRates[order.currency.toUpperCase()] || 1;
              amount = Math.round(amount * rate);
            }
            return {
              id: order.id,
              name: `Pedido #${order.id.slice(0, 8)}`,
              sales: 1,
              price: amount,
              status: order.status === 'completed' ? 'Concluído' : 'Pendente',
              created_at: order.created_at
            };
          }) || []}
          loading={isLoading}
          onView={handleOrderView}
          title="Vendas Recentes"
          searchPlaceholder="Buscar vendas..."
          height={300}
        />
      </AnimatedWrapper>
    </div>
  );
});

OptimizedSellerDashboard.displayName = 'OptimizedSellerDashboard';

export default OptimizedSellerDashboard;