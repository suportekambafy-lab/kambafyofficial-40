import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { TrendingDown, TrendingUp, Search, Radio, Maximize2 } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import RotatingEarth from '@/components/app/RotatingEarth';
import { useCheckoutPresenceCount } from '@/hooks/useCheckoutPresenceCount';
import { Progress } from '@/components/ui/progress';
interface SessionLocation {
  country: string;
  region: string;
  city: string;
  count: number;
}
interface ProductSales {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}
export default function LiveView() {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [searchLocation, setSearchLocation] = useState('');

  // Live metrics
  const [metrics, setMetrics] = useState({
    visitorsNow: 0,
    totalSales: 0,
    sessions: 0,
    sessionsChange: 0,
    orders: 0
  });

  // Customer behavior
  const [behavior, setBehavior] = useState({
    pendingOrders: 0,
    completed: 0,
    activeCarts: 0
  });

  // Sessions by location
  const [sessionsByLocation, setSessionsByLocation] = useState<SessionLocation[]>([]);
  const [activeSessionsLocations, setActiveSessionsLocations] = useState<SessionLocation[]>([]);

  // Customer types
  const [customerTypes, setCustomerTypes] = useState({
    newCustomers: 0,
    returningCustomers: 0
  });

  // Sales by product
  const [productSales, setProductSales] = useState<ProductSales[]>([]);

  // Load user's products first - only set if actually changed
  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;
      const {
        data: products
      } = await supabase.from('products').select('id, name').eq('user_id', user.id);
      const newIds = products?.map(p => p.id) || [];
      setProductIds(prev => {
        const prevStr = JSON.stringify(prev.sort());
        const newStr = JSON.stringify(newIds.sort());
        if (prevStr === newStr) return prev;
        return newIds;
      });
    };
    loadProducts();
  }, [user]);

  // Real-time presence tracking
  const {
    visitorCount: realTimeVisitors,
    visitorLocations
  } = useCheckoutPresenceCount(productIds);

  // Use ref for visitorLocations to avoid causing re-renders in loadLiveData
  const visitorLocationsRef = useRef(visitorLocations);
  useEffect(() => {
    visitorLocationsRef.current = visitorLocations;
  }, [visitorLocations]);
  const loadLiveData = useCallback(async (silent = false) => {
    if (!user || productIds.length === 0) return;
    try {
      if (!silent) setLoading(true);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const last5min = new Date(now.getTime() - 5 * 60 * 1000);
      const {
        data: products
      } = await supabase.from('products').select('id, name').eq('user_id', user.id);
      const {
        data: todayOrders
      } = await supabase.from('orders').select('*').in('product_id', productIds).gte('created_at', todayStart.toISOString()).order('created_at', {
        ascending: false
      });
      const {
        data: yesterdayOrders
      } = await supabase.from('orders').select('id').in('product_id', productIds).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString());
      const {
        data: recentOrders
      } = await supabase.from('orders').select('*').in('product_id', productIds).gte('created_at', last5min.toISOString());
      const allTodayOrders = todayOrders || [];
      const paidOrders = allTodayOrders.filter(o => o.status === 'completed');
      const pendingOrders = allTodayOrders.filter(o => o.status === 'pending' || o.status === 'Pendente');
      const yesterdaySessions = yesterdayOrders?.length || 0;
      const recentPending = (recentOrders || []).filter(o => o.status === 'pending' || o.status === 'Pendente');
      let totalSalesValue = 0;
      paidOrders.forEach(order => {
        let amount = parseFloat(order.seller_commission?.toString() || order.amount || '0');
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        totalSalesValue += amount;
      });
      const recentCompleted = (recentOrders || []).filter(o => o.status === 'completed');
      setBehavior({
        pendingOrders: recentPending.length,
        completed: recentCompleted.length,
        activeCarts: pendingOrders.length
      });
      const totalSessions = allTodayOrders.length;
      const sessionsChange = yesterdaySessions > 0 ? (totalSessions - yesterdaySessions) / yesterdaySessions * 100 : 0;
      setMetrics({
        visitorsNow: recentPending.length,
        totalSales: totalSalesValue,
        sessions: totalSessions,
        sessionsChange: Math.round(sessionsChange),
        orders: paidOrders.length
      });

      // Sessions by location
      const {
        data: todaySessions
      } = await supabase.from('checkout_sessions').select('country, city, region').in('product_id', productIds).gte('created_at', todayStart.toISOString());
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
      } else {
        visitorLocationsRef.current.forEach(loc => {
          if (!loc.country || loc.country === 'Desconhecido' || loc.country === '') return;
          if (!locationCounts[loc.country]) {
            locationCounts[loc.country] = {
              country: loc.country,
              region: loc.region || 'Nenhum(a)',
              city: loc.city || 'Nenhum(a)',
              count: 0
            };
          }
          locationCounts[loc.country].count += loc.count;
        });
      }
      const sortedLocations = Object.values(locationCounts).sort((a, b) => b.count - a.count).slice(0, 10);
      setSessionsByLocation(sortedLocations);

      // Active locations for globe
      const activeLocationCounts: Record<string, SessionLocation> = {};
      recentCompleted.forEach(order => {
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

      // Customer types
      const emailCounts: Record<string, number> = {};
      allTodayOrders.forEach(order => {
        const email = order.customer_email?.toLowerCase();
        if (email) emailCounts[email] = (emailCounts[email] || 0) + 1;
      });
      const uniqueEmails = Object.keys(emailCounts);
      const returningCustomers = uniqueEmails.filter(email => emailCounts[email] > 1).length;
      setCustomerTypes({
        newCustomers: uniqueEmails.length - returningCustomers,
        returningCustomers
      });

      // Sales by product
      const productSalesData: ProductSales[] = (products || []).map(p => {
        const productOrders = paidOrders.filter(o => o.product_id === p.id);
        let productRevenue = 0;
        productOrders.forEach(order => {
          let amount = parseFloat(order.seller_commission?.toString() || order.amount || '0');
          if (order.currency && order.currency !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1053,
              'MZN': 14.3
            };
            const rate = exchangeRates[order.currency.toUpperCase()] || 1;
            amount = Math.round(amount * rate);
          }
          productRevenue += amount;
        });
        return {
          id: p.id,
          name: p.name,
          sales: productOrders.length,
          revenue: productRevenue
        };
      }).filter(p => p.sales > 0 || p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
      setProductSales(productSalesData);
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user, productIds]);
  // Store loadLiveData in a ref to avoid re-subscribing
  const loadLiveDataRef = useRef(loadLiveData);
  useEffect(() => {
    loadLiveDataRef.current = loadLiveData;
  }, [loadLiveData]);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Initial load - only once when productIds are ready
  useEffect(() => {
    if (productIds.length > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadLiveData(false);
    }
  }, [productIds]); // eslint-disable-line react-hooks/exhaustive-deps
  // Stable productIds string for dependency
  const productIdsKey = productIds.join(',');

  // Real-time subscription - stable
  useEffect(() => {
    if (!user || productIds.length === 0) return;
    const channel = supabase.channel(`live-view-desktop-${user.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders'
    }, payload => {
      const newOrder = payload.new as any;
      if (productIds.includes(newOrder?.product_id)) loadLiveDataRef.current(true);
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders'
    }, payload => {
      const updatedOrder = payload.new as any;
      if (productIds.includes(updatedOrder?.product_id)) loadLiveDataRef.current(true);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, productIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredLocations = sessionsByLocation.filter(loc => searchLocation === '' || loc.country.toLowerCase().includes(searchLocation.toLowerCase()) || loc.city.toLowerCase().includes(searchLocation.toLowerCase()) || loc.region.toLowerCase().includes(searchLocation.toLowerCase()));
  const maxLocationCount = Math.max(...sessionsByLocation.map(l => l.count), 1);
  return <div className="p-6 space-y-6 bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Live View</h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Agora mesmo
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Procurar local" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} className="pl-9 w-64 bg-background" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Metrics */}
        <div className="space-y-4">
          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Visitantes neste momento</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">{realTimeVisitors}</p>
                  {realTimeVisitors > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Vendas líquidas  </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {isInitialLoad ? <Skeleton className="h-8 w-24" /> : formatPriceForSeller(metrics.totalSales, 'KZ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Sessões</p>
                <div className="flex items-center gap-2">
                  {isInitialLoad ? <Skeleton className="h-8 w-16" /> : <>
                      <p className="text-2xl font-bold text-foreground">{metrics.sessions}</p>
                      {metrics.sessionsChange !== 0 && <span className={`flex items-center text-sm ${metrics.sessionsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {metrics.sessionsChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                          {Math.abs(metrics.sessionsChange)}%
                        </span>}
                    </>}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">vendas pagas </p>
                {isInitialLoad ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-foreground">{metrics.orders}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Customer Behavior */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
                <span>Comportamento do cliente</span>
                <span className="text-xs font-normal text-muted-foreground">(últimos 5 min)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <p className="text-sm text-muted-foreground mb-1">Pedidos gerados</p>
                  <p className="text-2xl font-bold text-foreground">{behavior.pendingOrders}</p>
                </div>
                <div className="pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Vendas pagas</p>
                  <p className="text-2xl font-bold text-foreground">{behavior.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions by Location */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Sessões por local</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredLocations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão registrada</p> : filteredLocations.map((loc, index) => <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{loc.country} · {loc.region} · {loc.city}</span>
                      <span className="text-muted-foreground">{loc.count}</span>
                    </div>
                    <Progress value={loc.count / maxLocationCount * 100} className="h-2" />
                  </div>)}
            </CardContent>
          </Card>

          {/* Customer Types */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Clientes novos em comparação com clientes habituais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Novos clientes</p>
                  <p className="text-2xl font-bold text-foreground">{customerTypes.newCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Clientes habituais</p>
                  <p className="text-2xl font-bold text-foreground">{customerTypes.returningCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales by Product */}
          {productSales.length > 0 && <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Vendas por produto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productSales.map(product => <div key={product.id} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[200px] text-foreground">{product.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{product.sales} vendas</span>
                        <span className="text-sm font-medium text-foreground">{formatPriceForSeller(product.revenue, 'KZ')}</span>
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Right Column - Globe */}
        <div className="relative">
          <Card className="sticky top-6 h-fit">
            <CardContent className="p-6">
              <div className="relative w-full aspect-square max-w-[350px] mx-auto">
                <RotatingEarth width={350} height={350} activeLocations={activeSessionsLocations} visitorLocations={visitorLocations} />
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  Vendas
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-3 h-3 rounded-full bg-cyan-500" />
                  Visitantes neste momento
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}