import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, BarChart3, Package, User, TrendingUp, DollarSign, LogOut } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';

export function AppHome() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, status')
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Products error:', productsError);
        setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
        setLoading(false);
        return;
      }

      const productIds = products?.map(p => p.id) || [];
      const activeProducts = products?.filter(p => p.status === 'Ativo') || [];

      if (productIds.length === 0) {
        setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
        setLoading(false);
        return;
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('amount, currency')
        .in('product_id', productIds)
        .eq('status', 'completed');

      let totalRevenue = 0;
      orders?.forEach(order => {
        const amount = parseFloat(order.amount || '0');
        if (order.currency === 'EUR') {
          totalRevenue += amount * 833;
        } else if (order.currency === 'MZN') {
          totalRevenue += amount * 13;
        } else {
          totalRevenue += amount;
        }
      });

      setStats({
        totalSales: orders?.length || 0,
        totalRevenue,
        totalProducts: activeProducts.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2">Meus Produtos</h2>
            <Card className="p-8 text-center shadow-sm border border-primary/20 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Gerencie no Desktop</h3>
              <p className="text-sm text-muted-foreground">
                Para criar e editar produtos, acesse a versão completa no computador
              </p>
            </Card>
          </div>
        );
      
      case 'stats':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2">Estatísticas</h2>
            <div className="grid gap-4">
              <Card className="p-6 shadow-sm border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Vendas</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalSales}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatPriceForSeller(stats.totalRevenue, 'KZ')}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold px-2">Meu Perfil</h2>
            <Card className="p-6 space-y-4 shadow-sm border border-primary/20 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">{user?.email}</p>
                  <p className="text-sm text-muted-foreground">Vendedor Kambafy</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </Card>
          </div>
        );
      
      default:
        return (
          <div className="p-4 space-y-6">
            {/* Welcome */}
            <div className="px-2">
              <h1 className="text-2xl font-bold mb-1">Olá! 👋</h1>
              <p className="text-muted-foreground">Bem-vindo à sua central de vendas</p>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Faturamento</div>
                      <div className="text-2xl font-bold text-foreground">
                        {loading ? '...' : formatPriceForSeller(stats.totalRevenue, 'KZ')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Vendas</div>
                      <div className="text-2xl font-bold text-foreground">
                        {loading ? '...' : stats.totalSales}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 shadow-sm border border-primary/20 rounded-xl">
              <h3 className="font-semibold mb-4">Acesso Rápido</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('stats')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver estatísticas
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('products')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Meus produtos
                </Button>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-primary/5 border-primary/20 shadow-sm rounded-xl">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Dica:</strong> Para criar produtos e acessar todos os recursos, use a versão desktop.
              </p>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modern App Bar */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-6 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <img 
            src="/kambafy-logo-new.svg" 
            alt="Kambafy" 
            className="h-10 w-auto brightness-0 invert"
          />
          <div className="text-right">
            <p className="text-xs opacity-90">Olá!</p>
            <p className="text-sm font-semibold">{user?.email?.split('@')[0]}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-sm">
        <div className="flex justify-around py-3 px-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 h-auto py-2 ${
              activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-medium">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 h-auto py-2 ${
              activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Stats</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 h-auto py-2 ${
              activeTab === 'products' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs font-medium">Produtos</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 h-auto py-2 ${
              activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
