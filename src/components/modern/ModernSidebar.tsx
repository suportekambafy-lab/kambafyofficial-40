
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerTheme } from '@/hooks/useSellerTheme';
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

const menuItems = [
  { label: "Dashboard", href: "/vendedor", icon: LayoutDashboard },
  { label: "Produtos", href: "/vendedor/produtos", icon: Package },
  { label: "Vendas", href: "/vendedor/vendas", icon: TrendingUp },
  { label: "Financeiro", href: "/vendedor/financeiro", icon: DollarSign },
  { label: "Membros", href: "/vendedor/membros", icon: Users },
  { label: "Pagamentos Módulos", href: "/vendedor/membros/pagamentos", icon: Coins },
  { label: "Kamba Extra", href: "/vendedor/marketplace", icon: Store },
  { label: "Afiliados", href: "/vendedor/afiliados", icon: UserCheck },
  { label: "Assinaturas", href: "/vendedor/assinaturas", icon: CreditCard },
  { label: "Reembolsos", href: "/vendedor/reembolsos", icon: AlertCircle },
  { label: "Relatórios", href: "/vendedor/relatorios", icon: FileText },
  { label: "Colaboradores", href: "/vendedor/colaboradores", icon: UserPlus },
  { label: "Apps", href: "/vendedor/apps", icon: Grid3X3 },
];

const bottomItems = [
  { label: "Configurações", href: "/vendedor/configuracoes", icon: Settings },
  { label: "Ajuda", href: "/vendedor/ajuda", icon: HelpCircle },
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
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
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
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          amount = grossAmount * 0.92;
        }
        
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        return sum + amount;
      }, 0) || 0;

      setDashboardData({ totalRevenue });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

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

  const kambaLevels = [1000000, 5000000, 15000000, 50000000, 100000000];
  let nextGoal = 1000000;
  
  for (let i = 0; i < kambaLevels.length; i++) {
    if (dashboardData.totalRevenue < kambaLevels[i]) {
      nextGoal = kambaLevels[i];
      break;
    }
  }

  const progressPercent = Math.min((dashboardData.totalRevenue / nextGoal) * 100, 100);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K`;
    } else {
      return `${Math.round(value)}`;
    }
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
                className="h-10 w-auto"
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
            <div className="px-4 py-4 border-b border-sidebar-border">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
                  <span className="text-primary font-semibold">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-primary rounded-full" 
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
                  <span>{item.label}</span>
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
                  <span>{item.label}</span>
                </NavLink>
              ))}
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                <span>Sair</span>
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
            className="h-10 w-auto"
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
      <div className={`border-b border-sidebar-border ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5" title={`${formatCurrency(dashboardData.totalRevenue)} / ${formatCurrency(nextGoal)} KZ`}>
            <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-primary rounded-full" 
              />
            </div>
            <span className="text-[10px] text-primary font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
              <span className="text-primary font-semibold">{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-primary rounded-full" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overflow-x-visible scrollbar-hide">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 group relative overflow-visible ${
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -left-6 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary rounded-r-full"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
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
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
            title={collapsed ? item.label : undefined}
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
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
        
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-150 text-destructive hover:bg-destructive/10 w-full"
          title={collapsed ? "Sair" : undefined}
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
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
