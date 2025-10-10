import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { 
  Bell, 
  ChevronDown, 
  Settings, 
  LogOut,
  Menu,
  HelpCircle,
  Search,
  Package,
  TrendingUp,
  DollarSign,
  Users,
  Store,
  Zap,
  BarChart3,
  UserPlus,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AvatarDrawer } from '@/components/ui/avatar-drawer';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { Input } from '@/components/ui/input';
import { ActionSearchBar, type Action } from '@/components/ui/action-search-bar';
import { NotificationCenter } from '@/components/ui/notification-center';
import { SellerNotificationCenter } from '@/components/SellerNotificationCenter';

interface ModernTopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

export function ModernTopBar({ sidebarCollapsed, onToggleSidebar, isMobile = false }: ModernTopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, setTheme } = useSellerTheme();
  const [searchExpanded, setSearchExpanded] = useState(false); // Mobile starts collapsed
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
  });
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileName, setProfileName] = useState("");
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, action: string}>>([]);
  const [recentSalesCount, setRecentSalesCount] = useState(0);
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadProfileData();
      checkNotifications();
      loadRecentSales();
      
      // Real-time updates for notifications
      const interval = setInterval(() => {
        loadRecentSales();
        loadDashboardData();
      }, 30000);

      // Set up real-time subscription for new orders
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New sale detected:', payload);
            loadRecentSales();
            loadDashboardData();
          }
        )
        .subscribe();
      
      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadRecentSales = async () => {
    if (!user) return;

    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          products!inner(
            user_id
          )
        `)
        .eq('products.user_id', user.id)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access')
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (error) {
        console.error('Error loading recent sales:', error);
        return;
      }

      setRecentSalesCount(orders?.length || 0);
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          amount,
          currency,
          products!inner(
            user_id
          )
        `)
        .eq('products.user_id', user.id)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        return;
      }

      // Buscar saldo real do customer_balances (fonte de verdade)
      const { data: balanceData, error: balanceError } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError) {
        console.error('Error loading balance:', balanceError);
      }

      const totalRevenue = balanceData?.balance || 0;

      setDashboardData({ totalRevenue });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, iban')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        setProfileAvatar(profile.avatar_url || "");
        setProfileName(profile.full_name || "");
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const checkNotifications = async () => {
    if (!user) return;

    try {
      const notifications: Array<{id: string, message: string, action: string}> = [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('iban, full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.iban) {
        notifications.push({
          id: 'iban',
          message: 'Configure seu IBAN para começar a receber',
          action: '/vendedor/financeiro'
        });
      }

      if (!profile?.full_name || !profile?.avatar_url) {
        notifications.push({
          id: 'profile',
          message: 'Configure seu perfil',
          action: '/vendedor/configuracoes'
        });
      }

      // Add recent sales notification
      if (recentSalesCount > 0) {
        notifications.push({
          id: 'recent_sales',
          message: `${recentSalesCount} vendas nas últimas 24 horas`,
          action: '/vendedor/vendas'
        });
      }

      // Check for pending affiliate requests
      const { data: affiliateRequests, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, affiliate_name, product_id, products(name)')
        .eq('user_id', user.id)
        .eq('status', 'pendente');

      if (!affiliateError && affiliateRequests && affiliateRequests.length > 0) {
        notifications.push({
          id: 'affiliate_requests',
          message: `${affiliateRequests.length} ${affiliateRequests.length === 1 ? 'novo pedido' : 'novos pedidos'} de afiliação`,
          action: '/vendedor/afiliados'
        });
      }

      setNotifications(notifications);
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Update notifications when recent sales count changes
  useEffect(() => {
    if (user) {
      checkNotifications();
    }
  }, [recentSalesCount, user]);

  const handleNotificationClick = (action: string) => {
    navigate(action);
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

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const searchActions: Action[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="h-4 w-4 text-blue-500" />,
      description: 'Principal',
      short: '⌘D',
      end: 'Navigation'
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: <Package className="h-4 w-4 text-green-500" />,
      description: 'Principal',
      short: '⌘P',
      end: 'Navigation'
    },
    {
      id: 'vendas',
      label: 'Vendas',
      icon: <TrendingUp className="h-4 w-4 text-orange-500" />,
      description: 'Principal',
      short: '⌘V',
      end: 'Navigation'
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: <DollarSign className="h-4 w-4 text-purple-500" />,
      description: 'Principal',
      short: '⌘F',
      end: 'Navigation'
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: <Zap className="h-4 w-4 text-yellow-500" />,
      description: 'Ferramentas',
      short: '⌘A',
      end: 'Navigation'
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings className="h-4 w-4 text-gray-500" />,
      description: 'Configurações',
      short: '⌘S',
      end: 'Settings'
    },
    {
      id: 'ajuda',
      label: 'Ajuda',
      icon: <HelpCircle className="h-4 w-4 text-blue-400" />,
      description: 'Configurações',
      short: '⌘H',
      end: 'Help'
    }
  ];

  const handleActionSelect = (actionId: string) => {
    const pathMap: { [key: string]: string } = {
      'dashboard': '/vendedor',
      'produtos': '/vendedor/produtos',
      'vendas': '/vendedor/vendas',
      'financeiro': '/vendedor/financeiro',
      'apps': '/vendedor/apps',
      'configuracoes': '/vendedor/configuracoes',
      'ajuda': '/vendedor/ajuda'
    };

    const path = pathMap[actionId];
    if (path) {
      navigate(path);
      setShowSuggestions(false);
      if (isMobile) {
        setSearchExpanded(false);
      }
    }
  };

  return (
    <>
      <div className="h-16 bg-card border-b border-border/30 dark:border-border/20 z-20 flex items-center justify-between px-4 md:px-6 shadow-sm transition-colors duration-300">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Search Bar - Only on Desktop */}
          {!isMobile && (
            <div className="flex items-center transition-all duration-300 w-80 max-w-[400px] relative">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Buscar produtos, vendas, financeiro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border-border bg-card"
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                
                {/* Search Suggestions */}
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="absolute top-12 left-0 w-full border rounded-md shadow-sm overflow-hidden bg-card mt-1 z-50"
                  >
                    <motion.ul>
                      {searchActions
                        .filter(action => !searchQuery || action.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((action) => (
                        <motion.li
                          key={action.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="px-3 py-2 flex items-center justify-between hover:bg-accent cursor-pointer rounded-md"
                          onClick={() => handleActionSelect(action.id)}
                        >
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {action.icon}
                              </span>
                              <span className="text-sm font-medium text-foreground">
                                {action.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {action.description}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {action.short}
                            </span>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Seller Notifications */}
          <SellerNotificationCenter />

          {/* Divider */}
          <div className="h-6 w-px bg-black/30 dark:bg-white/20 mx-2" />

          {/* User menu - Desktop Dropdown, Mobile Drawer */}
          {isMobile ? (
            <>
              <Button 
                variant="ghost" 
                className="flex items-center gap-3 h-10 px-3 text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                onClick={() => setAvatarDrawerOpen(true)}
              >
                <Avatar className="h-8 w-8 ring-2 ring-border">
                  <AvatarImage 
                    src={profileAvatar} 
                    alt={profileName || user?.email}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium truncate max-w-28">
                  {profileName || user?.email}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <AvatarDrawer
                isOpen={avatarDrawerOpen}
                onClose={() => setAvatarDrawerOpen(false)}
                profileAvatar={profileAvatar}
                profileName={profileName}
                isMobile={isMobile}
              />
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-3 h-10 px-3 text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage 
                      src={profileAvatar} 
                      alt={profileName || user?.email}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium truncate max-w-28">
                    {profileName || user?.email}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/vendedor/configuracoes')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/vendedor/ajuda')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ajuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

    </>
  );
}
