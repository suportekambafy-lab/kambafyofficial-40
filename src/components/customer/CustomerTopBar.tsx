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
  ArrowLeftRight,
  Download,
  X,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { AppStoreButton } from '@/components/ui/app-store-button';
import { PlayStoreButton } from '@/components/ui/play-store-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerTopBarProps {
  showAppBanner?: boolean;
}

export function CustomerTopBar({ showAppBanner = true }: CustomerTopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileName, setProfileName] = useState("");
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
            className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground">
                    Baixe o App Kambafy
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Acesse seus cursos offline e receba notificações
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex gap-2">
                  <PlayStoreButton 
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
                  />
                  <AppStoreButton 
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
                  />
                </div>
                <div className="flex sm:hidden gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M18.546,12.763c0.024-1.87,1.004-3.597,2.597-4.576c-1.009-1.442-2.64-2.323-4.399-2.378c-1.851-0.194-3.645,1.107-4.588,1.107c-0.961,0-2.413-1.088-3.977-1.056C6.122,5.927,4.25,7.068,3.249,8.867c-2.131,3.69-0.542,9.114,1.5,12.097c1.022,1.461,2.215,3.092,3.778,3.035c1.529-0.063,2.1-0.975,3.945-0.975c1.828,0,2.364,0.975,3.958,0.938c1.64-0.027,2.674-1.467,3.66-2.942c0.734-1.041,1.299-2.191,1.673-3.408C19.815,16.788,18.548,14.879,18.546,12.763z"/>
                      <path d="M15.535,3.847C16.429,2.773,16.87,1.393,16.763,0c-1.366,0.144-2.629,0.797-3.535,1.829c-0.895,1.019-1.349,2.351-1.261,3.705C13.352,5.548,14.667,4.926,15.535,3.847z"/>
                    </svg>
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
        <div className="flex h-[70px] items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/kambafy-logo-new.svg" 
              alt="Kambafy" 
              className="h-14 sm:h-16 w-auto dark:brightness-0 dark:invert"
            />
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
              onClick={() => navigate('/meus-acessos/compras')}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 px-2"
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
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profileName || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Mobile-only buttons */}
                <DropdownMenuItem
                  className="sm:hidden cursor-pointer"
                  onClick={() => navigate('/meus-acessos/compras')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Minhas Compras
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  className="sm:hidden cursor-pointer"
                  onClick={() => navigate('/vendedor')}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Painel Vendedor
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="sm:hidden" />
                
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate('/configuracoes')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleDownloadApp}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Aplicativo
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate('/ajuda')}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Ajuda
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
