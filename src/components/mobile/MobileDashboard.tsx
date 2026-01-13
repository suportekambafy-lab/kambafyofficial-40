import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MobileDashboardHeader } from './MobileDashboardHeader';
import { MobileMetricCards } from './MobileMetricCards';
import { MobileFilters } from './MobileFilters';
import { MobileProfile } from './MobileProfile';
import { MobileSalesChart } from './MobileSalesChart';
import { Button } from "@/components/ui/button";
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { Home, BarChart3, User } from 'lucide-react';
import { getActualCurrency, getActualAmount, calculateSellerEarning } from '@/utils/currencyUtils';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';

interface Order {
  id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  product_id: string;
  payment_method?: string | null;
  original_amount?: string | number | null;
  original_currency?: string | null;
}

interface SalesData {
  totalRevenue: number;
  totalSales: number;
  revenueByMoeda: {
    KZ: number;
    EUR: number;
    MZN: number;
    USD: number;
    GBP: number;
    BRL: number;
  };
}

export function MobileDashboard() {
  const { user, signOut } = useAuth();
  const { preferredCurrency, loading: currencyLoading } = usePreferredCurrency();
  const [selectedProduct, setSelectedProduct] = useState('todos');
  const [timeFilter, setTimeFilter] = useState('hoje');
  // Iniciar vazio - será preenchido pelo preferredCurrency quando disponível
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Total da Meta (gamificação) vem do banco (RPC) para evitar limite de 1000 rows
  const [gamificationTotalKZ, setGamificationTotalKZ] = useState(0);

  const userManuallyChangedCurrency = useRef(false);

  // Set default currency from user's preferred currency
  // Only auto-update if user hasn't manually changed the filter
  useEffect(() => {
    if (!preferredCurrency || currencyLoading) return;

    // Se o usuário já mudou manualmente, não sobrescrever
    if (userManuallyChangedCurrency.current) return;

    // Se não há moeda selecionada, usar a preferida
    if (!selectedCurrency) {
      setSelectedCurrency(preferredCurrency);
      lastPreferredCurrencyRef.current = preferredCurrency;
      return;
    }

    // Se a moeda selecionada é a antiga preferida, atualizar para nova
    const lastPreferred = lastPreferredCurrencyRef.current;
    if (lastPreferred && selectedCurrency === lastPreferred && preferredCurrency !== lastPreferred) {
      setSelectedCurrency(preferredCurrency);
    }

    lastPreferredCurrencyRef.current = preferredCurrency;
  }, [preferredCurrency, currencyLoading, selectedCurrency]);

  // Handler para mudança manual de moeda pelo usuário
  const handleCurrencyChange = (currency: string) => {
    userManuallyChangedCurrency.current = true;
    setSelectedCurrency(currency);
  };

  // Load all orders once and filter in memory for instant response
  const loadAllOrders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Buscar produtos do usuário primeiro
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setAllOrders([]);
        return;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, amount, currency, status, created_at, product_id, payment_method, original_amount, original_currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      if (error) {
        console.error('Error fetching orders data:', error);
        return;
      }

      setAllOrders(orders || []);
    } catch (error) {
      console.error('Error fetching orders data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadGamificationTotal = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any).rpc('get_my_gamification_total_kz');
      if (error) {
        console.error('Error loading gamification total (RPC):', error);
        return;
      }

      const total = typeof data === 'number' ? data : parseFloat(data || '0');
      setGamificationTotalKZ(Number.isFinite(total) ? total : 0);
    } catch (err) {
      console.error('Error loading gamification total:', err);
    }
  }, [user]);

  // Filter orders in memory for instant response
  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Apply time filter
    const now = new Date();
    if (timeFilter === 'hoje') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= today
      );
    } else if (timeFilter === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= weekAgo
      );
    } else if (timeFilter === 'mes') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= monthAgo
      );
    }

    // Apply product filter
    if (selectedProduct !== 'todos') {
      filtered = filtered.filter(order => order.product_id === selectedProduct);
    }

    // Apply currency filter using getActualCurrency
    filtered = filtered.filter(order => {
      const actualCurrency = getActualCurrency(order);
      return actualCurrency === selectedCurrency;
    });

    return filtered;
  }, [allOrders, selectedProduct, timeFilter, selectedCurrency]);

  // Calculate sales data from filtered orders using currencyUtils
  const salesData = useMemo(() => {
    const revenueByMoeda: SalesData['revenueByMoeda'] = { KZ: 0, EUR: 0, MZN: 0, USD: 0, GBP: 0, BRL: 0 };
    let totalRevenue = 0;
    const totalSales = filteredOrders.length;

    filteredOrders.forEach(order => {
      const actualCurrency = getActualCurrency(order);
      const actualAmount = getActualAmount(order);
      const sellerEarning = calculateSellerEarning(actualAmount, actualCurrency);
      
      if (actualCurrency in revenueByMoeda) {
        revenueByMoeda[actualCurrency as keyof typeof revenueByMoeda] += sellerEarning;
      }
      totalRevenue += sellerEarning;
    });

    return {
      totalRevenue,
      totalSales,
      revenueByMoeda
    };
  }, [filteredOrders]);

  useEffect(() => {
    if (user) {
      loadAllOrders();
      loadGamificationTotal();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('mobile-dashboard-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Mobile dashboard orders update:', payload);
            loadAllOrders();
            loadGamificationTotal();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadAllOrders, loadGamificationTotal]);

  const formatPrice = (amount: number, currency: string = 'KZ'): string => {
    return formatPriceForSeller(amount, currency);
  };

  // Calcular próxima meta não alcançada para mobile
  const kambaLevels = [1000000, 5000000, 15000000, 50000000, 100000000];
  let goal = 1000000; // Primeira meta por padrão
  
  // Encontrar a próxima meta não alcançada
  for (let i = 0; i < kambaLevels.length; i++) {
    if (gamificationTotalKZ < kambaLevels[i]) {
      goal = kambaLevels[i];
      break;
    }
  }

  const progressPercentage = Math.min((gamificationTotalKZ / goal) * 100, 100);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <MobileProfile />;
      case 'stats':
        return (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-semibold">Relatórios</h2>
            <MobileSalesChart />
          </div>
        );
      default:
        return (
          <>
            <MobileDashboardHeader 
              goal={goal}
              totalRevenue={gamificationTotalKZ}
              progressPercentage={progressPercentage}
            />

            <div className="p-4 space-y-6">
              <MobileFilters 
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={handleCurrencyChange}
              />

              <MobileMetricCards 
                salesData={salesData}
                loading={loading}
                formatPrice={formatPrice}
                selectedCurrency={selectedCurrency}
              />

              <MobileSalesChart selectedCurrency={selectedCurrency} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderTabContent()}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center p-3 ${activeTab === 'home' ? 'text-checkout-green' : 'text-gray-500'}`}
            onClick={() => setActiveTab('home')}
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center p-3 ${activeTab === 'stats' ? 'text-checkout-green' : 'text-gray-500'}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 className="h-6 w-6 mb-1" />
            <span className="text-xs">Relatórios</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex flex-col items-center p-3 ${activeTab === 'profile' ? 'text-checkout-green' : 'text-gray-500'}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
