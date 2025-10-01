import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Home, BarChart3, Package, User, TrendingUp, DollarSign, LogOut, ChevronLeft, ShoppingCart, Settings, Bell, Trash2, Info, ChevronRight } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { ComposedChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';

export function AppHome() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  // Meta mensal - mesma lógica da versão web
  const monthlyGoal = 1000000; // 1M KZ
  const goalProgress = Math.min((stats.totalRevenue / monthlyGoal) * 100, 100);

  const handlePushToggle = async (enabled: boolean) => {
    if (!('Notification' in window)) {
      toast({
        title: "Não suportado",
        description: "Este navegador não suporta notificações push",
        variant: "destructive"
      });
      return;
    }

    if (enabled) {
      // Ativar notificações
      if (Notification.permission === 'granted') {
        setPushEnabled(true);
        toast({
          title: "Notificações Ativadas",
          description: "Você receberá notificações sobre vendas e produtos"
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          new Notification('Notificações Ativadas!', {
            body: 'Você receberá notificações sobre suas vendas e produtos.',
            icon: '/kambafy-symbol.svg'
          });
          toast({
            title: "Notificações Ativadas",
            description: "Você receberá notificações sobre vendas e produtos"
          });
        } else {
          setPushEnabled(false);
          toast({
            title: "Permissão Negada",
            description: "Habilite nas configurações do navegador",
            variant: "destructive"
          });
        }
      } else {
        setPushEnabled(false);
        toast({
          title: "Permissão Negada",
          description: "Habilite nas configurações do navegador",
          variant: "destructive"
        });
      }
    } else {
      // Desativar notificações
      setPushEnabled(false);
      toast({
        title: "Notificações Desativadas",
        description: "Você não receberá mais notificações push"
      });
    }
  };

  useEffect(() => {
    // Verificar se as notificações já estão permitidas ao carregar
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadProfile();
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const notificationsList: any[] = [];

      // Verificar produtos pendentes de aprovação
      const { data: pendingProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'Pendente')
        .limit(5);

      if (pendingProducts && pendingProducts.length > 0) {
        notificationsList.push({
          id: 'pending-products',
          type: 'info',
          title: 'Produtos Pendentes',
          message: `Você tem ${pendingProducts.length} produto(s) aguardando aprovação`,
          timestamp: new Date().toISOString(),
        });
      }

      // Verificar vendas recentes (últimas 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, amount, currency, created_at, product_id')
        .in('product_id', products.map(p => p.id))
        .eq('status', 'completed')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      recentOrders?.forEach(order => {
        notificationsList.push({
          id: `order-${order.id}`,
          type: 'success',
          title: 'Nova Venda!',
          message: `Venda de ${order.amount} ${order.currency} realizada`,
          timestamp: order.created_at,
        });
      });

      setNotifications(notificationsList.slice(0, 10)); // Máximo 10 notificações
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setProfileAvatar(profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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
        .select('amount, currency, created_at')
        .in('product_id', productIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      let totalRevenue = 0;
      const dailySales: Record<string, { date: string; sales: number; revenue: number }> = {};
      
      // Inicializar últimos 7 dias
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('pt-AO', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        dailySales[dateKey] = {
          date: displayDate,
          sales: 0,
          revenue: 0
        };
      }
      
      orders?.forEach(order => {
        const amount = parseFloat(order.amount || '0');
        let convertedAmount = amount;
        
        if (order.currency === 'EUR') {
          convertedAmount = amount * 833;
        } else if (order.currency === 'MZN') {
          convertedAmount = amount * 13;
        }
        
        totalRevenue += convertedAmount;
        
        // Agrupar por dia
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dailySales[orderDate]) {
          dailySales[orderDate].sales += 1;
          dailySales[orderDate].revenue += convertedAmount;
        }
      });

      // Preparar dados do gráfico
      const chartData = Object.values(dailySales);

      setStats({
        totalSales: orders?.length || 0,
        totalRevenue,
        totalProducts: activeProducts.length
      });
      setSalesData(chartData);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (showNotifications) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-foreground">Notificações</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(false)}
            >
              Fechar
            </Button>
          </div>

          {notifications.length === 0 ? (
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-foreground">Sem notificações</h3>
                <p className="text-sm text-muted-foreground">
                  Você está em dia com todas as suas atividades
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card key={notification.id} className="overflow-hidden border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'success' 
                          ? 'bg-green-500/10' 
                          : notification.type === 'info'
                          ? 'bg-blue-500/10'
                          : 'bg-yellow-500/10'
                      }`}>
                        <Bell className={`h-5 w-5 ${
                          notification.type === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : notification.type === 'info'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString('pt-AO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

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
            
            {/* Daily Sales Chart */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-base text-foreground mb-1">Vendas Diárias</h3>
                  <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={salesData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        height={30}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        width={30}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar
                        dataKey="sales"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        name="Vendas"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
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
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2 text-foreground">Meu Perfil</h2>
            
            {/* User Info Card */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16 rounded-2xl flex-shrink-0">
                    <AvatarImage src={profileAvatar} alt="Profile" />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <User className="h-8 w-8 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-foreground truncate">{user?.email}</p>
                    <p className="text-sm text-muted-foreground">Vendedor Kambafy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Options */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-2">
                <button
                  onClick={() => window.location.href = '/vendedor/configuracoes'}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Dados Pessoais</p>
                      <p className="text-xs text-muted-foreground">Ver e editar informações</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="h-px bg-border my-1" />

                <div className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Notificações Push</p>
                      <p className="text-xs text-muted-foreground">
                        {pushEnabled ? 'Ativadas' : 'Desativadas'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={pushEnabled} 
                    onCheckedChange={handlePushToggle}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-2">
                <button
                  onClick={() => {
                    if (window.confirm('Tem a certeza que deseja encerrar a sua conta? Esta ação é irreversível.')) {
                      // TODO: Implementar lógica de encerramento de conta
                      alert('Funcionalidade de encerramento de conta em desenvolvimento.');
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-destructive">Encerrar Conta</p>
                      <p className="text-xs text-muted-foreground">Eliminar permanentemente</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* Logout Button */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-4">
                <Button 
                  variant="outline" 
                  className="w-full h-11 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-colors"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="font-medium">Sair da conta</span>
                </Button>
              </CardContent>
            </Card>

            {/* App Version */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Info className="h-3 w-3" />
              <span>Versão 1.0.0</span>
            </div>
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

            {/* Goal Progress - Simple Style */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Meta: 1M KZ</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${goalProgress}%` }}
                        />
                      </div>
                      <span className="text-yellow-500 font-semibold text-sm min-w-[45px]">
                        {goalProgress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
    <div className="min-h-screen bg-background pb-24">
      {/* Content */}
      {renderContent()}

      {/* Horizontal Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md pb-safe">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => activeTab !== 'home' ? setActiveTab('home') : window.history.back()}
              className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center hover:shadow-lg transition-shadow flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Navigation Icons - Centered Group */}
            <div className="flex items-center gap-4 flex-1 justify-center bg-card rounded-full shadow-md px-6 py-2">
              <button
                onClick={() => setActiveTab('stats')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'stats' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <BarChart3 className={`h-5 w-5 ${activeTab === 'stats' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'products' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <ShoppingCart className={`h-5 w-5 ${activeTab === 'products' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button
                onClick={() => setActiveTab('home')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'home' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <DollarSign className={`h-5 w-5 ${activeTab === 'home' ? 'text-primary' : 'text-foreground'}`} />
              </button>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow flex-shrink-0 overflow-hidden ${
                activeTab === 'profile' ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={profileAvatar} alt="Profile" />
                <AvatarFallback className={`${activeTab === 'profile' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <User className={`h-5 w-5 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
