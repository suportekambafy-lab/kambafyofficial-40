import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSellerPendingRefunds } from '@/hooks/useSellerPendingRefunds';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  DollarSign,
  Users,
  Store,
  UserCheck,
  CreditCard,
  FileText,
  UserPlus,
  Grid3X3,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Coins,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { convertToKZ } from '@/utils/exchangeRates';

const menuItems = [
  { key: "menu.dashboard", href: "/vendedor", icon: LayoutDashboard },
  { key: "menu.products", href: "/vendedor/produtos", icon: Package },
  { key: "menu.sales", href: "/vendedor/vendas", icon: TrendingUp },
  { key: "menu.financial", href: "/vendedor/financeiro", icon: DollarSign },
  { key: "menu.memberAreas", href: "/vendedor/membros", icon: Users },
  { key: "menu.modulePayments", href: "/vendedor/modulos-pagamentos", icon: Coins },
  { key: "menu.marketplace", href: "/vendedor/marketplace", icon: Store },
  { key: "menu.affiliates", href: "/vendedor/afiliados", icon: UserCheck },
  { key: "Indique e Ganhe", href: "/vendedor/indicacoes", icon: Users, isNew: true },
  { key: "menu.subscriptions", href: "/vendedor/assinaturas", icon: CreditCard },
  { key: "menu.refunds", href: "/vendedor/reembolsos", icon: AlertCircle },
  { key: "menu.reports", href: "/vendedor/relatorios", icon: FileText, isNew: true },
  { key: "menu.collaborators", href: "/vendedor/colaboradores", icon: UserPlus },
  { key: "menu.apps", href: "/vendedor/apps", icon: Grid3X3 },
];

const bottomItems = [
  { key: "menu.settings", href: "/vendedor/configuracoes", icon: Settings },
  { key: "menu.help", href: "/vendedor/ajuda", icon: HelpCircle },
];

