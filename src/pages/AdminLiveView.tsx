import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { TrendingDown, TrendingUp, Search, Radio, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { formatPriceForAdmin } from '@/utils/priceFormatting';
import RotatingEarth from '@/components/app/RotatingEarth';
import { Progress } from '@/components/ui/progress';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

interface SessionLocation {
  country: string;
  region: string;
  city: string;
  count: number;
}

interface SellerActivity {
  id: string;
  name: string;
  email: string;
  sales: number;
  revenue: number;
}

export default function AdminLiveView() {
  const { collapsed } = useAdminSidebar();
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');

  // Platform-wide live metrics
  const [metrics, setMetrics] = useState({
    kambafyCommission: 0,
    activeVisitors: 0,
    totalSales: 0,
    sessions: 0,
    sessionsChange: 0,
    orders: 0,
    activeSellers: 0
  });

  // Platform behavior
  const [behavior, setBehavior] = useState({
    pendingOrders: 0,
    completed: 0,
    totalProducts: 0
  });

  // Sessions by location (all platform)
  const [sessionsByLocation, setSessionsByLocation] = useState<SessionLocation[]>([]);
  const [activeSessionsLocations, setActiveSessionsLocations] = useState<SessionLocation[]>([]);

  // Top sellers
  const [topSellers, setTopSellers] = useState<SellerActivity[]>([]);

  // Visitor locations for globe (real-time from checkout_sessions)
  const [visitorLocations, setVisitorLocations] = useState<SessionLocation[]>([]);

  const loadLiveData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const last5min = new Date(now.getTime() - 5 * 60 * 1000);

      // Get all today's orders (platform-wide)
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('*, products!inner(user_id)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      // Get yesterday's orders for comparison
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());

      // Get recent orders (last 5 min)
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', last5min.toISOString());

      // Get active checkout sessions (last 10 min)
      const last10min = new Date(now.getTime() - 10 * 60 * 1000);
      const { data: activeCheckouts } = await supabase
        .from('checkout_sessions')
        .select('*')
        .gte('created_at', last10min.toISOString());

      // Get total products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active sellers (sellers with sales today)
      const sellerIds = new Set((todayOrders || []).map(o => (o.products as any)?.user_id).filter(Boolean));

      const allTodayOrders = todayOrders || [];
      const paidOrders = allTodayOrders.filter(o => o.status === 'completed');
      const pendingOrders = allTodayOrders.filter(o => o.status === 'pending' || o.status === 'Pendente');
      const recentPending = (recentOrders || []).filter(o => o.status === 'pending' || o.status === 'Pendente');

      // Calculate total sales value and Kambafy commission
      let totalSalesValue = 0;
      let kambafyCommissionValue = 0;
      paidOrders.forEach(order => {
        let amount = parseFloat(order.amount || '0');
        let sellerCommission = parseFloat(order.seller_commission?.toString() || '0');
        
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
          sellerCommission = Math.round(sellerCommission * rate);
        }
        totalSalesValue += amount;
        kambafyCommissionValue += (amount - sellerCommission);
      });

      const recentCompleted = (recentOrders || []).filter(o => o.status === 'completed');

      setBehavior({
        pendingOrders: recentPending.length,
        completed: recentCompleted.length,
        totalProducts: productsCount || 0
      });

      // Sessions from checkout_sessions table
      const { data: todaySessions } = await supabase
        .from('checkout_sessions')
        .select('country, city, region')
        .gte('created_at', todayStart.toISOString());

      const { data: yesterdaySessions } = await supabase
        .from('checkout_sessions')
        .select('id')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());

      const totalSessions = todaySessions?.length || 0;
      const yesterdaySessionCount = yesterdaySessions?.length || 0;
      const sessionsChange = yesterdaySessionCount > 0
        ? Math.round((totalSessions - yesterdaySessionCount) / yesterdaySessionCount * 100)
        : 0;

      console.log('Active checkouts (last 10 min):', activeCheckouts?.length);
      console.log('Today sessions:', totalSessions);
      
      setMetrics({
        kambafyCommission: kambafyCommissionValue,
        activeVisitors: activeCheckouts?.length || 0,
        totalSales: totalSalesValue,
        sessions: totalSessions,
        sessionsChange,
        orders: paidOrders.length,
        activeSellers: sellerIds.size
      });

      // Sessions by location
      const locationCounts: Record<string, SessionLocation> = {};
      if (todaySessions && todaySessions.length > 0) {
        todaySessions.forEach(session => {
          const country = session.country;
          if (!country || country === 'Desconhecido' || country === '') return;
          if (!locationCounts[country]) {
            locationCounts[country] = {
              country,
              region: session.region || 'Nenhum(a)',
              city: session.city || 'Nenhum(a)',
              count: 0
            };
          }
          locationCounts[country].count++;
        });
      }
      const sortedLocations = Object.values(locationCounts).sort((a, b) => b.count - a.count).slice(0, 10);
      setSessionsByLocation(sortedLocations);

      // Active locations for globe (from paid orders)
      const activeLocationCounts: Record<string, SessionLocation> = {};
      paidOrders.forEach(order => {
        const country = (order as any).customer_country;
        if (!country || country === 'Desconhecido' || country === '') return;
        if (!activeLocationCounts[country]) {
          activeLocationCounts[country] = {
            country,
            region: 'Nenhum(a)',
            city: 'Nenhum(a)',
            count: 0
          };
        }
        activeLocationCounts[country].count++;
      });
      setActiveSessionsLocations(Object.values(activeLocationCounts).sort((a, b) => b.count - a.count));

      // Visitor locations for globe (from all today's checkout sessions)
      const visitorLocationCounts: Record<string, SessionLocation> = {};
      (todaySessions || []).forEach(session => {
        const country = session.country;
        if (!country || country === 'Desconhecido' || country === '') return;
        if (!visitorLocationCounts[country]) {
          visitorLocationCounts[country] = {
            country,
            region: session.region || 'Nenhum(a)',
            city: session.city || 'Nenhum(a)',
            count: 0
          };
        }
        visitorLocationCounts[country].count++;
      });
      setVisitorLocations(Object.values(visitorLocationCounts));
      console.log('Visitor locations for globe:', Object.values(visitorLocationCounts));

      // Top sellers today
      // Top sellers today - get all unique seller IDs first
      const uniqueSellerIds = [...new Set(paidOrders.map(o => (o.products as any)?.user_id).filter(Boolean))];
      
      // Fetch all profiles at once for efficiency (using user_id, not id)
      const { data: sellerProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', uniqueSellerIds);
      
      console.log('Seller IDs:', uniqueSellerIds);
      console.log('Profiles found:', sellerProfiles);
      if (profileError) console.error('Profile fetch error:', profileError);
      
      const profileMap = new Map((sellerProfiles || []).map(p => [p.user_id, p]));
      
      const sellerSales: Record<string, { name: string; email: string; sales: number; revenue: number }> = {};
      for (const order of paidOrders) {
        const sellerId = (order.products as any)?.user_id;
        if (!sellerId) continue;
        
        if (!sellerSales[sellerId]) {
          const profile = profileMap.get(sellerId);
          sellerSales[sellerId] = {
            name: profile?.full_name || profile?.email || `Vendedor ${sellerId.substring(0, 8)}`,
            email: profile?.email || '',
            sales: 0,
            revenue: 0
          };
        }
        
        let amount = parseFloat(order.amount || '0');
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        
        sellerSales[sellerId].sales++;
        sellerSales[sellerId].revenue += amount;
      }
      
      const topSellersList = Object.entries(sellerSales)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setTopSellers(topSellersList);

    } catch (error) {
      console.error('Error loading admin live data:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  const loadLiveDataRef = useRef(loadLiveData);
  useEffect(() => {
    loadLiveDataRef.current = loadLiveData;
  }, [loadLiveData]);

  // Initial load
  useEffect(() => {
    loadLiveData(false);
  }, []);

  // Real-time subscription for all orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-live-view')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, () => loadLiveDataRef.current(true))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      }, () => loadLiveDataRef.current(true))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'checkout_sessions'
      }, () => loadLiveDataRef.current(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Periodic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveDataRef.current(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredLocations = sessionsByLocation.filter(loc =>
    searchLocation === '' ||
    loc.country.toLowerCase().includes(searchLocation.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchLocation.toLowerCase()) ||
    loc.region.toLowerCase().includes(searchLocation.toLowerCase())
  );
  const maxLocationCount = Math.max(...sessionsByLocation.map(l => l.count), 1);

  return (
    <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
      <AdminHeader title="Visão ao Vivo" description="Monitorização em tempo real da plataforma" />
      
      <div className="p-6 space-y-6 bg-[hsl(var(--admin-bg))]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-[hsl(var(--admin-primary))]" />
            <h1 className="text-2xl font-bold text-[hsl(var(--admin-text))]">Plataforma ao Vivo</h1>
            <span className="flex items-center gap-1.5 text-sm text-[hsl(var(--admin-text-secondary))]">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Agora
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
              <Input
                placeholder="Pesquisar localização..."
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                className="pl-9 w-64 bg-white border-[hsl(var(--admin-border))]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Metrics */}
          <div className="space-y-4">
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Vendas Hoje</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInitialLoad ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-xl font-bold text-[hsl(var(--admin-text))]">
                        {formatPriceForAdmin(metrics.totalSales, 'KZ')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-[hsl(var(--admin-primary))]" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Comissão Kambafy</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInitialLoad ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-xl font-bold text-green-600">
                        {formatPriceForAdmin(metrics.kambafyCommission, 'KZ')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Cards Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Visitantes Agora</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{metrics.activeVisitors}</p>
                    {metrics.activeVisitors > 0 && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] mb-1">Sessões Hoje</p>
                  <div className="flex items-center gap-2">
                    {isInitialLoad ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <>
                        <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{metrics.sessions}</p>
                        {metrics.sessionsChange !== 0 && (
                          <span className={`flex items-center text-sm ${metrics.sessionsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {metrics.sessionsChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {Math.abs(metrics.sessionsChange)}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Cards Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] mb-1">Pedidos Pagos</p>
                  {isInitialLoad ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{metrics.orders}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-[hsl(var(--admin-primary))]" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Vendedores Activos</p>
                  </div>
                  {isInitialLoad ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{metrics.activeSellers}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Platform Activity */}
            <Card className="bg-white border-[hsl(var(--admin-border))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[hsl(var(--admin-text))] flex items-center justify-between">
                  <span>Actividade da Plataforma</span>
                  <span className="text-xs font-normal text-[hsl(var(--admin-text-secondary))]">(últimos 5 min)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 divide-x divide-[hsl(var(--admin-border))]">
                  <div className="pr-4">
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))] mb-1">Novos Pedidos</p>
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{behavior.pendingOrders}</p>
                  </div>
                  <div className="px-4">
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))] mb-1">Pagos</p>
                    <p className="text-xl font-bold text-green-600">{behavior.completed}</p>
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-1 mb-1">
                      <Package className="h-3 w-3 text-[hsl(var(--admin-text-secondary))]" />
                      <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Produtos</p>
                    </div>
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{behavior.totalProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sessions by Location */}
            <Card className="bg-white border-[hsl(var(--admin-border))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[hsl(var(--admin-text))]">Sessões por Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredLocations.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] text-center py-4">Nenhuma sessão encontrada</p>
                ) : (
                  filteredLocations.map((loc, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[hsl(var(--admin-text))]">{loc.country} · {loc.region} · {loc.city}</span>
                        <span className="text-[hsl(var(--admin-text-secondary))]">{loc.count}</span>
                      </div>
                      <Progress value={(loc.count / maxLocationCount) * 100} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Sellers Today */}
            {topSellers.length > 0 && (
              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[hsl(var(--admin-text))]">Top Vendedores Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topSellers.map((seller, index) => (
                      <div key={seller.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">#{index + 1}</span>
                          <span className="text-sm truncate max-w-[200px] text-[hsl(var(--admin-text))]">{seller.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-[hsl(var(--admin-text-secondary))]">{seller.sales} vendas</span>
                          <span className="text-sm font-medium text-[hsl(var(--admin-text))]">{formatPriceForAdmin(seller.revenue, 'KZ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Globe */}
          <div className="relative sticky top-6">
            <div className="relative w-full aspect-square max-w-[500px] mx-auto">
              <RotatingEarth
                width={500}
                height={500}
                activeLocations={activeSessionsLocations}
                visitorLocations={visitorLocations}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text))]">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                Vendas
              </div>
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text))]">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                Visitantes em Checkouts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
