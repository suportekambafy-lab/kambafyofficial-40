import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  LogOut,
  HelpCircle,
  CreditCard,
  ShoppingBag,
  ArrowLeftRight,
  Download,
  X,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarDrawer } from '@/components/ui/avatar-drawer';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';

interface CustomerTopBarProps {
  showAppBanner?: boolean;
}

export function CustomerTopBar({ showAppBanner = true }: CustomerTopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileName, setProfileName] = useState("");
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { balance, fetchBalanceByEmail } = useKambaPayBalance();

  useEffect(() => {
    if (user) {
      loadProfileData();
      if (user.email) {
        fetchBalanceByEmail(user.email);
      }
    }
  }, [user]);

  // Check if banner was dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('appBannerDismissed');
    if (dismissed) {
      setBannerDismissed(true);
    }
  }, []);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
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

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('appBannerDismissed', 'true');
  };

  const handleDownloadApp = () => {
    navigate('/install');
  };

  return (
    <>
      {/* App Download Banner */}
      <AnimatePresence>
        {showAppBanner && !bannerDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-primary via-primary/90 to-primary overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                  <span className="text-sm font-medium text-white">
                    Baixe o App Kambafy
                  </span>
                  <span className="text-xs text-white/80 hidden sm:inline">
                    Acesse seus cursos offline e receba notificações
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 bg-white text-primary hover:bg-white/90 font-medium text-xs sm:text-sm"
                  onClick={handleDownloadApp}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Baixar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={dismissBanner}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main TopBar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/kambafy-logo-new.svg" 
              alt="Kambafy" 
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
            <div className="hidden sm:block">
              <span className="text-xs text-muted-foreground font-medium">Área do Cliente</span>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Balance Display */}
            {balance && balance.balance > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/50 text-sm">
                <span className="text-muted-foreground">Saldo:</span>
                <span className="font-semibold text-foreground">{balance.balance.toLocaleString('pt-AO')} KZ</span>
              </div>
            )}

            {/* My Purchases Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/minhas-compras')}
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Minhas Compras</span>
            </Button>

            {/* Seller Panel Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/vendedor')}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden md:inline">Painel Vendedor</span>
            </Button>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                  {profileName || user?.email?.split('@')[0]}
                </span>
              </Button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    {/* Menu */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg z-50"
                    >
                      {/* User Info */}
                      <div className="px-3 py-2 mb-1">
                        <p className="text-sm font-medium">{profileName || 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      
                      <div className="h-px bg-border my-1" />

                      {/* Mobile-only buttons */}
                      <button
                        onClick={() => {
                          navigate('/minhas-compras');
                          setUserMenuOpen(false);
                        }}
                        className="sm:hidden flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>Minhas Compras</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/vendedor');
                          setUserMenuOpen(false);
                        }}
                        className="sm:hidden flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                        <span>Painel Vendedor</span>
                      </button>

                      <div className="sm:hidden h-px bg-border my-1" />

                      <button
                        onClick={() => {
                          navigate('/configuracoes');
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Configurações</span>
                      </button>

                      <button
                        onClick={() => {
                          handleDownloadApp();
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span>Baixar Aplicativo</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/ajuda');
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Ajuda</span>
                      </button>

                      <div className="h-px bg-border my-1" />

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
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Avatar Drawer for mobile */}
      <AvatarDrawer
        isOpen={avatarDrawerOpen}
        onClose={() => setAvatarDrawerOpen(false)}
        profileAvatar={profileAvatar}
        profileName={profileName}
        isMobile={true}
      />
    </>
  );
}
