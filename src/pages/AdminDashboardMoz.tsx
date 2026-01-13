import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import { 
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  MoreHorizontal,
  Loader2,
  Filter
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';
import { AdminLayoutMoz } from '@/components/admin/AdminLayoutMoz';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  variant?: 'primary' | 'default';
  icon?: React.ReactNode;
}

function MetricCard({ title, value, subtitle, variant = 'default', icon }: MetricCardProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <div className={cn(
      "rounded-2xl p-6 transition-all duration-300 hover:shadow-lg",
      isPrimary 
        ? "bg-emerald-600 text-white" 
        : "bg-[hsl(var(--admin-card-bg))] border border-[hsl(var(--admin-border))]"
    )}>
      <div className="flex items-start justify-between mb-4">
        <h3 className={cn(
          "text-sm font-medium",
          isPrimary ? "text-white/90" : "text-[hsl(var(--admin-text-secondary))]"
        )}>
          {title}
        </h3>
        {icon && (
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            isPrimary ? "bg-white/20" : "bg-[hsl(var(--admin-bg))]"
          )}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn(
        "text-3xl font-bold mb-1",
        isPrimary ? "text-white" : "text-[hsl(var(--admin-text))]"
      )}>
        {value}
      </div>
      <p className={cn(
        "text-sm",
        isPrimary ? "text-white/70" : "text-[hsl(var(--admin-text-secondary))]"
      )}>
        {subtitle}
      </p>
    </div>
  );
}

// Chart Card Component
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  filter?: React.ReactNode;
}

