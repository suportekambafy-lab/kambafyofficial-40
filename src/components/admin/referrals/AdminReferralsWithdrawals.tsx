import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet } from 'lucide-react';

interface Commission {
  id: string;
  referral_id: string;
  order_id: string;
  sale_net_amount: number;
  commission_amount: number;
  currency: string;
  status: string;
  created_at: string;
  referral?: {
    referrer_id: string;
    referrer_profile?: {
      full_name: string;
      email: string;
    };
  };
}

export function AdminReferralsWithdrawals() {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['admin-referral-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select(`
          *,
          seller_referrals!inner (
            referrer_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar perfis dos referrers
      const referrerIds = [...new Set(data.map((c: any) => c.seller_referrals?.referrer_id).filter(Boolean))];
      
      let profiles: any[] = [];
      if (referrerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', referrerIds);
        profiles = profileData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return data.map((c: any) => ({
        ...c,
        referral: {
          referrer_id: c.seller_referrals?.referrer_id,
          referrer_profile: profileMap.get(c.seller_referrals?.referrer_id),
        },
      })) as Commission[];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pendente</Badge>;
      case 'credited':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Creditado</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  // Calcular totais
  const totalPending = commissions?.filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
  const totalCredited = commissions?.filter(c => c.status === 'credited')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totalPending, 'KZ')}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCredited, 'KZ')}
            </div>
            <p className="text-xs text-muted-foreground">
              Total já creditado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Todas as comissões geradas pelo programa de indicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comissão registrada ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Valor da Venda</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {commission.referral?.referrer_profile?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {commission.referral?.referrer_profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(commission.sale_net_amount), commission.currency)}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(Number(commission.commission_amount), commission.currency)}
                    </TableCell>
                    <TableCell>{commission.currency}</TableCell>
                    <TableCell>{getStatusBadge(commission.status)}</TableCell>
                    <TableCell>
                      {format(new Date(commission.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
