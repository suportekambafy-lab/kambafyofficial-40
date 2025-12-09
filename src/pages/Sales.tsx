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
import { ShoppingCart, Search, RefreshCw, CheckCircle, Clock, XCircle, CreditCard, Banknote, Building, Calendar, Package, User, DollarSign, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useToast } from "@/hooks/use-toast";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import professionalManImage from "@/assets/professional-man.jpg";
import { getAllPaymentMethods, getPaymentMethodName, getAngolaPaymentMethods, getCountryByPaymentMethod } from "@/utils/paymentMethods";
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { useCurrencyToCountry } from "@/hooks/useCurrencyToCountry";
import { ProductFilter } from '@/components/ProductFilter';

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
  const [selectedProduct, setSelectedProduct] = useState("todos");
  const [periodFilter, setPeriodFilter] = useState("30"); // ✅ Padrão: 30 dias
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(200); // Mostrar todas as vendas
  const [showAllPaymentMethods, setShowAllPaymentMethods] = useState(false);
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
    if (selectedProduct !== "todos") {
      filtered = filtered.filter(sale => sale.product_id === selectedProduct);
    }
    return filtered;
  }, [sales, searchTerm, statusFilter, paymentFilter, selectedProduct]);

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, selectedProduct]);
  
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
    
    const originalCurrency = sale.original_currency || sale.currency;
    
    return <div className="text-right">
        <div className="font-bold text-checkout-green">
          {formatPriceForSeller(displayAmount, originalCurrency)}
        </div>
        {originalCurrency !== 'KZ'}
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
  const formatCurrency = (amount: number, currency: string = 'KZ') => {
    return formatPriceForSeller(amount, currency);
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
    const csvData = filteredSales.map(sale => [sale.order_id, sale.customer_name, sale.customer_email, sale.customer_phone || '', sale.products?.name || 'N/A', sale.original_amount || sale.amount, sale.original_currency || sale.currency, sale.status === 'completed' ? 'Paga' : sale.status === 'pending' ? 'Pendente' : 'Cancelada', getPaymentMethodName(sale.payment_method), new Date(sale.created_at).toLocaleDateString('pt-BR'), sale.sale_type === 'affiliate' ? 'Comissão Afiliado' : sale.sale_type === 'recovered' ? 'Recuperada' : sale.affiliate_code ? 'Com Afiliado' : 'Direta', sale.affiliate_commission ? formatCurrency(sale.affiliate_commission) : '', sale.affiliate_code || '']);

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
  return <OptimizedPageWrapper skeletonVariant="list">
      {loading ? <PageSkeleton variant="sales" /> : <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Header com total de vendas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('sales.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {totalCount > 0 ? `${totalCount} ${t('sales.registered')}` : t('sales.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportSalesToCSV} disabled={filteredSales.length === 0} className="text-xs md:text-sm text-foreground">
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            {t('common.export')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs md:text-sm text-foreground">
            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            {t('common.refresh')}
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
              {formatCurrency(salesStats.paidTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesStats.paid} {t('sales.confirmed')}
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
              {formatCurrency(salesStats.pendingTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesStats.pending} {t('sales.awaitingConfirmation')}
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
              {formatCurrency(salesStats.cancelledTotal)}
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
              <SelectContent>
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
                            {sale.customer_email && (
                              <div className="text-xs text-muted-foreground pl-3 md:pl-5 truncate">
                                {sale.customer_email}
                              </div>
                            )}
                            {sale.customer_phone && (
                              <div className="text-xs text-muted-foreground pl-3 md:pl-5">
                                {sale.customer_phone}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col lg:items-end gap-2">
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {sale.sale_type === 'affiliate' ? <div>
                                  <div className="font-bold text-base md:text-lg text-blue-600">
                                    {formatCurrency(parseFloat(sale.affiliate_commission?.toString() || '0'))}
                                  </div>
                                   <div className="text-xs text-muted-foreground">
                                     {formatPrice(sale)}
                                   </div>
                                </div> : sale.sale_type === 'recovered' ? <div>
                                   <div className="font-bold text-base md:text-lg text-green-600">
                                     {formatCurrency(parseFloat(sale.amount) * 0.8, sale.currency)}
                                   </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatPrice(sale)}
                                    </div>
                                 </div> : sale.affiliate_code && sale.seller_commission ? <div>
                                  <div className="font-bold text-base md:text-lg text-green-600">
                                    {formatCurrency(parseFloat(sale.seller_commission?.toString() || '0'))}
                                  </div>
                                   <div className="text-xs text-muted-foreground">
                                     {formatPrice(sale)}
                                   </div>
                                </div> : <div className="font-bold text-base md:text-lg">
                                   {formatPrice(sale)}
                                 </div>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(sale.status)}
                              {getPaymentMethodBadge(sale.payment_method)}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(sale.created_at).toLocaleDateString('pt-BR')} às {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {sale.sale_type === 'module' ? <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                                <User className="h-3 w-3 mr-1" />
                                Pagamento de Módulo
                              </Badge> : sale.sale_type === 'affiliate' ? <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                <User className="h-3 w-3 mr-1" />
                                Comissão Afiliado
                              </Badge> : sale.sale_type === 'recovered' ? <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                <User className="h-3 w-3 mr-1" />
                                Recuperado (-20%)
                              </Badge> : sale.affiliate_code ? <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <User className="h-3 w-3 mr-1" />
                                Com Afiliado
                              </Badge> : null}
                            {(() => {
                          const countryInfo = getCountryByPaymentMethod(sale.payment_method);
                          return <Badge variant="outline" className="text-xs">
                                  <span className="mr-1">{countryInfo.flag}</span>
                                  {countryInfo.name}
                                </Badge>;
                        })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Bumps */}
                  {sale.order_bump_data && Array.isArray(sale.order_bump_data) && sale.order_bump_data.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Order Bumps ({sale.order_bump_data.length})
                      </p>
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
                              {formatCurrency(parseFloat(bump.bump_product_price || '0'))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
    </OptimizedPageWrapper>;
}