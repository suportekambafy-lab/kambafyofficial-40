import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Bell, Smartphone } from 'lucide-react';

interface NotificationBannerProps {
  onDismiss: () => void;
  onEnable: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ onDismiss, onEnable }) => (
  <div className="notification-permission-banner">
    <div className="flex items-start gap-3 p-4">
      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Bell className="w-5 h-5 text-orange-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-foreground mb-1">
          Ativar Notificações de Vendas
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Receba alertas instantâneos quando alguém comprar seus produtos.
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={onEnable}
            size="sm" 
            variant="outline"
            className="text-xs h-8 px-3"
          >
            <Bell className="w-3 h-3 mr-1" />
            Ativar
          </Button>
          
          <Button 
            onClick={onDismiss}
            variant="ghost" 
            size="sm" 
            className="text-xs h-8 px-3"
          >
            Agora não
          </Button>
        </div>
      </div>
      
      <Button
        onClick={onDismiss}
        variant="ghost"
        size="sm"
        className="w-6 h-6 p-0 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar se já está em modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Verificar permissões de notificação
    if ('Notification' in window) {
      const permission = Notification.permission;
      
      // Mostrar banner de notificação apenas se for 'default' e não foi rejeitado recentemente
      if (permission === 'default') {
        const lastRejected = localStorage.getItem('notification-rejected');
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        
        if (!lastRejected || parseInt(lastRejected) < threeDaysAgo) {
          setTimeout(() => setShowNotificationBanner(true), 5000); // Delay de 5s
        }
      }
    }

    // Event listener para o prompt de instalação
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt apenas se não estiver em standalone e não foi rejeitado recentemente
      const lastRejected = localStorage.getItem('pwa-install-rejected');
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      
      if (!lastRejected || parseInt(lastRejected) < threeDaysAgo) {
        setTimeout(() => setShowPrompt(true), 2000); // Delay de 2s
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    // Para iOS, mostrar prompt manual se não estiver em standalone
    if (iOS && !standalone) {
      const lastRejected = localStorage.getItem('pwa-install-rejected-ios');
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      
      if (!lastRejected || parseInt(lastRejected) < threeDaysAgo) {
        setTimeout(() => setShowPrompt(true), 8000); // Delay de 8s para iOS
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt && !isIOS) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA instalado com sucesso');
      } else {
        localStorage.setItem('pwa-install-rejected', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(
      isIOS ? 'pwa-install-rejected-ios' : 'pwa-install-rejected', 
      Date.now().toString()
    );
  };

  const handleNotificationEnable = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✅ Notificações ativadas com sucesso!');
          setShowNotificationBanner(false);
        } else {
          localStorage.setItem('notification-rejected', Date.now().toString());
          setShowNotificationBanner(false);
        }
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
        setShowNotificationBanner(false);
      }
    }
  };

  const handleNotificationDismiss = () => {
    setShowNotificationBanner(false);
    localStorage.setItem('notification-rejected', Date.now().toString());
  };

  return (
    <>
      {/* Notification Permission Banner */}
      {showNotificationBanner && (
        <NotificationBanner 
          onEnable={handleNotificationEnable}
          onDismiss={handleNotificationDismiss}
        />
      )}

      {/* PWA Install Prompt */}
      {showPrompt && !isStandalone && (
        <div className="pwa-install-prompt">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Instalar Kambafy
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {isIOS 
                  ? 'Toque no ícone de "Compartilhar" (↗️) e depois "Adicionar à Tela de Início" para uma experiência nativa.'
                  : 'Instale o app para acesso rápido e notificações de vendas em tempo real.'
                }
              </p>
              
              <div className="flex gap-2">
                {!isIOS && (
                  <Button 
                    onClick={handleInstall}
                    size="sm" 
                    className="text-xs h-8 px-3"
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    Instalar
                  </Button>
                )}
                
                <Button 
                  onClick={handleDismiss}
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8 px-3"
                >
                  {isIOS ? 'Entendi' : 'Agora não'}
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}