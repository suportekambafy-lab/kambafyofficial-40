import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Componente de métrica otimizado com memo
export const OptimizedMetricCard = memo(({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false, 
  className 
}: MetricCardProps) => {
  const changeColor = useMemo(() => {
    if (!change) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  }, [change]);

  const changeIcon = useMemo(() => {
    if (!change) return null;
    return change > 0 ? 
      <TrendingUp className="h-3 w-3" /> : 
      <TrendingDown className="h-3 w-3" />;
  }, [change]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn('flex items-center text-xs', changeColor)}>
            {changeIcon}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Grid de métricas otimizado
interface MetricsGridProps {
  metrics: {
    totalSales: number;
    totalRevenue: number;
    totalProducts: number;
    totalCustomers: number;
  };
  loading?: boolean;
}

export const OptimizedMetricsGrid = memo(({ metrics, loading }: MetricsGridProps) => {
  const metricCards = useMemo(() => [
    {
      title: 'Vendas Totais',
      value: metrics.totalSales,
      icon: <ShoppingCart className="h-4 w-4" />,
      change: 12.5
    },
    {
      title: 'Receita Total',
      value: `${metrics.totalRevenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ`,
      icon: <DollarSign className="h-4 w-4" />,
      change: 8.2
    },
    {
      title: 'Produtos',
      value: metrics.totalProducts,
      icon: <Package className="h-4 w-4" />,
      change: 0
    },
    {
      title: 'Clientes',
      value: metrics.totalCustomers,
      icon: <Users className="h-4 w-4" />,
      change: 15.3
    }
  ], [metrics]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => (
        <OptimizedMetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          icon={metric.icon}
          loading={loading}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  );
});

OptimizedMetricCard.displayName = 'OptimizedMetricCard';
OptimizedMetricsGrid.displayName = 'OptimizedMetricsGrid';