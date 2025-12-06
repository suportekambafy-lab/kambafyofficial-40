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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Home, BarChart3, Package, User, TrendingUp, LayoutDashboard, LogOut, ChevronLeft, ShoppingCart, Settings, Bell, Trash2, Info, ChevronRight, Wallet, ArrowDownToLine, Sun, Moon, Menu, X, Calendar as CalendarIcon, Camera, WifiOff, GraduationCap, Copy } from 'lucide-react';
import kambafyIconGreen from '@/assets/kambafy-icon-green.png';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { countTotalSales, countOrderItems } from '@/utils/orderUtils';
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
import { UnifiedMembersAuthProvider, useUnifiedMembersAuth } from '@/components/members/UnifiedMembersAuth';
import { AppCourses } from '@/components/app/AppCourses';
import { AppCourseViewer } from '@/components/app/AppCourseViewer';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { configureStatusBar } from '@/utils/nativeService';
import { ModernSalesChart } from '@/components/modern/ModernSalesChart';
import { useSalesCache } from '@/hooks/useSalesCache';
import { Capacitor } from '@capacitor/core';
import { useOneSignal } from '@/hooks/useOneSignal';
import { AppLiveView } from '@/components/app/AppLiveView';
import { Radio } from 'lucide-react';
export function AppHome() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    theme,
    setTheme,
    isDark
  } = useSellerTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Native hooks
  const nativePush = useNativePush({
    onNotificationReceived: notification => {
      console.log('Native notification received:', notification);
    }
  });
  const {
    triggerHaptic
  } = useHaptics();
  const {
    pickPhoto
  } = useNativeCamera();
  const {
    isActive
  } = useAppState();
  const {
    isOnline
  } = useNetworkStatus();

  // OneSignal hook
  const {
    isInitialized: oneSignalInitialized,
    enableNotifications,
    disableNotifications,
    checkPermissionStatus
  } = useOneSignal();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCourse, setSelectedCourse] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
    totalWithdrawn: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSalesHistory, setLoadingSalesHistory] = useState(false);
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
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [totalRevenueUnfiltered, setTotalRevenueUnfiltered] = useState(0); // Para a meta Kamba
  const [orders, setOrders] = useState<any[]>([]);
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // ✅ Cache de vendas (declarado após salesStatusFilter)
  const {
    cachedSales,
    hasCachedData,
    saveSalesToCache
  } = user?.id ? useSalesCache(user.id, salesStatusFilter) : {
    cachedSales: null,
    hasCachedData: false,
    saveSalesToCache: () => {}
  };

  // Sistema de conquistas Kamba - metas dinâmicas (baseado no total sem filtros)
  const {
    currentLevel,
    nextLevel,
    progress: kambaProgress
  } = useKambaLevels(totalRevenueUnfiltered);
  const monthlyGoal = nextLevel?.threshold || 1000000; // Meta dinâmica baseada no próximo nível
  const goalProgress = kambaProgress;

  // Apply dark mode class to HTML element for drawer portals
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    console.log('🎨 AppHome: Aplicando tema ao HTML', isDark ? 'dark' : 'light');
  }, [isDark]);
  const handlePushToggle = async (enabled: boolean) => {
    console.log('🔔 [handlePushToggle] Called with enabled:', enabled);
    triggerHaptic('light');
    const isNative = Capacitor.isNativePlatform();
    console.log('📱 isNative:', isNative);

    // Se estiver em plataforma nativa, abrir configurações do dispositivo
    if (isNative) {
      try {
        console.log('📱 Abrindo configurações nativas do dispositivo...');
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
          window.open('app-settings:', '_system');
        } else if (platform === 'android') {
          toast({
            title: "Configurações de Notificação",
            description: "Acesse: Configurações > Apps > Kambafy > Notificações"
          });
        }
        toast({
          title: "Configurações",
          description: "Gerencie as notificações nas configurações do seu dispositivo"
        });
      } catch (error) {
        console.error('❌ Erro ao abrir configurações:', error);
        toast({
          title: "Configurações",
          description: "Acesse as configurações do dispositivo para gerenciar notificações"
        });
      }
      return;
    }

    // Web: usar API nativa do navegador
    if (enabled) {
      try {
        console.log('🔔 Verificando suporte a notificações...');
        if (!('Notification' in window)) {
          toast({
            title: "Não Suportado",
            description: "Este navegador não suporta notificações push",
            variant: "destructive"
          });
          return;
        }

        // Verificar status atual da permissão
        const currentPermission = Notification.permission;
        console.log('🔔 Status atual da permissão:', currentPermission);
        if (currentPermission === 'denied') {
          // Permissão já foi negada - não podemos solicitar novamente
          setPushEnabled(false);
          toast({
            title: "Notificações Bloqueadas",
            description: "Clique no ícone 🔒 na barra de endereço do navegador para desbloquear as notificações",
            variant: "destructive"
          });
          triggerHaptic('error');
          return;
        }
        if (currentPermission === 'granted') {
          // Já tem permissão
          setPushEnabled(true);
          localStorage.setItem('push_notifications_enabled', 'true');
          if (oneSignalInitialized) {
            await enableNotifications();
          }
          toast({
            title: "Notificações Ativadas",
            description: "Você receberá notificações sobre vendas e produtos"
          });
          triggerHaptic('success');
          return;
        }

        // Status é 'default' - podemos solicitar permissão
        console.log('🔔 Solicitando permissão ao navegador...');
        const permission = await Notification.requestPermission();
        console.log('🔔 Resultado da permissão:', permission);
        if (permission === 'granted') {
          setPushEnabled(true);
          localStorage.setItem('push_notifications_enabled', 'true');
          if (oneSignalInitialized) {
            await enableNotifications();
          }
          toast({
            title: "Notificações Ativadas",
            description: "Você receberá notificações sobre vendas e produtos"
          });
          triggerHaptic('success');
        } else {
          setPushEnabled(false);
          toast({
            title: "Permissão Negada",
            description: "Você pode ativar nas configurações do navegador",
            variant: "destructive"
          });
          triggerHaptic('error');
        }
      } catch (error) {
        console.error('❌ [handlePushToggle] Error:', error);
        setPushEnabled(false);
        toast({
          title: "Erro ao Ativar",
          description: "Não foi possível ativar as notificações",
          variant: "destructive"
        });
        triggerHaptic('error');
      }
    } else {
      try {
        if (oneSignalInitialized) {
          await disableNotifications();
        }
        setPushEnabled(false);
        localStorage.setItem('push_notifications_enabled', 'false');
        toast({
          title: "Notificações Desativadas",
          description: "Você não receberá mais notificações push"
        });
        triggerHaptic('light');
      } catch (error) {
        console.error('❌ Erro ao desativar:', error);
      }
    }
  };
  useEffect(() => {
    const checkInitialPermission = async () => {
      if (oneSignalInitialized) {
        const hasPermission = await checkPermissionStatus();
        setPushEnabled(hasPermission);
        if (hasPermission) {
          localStorage.setItem('push_notifications_enabled', 'true');
        }
      }
    };
    checkInitialPermission();
  }, [oneSignalInitialized]);

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
      const {
        data: profile
      } = await supabase.from('profiles').select('avatar_url, full_name, bio').eq('user_id', user.id).single();
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
      const {
        error
      } = await supabase.from('profiles').update({
        full_name: editingProfile.full_name,
        bio: editingProfile.bio
      }).eq('user_id', user.id);
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
      const {
        data: products,
        error: productsError
      } = await supabase.from('products').select('id, name, status, price, sales, cover').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (productsError) {
        console.error('Products error:', productsError);
        setStats({
          totalSales: 0,
          totalRevenue: 0,
          totalProducts: 0
        });
        setProducts([]);
        setLoading(false);
        return;
      }
      const productIds = products?.map(p => p.id) || [];
      const activeProducts = products?.filter(p => p.status === 'Ativo') || [];

      // ✅ Buscar vendas de order bumps para produtos do usuário (igual à Web)
      let orderBumpSalesMap: Record<string, number> = {};
      if (productIds.length > 0) {
        // Buscar settings onde o bump_product_id é um dos produtos do usuário
        const {
          data: bumpSettings
        } = await supabase.from('order_bump_settings').select('bump_product_id, bump_product_name').in('bump_product_id', productIds);
        if (bumpSettings && bumpSettings.length > 0) {
          // Criar mapa de bump_product_name (normalizado) -> bump_product_id
          const bumpNameToProductId: Record<string, string> = {};
          for (const setting of bumpSettings) {
            if (setting.bump_product_name && setting.bump_product_id) {
              const normalizedName = setting.bump_product_name.toLowerCase().trim();
              bumpNameToProductId[normalizedName] = setting.bump_product_id;
            }
          }

          // Buscar todas as orders com order_bump_data
          const {
            data: ordersWithBumps
          } = await supabase.from('orders').select('order_bump_data').in('status', ['completed', 'paid']).not('order_bump_data', 'is', null);
          if (ordersWithBumps) {
            for (const order of ordersWithBumps) {
              try {
                let bumpData: any = order.order_bump_data;

                // Parse múltiplo para lidar com string JSON escapada
                while (typeof bumpData === 'string') {
                  try {
                    bumpData = JSON.parse(bumpData);
                  } catch {
                    break;
                  }
                }
                const bumpProductName = bumpData?.bump_product_name as string | undefined;
                if (bumpProductName) {
                  const normalizedBumpName = bumpProductName.toLowerCase().trim();

                  // Verificar se este bump_product_name corresponde a um produto do usuário
                  const matchedProductId = bumpNameToProductId[normalizedBumpName];
                  if (matchedProductId) {
                    orderBumpSalesMap[matchedProductId] = (orderBumpSalesMap[matchedProductId] || 0) + 1;
                  }
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            }
          }
        }
      }

      // Store products for display (com vendas de order bump incluídas)
      const productsWithBumpSales = (products || []).map(product => ({
        ...product,
        sales: (product.sales || 0) + (orderBumpSalesMap[product.id] || 0)
      }));
      setProducts(productsWithBumpSales);

      // ✅ Buscar códigos de afiliado do usuário (igual à Web)
      const {
        data: userAffiliateCodes
      } = await supabase.from('affiliates').select('affiliate_code').eq('affiliate_user_id', user.id).eq('status', 'aprovado');
      const affiliateCodes = userAffiliateCodes?.map(a => a.affiliate_code).filter(Boolean) || [];

      // Buscar member_areas para module_payments
      const {
        data: memberAreas
      } = await supabase.from('member_areas').select('id').eq('user_id', user.id);
      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];
      if (productIds.length === 0 && affiliateCodes.length === 0 && memberAreaIds.length === 0) {
        setStats({
          totalSales: 0,
          totalRevenue: 0,
          totalProducts: 0
        });
        setTotalRevenueUnfiltered(0);
        setLoading(false);
        return;
      }

      // ✅ PRIMEIRO: Buscar TODAS as vendas (produtos próprios + afiliados + módulos) para Meta Kamba
      const ownOrdersMetaPromise = productIds.length > 0 ? supabase.from('orders').select('amount, seller_commission, currency, created_at, payment_method, order_id, order_bump_data').in('product_id', productIds).eq('status', 'completed').neq('payment_method', 'member_access').order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      });
      const affiliateOrdersMetaPromise = affiliateCodes.length > 0 ? supabase.from('orders').select('amount, affiliate_commission, currency, created_at, payment_method, order_id, order_bump_data').in('affiliate_code', affiliateCodes).eq('status', 'completed').neq('payment_method', 'member_access').order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      });
      const modulePaymentsMetaPromise = memberAreaIds.length > 0 ? supabase.from('module_payments').select('amount, currency, created_at, payment_method, order_id').in('member_area_id', memberAreaIds).eq('status', 'completed').order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      });
      const [ownOrdersMeta, affiliateOrdersMeta, modulePaymentsMeta] = await Promise.all([ownOrdersMetaPromise, affiliateOrdersMetaPromise, modulePaymentsMetaPromise]);

      // ✅ Combinar vendas próprias + comissões de afiliado + módulos
      const allOrdersForMeta = [...(ownOrdersMeta.data || []), ...(affiliateOrdersMeta.data || []), ...(modulePaymentsMeta.data || [])];
      let totalRevenueForMeta = 0;
      allOrdersForMeta.forEach(order => {
        let amount = parseFloat(order.seller_commission?.toString() || order.affiliate_commission?.toString() || order.amount || '0');
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

      // ✅ SEGUNDO: Buscar vendas COM FILTROS (produtos próprios + afiliados + módulos) - APENAS COMPLETED
      let ownOrdersQuery = supabase.from('orders').select('amount, seller_commission, currency, created_at, payment_method, product_id, order_id, order_bump_data').in('product_id', productIds).eq('status', 'completed').neq('payment_method', 'member_access');
      let affiliateOrdersQuery = supabase.from('orders').select('amount, affiliate_commission, currency, created_at, payment_method, order_id, order_bump_data').in('affiliate_code', affiliateCodes).eq('status', 'completed').neq('payment_method', 'member_access');
      let modulePaymentsQuery = supabase.from('module_payments').select('amount, currency, created_at, payment_method, order_id, member_area_id').in('member_area_id', memberAreaIds).eq('status', 'completed');

      // Aplicar filtros de tempo em todas as queries
      if (timeFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', today.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', today.toISOString());
        modulePaymentsQuery = modulePaymentsQuery.gte('created_at', today.toISOString());
      } else if (timeFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
        modulePaymentsQuery = modulePaymentsQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
      } else if (timeFilter === 'custom' && customDateRange.from) {
        const fromDate = new Date(customDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', fromDate.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', fromDate.toISOString());
        modulePaymentsQuery = modulePaymentsQuery.gte('created_at', fromDate.toISOString());
        if (customDateRange.to) {
          const toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
          ownOrdersQuery = ownOrdersQuery.lte('created_at', toDate.toISOString());
          affiliateOrdersQuery = affiliateOrdersQuery.lte('created_at', toDate.toISOString());
          modulePaymentsQuery = modulePaymentsQuery.lte('created_at', toDate.toISOString());
        }
      } else if (timeFilter !== 'all') {
        const daysMap = {
          '7d': 7,
          '30d': 30,
          '90d': 90
        };
        const days = daysMap[timeFilter as '7d' | '30d' | '90d'];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        ownOrdersQuery = ownOrdersQuery.gte('created_at', startDate.toISOString());
        affiliateOrdersQuery = affiliateOrdersQuery.gte('created_at', startDate.toISOString());
        modulePaymentsQuery = modulePaymentsQuery.gte('created_at', startDate.toISOString());
      }

      // Filtro de produto (só para vendas próprias)
      if (productFilter !== 'all') {
        ownOrdersQuery = ownOrdersQuery.eq('product_id', productFilter);
      }
      const [ownOrdersResult, affiliateOrdersResult, modulePaymentsResult] = await Promise.all([productIds.length > 0 ? ownOrdersQuery.order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      }), affiliateCodes.length > 0 ? affiliateOrdersQuery.order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      }), memberAreaIds.length > 0 ? modulePaymentsQuery.order('created_at', {
        ascending: true
      }) : Promise.resolve({
        data: []
      })]);
      const orders = [...(ownOrdersResult.data || []), ...(affiliateOrdersResult.data || []), ...(modulePaymentsResult.data || [])];
      let totalRevenue = 0;
      const dailySales: Record<string, {
        date: string;
        sales: number;
        revenue: number;
      }> = {};

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
        let amount = parseFloat(order.seller_commission?.toString() || order.affiliate_commission?.toString() || order.amount || '0');

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
      setStats({
        totalSales: 0,
        totalRevenue: 0,
        totalProducts: 0
      });
    } finally {
      setLoading(false);
    }
  };
  const loadFinancialData = async (orders: any[], productIds: string[]) => {
    if (!user) return;
    try {
      console.log('💰 [AppHome] Calculando saldos IDÊNTICOS ao Financial.tsx');

      // ✅ 1. SALDO DISPONÍVEL - Fonte única de verdade
      const {
        data: balanceData
      } = await supabase.from('customer_balances').select('balance').eq('user_id', user.id).maybeSingle();
      const availableBalance = balanceData?.balance || 0;

      // ✅ 2. TOTAL SACADO (aprovado)
      const {
        data: withdrawals
      } = await supabase.from('withdrawal_requests').select('amount, status').eq('user_id', user.id);
      const withdrawnAmount = (withdrawals || []).filter(w => w.status === 'aprovado').reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

      // ✅ 3. CARREGAR HISTÓRICO DE SAQUES
      const {
        data: withdrawalRequestsData
      } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      setWithdrawalHistory(withdrawalRequestsData || []);
      setFinancialData({
        availableBalance,
        totalWithdrawn: withdrawnAmount
      });
      console.log('✅ [AppHome] Dados financeiros carregados:', {
        availableBalance: availableBalance.toLocaleString(),
        withdrawnAmount: withdrawnAmount.toLocaleString()
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };
  const loadSalesHistory = async () => {
    if (!user) return;
    setLoadingSalesHistory(true);

    // ✅ Verificar cache e mostrar imediatamente se disponível
    if (hasCachedData && cachedSales) {
      console.log('⚡ Carregando vendas do CACHE (instantâneo)');
      setOrders(cachedSales);

      // Manter loading por 300ms para feedback visual
      setTimeout(() => setLoadingSalesHistory(false), 300);

      // Refetch em background para atualizar
      setTimeout(() => fetchSalesFromDatabase(), 500);
      return;
    }
    await fetchSalesFromDatabase();
  };
  const fetchSalesFromDatabase = async () => {
    if (!user) return;
    try {
      // ✅ QUERIES PARALELAS - Buscar products, affiliate codes e member areas simultaneamente
      const [productsResult, affiliateCodesResult, memberAreasResult] = await Promise.all([supabase.from('products').select('id').eq('user_id', user.id), supabase.from('affiliates').select('affiliate_code').eq('affiliate_user_id', user.id).eq('status', 'ativo'), supabase.from('member_areas').select('id').eq('user_id', user.id)]);
      const productIds = productsResult.data?.map(p => p.id) || [];
      const affiliateCodes = affiliateCodesResult.data?.map(a => a.affiliate_code).filter(Boolean) || [];
      const memberAreaIds = memberAreasResult.data?.map(ma => ma.id) || [];
      console.log('📊 [AppHome] IDs encontrados:', {
        products: productIds.length,
        affiliateCodes: affiliateCodes.length,
        memberAreas: memberAreaIds.length,
        salesStatusFilter
      });

      // ✅ BUSCAR TODAS AS VENDAS PARALELAMENTE
      console.log('🔄 Buscando TODAS as vendas em paralelo...');
      const statusesToFetch = salesStatusFilter === 'all' ? ['completed', 'pending', 'failed', 'cancelled'] : salesStatusFilter === 'cancelled' ? ['cancelled', 'canceled', 'failed'] : [salesStatusFilter];

      // ✅ FETCH PARALELO: Buscar own orders, affiliate orders e module payments simultaneamente
      const fetchOwnOrders = async () => {
        if (productIds.length === 0) return [];
        let allOrders: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const {
            data,
            error
          } = await supabase.from('orders').select('*, products(name, cover)').in('product_id', productIds).in('status', statusesToFetch).order('created_at', {
            ascending: false
          }).range(offset, offset + batchSize - 1);
          if (error || !data || data.length === 0) break;
          allOrders.push(...data);
          hasMore = data.length === batchSize;
          offset += batchSize;
        }
        return allOrders;
      };
      const fetchAffiliateOrders = async () => {
        if (affiliateCodes.length === 0) return [];
        let allOrders: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const {
            data,
            error
          } = await supabase.from('orders').select('*, products(name, cover)').in('affiliate_code', affiliateCodes).in('status', statusesToFetch).order('created_at', {
            ascending: false
          }).range(offset, offset + batchSize - 1);
          if (error || !data || data.length === 0) break;
          allOrders.push(...data);
          hasMore = data.length === batchSize;
          offset += batchSize;
        }
        return allOrders;
      };
      const fetchModulePayments = async () => {
        if (memberAreaIds.length === 0) return [];
        const {
          data,
          error
        } = await supabase.from('module_payments').select('*, modules(title, cover_image_url)').in('member_area_id', memberAreaIds).in('status', statusesToFetch).order('created_at', {
          ascending: false
        });
        return data || [];
      };

      // ✅ Executar todas as queries em paralelo
      const [allOwnOrders, allAffiliateOrders, modulePayments] = await Promise.all([fetchOwnOrders(), fetchAffiliateOrders(), fetchModulePayments()]);
      const ownOrdersResult = {
        data: allOwnOrders,
        error: null
      };
      const affiliateOrdersResult = {
        data: allAffiliateOrders,
        error: null
      };
      const modulePaymentsResult = {
        data: modulePayments,
        error: null
      };
      if (ownOrdersResult.error) {
        console.error('Error loading own orders:', ownOrdersResult.error);
      }
      if ('error' in affiliateOrdersResult && affiliateOrdersResult.error) {
        console.error('Error loading affiliate orders:', affiliateOrdersResult.error);
      }
      if ('error' in modulePaymentsResult && modulePaymentsResult.error) {
        console.error('Error loading module payments:', modulePaymentsResult.error);
      }

      // ✅ Combinar orders próprias
      const ownOrders = (ownOrdersResult.data || []).map(order => ({
        ...order,
        source: 'product',
        sale_type: 'own'
      }));

      // ✅ Combinar vendas como afiliado
      const affiliateOrders = (affiliateOrdersResult.data || []).map(order => ({
        ...order,
        source: 'product',
        sale_type: 'affiliate'
      }));

      // ✅ Combinar module_payments
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
        source: 'module',
        sale_type: 'module',
        reference_number: payment.reference_number,
        entity: payment.entity,
        due_date: payment.due_date
      }));

      // ✅ Combinar TODAS as vendas e ordenar por data
      const allOrders = [...ownOrders, ...affiliateOrders, ...moduleOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // ✅ Contar ITEMS (incluindo order bumps) igual à web
      const totalItems = allOrders.reduce((sum, order) => sum + countOrderItems(order), 0);
      console.log('📊 Histórico de Vendas carregado:', {
        ownOrders: ownOrders.length,
        affiliateOrders: affiliateOrders.length,
        moduleOrders: moduleOrders.length,
        totalOrders: allOrders.length,
        totalItems: totalItems,
        nota: 'totalItems conta order principal + order bumps'
      });
      setOrders(allOrders);

      // ✅ Salvar no cache para próxima visita
      saveSalesToCache(allOrders);
    } catch (error) {
      console.error('Error loading sales history:', error);
      setOrders([]);
    } finally {
      setLoadingSalesHistory(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'sales-history') {
      loadSalesHistory();
    }
  }, [activeTab, salesStatusFilter, user]);
  const renderContent = () => {
    if (showEditProfile) {
      return <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Dados Pessoais</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowEditProfile(false)}>
              Fechar
            </Button>
          </div>

          <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" value={editingProfile.full_name} onChange={e => setEditingProfile({
                ...editingProfile,
                full_name: e.target.value
              })} placeholder="Digite seu nome completo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={editingProfile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={editingProfile.bio} onChange={e => setEditingProfile({
                ...editingProfile,
                bio: e.target.value
              })} placeholder="Conte um pouco sobre você..." rows={4} />
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </div>;
    }
    switch (activeTab) {
      case 'live-view':
        return <AppLiveView onBack={() => setActiveTab('home')} />;
      case 'products':
        return <div className="p-3 md:p-4 space-y-3 bg-background min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">Meus Produtos</h1>
                <p className="text-muted-foreground text-xs">{products.length} produtos cadastrados</p>
              </div>
            </div>

            {loading ? <div className="bg-card rounded-xl border border-border/40 shadow-sm p-8 text-center">
                <p className="text-muted-foreground text-sm">Carregando...</p>
              </div> : products.length === 0 ? <div className="bg-card rounded-xl border border-border/40 shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-foreground">Nenhum produto</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use a versão desktop para criar produtos.
                </p>
              </div> : <div className="space-y-2">
                {products.map(product => <div key={product.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <div className="p-3">
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {product.cover ? <img src={product.cover} alt={product.name} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-medium text-[15px] text-foreground truncate">
                                {product.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {formatPriceForSeller(parseFloat(product.price || '0'), 'KZ')}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                const baseUrl = window.location.origin;
                                const checkoutUrl = `${baseUrl}/checkout/${product.id}`;
                                navigator.clipboard.writeText(checkoutUrl);
                                triggerHaptic('light');
                                toast({
                                  title: "Link copiado",
                                  description: "O link do checkout foi copiado"
                                });
                              }}
                              className="p-2 -mr-1 rounded-lg active:bg-muted transition-colors"
                            >
                              <Copy className="h-5 w-5 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs ${product.status === 'Ativo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                              {product.status}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{product.sales || 0} vendas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>)}

                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    💡 Para editar produtos, acesse a versão desktop
                  </p>
                </div>
              </div>}
          </div>;
      case 'stats':
        return <div className="p-3 md:p-4 space-y-3 bg-background min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">Financeiro</h1>
                <p className="text-muted-foreground text-xs">Gestão de saldo e saques</p>
              </div>
            </div>
            
            {/* Financial Cards */}
            <div className="space-y-3">
              {/* Available Balance Card */}
              <div className="bg-card rounded-xl border border-border/40 shadow-sm flex overflow-hidden">
                <div className="w-1 bg-emerald-500 shrink-0" />
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Disponível para Saque</p>
                    </div>
                    <Button 
                      onClick={() => {
                        triggerHaptic('medium');
                        setShowWithdrawalModal(true);
                      }} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-[10px]"
                      size="sm"
                    >
                      Sacar
                    </Button>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {formatPriceForSeller(financialData.availableBalance, 'KZ')}
                  </div>
                </div>
              </div>

              {/* Total Withdrawn Card */}
              <div className="bg-card rounded-xl border border-border/40 shadow-sm flex overflow-hidden">
                <div className="w-1 bg-blue-500 shrink-0" />
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Total de Saques</p>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {formatPriceForSeller(financialData.totalWithdrawn, 'KZ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <h3 className="font-semibold text-sm text-foreground">Histórico de Saques</h3>
                <p className="text-xs text-muted-foreground">Últimas solicitações</p>
              </div>
              <div className="p-4">
                {withdrawalHistory.length === 0 ? <div className="text-center py-6 text-muted-foreground">
                    <ArrowDownToLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum saque solicitado ainda</p>
                  </div> : <div className="space-y-2">
                    {withdrawalHistory.slice(0, 5).map(withdrawal => <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {formatPriceForSeller(parseFloat(withdrawal.amount || '0'), 'KZ')}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${withdrawal.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : withdrawal.status === 'rejeitado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                              {withdrawal.status === 'aprovado' ? 'Aprovado' : withdrawal.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(withdrawal.created_at).toLocaleDateString('pt-AO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                          </p>
                        </div>
                      </div>)}
                  </div>}
              </div>
            </div>
          </div>;
      case 'my-courses':
        return <AppCourses onCourseSelect={(courseId, courseName) => {
          console.log('🎓 Curso selecionado:', {
            courseId,
            courseName
          });
          setSelectedCourse({
            id: courseId,
            name: courseName
          });
        }} />;
      case 'profile':
        return <div className="p-4 space-y-6 bg-background min-h-full">
            {/* Profile Header - Clean iOS style */}
            <div className="flex flex-col items-center pt-4">
              <div className="relative cursor-pointer" onClick={async () => {
                triggerHaptic('light');
                const photo = await pickPhoto();
                if (photo && user) {
                  toast({
                    title: "Foto Selecionada",
                    description: "Funcionalidade de upload em desenvolvimento"
                  });
                  triggerHaptic('success');
                }
              }}>
                <Avatar className="w-24 h-24 ring-4 ring-muted/50">
                  <AvatarImage src={profileAvatar} alt="Profile" />
                  <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground">
                    {(editingProfile.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-muted border-2 border-background rounded-full p-1.5">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              
              <h2 className="mt-4 font-semibold text-xl text-foreground">
                {editingProfile.full_name || user?.email?.split('@')[0]}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
              {currentLevel && (
                <span className="mt-2 text-xs text-muted-foreground">{currentLevel.name}</span>
              )}
            </div>

            {/* Settings Groups - iOS Style */}
            <div className="space-y-6">
              {/* Account Section */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">Conta</p>
                <div className="bg-card rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
                  <button onClick={() => setShowEditProfile(true)} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[15px] text-foreground">Dados Pessoais</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </button>

                  <button onClick={() => setActiveTab('my-courses')} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[15px] text-foreground">Meus Cursos</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </button>
                </div>
              </div>

              {/* Preferences Section */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">Preferências</p>
                <div className="bg-card rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[15px] text-foreground">Notificações</span>
                    </div>
                    <Switch checked={pushEnabled} onCheckedChange={checked => {
                      console.log('🔔 [Switch] onCheckedChange triggered with:', checked);
                      handlePushToggle(checked);
                    }} />
                  </div>

                  <button onClick={() => {
                    triggerHaptic('light');
                    const newTheme = isDark ? 'light' : 'dark';
                    setTheme(newTheme);
                  }} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-[15px] text-foreground">Modo {isDark ? 'Escuro' : 'Claro'}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </button>
                </div>
              </div>

              {/* Actions Section */}
              <div>
                <div className="bg-card rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
                  <button onClick={() => signOut()} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[15px] text-foreground">Sair da Conta</span>
                    </div>
                  </button>

                  <button onClick={() => {
                    if (window.confirm('Tem a certeza que deseja encerrar a sua conta? Esta ação é irreversível.')) {
                      alert('Funcionalidade de encerramento de conta em desenvolvimento.');
                    }
                  }} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-destructive/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-destructive/70" />
                      <span className="text-[15px] text-destructive">Encerrar Conta</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-1 pt-4 pb-8">
              <img src={kambafyIconGreen} alt="Logo" className="h-8 w-auto opacity-20 grayscale" />
              <span className="text-[11px] text-muted-foreground/50">Versão 1.1</span>
            </div>
          </div>;
      case 'sales-history':
        return <div className="p-3 md:p-4 space-y-3 bg-background min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">Histórico de Vendas</h1>
                <p className="text-muted-foreground text-xs">
                  {orders.reduce((sum, order) => sum + countOrderItems(order), 0)} vendas registradas
                </p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Status</label>
              <select value={salesStatusFilter} onChange={e => setSalesStatusFilter(e.target.value as typeof salesStatusFilter)} className="w-full h-9 px-3 rounded-lg border border-border/40 bg-card text-sm font-medium text-foreground shadow-sm">
                <option value="all">Todas</option>
                <option value="completed">Pagas</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>

            {loadingSalesHistory ? <div className="bg-card rounded-xl border border-border/40 shadow-sm p-8 text-center">
                <p className="text-muted-foreground text-sm">Carregando vendas...</p>
              </div> : orders.length === 0 ? <div className="bg-card rounded-xl border border-border/40 shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-foreground">Nenhuma venda</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Não há vendas {salesStatusFilter !== 'all' && `${salesStatusFilter === 'completed' ? 'pagas' : salesStatusFilter === 'pending' ? 'pendentes' : 'canceladas'}`} no momento.
                </p>
              </div> : <div className="space-y-2">
                {orders.map(order => {
              const statusConfig = {
                completed: {
                  color: 'bg-emerald-500',
                  label: 'Pago',
                  textColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                },
                pending: {
                  color: 'bg-orange-500',
                  label: 'Pendente',
                  textColor: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                },
                cancelled: {
                  color: 'bg-red-500',
                  label: 'Cancelado',
                  textColor: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                }
              };
              const normalizedStatus = order.status === 'canceled' || order.status === 'failed' ? 'cancelled' : order.status;
              const status = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.pending;
              return <div key={order.id} className="bg-card rounded-xl border border-border/40 shadow-sm flex overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`w-1 shrink-0 ${status.color}`} />
                      <div className="flex-1 p-3">
                        <div className="flex gap-3">
                          {/* Product Image */}
                          <div className="relative flex-shrink-0">
                            {order.products?.cover ? <img src={order.products.cover} alt={order.products.name} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="h-6 w-6 text-primary" />
                              </div>}
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                                  {order.products?.name || 'Produto'}
                                </h3>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {order.customer_name || 'Cliente'}
                                </p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.textColor}`}>
                                {status.label}
                              </span>
                            </div>

                            {/* Amount and Date */}
                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Valor</p>
                                <p className="font-bold text-sm text-foreground">
                                  {formatPriceForSeller(parseFloat(order.seller_commission?.toString() || order.amount || '0'), order.currency || 'KZ')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Data</p>
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
                      </div>
                    </div>;
            })}

                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    💡 Para ver mais detalhes, acesse a versão desktop
                  </p>
                </div>
              </div>}
          </div>;
      default:
        return <div className="p-3 md:p-4 space-y-3 bg-background min-h-full max-w-full overflow-x-hidden">
            {/* Header with Live View and Period Filter */}
            <div className="flex items-center justify-between gap-2">
              <select value={timeFilter} onChange={e => {
                const value = e.target.value as typeof timeFilter;
                setTimeFilter(value);
                if (value !== 'custom') {
                  setCustomDateRange({});
                }
              }} className="flex-1 h-9 px-3 rounded-lg border border-border/40 bg-card text-sm font-medium text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors">
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="all">Todo período</option>
                <option value="custom">Personalizado</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('live-view')} className="flex items-center gap-2 text-foreground shrink-0">
                <Radio className="h-4 w-4" />
                <span className="flex items-center gap-1.5">
                  Live View
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </span>
              </Button>
            </div>

            {/* Custom Date Range - Only shows when custom is selected */}
            <div className="flex flex-col gap-2 max-w-full">

              {timeFilter === 'custom' && <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Selecionar Data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9 border-border/40 shadow-sm">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from ? customDateRange.to ? <>
                              {format(customDateRange.from, "dd/MM/yyyy", {
                        locale: pt
                      })} -{" "}
                              {format(customDateRange.to, "dd/MM/yyyy", {
                        locale: pt
                      })}
                            </> : format(customDateRange.from, "dd/MM/yyyy", {
                      locale: pt
                    }) : <span className="text-muted-foreground">Escolher data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-[120]" align="start">
                      <Calendar mode="range" selected={{
                    from: customDateRange.from,
                    to: customDateRange.to
                  }} onSelect={range => setCustomDateRange({
                    from: range?.from,
                    to: range?.to
                  })} initialFocus className="pointer-events-auto" locale={pt} />
                    </PopoverContent>
                  </Popover>
                </div>}

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Produto</label>
                <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/40 bg-card text-sm font-medium text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors">
                  <option value="all">Todos os produtos</option>
                  {products.filter(p => p.status === 'Ativo').map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </div>
            </div>

            {/* Total Sales Card - Compact with left border accent */}
            <div className="bg-card rounded-xl border border-border/40 shadow-sm flex overflow-hidden">
              <div className="w-1 bg-emerald-500 shrink-0" />
              <div className="flex-1 p-4">
                <p className="text-xs text-muted-foreground mb-0.5">Total em vendas</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    {loading ? '...' : formatPriceForSeller(stats.totalRevenue, 'KZ')}
                  </h2>
                </div>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="w-full">
              <ModernSalesChart timeFilter={timeFilter === 'today' ? 'hoje' : timeFilter === 'yesterday' ? 'ontem' : timeFilter === '7d' ? 'ultimos-7-dias' : timeFilter === '30d' ? 'ultimos-30-dias' : timeFilter === '90d' ? 'ultimos-30-dias' : timeFilter === 'custom' ? 'custom' : 'ultimos-7-dias'} customDateRange={customDateRange.from && customDateRange.to ? {
              from: customDateRange.from,
              to: customDateRange.to
            } : null} />
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Dica para vender mais</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compartilhe o link do seu produto nas redes sociais para alcançar mais clientes potenciais.
                  </p>
                </div>
              </div>
            </div>
          </div>;
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
  return <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-background overflow-x-hidden">
        {/* Fixed Header - Similar to Landing */}
        <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="px-2 pt-2">
          <div className={cn('mx-auto transition-all duration-300 px-4 py-3 flex items-center justify-between', isScrolled && 'bg-background/80 backdrop-blur-lg rounded-2xl shadow-lg max-w-4xl')}>
            <img src={isDark ? "/kambafy-logo-light-green.png" : "/kambafy-logo-new.svg"} alt="Kambafy" className="h-14 w-auto" />
            <div className="flex items-center gap-2">
              <button onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  markAllAsRead();
                }
              }} className="relative w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border">
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>}
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border">
                {theme === 'dark' ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
              </button>
              <button onClick={() => setShowQuickMenu(!showQuickMenu)} className="w-10 h-10 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-colors border border-border">
                {showQuickMenu ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Content with padding for fixed header and bottom nav */}
      <div className="pt-20 pb-24">
        {/* Offline Banner */}
        {!isOnline && <div className="sticky top-20 z-10 mx-4 mb-4 bg-destructive/90 backdrop-blur-md text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Sem conexão com a internet</p>
              <p className="text-xs opacity-90">Algumas funcionalidades podem estar limitadas</p>
            </div>
          </div>}
        {renderContent()}
      </div>

      {/* Horizontal Bottom Navigation */}
      {!selectedCourse && <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            {/* Back Button */}
            <button onClick={() => activeTab !== 'home' ? setActiveTab('home') : window.history.back()} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Navigation Icons - Centered Group */}
            <div className="flex items-center gap-4 flex-1 justify-center rounded-full px-6 py-2 bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg transition-all duration-300">
              <button onClick={() => setActiveTab('home')} className={`p-2.5 transition-colors`}>
                <LayoutDashboard className={`h-5 w-5 ${activeTab === 'home' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button onClick={() => setActiveTab('live-view')} className={`p-2.5 transition-colors`}>
                <Radio className={`h-5 w-5 ${activeTab === 'live-view' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button onClick={() => setActiveTab('products')} className={`p-2.5 transition-colors`}>
                <Package className={`h-5 w-5 ${activeTab === 'products' ? 'text-primary' : 'text-foreground'}`} />
              </button>
              
              <button onClick={() => setActiveTab('stats')} className={`p-2.5 transition-colors ${activeTab === 'stats' ? '' : 'hover:bg-accent'}`}>
                <Wallet className={`h-5 w-5 ${activeTab === 'stats' ? 'text-primary' : 'text-foreground'}`} />
              </button>
            </div>

            {/* Profile Button */}
            <button onClick={() => setActiveTab('profile')} className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-shadow flex-shrink-0 overflow-hidden ${activeTab === 'profile' ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={profileAvatar} alt="Profile" />
                <AvatarFallback className={`${activeTab === 'profile' ? 'bg-primary/10' : 'bg-muted'}`}>
                  {isDark ? <img src={kambafyIconGreen} alt="Kambafy" className="h-6 w-6" /> : <User className={`h-5 w-5 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </nav>}

      {/* Withdrawal Modal */}
      <WithdrawalModal open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal} availableBalance={financialData.availableBalance} onWithdrawalSuccess={() => {
        loadStats();
        toast({
          title: "Saque Solicitado",
          description: "Sua solicitação de saque está sendo processada"
        });
      }} />

      {/* Course Viewer */}
      {selectedCourse && <>
          {console.log('🎓 Renderizando AppCourseViewer com:', selectedCourse)}
          <AppCourseViewer courseId={selectedCourse.id} courseName={selectedCourse.name} onClose={() => {
          console.log('🎓 Fechando curso');
          setSelectedCourse(null);
        }} />
        </>}

      {/* Notifications Drawer */}
      <Drawer open={showNotifications} onOpenChange={setShowNotifications}>
        <DrawerContent className="h-[85vh] bg-background dark:bg-background">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle>Notificações</DrawerTitle>
              {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                  Marcar todas
                </Button>}
            </div>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto">
            {notifications.length === 0 ? <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
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
              </Card> : <div className="space-y-3">
                {notifications.map(notification => {
                const getNotificationStyle = (type: string) => {
                  switch (type) {
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
                return <Card key={notification.id} className="overflow-hidden border-none shadow-sm">
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
                    </Card>;
              })}
              </div>}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Quick Menu Drawer */}
      <Drawer open={showQuickMenu} onOpenChange={setShowQuickMenu}>
        <DrawerContent className="h-[85vh] bg-background dark:bg-background">
          <DrawerHeader>
            <DrawerTitle>Resumo Financeiro</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto space-y-4">
            {/* Botão Ver como Aluno */}
            <Button onClick={() => {
              setShowQuickMenu(false);
              setActiveTab('my-courses');
            }} variant="outline" className="w-full border-border" size="sm">
              <GraduationCap className="h-4 w-4 mr-2" />
              Ver como Aluno
            </Button>
            
            {/* Meta Kamba */}
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {nextLevel ? `Meta: ${nextLevel.name}` : 'Nível Máximo! 🎉'}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{
                      width: `${goalProgress}%`
                    }} />
                  </div>
                  <span className="font-semibold text-xs text-primary">
                    {goalProgress.toFixed(0)}%
                  </span>
                </div>
              </div>
              {currentLevel && <p className="text-[10px] text-muted-foreground">
                  Nível: {currentLevel.name} {currentLevel.emoji}
                </p>}
              {nextLevel && <p className="text-[10px] text-muted-foreground mt-1">
                  Falta: {formatPriceForSeller(monthlyGoal - totalRevenueUnfiltered, 'KZ')}
                </p>}
            </div>
            
            {/* Saldo Disponível */}
            <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent-foreground" />
                <span className="text-xs text-muted-foreground">Saldo disponível</span>
              </div>
              <span className="font-bold text-sm text-card-foreground">
                {formatPriceForSeller(financialData.availableBalance, 'KZ')}
              </span>
            </div>

            {/* Total de Vendas */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total de Vendas</span>
              </div>
              <span className="font-bold text-sm text-card-foreground">
                {statsUnfiltered.totalSales}
              </span>
            </div>

            {/* Faturamento Total */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Faturamento</span>
              </div>
              <span className="font-bold text-sm text-card-foreground">
                {formatPriceForSeller(statsUnfiltered.totalRevenue, 'KZ')}
              </span>
            </div>

            <div className="pt-2 space-y-2">
              <Button onClick={() => {
                setShowQuickMenu(false);
                setActiveTab('sales-history');
              }} variant="outline" className="w-full border-border" size="sm">
                Histórico de Vendas
              </Button>
              <Button onClick={() => {
                setShowQuickMenu(false);
                setActiveTab('stats');
              }} variant="outline" className="w-full border-border" size="sm">
                Financeiro
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      </div>
    </div>;
}