import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAllSessionsWithLocation } from '@/utils/supabaseCountQuery';
import { 
  Radio, 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Loader2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Search
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AdminLayoutMoz } from '@/components/admin/AdminLayoutMoz';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import RotatingEarth from '@/components/app/RotatingEarth';

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

// Check if order is from Mozambique
const isMozOrder = (order: any) => {
  const country = order.customer_country?.toLowerCase() || '';
  const currency = order.currency?.toUpperCase() || '';
  const paymentMethod = order.payment_method?.toLowerCase() || '';
  
  return (
    country.includes('moçambique') ||
    country.includes('mozambique') ||
    country === 'mz' ||
    currency === 'MZN' ||
    paymentMethod === 'emola' ||
    paymentMethod === 'mpesa' ||
    paymentMethod === 'card_mz'
  );
};

// Format amount in Meticais
const formatMT = (amount: number): string => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' MT';
};

export default function AdminLiveViewMoz() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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

  // Sessions by location
  const [sessionsByLocation, setSessionsByLocation] = useState<SessionLocation[]>([]);
  const [activeSessionsLocations, setActiveSessionsLocations] = useState<SessionLocation[]>([]);

  // Top sellers
  const [topSellers, setTopSellers] = useState<SellerActivity[]>([]);

  // Visitor locations for globe
  const [visitorLocations, setVisitorLocations] = useState<SessionLocation[]>([]);

  const loadLiveData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const last5min = new Date(now.getTime() - 5 * 60 * 1000);
      const last10min = new Date(now.getTime() - 10 * 60 * 1000);

      // Get all today's orders and filter for MOZ
      const { data: allTodayOrders } = await supabase
        .from('orders')
        .select('*, products!inner(user_id)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      const todayOrders = (allTodayOrders || []).filter(isMozOrder);

      // Get yesterday's orders for comparison
      const { data: allYesterdayOrders } = await supabase
        .from('orders')
        .select('id, customer_country, currency, payment_method')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());

      const yesterdayOrders = (allYesterdayOrders || []).filter(isMozOrder);

      // Get recent orders (last 5 min)
      const { data: allRecentOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', last5min.toISOString());

      const recentOrders = (allRecentOrders || []).filter(isMozOrder);

      // Get active checkout sessions for Mozambique
      const { data: allActiveCheckouts } = await supabase
        .from('checkout_sessions')
        .select('*')
        .gte('created_at', last10min.toISOString());

      const activeCheckouts = (allActiveCheckouts || []).filter(session => {
        const country = session.country?.toLowerCase() || '';
        return country.includes('moçambique') || country.includes('mozambique') || country === 'mz';
      });

      // Get total products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active sellers
      const sellerIds = new Set(todayOrders.map(o => (o.products as any)?.user_id).filter(Boolean));

      const paidOrders = todayOrders.filter(o => o.status === 'completed');
      const pendingOrders = todayOrders.filter(o => o.status === 'pending' || o.status === 'Pendente');
      const recentPending = recentOrders.filter(o => o.status === 'pending' || o.status === 'Pendente');

      // Calculate total sales value in MZN
      let totalSalesValue = 0;
      paidOrders.forEach(order => {
        const amount = parseFloat(order.amount || '0');
        totalSalesValue += amount;
      });
      
      // Comissão Kambafy = 8.99%
      const kambafyCommissionValue = totalSalesValue * 0.0899;

      const recentCompleted = recentOrders.filter(o => o.status === 'completed');

      setBehavior({
        pendingOrders: recentPending.length,
        completed: recentCompleted.length,
        totalProducts: productsCount || 0
      });

      const sessionsChange = yesterdayOrders.length > 0
        ? Math.round((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100)
        : 0;
      
      setMetrics({
        kambafyCommission: kambafyCommissionValue,
        activeVisitors: activeCheckouts.length,
        totalSales: totalSalesValue,
        sessions: todayOrders.length,
        sessionsChange,
        orders: paidOrders.length,
        activeSellers: sellerIds.size
      });

      // Sessions by location for MOZ orders
      const locationCounts: Record<string, SessionLocation> = {};
      todayOrders.forEach(order => {
        const country = (order as any).customer_country || 'Moçambique';
        if (!locationCounts[country]) {
          locationCounts[country] = {
            country,
            region: 'Nenhum(a)',
            city: 'Nenhum(a)',
            count: 0
          };
        }
        locationCounts[country].count++;
      });
      setSessionsByLocation(Object.values(locationCounts).sort((a, b) => b.count - a.count).slice(0, 10));

      // Active locations for globe
      const activeLocationCounts: Record<string, SessionLocation> = {};
      paidOrders.forEach(order => {
        const country = (order as any).customer_country || 'Moçambique';
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

      // Visitor locations for globe
      const visitorLocationCounts: Record<string, SessionLocation> = {};
      activeCheckouts.forEach(session => {
        const country = session.country || 'Moçambique';
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

      // Top sellers today in MOZ
      const uniqueSellerIds = [...new Set(paidOrders.map(o => (o.products as any)?.user_id).filter(Boolean))];
      
      if (uniqueSellerIds.length > 0) {
        const { data: sellerProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', uniqueSellerIds);
        
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
          
          const amount = parseFloat(order.amount || '0');
          sellerSales[sellerId].sales++;
          sellerSales[sellerId].revenue += amount;
        }
        
        setTopSellers(
          Object.entries(sellerSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        );
      } else {
        setTopSellers([]);
      }

      setLastUpdate(new Date());
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
    if (admin) {
      loadLiveData(false);
    }
  }, [admin]);

  // Real-time subscription
  useEffect(() => {
    if (!isLive) return;
    
    const channel = supabase
      .channel('admin-live-view-moz')
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
  }, [isLive]);

  // Periodic refresh
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      loadLiveDataRef.current(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [isLive]);

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredLocations = sessionsByLocation.filter(loc =>
    searchLocation === '' ||
    loc.country.toLowerCase().includes(searchLocation.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchLocation.toLowerCase()) ||
    loc.region.toLowerCase().includes(searchLocation.toLowerCase())
  );
  const maxLocationCount = Math.max(...sessionsByLocation.map(l => l.count), 1);

  return (
    <AdminLayoutMoz title="Visão ao Vivo" description="Monitorização em tempo real - Moçambique">
      <SEO title="Kambafy Moçambique – Visão ao Vivo" description="Transações em tempo real" noIndex />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-[hsl(var(--admin-text))]">Moçambique ao Vivo</h1>
            <span className="flex items-center gap-1.5 text-sm text-[hsl(var(--admin-text-secondary))]">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isLive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
              )} />
              {isLive ? 'Agora' : 'Pausado'}
            </span>
            <span className="text-xs text-[hsl(var(--admin-text-secondary))]">
              ({formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLiveData(false)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              <Radio className="h-4 w-4 mr-2" />
              {isLive ? 'Ao Vivo' : 'Pausado'}
            </Button>
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
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Vendas Hoje</p>
                  </div>
                  {isInitialLoad ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{formatMT(metrics.totalSales)}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Comissão Kambafy</p>
                  </div>
                  {isInitialLoad ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-xl font-bold text-emerald-600">{formatMT(metrics.kambafyCommission)}</p>
                  )}
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
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] mb-1">Pedidos Hoje</p>
                  <div className="flex items-center gap-2">
                    {isInitialLoad ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <>
                        <p className="text-xl font-bold text-[hsl(var(--admin-text))]">{metrics.sessions}</p>
                        {metrics.sessionsChange !== 0 && (
                          <span className={`flex items-center text-sm ${metrics.sessionsChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
                    <Users className="h-4 w-4 text-emerald-600" />
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
                  <span>Actividade (últimos 5 min)</span>
                  <span className="text-lg">🇲🇿</span>
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
                    <p className="text-xl font-bold text-emerald-600">{behavior.completed}</p>
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
                <CardTitle className="text-base font-semibold text-[hsl(var(--admin-text))]">Pedidos por Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredLocations.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] text-center py-4">Nenhum pedido encontrado</p>
                ) : (
                  filteredLocations.map((loc, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[hsl(var(--admin-text))]">{loc.country}</span>
                        <span className="text-[hsl(var(--admin-text-secondary))]">{loc.count}</span>
                      </div>
                      <Progress value={(loc.count / maxLocationCount) * 100} className="h-2 [&>div]:bg-emerald-500" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Sellers Today */}
            {topSellers.length > 0 && (
              <Card className="bg-white border-[hsl(var(--admin-border))]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[hsl(var(--admin-text))]">Top Vendedores Hoje (MOZ)</CardTitle>
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
                          <span className="text-sm font-medium text-emerald-600">{formatMT(seller.revenue)}</span>
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
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Vendas MOZ
              </div>
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text))]">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                Visitantes
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutMoz>
  );
}
