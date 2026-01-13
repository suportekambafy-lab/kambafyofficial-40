import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Wallet, TrendingUp } from 'lucide-react';
import { ReferralCommission, SellerReferral } from '@/hooks/useSellerReferrals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommissionHistoryProps {
  commissions: ReferralCommission[];
  referrals: SellerReferral[];
}

export function CommissionHistory({ commissions, referrals }: CommissionHistoryProps) {
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'EUR') {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    }
    return `${Number(amount).toLocaleString('pt-AO')} ${currency}`;
  };

  const getReferralName = (referralId: string) => {
    const referral = referrals.find(r => r.id === referralId);
    return referral?.referred_profile?.full_name || 'Vendedor';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'credited':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Creditado</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
      default:
        return null;
    }
  };

  // Calcular totais por moeda
  const totalsByCurrency = commissions
    .filter(c => c.status === 'credited')
    .reduce((acc, c) => {
      acc[c.currency] = (acc[c.currency] || 0) + Number(c.commission_amount);
      return acc;
    }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Histórico de Comissões
        </CardTitle>
        <CardDescription>
          Todas as comissões recebidas por indicações
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Resumo de totais */}
        {Object.keys(totalsByCurrency).length > 0 && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Creditado</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(totalsByCurrency).map(([currency, amount]) => (
                <span key={currency} className="text-xl font-bold text-primary">
                  {formatCurrency(amount, currency)}
                </span>
              ))}
            </div>
          </div>
        )}

        {commissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma comissão registrada ainda.</p>
            <p className="text-sm mt-1">
              As comissões aparecem aqui quando seus indicados fazem vendas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Indicado</TableHead>
                  <TableHead className="text-right">Venda Líquida</TableHead>
                  <TableHead className="text-right">Sua Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getReferralName(commission.referral_id)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(commission.sale_net_amount, commission.currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(commission.commission_amount, commission.currency)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(commission.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
