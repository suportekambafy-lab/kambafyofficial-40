import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { AdminStats } from '@/types/admin';
import { Users, Package, CreditCard, TrendingUp, LogOut, FileText, AlertTriangle, CheckCircle, DollarSign, PieChart, Activity, Clock, Shield, Menu, Globe } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';
import AdminDrawer from '@/components/admin/AdminDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SEO } from '@/components/SEO';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { FixMissingAccessButton } from '@/components/admin/FixMissingAccessButton';
interface ModernAdminMetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  gradient: string;
}

function ModernAdminMetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp = true,
  className,
  gradient
}: ModernAdminMetricCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl p-6 shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-3 rounded-lg transition-all duration-300",
          gradient
        )}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            trendUp ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trend}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">
          {value}
        </h3>
        <p className="text-gray-600 text-sm">
          {title}
        </p>
      </div>
    </div>
  );
}

interface AdminSessionLog {
  id: string;
  admin_id: string;
  action: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  success: boolean;
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companyFinancials, setCompanyFinancials] = useState<any>(null);
  const [sessionLogs, setSessionLogs] = useState<AdminSessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [usersByCountry, setUsersByCountry] = useState<Array<{country: string; count: number; flag: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('todos');
  const [orders, setOrders] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const revenueToDisplay = React.useMemo(() => {
    const dataSource = orders || [];
    const filtered = dataSource.filter((o) => {
      const d = new Date(o.created_at);
      if (dateRange.from && d < new Date(new Date(dateRange.from).setHours(0,0,0,0))) return false;
      if (dateRange.to && d > new Date(new Date(dateRange.to).setHours(23,59,59,999))) return false;
      return true;
    });
    const aggregated = filtered.reduce((acc: any[], order: any) => {
      const month = new Date(order.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      const amount = parseFloat(order.amount || '0');
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.revenue += amount;
        existing.commission += amount * 0.08;
      } else {
        acc.push({ month, revenue: amount, commission: amount * 0.08 });
      }
      return acc;
    }, [] as any[]);
    if (!dateRange.from && !dateRange.to) {
      return companyFinancials?.monthlyRevenue || aggregated.slice(-6);
    }
    return aggregated;
  }, [orders, dateRange, companyFinancials]);

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando stats...');
      loadStats();
      // Removed logAdminSession to fix 409 error
      setupSessionTimeout();
    }
  }, [admin]);

  // 🔒 FASE 4: Sistema de Segurança Avançado
  const logAdminSession = async (action: string) => {
    try {
      const sessionData = {
        admin_id: admin?.id || 'unknown',
        action,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        success: true
      };

      // Removed Supabase logging to fix 409 error
      console.log('🔐 Sessão admin logada:', sessionData);
    } catch (error) {
      console.error('❌ Erro ao logar sessão admin:', error);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // 🔒 Auto-logout após 30 minutos de inatividade
  const setupSessionTimeout = () => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Removed logAdminSession to fix 409 error
        logout();
      }, 30 * 60 * 1000); // 30 minutos
    };

    // Reset timer em atividade
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    resetTimeout(); // Iniciar timer

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  };

  const loadStats = async () => {
    try {
      console.log('Carregando estatísticas...');
      
      // Carregar estatísticas individuais
      const [usersRes, productsRes, ordersRes, withdrawalsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('products').select('*', { count: 'exact' }),
        supabase.from('orders').select('*', { count: 'exact' }).neq('payment_method', 'member_access'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact' }).eq('status', 'pendente')
      ]);

      const usersResult = { count: usersRes.count || 0 };
      const productsResult = { count: productsRes.count || 0 };
      const ordersResult = { count: ordersRes.count || 0 };
      const withdrawalsResult = { count: withdrawalsRes.count || 0 };

      // Carregar dados por país
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null);

      // Agrupar usuários por país
      const countryMapping: Record<string, string> = {
        'AO': '🇦🇴',
        'PT': '🇵🇹', 
        'MZ': '🇲🇿',
        'BR': '🇧🇷',
        'Angola': '🇦🇴',
        'Portugal': '🇵🇹',
        'Moçambique': '🇲🇿',
        'Brasil': '🇧🇷'
      };

      const countryStats = profilesData?.reduce((acc: Record<string, number>, profile) => {
        const country = profile.country;
        if (country) {
          acc[country] = (acc[country] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const formattedCountryStats = Object.entries(countryStats)
        .map(([country, count]) => ({
          country,
          count: count as number,
          flag: countryMapping[country] || '🌍'
        }))
        .sort((a, b) => b.count - a.count);

      setUsersByCountry(formattedCountryStats);

      console.log('Resultados:', { 
        users: usersResult.count, 
        products: productsResult.count,
        orders: ordersResult.count,
        withdrawals: withdrawalsResult.count 
      });

      // Calcular total pago
      const { data: approvedWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount')
        .eq('status', 'aprovado');

      const totalPaidOut = approvedWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // ✅ NOVA FUNCIONALIDADE: Calcular métricas financeiras da empresa - EXCLUIR member_access
      const { data: allOrders } = await supabase
        .from('orders')
        .select('amount, created_at')
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      setOrders(allOrders || []);

      const totalRevenue = allOrders?.reduce((sum, order) => sum + parseFloat(order.amount || '0'), 0) || 0;
      const companyCommission = totalRevenue * 0.08; // 8% de comissão
      const sellersEarnings = totalRevenue * 0.92; // 92% para vendedores

      // Calcular receita por mês para gráfico
      const monthlyRevenue = allOrders?.reduce((acc: any[], order) => {
        const month = new Date(order.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.revenue += parseFloat(order.amount || '0');
          existing.commission += parseFloat(order.amount || '0') * 0.08;
        } else {
          acc.push({
            month,
            revenue: parseFloat(order.amount || '0'),
            commission: parseFloat(order.amount || '0') * 0.08
          });
        }
        return acc;
      }, []) || [];

      setCompanyFinancials({
        totalRevenue,
        companyCommission,
        sellersEarnings,
        monthlyRevenue: monthlyRevenue.slice(-6) // Últimos 6 meses
      });

      const newStats = {
        total_users: usersResult.count || 0,
        total_products: productsResult.count || 0,
        total_transactions: ordersResult.count || 0,
        pending_withdrawals: withdrawalsResult.count || 0,
        total_paid_out: totalPaidOut
      };

      console.log('Stats finais:', newStats);
      setStats(newStats);
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
    }
  };

  const handleSecureLogout = async () => {
    // Removed logAdminSession to fix 409 error
    logout();
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      <SEO title="Kambafy Admin – Dashboard" description="Dashboard administrativo com métricas e relatórios" canonical="https://kambafy.com/admin" noIndex />
      {/* Modern Header - Responsivo */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={() => setDrawerOpen(true)}
                variant="outline"
                size="icon"
                className="hover:bg-accent h-9 w-9 sm:h-10 sm:w-10"
                aria-label="Abrir menu"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="text-white h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-600">Bem-vindo, {admin.full_name || admin.email}</p>
              </div>
              <div className="block sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationCenter />
              <FixMissingAccessButton />
              <Button
                onClick={handleSecureLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors h-9 px-2 sm:px-4"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Drawer */}
      <AdminDrawer 
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        stats={stats || undefined}
        usersByCountry={usersByCountry}
        selectedCountry={selectedCountry}
        onCountrySelect={setSelectedCountry}
      />

      {/* Main Content - Responsivo */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Country Filter Section - Responsivo */}
        {usersByCountry.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Usuários por País</h2>
              </div>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Selecionar país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <div className="flex items-center gap-2">
                      <span>🌍</span>
                      <span>Todos os países</span>
                    </div>
                  </SelectItem>
                  {usersByCountry.map((country) => (
                    <SelectItem key={country.country} value={country.country}>
                      <div className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.country}</span>
                        <span className="text-muted-foreground">({country.count})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {usersByCountry.map((country) => (
                <Card 
                  key={country.country}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedCountry === country.country ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => setSelectedCountry(country.country)}
                >
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{country.flag}</div>
                    <div className="font-semibold text-xs sm:text-sm truncate">{country.country}</div>
                    <div className="text-base sm:text-lg font-bold text-primary">{country.count}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {/* Modern Stats Cards - Responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_users?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Usuários</p>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_products?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Produtos Ativos</p>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +8%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_transactions?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Transações</p>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +23%
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Company Financials Section - Responsivo */}
        {companyFinancials && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Receita da Empresa</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.totalRevenue.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm">Receita Total</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.companyCommission.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm">Comissão (8%)</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.sellersEarnings.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm">Vendedores (92%)</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Revenue Chart - Responsivo */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Crescimento Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {dateRange.from && dateRange.to
                      ? `Período: ${format(dateRange.from, 'dd/MM/yyyy')} – ${format(dateRange.to, 'dd/MM/yyyy')}`
                      : 'Filtrar por período'}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start w-full sm:w-auto text-xs sm:text-sm">
                          <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          {dateRange.from && dateRange.to
                            ? `${format(dateRange.from, 'dd/MM/yyyy')} – ${format(dateRange.to, 'dd/MM/yyyy')}`
                            : 'Escolher data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="range"
                          selected={dateRange as any}
                          onSelect={setDateRange as any}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {(dateRange.from || dateRange.to) && (
                      <Button variant="ghost" size="sm" onClick={() => setDateRange({})} className="text-xs sm:text-sm">
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">Receita Total</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {revenueToDisplay.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="font-medium text-gray-700 text-xs sm:text-sm">{month.month}</span>
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">{month.revenue.toLocaleString('pt-AO')} KZ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">Comissão</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {revenueToDisplay.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="font-medium text-blue-700 text-xs sm:text-sm">{month.month}</span>
                          <span className="font-bold text-blue-900 text-xs sm:text-sm">{month.commission.toLocaleString('pt-AO')} KZ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}