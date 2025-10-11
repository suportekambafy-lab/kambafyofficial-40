import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedCard, HighlightedCardHeader, HighlightedCardTitle, HighlightedCardContent } from "@/components/ui/highlighted-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  RefreshCw,
  Download,
  PiggyBank,
  Clock,
  CheckCircle,
  Shield,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { BankingInfo } from "@/components/BankingInfo";
import { useCustomToast } from '@/hooks/useCustomToast';
import { WithdrawalModal } from "@/components/WithdrawalModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  iban?: string;
}

interface IdentityVerification {
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const [loading, setLoading] = useState(true);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [identityVerification, setIdentityVerification] = useState<IdentityVerification | null>(null);
  const [showValues, setShowValues] = useState({
    available: true,
    pending: true,
    withdrawn: true
  });

  // ✅ DADOS FINANCEIROS SIMPLIFICADOS
  const [financialData, setFinancialData] = useState({
    availableBalance: 0,      // Do customer_balances.balance
    pendingBalance: 0,        // Vendas <3 dias sem sale_revenue
    withdrawnAmount: 0,       // Saques aprovados
    nextReleaseDate: null as Date | null,
    nextReleaseAmount: 0
  });

  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('iban')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      const { data: verification } = await supabase
        .from('identity_verification')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      setIdentityVerification(verification as IdentityVerification);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }, [user]);

  const loadFinancialData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // ✅ 1. SALDO DISPONÍVEL - Fonte única de verdade
      const { data: balanceData } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const availableBalance = balanceData?.balance || 0;

      // ✅ 2. BUSCAR PRODUTOS DO USUÁRIO
      const { data: userProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const userProductIds = userProducts?.map(p => p.id) || [];

      // ✅ 3. BUSCAR VENDAS COMPLETED DOS ÚLTIMOS 3 DIAS
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('order_id, amount, seller_commission, created_at')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .gte('created_at', threeDaysAgo.toISOString());

      // ✅ 4. VERIFICAR QUAIS JÁ TÊM SALE_REVENUE
      const orderIds = (recentOrders || []).map(o => o.order_id).filter(Boolean);
      
      let releasedTransactions: any[] = [];
      if (orderIds.length > 0) {
        const { data } = await supabase
          .from('balance_transactions')
          .select('order_id')
          .eq('user_id', user.id)
          .eq('type', 'sale_revenue')
          .in('order_id', orderIds);
        
        releasedTransactions = data || [];
      }

      const releasedOrderIds = new Set(
        releasedTransactions.map(t => t.order_id).filter(Boolean)
      );

      // ✅ 5. CALCULAR SALDO PENDENTE
      let pendingBalance = 0;
      let nextReleaseDate: Date | null = null;
      let nextReleaseAmount = 0;

      const pendingOrders: Array<{date: Date, amount: number}> = [];

      (recentOrders || []).forEach(order => {
        // Se já tem sale_revenue, pular
        if (releasedOrderIds.has(order.order_id)) return;

        // Usar seller_commission (já tem 8% descontado) ou calcular 92%
        const netAmount = order.seller_commission 
          ? order.seller_commission 
          : parseFloat(order.amount) * 0.92;

        pendingBalance += netAmount;

        const releaseDate = new Date(order.created_at);
        releaseDate.setDate(releaseDate.getDate() + 3);
        
        pendingOrders.push({ date: releaseDate, amount: netAmount });
      });

      // Encontrar próxima liberação
      if (pendingOrders.length > 0) {
        pendingOrders.sort((a, b) => a.date.getTime() - b.date.getTime());
        nextReleaseDate = pendingOrders[0].date;
        nextReleaseAmount = pendingOrders
          .filter(o => o.date.toDateString() === nextReleaseDate!.toDateString())
          .reduce((sum, o) => sum + o.amount, 0);
      }

      // ✅ 6. TOTAL SACADO (aprovado)
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount, status')
        .eq('user_id', user.id);

      const withdrawnAmount = (withdrawals || [])
        .filter(w => w.status === 'aprovado')
        .reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

      // ✅ 7. CARREGAR HISTÓRICO DE SAQUES
      const { data: withdrawalRequestsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setWithdrawalRequests((withdrawalRequestsData as WithdrawalRequest[]) || []);

      setFinancialData({
        availableBalance,
        pendingBalance,
        withdrawnAmount,
        nextReleaseDate,
        nextReleaseAmount
      });

      console.log('✅ Dados financeiros carregados:', {
        availableBalance: availableBalance.toLocaleString(),
        pendingBalance: pendingBalance.toLocaleString(),
        withdrawnAmount: withdrawnAmount.toLocaleString()
      });

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast({
        title: "Erro ao carregar dados",
        message: "Não foi possível carregar os dados financeiros. Tente novamente.",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadFinancialData();

      // ✅ Escutar mudanças em saques
      const withdrawalChannel = supabase
        .channel(`withdrawal_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'withdrawal_requests',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            setTimeout(() => loadFinancialData(), 1000);
          }
        )
        .subscribe();

      // ✅ Escutar mudanças em balance_transactions
      const balanceChannel = supabase
        .channel(`balance_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'balance_transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            setTimeout(() => loadFinancialData(), 1000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(withdrawalChannel);
        supabase.removeChannel(balanceChannel);
      };
    }
  }, [user, loadUserData, loadFinancialData]);

  const handleGenerateReport = async () => {
    toast({
      title: "Relatório em desenvolvimento",
      message: "Funcionalidade de relatórios será disponibilizada em breve.",
      variant: "warning"
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { color: 'bg-yellow-500', text: 'Pendente' },
      'aprovado': { color: 'bg-green-500', text: 'Aprovado' },
      'rejeitado': { color: 'bg-red-500', text: 'Rejeitado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pendente'];
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <OptimizedPageWrapper>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </OptimizedPageWrapper>
    );
  }

  const isVerified = identityVerification?.status === 'aprovado';
  const hasIban = !!userProfile?.iban;
  const canWithdraw = isVerified && hasIban && financialData.availableBalance > 0;

  return (
    <OptimizedPageWrapper>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus ganhos e saques
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => loadFinancialData()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Relatório
            </Button>
          </div>
        </div>

        {/* Alertas de Verificação */}
        {!isVerified && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Verificação de Identidade Pendente
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Complete a verificação de identidade para solicitar saques.
                  </p>
                  <Link to="/settings?tab=verification">
                    <Button variant="outline" size="sm" className="mt-3">
                      Verificar Agora
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isVerified && !hasIban && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Adicione suas Informações Bancárias
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Configure seu IBAN para receber saques.
                  </p>
                  <Link to="/settings?tab=banking">
                    <Button variant="outline" size="sm" className="mt-3">
                      Adicionar IBAN
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Saldo */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Saldo Disponível */}
          <HighlightedCard>
            <HighlightedCardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <HighlightedCardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</HighlightedCardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValues(prev => ({ ...prev, available: !prev.available }))}
                  className="h-6 w-6 p-0"
                >
                  {showValues.available ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </div>
            </HighlightedCardHeader>
            <HighlightedCardContent className="pt-0">
              <div className="text-xl md:text-2xl font-bold mb-1">
                {showValues.available ? formatCurrency(financialData.availableBalance) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Pronto para saque
              </p>
              {canWithdraw && (
                <Button
                  onClick={() => setWithdrawalModalOpen(true)}
                  className="w-full"
                  size="sm"
                >
                  <PiggyBank className="h-3 w-3 mr-2" />
                  Solicitar Saque
                </Button>
              )}
            </HighlightedCardContent>
          </HighlightedCard>

          {/* Saldo Pendente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendente</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValues(prev => ({ ...prev, pending: !prev.pending }))}
                  className="h-6 w-6 p-0"
                >
                  {showValues.pending ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl md:text-2xl font-bold mb-1">
                {showValues.pending ? formatCurrency(financialData.pendingBalance) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Aguardando liberação (3 dias)
              </p>
              {financialData.nextReleaseDate && (
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-xs font-medium">Próxima Liberação</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {financialData.nextReleaseDate.toLocaleDateString('pt-PT')} - {formatCurrency(financialData.nextReleaseAmount)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Sacado */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sacado</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValues(prev => ({ ...prev, withdrawn: !prev.withdrawn }))}
                  className="h-6 w-6 p-0"
                >
                  {showValues.withdrawn ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl md:text-2xl font-bold mb-1">
                {showValues.withdrawn ? formatCurrency(financialData.withdrawnAmount) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground">
                Saques aprovados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações Bancárias */}
        <BankingInfo />

        {/* Histórico de Saques */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum saque solicitado ainda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString('pt-PT')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.updated_at).toLocaleDateString('pt-PT')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        availableBalance={financialData.availableBalance}
        onWithdrawalSuccess={() => {
          loadFinancialData();
          toast({
            title: "Saque solicitado",
            message: "Sua solicitação de saque foi enviada com sucesso.",
            variant: "success"
          });
        }}
      />
    </OptimizedPageWrapper>
  );
}
