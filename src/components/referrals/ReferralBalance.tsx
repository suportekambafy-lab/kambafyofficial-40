import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wallet, Clock, ArrowDownToLine, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReferralCommission } from '@/hooks/useSellerReferrals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ReferralBalanceProps {
  commissions: ReferralCommission[];
  onRequestWithdrawal?: (amount: number, currency: string) => Promise<void>;
  isRequestingWithdrawal?: boolean;
}

interface BalanceInfo {
  currency: string;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  pendingCommissions: Array<{
    amount: number;
    daysUntilAvailable: number;
    date: string;
  }>;
}

export function ReferralBalance({ 
  commissions, 
  onRequestWithdrawal,
  isRequestingWithdrawal = false 
}: ReferralBalanceProps) {
  const { toast } = useToast();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const DAYS_UNTIL_AVAILABLE = 30;

  // Calcular saldos por moeda
  const balancesByCurrency = React.useMemo(() => {
    const balances: Record<string, BalanceInfo> = {};
    const now = new Date();

    commissions.forEach(commission => {
      const currency = commission.currency || 'KZ';
      const amount = Number(commission.commission_amount);
      const createdAt = new Date(commission.created_at);
      const daysElapsed = differenceInDays(now, createdAt);
      const isAvailable = daysElapsed >= DAYS_UNTIL_AVAILABLE;
      const isPending = commission.status === 'pending';

      if (!balances[currency]) {
        balances[currency] = {
          currency,
          totalEarned: 0,
          availableBalance: 0,
          pendingBalance: 0,
          pendingCommissions: [],
        };
      }

      balances[currency].totalEarned += amount;

      if (isPending) {
        if (isAvailable) {
          balances[currency].availableBalance += amount;
        } else {
          balances[currency].pendingBalance += amount;
          balances[currency].pendingCommissions.push({
            amount,
            daysUntilAvailable: DAYS_UNTIL_AVAILABLE - daysElapsed,
            date: commission.created_at,
          });
        }
      }
    });

    return Object.values(balances);
  }, [commissions]);

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const handleOpenWithdrawDialog = (currency: string) => {
    const balance = balancesByCurrency.find(b => b.currency === currency);
    if (balance && balance.availableBalance > 0) {
      setSelectedCurrency(currency);
      setWithdrawAmount(balance.availableBalance.toString());
      setShowWithdrawDialog(true);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedCurrency || !withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount);
    const balance = balancesByCurrency.find(b => b.currency === selectedCurrency);
    
    if (!balance || amount <= 0 || amount > balance.availableBalance) {
      toast({
        title: 'Valor inválido',
        description: 'O valor deve ser maior que zero e menor ou igual ao saldo disponível.',
        variant: 'destructive',
      });
      return;
    }

    if (onRequestWithdrawal) {
      try {
        await onRequestWithdrawal(amount, selectedCurrency);
        setShowWithdrawDialog(false);
        setWithdrawAmount('');
        setSelectedCurrency(null);
        toast({
          title: 'Solicitação enviada!',
          description: 'Sua solicitação de saque foi enviada e será processada em breve.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível processar a solicitação de saque.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Em breve',
        description: 'O sistema de saques de indicação estará disponível em breve.',
      });
      setShowWithdrawDialog(false);
    }
  };

  const totalAvailable = balancesByCurrency.reduce((sum, b) => sum + b.availableBalance, 0);
  const totalPending = balancesByCurrency.reduce((sum, b) => sum + b.pendingBalance, 0);
  const hasAnyBalance = totalAvailable > 0 || totalPending > 0;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balancesByCurrency.length > 0 
                ? balancesByCurrency.map(b => formatCurrency(b.availableBalance, b.currency)).join(' | ')
                : '0 KZ'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pronto para saque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo em Espera</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {balancesByCurrency.length > 0 
                ? balancesByCurrency.map(b => formatCurrency(b.pendingBalance, b.currency)).join(' | ')
                : '0 KZ'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível após 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes por moeda */}
      {balancesByCurrency.map(balance => (
        <Card key={balance.currency}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Saldo em {balance.currency}
                </CardTitle>
                <CardDescription>
                  Total ganho: {formatCurrency(balance.totalEarned, balance.currency)}
                </CardDescription>
              </div>
              {balance.availableBalance > 0 && (
                <Button 
                  onClick={() => handleOpenWithdrawDialog(balance.currency)}
                  className="gap-2"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Solicitar Saque
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra de progresso visual */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disponível</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(balance.availableBalance, balance.currency)}
                </span>
              </div>
              <Progress 
                value={balance.totalEarned > 0 ? (balance.availableBalance / balance.totalEarned) * 100 : 0} 
                className="h-2"
              />
            </div>

            {/* Comissões pendentes (aguardando 30 dias) */}
            {balance.pendingCommissions.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Comissões em período de espera
                </h4>
                <div className="space-y-2">
                  {balance.pendingCommissions
                    .sort((a, b) => a.daysUntilAvailable - b.daysUntilAvailable)
                    .slice(0, 5)
                    .map((pending, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(pending.amount, balance.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(pending.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                          {pending.daysUntilAvailable} dia{pending.daysUntilAvailable !== 1 ? 's' : ''} restante{pending.daysUntilAvailable !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                  {balance.pendingCommissions.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      + {balance.pendingCommissions.length - 5} outras comissões em espera
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mensagem quando não há saldo */}
            {balance.availableBalance === 0 && balance.pendingBalance === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma comissão registrada nesta moeda</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Informações sobre saques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre os Saques de Indicação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-yellow-500" />
              <p>
                <strong className="text-foreground">Período de espera:</strong> As comissões ficam disponíveis para saque após 30 dias da data de geração.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <p>
                <strong className="text-foreground">Saldo disponível:</strong> Valores já liberados que podem ser sacados a qualquer momento.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p>
                <strong className="text-foreground">Importante:</strong> Saques são processados em até 5 dias úteis após a solicitação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Saque */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>
              Informe o valor que deseja sacar do seu saldo de indicações.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCurrency && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Saldo disponível</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    balancesByCurrency.find(b => b.currency === selectedCurrency)?.availableBalance || 0,
                    selectedCurrency
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor do saque ({selectedCurrency})</Label>
                <Input
                  id="amount"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleWithdraw} 
              disabled={isRequestingWithdrawal || !withdrawAmount}
            >
              {isRequestingWithdrawal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Saque'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
