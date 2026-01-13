import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Clock, DollarSign, TrendingUp, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminReferralsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-referrals-stats'],
    queryFn: async () => {
      // Buscar estatísticas de candidaturas
      const { data: applications, error: appError } = await supabase
        .from('referral_program_applications')
        .select('status');
      
      if (appError) throw appError;

      // Buscar estatísticas de indicações
      const { data: referrals, error: refError } = await supabase
        .from('seller_referrals')
        .select('status');
      
      if (refError) throw refError;

      // Buscar comissões
      const { data: commissions, error: comError } = await supabase
        .from('referral_commissions')
        .select('commission_amount, status, currency');
      
      if (comError) throw comError;

      const pendingApps = applications?.filter(a => a.status === 'pending').length || 0;
      const approvedApps = applications?.filter(a => a.status === 'approved').length || 0;
      const rejectedApps = applications?.filter(a => a.status === 'rejected').length || 0;
      
      const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
      const totalReferrals = referrals?.length || 0;

      const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const pendingCommissions = commissions?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      return {
        totalApplications: applications?.length || 0,
        pendingApplications: pendingApps,
        approvedApplications: approvedApps,
        rejectedApplications: rejectedApps,
        totalReferrals,
        activeReferrals,
        totalCommissions,
        pendingCommissions,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Candidaturas',
      value: stats?.totalApplications || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Candidaturas Pendentes',
      value: stats?.pendingApplications || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Candidaturas Aprovadas',
      value: stats?.approvedApplications || 0,
      icon: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Candidaturas Rejeitadas',
      value: stats?.rejectedApplications || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Total de Indicações',
      value: stats?.totalReferrals || 0,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Indicações Ativas',
      value: stats?.activeReferrals || 0,
      icon: UserCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Total em Comissões',
      value: `${(stats?.totalCommissions || 0).toLocaleString('pt-AO')} KZ`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      title: 'Comissões Pendentes',
      value: `${(stats?.pendingCommissions || 0).toLocaleString('pt-AO')} KZ`,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do Programa</CardTitle>
          <CardDescription>
            Visão geral do programa de indicação de vendedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              O programa "Indique e Ganhe" permite que vendedores aprovados indiquem novos vendedores 
              e recebam comissões sobre as vendas dos indicados.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Opções de Comissão</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>1,5% por 12 meses (Longo prazo)</li>
                  <li>2% por 6 meses (Curto prazo)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Fluxo do Programa</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Vendedor se candidata ao programa</li>
                  <li>Admin aprova e gera código único</li>
                  <li>Vendedor compartilha link de indicação</li>
                  <li>Comissões são geradas nas vendas</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
