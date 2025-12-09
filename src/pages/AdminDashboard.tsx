import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import type { AdminStats } from '@/types/admin';
import { 
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle,
  MoreHorizontal,
  Loader2,
  CalendarIcon,
  Filter
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, startOfMonth, startOfYear, parseISO, startOfDay, endOfDay, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

// Metric Card Component - Style like reference
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
        ? "bg-[hsl(var(--admin-primary))] text-white" 
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
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--admin-bg))] flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
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

// Status Pie Chart Data
const STATUS_COLORS = {
  success: 'hsl(145 63% 42%)',
  pending: 'hsl(38 92% 50%)',
  failed: 'hsl(4 90% 58%)',
  expired: 'hsl(0 0% 70%)',
  cancelled: 'hsl(280 60% 50%)'
};

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companyFinancials, setCompanyFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('week');
  const [volumeFilter, setVolumeFilter] = useState('7days');
  const [orderStats, setOrderStats] = useState({ success: 0, pending: 0, failed: 0, expired: 0, cancelled: 0 });
  const [volumeData, setVolumeData] = useState<{ date: string; volume: number; count: number }[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Global time filter for main stats
  const [globalTimeFilter, setGlobalTimeFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [statsLoading, setStatsLoading] = useState(false);

  const getGlobalDateRange = useCallback(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = endOfDay(now);

    switch (globalTimeFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 7));
        break;
      case '30days':
        startDate = startOfDay(subDays(now, 30));
        break;
      case 'custom':
        if (customDateRange?.from) {
          startDate = startOfDay(customDateRange.from);
          endDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from);
        }
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    return { startDate, endDate };
  }, [globalTimeFilter, customDateRange]);

  const getFilterLabel = () => {
    switch (globalTimeFilter) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case '7days': return 'Últimos 7 dias';
      case '30days': return 'Últimos 30 dias';
      case 'custom': 
        if (customDateRange?.from) {
          const from = format(customDateRange.from, 'dd/MM', { locale: ptBR });
          const to = customDateRange.to ? format(customDateRange.to, 'dd/MM', { locale: ptBR }) : from;
          return `${from} - ${to}`;
        }
        return 'Personalizado';
      case 'all':
      default: return 'Todo o período';
    }
  };

  const loadVolumeData = useCallback(async () => {
    setVolumeLoading(true);
    try {
      let startDate: Date;
      const endDate = new Date();
      
      switch (volumeFilter) {
        case '7days':
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

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      if (orders) {
        const groupedData: Record<string, { volume: number; count: number }> = {};
        
        orders.forEach(order => {
          const dateKey = format(parseISO(order.created_at), volumeFilter === 'year' ? 'MMM' : 'dd/MM', { locale: ptBR });
          if (!groupedData[dateKey]) {
            groupedData[dateKey] = { volume: 0, count: 0 };
          }
          groupedData[dateKey].volume += parseFloat(order.amount) || 0;
          groupedData[dateKey].count += 1;
        });

        const chartData = Object.entries(groupedData).map(([date, data]) => ({
          date,
          volume: data.volume,
          count: data.count
        }));

        setVolumeData(chartData);
      }
    } catch (error) {
      console.error('Error loading volume data:', error);
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

      // ✅ Buscar contagens de forma mais robusta
      const [completedRes, pendingRes, failedRes, expiredRes, cancelledRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .neq('payment_method', 'member_access')
          .eq('status', 'completed'),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .neq('payment_method', 'member_access')
          .eq('status', 'pending'),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .neq('payment_method', 'member_access')
          .eq('status', 'failed'),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .neq('payment_method', 'member_access')
          .eq('status', 'expired'),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .neq('payment_method', 'member_access')
          .eq('status', 'cancelled')
      ]);
      
      const statusCounts = {
        success: completedRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        failed: failedRes.count ?? 0,
        expired: expiredRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0
      };
      
      console.log('📊 Status counts carregados:', statusCounts, {
        completedRes: completedRes.count,
        pendingRes: pendingRes.count,
        failedRes: failedRes.count,
        expiredRes: expiredRes.count,
        cancelledRes: cancelledRes.count
      });
      setOrderStats(statusCounts);
    } catch (error) {
      console.error('Error loading status data:', error);
    } finally {
      setStatusLoading(false);
    }
  }, [statusFilter]);


  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { startDate, endDate } = getGlobalDateRange();
      
      const { data: allWithdrawals } = await supabase
        .rpc('get_all_withdrawal_requests_for_admin');

      const pendingWithdrawals = allWithdrawals?.filter(w => w.status === 'pendente').length || 0;
      const totalPaidOut = allWithdrawals
        ?.filter(w => w.status === 'aprovado')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Build queries with date filter
      let ordersQuery = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      let usersQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      let productsQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (startDate) {
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
        ordersQuery = ordersQuery.lte('created_at', endDate.toISOString());
        
        usersQuery = usersQuery.gte('created_at', startDate.toISOString());
        usersQuery = usersQuery.lte('created_at', endDate.toISOString());
        
        productsQuery = productsQuery.gte('created_at', startDate.toISOString());
        productsQuery = productsQuery.lte('created_at', endDate.toISOString());
      }

      const [usersRes, productsRes, ordersRes] = await Promise.all([
        usersQuery,
        productsQuery,
        ordersQuery
      ]);

      // Fetch revenue - use RPC for all time, manual query for filtered periods
      let totalRevenue = 0;
      
      if (startDate) {
        // For filtered periods, fetch with pagination to get all records
        let allOrders: { amount: string }[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: ordersPage } = await supabase
            .from('orders')
            .select('amount')
            .eq('status', 'completed')
            .neq('payment_method', 'member_access')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (ordersPage && ordersPage.length > 0) {
            allOrders = [...allOrders, ...ordersPage];
            hasMore = ordersPage.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        totalRevenue = allOrders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0);
      } else {
        // For all time, use RPC to get total from database directly
        const { data: revenueData } = await supabase
          .rpc('get_total_revenue_stats' as any);
        totalRevenue = (revenueData as any)?.[0]?.total_revenue || 0;
      }
      
      const companyCommission = totalRevenue * 0.0899;
      const sellersEarnings = totalRevenue * 0.9101;

      setCompanyFinancials({ totalRevenue, companyCommission, sellersEarnings });

      setStats({
        total_users: usersRes.count || 0,
        total_products: productsRes.count || 0,
        total_transactions: ordersRes.count || 0,
        pending_withdrawals: pendingWithdrawals,
        total_paid_out: totalPaidOut
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      setStats({
        total_users: 0,
        total_products: 0,
        total_transactions: 0,
        pending_withdrawals: 0,
        total_paid_out: 0
      });
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [getGlobalDateRange]);

  // Effects after all callbacks are defined
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
      <AdminLayout title="Painel de Controlo" description="Carregando dados...">
        <AdminPageSkeleton variant="dashboard" />
      </AdminLayout>
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
    <AdminLayout 
      title="Painel de Controlo" 
      description="Visão geral da aplicação, indicadores e resumos de transações."
    >
      <SEO 
        title="Kambafy Admin – Dashboard" 
        description="Dashboard administrativo com métricas e relatórios" 
        canonical="https://kambafy.com/admin" 
        noIndex 
      />


      {/* Global Time Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          <span className="text-sm font-medium text-[hsl(var(--admin-text))]">Filtrar por período:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todo o período' },
            { value: 'today', label: 'Hoje' },
            { value: 'yesterday', label: 'Ontem' },
            { value: '7days', label: '7 dias' },
            { value: '30days', label: '30 dias' },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={globalTimeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGlobalTimeFilter(filter.value)}
              className={cn(
                "transition-all duration-200",
                globalTimeFilter === filter.value && "shadow-md"
              )}
            >
              {filter.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={globalTimeFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "transition-all duration-200",
                  globalTimeFilter === 'custom' && "shadow-md"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {globalTimeFilter === 'custom' && customDateRange?.from 
                  ? `${format(customDateRange.from, 'dd/MM', { locale: ptBR })}${customDateRange.to ? ` - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}` : ''}`
                  : 'Personalizado'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  setCustomDateRange(range);
                  if (range?.from) {
                    setGlobalTimeFilter('custom');
                  }
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        {statsLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--admin-primary))]" />
        )}
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total de Transações"
          value={stats?.total_transactions?.toLocaleString('pt-BR') || '0'}
          subtitle={getFilterLabel()}
          variant="primary"
          icon={<ArrowUpRight className="h-4 w-4 text-white" />}
        />
        <MetricCard
          title="Montante Cobrado"
          value={companyFinancials?.totalRevenue?.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'AOA',
            notation: 'compact',
            maximumFractionDigits: 2
          }) || '0 AOA'}
          subtitle={getFilterLabel()}
          icon={<DollarSign className="h-4 w-4 text-[hsl(var(--admin-warning))]" />}
        />
        <MetricCard
          title="Total de Usuários"
          value={stats?.total_users?.toLocaleString('pt-BR') || '0'}
          subtitle={globalTimeFilter === 'all' ? 'Usuários na plataforma' : `Novos usuários • ${getFilterLabel()}`}
          icon={<Users className="h-4 w-4 text-[hsl(var(--admin-primary))]" />}
        />
        <MetricCard
          title="Produtos Cadastrados"
          value={stats?.total_products?.toLocaleString('pt-BR') || '0'}
          subtitle={globalTimeFilter === 'all' ? 'Produtos na plataforma' : `Novos produtos • ${getFilterLabel()}`}
          icon={<Package className="h-4 w-4 text-purple-500" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Volume Chart */}
        <ChartCard 
          title="Volume de transações"
          filter={
            <Select value={volumeFilter} onValueChange={setVolumeFilter}>
              <SelectTrigger className="w-36 h-9 bg-white border-[hsl(var(--admin-border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Últimos 7 Dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-64">
            {volumeLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--admin-primary))]" />
              </div>
            ) : volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }}
                    axisLine={{ stroke: 'hsl(220 13% 91%)' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }}
                    axisLine={{ stroke: 'hsl(220 13% 91%)' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString('pt-BR', { style: 'currency', currency: 'AOA' }),
                      'Volume'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="volume" 
                    fill="hsl(var(--admin-primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[hsl(var(--admin-text-secondary))]">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Sem dados para o período</p>
                </div>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Status Pie Chart */}
        <ChartCard 
          title="Estados"
          filter={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 bg-white border-[hsl(var(--admin-border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-72">
            {statusLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--admin-primary))]" />
              </div>
            ) : totalOrders > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-sm font-semibold"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Transações']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-[hsl(var(--admin-text-secondary))]">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[hsl(var(--admin-text-secondary))]">
                <p>Sem dados de transações para o período</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Financial Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Receita Total</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">{getFilterLabel()}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">
            {companyFinancials?.totalRevenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'AOA' }) || 'KZ 0'}
          </p>
        </div>

        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Comissão Plataforma</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">8,99% sobre vendas • {getFilterLabel()}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">
            {companyFinancials?.companyCommission?.toLocaleString('pt-BR', { style: 'currency', currency: 'AOA' }) || 'KZ 0'}
          </p>
        </div>

        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Ganhos Vendedores</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">91,01% repassado • {getFilterLabel()}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">
            {companyFinancials?.sellersEarnings?.toLocaleString('pt-BR', { style: 'currency', currency: 'AOA' }) || 'KZ 0'}
          </p>
        </div>
      </div>

      {/* Withdrawals Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Saques Pendentes</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Aguardando aprovação</p>
            </div>
            {stats && stats.pending_withdrawals > 0 && (
              <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                {stats.pending_withdrawals}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-[hsl(var(--admin-text))]">
            {stats?.pending_withdrawals || 0}
          </p>
        </div>

        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Total Pago</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Saques aprovados</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-[hsl(var(--admin-text))]">
            {stats?.total_paid_out?.toLocaleString('pt-BR', { style: 'currency', currency: 'AOA' }) || 'KZ 0'}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
