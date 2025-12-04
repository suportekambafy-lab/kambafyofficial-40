import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedCard, HighlightedCardHeader, HighlightedCardTitle, HighlightedCardContent } from "@/components/ui/highlighted-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, RefreshCw, Download, PiggyBank, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { BankingInfo } from "@/components/BankingInfo";
import { useCustomToast } from '@/hooks/useCustomToast';
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useCustomToast();
  const [loading, setLoading] = useState(true);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [identityVerification, setIdentityVerification] = useState<IdentityVerification | null>(null);
  const [showValues, setShowValues] = useState({
    available: true,
    withdrawn: true
  });

  // ✅ DADOS FINANCEIROS COMPLETOS - Total, Retido e Disponível
  const [financialData, setFinancialData] = useState({
    totalBalance: 0,
    // Saldo total antes da retenção
    retainedAmount: 0,
    // Valor retido pela plataforma
    availableBalance: 0,
    // Disponível para saque (após retenção)
    withdrawnAmount: 0,
    // Saques aprovados
    retentionPercentage: 0,
    // Porcentagem de retenção
    retentionReason: null as string | null,
    // Motivo da retenção
    retentionReleaseDate: null as string | null // Data de liberação automática
  });
  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('iban').eq('user_id', user.id).single();
      setUserProfile(profile);
      const {
        data: verification
      } = await supabase.from('identity_verification').select('status').eq('user_id', user.id).maybeSingle();
      setIdentityVerification(verification as IdentityVerification);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }, [user]);
  const loadFinancialData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // ✅ 1. BUSCAR RETENÇÃO DO PERFIL (incluindo valor retido FIXO)
      const {
        data: profileData
      } = await supabase.from('profiles').select('balance_retention_percentage, retained_fixed_amount, retention_reason, retention_release_date').eq('user_id', user.id).single();
      const retentionPercentage = profileData?.balance_retention_percentage || 0;
      const retainedFixedAmount = profileData?.retained_fixed_amount || 0;
      const retentionReason = profileData?.retention_reason || null;
      const retentionReleaseDate = profileData?.retention_release_date || null;

      // ✅ 2. SALDO TOTAL
      const {
        data: balanceData
      } = await supabase.from('customer_balances').select('balance').eq('user_id', user.id).maybeSingle();
      const totalBalance = balanceData?.balance || 0;

      // ✅ 3. CALCULAR VALORES USANDO VALOR RETIDO FIXO
      // O valor retido é FIXO desde quando foi aplicado, não muda com saques
      const retainedAmount = retainedFixedAmount;
      const availableBalance = totalBalance - retainedAmount;

      // ✅ 4. TOTAL SACADO (aprovado)
      const {
        data: withdrawals
      } = await supabase.from('withdrawal_requests').select('amount, status').eq('user_id', user.id);
      const withdrawnAmount = (withdrawals || []).filter(w => w.status === 'aprovado').reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

      // ✅ 5. CARREGAR HISTÓRICO DE SAQUES
      const {
        data: withdrawalRequestsData
      } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      setWithdrawalRequests(withdrawalRequestsData as WithdrawalRequest[] || []);
      setFinancialData({
        totalBalance,
        retainedAmount,
        availableBalance,
        withdrawnAmount,
        retentionPercentage,
        retentionReason,
        retentionReleaseDate
      });
      console.log('✅ Dados financeiros carregados:', {
        totalBalance: totalBalance.toLocaleString(),
        retentionPercentage: `${retentionPercentage}%`,
        retainedAmount: retainedAmount.toLocaleString(),
        availableBalance: availableBalance.toLocaleString(),
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

      // ✅ Debounce para evitar múltiplos refreshes
      let refreshTimeout: NodeJS.Timeout | null = null;
      const debouncedRefresh = () => {
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => {
          loadFinancialData();
          refreshTimeout = null;
        }, 1500);
      };

      // ✅ Escutar mudanças em saques
      const withdrawalChannel = supabase.channel(`withdrawal_changes_${user.id}`).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawal_requests',
        filter: `user_id=eq.${user.id}`
      }, debouncedRefresh).subscribe();

      // ✅ Escutar mudanças em balance_transactions
      const balanceChannel = supabase.channel(`balance_changes_${user.id}`).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'balance_transactions',
        filter: `user_id=eq.${user.id}`
      }, debouncedRefresh).subscribe();
      return () => {
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
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
    // Formatar com . para milhares e , para decimais (formato português)
    const formatted = value.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${formatted} Kz`;
  };
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': {
        color: 'bg-yellow-500',
        text: 'Pendente'
      },
      'aprovado': {
        color: 'bg-green-500',
        text: 'Aprovado'
      },
      'rejeitado': {
        color: 'bg-red-500',
        text: 'Rejeitado'
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pendente'];
    return <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>;
  };
  if (loading) {
    return <OptimizedPageWrapper>
        <PageSkeleton variant="financial" />
      </OptimizedPageWrapper>;
  }
  const isVerified = identityVerification?.status === 'aprovado';
  const hasIban = !!userProfile?.iban;
  const canWithdraw = isVerified && hasIban && financialData.availableBalance > 0;
  return <OptimizedPageWrapper>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Gerencie seus ganhos e saques
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => loadFinancialData()} className="flex items-center gap-2 dark:text-white" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" onClick={handleGenerateReport} className="flex items-center gap-2 dark:text-white" size="sm">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Relatório</span>
            </Button>
          </div>
        </div>

        {/* Alertas de Verificação */}
        {!isVerified && <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
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
                  <Link to="/identidade">
                    <Button variant="outline" size="sm" className="mt-3">
                      Verificar Agora
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>}

        {isVerified && !hasIban && <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
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
          </Card>}

        {/* Cards de Saldo */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {/* Total Sacado */}
          <div className="bg-card rounded-xl shadow-card border border-emerald-500/50 flex overflow-hidden">
            <div className="w-1 bg-emerald-500 shrink-0" />
            <div className="flex-1 p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-sm font-medium mb-1">Total Sacado</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                  {showValues.withdrawn ? formatCurrency(financialData.withdrawnAmount) : '••••••'}
                </h3>
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowValues(prev => ({
                  ...prev,
                  withdrawn: !prev.withdrawn
                }))} className="h-8 w-8 p-0">
                    {showValues.withdrawn ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Valor Retido */}
          {financialData.retentionPercentage > 0 && <div className="bg-card rounded-xl shadow-card border border-orange-500/50 flex overflow-hidden">
              <div className="w-1 bg-orange-500 shrink-0" />
              <div className="flex-1 p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-sm font-medium mb-1">Valor Retido</p>
                  <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 tracking-tight truncate">
                    {formatCurrency(financialData.retainedAmount)}
                  </h3>
                  <div className="mt-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">
                  {financialData.retentionPercentage}%
                </Badge>
              </div>
            </div>}

          {/* Saldo Disponível */}
          <div className="bg-card rounded-xl shadow-card border border-primary/30 flex overflow-hidden">
            <div className="w-1 bg-primary shrink-0" />
            <div className="flex-1 p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-sm font-medium mb-1">Disponível para Saque</p>
                <h3 className="text-2xl font-bold text-foreground tracking-tight truncate">
                  {showValues.available ? formatCurrency(financialData.availableBalance) : '••••••'}
                </h3>
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowValues(prev => ({
                  ...prev,
                  available: !prev.available
                }))} className="h-8 w-8 p-0">
                    {showValues.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {canWithdraw && <Button onClick={() => setWithdrawalModalOpen(true)} size="sm" className="shrink-0">
                  <PiggyBank className="h-4 w-4 mr-2" />
                  Sacar
                </Button>}
            </div>
          </div>
        </div>

        {/* Informações Bancárias */}
        <BankingInfo />

        {/* Histórico de Saques */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Nenhum saque solicitado ainda</p>
              </div> : <div className="overflow-x-auto">
                <div className="min-w-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Data</TableHead>
                      <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Atualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRequests.map(request => <TableRow key={request.id}>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(request.created_at).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {new Date(request.updated_at).toLocaleDateString('pt-PT')}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
                </div>
              </div>}
          </CardContent>
        </Card>
      </div>

      <WithdrawalModal open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen} availableBalance={financialData.availableBalance} onWithdrawalSuccess={() => {
      loadFinancialData();
      toast({
        title: "Saque solicitado",
        message: "Sua solicitação de saque foi enviada com sucesso.",
        variant: "success"
      });
    }} />
    </OptimizedPageWrapper>;
}