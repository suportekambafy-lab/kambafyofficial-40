
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
  RotateCcw,
  Coins
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
      // Primeiro, buscar produtos do usuário
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

      // Buscar vendas usando product_id - EXCLUIR member_access
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
        // ✅ Usar seller_commission se disponível, senão descontar 8% do amount
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          amount = grossAmount * 0.92; // Descontar 8% da plataforma
        }
        
        // Converter para KZ se necessário
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053, // 1 EUR = ~1053 KZ
            'MZN': 14.3  // 1 MZN = ~14.3 KZ
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

  // Calcular próximo nível e progresso baseado nas metas Kamba
  const kambaLevels = [1000000, 5000000, 15000000, 50000000, 100000000];
  let nextGoal = 1000000; // Primeira meta por padrão
  
  // Encontrar a próxima meta não alcançada
  for (let i = 0; i < kambaLevels.length; i++) {
    if (dashboardData.totalRevenue < kambaLevels[i]) {
      nextGoal = kambaLevels[i];
      break;
    }
  }

  // Progresso sempre de 0 até a próxima meta
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

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-0 top-0 h-screen w-80 bg-sidebar border-r border-sidebar-border/30 dark:border-sidebar/30 flex flex-col z-50 shadow-xl"
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/30 dark:border-sidebar/30">
              <img 
                src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
                alt="Kambafy" 
                className="h-16 w-auto"
              />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-8 h-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress bar above navigation */}
              <div className="px-4 py-2 border-b border-sidebar-border/30 dark:border-sidebar/30">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                    <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-sidebar-accent rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-3 space-y-1">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={handleItemClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive 
                          ? "bg-primary/10 text-primary border-l-2 border-primary ml-1" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Bottom Section Mobile */}
              <div className="border-t border-sidebar-border/30 dark:border-sidebar/30 p-3 space-y-1">
                {bottomItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={handleItemClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </NavLink>
                ))}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop sidebar
  return (
    <motion.div
      animate={{ 
        width: collapsed ? 80 : 320
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={() => !isMobile && onToggle && collapsed && onToggle()}
      onMouseLeave={() => !isMobile && onToggle && !collapsed && onToggle()}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border/30 dark:border-sidebar/30 flex flex-col z-50 shadow-sm"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border/30 dark:border-sidebar/30">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <img 
                src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
                alt="Kambafy" 
                className="h-16 w-auto"
              />
            </motion.div>
          ) : (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              src="/kambafy-icon-collapsed.svg"
              alt="Kambafy"
              className="w-8 h-8 dark:brightness-0 dark:invert"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar above navigation */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-2 border-b border-sidebar-border/30 dark:border-sidebar/30"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
              <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-sidebar-accent rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {menuItems.map((item) => (
           <NavLink
             key={item.href}
             to={item.href}
             className={({ isActive }) =>
               `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                 isActive 
                   ? "bg-primary/10 text-primary dark:text-white border-l-2 border-primary ml-1" 
                   : "text-sidebar-foreground/70 dark:text-white/70 hover:bg-sidebar-accent hover:text-sidebar-foreground dark:hover:text-white"
               }`
             }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border/30 dark:border-sidebar/30 p-3 space-y-1">
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
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
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}
