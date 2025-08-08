import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface PWALoginGuardProps {
  children: React.ReactNode;
}

const PWALoginGuard: React.FC<PWALoginGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Função para detectar se está rodando como PWA
  const isPWA = () => {
    // Detectar modo standalone (PWA instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Detectar iOS PWA
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    // Verificar se veio do manifest (source=pwa)
    const urlParams = new URLSearchParams(window.location.search);
    const fromPWA = urlParams.get('source') === 'pwa';
    
    return isStandalone || isIOSStandalone || fromPWA;
  };

  useEffect(() => {
    // Se ainda está carregando, não fazer nada
    if (loading) return;

    // APENAS redirecionar se estiver rodando como PWA
    if (!isPWA()) {
      console.log('🌐 Rodando no navegador normal - não redirecionando para login');
      return;
    }

    // Páginas que não precisam de autenticação
    const publicPages = [
      '/auth',
      '/checkout',
      '/obrigado',
      '/como-funciona',
      '/precos',
      '/recursos',
      '/ajuda',
      '/contato',
      '/status',
      '/privacidade',
      '/termos',
      '/cookies'
    ];

    // Verificar se a página atual é pública
    const isPublicPage = publicPages.some(page => 
      location.pathname === page || 
      location.pathname.startsWith(`${page}/`) ||
      location.pathname.startsWith('/checkout/') ||
      location.pathname.startsWith('/curso/')
    );

    // Se não está autenticado e não é uma página pública, redirecionar para login
    if (!user && !isPublicPage) {
      console.log('🔒 PWA Guard: Redirecionando para login - usuário não autenticado');
      navigate('/auth', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Se ainda está carregando, mostrar tela de loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PWALoginGuard;