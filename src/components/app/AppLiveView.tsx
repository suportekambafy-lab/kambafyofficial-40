import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingDown, TrendingUp, ShoppingCart, CreditCard, CheckCircle } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import RotatingEarth from './RotatingEarth';
interface LiveViewProps {
  onBack: () => void;
}
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

// Mapear código de país do telefone para nome
const getCountryFromPhone = (phone: string | null): string => {
  if (!phone) return 'Desconhecido';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+244')) return 'Angola';
  if (cleaned.startsWith('+258')) return 'Moçambique';
  if (cleaned.startsWith('+351')) return 'Portugal';
  if (cleaned.startsWith('+55')) return 'Brasil';
  if (cleaned.startsWith('+34')) return 'Espanha';
  if (cleaned.startsWith('+33')) return 'França';
  if (cleaned.startsWith('+44')) return 'Reino Unido';
  if (cleaned.startsWith('+1')) return 'Estados Unidos';
  if (cleaned.startsWith('+39')) return 'Itália';
  if (cleaned.startsWith('+49')) return 'Alemanha';
  return 'Outro';
};
export function AppLiveView({
  onBack
}: LiveViewProps) {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);

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
    activeCarts: 0,
    checkingOut: 0,
    completed: 0
  });

  // Sessions by location (today's data)
  const [sessionsByLocation, setSessionsByLocation] = useState<SessionLocation[]>([]);

  // ACTIVE sessions (last 5 min - for globe dots)
  const [activeSessionsLocations, setActiveSessionsLocations] = useState<SessionLocation[]>([]);

  // New vs returning
  const [customerTypes, setCustomerTypes] = useState({
    newCustomers: 0,
    returningCustomers: 0
  });

  // Sales by product
  const [productSales, setProductSales] = useState<ProductSales[]>([]);

  // Load user's products first
  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;
      const {
        data: products
      } = await supabase.from('products').select('id, name').eq('user_id', user.id);
      setProductIds(products?.map(p => p.id) || []);
    };
    loadProducts();
  }, [user]);
  const loadLiveData = useCallback(async () => {
    if (!user || productIds.length === 0) return;
    try {
      setLoading(true);
      const now = new Date();
      // Today start (midnight)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Yesterday start for comparison
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      // Last 5 minutes for real-time behavior
      const last5min = new Date(now.getTime() - 5 * 60 * 1000);

      // Get user's products
      const {
        data: products
      } = await supabase.from('products').select('id, name').eq('user_id', user.id);

      // Get TODAY's orders only
      const {
        data: todayOrders
      } = await supabase.from('orders').select('*').in('product_id', productIds).gte('created_at', todayStart.toISOString()).order('created_at', {
        ascending: false
      });

      // Get yesterday's orders for comparison
      const {
        data: yesterdayOrders
      } = await supabase.from('orders').select('id').in('product_id', productIds).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString());

      // Get LAST 5 MINUTES orders for real-time behavior
      const {
        data: recentOrders
      } = await supabase.from('orders').select('*').in('product_id', productIds).gte('created_at', last5min.toISOString());

      // Calculate real metrics from TODAY's data
      const allTodayOrders = todayOrders || [];
      // Use same status as home page: 'completed' only
      const paidOrders = allTodayOrders.filter(o => o.status === 'completed');
      const pendingOrders = allTodayOrders.filter(o => o.status === 'pending' || o.status === 'Pendente');

      // Sessions = all order attempts today
      const totalSessions = allTodayOrders.length;
      const yesterdaySessions = yesterdayOrders?.length || 0;
      const sessionsChange = yesterdaySessions > 0 ? (totalSessions - yesterdaySessions) / yesterdaySessions * 100 : 0;

      // Visitors now = pending orders from last 5 minutes (people currently in checkout)
      const recentPending = (recentOrders || []).filter(o => o.status === 'pending' || o.status === 'Pendente');
      const visitorsNow = recentPending.length;

      // Total sales value TODAY - use seller_commission (same as home page)
      let totalSalesValue = 0;
      paidOrders.forEach(order => {
        // Use seller_commission if available, otherwise fallback to amount
        let amount = parseFloat(order.seller_commission?.toString() || order.amount || '0');

        // Convert to KZ if different currency (same logic as home)
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
      setMetrics({
        visitorsNow,
        totalSales: totalSalesValue,
        sessions: totalSessions,
        sessionsChange: Math.round(sessionsChange),
        orders: paidOrders.length // Count orders, not items
      });

      // Customer behavior based on LAST 5 MINUTES
      const recent5min = recentOrders || [];
      const recentFailed = recent5min.filter(o => o.status === 'failed' || o.status === 'Falhou');
      const recentCheckingOut = recent5min.filter(o => o.status === 'pending' || o.status === 'Pendente');
      const recentCompleted = recent5min.filter(o => o.status === 'completed');
      setBehavior({
        activeCarts: recentFailed.length,
        checkingOut: recentCheckingOut.length,
        completed: recentCompleted.length
      });

      // Sessions by location - based on phone country codes from TODAY's orders
      const locationCounts: Record<string, SessionLocation> = {};
      allTodayOrders.forEach(order => {
        const country = getCountryFromPhone(order.customer_phone);
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
      const sortedLocations = Object.values(locationCounts).sort((a, b) => b.count - a.count).slice(0, 10);
      setSessionsByLocation(sortedLocations);

      // ACTIVE sessions locations - ONLY from last 5 min pending orders (for globe)
      const activeLocationCounts: Record<string, SessionLocation> = {};
      recentPending.forEach(order => {
        const country = getCountryFromPhone(order.customer_phone);
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
      const sortedActiveLocations = Object.values(activeLocationCounts).sort((a, b) => b.count - a.count);
      setActiveSessionsLocations(sortedActiveLocations);

      // Customer types - based on TODAY's orders
      const emailCounts: Record<string, number> = {};
      allTodayOrders.forEach(order => {
        const email = order.customer_email?.toLowerCase();
        if (email) {
          emailCounts[email] = (emailCounts[email] || 0) + 1;
        }
      });

      // Count unique emails
      const uniqueEmails = Object.keys(emailCounts);
      const returningCustomers = uniqueEmails.filter(email => emailCounts[email] > 1).length;
      const newCustomers = uniqueEmails.length - returningCustomers;
      setCustomerTypes({
        newCustomers,
        returningCustomers
      });

      // Sales by product - TODAY's data
      const productSalesData: ProductSales[] = (products || []).map(p => {
        const productOrders = paidOrders.filter(o => o.product_id === p.id);
        return {
          id: p.id,
          name: p.name,
          sales: productOrders.length,
          revenue: productOrders.reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0)
        };
      }).filter(p => p.sales > 0 || p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
      setProductSales(productSalesData);
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, productIds]);

  // Initial load
  useEffect(() => {
    if (productIds.length > 0) {
      loadLiveData();
    }
  }, [productIds, loadLiveData]);

  // Subscribe to real-time order updates via WebSocket
  useEffect(() => {
    if (!user || productIds.length === 0) return;
    console.log('🔌 [Live View] Connecting to realtime channel...');
    const channel = supabase.channel('live-view-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, payload => {
      console.log('📦 [Live View] Order change detected:', payload.eventType);
      // Reload data immediately on any order change
      loadLiveData();
    }).subscribe(status => {
      console.log('🔌 [Live View] Realtime status:', status);
    });
    return () => {
      console.log('🔌 [Live View] Disconnecting...');
      supabase.removeChannel(channel);
    };
  }, [user, productIds, loadLiveData]);
  const maxLocationCount = Math.max(...sessionsByLocation.map(l => l.count), 1);
  return <div className="p-4 space-y-4 min-h-screen bg-amber-50/30 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="rounded-full">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Página inicial
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground">Live View</h2>
        <div className="w-20" />
      </div>

      {/* Legend Pills - Non-clickable color indicators */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          Encomendas
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          Visitantes
        </div>
      </div>

      {/* Globe Visualization - Rotating Earth */}
      <Card className="overflow-hidden rounded-2xl border-none shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="relative w-full max-w-[280px] mx-auto">
            <RotatingEarth width={280} height={280} activeLocations={activeSessionsLocations} />
            
            {/* No active sessions message */}
            {activeSessionsLocations.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground text-xs bg-background/90 px-3 py-2 rounded-lg shadow-sm">
                  Nenhuma sessão ativa
                </div>
              </div>}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>No checkout ({metrics.visitorsNow})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Continentes</span>
            </div>
          </div>
          
          {/* Real-time indicator */}
          
        </CardContent>
      </Card>

      {/* KPI Cards Grid - Today's Data */}
      <div className="text-xs text-muted-foreground text-center mb-2">
        Dados de hoje ({new Date().toLocaleDateString('pt-PT')})
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              No checkout (5 min)
            </p>
            <p className="text-base font-bold text-foreground">{loading ? '...' : metrics.visitorsNow}</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Total de vendas
            </p>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-foreground">
                {loading ? '...' : formatPriceForSeller(metrics.totalSales, 'KZ')}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Sessões
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-foreground">{loading ? '...' : metrics.sessions}</p>
                {!loading && metrics.sessionsChange !== 0 && <span className={`flex items-center text-xs ${metrics.sessionsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.sessionsChange >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {Math.abs(metrics.sessionsChange)}%
                  </span>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Encomendas pagas
            </p>
            <p className="text-base font-bold text-foreground">{loading ? '...' : metrics.orders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Behavior - Last 5 minutes */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2 flex items-center justify-between">
            <span>Comportamento do cliente</span>
            <span className="text-xs font-normal text-muted-foreground">(últimos 5 min)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Carrinhos ativos</p>
              <p className="text-sm font-bold text-foreground">{loading ? '...' : behavior.activeCarts}</p>
            </div>
            <div className="text-center border-x border-muted">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">A finalizar</p>
              <p className="text-sm font-bold text-foreground">{loading ? '...' : behavior.checkingOut}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Compras</p>
              <p className="text-sm font-bold text-foreground">{loading ? '...' : behavior.completed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions by Location */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2">
            Sessões por local
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {loading ? <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p> : sessionsByLocation.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados para este intervalo de datas
            </p> : sessionsByLocation.map((loc, idx) => <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">
                    {loc.country} · {loc.region} · {loc.city}
                  </span>
                  <span className="text-sm text-muted-foreground">{loc.count}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{
              width: `${loc.count / maxLocationCount * 100}%`
            }} />
                </div>
              </div>)}
        </CardContent>
      </Card>

      {/* New vs Returning Customers */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2 truncate">
            Clientes novos vs recorrentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p> : customerTypes.newCustomers === 0 && customerTypes.returningCustomers === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados para este intervalo de datas
            </p> : <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-muted-foreground">Novos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{customerTypes.newCustomers}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-sm text-muted-foreground">Recorrentes</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{customerTypes.returningCustomers}</p>
              </div>
            </div>}
        </CardContent>
      </Card>

      {/* Sales by Product */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2">
            Total de vendas por produto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {loading ? <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p> : productSales.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              Sem vendas nas últimas 24 horas
            </p> : productSales.map(product => <div key={product.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sales} vendas</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatPriceForSeller(product.revenue, 'KZ')}
                </p>
              </div>)}
        </CardContent>
      </Card>
    </div>;
}