import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { SellerReferral, ReferralCommission } from '@/hooks/useSellerReferrals';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralsListProps {
  referrals: SellerReferral[];
  commissions: ReferralCommission[];
  onChooseReward: (referralId: string, option: 'long_term' | 'short_term') => void;
  isChoosing: boolean;
}

export function ReferralsList({ referrals, commissions, onChooseReward, isChoosing }: ReferralsListProps) {
  const [selectedReferral, setSelectedReferral] = useState<SellerReferral | null>(null);
  const [showRewardDialog, setShowRewardDialog] = useState(false);

  const getStatusBadge = (referral: SellerReferral) => {
    // Se status é 'pending', verificar o motivo
    if (referral.status === 'pending') {
      if (!referral.identity_verification_status) {
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Aguarda Verificação
          </Badge>
        );
      }
      if (referral.identity_verification_status === 'pendente') {
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Verificação Pendente
          </Badge>
        );
      }
      if (referral.identity_verification_status === 'rejeitado') {
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            Verificação Rejeitada
          </Badge>
        );
      }
    }
    
    switch (referral.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
      case 'awaiting_first_sale':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Aguarda 1ª Venda</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pendente</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const getRewardLabel = (referral: SellerReferral) => {
    // Só permite escolher opção se status é 'awaiting_first_sale' e ainda não escolheu
    if (!referral.reward_option) {
      // Se ainda está pending (aguardando KYC), não mostrar botão
      if (referral.status === 'pending') {
        return <span className="text-xs text-muted-foreground">Aguarda verificação</span>;
      }
      
      // Se está awaiting_first_sale ou active, pode escolher
      if (referral.status === 'awaiting_first_sale' || referral.status === 'active') {
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setSelectedReferral(referral);
              setShowRewardDialog(true);
            }}
          >
            Escolher Opção
          </Button>
        );
      }
      
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    
    if (referral.reward_option === 'long_term') {
      return <span className="text-sm">1,5% / 12 meses</span>;
    }
    return <span className="text-sm">2% / 6 meses</span>;
  };

  const getTimeRemaining = (referral: SellerReferral) => {
    if (!referral.expires_at || referral.status !== 'active') return '-';
    
    const expiresAt = new Date(referral.expires_at);
    const daysRemaining = differenceInDays(expiresAt, new Date());
    
    if (daysRemaining < 0) return 'Expirado';
    if (daysRemaining === 0) return 'Último dia';
    if (daysRemaining <= 30) return `${daysRemaining} dias`;
    
    const monthsRemaining = Math.floor(daysRemaining / 30);
    return `~${monthsRemaining} mês${monthsRemaining > 1 ? 'es' : ''}`;
  };

  const getTotalEarningsForReferral = (referralId: string) => {
    const referralCommissions = commissions.filter(c => c.referral_id === referralId);
    if (referralCommissions.length === 0) return '-';
    
    const byCurrency = referralCommissions.reduce((acc, c) => {
      acc[c.currency] = (acc[c.currency] || 0) + Number(c.commission_amount);
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(byCurrency)
      .map(([currency, amount]) => `${amount.toLocaleString('pt-AO')} ${currency}`)
      .join(' | ');
  };

  const handleChooseReward = (option: 'long_term' | 'short_term') => {
    if (!selectedReferral) return;
    onChooseReward(selectedReferral.id, option);
    setShowRewardDialog(false);
    setSelectedReferral(null);
  };

  // Verificar se há indicações pendentes sem opção escolhida
  const pendingChoice = referrals.find(r => r.status === 'pending' && !r.reward_option);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Seus Indicados
          </CardTitle>
          <CardDescription>
            Lista de vendedores que você indicou para a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingChoice && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-500">Ação necessária</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {referrals.filter(r => !r.reward_option).length} indicação(ões) aguardando escolha de opção de recompensa.
                </p>
              </div>
            </div>
          )}

          {referrals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não indicou nenhum vendedor.</p>
              <p className="text-sm mt-1">Compartilhe seu link para começar a ganhar!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opção</TableHead>
                    <TableHead>Primeira Venda</TableHead>
                    <TableHead>Tempo Restante</TableHead>
                    <TableHead className="text-right">Total Ganho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.referred_profile?.full_name || 'Vendedor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Indicado {formatDistanceToNow(new Date(referral.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral)}</TableCell>
                      <TableCell>{getRewardLabel(referral)}</TableCell>
                      <TableCell>
                        {referral.first_sale_at 
                          ? format(new Date(referral.first_sale_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <span className={referral.status === 'active' ? 'text-green-500' : ''}>
                          {getTimeRemaining(referral)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {getTotalEarningsForReferral(referral.id)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para escolher opção de recompensa */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolha sua Opção de Recompensa</DialogTitle>
            <DialogDescription>
              Esta escolha é definitiva e não poderá ser alterada depois.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Opção A - Longo Prazo */}
            <button
              onClick={() => handleChooseReward('long_term')}
              disabled={isChoosing}
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Opção A - Longo Prazo</h4>
                  <p className="text-2xl font-bold text-primary my-2">1,5%</p>
                  <p className="text-sm text-muted-foreground">
                    das vendas do indicado por <strong>12 meses</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ideal para indicados com potencial de crescimento sustentável
                  </p>
                </div>
              </div>
            </button>

            {/* Opção B - Curto Prazo */}
            <button
              onClick={() => handleChooseReward('short_term')}
              disabled={isChoosing}
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <CheckCircle2 className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Opção B - Curto Prazo</h4>
                  <p className="text-2xl font-bold text-primary my-2">2%</p>
                  <p className="text-sm text-muted-foreground">
                    das vendas do indicado por <strong>6 meses</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ideal para indicados com alto volume de vendas inicial
                  </p>
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardDialog(false)}>
              Decidir Depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
