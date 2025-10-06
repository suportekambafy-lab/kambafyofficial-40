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
  Calendar,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  Shield,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { BankingInfo } from "@/components/BankingInfo";
import { toast } from "sonner";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { useTabVisibilityOptimizer } from "@/hooks/useTabVisibilityOptimizer";

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
  const { shouldSkipUpdate } = useTabVisibilityOptimizer();
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
  const [lastDataUpdate, setLastDataUpdate] = useState(0);
  const [financialData, setFinancialData] = useState({
    availableBalance: 0,
    monthlyRevenue: 0,
    commissionsPaid: 0,
    pendingWithdrawal: 0,
    totalRevenue: 0,
    totalOrders: 0,
    nextReleaseDate: null as Date | null,
    nextReleaseAmount: 0,
    pendingOrders: [] as Array<{date: Date, amount: number}>,
    withdrawnAmount: 0
  });

  // ✅ Remover cache automático - sempre carregar dados frescos

  const loadWithdrawalRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data: requests, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar solicitações de saque:', error);
        return;
      }

      setWithdrawalRequests(requests || []);
    } catch (error) {
      console.error('Erro ao carregar solicitações de saque:', error);
    }
  }, [user]);

  
  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      // Carregar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('iban')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', profileError);
      } else {
        setUserProfile(profile);
      }

      // Carregar verificação de identidade
      const { data: verification, error: verificationError } = await supabase
        .from('identity_verification')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (verificationError) {
        console.error('Erro ao carregar verificação:', verificationError);
      } else {
        setIdentityVerification(verification as IdentityVerification);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }, [user]);

  const loadFinancialData = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    // ✅ OTIMIZAÇÃO: Skip apenas se foi atualização muito recente E não for refresh forçado
    if (!forceRefresh && shouldSkipUpdate(lastDataUpdate, 30000)) {
      console.log('📊 Financial data update skipped - too recent');
      return;
    }

    try {
      setLoading(true);

      // Primeiro, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      // Buscar produtos do usuário primeiro
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];

      // Buscar vendas dos produtos do usuário
      const { data: ownOrders, error: ordersError } = await supabase
        .from('orders')
        .select('order_id, amount, currency, created_at, status, affiliate_commission, seller_commission, product_id')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200);

      // Vendas recuperadas removidas - sistema de recuperação desabilitado
      const recoveredOrderIds = new Set();

      // Buscar solicitações de saque
      const { data: withdrawalRequestsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Buscar vendas como afiliado se houver códigos
      let affiliateOrders: any[] = [];
      if (userAffiliateCodes.length > 0) {
        const { data: affiliateData, error: affiliateError } = await supabase
          .from('orders')
          .select('order_id, amount, currency, created_at, status, affiliate_commission, seller_commission, affiliate_code')
          .in('affiliate_code', userAffiliateCodes)
          .not('affiliate_commission', 'is', null)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(200);
        
        if (!affiliateError) {
          affiliateOrders = affiliateData || [];
        }
      }


      if (ordersError) {
        console.error('Error loading orders:', ordersError);
      } else {
        // Combinar vendas próprias e comissões de afiliado
        const allOrders = [
          // Vendas próprias - usar valor total ou comissão do vendedor (com desconto de 20% se recuperada)
          ...(ownOrders || []).map(order => {
            const isRecovered = recoveredOrderIds.has(order.order_id);
            let earning = parseFloat(order.seller_commission?.toString() || order.amount || '0');
            
            // Converter para KZ se necessário
            if (order.currency && order.currency !== 'KZ') {
              const exchangeRates: Record<string, number> = {
                'EUR': 1053, // 1 EUR = ~1053 KZ
                'MZN': 14.3  // 1 MZN = ~14.3 KZ
              };
              const rate = exchangeRates[order.currency.toUpperCase()] || 1;
              earning = Math.round(earning * rate);
            }
            
            // Aplicar desconto de 20% se for venda recuperada
            if (isRecovered) {
              earning = earning * 0.8;
            }
            
            return {
              ...order,
              earning_amount: earning,
              order_type: 'own'
            };
          }),
          // Vendas como afiliado - usar apenas comissão do afiliado
          ...(affiliateOrders || []).map(order => ({
            ...order,
            earning_amount: parseFloat(order.affiliate_commission?.toString() || '0'),
            order_type: 'affiliate'
          }))
        ];

        console.log(`📊 Financial: carregou ${ownOrders?.length || 0} vendas próprias e ${affiliateOrders?.length || 0} comissões para usuário ${user.id}`);
        console.log('📋 Primeiras 3 vendas/comissões financeiro:', allOrders.slice(0, 3));
        
        const totalRevenue = allOrders.reduce((sum, order) => {
          return sum + order.earning_amount;
        }, 0);

        // Calculate monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        }).reduce((sum, order) => {
          return sum + order.earning_amount;
        }, 0);

        // ✅ NOVA LÓGICA: Calcular saldo disponível e pendente com base nas datas das vendas
        const now = new Date();
        let availableBalance = 0;  // Vendas já liberadas (mais de 3 dias)
        let pendingBalance = 0;    // Vendas aguardando liberação (dentro de 3 dias)
        const pendingOrdersData: Array<{date: Date, amount: number}> = [];

        allOrders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const releaseDate = new Date(orderDate);
          // Calcular 3 dias corridos (sempre 3 dias após a venda)
          releaseDate.setDate(orderDate.getDate() + 3);
          
          const amount = order.earning_amount;
          
          // Verificar se já passou dos 3 dias
          if (now >= releaseDate) {
            // Venda já liberada - adicionar ao saldo disponível
            availableBalance += amount;
          } else {
            // Venda ainda pendente - adicionar ao saldo pendente
            pendingBalance += amount;
            pendingOrdersData.push({
              date: releaseDate,
              amount: amount
            });
          }
        });

        // Encontrar a próxima data de liberação e valor
        let nextReleaseDate = null;
        let nextReleaseAmount = 0;
        
        if (pendingOrdersData.length > 0) {
          // Ordenar por data e pegar a próxima liberação
          pendingOrdersData.sort((a, b) => a.date.getTime() - b.date.getTime());
          nextReleaseDate = pendingOrdersData[0].date;
          
          // Somar todas as vendas que serão liberadas na mesma data
          nextReleaseAmount = pendingOrdersData
            .filter(order => order.date.toDateString() === nextReleaseDate!.toDateString())
            .reduce((sum, order) => sum + order.amount, 0);
        }
        
        // ✅ SEMPRE definir uma data quando há saldo pendente
        if (pendingBalance > 0 && !nextReleaseDate) {
          const today = new Date();
          nextReleaseDate = new Date(today);
          nextReleaseDate.setDate(today.getDate() + 3);
          nextReleaseAmount = pendingBalance;
        }

        // Usar dados já carregados dos saques (já extraídos acima)

        // ✅ Calcular total sacado = APENAS saques APROVADOS (valor após dedução de 8%)
        const totalWithdrawnAmount = withdrawalRequestsData?.reduce((sum, withdrawal) => {
          // Incluir APENAS os saques APROVADOS - usar valor que realmente saiu
          if (withdrawal.status === 'aprovado') {
            const finalAmount = parseFloat(withdrawal.amount?.toString() || '0');
            return sum + finalAmount;
          }
          return sum;
        }, 0) || 0;

        // ✅ DEDUZIR saques aprovados do saldo disponível
        const finalAvailableBalance = Math.max(0, availableBalance - totalWithdrawnAmount);

        const newFinancialData = {
          availableBalance: finalAvailableBalance,  // ✅ Saldo disponível para saque (do banco)
          monthlyRevenue,
          commissionsPaid: 0,
          pendingWithdrawal: pendingBalance,        // ✅ Vendas aguardando liberação (3 dias)
          totalRevenue,
          totalOrders: allOrders.length,
          nextReleaseDate,
          nextReleaseAmount,
          pendingOrders: pendingOrdersData,
          withdrawnAmount: totalWithdrawnAmount     // ✅ Total já aprovado (valor original antes do desconto)
        };

        setFinancialData(newFinancialData);
        setWithdrawalRequests((withdrawalRequestsData as WithdrawalRequest[]) || []);
        setLastDataUpdate(Date.now()); // ✅ Atualizar timestamp

        console.log(`✅ Dados financeiros atualizados para usuário ${user.id}:`, {
          saldoDisponivel: finalAvailableBalance,
          saldoPendente: pendingBalance,
          totalSacado: totalWithdrawnAmount
        });
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadWithdrawalRequests]);

  useEffect(() => {
    if (user) {
      console.log(`📊 Carregando dados do usuário: ${user.id}`);
      loadUserData();
      // ✅ Sempre carregar dados frescos na primeira carga
      loadFinancialData(true);
      
      // ✅ Configurar escuta em tempo real para mudanças nos saques do usuário
      const withdrawalChannel = supabase
        .channel(`withdrawal_changes_financial_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'withdrawal_requests',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('💰 [FINANCIAL] Mudança detectada em saques do usuário:', payload);
            // Recarregar dados financeiros com delay para garantir consistência
            setTimeout(() => {
              console.log('📊 [FINANCIAL] Recarregando dados após mudança em saque...');
              loadFinancialData(true);
            }, 1000);
          }
        )
        .subscribe();

      return () => {
        console.log('🔌 [FINANCIAL] Desconectando escuta de saques');
        supabase.removeChannel(withdrawalChannel);
      };
    }
  }, [user, loadUserData, loadFinancialData]);

  const handleGenerateReport = async () => {
    if (!user) return;

    try {
      // Buscar produtos do usuário primeiro
      const { data: userProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const userProductIds = userProducts?.map(p => p.id) || [];

      // ✅ QUERY CORRIGIDA - Buscar vendas pelos produtos do usuário para relatório
      const promises = [
        supabase
          .from('orders')
          .select(`
            *,
            products (
              id,
              name,
              type
            )
          `)
          .in('product_id', userProductIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
      ];

      // Adicionar vendas como afiliado se houver códigos
      const { data: affiliateCodes } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      if (userAffiliateCodes.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select(`
              *,
              products (
                id,
                name,
                type
              )
            `)
            .in('affiliate_code', userAffiliateCodes)
            .not('affiliate_commission', 'is', null)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
        );
      }

      const results = await Promise.all(promises);
      const [ownOrdersData, affiliateOrdersData] = results;

      const { data: ownOrders, error } = ownOrdersData;
      const affiliateOrders = affiliateOrdersData ? affiliateOrdersData.data : [];

      if (error) {
        console.error('Error generating report:', error);
        toast.error("Erro ao gerar relatório");
        return;
      }

      // Buscar histórico de saques
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error loading withdrawals:', withdrawalsError);
      }

      // Combinar vendas próprias e comissões
      const allOrdersForReport = [
        ...(ownOrders || []).map(order => ({ ...order, order_type: 'own' })),
        ...(affiliateOrders || []).map(order => ({ ...order, order_type: 'affiliate' }))
      ];

      // Criar conteúdo CSV expandido com histórico de saques
      const csvContent = [
        // Seção de vendas
        ['HISTÓRICO DE VENDAS E COMISSÕES'],
        ['Data', 'Pedido ID', 'Cliente', 'Email', 'Produto', 'Valor Total (KZ)', 'Ganho (KZ)', 'Tipo', 'Status'].join(','),
        ...allOrdersForReport.map(order => [
          new Date(order.created_at).toLocaleDateString('pt-BR'),
          order.order_id,
          order.customer_name,
          order.customer_email,
          order.products?.name || 'Produto',
          order.amount,
          order.order_type === 'affiliate' 
            ? parseFloat(order.affiliate_commission?.toString() || '0').toFixed(0)
            : parseFloat(order.seller_commission?.toString() || order.amount || '0').toFixed(0),
          order.order_type === 'affiliate' ? 'Comissão Afiliado' : 'Venda Própria',
          order.status === 'completed' ? 'Concluído' : 'Pendente'
        ].join(',')),
        [''],
        // Seção de saques
        ['HISTÓRICO DE SAQUES'],
        ['Data Solicitação', 'Valor a Receber (KZ)', 'Valor Original (KZ)', 'Taxa (KZ)', 'Status', 'Data Atualização'].join(','),
        ...(withdrawals || []).map(withdrawal => {
          // ✅ O valor no banco já é o valor final (após desconto de 8%)
          const receivedAmount = parseFloat(withdrawal.amount?.toString() || '0');
          // Para calcular o valor original, dividir por 0.92 (100% - 8%)
          const originalAmount = receivedAmount / 0.92;
          const feeAmount = originalAmount - receivedAmount;
          return [
            new Date(withdrawal.created_at).toLocaleDateString('pt-BR'),
            receivedAmount.toFixed(0),           // Valor a receber (já com desconto)
            originalAmount.toFixed(0),          // Valor original solicitado
            feeAmount.toFixed(0),               // Taxa de 8%
            withdrawal.status === 'pendente' ? 'Aguardando aprovação' : 
            withdrawal.status === 'aprovado' ? 'Aprovado' : 
            withdrawal.status === 'pago' ? 'Pago' :
            withdrawal.status === 'concluido' ? 'Concluído' : 'Rejeitado',
            new Date(withdrawal.updated_at).toLocaleDateString('pt-BR')
          ].join(',');
        })
      ].join('\n');

      // Baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_completo_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório completo gerado com sucesso!");

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Erro inesperado ao gerar relatório");
    }
  };

  const handleTestAutoRelease = async () => {
    if (!user) return;

    try {
      toast.info("🔄 Executando liberação automática...");
      
      const { data, error } = await supabase.functions.invoke('auto-release-payments', {
        body: { 
          manual: true,
          userId: user.id,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Erro na liberação automática:', error);
        toast.error("Erro ao executar liberação automática");
        return;
      }

      console.log('Resultado da liberação automática:', data);
      
      if (data.success) {
        toast.success(`✅ ${data.message}`);
        if (data.summary?.ordersReleased > 0) {
          toast.success(`💰 ${data.summary.ordersReleased} vendas liberadas: ${data.summary.totalAmountReleased.toLocaleString()} KZ`);
        }
        // Recarregar dados financeiros
        loadFinancialData(false);
      } else {
        toast.error(`Erro: ${data.error}`);
      }

    } catch (error) {
      console.error('Erro ao executar liberação automática:', error);
      toast.error("Erro inesperado ao executar liberação");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Aguardando aprovação</Badge>;
      case 'aprovado':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'pago':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'concluido':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <OptimizedPageWrapper skeletonVariant="dashboard">
      {loading ? (
        <div className="p-3 md:p-6 flex items-center justify-center min-h-96">
          <LoadingSpinner text="Carregando dados financeiros..." />
        </div>
      ) : (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie suas finanças e pagamentos</p>
          </div>
          
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => loadFinancialData(false)} className="text-xs md:text-sm text-foreground">
            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateReport} className="text-xs md:text-sm text-foreground">
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Relatório
          </Button>
          <Button 
            onClick={() => setWithdrawalModalOpen(true)} 
            size="sm" 
            className="text-xs md:text-sm"
          >
            <PiggyBank className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Solicitar Saque
          </Button>
        </div>
      </div>

      {financialData.availableBalance === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
          <p className="text-amber-800 text-xs md:text-sm">
            <strong>Informação:</strong> Cada venda fica disponível para saque 3 dias úteis após a data da venda para garantir a segurança das transações.
          </p>
        </div>
      )}

      {/* Identity Verification Info - Only show if IBAN exists and verification is not approved */}
      {userProfile?.iban && identityVerification?.status !== 'aprovado' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 text-sm md:text-base mb-2">
                Verificação de Identidade Necessária
              </h3>
              <p className="text-blue-800 text-xs md:text-sm mb-3">
                {identityVerification?.status === 'pendente' 
                  ? 'Sua verificação de identidade está sendo analisada. Aguarde a aprovação para habilitar saques.'
                  : identityVerification?.status === 'rejeitado'
                  ? 'Sua verificação de identidade foi rejeitada. Complete o processo novamente para habilitar saques.'
                  : 'Para processar saques, precisamos verificar sua identidade. Complete o processo de verificação para habilitar esta funcionalidade.'
                }
              </p>
              <Link to="/identidade">
                <Button variant="outline" size="sm" className="text-xs md:text-sm">
                  <Shield className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  {identityVerification?.status === 'pendente' 
                    ? 'Ver Status da Verificação' 
                    : 'Completar Verificação'
                  }
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <HighlightedCard highlightColor="green">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">Saldo Disponível</HighlightedCardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(prev => ({ ...prev, available: !prev.available }))}
                className="h-6 w-6 p-0"
              >
                {showValues.available ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </div>
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold mb-2">
              {showValues.available 
                ? `${financialData.availableBalance.toLocaleString()} KZ`
                : "••••••••"
              }
            </div>
            <p className="text-sm text-muted-foreground">
              {financialData.availableBalance === 0 ? 'Nenhum saldo disponível' : 'Disponível para saque'}
            </p>
          </HighlightedCardContent>
        </HighlightedCard>
        
        <HighlightedCard highlightColor="yellow">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">Saldo Pendente</HighlightedCardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(prev => ({ ...prev, pending: !prev.pending }))}
                className="h-6 w-6 p-0"
              >
                {showValues.pending ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </div>
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold mb-2">
              {showValues.pending 
                ? `${financialData.pendingWithdrawal.toLocaleString()} KZ`
                : "••••••••"
              }
            </div>
            <p className="text-sm text-muted-foreground">
              {financialData.pendingWithdrawal === 0 
                ? 'Nenhum valor pendente' 
                : (financialData.nextReleaseDate && financialData.nextReleaseDate instanceof Date)
                  ? `Próxima liberação: ${financialData.nextReleaseDate.toLocaleDateString('pt-BR')}`
                  : 'Aguardando liberação'
              }
            </p>
          </HighlightedCardContent>
        </HighlightedCard>

        <HighlightedCard highlightColor="blue">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">Total Sacado</HighlightedCardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(prev => ({ ...prev, withdrawn: !prev.withdrawn }))}
                className="h-6 w-6 p-0"
              >
                {showValues.withdrawn ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <PiggyBank className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </div>
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold mb-2">
              {showValues.withdrawn 
                ? `${financialData.withdrawnAmount.toLocaleString()} KZ`
                : "••••••••"
              }
            </div>
            <p className="text-sm text-muted-foreground">
              Saques aprovados (valor líquido recebido)
            </p>
          </HighlightedCardContent>
        </HighlightedCard>
      </div>

      {/* Payment Methods and Next Release - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <BankingInfo />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Próxima Liberação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            {financialData.nextReleaseDate && financialData.nextReleaseDate instanceof Date && financialData.nextReleaseAmount > 0 ? (
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm md:text-base">Próxima Liberação</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {financialData.nextReleaseDate instanceof Date ? financialData.nextReleaseDate.toLocaleDateString('pt-BR') : 'Data inválida'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg md:text-xl">{financialData.nextReleaseAmount.toLocaleString()} KZ</p>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Em breve</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Nenhuma liberação agendada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Solicitações de Saque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
            Histórico de Saques
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawalRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
              <div className="text-center space-y-3 md:space-y-4">
                <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold">Nenhuma solicitação de saque</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Suas solicitações de saque aparecerão aqui.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-3">
                {withdrawalRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="text-sm font-medium">
                          {new Date(request.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valor a Receber</p>
                        <p className="text-sm font-bold">
                          {parseFloat(request.amount.toString()).toLocaleString()} KZ
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Taxa: {((parseFloat(request.amount.toString()) / 0.92) - parseFloat(request.amount.toString())).toFixed(0)} KZ
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Atualizado</p>
                        <p className="text-xs">
                          {new Date(request.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                   <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor a Receber</TableHead>
                        <TableHead>Valor Original</TableHead>
                        <TableHead>Taxa (8%)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Atualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRequests.map((request) => {
                      const receivedAmount = parseFloat(request.amount.toString());
                      const originalAmount = receivedAmount / 0.92;
                      const feeAmount = originalAmount - receivedAmount;
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            {new Date(request.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {receivedAmount.toLocaleString()} KZ
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {originalAmount.toFixed(0).toLocaleString()} KZ
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {feeAmount.toFixed(0).toLocaleString()} KZ
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(request.updated_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

        {/* Modal de Saque */}
        <WithdrawalModal 
          open={withdrawalModalOpen}
          onOpenChange={setWithdrawalModalOpen}
          availableBalance={financialData.availableBalance}
          onWithdrawalSuccess={() => loadFinancialData(false)}
        />
        </div>
      )}
    </OptimizedPageWrapper>
  );
}
