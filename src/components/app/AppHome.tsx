import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Home, BarChart3, Package, User, TrendingUp, LayoutDashboard, LogOut, ChevronLeft, ShoppingCart, Settings, Bell, Trash2, Info, ChevronRight, Wallet, Clock, ArrowDownToLine, Sun, Moon, Menu, X, Calendar as CalendarIcon, Camera, WifiOff, MessageCircle } from 'lucide-react';
import kambafyIconGreen from '@/assets/kambafy-icon-green.png';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { countTotalSales } from '@/utils/orderUtils';
import { ComposedChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useKambaLevels } from '@/hooks/useKambaLevels';
import { WithdrawalModal } from '@/components/WithdrawalModal';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNativePush } from '@/hooks/useNativePush';
import { useHaptics } from '@/hooks/useHaptics';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { useAppState } from '@/hooks/useAppState';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { configureStatusBar } from '@/utils/nativeService';
import { ModernSalesChart } from '@/components/modern/ModernSalesChart';
import { AppCrispChat, openCrispChat } from '@/components/app/AppCrispChat';

export function AppHome() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, isDark } = useSellerTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  // Native hooks
  const nativePush = useNativePush({
    onNotificationReceived: (notification) => {
      console.log('Native notification received:', notification);
    }
  });
  const { triggerHaptic } = useHaptics();
  const { pickPhoto } = useNativeCamera();
  const { isActive } = useAppState();
  const { isOnline } = useNetworkStatus();
  
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0
  });
  const [statsUnfiltered, setStatsUnfiltered] = useState({
    totalSales: 0,
    totalRevenue: 0
  });
  const [financialData, setFinancialData] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    totalWithdrawn: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    full_name: '',
    email: '',
    bio: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all' | 'custom'>('7d');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [totalRevenueUnfiltered, setTotalRevenueUnfiltered] = useState(0); // Para a meta Kamba
  const [orders, setOrders] = useState<any[]>([]);
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  
  // Sistema de conquistas Kamba - metas dinâmicas (baseado no total sem filtros)
  const { currentLevel, nextLevel, progress: kambaProgress } = useKambaLevels(totalRevenueUnfiltered);
  const monthlyGoal = nextLevel?.threshold || 1000000; // Meta dinâmica baseada no próximo nível
  const goalProgress = kambaProgress;

  const handlePushToggle = async (enabled: boolean) => {
    triggerHaptic('light');
    
    if (enabled) {
      const success = await nativePush.requestPermission();
      
      if (success) {
        setPushEnabled(true);
        
        // Enviar notificação de teste
        await nativePush.sendLocalNotification(
          'Notificações Ativadas! 🎉',
          'Você receberá notificações sobre suas vendas e produtos.'
        );
        
        localStorage.setItem('push_notifications_enabled', 'true');
        
        toast({
          title: "Notificações Ativadas",
          description: "Você receberá notificações sobre vendas e produtos"
        });
        
        triggerHaptic('success');
      } else {
        setPushEnabled(false);
        toast({
          title: "Permissão Negada",
          description: "Habilite nas configurações do dispositivo",
          variant: "destructive"
        });
        triggerHaptic('error');
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('push_notifications_enabled', 'false');
      toast({
        title: "Notificações Desativadas",
        description: "Você não receberá mais notificações push"
      });
    }
  };

  useEffect(() => {
    // Verificar se as notificações já estão permitidas ao carregar
    const savedPreference = localStorage.getItem('push_notifications_enabled');
    if (nativePush.permissionStatus === 'granted' && savedPreference === 'true') {
      setPushEnabled(true);
    }
  }, [nativePush.permissionStatus]);

  // Auto-refresh quando app volta ao foreground
  useEffect(() => {
    if (isActive && user) {
      console.log('App active - refreshing data...');
      loadStats();
    }
  }, [isActive]);

  // Atualizar Status Bar quando tema mudar
  useEffect(() => {
    configureStatusBar(isDark);
  }, [isDark]);

  // Device tracking já é feito no login, não precisa duplicar aqui

  useEffect(() => {
    loadStats();
    loadProfile();
  }, [user, timeFilter, productFilter, customDateRange]);


  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, bio')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setProfileAvatar(profile.avatar_url || '');
        setEditingProfile({
          full_name: profile.full_name || '',
          email: user.email || '',
          bio: profile.bio || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingProfile.full_name,
          bio: editingProfile.bio
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil Atualizado",
        description: "Suas informações foram salvas com sucesso"
      });

      setShowEditProfile(false);
      loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive"
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, status, price, sales, cover')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Products error:', productsError);
        setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = products?.map(p => p.id) || [];
      const activeProducts = products?.filter(p => p.status === 'Ativo') || [];
      
      // Store products for display
      setProducts(products || []);

      // ✅ Buscar códigos de afiliado do usuário (igual à Web)
      const { data: userAffiliateCodes } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'aprovado');

      const affiliateCodes = userAffiliateCodes?.map(a => a.affiliate_code).filter(Boolean) || [];

      if (productIds.length === 0 && affiliateCodes.length === 0) {
        setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
        setTotalRevenueUnfiltered(0);
        setLoading(false);
        return;
      }

      // ✅ PRIMEIRO: Buscar TODAS as vendas (produtos próprios + afiliados) para Meta Kamba
      const ownOrdersMetaPromise = productIds.length > 0 
        ? supabase
            .from('orders')
            .select('amount, seller_commission, currency, created_at, payment_method, order_id')
            .in('product_id', productIds)
            .eq('status', 'completed')
            .neq('payment_method', 'member_access')
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] });

      const affiliateOrdersMetaPromise = affiliateCodes.length > 0
        ? supabase
            .from('orders')
            .select('amount, affiliate_commission, currency, created_at, payment_method, order_id')
            .in('affiliate_code', affiliateCodes)
            .eq('status', 'completed')
            .neq('payment_method', 'member_access')
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] });

      const [ownOrdersMeta, affiliateOrdersMeta] = await Promise.all([
        ownOrdersMetaPromise,
        affiliateOrdersMetaPromise
      ]);

      // ✅ Combinar vendas próprias + comissões de afiliado
      const allOrdersForMeta = [
        ...(ownOrdersMeta.data || []),
        ...(affiliateOrdersMeta.data || [])
      ];

      let totalRevenueForMeta = 0;
      allOrdersForMeta.forEach(order => {
        let amount = parseFloat(
          order.seller_commission?.toString() || 
          order.affiliate_commission?.toString() || 
          order.amount || 
          '0'
        );
        
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        
        totalRevenueForMeta += amount;
      });

      setTotalRevenueUnfiltered(totalRevenueForMeta);
      
      // Salvar stats não filtrados para o resumo financeiro
      setStatsUnfiltered({
        totalSales: countTotalSales(allOrdersForMeta),
        totalRevenue: totalRevenueForMeta
      });

      // ✅ SEGUNDO: Buscar vendas COM FILTROS (produtos próprios + afiliados)
      let ownOrdersQuery = supabase
        .from('orders')
        .select('amount, seller_commission, currency, created_at, payment_method, product_id, order_id')
        .in('product_id', productIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      let affiliateOrdersQuery = supabase
        .from('orders')
        .select('amount, affiliate_commission, currency, created_at, payment_method, order_id')
        .in('affiliate_code', affiliateCodes)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      // Aplicar filtros de tempo em ambas as queries
      if (timeFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', today.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', today.toISOString());
      } else if (timeFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
      } else if (timeFilter === 'custom' && customDateRange.from) {
        const fromDate = new Date(customDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', fromDate.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', fromDate.toISOString());
        
        if (customDateRange.to) {
          const toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
          ownOrdersQuery = ownOrdersQuery.lte('created_at', toDate.toISOString());
          affiliateOrdersQuery = affiliateOrdersQuery.lte('created_at', toDate.toISOString());
        }
      } else if (timeFilter !== 'all') {
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[timeFilter as '7d' | '30d' | '90d'];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', startDate.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', startDate.toISOString());
      }

      // Filtro de produto (só para vendas próprias)
      if (productFilter !== 'all') {
        ownOrdersQuery = ownOrdersQuery.eq('product_id', productFilter);
      }

      const [ownOrdersResult, affiliateOrdersResult] = await Promise.all([
        productIds.length > 0 ? ownOrdersQuery.order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
        affiliateCodes.length > 0 ? affiliateOrdersQuery.order('created_at', { ascending: true }) : Promise.resolve({ data: [] })
      ]);

      const orders = [
        ...(ownOrdersResult.data || []),
        ...(affiliateOrdersResult.data || [])
      ];

      let totalRevenue = 0;
      const dailySales: Record<string, { date: string; sales: number; revenue: number }> = {};
      
      // Inicializar últimos 7 dias
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('pt-AO', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        dailySales[dateKey] = {
          date: displayDate,
          sales: 0,
          revenue: 0
        };
      }
      
      orders.forEach(order => {
        // ✅ Usar comissão correta (seller ou affiliate)
        let amount = parseFloat(
          order.seller_commission?.toString() || 
          order.affiliate_commission?.toString() || 
          order.amount || 
          '0'
        );
        
        // Converter para KZ se necessário
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        
        totalRevenue += amount;
        
        // Agrupar por dia
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dailySales[orderDate]) {
          dailySales[orderDate].sales += 1;
          dailySales[orderDate].revenue += amount;
        }
      });

      // Preparar dados do gráfico
      const chartData = Object.values(dailySales);

      setStats({
        totalSales: countTotalSales(orders),
        totalRevenue,
        totalProducts: activeProducts.length
      });
      setSalesData(chartData);
      
      // ✅ Passar TODAS as vendas (próprias + afiliados) para cálculo financeiro
      await loadFinancialData(allOrdersForMeta, productIds);
      
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ totalSales: 0, totalRevenue: 0, totalProducts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async (orders: any[], productIds: string[]) => {
    if (!user) return;

    try {
      console.log('💰 [AppHome] Calculando saldos IDÊNTICOS ao Financial.tsx');

      // ✅ FONTE ÚNICA DE VERDADE: Buscar saldo real do customer_balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError) {
        console.error('Error loading balance:', balanceError);
      }

      const currentBalance = balanceData?.balance || 0;

      // Buscar withdrawal_requests
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Vendas recuperadas removidas - sistema de recuperação desabilitado
      const recoveredOrderIds = new Set();

      // ✅ Processar orders para calcular earning_amount (igual ao Financial.tsx)
      const processedOrders = orders.map(order => {
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
          earning_amount: earning
        };
      });

      // Calcular total de saques aprovados e pendentes (deduzir imediatamente do saldo)
      const totalWithdrawnAmount = withdrawals
        ?.filter(w => w.status === 'aprovado' || w.status === 'pendente')
        .reduce((sum, w) => sum + (parseFloat(w.amount?.toString() || '0')), 0) || 0;

      // ✅ USAR o saldo real do customer_balances como fonte de verdade
      const finalAvailableBalance = Math.max(0, currentBalance - totalWithdrawnAmount);

      // Calcular saldo pendente baseado nas vendas dos últimos 3 dias (igual ao Financial.tsx)
      const now = new Date();
      let pendingBalance = 0;

      processedOrders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const releaseDate = new Date(orderDate);
        releaseDate.setDate(orderDate.getDate() + 3);
        
        const amount = order.earning_amount;
        
        // Se ainda não liberou (dentro de 3 dias)
        if (now < releaseDate) {
          pendingBalance += amount;
        }
      });
      
      console.log('💵 [AppHome] Saldos calculados (fonte: customer_balances):', {
        disponivel: finalAvailableBalance,
        pendente: pendingBalance,
        totalSacado: totalWithdrawnAmount,
        balanceReal: currentBalance
      });

      setFinancialData({
        availableBalance: finalAvailableBalance,
        pendingBalance,
        totalWithdrawn: totalWithdrawnAmount
      });

      // Buscar histórico de saques
      setWithdrawalHistory(withdrawals || []);

    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const loadSalesHistory = async () => {
    if (!user) return;

    try {
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const productIds = products?.map(p => p.id) || [];

      // Buscar member_areas do usuário para pegar module_payments
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', user.id);

      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];

      // Query para orders normais
      let ordersQuery = supabase
        .from('orders')
        .select('*, products(name, cover)')
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      // Query para module_payments
      let modulePaymentsQuery = supabase
        .from('module_payments')
        .select('*, modules(title, cover_image_url)')
        .in('member_area_id', memberAreaIds)
        .order('created_at', { ascending: false });

      // Aplicar filtro de status em ambas queries
      if (salesStatusFilter !== 'all') {
        ordersQuery = ordersQuery.eq('status', salesStatusFilter);
        modulePaymentsQuery = modulePaymentsQuery.eq('status', salesStatusFilter);
      }

      const [ordersResult, modulePaymentsResult] = await Promise.all([
        ordersQuery,
        modulePaymentsQuery
      ]);
      
      if (ordersResult.error) {
        console.error('Error loading orders:', ordersResult.error);
      }

      if (modulePaymentsResult.error) {
        console.error('Error loading module payments:', modulePaymentsResult.error);
      }

      // Combinar orders e module_payments em formato unificado
      const regularOrders = (ordersResult.data || []).map(order => ({
        ...order,
        source: 'product' // Marcar como venda de produto normal
      }));

      const moduleOrders = (modulePaymentsResult.data || []).map(payment => ({
        id: payment.id,
        order_id: payment.order_id,
        customer_name: payment.student_name,
        customer_email: payment.student_email,
        customer_phone: null,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        products: payment.modules ? {
          name: payment.modules.title,
          cover: payment.modules.cover_image_url
        } : null,
        source: 'module', // Marcar como venda de módulo
        reference_number: payment.reference_number,
        entity: payment.entity,
        due_date: payment.due_date
      }));

      // Combinar e ordenar por data
      const allOrders = [...regularOrders, ...moduleOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading sales history:', error);
      setOrders([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales-history') {
      loadSalesHistory();
    }
  }, [activeTab, salesStatusFilter, user]);

  const renderContent = () => {
    if (showNotifications) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-foreground">Notificações</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(false)}
            >
              Fechar
            </Button>
          </div>

          {notifications.length === 0 ? (
              <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-foreground">Sem notificações</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Você está em dia com todas as suas atividades
                </p>
                <p className="text-xs text-muted-foreground">
                  🔔 Dica: As notificações são sincronizadas em tempo real com a versão web
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                // Mapear tipos do contexto para estilos
                const getNotificationStyle = (type: string) => {
                  switch(type) {
                    case 'sale':
                    case 'affiliate':
                      return {
                        bgColor: 'bg-green-500/10',
                        iconColor: 'text-green-600 dark:text-green-400'
                      };
                    case 'withdrawal':
                      return {
                        bgColor: 'bg-blue-500/10',
                        iconColor: 'text-blue-600 dark:text-blue-400'
                      };
                    default:
                      return {
                        bgColor: 'bg-yellow-500/10',
                        iconColor: 'text-yellow-600 dark:text-yellow-400'
                      };
                  }
                };
                
                const style = getNotificationStyle(notification.type);
                
                return (
                <Card key={notification.id} className="overflow-hidden border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${style.bgColor}`}>
                        <Bell className={`h-5 w-5 ${style.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString('pt-AO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (showEditProfile) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Dados Pessoais</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditProfile(false)}
            >
              Fechar
            </Button>
          </div>

          <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={editingProfile.full_name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, full_name: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editingProfile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editingProfile.bio}
                  onChange={(e) => setEditingProfile({ ...editingProfile, bio: e.target.value })}
                  placeholder="Conte um pouco sobre você..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (activeTab) {
      case 'products':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold text-foreground">Meus Produtos</h2>
              <span className="text-sm text-muted-foreground">{products.length}</span>
            </div>

            {loading ? (
              <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : products.length === 0 ? (
              <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-foreground">Nenhum produto</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Você ainda não criou produtos. Use a versão desktop para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        {/* Product Image */}
                        <div className="relative flex-shrink-0">
                          {product.cover ? (
                            <img 
                              src={product.cover} 
                              alt={product.name}
                              className="w-24 h-24 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <Package className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          {product.status === 'Ativo' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-base text-foreground line-clamp-2 mb-2">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                product.status === 'Ativo' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {product.status}
                              </span>
                            </div>
                          </div>

                          {/* Price and Sales */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Preço</p>
                              <p className="font-bold text-base text-foreground">
                                {formatPriceForSeller(parseFloat(product.price || '0'), 'KZ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-0.5">Vendas</p>
                              <p className="font-bold text-base text-primary">
                                {product.sales || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      💡 Para editar produtos, acesse a versão desktop
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      
      case 'stats':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2 text-foreground">Financeiro</h2>
            
            {/* Financial Cards */}
            <div className="space-y-3">
              <Card className="overflow-hidden rounded-xl border-l-[6px] shadow-sm bg-card" style={{ borderLeftColor: 'hsl(142, 76%, 36%)' }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Disponível para Saque</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {(() => {
                        console.log('💰 [AppHome - UI] Exibindo saldo:', {
                          availableBalance: financialData.availableBalance,
                          formatted: formatPriceForSeller(financialData.availableBalance, 'KZ')
                        });
                        return formatPriceForSeller(financialData.availableBalance, 'KZ');
                      })()}
                    </div>
                <Button 
                  onClick={() => {
                    triggerHaptic('medium');
                    setShowWithdrawalModal(true);
                  }}
                  className="w-full mt-2"
                  size="sm"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Solicitar Saque
                </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-xl border-l-[6px] shadow-sm bg-card" style={{ borderLeftColor: 'hsl(45, 93%, 58%)' }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Saldo Pendente</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {formatPriceForSeller(financialData.pendingBalance, 'KZ')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-xl border-l-[6px] shadow-sm bg-card" style={{ borderLeftColor: 'hsl(142, 76%, 36%)' }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <ArrowDownToLine className="h-5 w-5 text-green-600 dark:text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Saques</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {formatPriceForSeller(financialData.totalWithdrawn, 'KZ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal History */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-base text-foreground mb-1">Histórico de Saques</h3>
                  <p className="text-sm text-muted-foreground">Últimas solicitações</p>
                </div>
                
                {withdrawalHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhum saque solicitado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawalHistory.slice(0, 5).map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {formatPriceForSeller(parseFloat(withdrawal.amount || '0'), 'KZ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              withdrawal.status === 'aprovado' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : withdrawal.status === 'rejeitado'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {withdrawal.status === 'aprovado' ? 'Aprovado' 
                                : withdrawal.status === 'rejeitado' ? 'Rejeitado' 
                                : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(withdrawal.created_at).toLocaleDateString('pt-AO', { 
                              day: '2-digit', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        );
      
      case 'profile':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2 text-foreground">Meu Perfil</h2>
            
            {/* User Info Card */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16 rounded-2xl flex-shrink-0">
                    <AvatarImage src={profileAvatar} alt="Profile" />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                      {currentLevel ? (
                        <img src={currentLevel.badge} alt={currentLevel.name} className="w-12 h-12 object-contain" />
                      ) : (
                        <User className="h-8 w-8 text-primary" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-base text-foreground truncate">
                        {editingProfile.full_name || user?.email}
                      </p>
                      {currentLevel && (
                        <img 
                          src={currentLevel.seal} 
                          alt={currentLevel.name} 
                          className="w-6 h-6 object-contain flex-shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentLevel ? `${currentLevel.name}` : 'Vendedor Kambafy'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions - Camera & Share */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-2">
                <button
                  onClick={async () => {
                    triggerHaptic('light');
                    const photo = await pickPhoto();
                    if (photo && user) {
                      // TODO: Upload foto para Supabase Storage e atualizar profile
                      toast({
                        title: "Foto Selecionada",
                        description: "Funcionalidade de upload em desenvolvimento"
                      });
                      triggerHaptic('success');
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Mudar Avatar</p>
                      <p className="text-xs text-muted-foreground">Tire ou escolha uma foto</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* Settings Options */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-2">
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Dados Pessoais</p>
                      <p className="text-xs text-muted-foreground">Ver e editar informações</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="h-px bg-border my-1" />

                <div className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Notificações Push</p>
                      <p className="text-xs text-muted-foreground">
                        {pushEnabled ? 'Ativadas' : 'Desativadas'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={pushEnabled} 
                    onCheckedChange={handlePushToggle}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-2">
                <button
                  onClick={() => {
                    if (window.confirm('Tem a certeza que deseja encerrar a sua conta? Esta ação é irreversível.')) {
                      // TODO: Implementar lógica de encerramento de conta
                      alert('Funcionalidade de encerramento de conta em desenvolvimento.');
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-destructive">Encerrar Conta</p>
                      <p className="text-xs text-muted-foreground">Eliminar permanentemente</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* Logout Button */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-4">
                <Button 
                  variant="outline" 
                  className="w-full h-11 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-colors"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="font-medium">Sair da conta</span>
                </Button>
              </CardContent>
            </Card>

            {/* App Version */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Info className="h-3 w-3" />
              <span>Versão 1.0.0</span>
            </div>

            {/* Logo */}
            <div className="flex justify-center pt-4 pb-2">
              <img 
                src={isDark ? kambafyIconGreen : "/positivo-logo.svg"} 
                alt={isDark ? "Kambafy" : "Positivo"} 
                className="h-16 w-auto"
              />
            </div>
          </div>
        );
      
      case 'sales-history':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold text-foreground">Histórico de Vendas</h2>
              <span className="text-sm text-muted-foreground">{orders.length}</span>
            </div>

            {/* Filtro de Status */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
                <select
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value as typeof salesStatusFilter)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="completed">Pagas</option>
                  <option value="pending">Pendentes</option>
                  <option value="cancelled">Canceladas</option>
                </select>
              </CardContent>
            </Card>

            {loading ? (
              <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-foreground">Nenhuma venda</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Não há vendas {salesStatusFilter !== 'all' && `${salesStatusFilter === 'completed' ? 'pagas' : salesStatusFilter === 'pending' ? 'pendentes' : 'canceladas'}`} no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const statusConfig = {
                    completed: {
                      color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
                      label: 'Pago'
                    },
                    pending: {
                      color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
                      label: 'Pendente'
                    },
                    cancelled: {
                      color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                      label: 'Cancelado'
                    }
                  };

                  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;

                  return (
                    <Card key={order.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-4">
                          {/* Product Image */}
                          <div className="relative flex-shrink-0">
                            {order.products?.cover ? (
                              <img 
                                src={order.products.cover} 
                                alt={order.products.name}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <Package className="h-8 w-8 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
                                  {order.products?.name || 'Produto'}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {order.customer_name || 'Cliente'}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.color}`}>
                                {status.label}
                              </span>
                            </div>

                            {/* Amount and Date */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <div>
                                <p className="text-xs text-muted-foreground">Valor</p>
                                <p className="font-bold text-sm text-foreground">
                                  {formatPriceForSeller(parseFloat(order.seller_commission?.toString() || order.amount || '0'), order.currency || 'KZ')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Data</p>
                                <p className="text-xs text-foreground">
                                  {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      💡 Para ver mais detalhes, acesse a versão desktop
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 space-y-6">
            {/* Welcome */}
            <div className="px-2">
              <h1 className="text-xl font-bold mb-1 text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Acompanhe o desempenho do seu negócio</p>
            </div>

            {/* Filtros */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <select
                    value={timeFilter}
                    onChange={(e) => {
                      const value = e.target.value as typeof timeFilter;
                      setTimeFilter(value);
                      if (value !== 'custom') {
                        setCustomDateRange({});
                      }
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="all">Todo período</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {timeFilter === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Selecionar Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-9"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange.from ? (
                            customDateRange.to ? (
                              <>
                                {format(customDateRange.from, "dd/MM/yyyy", { locale: pt })} -{" "}
                                {format(customDateRange.to, "dd/MM/yyyy", { locale: pt })}
                              </>
                            ) : (
                              format(customDateRange.from, "dd/MM/yyyy", { locale: pt })
                            )
                          ) : (
                            <span className="text-muted-foreground">Escolher data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover z-[120]" align="start">
                        <Calendar
                          mode="range"
                          selected={{
                            from: customDateRange.from,
                            to: customDateRange.to
                          }}
                          onSelect={(range) => {
                            setCustomDateRange({
                              from: range?.from,
                              to: range?.to
                            });
                          }}
                          initialFocus
                          className="pointer-events-auto"
                          locale={pt}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="all">Todos os produtos</option>
                    {products.filter(p => p.status === 'Ativo').map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-3">
              <Card className="overflow-hidden rounded-xl border-l-[6px] shadow-sm bg-card" style={{ borderLeftColor: 'hsl(142, 76%, 36%)' }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Faturamento Total</div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                        <TrendingUp className="h-3 w-3" />
                        <span>+100%</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {loading ? '...' : formatPriceForSeller(stats.totalRevenue, 'KZ')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-xl border-l-[6px] shadow-sm bg-card" style={{ borderLeftColor: 'hsl(142, 76%, 36%)' }}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Total de Vendas</div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                        <TrendingUp className="h-3 w-3" />
                        <span>+100%</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {loading ? '...' : stats.totalSales}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart */}
            <ModernSalesChart />

            {/* Info Card */}
            <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-primary/5">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground font-semibold">💡 Dica:</strong> Para criar produtos e acessar todos os recursos, use a versão desktop.
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <AppCrispChat hideByDefault={true} />
      <div className={isDark ? 'dark' : ''}>
        <div className="min-h-screen bg-background pb-28 pt-0 overflow-x-hidden">
        {/* Fixed Header - Similar to Landing */}
        <header className="fixed top-0 left-0 right-0 z-20">
        <nav className="px-2 pt-2">
          <div className={cn(
            'mx-auto transition-all duration-300 px-4 py-3 flex items-center justify-between',
            isScrolled && 'bg-background/80 backdrop-blur-lg rounded-2xl shadow-lg max-w-4xl'
          )}>
            <img 
              src={isDark ? "/kambafy-logo-light-green.png" : "/kambafy-logo-new.svg"} 
              alt="Kambafy" 
              className="h-14 w-auto"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    markAllAsRead();
                  }
                }}
                className="relative w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border"
              >
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-foreground" />
                ) : (
                  <Moon className="h-5 w-5 text-foreground" />
                )}
              </button>
              <button
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border"
              >
                {showQuickMenu ? (
                  <X className="h-5 w-5 text-foreground" />
                ) : (
                  <Menu className="h-5 w-5 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Quick Menu Dropdown */}
        {showQuickMenu && (
          <div className="absolute top-full right-0 w-80 bg-background border-l border-b border-border shadow-lg">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Resumo Financeiro</h3>
              
              {/* Meta Kamba */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {nextLevel ? `Meta: ${nextLevel.name}` : 'Nível Máximo! 🎉'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${goalProgress}%`,
                          backgroundColor: nextLevel?.color || '#FFD700'
                        }}
                      />
                    </div>
                    <span className="font-semibold text-xs" style={{ color: nextLevel?.color || '#FFD700' }}>
                      {goalProgress.toFixed(0)}%
                    </span>
                  </div>
                </div>
                {currentLevel && (
                  <p className="text-[10px] text-muted-foreground">
                    Nível: {currentLevel.name} {currentLevel.emoji}
                  </p>
                )}
                {nextLevel && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Falta: {formatPriceForSeller(monthlyGoal - totalRevenueUnfiltered, 'KZ')}
                  </p>
                )}
              </div>
              
              {/* Saldo Disponível */}
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-muted-foreground">Saldo disponível</span>
                </div>
                <span className="font-bold text-sm text-foreground">
                  {formatPriceForSeller(financialData.availableBalance, 'KZ')}
                </span>
              </div>

              {/* Saldo Pendente */}
              <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs text-muted-foreground">Pendente</span>
                </div>
                <span className="font-bold text-sm text-foreground">
                  {formatPriceForSeller(financialData.pendingBalance, 'KZ')}
                </span>
              </div>

              {/* Total de Vendas */}
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Vendas</span>
                </div>
                <span className="font-bold text-sm text-foreground">
                  {statsUnfiltered.totalSales}
                </span>
              </div>

              {/* Faturamento Total */}
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Faturamento</span>
                </div>
                <span className="font-bold text-sm text-foreground">
                  {formatPriceForSeller(statsUnfiltered.totalRevenue, 'KZ')}
                </span>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <Button 
                  onClick={() => {
                    setShowQuickMenu(false);
                    setActiveTab('sales-history');
                  }}
                  variant="outline"
                  className="w-full dark:text-white dark:border-white/20"
                  size="sm"
                >
                  Histórico de Vendas
                </Button>
                <Button 
                  onClick={() => {
                    setShowQuickMenu(false);
                    setActiveTab('stats');
                  }}
                  variant="outline"
                  className="w-full dark:text-white dark:border-white/20"
                  size="sm"
                >
                  Financeiro
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content with padding for fixed header */}
      <div className="pt-20">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="sticky top-20 z-10 mx-4 mb-4 bg-destructive/90 backdrop-blur-md text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Sem conexão com a internet</p>
              <p className="text-xs opacity-90">Algumas funcionalidades podem estar limitadas</p>
            </div>
          </div>
        )}
        {renderContent()}
      </div>

      {/* Chat Button - Above Profile Avatar */}
      <button
        onClick={() => {
          openCrispChat();
          triggerHaptic('light');
        }}
        className="fixed bottom-28 right-6 z-20 w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>

      {/* Horizontal Bottom Navigation */}
      <nav className="fixed bottom-6 left-0 right-0 z-10 pb-safe">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => activeTab !== 'home' ? setActiveTab('home') : window.history.back()}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Navigation Icons - Centered Group */}
            <div className="flex items-center gap-4 flex-1 justify-center rounded-full px-6 py-2 bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg transition-all duration-300">
              <button
                onClick={() => setActiveTab('home')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'home' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <LayoutDashboard className={`h-5 w-5 ${activeTab === 'home' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button
                onClick={() => setActiveTab('stats')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'stats' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <Wallet className={`h-5 w-5 ${activeTab === 'stats' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`p-2.5 rounded-full transition-colors ${
                  activeTab === 'products' ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
              >
                <Package className={`h-5 w-5 ${activeTab === 'products' ? 'text-primary' : 'text-foreground'}`} />
              </button>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-shadow flex-shrink-0 overflow-hidden ${
                activeTab === 'profile' ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={profileAvatar} alt="Profile" />
                <AvatarFallback className={`${activeTab === 'profile' ? 'bg-primary/10' : 'bg-muted'}`}>
                  {isDark ? (
                    <img src={kambafyIconGreen} alt="Kambafy" className="h-6 w-6" />
                  ) : (
                    <User className={`h-5 w-5 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </nav>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
        availableBalance={financialData.availableBalance}
        onWithdrawalSuccess={() => {
          loadStats();
          toast({
            title: "Saque Solicitado",
            description: "Sua solicitação de saque está sendo processada"
          });
        }}
      />
      </div>
    </div>
    </>
  );
}
