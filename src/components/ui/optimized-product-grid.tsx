import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedProductCardProps {
  id: string;
  name: string;
  sales: number;
  price: number;
  status: string;
  created_at: string;
  onView: (id: string) => void;
  loading?: boolean;
}

// Card de produto otimizado com memo
export const OptimizedProductCard = memo(({ 
  id, 
  name, 
  sales, 
  price, 
  status, 
  onView,
  loading = false 
}: OptimizedProductCardProps) => {
  const statusVariant = useMemo(() => {
    switch (status) {
      case 'Ativo': return 'default';
      case 'Inativo': return 'secondary';
      case 'Pendente': return 'outline';
      default: return 'secondary';
    }
  }, [status]);

  const isActive = status === 'Ativo';
  const trend = sales > 10 ? 'up' : sales > 5 ? 'stable' : 'down';

  if (loading) {
    return (
      <Card className="h-32">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'h-32 transition-all duration-200 hover:shadow-md border-l-[6px] border-l-muted-foreground/20'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Produto</span>
          </div>
          <Badge variant={statusVariant as any}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-medium text-sm truncate mb-1" title={name}>
          {name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>{sales} vendas</span>
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            </div>
            <p className="text-sm font-medium">
              {price.toLocaleString('pt-BR')} KZ
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onView(id)}
            className="h-8"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// Grid de produtos otimizado
interface OptimizedProductGridProps {
  products: OptimizedProductCardProps[];
  loading?: boolean;
  onView: (id: string) => void;
}

export const OptimizedProductGrid = memo(({ 
  products, 
  loading = false, 
  onView 
}: OptimizedProductGridProps) => {
  const gridItems = useMemo(() => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <OptimizedProductCard
          key={`skeleton-${i}`}
          id=""
          name=""
          sales={0}
          price={0}
          status=""
          created_at=""
          onView={() => {}}
          loading={true}
        />
      ));
    }

    return products.map((product, index) => (
      <div
        key={product.id}
        className="animate-in fade-in slide-in-from-bottom-2"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <OptimizedProductCard
          {...product}
          onView={onView}
        />
      </div>
    ));
  }, [products, loading, onView]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {gridItems}
    </div>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';
OptimizedProductGrid.displayName = 'OptimizedProductGrid';