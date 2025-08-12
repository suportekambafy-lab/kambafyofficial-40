
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MobileDashboardHeader } from './MobileDashboardHeader';
import { MobileMetricCards } from './MobileMetricCards';
import { MobileFilters } from './MobileFilters';
import { MobileProfile } from './MobileProfile';
import { MobileSalesChart } from './MobileSalesChart';
import { Button } from "@/components/ui/button";
import { Home, BarChart3, User } from 'lucide-react';

interface Order {
  id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  product_id: string;
}

interface SalesData {
  totalRevenue: number;
  totalSales: number;
  revenueByMoeda: {
    KZ: number;
    EUR: number;
    MZN: number;
  };
}

export function MobileDashboard() {
  const { user, signOut } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('todos');
  const [timeFilter, setTimeFilter] = useState('hoje');
  const [activeTab, setActiveTab] = useState('home');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select('*')
        .in('product_id', userProductIds);

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

    return filtered;
  }, [allOrders, selectedProduct, timeFilter]);

  // Calculate sales data from filtered orders
  const salesData = useMemo(() => {
    const revenueByMoeda = { KZ: 0, EUR: 0, MZN: 0 };
    let totalRevenue = 0;
    const totalSales = filteredOrders.length;

    filteredOrders.forEach(order => {
      const amount = parseFloat(order.amount || '0');
      const currency = order.currency || 'KZ';
      
      if (currency === 'KZ') {
        revenueByMoeda.KZ += amount;
        totalRevenue += amount;
      } else if (currency === 'EUR') {
        revenueByMoeda.EUR += amount;
        totalRevenue += amount * 833;
      } else if (currency === 'MZN') {
        revenueByMoeda.MZN += amount;
        totalRevenue += amount * 13;
      }
    });

    return {
      totalRevenue,
      totalSales,
      revenueByMoeda
    };
  }, [filteredOrders]);

  // Calculate total sales data for progress bar
  const totalSalesData = useMemo(() => {
    const revenueByMoeda = { KZ: 0, EUR: 0, MZN: 0 };
    let totalRevenue = 0;
    const totalSales = allOrders.length;

    allOrders.forEach(order => {
      const amount = parseFloat(order.amount || '0');
      const currency = order.currency || 'KZ';
      
      if (currency === 'KZ') {
        revenueByMoeda.KZ += amount;
        totalRevenue += amount;
      } else if (currency === 'EUR') {
        revenueByMoeda.EUR += amount;
        totalRevenue += amount * 833;
      } else if (currency === 'MZN') {
        revenueByMoeda.MZN += amount;
        totalRevenue += amount * 13;
      }
    });

    return {
      totalRevenue,
      totalSales,
      revenueByMoeda
    };
  }, [allOrders]);

  useEffect(() => {
    if (user) {
      loadAllOrders();
      
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
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadAllOrders]);

  const formatPrice = (amount: number): string => {
    return `${parseFloat(amount.toString()).toLocaleString('pt-BR')} KZ`;
  };

  const goal = 1000000;
  const progressPercentage = Math.min((totalSalesData.totalRevenue / goal) * 100, 100);

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
              totalRevenue={totalSalesData.totalRevenue}
              progressPercentage={progressPercentage}
            />

            <div className="p-4 space-y-6">
              <MobileFilters 
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
              />

              <MobileMetricCards 
                salesData={salesData}
                loading={loading}
                formatPrice={formatPrice}
              />

              <MobileSalesChart />
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
