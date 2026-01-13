import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import { 
  Radio, 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AdminLayoutMoz } from '@/components/admin/AdminLayoutMoz';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveOrder {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  products?: {
    name: string;
  } | null;
}

// Check if order is from Mozambique
const isMozOrder = (order: any) => {
  return order.customer_country === 'Moçambique' || 
         order.currency === 'MZN' || 
         ['emola', 'mpesa', 'card_mz'].includes(order.payment_method);
};

// Format amount in Meticais
const formatMT = (amount: number) => `${formatWithMaxTwoDecimals(amount)} MT`;

// Payment method labels
const getPaymentMethodLabel = (method: string | null) => {
  switch (method) {
    case 'emola': return 'E-Mola';
    case 'mpesa': return 'M-Pesa';
    case 'card_mz': return 'Cartão';
    default: return method || 'N/A';
  }
};

export default function AdminLiveViewMoz() {
  const { admin } = useAdminAuth();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({
    todayCompleted: 0,
    todayPending: 0,
    todayRevenue: 0,
  });

  const loadOrders = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (name)
        `)
        .gte('created_at', today.toISOString())
        .neq('payment_method', 'member_access')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter for MOZ orders
      const mozOrders = (data || []).filter(isMozOrder);
      setOrders(mozOrders);

      // Calculate today's stats
      const completed = mozOrders.filter(o => o.status === 'completed');
      const pending = mozOrders.filter(o => o.status === 'pending');
      const revenue = completed.reduce((sum, o) => sum + parseFloat(o.amount), 0);

      setStats({
        todayCompleted: completed.length,
        todayPending: pending.length,
        todayRevenue: revenue,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (admin) {
      loadOrders();
    }
  }, [admin, loadOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!admin || !isLive) return;

    const channel = supabase
      .channel('moz-orders-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🇲🇿 Live update:', payload);
          loadOrders();
        }
      )
      .subscribe();

    // Also poll every 30 seconds as backup
    const interval = setInterval(loadOrders, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [admin, isLive, loadOrders]);

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayoutMoz 
      title="Visão ao Vivo" 
      description="Transações em tempo real de Moçambique"
    >
      <SEO 
        title="Kambafy Moçambique – Visão ao Vivo" 
        description="Transações em tempo real" 
        noIndex 
      />

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Live Indicator */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                isLive ? "bg-emerald-500/10" : "bg-gray-500/10"
              )}>
                <Radio className={cn("h-5 w-5", isLive ? "text-emerald-600" : "text-gray-500")} />
              </div>
              <div>
                <p className="text-sm font-medium text-[hsl(var(--admin-text))]">
                  {isLive ? 'Ao Vivo' : 'Pausado'}
                </p>
                <p className="text-xs text-[hsl(var(--admin-text-secondary))]">
                  {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            {isLive && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>

        {/* Today's Completed */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.todayCompleted}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Pagos Hoje</p>
            </div>
          </div>
        </div>

        {/* Today's Pending */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.todayPending}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Pendentes</p>
            </div>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-emerald-600 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatMT(stats.todayRevenue)}</p>
              <p className="text-xs text-white/70">Receita Hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--admin-text))]">
          Transações de Hoje
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
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
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-[hsl(var(--admin-text-secondary))] mb-4" />
            <h3 className="text-lg font-medium text-[hsl(var(--admin-text))]">Sem transações hoje</h3>
            <p className="text-[hsl(var(--admin-text-secondary))]">
              As novas transações aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--admin-border))]">
            <AnimatePresence>
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-[hsl(var(--admin-bg))] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        order.status === 'completed' 
                          ? "bg-emerald-500/10" 
                          : order.status === 'pending' 
                            ? "bg-amber-500/10" 
                            : "bg-red-500/10"
                      )}>
                        {order.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : order.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-amber-600" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[hsl(var(--admin-text))]">
                          {order.customer_name}
                        </p>
                        <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                          {order.products?.name || 'Produto'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {getPaymentMethodLabel(order.payment_method)}
                      </Badge>
                      <div className="text-right">
                        <p className="font-bold text-[hsl(var(--admin-text))]">
                          {formatMT(parseFloat(order.amount))}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-secondary))]">
                          {format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayoutMoz>
  );
}