interface ModernSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ModernSidebar({ 
  collapsed, 
  onToggle, 
  isMobile = false, 
  isOpen = true, 
  onClose 
}: ModernSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useSellerTheme();
  const { t } = useTranslation();
  const { count: pendingRefundsCount } = useSellerPendingRefunds();
  const { preferredCurrency } = usePreferredCurrency();
  const displayCurrency = preferredCurrency || '';
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
  });

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setDashboardData({ totalRevenue: 0 });
        return;
      }

      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('amount, seller_commission, currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        return;
      }

      const totalRevenue = allOrders?.reduce((sum, order) => {
        // Use seller_commission (net value) for consistency
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          // Apply commission: 8.99% for KZ, 9.99% for others
          const commissionRate = order.currency === 'KZ' ? 0.0899 : 0.0999;
          amount = grossAmount * (1 - commissionRate);
        }
        
        // Convert to KZ using centralized exchange rates
        const currency = order.currency || 'KZ';
        return sum + convertToKZ(amount, currency);
      }, 0) || 0;

      setDashboardData({ totalRevenue });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Set up real-time subscription for orders
      const channel = supabase
        .channel('sidebar-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Sidebar orders update:', payload);
            loadDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadDashboardData]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  // Meta (gamificação) usa o valor bruto/"score" já calculado; mostramos apenas a sigla da moeda preferida.
  const kambaLevels = [1000000, 5000000, 15000000, 50000000, 100000000];
  let nextGoal = 1000000;

  for (let i = 0; i < kambaLevels.length; i++) {
    if (dashboardData.totalRevenue < kambaLevels[i]) {
      nextGoal = kambaLevels[i];
      break;
    }
  }

  const progressPercent = Math.min((dashboardData.totalRevenue / nextGoal) * 100, 100);

  // Importante: estas metas são um "score" de gamificação (valores fixos do sistema).
  // Regra solicitada: 1.000.000 KZ => 1.000 EUR (ou seja, EUR = KZ / 1000). Outras moedas mantêm o valor.
  const convertFromKZ = (valueKZ: number) => (displayCurrency === 'EUR' ? valueKZ / 1000 : valueKZ);

  const formatCurrency = (value: number) => {
    const formatInt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (displayCurrency === 'EUR') return formatInt(value);

    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}K`;
    return `${Math.round(value)}`;
  };

  const handleItemClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Mobile sidebar
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col z-50 shadow-lg-soft"
          >
            {/* Header */}
            <div className="h-[70px] flex items-center justify-between px-4 border-b border-sidebar-border">
              <img 
                src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
                alt="Kambafy" 
                className="h-[60px] w-auto"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Section */}
            <div className="px-4 py-2 border-b border-sidebar-border">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>
                    Meta: {formatCurrency(convertFromKZ(dashboardData.totalRevenue))} / {formatCurrency(convertFromKZ(nextGoal))}
                    {displayCurrency ? ` ${displayCurrency}` : ''}
                  </span>
                  <span className="text-yellow-500 font-semibold">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-yellow-500 rounded-full" 
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
              {menuItems.map((item, index) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={handleItemClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                      isActive 
                        ? "bg-sidebar-accent text-primary" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1">{t(item.key)}</span>
                  {item.isNew && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">
                      Novo
                    </span>
                  )}
                  {item.href === '/vendedor/reembolsos' && pendingRefundsCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full">
                      {pendingRefundsCount > 99 ? '99+' : pendingRefundsCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Bottom Section */}
            <div className="border-t border-sidebar-border p-3 space-y-0.5">
              {bottomItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={handleItemClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                      isActive 
                        ? "bg-sidebar-accent text-primary" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{t(item.key)}</span>
                </NavLink>
              ))}
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{t('menu.logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop sidebar
  return (
    <div
      style={{ width: collapsed ? 80 : 260 }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 shadow-card transition-all duration-300"
    >
      {/* Header */}
      <div className="h-[70px] flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed ? (
          <img 
            src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
            alt="Kambafy" 
            className="h-[60px] w-auto"
          />
        ) : (
          <img
            src={isDark ? "/kambafy-icon-dark.png" : "/kambafy-icon-light.png"}
            alt="Kambafy"
            className="w-8 h-8 mx-auto"
          />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="flex-shrink-0 w-8 h-8 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Progress Section */}
            <div className={`${collapsed ? 'px-2 py-2' : 'px-4 py-2'}`}>
              {collapsed ? (
                <div
                  className="flex flex-col items-center gap-1.5"
                  title={`${formatCurrency(convertFromKZ(dashboardData.totalRevenue))} / ${formatCurrency(convertFromKZ(nextGoal))}${displayCurrency ? ` ${displayCurrency}` : ''}`}
                >
            <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-yellow-500 rounded-full" 
              />
            </div>
            <span className="text-[10px] text-yellow-500 font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
        ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                  Meta: {formatCurrency(convertFromKZ(dashboardData.totalRevenue))} / {formatCurrency(convertFromKZ(nextGoal))}
                  {displayCurrency ? ` ${displayCurrency}` : ''}
                </span>
                <span className="text-yellow-500 font-semibold">{progressPercent.toFixed(0)}%</span>
              </div>
            <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-yellow-500 rounded-full" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => (
          <div key={item.href} className="relative">
            {/* Active Indicator - positioned at sidebar edge */}
            <NavLink
              to={item.href}
              end={item.href === "/vendedor"}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-4 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                  isActive 
                    ? "bg-sidebar-accent text-primary" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`
              }
              title={collapsed ? t(item.key) : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-primary rounded-r-full" />
                  )}
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden flex-1"
                      >
                        {t(item.key)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.isNew && !collapsed && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">
                      Novo
                    </span>
                  )}
                  {item.href === '/vendedor/reembolsos' && pendingRefundsCount > 0 && (
                    <span className={`bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full ${collapsed ? 'absolute -top-1 -right-1' : ''}`}>
                      {pendingRefundsCount > 99 ? '99+' : pendingRefundsCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
            title={collapsed ? t(item.key) : undefined}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0 ml-1" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {t(item.key)}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
        
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 text-destructive hover:bg-destructive/10 w-full"
          title={collapsed ? t('menu.logout') : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0 ml-1" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {t('menu.logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
