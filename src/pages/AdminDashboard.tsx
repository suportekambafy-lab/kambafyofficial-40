import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { AdminStats } from '@/types/admin';
import { 
  Users, Package, ShoppingCart, LogOut, Shield, Menu, Globe, 
  ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp, Wallet,
  CheckCircle, AlertCircle, Clock, DollarSign
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';
import AdminDrawer from '@/components/admin/AdminDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEO } from '@/components/SEO';
import { ResendAllAccessButton } from '@/components/admin/ResendAllAccessButton';
import { RecalculateBalancesButton } from '@/components/admin/RecalculateBalancesButton';

interface ModernMetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; isUp: boolean };
  gradient: string;
  iconBg: string;
}

function ModernMetricCard({ 
  title, 
  subtitle,
  value, 
  icon, 
  trend,
  gradient,
  iconBg
}: ModernMetricCardProps) {
  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 animate-fade-in">
      {/* Background Gradient */}
      <div className={cn("absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500", gradient)} />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between mb-6">
          {/* Icon Container */}
          <div className={cn(
            "relative p-3.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-500",
            iconBg
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
            {icon}
          </div>
          
          {/* Trend Badge */}
          {trend && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm",
              trend.isUp 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-rose-50 text-rose-700 border border-rose-200"
            )}>
              {trend.isUp ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-foreground tracking-tight">
            {value}
          </h3>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground/90">
              {title}
            </p>
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companyFinancials, setCompanyFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [usersByCountry, setUsersByCountry] = useState<Array<{country: string; count: number; flag: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('todos');

  useEffect(() => {
    if (admin) {
      loadStats();
    }
  }, [admin]);

  const loadStats = async () => {
    try {
      // Buscar todas as withdrawal_requests usando a função admin
      const { data: allWithdrawals, error: withdrawalsError } = await supabase
        .rpc('get_all_withdrawal_requests_for_admin');

      if (withdrawalsError) {
        console.error('Error loading withdrawals:', withdrawalsError);
      }

      // Contar saques pendentes
      const pendingWithdrawals = allWithdrawals?.filter(w => w.status === 'pendente').length || 0;
      
      // Calcular total pago
      const totalPaidOut = allWithdrawals
        ?.filter(w => w.status === 'aprovado')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Dados por país
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null);

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

      // Buscar estatísticas básicas
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .neq('payment_method', 'member_access')
      ]);

      // Métricas financeiras
      const { data: allOrders } = await supabase
        .from('orders')
        .select('amount, created_at')
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      const totalRevenue = allOrders?.reduce((sum, order) => sum + parseFloat(order.amount || '0'), 0) || 0;
      const companyCommission = totalRevenue * 0.08;
      const sellersEarnings = totalRevenue * 0.92;

      setCompanyFinancials({
        totalRevenue,
        companyCommission,
        sellersEarnings
      });

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
    }
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-foreground/60 font-medium">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <SEO 
        title="Kambafy Admin – Dashboard" 
        description="Dashboard administrativo com métricas e relatórios" 
        canonical="https://kambafy.com/admin" 
        noIndex 
      />

      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-5">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setDrawerOpen(true)}
                variant="outline"
                size="icon"
                className="hover:bg-accent hover:scale-105 transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="text-white h-6 w-6" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Painel Administrativo</h1>
                  <p className="text-sm text-muted-foreground">
                    Bem-vindo, <span className="font-semibold text-foreground">{admin.full_name || admin.email}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
            <div className="flex gap-2">
              <ResendAllAccessButton />
              <RecalculateBalancesButton />
            </div>
            <RecalculateBalancesButton />
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all duration-300"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-foreground">Visão Geral do Sistema</h2>
          </div>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da plataforma em tempo real
          </p>
        </div>

        {/* Country Filter */}
        {usersByCountry.length > 0 && (
          <Card className="mb-8 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Globe className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Distribuição Global</h3>
                    <p className="text-sm text-muted-foreground">Usuários por país</p>
                  </div>
                </div>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full sm:w-56">
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
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {usersByCountry.map((country) => (
                  <div
                    key={country.country}
                    className={cn(
                      "group p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105",
                      selectedCountry === country.country 
                        ? "bg-indigo-50 border-indigo-500" 
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    )}
                    onClick={() => setSelectedCountry(country.country)}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-3xl mb-2">{country.flag}</div>
                      <div className="text-xs font-medium text-muted-foreground truncate">{country.country}</div>
                      <div className="text-xl font-bold text-foreground">{country.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ModernMetricCard
            title="Total de Usuários"
            subtitle="Usuários ativos na plataforma"
            value={stats?.total_users?.toLocaleString('pt-BR') || '0'}
            icon={<Users className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
            trend={{ value: '+12%', isUp: true }}
          />

          <ModernMetricCard
            title="Produtos Cadastrados"
            subtitle="Total de produtos na plataforma"
            value={stats?.total_products?.toLocaleString('pt-BR') || '0'}
            icon={<Package className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-pink-600"
            iconBg="bg-gradient-to-br from-purple-500 to-pink-600"
            trend={{ value: '+8%', isUp: true }}
          />

          <ModernMetricCard
            title="Transações Realizadas"
            subtitle="Total de vendas concluídas"
            value={stats?.total_transactions?.toLocaleString('pt-BR') || '0'}
            icon={<ShoppingCart className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            trend={{ value: '+24%', isUp: true }}
          />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <TrendingUp className="w-4 h-4" />
                  <span>+18%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Receita Total</p>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  {companyFinancials?.totalRevenue?.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'AOA' 
                  }) || 'KZ 0'}
                </h3>
                <CardDescription>Volume total processado</CardDescription>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Comissão da Plataforma</p>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  {companyFinancials?.companyCommission?.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'AOA' 
                  }) || 'KZ 0'}
                </h3>
                <CardDescription>8% sobre vendas (receita líquida)</CardDescription>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Ganhos dos Vendedores</p>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  {companyFinancials?.sellersEarnings?.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'AOA' 
                  }) || 'KZ 0'}
                </h3>
                <CardDescription>92% repassado aos vendedores</CardDescription>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawals Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="border-0 shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02]"
            onClick={() => setDrawerOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Saques Pendentes</h3>
                    <p className="text-sm text-muted-foreground">Aguardando aprovação</p>
                  </div>
                </div>
                {stats && stats.pending_withdrawals > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    {stats.pending_withdrawals}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.pending_withdrawals || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Clique para gerenciar solicitações
              </p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02]"
            onClick={() => setDrawerOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Total Pago</h3>
                    <p className="text-sm text-muted-foreground">Saques aprovados e processados</p>
                  </div>
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.total_paid_out?.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'AOA' 
                }) || 'KZ 0'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Clique para ver histórico completo
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
