import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
import { useStreamingQuery } from "@/hooks/useStreamingQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedCard, HighlightedCardHeader, HighlightedCardTitle, HighlightedCardContent } from "@/components/ui/highlighted-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, RefreshCw, CheckCircle, Clock, XCircle, CreditCard, Banknote, Building, Calendar, Package, User, DollarSign, Download, Mail, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useToast } from "@/hooks/use-toast";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import professionalManImage from "@/assets/professional-man.jpg";
import { getAllPaymentMethods, getPaymentMethodName, getAngolaPaymentMethods, getCountryByPaymentMethod, getCountryFlag } from "@/utils/paymentMethods";
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';

// ✅ Formatar valor na moeda original SEM conversão
const formatCurrencyNative = (amount: number, currency: string = 'KZ'): string => {
  const normalizedCurrency = currency === 'AOA' ? 'KZ' : currency;
  
  switch (normalizedCurrency) {
    case 'EUR':
      return `€${formatWithMaxTwoDecimals(amount)}`;
    case 'GBP':
      return `£${formatWithMaxTwoDecimals(amount)}`;
    case 'USD':
      return `$${formatWithMaxTwoDecimals(amount)}`;
    case 'BRL':
      return `R$${formatWithMaxTwoDecimals(amount)}`;
    case 'MZN':
      return `${formatWithMaxTwoDecimals(amount)} MZN`;
    case 'KZ':
    default:
      return `${formatWithMaxTwoDecimals(amount)} KZ`;
  }
};
import { useCurrencyToCountry } from "@/hooks/useCurrencyToCountry";
import { ProductFilter } from '@/components/ProductFilter';
import { ResendAccessDialog } from '@/components/sales/ResendAccessDialog';

