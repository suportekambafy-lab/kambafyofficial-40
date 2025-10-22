"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  Menu,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sidebar Context
interface SidebarContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const useSidebarInternal = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarInternal must be used within a SidebarProvider");
  }
  return context;
};

const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

const menuItems = [
  { label: "Dashboard", href: "/vendedor", icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" /> },
  { label: "Produtos", href: "/vendedor/produtos", icon: <Package className="h-5 w-5 flex-shrink-0" /> },
  { label: "Vendas", href: "/vendedor/vendas", icon: <TrendingUp className="h-5 w-5 flex-shrink-0" /> },
  { label: "Financeiro", href: "/vendedor/financeiro", icon: <DollarSign className="h-5 w-5 flex-shrink-0" /> },
  { label: "Membros", href: "/vendedor/membros", icon: <Users className="h-5 w-5 flex-shrink-0" /> },
  { label: "Pagamentos Módulos", href: "/vendedor/membros/pagamentos", icon: <Coins className="h-5 w-5 flex-shrink-0" /> },
  { label: "Kamba Extra", href: "/vendedor/marketplace", icon: <Store className="h-5 w-5 flex-shrink-0" /> },
  { label: "Afiliados", href: "/vendedor/afiliados", icon: <UserCheck className="h-5 w-5 flex-shrink-0" /> },
  { label: "Assinaturas", href: "/vendedor/assinaturas", icon: <CreditCard className="h-5 w-5 flex-shrink-0" /> },
  { label: "Relatórios", href: "/vendedor/relatorios", icon: <FileText className="h-5 w-5 flex-shrink-0" /> },
  { label: "Colaboradores", href: "/vendedor/colaboradores", icon: <UserPlus className="h-5 w-5 flex-shrink-0" /> },
  { label: "Apps", href: "/vendedor/apps", icon: <Grid3X3 className="h-5 w-5 flex-shrink-0" /> },
];

const bottomItems = [
  { label: "Configurações", href: "/vendedor/configuracoes", icon: <Settings className="h-5 w-5 flex-shrink-0" /> },
  { label: "Ajuda", href: "/vendedor/ajuda", icon: <HelpCircle className="h-5 w-5 flex-shrink-0" /> },
];

interface ModernSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const SidebarLink = ({
  link,
  onClick,
}: {
  link: { label: string; href: string; icon: React.ReactNode };
  onClick?: () => void;
}) => {
  const { open, animate } = useSidebarInternal();
  return (
    <NavLink
      to={link.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary dark:text-primary"
            : "text-sidebar-foreground/70 dark:text-neutral-200 hover:bg-sidebar-accent hover:text-sidebar-foreground dark:hover:text-white"
        )
      }
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre"
      >
        {link.label}
      </motion.span>
    </NavLink>
  );
};

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

  // Mobile Sidebar
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            
            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-0 top-0 h-screen w-80 bg-neutral-100 dark:bg-neutral-900 flex flex-col z-50 shadow-xl"
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <img 
                  src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
                  alt="Kambafy" 
                  className="h-16 w-auto"
                />
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-sidebar-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="px-4 py-3 border-b border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={handleItemClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary dark:text-primary"
                          : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                      )
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Bottom Section */}
              <div className="border-t border-border px-4 py-3 space-y-1">
                {bottomItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={handleItemClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      )
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(!collapsed);

  return (
    <SidebarProvider open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
      <motion.div
        className="fixed left-0 top-0 h-screen bg-neutral-100 dark:bg-neutral-900 border-r border-border flex flex-col z-50 shadow-sm"
        animate={{
          width: sidebarOpen ? "300px" : "60px",
        }}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-border">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.img
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={isDark ? "/lovable-uploads/5e875bc1-8187-4fab-ae01-ab403e30d124.png" : "/lovable-uploads/6c4df954-d45e-4bb6-b6e3-107e576f37b9.png"}
                alt="Kambafy"
                className="h-16 w-auto"
              />
            ) : (
              <motion.img
                key="logo-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src="/kambafy-icon-collapsed.svg"
                alt="K"
                className="w-8 h-8 dark:brightness-0 dark:invert"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 border-b border-border"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Meta: {formatCurrency(dashboardData.totalRevenue)} / {formatCurrency(nextGoal)} KZ</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarLink key={item.href} link={item} />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border px-4 py-3 space-y-1">
          {bottomItems.map((item) => (
            <SidebarLink key={item.href} link={item} />
          ))}
          
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full",
              !sidebarOpen && "justify-center"
            )}
            title={!sidebarOpen ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <motion.span
              animate={{
                display: sidebarOpen ? "inline-block" : "none",
                opacity: sidebarOpen ? 1 : 0,
              }}
              className="text-sm whitespace-pre"
            >
              Sair
            </motion.span>
          </button>
        </div>
      </motion.div>
    </SidebarProvider>
  );
}
