import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Clock, TrendingUp, Wallet, CalendarDays, MousePointerClick } from 'lucide-react';
import { ReferralStats } from '@/hooks/useSellerReferrals';

interface ReferralStatsCardsProps {
  stats: ReferralStats;
}

export function ReferralStatsCards({ stats }: ReferralStatsCardsProps) {
  const formatCurrency = (amount: number, currency: string = 'KZ') => {
    if (currency === 'EUR') {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    }
    return `${amount.toLocaleString('pt-AO')} ${currency}`;
  };

  // Formatar total por moeda
  const formatEarningsByCurrency = () => {
    const entries = Object.entries(stats.earningsByCurrency);
    if (entries.length === 0) return '0 KZ';
    
    return entries.map(([currency, amount]) => formatCurrency(amount, currency)).join(' | ');
  };

  const cards = [
    {
      title: 'Cliques no Link',
      value: stats.linkClicks,
      icon: MousePointerClick,
      description: `${stats.linkClicksThisMonth} este mês`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Indicados',
      value: stats.totalReferred,
      icon: Users,
      description: 'Vendedores que você indicou',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Indicados Ativos',
      value: stats.activeReferred,
      icon: UserCheck,
      description: 'Já realizaram vendas',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Aguardando Venda',
      value: stats.pendingReferred,
      icon: Clock,
      description: 'Ainda não venderam',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Total Ganho',
      value: formatEarningsByCurrency(),
      icon: Wallet,
      description: 'Comissões de indicação',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      isAmount: true,
    },
    {
      title: 'Este Mês',
      value: formatCurrency(stats.earningsThisMonth),
      icon: TrendingUp,
      description: 'Ganhos no mês atual',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isAmount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {card.title}
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.isAmount ? 'text-lg' : ''}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
