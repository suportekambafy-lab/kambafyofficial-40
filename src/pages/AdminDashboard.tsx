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

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando stats...');
      loadStats();
      logAdminSession('dashboard_access');
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

      // Log no Supabase
      await supabase.from('admin_logs').insert({
        admin_id: sessionData.admin_id,
        action: sessionData.action,
        target_type: 'session',
        details: {
          ip_address: sessionData.ip_address,
          user_agent: sessionData.user_agent,
          timestamp: sessionData.timestamp
        }
      });

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
        logAdminSession('session_timeout');
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
      
      // Primeiro tenta carregar da tabela agregada admin_dashboard_stats
      let usersResult: { count: number } = { count: 0 };
      let productsResult: { count: number } = { count: 0 };
      let ordersResult: { count: number } = { count: 0 };
      let withdrawalsResult: { count: number } = { count: 0 };

      const { data: dashboardRow, error: dashboardError } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .maybeSingle();

      if (dashboardRow && !dashboardError) {
        usersResult.count = Number(dashboardRow.total_users) || 0;
        productsResult.count = Number(dashboardRow.total_products) || 0;
        ordersResult.count = Number(dashboardRow.total_transactions) || 0;
        withdrawalsResult.count = Number(dashboardRow.pending_withdrawals) || 0;
      } else {
        const [usersRes, productsRes, ordersRes, withdrawalsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact' }),
          supabase.from('products').select('*', { count: 'exact' }),
          supabase.from('orders').select('*', { count: 'exact' }),
          supabase.from('withdrawal_requests').select('*', { count: 'exact' }).eq('status', 'pendente')
        ]);

        usersResult.count = usersRes.count || 0;
        productsResult.count = productsRes.count || 0;
        ordersResult.count = ordersRes.count || 0;
        withdrawalsResult.count = withdrawalsRes.count || 0;
      }

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

      // ✅ NOVA FUNCIONALIDADE: Calcular métricas financeiras da empresa
      const { data: allOrders } = await supabase
        .from('orders')
        .select('amount, created_at')
        .eq('status', 'completed');

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
    await logAdminSession('logout');
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
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-gray-600">Bem-vindo, {admin.full_name || admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <Button 
                onClick={() => setDrawerOpen(true)}
                variant="outline"
                className="flex items-center gap-2 hover:bg-accent"
              >
                <Menu className="h-4 w-4" />
                Menu
              </Button>
              <Button 
                onClick={handleSecureLogout}
                variant="outline"
                className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Country Filter Section */}
        {usersByCountry.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Usuários por País</h2>
              </div>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-48">
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {usersByCountry.map((country) => (
                <Card 
                  key={country.country}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedCountry === country.country ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => setSelectedCountry(country.country)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{country.flag}</div>
                    <div className="font-semibold text-sm">{country.country}</div>
                    <div className="text-lg font-bold text-primary">{country.count}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_users?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-sm">Total de Usuários</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_products?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-sm">Produtos Ativos</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +8%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats?.total_transactions?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-sm">Transações</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +23%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats?.pending_withdrawals?.toString() || '0'}
                  </h3>
                  <p className="text-gray-600 text-sm">Saques Pendentes</p>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                  stats?.pending_withdrawals ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"
                }`}>
                  <TrendingUp className={`w-3 h-3 ${!stats?.pending_withdrawals ? "" : "rotate-180"}`} />
                  {stats?.pending_withdrawals ? "Ação necessária" : "Tudo em dia"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {`${(stats?.total_paid_out || 0).toLocaleString('pt-AO')} KZ`}
                  </h3>
                  <p className="text-gray-600 text-sm">Total Pago</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <TrendingUp className="w-3 h-3" />
                  +15%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Financials Section - Modern Style */}
        {companyFinancials && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Receita da Empresa</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.totalRevenue.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-sm">Receita Total</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.companyCommission.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-sm">Comissão da Empresa (8%)</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {`${companyFinancials.sellersEarnings.toLocaleString('pt-AO')} KZ`}
                      </h3>
                      <p className="text-gray-600 text-sm">Receita dos Vendedores (92%)</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
                      <TrendingUp className="w-3 h-3" />
                      +18%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Revenue Chart - Modern Style */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Crescimento Mensal da Receita
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-4">Receita Total por Mês (Últimos 6 meses)</h4>
                    <div className="space-y-3">
                      {companyFinancials.monthlyRevenue.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="font-medium text-gray-700">{month.month}</span>
                          <span className="font-bold text-gray-900">{month.revenue.toLocaleString('pt-AO')} KZ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-4">Comissão da Empresa por Mês</h4>
                    <div className="space-y-3">
                      {companyFinancials.monthlyRevenue.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="font-medium text-blue-700">{month.month}</span>
                          <span className="font-bold text-blue-900">{month.commission.toLocaleString('pt-AO')} KZ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modern Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white border border-gray-200 hover:scale-[1.02]" 
            onClick={() => navigate('/admin/withdrawals')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                {stats && stats.pending_withdrawals > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full animate-pulse">
                      {stats.pending_withdrawals} pendentes
                    </span>
                    <span className="text-xs text-orange-600 font-medium mt-1 animate-bounce">
                      🔔 Novo!
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Gerenciar Saques</h3>
              <p className="text-gray-600 mb-4 text-sm">Aprovar ou rejeitar solicitações de saque dos vendedores</p>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-0 shadow-sm">
                Ver Saques
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white border border-gray-200 hover:scale-[1.02]" 
            onClick={() => navigate('/admin/products')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Banir Produtos</h3>
              <p className="text-gray-600 mb-4 text-sm">Gerenciar produtos e banir quando necessário</p>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-sm">
                Ver Produtos
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white border border-gray-200 hover:scale-[1.02]" 
            onClick={() => navigate('/admin/seller-reports')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Relatórios de Vendedores</h3>
              <p className="text-gray-600 mb-4 text-sm">Análise detalhada de performance e ranking dos vendedores</p>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-0 shadow-sm">
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white border border-gray-200 hover:scale-[1.02]" 
            onClick={() => navigate('/admin/identity')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Verificação de Identidade</h3>
              <p className="text-gray-600 mb-4 text-sm">Aprovar ou reprovar verificações de identidade dos vendedores</p>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-sm">
                Gerenciar Identidades
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white border border-gray-200 hover:scale-[1.02]" 
            onClick={() => navigate('/admin/logs')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Logs de Segurança</h3>
              <p className="text-gray-600 mb-4 text-sm">Ver histórico completo de ações administrativas e sessões</p>
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0 shadow-sm">
                Ver Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}