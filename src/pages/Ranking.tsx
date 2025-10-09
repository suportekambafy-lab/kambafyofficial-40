import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { countOrderItems } from "@/utils/orderUtils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO, pageSEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TopSeller {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  total_revenue: number;
  total_sales: number;
}

const Ranking = () => {
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    fetchTopSellers();
  }, []);

  const fetchTopSellers = async () => {
    try {
      setLoading(true);
      
      // Get current month range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      setCurrentMonth(now.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' }));

      // Fetch orders from current month and calculate seller revenue
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          seller_commission,
          amount,
          status,
          order_bump_data
        `)
        .eq('status', 'completed')
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString());

      if (error) throw error;

      // Group by seller and calculate totals
      const sellerMap = new Map<string, { revenue: number; sales: number }>();
      
      console.log('📊 RANKING: Total de orders do mês:', orders?.length);
      
      orders?.forEach(order => {
        if (!order.user_id) return;
        
        const current = sellerMap.get(order.user_id) || { revenue: 0, sales: 0 };
        
        // Use seller_commission if available, otherwise use full amount
        const revenue = order.seller_commission 
          ? parseFloat(String(order.seller_commission))
          : parseFloat(String(order.amount));
        
        // ✅ Conta order bumps separadamente (igual ao Dashboard)
        const itemCount = countOrderItems(order);
        
        console.log('📦 RANKING Order:', {
          order_id: order.id,
          user_id: order.user_id,
          has_bump: !!order.order_bump_data,
          itemCount,
          revenue
        });
        
        sellerMap.set(order.user_id, {
          revenue: current.revenue + revenue,
          sales: current.sales + itemCount
        });
      });
      
      console.log('📊 RANKING: SellerMap final:', Array.from(sellerMap.entries()).map(([id, stats]) => ({
        user_id: id,
        sales: stats.sales,
        revenue: stats.revenue
      })));

      // Get top 3 sellers
      const sortedSellers = Array.from(sellerMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 3);

      // Fetch seller profiles
      const sellerIds = sortedSellers.map(([userId]) => userId);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', sellerIds);

      // Combine data
      const topSellersData: TopSeller[] = sortedSellers.map(([userId, stats]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || profile?.email?.split('@')[0] || 'Vendedor',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
          total_revenue: stats.revenue,
          total_sales: stats.sales
        };
      });

      setTopSellers(topSellersData);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' Kz';
  };

  const getPositionIcon = (position: number) => {
    if (position === 0) return <Trophy className="w-8 h-8 text-yellow-500" />;
    if (position === 1) return <Trophy className="w-7 h-7 text-gray-400" />;
    if (position === 2) return <Trophy className="w-6 h-6 text-amber-700" />;
    return null;
  };

  const getPositionStyles = (position: number) => {
    if (position === 0) return "border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 scale-105";
    if (position === 1) return "border-gray-400 bg-gradient-to-br from-gray-50 to-slate-50";
    if (position === 2) return "border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50";
    return "";
  };

  return (
    <>
      <SEO 
        title="Ranking de Vendedores | Kambafy"
        description={`Confira os vendedores que mais faturaram em ${currentMonth} na Kambafy`}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <SubdomainLink 
              to="/" 
              className="inline-flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="/kambafy-logo-new.svg" 
                alt="Kambafy" 
                className="h-12 w-auto"
              />
            </SubdomainLink>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium mb-4">
              <Trophy className="w-5 h-5" />
              Ranking Oficial
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Top Vendedores
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto capitalize">
              Os vendedores que mais faturaram em <span className="font-semibold text-foreground">{currentMonth}</span>
            </p>
          </div>

          {loading ? (
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-6 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto mb-4" />
                  <Skeleton className="h-8 w-40 mx-auto" />
                </Card>
              ))}
            </div>
          ) : topSellers.length === 0 ? (
            <Card className="max-w-2xl mx-auto p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">Nenhum vendedor no ranking ainda</h3>
              <p className="text-muted-foreground">
                Seja o primeiro a aparecer no ranking deste mês!
              </p>
            </Card>
          ) : (
            <div className="max-w-5xl mx-auto">
              {/* Podium style for top 3 */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {topSellers.map((seller, index) => (
                  <motion.div
                    key={seller.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={index === 0 ? "md:order-2" : index === 1 ? "md:order-1 md:mt-8" : "md:order-3 md:mt-8"}
                  >
                    <Card className={`relative border-2 transition-all hover:shadow-xl p-6 ${getPositionStyles(index)}`}>
                      {/* Position badge */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        {getPositionIcon(index)}
                      </div>

                      {/* Position number */}
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center font-bold text-sm">
                        #{index + 1}
                      </div>

                      <div className="text-center space-y-4 pt-4">
                        {/* Avatar */}
                        <Avatar className="w-24 h-24 mx-auto ring-4 ring-background shadow-lg">
                          <AvatarImage src={seller.avatar_url || undefined} alt={seller.full_name} />
                          <AvatarFallback className="text-2xl font-semibold bg-primary/20 text-primary">
                            {seller.full_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name */}
                        <div>
                          <h3 className="font-bold text-lg">{seller.full_name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{seller.email}</p>
                        </div>

                        {/* Stats */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                            <DollarSign className="w-5 h-5" />
                            <span className="text-xl font-bold">{formatCurrency(seller.total_revenue)}</span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {seller.total_sales} {seller.total_sales === 1 ? 'venda' : 'vendas'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <h3 className="text-2xl font-bold mb-2">Quer aparecer no ranking?</h3>
                <p className="text-muted-foreground mb-6">
                  Crie sua conta e comece a vender na Kambafy hoje mesmo!
                </p>
                <SubdomainLink to="/auth">
                  <Button size="lg" className="gap-2">
                    Começar Agora
                    <TrendingUp className="w-5 h-5" />
                  </Button>
                </SubdomainLink>
              </Card>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-muted/30 mt-20">
          <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Ranking;
