import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, AlertCircle, PiggyBank } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { BankingInfo } from "@/components/BankingInfo";
import { useCustomToast } from '@/hooks/useCustomToast';
import { WithdrawalModal, WITHDRAWAL_2FA_KEY } from "@/components/WithdrawalModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrencyBalances, CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { CurrencyTabs } from "@/components/financial/CurrencyTabs";
import { MultiCurrencyOverview } from "@/components/financial/MultiCurrencyOverview";
import { SalesRevenueOverview } from "@/components/financial/SalesRevenueOverview";
import { useSalesRevenue } from "@/hooks/useSalesRevenue";

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface IdentityVerification {
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const { t } = useTranslation();
  
  // Multi-currency hook
  const {
    balances,
    transactions,
    loading: balancesLoading,
    selectedCurrency,
    setSelectedCurrency,
    loadBalances,
    formatCurrency,
    getTotalBalanceInKZ,
    getTotalWithdrawn
  } = useCurrencyBalances();

  // Sales revenue hook (same logic as Dashboard)
  const { revenueByMoeda, loading: revenueLoading, refresh: refreshRevenue } = useSalesRevenue();

  // Check for pending 2FA
  const initialPending2FA = (() => {
    try {
      const pending = sessionStorage.getItem(WITHDRAWAL_2FA_KEY);
      if (pending) {
        const data = JSON.parse(pending);
        const userEmail = localStorage.getItem('user_email');
        const timerKey = `2fa_timer_withdrawal_${userEmail || ''}`;
        const timerData = sessionStorage.getItem(timerKey);
        
        let isExpired = data.expiresAt <= Date.now();
        
        if (timerData && !isExpired) {
          try {
            const { timeLeft, timestamp } = JSON.parse(timerData);
            const elapsed = Math.floor((Date.now() - timestamp) / 1000);
            const remaining = timeLeft - elapsed;
            if (remaining <= 0) isExpired = true;
          } catch {}
        }
        
        if (!isExpired) return true;
        sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
        if (timerData) sessionStorage.removeItem(timerKey);
      }
    } catch {}
    return false;
  })();

  const [loading, setLoading] = useState(!initialPending2FA);
  const [hasPending2FA] = useState(initialPending2FA);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(initialPending2FA);
  const [withdrawalCurrency, setWithdrawalCurrency] = useState<string>('KZ');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [identityVerification, setIdentityVerification] = useState<IdentityVerification | null>(null);
  const [hasPaymentMethods, setHasPaymentMethods] = useState(false);
  const [totalWithdrawn, setTotalWithdrawn] = useState<Record<string, number>>({});

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      // Check identity verification
      const { data: verification } = await supabase
        .from('identity_verification')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      setIdentityVerification(verification as IdentityVerification);

      // Check payment methods
      const { data: profile } = await supabase
        .from('profiles')
        .select('iban, account_holder, withdrawal_methods')
        .eq('user_id', user.id)
        .single();
      
      const hasIban = profile?.iban && profile?.account_holder;
      const hasMethods = profile?.withdrawal_methods && 
        Array.isArray(profile.withdrawal_methods) && 
        profile.withdrawal_methods.length > 0;
      setHasPaymentMethods(!!(hasIban || hasMethods));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user]);

  const loadWithdrawalHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setWithdrawalRequests((data || []) as WithdrawalRequest[]);
      
      // Calculate total withdrawn per currency
      const approved = (data || []).filter((w: any) => w.status === 'aprovado');
      const totals: Record<string, number> = {};
      approved.forEach((w: any) => {
        const curr = w.currency || 'KZ';
        totals[curr] = (totals[curr] || 0) + parseFloat(w.amount.toString());
      });
      setTotalWithdrawn(totals);
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([loadUserData(), loadWithdrawalHistory()]).finally(() => {
        setLoading(false);
      });

      // Realtime subscription for withdrawals
      const channel = supabase
        .channel(`withdrawal_changes_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'withdrawal_requests',
          filter: `user_id=eq.${user.id}`
        }, loadWithdrawalHistory)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadUserData, loadWithdrawalHistory]);

  const handleWithdraw = (currency: string) => {
    setWithdrawalCurrency(currency);
    setWithdrawalModalOpen(true);
  };

  const handleGenerateReport = async () => {
    toast({
      title: "Relatório em desenvolvimento",
      message: "Funcionalidade de relatórios será disponibilizada em breve.",
      variant: "warning"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { color: 'bg-yellow-500', text: 'Pendente' },
      'suspenso': { color: 'bg-orange-500', text: 'Em Análise' },
      'aprovado': { color: 'bg-green-500', text: 'Aprovado' },
      'rejeitado': { color: 'bg-red-500', text: 'Rejeitado' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pendente'];
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const isVerified = identityVerification?.status === 'aprovado';
  const canWithdraw = isVerified && hasPaymentMethods;

  // Get available balance for selected currency
  const selectedBalance = balances.find(b => b.currency === withdrawalCurrency);
  const availableBalance = selectedBalance ? selectedBalance.balance - selectedBalance.retained_balance : 0;

  if ((loading || balancesLoading) && !hasPending2FA) {
    return <PageSkeleton variant="financial" />;
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">{t('financial.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {t('financial.subtitle')}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => { loadBalances(); refreshRevenue(); }} 
              className="flex items-center gap-2 dark:text-white" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGenerateReport} 
              className="flex items-center gap-2 dark:text-white" 
              size="sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reports.title')}</span>
            </Button>
          </div>
        </div>

        {/* Verification Alert */}
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
                  <Link to="/identidade">
                    <Button variant="outline" size="sm" className="mt-3">
                      Verificar Agora
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multi-Currency Overview (wallet balances) */}
        <MultiCurrencyOverview
          balances={balances}
          formatCurrency={formatCurrency}
          getTotalInKZ={getTotalBalanceInKZ}
        />

        {/* Currency Tabs with Balances */}
        <CurrencyTabs
          balances={balances}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          formatCurrency={formatCurrency}
          getTotalWithdrawn={getTotalWithdrawn}
          onWithdraw={handleWithdraw}
          canWithdraw={canWithdraw}
          isVerified={isVerified}
        />

        {/* Banking Info */}
        <BankingInfo isVerified={isVerified} />

        {/* Withdrawal History */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base sm:text-lg">Histórico de Saques</CardTitle>
              {(totalWithdrawn[selectedCurrency] || 0) > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total Sacado:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(totalWithdrawn[selectedCurrency] || 0, selectedCurrency)}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {withdrawalRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Nenhum saque solicitado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[320px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Data</TableHead>
                        <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                        <TableHead className="text-xs sm:text-sm">Moeda</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawalRequests.map(request => {
                        const currency = request.currency || 'KZ';
                        const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="text-xs sm:text-sm">
                              {new Date(request.created_at).toLocaleDateString('pt-PT')}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {formatCurrency(request.amount, currency)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <span className="flex items-center gap-1">
                                {config.flag} {currency}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        availableBalance={availableBalance}
        currency={withdrawalCurrency}
        onWithdrawalSuccess={() => {
          loadBalances();
          loadWithdrawalHistory();
        }}
      />
    </>
  );
}
