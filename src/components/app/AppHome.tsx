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
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, status, price, sales, cover')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Products error:', productsError);
        setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = products?.map(p => p.id) || [];
      const activeProducts = products?.filter(p => p.status === 'Ativo') || [];
      
      // Store products for display
      setProducts(products || []);

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
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold text-foreground">Meus Produtos</h2>
              <span className="text-sm text-muted-foreground">{products.length}</span>
            </div>

            {loading ? (
              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : products.length === 0 ? (
              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-foreground">Nenhum produto</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Você ainda não criou produtos. Use a versão desktop para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        {/* Product Image */}
                        <div className="relative flex-shrink-0">
                          {product.cover ? (
                            <img 
                              src={product.cover} 
                              alt={product.name}
                              className="w-24 h-24 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <Package className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          {product.status === 'Ativo' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-base text-foreground line-clamp-2 mb-2">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                product.status === 'Ativo' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {product.status}
                              </span>
                            </div>
                          </div>

                          {/* Price and Sales */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Preço</p>
                              <p className="font-bold text-base text-foreground">
                                {formatPriceForSeller(parseFloat(product.price || '0'), 'KZ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-0.5">Vendas</p>
                              <p className="font-bold text-base text-primary">
                                {product.sales || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card className="overflow-hidden border-none shadow-sm bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      💡 Para editar produtos, acesse a versão desktop
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      
      case 'stats':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2 text-foreground">Estatísticas</h2>
            <div className="space-y-3">
              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Total de Vendas</p>
                      <p className="text-3xl font-bold tracking-tight text-foreground">{stats.totalSales}</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <TrendingUp className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Receita Total</p>
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {formatPriceForSeller(stats.totalRevenue, 'KZ')}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center">
                      <DollarSign className="h-7 w-7 text-green-600 dark:text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold px-2 text-foreground">Meu Perfil</h2>
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-foreground truncate">{user?.email}</p>
                    <p className="text-sm text-muted-foreground">Vendedor Kambafy</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="w-full h-11 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-colors"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="font-medium">Sair da conta</span>
                  </Button>
                </div>
              </CardContent>
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
            <div className="space-y-3">
              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Faturamento Total</div>
                      <div className="text-3xl font-bold tracking-tight text-foreground">
                        {loading ? '...' : formatPriceForSeller(stats.totalRevenue, 'KZ')}
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Total de Vendas</div>
                      <div className="text-3xl font-bold tracking-tight text-foreground">
                        {loading ? '...' : stats.totalSales}
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center">
                      <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-base mb-4 text-foreground">Acesso Rápido</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12 hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setActiveTab('stats')}
                  >
                    <BarChart3 className="h-5 w-5 mr-3" />
                    <span className="font-medium">Ver estatísticas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12 hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setActiveTab('products')}
                  >
                    <Package className="h-5 w-5 mr-3" />
                    <span className="font-medium">Meus produtos</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="overflow-hidden border-none shadow-sm bg-primary/5">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground font-semibold">💡 Dica:</strong> Para criar produtos e acessar todos os recursos, use a versão desktop.
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modern Clean Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <img 
              src="/kambafy-logo-new.svg" 
              alt="Kambafy" 
              className="h-12 w-auto"
            />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Olá!</p>
                <p className="text-sm font-semibold text-foreground">{user?.email?.split('@')[0]}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      {renderContent()}

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-none transition-colors ${
              activeTab === 'home' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-medium">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-none transition-colors ${
              activeTab === 'stats' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Stats</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-none transition-colors ${
              activeTab === 'products' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs font-medium">Produtos</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-none transition-colors ${
              activeTab === 'profile' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Perfil</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