function ChartCard({ title, children, filter }: ChartCardProps) {
  return (
    <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-[hsl(var(--admin-text))]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {filter}
          <button className="p-2 hover:bg-[hsl(var(--admin-bg))] rounded-lg transition-colors">
            <MoreHorizontal className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// Status Colors
const STATUS_COLORS = {
  success: 'hsl(145 63% 42%)',
  pending: 'hsl(38 92% 50%)',
  failed: 'hsl(4 90% 58%)',
  expired: 'hsl(0 0% 70%)',
  cancelled: 'hsl(280 60% 50%)'
};

// MOZ payment methods and currency filter
const MOZ_FILTER = `customer_country.eq.Moçambique,currency.eq.MZN,payment_method.in.(emola,mpesa,card_mz)`;

export default function AdminDashboardMoz() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('week');
  const [volumeFilter, setVolumeFilter] = useState('7days');
  const [orderStats, setOrderStats] = useState({ success: 0, pending: 0, failed: 0, expired: 0, cancelled: 0 });
  const [volumeData, setVolumeData] = useState<{ date: string; volume: number; count: number }[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
  });

  // Format amount in Meticais
  const formatMT = (amount: number) => `${formatWithMaxTwoDecimals(amount)} MT`;

  // Check if order is from Mozambique (MZN currency or MZ payment methods only)
  const isMozOrder = (order: any) => {
    const currency = (order.currency || '').toUpperCase();
    const originalCurrency = (order.original_currency || '').toUpperCase();
    const paymentMethod = (order.payment_method || '').toLowerCase();
    
    return (
      paymentMethod === 'emola' ||
      paymentMethod === 'mpesa' ||
      paymentMethod === 'card_mz' ||
      currency === 'MZN' ||
      originalCurrency === 'MZN'
    );
  };

  const loadVolumeData = useCallback(async () => {
    setVolumeLoading(true);
    try {
      let daysBack = 7;
      switch (volumeFilter) {
        case '7days':
          daysBack = 7;
          break;
        case 'month':
          daysBack = 30;
          break;
        case 'year':
          daysBack = 365;
          break;
      }

      // Use RPC to bypass RLS for volume data
      const { data, error } = await supabase.rpc('get_mozambique_volume_data', { days_back: daysBack });

      if (error) {
        console.error('Error fetching MOZ volume data:', error);
        setVolumeData([]);
        return;
      }

      if (data && Array.isArray(data)) {
        console.log('🇲🇿 MOZ Volume Data (RPC):', data);
        
        const chartData = (data as { date: string; volume: number; count: number }[]).map((item) => ({
          date: format(new Date(item.date), volumeFilter === 'year' ? 'MMM' : 'dd/MM', { locale: ptBR }),
          volume: item.volume || 0,
          count: item.count || 0
        }));

        setVolumeData(chartData);
      } else {
        setVolumeData([]);
      }
    } catch (error) {
      console.error('Error loading volume data:', error);
      setVolumeData([]);
    } finally {
      setVolumeLoading(false);
    }
  }, [volumeFilter]);

  const loadStatusData = useCallback(async () => {
    setStatusLoading(true);
    try {
      let startDate: Date;
      const endDate = new Date();
      
      switch (statusFilter) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = startOfMonth(endDate);
          break;
        case 'year':
          startDate = startOfYear(endDate);
          break;
        default:
          startDate = subDays(endDate, 7);
      }

      // Fetch all orders and filter for MOZ
      const { data: orders } = await supabase
        .from('orders')
        .select('status, customer_country, currency, payment_method')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .neq('payment_method', 'member_access');

      if (orders) {
        const mozOrders = orders.filter(isMozOrder);
        
        const statusCounts = {
          success: mozOrders.filter(o => o.status === 'completed').length,
          pending: mozOrders.filter(o => o.status === 'pending').length,
          failed: mozOrders.filter(o => o.status === 'failed').length,
          expired: mozOrders.filter(o => o.status === 'expired').length,
          cancelled: mozOrders.filter(o => o.status === 'cancelled').length
        };
        
        setOrderStats(statusCounts);
      }
    } catch (error) {
      console.error('Error loading status data:', error);
    } finally {
      setStatusLoading(false);
    }
  }, [statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      // Use RPC to bypass RLS for admin stats
      const { data, error } = await supabase.rpc('get_mozambique_admin_stats');

      if (error) {
        console.error('Error fetching MOZ stats:', error);
        return;
      }

      if (data) {
        console.log('🇲🇿 MOZ Dashboard Stats (RPC):', data);
        const statsData = data as { totalOrders: number; totalRevenue: number; completedOrders: number; pendingOrders: number };
        
        setStats({
          totalOrders: statsData.totalOrders || 0,
          totalRevenue: statsData.totalRevenue || 0,
          completedOrders: statsData.completedOrders || 0,
          pendingOrders: statsData.pendingOrders || 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      loadStats();
    }
  }, [admin, loadStats]);

  useEffect(() => {
    if (admin) {
      loadVolumeData();
    }
  }, [admin, volumeFilter, loadVolumeData]);

  useEffect(() => {
    if (admin) {
      loadStatusData();
    }
  }, [admin, statusFilter, loadStatusData]);

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayoutMoz title="Painel de Controlo" description="Carregando dados...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </AdminLayoutMoz>
    );
  }

  // Prepare pie chart data
  const pieData = [
    { name: 'Sucesso', value: orderStats.success, color: STATUS_COLORS.success },
    { name: 'Pendente', value: orderStats.pending, color: STATUS_COLORS.pending },
    { name: 'Falhou', value: orderStats.failed, color: STATUS_COLORS.failed },
    { name: 'Expirado', value: orderStats.expired, color: STATUS_COLORS.expired },
    { name: 'Cancelado', value: orderStats.cancelled, color: STATUS_COLORS.cancelled }
  ].filter(d => d.value > 0);

  const totalOrders = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <AdminLayoutMoz 
      title="Painel de Controlo" 
      description="Visão geral das transações em Moçambique"
    >
      <SEO 
        title="Kambafy Moçambique – Dashboard Admin" 
        description="Dashboard administrativo Moçambique" 
        noIndex 
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Receita Total (MZN)"
          value={formatMT(stats.totalRevenue)}
          subtitle="Em Moçambique"
          variant="primary"
          icon={<DollarSign className="h-4 w-4 text-white" />}
        />
        <MetricCard 
          title="Total de Vendas"
          value={stats.totalOrders.toString()}
          subtitle="Transações processadas"
          icon={<ShoppingCart className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />}
        />
        <MetricCard 
          title="Vendas Concluídas"
          value={stats.completedOrders.toString()}
          subtitle="Pagamentos confirmados"
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
        />
        <MetricCard 
          title="Vendas Pendentes"
          value={stats.pendingOrders.toString()}
          subtitle="Aguardando confirmação"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <ChartCard 
          title="Estado dos Pedidos"
          filter={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {statusLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : totalOrders === 0 ? (
            <div className="h-64 flex items-center justify-center text-[hsl(var(--admin-text-secondary))]">
              Sem dados para o período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value, 'Pedidos']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--admin-card-bg))',
                    border: '1px solid hsl(var(--admin-border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Volume Bar Chart */}
        <ChartCard 
          title="Volume de Vendas (MT)"
          filter={
            <Select value={volumeFilter} onValueChange={setVolumeFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Dias</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {volumeLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : volumeData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-[hsl(var(--admin-text-secondary))]">
              Sem dados para o período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-secondary))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-secondary))' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatMT(value), 'Volume']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--admin-card-bg))',
                    border: '1px solid hsl(var(--admin-border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </AdminLayoutMoz>
  );
}
