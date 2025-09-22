import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Store, 
  UserCheck, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  FileText, 
  UserPlus, 
  Grid3X3,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  ChevronDown
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Itens principais para mobile (bottom navigation)
const mobileItems = [
  {
    title: "Dashboard",
    url: "/vendedor",
    icon: LayoutDashboard,
  },
  {
    title: "Produtos",
    url: "/vendedor/produtos",
    icon: Package,
  },
  {
    title: "Vendas",
    url: "/vendedor/vendas",
    icon: TrendingUp,
  },
  {
    title: "Financeiro",
    url: "/vendedor/financeiro",
    icon: DollarSign,
  },
];

// Todos os itens para desktop
const menuItems = [
  {
    label: "Dashboard",
    href: "/vendedor",
    icon: LayoutDashboard,
  },
  {
    label: "Produtos",
    href: "/vendedor/produtos",
    icon: Package,
  },
  {
    label: "Área de Membros",
    href: "/vendedor/membros",
    icon: Users,
  },
  {
    label: "Kamba Extra",
    href: "/vendedor/marketplace",
    icon: Store,
  },
  {
    label: "Meus Afiliados",
    href: "/vendedor/afiliados",
    icon: UserCheck,
  },
  {
    label: "Vendas",
    href: "/vendedor/vendas",
    icon: TrendingUp,
    showCount: true, // Identificar que este item deve mostrar contador
  },
  {
    label: "Assinaturas",
    href: "/vendedor/assinaturas",
    icon: CreditCard,
  },
  {
    label: "Financeiro",
    href: "/vendedor/financeiro",
    icon: DollarSign,
  },
  {
    label: "Relatórios",
    href: "/vendedor/relatorios",
    icon: FileText,
  },
  {
    label: "Colaboradores",
    href: "/vendedor/colaboradores",
    icon: UserPlus,
  },
  {
    label: "Apps",
    href: "/vendedor/apps",
    icon: Grid3X3,
  },
  {
    label: "Configurações",
    href: "/vendedor/configuracoes",
    icon: Settings,
  },
  {
    label: "Ajuda",
    href: "/vendedor/ajuda",
    icon: HelpCircle,
  },
];

function MobileBottomNav() {
  const navigate = useNavigate();

  const tabs = [
    ...mobileItems.map(item => ({
      title: item.title,
      icon: item.icon,
    })),
    { type: "separator" as const },
    { title: "Configurações", icon: Settings },
  ];

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    
    if (index < mobileItems.length) {
      navigate(mobileItems[index].url);
    } else if (index === mobileItems.length + 1) { // +1 porque tem o separator
      navigate("/vendedor/configuracoes");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden flex justify-center">
      <ExpandableTabs 
        tabs={tabs} 
        onChange={handleTabChange}
        activeColor="text-checkout-green"
        className="border-checkout-green/20 bg-background/95 backdrop-blur-sm shadow-lg"
      />
    </div>
  );
}

const KambafyLogo = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20">
      <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-checkout-green font-bold text-lg">K</span>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-xl text-white whitespace-pre"
      >
        Kambafy
      </motion.span>
    </div>
  );
};

export function SellerSidebar() {
  const isMobile = useIsMobile();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    if (user) {
      loadTotalSales();
      // Update every 30 seconds
      const interval = setInterval(loadTotalSales, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadTotalSales = async () => {
    if (!user) return;

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (error) {
        console.error('Error loading total sales:', error);
        return;
      }

      setTotalSales(orders?.length || 0);
    } catch (error) {
      console.error('Error loading total sales:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Logout button clicked');
      
      toast({
        title: "Saindo...",
        description: "Encerrando sua sessão..."
      });
      
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Force redirect even if error occurs
      window.location.replace('/auth');
    }
  };

  // Se for mobile, renderizar apenas bottom navigation
  if (isMobile) {
    return <MobileBottomNav />;
  }

  // Desktop sidebar
  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-screen fixed left-0 top-16 z-10">
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? "bg-checkout-green text-white" 
                    : "text-gray-300 hover:bg-slate-700 hover:text-white"
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.showCount && totalSales > 0 && (
                <span className="bg-checkout-green text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {totalSales}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="border-t border-slate-700 p-3 mt-auto">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-300 hover:bg-red-600 hover:text-white w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    todaySales: 0
  });
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileName, setProfileName] = useState("");
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadProfileData();
      checkNotifications();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Carregar vendas de hoje
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (todayError) {
        console.error('Error loading today orders:', todayError);
        return;
      }

      // Carregar receita total
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('amount, currency')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        return;
      }

      const totalRevenue = allOrders?.reduce((sum, order) => {
        let amount = parseFloat(order.amount) || 0;
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

      const todaySales = todayOrders?.length || 0;

      setDashboardData({ totalRevenue, todaySales });
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
      const notifications: string[] = [];

      // Verificar se tem vendas hoje
      if (dashboardData.todaySales > 0) {
        notifications.push(`${dashboardData.todaySales} vendas hoje`);
      }

      // Verificar se precisa configurar IBAN
      const { data: profile } = await supabase
        .from('profiles')
        .select('iban')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.iban) {
        notifications.push('Configure seu IBAN para começar a receber');
      }

      // Verificar se precisa configurar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileData?.full_name || !profileData?.avatar_url) {
        notifications.push('Configure seu perfil');
      }

      setNotifications(notifications);
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('TopBar logout clicked');
      
      toast({
        title: "Saindo...",
        description: "Encerrando sua sessão..."
      });
      
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Force redirect even if error occurs
      window.location.replace('/auth');
    }
  };

  // Calcular progresso da meta (1M KZ = 1,000,000)
  const metaTotal = 1000000;
  const progressPercent = Math.min((dashboardData.totalRevenue / metaTotal) * 100, 100);

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-checkout-green z-20 flex items-center justify-between px-6">
      {/* Desktop: Logo à esquerda */}
      {!isMobile && (
        <div className="flex items-center">
          <KambafyLogo />
        </div>
      )}

      {/* Mobile: Meta à esquerda */}
      {isMobile && (
        <div className="flex items-center gap-2 text-white text-sm">
          <span>Meta: 1M KZ</span>
          <div className="w-24 h-2 bg-white/20 rounded-full">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="text-yellow-400 font-medium">{progressPercent.toFixed(0)}%</span>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* Desktop: Barra de progresso da meta */}
        {!isMobile && (
          <div className="flex items-center gap-2 text-white text-sm">
            <span>Meta: 1M KZ</span>
            <div className="w-32 h-2 bg-white/20 rounded-full">
              <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="text-yellow-400 font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
        )}

        {/* Sino de notificações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative text-white hover:bg-white/10 p-2">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-3 border-b">
              <h3 className="font-semibold">Notificações</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification, index) => (
                <DropdownMenuItem key={index} className="p-3 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <Bell className="h-4 w-4 mt-0.5 text-checkout-green" />
                    <span className="text-sm">{notification}</span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar with dropdown (desktop) or drawer (mobile) */}
        {isMobile ? (
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback className="bg-white text-checkout-green">
                    {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profileAvatar} />
                    <AvatarFallback className="bg-checkout-green text-white">
                      {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{profileName || "Usuário"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => navigate('/vendedor/configuracoes')}
                >
                  <Settings className="h-5 w-5" />
                  Configurações
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback className="bg-white text-checkout-green">
                    {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{profileName || user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/vendedor/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
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
  );
}
