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
import { countOrderItems } from '@/utils/orderUtils';

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

  // ✅ UNIFICADO: Estatísticas calculadas SEM conversão de moeda
  // Todos os valores são mantidos em suas moedas originais do banco de dados
  // Isso garante consistência entre Dashboard, Vendas e Financeiro
  // ⚡ IMPORTANTE: Conta order bumps separadamente usando countOrderItems()
  const stats = {
    totalSales: sellerData?.orders?.reduce((sum: number, order: any) => {
      return sum + countOrderItems(order); // ✅ Conta produto principal + order bumps
    }, 0) || 0,
    totalRevenue: sellerData?.orders?.reduce((sum: number, order: any) => {
      // ✅ Usar seller_commission se disponível, senão descontar 8% do amount
      let amount = parseFloat(order.seller_commission?.toString() || '0');
      if (amount === 0) {
        const grossAmount = parseFloat(order.amount || '0');
        amount = grossAmount * 0.92; // Descontar 8% da plataforma
      }
      return sum + amount;
    }, 0) || 0,
    totalProducts: sellerData?.products?.length || 0,
    totalCustomers: new Set(sellerData?.orders?.map((order: any) => order.customer_email))?.size || 0
  };

  console.log('📊 DASHBOARD STATS DEBUG:', {
    totalSales: stats.totalSales,
    ordersLength: sellerData?.orders?.length,
    ordersWithDetails: sellerData?.orders?.map((o: any) => ({
      id: o.id,
      items: countOrderItems(o),
      hasBump: !!o.order_bump_data
    })),
    note: 'Dashboard conta order bumps separadamente (igual Sales)'
  });

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
            // ✅ Calcular valor líquido do vendedor (já descontado 8%)
            let amount = parseFloat(order.seller_commission?.toString() || '0');
            if (amount === 0) {
              const grossAmount = parseFloat(order.amount || '0');
              amount = grossAmount * 0.92; // Descontar 8% da plataforma
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