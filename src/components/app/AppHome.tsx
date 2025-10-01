import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const productIds = products?.map(p => p.id) || [];

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
        totalProducts: products?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Meus Produtos</h2>
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Gerencie no Desktop</h3>
              <p className="text-sm text-muted-foreground">
                Para criar e editar produtos, acesse a versão completa no computador
              </p>
            </Card>
          </div>
        );
      
      case 'stats':
        return (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Estatísticas</h2>
            <div className="grid gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Vendas</p>
                    <p className="text-3xl font-bold text-primary">{stats.totalSales}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
                    <p className="text-2xl font-bold text-primary">
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
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-bold">Meu Perfil</h2>
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{user?.email}</p>
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
          <div className="p-6 space-y-6">
            {/* Welcome */}
            <div>
              <h1 className="text-2xl font-bold mb-1">Olá! 👋</h1>
              <p className="text-muted-foreground">Bem-vindo à sua central de vendas</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-primary mb-1">{stats.totalSales}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-primary mb-1">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-lg font-bold text-primary mb-1">
                  {formatPriceForSeller(stats.totalRevenue, 'KZ').split(' ')[0]}
                </p>
                <p className="text-xs text-muted-foreground">Receita</p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Acesso Rápido</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('stats')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver estatísticas detalhadas
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('products')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Gerenciar produtos
                </Button>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong>Dica:</strong> Para acessar todos os recursos, use a versão desktop do Kambafy no seu computador.
              </p>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* App Bar */}
      <div className="bg-primary text-primary-foreground p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2">
              <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
            </div>
            <span className="font-bold text-lg">kambafy</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="flex justify-around py-2 px-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 ${
              activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 ${
              activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Stats</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 ${
              activeTab === 'products' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">Produtos</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center gap-1 flex-1 ${
              activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
