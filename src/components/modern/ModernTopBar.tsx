import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp,
  Settings, 
  LogOut,
  Menu,
  HelpCircle,
  Search,
  Package,
  TrendingUp,
  DollarSign,
  Zap,
  Home,
  Command
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarDrawer } from '@/components/ui/avatar-drawer';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSellerTheme } from '@/hooks/useSellerTheme';
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileName, setProfileName] = useState("");
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

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

  const searchActions = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4 text-primary" />, short: '⌘D' },
    { id: 'produtos', label: 'Produtos', icon: <Package className="h-4 w-4 text-primary" />, short: '⌘P' },
    { id: 'vendas', label: 'Vendas', icon: <TrendingUp className="h-4 w-4 text-primary" />, short: '⌘V' },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-4 w-4 text-primary" />, short: '⌘F' },
    { id: 'apps', label: 'Apps', icon: <Zap className="h-4 w-4 text-primary" />, short: '⌘A' },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4 text-muted-foreground" />, short: '⌘S' },
    { id: 'ajuda', label: 'Ajuda', icon: <HelpCircle className="h-4 w-4 text-muted-foreground" />, short: '⌘H' }
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
      setSearchQuery("");
    }
  };

  return (
    <div className="h-[70px] bg-card border-b border-border flex items-center px-4 md:px-6 sticky top-0 z-20">
      {/* Left side - Mobile menu */}
      <div className="flex items-center">
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

      {/* Center - Search Bar */}
      {!isMobile && (
        <div className="flex-1 flex justify-center">
          <div className="relative w-[400px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-11 pr-16 rounded-full border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
            
            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 w-full mt-2 border border-border rounded-xl bg-card shadow-lg overflow-hidden z-50"
                >
                  <div className="py-2">
                    {searchActions
                      .filter(action => !searchQuery || action.label.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleActionSelect(action.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {action.icon}
                            <span className="text-sm font-medium text-foreground">{action.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{action.short}</span>
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <SellerNotificationCenter />

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-2" />

        {/* User menu */}
        {isMobile ? (
          <>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 h-10 px-2 hover:bg-accent rounded-xl"
              onClick={() => setAvatarDrawerOpen(true)}
            >
              <Avatar className="h-8 w-8 ring-2 ring-border">
                <AvatarImage src={profileAvatar} alt={profileName || user?.email} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
          <div className="relative">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 h-10 px-2 hover:bg-accent rounded-xl transition-colors"
            >
              <Avatar className="h-8 w-8 ring-2 ring-border">
                <AvatarImage src={profileAvatar} alt={profileName || user?.email} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {profileName || user?.email?.split('@')[0]}
              </span>
              {userMenuOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg z-[100]"
                >
                  <button
                    onClick={() => {
                      navigate('/vendedor/configuracoes');
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Configurações</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/vendedor/ajuda');
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Ajuda</span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => {
                      handleSignOut();
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
