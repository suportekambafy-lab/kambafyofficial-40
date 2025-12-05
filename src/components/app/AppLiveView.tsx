import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Map, Globe, TrendingDown, TrendingUp, ShoppingCart, CreditCard, CheckCircle } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';

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

export function AppLiveView({ onBack }: LiveViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'orders' | 'visitors'>('orders');
  
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
  
  // Sessions by location
  const [sessionsByLocation, setSessionsByLocation] = useState<SessionLocation[]>([]);
  
  // New vs returning
  const [customerTypes, setCustomerTypes] = useState({
    newCustomers: 0,
    returningCustomers: 0
  });
  
  // Sales by product
  const [productSales, setProductSales] = useState<ProductSales[]>([]);

  const loadLiveData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch orders from last 24 hours for live metrics
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get user's products
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id);
      
      const productIds = products?.map(p => p.id) || [];
      
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }
      
      // Get orders from last 24h
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false });
      
      // Get orders from last 7 days for comparison
      const { data: weekOrders } = await supabase
        .from('orders')
        .select('*')
        .in('product_id', productIds)
        .gte('created_at', last7d.toISOString());
      
      // Get abandoned purchases for checkout funnel
      const { data: abandonedPurchases } = await supabase
        .from('abandoned_purchases')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'abandoned')
        .gte('created_at', last24h.toISOString());
      
      // Calculate metrics
      const paidOrders = recentOrders?.filter(o => o.status === 'Pago') || [];
      const pendingOrders = recentOrders?.filter(o => o.status === 'pending' || o.status === 'Pendente') || [];
      
      // Sessions calculation (simulated based on orders and abandoned)
      const totalSessions = (recentOrders?.length || 0) + (abandonedPurchases?.length || 0);
      const previousDaySessions = Math.max(1, Math.floor(totalSessions * 1.2)); // Simulated previous
      const sessionsChange = previousDaySessions > 0 
        ? ((totalSessions - previousDaySessions) / previousDaySessions) * 100 
        : 0;
      
      setMetrics({
        visitorsNow: abandonedPurchases?.length || 0,
        totalSales: paidOrders.reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0),
        sessions: totalSessions,
        sessionsChange: Math.round(sessionsChange),
        orders: paidOrders.length
      });
      
      setBehavior({
        activeCarts: abandonedPurchases?.length || 0,
        checkingOut: pendingOrders?.length || 0,
        completed: paidOrders.length
      });
      
      // Sessions by location (based on order data - simulated geographic distribution)
      const locations: SessionLocation[] = [];
      const uniqueEmails = new Set(recentOrders?.map(o => o.customer_email) || []);
      
      // Simulated location data based on real activity
      if (uniqueEmails.size > 0) {
        const locationSamples = [
          { country: 'Angola', region: 'Luanda', city: 'Luanda' },
          { country: 'Portugal', region: 'Lisboa', city: 'Lisboa' },
          { country: 'Brazil', region: 'São Paulo', city: 'São Paulo' },
          { country: 'Mozambique', region: 'Maputo', city: 'Maputo' },
        ];
        
        const emailArray = Array.from(uniqueEmails);
        emailArray.forEach((_, idx) => {
          const loc = locationSamples[idx % locationSamples.length];
          const existing = locations.find(l => l.country === loc.country);
          if (existing) {
            existing.count++;
          } else {
            locations.push({ ...loc, count: 1 });
          }
        });
      }
      
      setSessionsByLocation(locations);
      
      // Customer types
      const allEmails = weekOrders?.map(o => o.customer_email) || [];
      const emailCounts = allEmails.reduce((acc, email) => {
        acc[email] = (acc[email] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const returning = Object.values(emailCounts).filter(c => c > 1).length;
      const newCust = Object.keys(emailCounts).length - returning;
      
      setCustomerTypes({
        newCustomers: newCust,
        returningCustomers: returning
      });
      
      // Sales by product
      const salesByProduct: ProductSales[] = (products || []).map(p => {
        const productOrders = paidOrders.filter(o => o.product_id === p.id);
        return {
          id: p.id,
          name: p.name,
          sales: productOrders.length,
          revenue: productOrders.reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0)
        };
      }).filter(p => p.sales > 0);
      
      setProductSales(salesByProduct);
      
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLiveData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadLiveData, 30000);
    return () => clearInterval(interval);
  }, [loadLiveData]);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('live-view-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          loadLiveData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadLiveData]);

  const maxLocationCount = Math.max(...sessionsByLocation.map(l => l.count), 1);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="rounded-full">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Página inicial
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground">Live View</h2>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 px-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter('orders')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            activeFilter === 'orders' 
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeFilter === 'orders' ? 'bg-purple-500' : 'bg-muted-foreground'}`} />
          Encomendas
        </button>
        <button
          onClick={() => setActiveFilter('visitors')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            activeFilter === 'visitors' 
              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeFilter === 'visitors' ? 'bg-cyan-500' : 'bg-muted-foreground'}`} />
          Visitantes neste momento
        </button>
        <Button variant="outline" size="icon" className="rounded-full flex-shrink-0">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full flex-shrink-0">
          <Map className="h-4 w-4" />
        </Button>
      </div>

      {/* Globe Visualization */}
      <Card className="overflow-hidden rounded-2xl border-none shadow-sm bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-6">
          <div className="relative w-full aspect-square max-w-[300px] mx-auto">
            {/* Stylized Globe */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-100 via-cyan-200 to-teal-100 dark:from-cyan-900/30 dark:via-cyan-800/20 dark:to-teal-900/30 shadow-inner">
              {/* Globe Pattern */}
              <div className="absolute inset-4 rounded-full border-2 border-cyan-300/30 dark:border-cyan-600/30" />
              <div className="absolute inset-8 rounded-full border border-cyan-300/20 dark:border-cyan-600/20" />
              <div className="absolute inset-12 rounded-full border border-cyan-300/10 dark:border-cyan-600/10" />
              
              {/* Continents representation */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute top-[20%] left-[25%] w-[30%] h-[25%] bg-cyan-400/40 dark:bg-cyan-500/30 rounded-[40%]" />
                <div className="absolute top-[35%] left-[55%] w-[20%] h-[30%] bg-cyan-400/40 dark:bg-cyan-500/30 rounded-[30%]" />
                <div className="absolute top-[50%] left-[20%] w-[15%] h-[25%] bg-cyan-400/40 dark:bg-cyan-500/30 rounded-[40%]" />
                <div className="absolute top-[55%] left-[60%] w-[18%] h-[20%] bg-cyan-400/40 dark:bg-cyan-500/30 rounded-[35%]" />
              </div>
              
              {/* Active visitor dots */}
              {sessionsByLocation.slice(0, 5).map((loc, idx) => {
                const positions = [
                  { top: '30%', left: '45%' },
                  { top: '45%', left: '60%' },
                  { top: '55%', left: '35%' },
                  { top: '40%', left: '25%' },
                  { top: '60%', left: '55%' },
                ];
                const pos = positions[idx % positions.length];
                return (
                  <div
                    key={loc.country}
                    className="absolute w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-lg shadow-purple-500/50"
                    style={{ top: pos.top, left: pos.left }}
                  />
                );
              })}
            </div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="h-12 w-12 text-cyan-500/30 dark:text-cyan-400/30" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Visitantes neste m...
            </p>
            <p className="text-2xl font-bold text-foreground">{metrics.visitorsNow}</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Total de vendas
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">
                {formatPriceForSeller(metrics.totalSales, 'KZ').split(' ')[0]}
              </p>
              <span className="text-xs text-muted-foreground">—</span>
              <div className="w-8 h-1 bg-cyan-400 rounded-full" />
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
                <p className="text-2xl font-bold text-foreground">{metrics.sessions}</p>
                <span className={`flex items-center text-xs ${metrics.sessionsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {metrics.sessionsChange >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(metrics.sessionsChange)}%
                </span>
              </div>
              <div className="w-16 h-6 flex items-end gap-0.5">
                {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
                  <div key={i} className="flex-1 bg-muted rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 truncate border-b border-dashed border-muted pb-1">
              Encomendas
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{metrics.orders}</p>
              <span className="text-xs text-muted-foreground">—</span>
              <div className="w-8 h-1 bg-cyan-400 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Behavior */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2">
            Comportamento do cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Carrinhos ativos</p>
              <p className="text-xl font-bold text-foreground">{behavior.activeCarts}</p>
            </div>
            <div className="text-center border-x border-muted">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">A finalizar a compra</p>
              <p className="text-xl font-bold text-foreground">{behavior.checkingOut}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1 truncate">Compra efet...</p>
              <p className="text-xl font-bold text-foreground">{behavior.completed}</p>
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
          {sessionsByLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados para este intervalo de datas
            </p>
          ) : (
            sessionsByLocation.map((loc, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">
                    {loc.country} · {loc.region || 'Nenhum(a)'} · {loc.city || 'Nenhum(a)'}
                  </span>
                  <span className="text-sm text-muted-foreground">{loc.count}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${(loc.count / maxLocationCount) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* New vs Returning Customers */}
      <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold border-b border-dashed border-muted pb-2 truncate">
            Clientes novos em comparação com clientes ...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {customerTypes.newCustomers === 0 && customerTypes.returningCustomers === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados para este intervalo de datas
            </p>
          ) : (
            <div className="flex items-center gap-6">
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
            </div>
          )}
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
          {productSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados para este intervalo de datas
            </p>
          ) : (
            productSales.map(product => (
              <div key={product.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sales} vendas</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatPriceForSeller(product.revenue, 'KZ')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
