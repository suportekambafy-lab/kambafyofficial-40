
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  HelpCircle,
  LogOut,
  X,
  User,
  ChevronRight,
  ArrowLeftRight,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileAvatar: string;
  profileName: string;
  isMobile?: boolean;
}

export function AvatarDrawer({ 
  isOpen, 
  onClose, 
  profileAvatar, 
  profileName, 
  isMobile = false 
}: AvatarDrawerProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('AvatarDrawer render - isOpen:', isOpen, 'isMobile:', isMobile);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      onClose();
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

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  // Determinar se estamos no painel do vendedor ou cliente baseado na URL atual
  const isSellerPanel = window.location.pathname.startsWith('/vendedor');
  
  const menuItems = isSellerPanel ? [
    {
      label: "Configurações",
      href: "/vendedor/configuracoes",
      icon: Settings,
      onClick: () => handleNavigation("/vendedor/configuracoes")
    },
    {
      label: "Ver meus acessos",
      href: "/meus-acessos",
      icon: ArrowLeftRight,
      onClick: () => handleNavigation("/meus-acessos")
    },
    {
      label: "Ajuda",
      href: "/vendedor/ajuda", 
      icon: HelpCircle,
      onClick: () => handleNavigation("/vendedor/ajuda")
    },
    {
      label: "Sair",
      href: "#",
      icon: LogOut,
      onClick: handleSignOut,
      isLogout: true
    }
  ] : [
    {
      label: "Configurações",
      href: "/configuracoes",
      icon: Settings,
      onClick: () => handleNavigation("/configuracoes")
    },
    {
      label: "Mudar para painel de vendedor",
      href: "/vendedor",
      icon: ArrowLeftRight,
      onClick: () => handleNavigation("/vendedor")
    },
    {
      label: "Sair",
      href: "#",
      icon: LogOut,
      onClick: handleSignOut,
      isLogout: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-screen w-80 bg-card border-l border-border flex flex-col z-50 shadow-xl"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Perfil
              </h2>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {profileName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {profileName || 'Usuário'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    item.isLogout 
                      ? 'text-destructive hover:bg-destructive/10' 
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