interface Sale {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: string;
  currency: string;
  original_amount?: string; // Valor original preservado
  original_currency?: string; // Moeda original preservada
  status: string;
  payment_method: string;
  created_at: string;
  product_id: string;
  affiliate_code?: string;
  affiliate_commission?: number;
  seller_commission?: number;
  sale_type?: 'own' | 'affiliate' | 'recovered' | 'module';
  customer_country?: string;
  order_bump_data?: Array<{
    bump_product_name: string;
    bump_product_price: string;
    bump_product_image?: string;
  }>;
  products: {
    id: string;
    name: string;
    cover: string;
    type: string;
    price: string;
  } | null;
}
interface SalesStats {
  paid: number;
  pending: number;
  cancelled: number;
  paidTotal: number;
  pendingTotal: number;
  cancelledTotal: number;
  totalAffiliateCommissions: number;
  totalSellerEarnings: number;
  [key: string]: number; // Para os métodos de pagamento dinâmicos
}
export default function Sales() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const { t } = useTranslation();
  const {
    getCurrencyInfo
  } = useCurrencyToCountry();
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats>({
    paid: 0,
    pending: 0,
    cancelled: 0,
    paidTotal: 0,
    pendingTotal: 0,
    cancelledTotal: 0,
    totalAffiliateCommissions: 0,
    totalSellerEarnings: 0,
    // Inicializar contadores para todos os métodos de pagamento
    ...getAllPaymentMethods().reduce((acc, method) => {
      acc[method.id] = 0;
      return acc;
    }, {} as Record<string, number>)
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [currencyFilter, setCurrencyFilter] = useState("KZ");
  const [selectedProduct, setSelectedProduct] = useState("todos");
  const [periodFilter, setPeriodFilter] = useState("30"); // ✅ Padrão: 30 dias
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(200); // Mostrar todas as vendas
  const [showAllPaymentMethods, setShowAllPaymentMethods] = useState(false);
  const [resendingAccessFor, setResendingAccessFor] = useState<string | null>(null); // ID da venda sendo processada
  const [resendAccessDialogOpen, setResendAccessDialogOpen] = useState(false);
  const [selectedSaleForResend, setSelectedSaleForResend] = useState<Sale | null>(null);
  const [detailsDialogSaleId, setDetailsDialogSaleId] = useState<string | null>(null);
  const {
    loadOrdersWithStats,
    totalCount
  } = useStreamingQuery();
  const [dataComplete, setDataComplete] = useState(false);
  const loadingRef = useRef(false); // Controle via ref para evitar loops
  
  // ✅ Calcular datas do filtro
  const getDateFilter = useCallback(() => {
    if (periodFilter === "all") return undefined;
    
    const now = new Date();
    
    // Filtro especial para "hoje"
    if (periodFilter === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString()
      };
    }
    
    const days = parseInt(periodFilter);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  }, [periodFilter]);
  
  // ✅ VERSÃO DO CÓDIGO - Incrementar quando houver mudança importante
  const CODE_VERSION = 'v2.13'; // Fix: Filtro de período para carregar mais rápido
  const hasLoadedRef = useRef(false); // ✅ Controle para executar apenas uma vez automaticamente
  const lastCodeVersionRef = useRef<string | null>(null);
  const lastPeriodRef = useRef<string>(periodFilter); // Controle de mudança de período

  // 🔥 CARREGAMENTO FIXO - Com filtro de data
  const loadSales = useCallback(async () => {
    if (!user) {
      console.log('❌ Sem usuário, parando loading');
      setLoading(false);
      return;
    }
    if (loadingRef.current) {
      console.log('⏳ Já está carregando via ref, ignorando');
      return;
    }
    loadingRef.current = true;
    try {
      setLoading(true);
      setDataComplete(false);
      
      const dateFilter = getDateFilter();
      console.log('🔄 Carregando vendas...', dateFilter ? `Período: ${periodFilter} dias` : 'Todo período');
      
      // ✅ Passar filtro de data para o hook
      await loadOrdersWithStats(user.id, stats => {
        console.log('📊 Stats recebidos:', stats);
        setSalesStats(stats);
      }, orders => {
        console.log(`✅ ${orders.length} vendas carregadas`);
        setSales(orders);
      }, 500, dateFilter);
      console.log('✅ Carregamento concluído com sucesso');
      setDataComplete(true);
    } catch (error) {
      console.error('💥 Erro no carregamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive"
      });
      setSales([]);
    } finally {
      console.log('🏁 Finalizando loading');
      setLoading(false);
      loadingRef.current = false; // Libera para próxima execução
    }
  }, [user, toast, getDateFilter, periodFilter]); // ✅ Adicionado getDateFilter e periodFilter

  // Filtros otimizados
  const filteredSales = useMemo(() => {
    let filtered = [...sales];
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sale => sale.customer_name.toLowerCase().includes(searchLower) || sale.customer_email.toLowerCase().includes(searchLower) || sale.order_id.toLowerCase().includes(searchLower) || sale.products?.name.toLowerCase().includes(searchLower));
    }
    if (statusFilter !== "todos") {
      // ✅ FIX: "failed" inclui tanto 'failed' quanto 'cancelled'
      if (statusFilter === "failed") {
        filtered = filtered.filter(sale => sale.status === 'failed' || sale.status === 'cancelled');
      } else {
        filtered = filtered.filter(sale => sale.status === statusFilter);
      }
    }
    if (paymentFilter !== "todos") {
      filtered = filtered.filter(sale => sale.payment_method === paymentFilter);
    }
    // Filtrar por moeda
    filtered = filtered.filter(sale => {
      const saleCurrency = sale.original_currency || sale.currency || 'KZ';
      // Normalizar AOA para KZ
      const normalizedCurrency = saleCurrency === 'AOA' ? 'KZ' : saleCurrency;
      return normalizedCurrency === currencyFilter;
    });
    if (selectedProduct !== "todos") {
      filtered = filtered.filter(sale => sale.product_id === selectedProduct);
    }
    return filtered;
  }, [sales, searchTerm, statusFilter, paymentFilter, currencyFilter, selectedProduct]);

  // Paginação
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const displayedPaymentMethods = useMemo(() => {
    return showAllPaymentMethods ? getAllPaymentMethods() : getAngolaPaymentMethods();
  }, [showAllPaymentMethods]);
  // ✅ Executar apenas uma vez automaticamente quando o usuário estiver disponível
  // Mas permitir refresh manual através do botão "Atualizar"
  // E forçar recarregamento quando o código é atualizado
  useEffect(() => {
    if (user) {
      // Se a versão do código mudou, forçar recarregamento IMEDIATO
      if (lastCodeVersionRef.current !== CODE_VERSION) {
        console.log(`🔄 Nova versão do código detectada (${lastCodeVersionRef.current} → ${CODE_VERSION}), forçando recarregamento IMEDIATO...`);
        lastCodeVersionRef.current = CODE_VERSION;
        hasLoadedRef.current = false; // Resetar para forçar reload
        // Limpar dados antigos
        setSales([]);
        setSalesStats({
          paid: 0, pending: 0, cancelled: 0,
          paidTotal: 0, pendingTotal: 0, cancelledTotal: 0,
          totalAffiliateCommissions: 0,
          totalSellerEarnings: 0
        });
      }
      
      // Carregar se ainda não carregou
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        console.log(`🚀 Iniciando carregamento de vendas - versão ${CODE_VERSION}`);
        loadSales();
      }
    }
    // ⚠️ IMPORTANTE: loadSales NÃO deve estar nas dependências (causa loop infinito)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, CODE_VERSION]);
  
  // ✅ Handler para refresh manual (botão Atualizar)
  const handleRefresh = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    loadSales(); // Chama diretamente, não reseta hasLoadedRef
  }, [loadSales]);

  // Função para reenviar acesso ao cliente
  const resendCustomerAccess = async (sale: Sale) => {
    if (!sale || sale.status !== 'completed') {
      toast({
        title: 'Erro',
        description: 'Só é possível reenviar acesso para vendas pagas.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResendingAccessFor(sale.id);
      
      console.log('🔄 Reenviando acesso para:', sale.customer_email);
      
      const { data, error } = await supabase.functions.invoke('resend-purchase-access', {
        body: { orderIds: [sale.id] }
      });

      if (error) throw error;

      console.log('✅ Resultado do reenvio:', data);

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.success) {
          if (result.error === 'already_has_access') {
            toast({
              title: 'Acesso reenviado',
              description: `O cliente já tinha acesso — reenviamos o email para ${sale.customer_email}.`,
            });
          } else {
            toast({
              title: 'Acesso reenviado com sucesso',
              description: `Email enviado para ${sale.customer_email}${result.account_created ? ' (nova conta criada)' : ''}`,
            });
          }
        } else {
          throw new Error(result.error || 'Falha ao reenviar acesso');
        }
      } else {
        toast({
          title: 'Acesso reenviado',
          description: `Email de acesso enviado para ${sale.customer_email}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao reenviar acesso:', error);
      toast({
        title: 'Erro ao reenviar acesso',
        description: error.message || 'Não foi possível reenviar o acesso.',
        variant: 'destructive',
      });
    } finally {
      setResendingAccessFor(null);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, currencyFilter, selectedProduct]);
  
  // ✅ Recarregar quando o período mudar
  useEffect(() => {
    if (lastPeriodRef.current !== periodFilter && hasLoadedRef.current) {
      console.log(`📅 Período mudou de ${lastPeriodRef.current} para ${periodFilter}, recarregando...`);
      lastPeriodRef.current = periodFilter;
      loadSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter]);
  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) {
      return cover;
    }
    // Se a URL já inclui supabase ou http/https, usar diretamente
    if (cover.includes('supabase') || cover.startsWith('http')) {
      return cover;
    }
    // Caso contrário, assumir que é ID do Unsplash (compatibilidade)
    return `https://images.unsplash.com/${cover}`;
  };
  const formatPrice = (sale: Sale) => {
    // ✅ USAR SELLER_COMMISSION (valor líquido com 8% descontado)
    // Se não tiver seller_commission, usar amount (vendas antigas)
    let displayAmount = parseFloat(sale.seller_commission?.toString() || '0');
    
    if (displayAmount === 0) {
      // Venda antiga sem seller_commission - usar amount
      displayAmount = parseFloat(sale.amount || '0');
    }
    
    // ✅ Usar moeda original SEM conversão
    const originalCurrency = sale.original_currency || sale.currency || 'KZ';
    
    return <div className="text-right">
        <div className="font-bold text-checkout-green">
          {formatCurrencyNative(displayAmount, originalCurrency)}
        </div>
      </div>;
  };
  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
          {t('sales.approved')}
        </Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
          {t('sales.pending')}
        </Badge>;
    } else if (status === 'failed' || status === 'cancelled') {
      return <Badge variant="destructive" className="text-xs">
          {t('sales.cancelled')}
        </Badge>;
    } else if (status === 'refunded') {
      return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
          {t('sales.refunded')}
        </Badge>;
    }
    return <Badge variant="secondary" className="text-xs">
        {status}
      </Badge>;
  };
  const getPaymentMethodBadge = (paymentMethod: string) => {
    const methodText = getPaymentMethodName(paymentMethod);
    return <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <CreditCard className="h-3 w-3" />
        <span>{methodText}</span>
      </div>;
  };
  
  const getPaymentMethodIconOnly = (paymentMethod: string) => {
    const methodLower = paymentMethod?.toLowerCase() || '';
    
    if (methodLower.includes('express') || methodLower.includes('multicaixa express')) {
      return <img src="/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png" alt="Multicaixa Express" className="h-5 w-auto" />;
    } else if (methodLower.includes('reference') || methodLower.includes('referencia') || methodLower.includes('multicaixa')) {
      return <img src="/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png" alt="Referência Multicaixa" className="h-5 w-auto" />;
    } else if (methodLower.includes('transfer') || methodLower.includes('transferencia')) {
      return <img src="/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png" alt="Transferência" className="h-5 w-auto" />;
    } else if (methodLower.includes('emola')) {
      return <img src="/lovable-uploads/70243346-a1ea-47dc-8ef7-abbd4a3d66a4.png" alt="eMola" className="h-5 w-auto" />;
    } else if (methodLower.includes('mpesa')) {
      return <img src="/lovable-uploads/eb1d9ab5-b83b-4c85-9028-61693547d5c0.png" alt="M-Pesa" className="h-5 w-auto" />;
    } else if (methodLower.includes('card') || methodLower.includes('stripe')) {
      return <img src="/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png" alt="Cartão" className="h-5 w-auto" />;
    } else if (methodLower.includes('klarna')) {
      return <img src="/lovable-uploads/86f49c10-3542-43ce-89aa-cbef30d98480.png" alt="Klarna" className="h-5 w-auto" />;
    } else if (methodLower.includes('multibanco')) {
      return <img src="/lovable-uploads/eaa553f2-386c-434b-8096-7243db77886e.png" alt="Multibanco" className="h-5 w-auto" />;
    } else if (methodLower.includes('mbway')) {
      return <img src="/assets/mbway-logo.png" alt="MB WAY" className="h-5 w-auto" />;
    } else if (methodLower.includes('balance') || methodLower.includes('saldo') || methodLower.includes('kambapay')) {
      return <DollarSign className="h-4 w-4 text-green-600" />;
    }
    return <Banknote className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getPaymentMethodLabel = (paymentMethod: string) => {
    const methodLower = paymentMethod?.toLowerCase() || '';
    
    if (methodLower.includes('express') || methodLower.includes('multicaixa express')) {
      return 'Multicaixa Express';
    } else if (methodLower.includes('reference') || methodLower.includes('referencia')) {
      return 'Referência Multicaixa';
    } else if (methodLower.includes('transfer') || methodLower.includes('transferencia')) {
      return 'Transferência Bancária';
    } else if (methodLower.includes('emola')) {
      return 'eMola';
    } else if (methodLower.includes('mpesa')) {
      return 'M-Pesa';
    } else if (methodLower.includes('card') || methodLower.includes('stripe')) {
      return 'Cartão de Crédito/Débito';
    } else if (methodLower.includes('klarna')) {
      return 'Klarna';
    } else if (methodLower.includes('multibanco')) {
      return 'Multibanco';
    } else if (methodLower.includes('mbway')) {
      return 'MB WAY';
    } else if (methodLower.includes('balance') || methodLower.includes('saldo') || methodLower.includes('kambapay')) {
      return 'Saldo KambaPay';
    }
    return paymentMethod || 'Desconhecido';
  };
  
  const getPaymentMethodIconWithTooltip = (paymentMethod: string) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-pointer inline-flex">
              {getPaymentMethodIconOnly(paymentMethod)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getPaymentMethodLabel(paymentMethod)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  // ✅ Formatar valor na moeda original SEM conversão
  const formatCurrencyValue = (amount: number, currency: string = 'KZ') => {
    return formatCurrencyNative(amount, currency);
  };
  const exportSalesToCSV = () => {
    if (filteredSales.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Não há vendas para exportar com os filtros aplicados",
        variant: "destructive"
      });
      return;
    }

    // Cabeçalhos do CSV
    const headers = ['ID do Pedido', 'Cliente', 'Email', 'Telefone', 'Produto', 'Valor', 'Moeda', 'Status', 'Método de Pagamento', 'Data da Venda', 'Tipo de Venda', 'Comissão Afiliado', 'Código Afiliado'];

    // Converter dados para CSV
    const csvData = filteredSales.map(sale => [sale.order_id, sale.customer_name, sale.customer_email, sale.customer_phone || '', sale.products?.name || 'N/A', sale.original_amount || sale.amount, sale.original_currency || sale.currency, sale.status === 'completed' ? 'Paga' : sale.status === 'pending' ? 'Pendente' : 'Cancelada', getPaymentMethodName(sale.payment_method), new Date(sale.created_at).toLocaleDateString('pt-BR'), sale.sale_type === 'affiliate' ? 'Comissão Afiliado' : sale.sale_type === 'recovered' ? 'Recuperada' : sale.affiliate_code ? 'Com Afiliado' : 'Direta', sale.affiliate_commission ? formatCurrencyValue(sale.affiliate_commission) : '', sale.affiliate_code || '']);

    // Criar conteúdo CSV
    const csvContent = [headers, ...csvData].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    // Nome do arquivo com filtros aplicados
    let fileName = 'vendas';
    if (statusFilter !== 'todos') {
      fileName += `_${statusFilter}`;
    }
    if (paymentFilter !== 'todos') {
      fileName += `_${paymentFilter}`;
    }
    if (selectedProduct !== 'todos') {
      const product = sales.find(s => s.product_id === selectedProduct);
      if (product?.products?.name) {
        fileName += `_${product.products.name.replace(/\s+/g, '_')}`;
      }
    }
    fileName += `_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Exportação concluída",
      description: `${filteredSales.length} vendas exportadas com sucesso`
    });
  };
  // ✅ Calcular estatísticas filtradas por moeda
  // IMPORTANTE: Apenas vendas com original_currency preenchido são consideradas na moeda filtrada
  // Vendas antigas sem original_currency são tratadas como KZ
  const filteredStats = useMemo(() => {
    const currencyFilteredSales = sales.filter(sale => {
      // Se não tem original_currency, é venda antiga → tratar como KZ
      if (!sale.original_currency) {
        return currencyFilter === 'KZ';
      }
      const normalizedCurrency = sale.original_currency === 'AOA' ? 'KZ' : sale.original_currency;
      return normalizedCurrency === currencyFilter;
    });
    
    let paid = 0, pending = 0, cancelled = 0;
    let paidTotal = 0, pendingTotal = 0, cancelledTotal = 0;
    
    currencyFilteredSales.forEach(sale => {
      const amount = parseFloat(sale.seller_commission?.toString() || sale.amount || '0');
      
      if (sale.status === 'completed') {
        paid++;
        paidTotal += amount;
      } else if (sale.status === 'pending') {
        pending++;
        pendingTotal += amount;
      } else if (sale.status === 'failed' || sale.status === 'cancelled') {
        cancelled++;
        cancelledTotal += amount;
      }
    });
    
    return {
      ...salesStats,
      paid,
      pending,
      cancelled,
      paidTotal,
      pendingTotal,
      cancelledTotal
    };
  }, [sales, salesStats, currencyFilter]);

  // ✅ Formatar moeda baseado no filtro para os cards de stats (SEM conversão)
  const formatCurrencyForStats = useCallback((value: number) => {
    return formatCurrencyNative(value, currencyFilter);
  }, [currencyFilter]);

  return <OptimizedPageWrapper skeletonVariant="list">
      {loading ? <PageSkeleton variant="sales" /> : <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Header com total de vendas e filtro de moeda */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('sales.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {totalCount > 0 ? `${totalCount} ${t('sales.registered')}` : t('sales.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Moeda" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="KZ">Kwanza (KZ)</SelectItem>
              <SelectItem value="EUR">Euro (EUR)</SelectItem>
              <SelectItem value="USD">Dollar (USD)</SelectItem>
              <SelectItem value="GBP">Libra (GBP)</SelectItem>
              <SelectItem value="MZN">Metical (MZN)</SelectItem>
              <SelectItem value="BRL">Real (BRL)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportSalesToCSV} disabled={filteredSales.length === 0} className="text-xs md:text-sm text-foreground">
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
         <HighlightedCard highlightColor="green">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">
              {t('sales.paidSales')}
            </HighlightedCardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {formatCurrencyForStats(filteredStats.paidTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredStats.paid} {t('sales.confirmed')}
            </p>
          </HighlightedCardContent>
        </HighlightedCard>

        <HighlightedCard highlightColor="yellow">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">
              {t('sales.pendingSales')}
            </HighlightedCardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold text-yellow-600">
              {formatCurrencyForStats(filteredStats.pendingTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredStats.pending} {t('sales.awaitingConfirmation')}
            </p>
          </HighlightedCardContent>
        </HighlightedCard>

        <HighlightedCard highlightColor="orange">
          <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <HighlightedCardTitle className="text-sm font-medium">
              Vendas Canceladas
            </HighlightedCardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </HighlightedCardHeader>
          <HighlightedCardContent>
            <div className="text-2xl md:text-3xl font-bold text-red-600">
              {formatCurrencyForStats(filteredStats.cancelledTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesStats.cancelled} vendas não processadas
            </p>
          </HighlightedCardContent>
        </HighlightedCard>
      </div>

      {/* Payment Method Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Métodos de Pagamento</h3>
          <div className="flex items-center space-x-2">
            <Label htmlFor="show-all-methods" className="text-sm text-foreground">
              Mostrar todos os métodos
            </Label>
            <Switch id="show-all-methods" checked={showAllPaymentMethods} onCheckedChange={setShowAllPaymentMethods} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
          {displayedPaymentMethods.map(method => <Card key={method.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                  {method.name}
                </CardTitle>
                <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold">
                  {salesStats[method.id] || 0}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Vendas
                </p>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* ✅ Filtro de Período */}
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full md:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Buscar por cliente, email, produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 text-xs md:text-sm" />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="completed">Pagas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="todos">Todos os métodos</SelectItem>
                {getAllPaymentMethods().map(method => <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>


            <div className="w-full md:w-48">
              <ProductFilter 
                value={selectedProduct} 
                onValueChange={setSelectedProduct}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      {filteredSales.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
            <div className="text-center space-y-3 md:space-y-4">
              <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold">
                  {sales.length === 0 ? 'Nenhuma venda realizada' : 'Nenhuma venda encontrada'}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {sales.length === 0 ? 'Suas vendas aparecerão aqui quando alguém comprar seus produtos' : 'Tente ajustar os filtros para encontrar o que procura'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card> : <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {paginatedSales.map(sale => <Card key={sale.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={getProductImage(sale.products?.cover || '')} alt={sale.products?.name || 'Produto'} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4">
                           <div className="space-y-1">
                            <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                              {sale.products?.name || 'Produto'}
                            </h3>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              Pedido #{sale.order_id}
                          </p>
                          <div className="space-y-0.5 md:space-y-1">
                            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                              <User className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="truncate">{sale.customer_name}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col lg:items-end gap-1.5">
                          {/* Linha 1: Valor + Status */}
                          <div className="flex items-center gap-2">
                            {sale.sale_type === 'affiliate' ? (
                              <span className="font-bold text-base md:text-lg text-blue-600">
                                {formatCurrencyValue(parseFloat(sale.affiliate_commission?.toString() || '0'), sale.original_currency || sale.currency)}
                              </span>
                            ) : sale.sale_type === 'recovered' ? (
                              <span className="font-bold text-base md:text-lg text-green-600">
                                {formatCurrencyValue(parseFloat(sale.amount) * 0.8, sale.currency)}
                              </span>
                            ) : sale.affiliate_code && sale.seller_commission ? (
                              <span className="font-bold text-base md:text-lg text-green-600">
                                {formatCurrencyValue(parseFloat(sale.seller_commission?.toString() || '0'), sale.original_currency || sale.currency)}
                              </span>
                            ) : (
                              <span className="font-bold text-base md:text-lg">
                                {formatPrice(sale)}
                              </span>
                            )}
                            {getStatusBadge(sale.status)}
                          </div>
                          
                          {/* Linha 2: Data + Método de pagamento */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            {getPaymentMethodIconWithTooltip(sale.payment_method)}
                          </div>
                          
                          {/* Linha 3: Badges (País + Tipo de venda) */}
                          <div className="flex items-center gap-1">
                            {(() => {
                              const countryInfo = sale.customer_country 
                                ? getCountryFlag(sale.customer_country)
                                : getCountryByPaymentMethod(sale.payment_method);
                              return (
                                <Badge variant="outline" className="text-xs">
                                  <span className="mr-1">{countryInfo.flag}</span>
                                  {countryInfo.name}
                                </Badge>
                              );
                            })()}
                            {sale.sale_type === 'module' && (
                              <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                                Módulo
                              </Badge>
                            )}
                            {sale.sale_type === 'affiliate' && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Afiliado
                              </Badge>
                            )}
                            {sale.sale_type === 'recovered' && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                -20%
                              </Badge>
                            )}
                            {sale.sale_type !== 'affiliate' && sale.affiliate_code && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                C/ Afiliado
                              </Badge>
                            )}
                          </div>
                          
                          {/* Botão Ver Detalhes com Dialog */}
                          <Dialog open={detailsDialogSaleId === sale.id} onOpenChange={(open) => setDetailsDialogSaleId(open ? sale.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                                <Eye className="h-3 w-3 mr-1" />
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Venda</DialogTitle>
                                <DialogDescription>
                                  Informações completas do cliente e desta venda.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {/* Info do Produto */}
                                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                    <img src={getProductImage(sale.products?.cover || '')} alt={sale.products?.name || 'Produto'} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{sale.products?.name || 'Produto'}</h4>
                                    <p className="text-xs text-muted-foreground">Pedido #{sale.order_id}</p>
                                  </div>
                                </div>
                                
                                {/* Dados do Cliente */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Dados do Cliente</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span>{sale.customer_name}</span>
                                    </div>
                                    {sale.customer_email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="break-all">{sale.customer_email}</span>
                                      </div>
                                    )}
                                    {sale.customer_phone && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">📞</span>
                                        <span>{sale.customer_phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Dados do Pagamento */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Dados do Pagamento</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Valor:</span>
                                      <span className="font-bold">{formatPrice(sale)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Status:</span>
                                      {getStatusBadge(sale.status)}
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Método:</span>
                                      <div className="flex items-center gap-1">
                                        {getPaymentMethodIconWithTooltip(sale.payment_method)}
                                      </div>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Data:</span>
                                      <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')} às {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Order Bumps no Dialog */}
                                {sale.order_bump_data && Array.isArray(sale.order_bump_data) && sale.order_bump_data.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Order Bumps ({sale.order_bump_data.length})</h4>
                                    <div className="space-y-2">
                                      {sale.order_bump_data.map((bump: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded overflow-hidden bg-background flex-shrink-0">
                                              {bump.bump_product_image && (
                                                <img 
                                                  src={getProductImage(bump.bump_product_image)} 
                                                  alt={bump.bump_product_name || 'Order Bump'} 
                                                  className="w-full h-full object-cover" 
                                                />
                                              )}
                                            </div>
                                            <span className="font-medium">{bump.bump_product_name || 'Order Bump'}</span>
                                          </div>
                                          <span className="font-bold text-green-600">
                                            {formatCurrencyValue(parseFloat(bump.bump_product_price || '0'))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Botão Reenviar Acesso no Dialog */}
                                {sale.status === 'completed' && (
                                  <div className="pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setDetailsDialogSaleId(null); // Fecha o modal de detalhes
                                        setSelectedSaleForResend(sale);
                                        setResendAccessDialogOpen(true);
                                      }}
                                      className="w-full"
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Reenviar Acesso ao Cliente
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({filteredSales.length} vendas encontradas)
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({
                    length: Math.min(totalPages, 5)
                  }, (_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === currentPage;
                    return <Button key={pageNum} variant={isActive ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 p-0">
                            {pageNum}
                          </Button>;
                  })}
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                      Próxima
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>}
        </div>}
      </div>}

      {/* Diálogo de Reenviar Acesso */}
      <ResendAccessDialog
        open={resendAccessDialogOpen}
        onOpenChange={setResendAccessDialogOpen}
        sale={selectedSaleForResend}
      />
    </OptimizedPageWrapper>;
}