import { Trophy, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTopSellers } from '@/hooks/useTopSellers';
import { Skeleton } from '@/components/ui/skeleton';

const getMedalColor = (position: number) => {
  switch (position) {
    case 0: return 'text-yellow-400';
    case 1: return 'text-gray-400';
    case 2: return 'text-amber-600';
    default: return 'text-white/70';
  }
};

export const TopSellersRanking = () => {
  const { data: sellers, isLoading } = useTopSellers();
  const currentMonth = new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!sellers || sellers.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl md:text-2xl font-bold text-center">
          Top 3 Vendedores de {currentMonth}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sellers.map((seller, index) => (
          <div
            key={index}
            className={`relative bg-white/5 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-checkout-green/50 transition-all ${
              index === 0 ? 'md:scale-105 md:shadow-lg' : ''
            }`}
          >
            <div className="absolute -top-3 -right-3">
              <div className={`${getMedalColor(index)} bg-checkout-text dark:bg-background rounded-full p-2 border-2 border-white/20`}>
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-checkout-green/50">
                <AvatarImage src={seller.avatar_url || ''} alt={seller.full_name} />
                <AvatarFallback className="bg-checkout-green/20 text-checkout-green">
                  {seller.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white dark:text-foreground truncate">
                  {seller.full_name}
                </p>
                <div className="flex items-center gap-1 text-sm text-white/70 dark:text-muted-foreground">
                  <TrendingUp className="w-3 h-3 text-checkout-green" />
                  <span>{seller.total_sales} vendas</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-right">
              <p className="text-xs text-white/50 dark:text-muted-foreground">Receita Total</p>
              <p className="text-lg font-bold text-checkout-green">
                {new Intl.NumberFormat('pt-AO', {
                  style: 'currency',
                  currency: 'AOA',
                  minimumFractionDigits: 0,
                }).format(seller.total_revenue)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
