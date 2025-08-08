import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar se já está em modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Event listener para o prompt de instalação
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt apenas se não estiver em standalone e não foi rejeitado recentemente
      const lastRejected = localStorage.getItem('pwa-install-rejected');
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      
      if (!lastRejected || parseInt(lastRejected) < threeDaysAgo) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    // Para iOS, mostrar prompt manual se não estiver em standalone
    if (iOS && !standalone) {
      const lastRejected = localStorage.getItem('pwa-install-rejected-ios');
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      
      if (!lastRejected || parseInt(lastRejected) < threeDaysAgo) {
        setTimeout(() => setShowPrompt(true), 3000); // Delay de 3s para não incomodar
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

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
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
              ? 'Toque em "Compartilhar" e depois "Adicionar à Tela de Início" para uma experiência nativa.'
              : 'Instale o app para acesso rápido e notificações de vendas.'
            }
          </p>
          
          <div className="flex gap-2">
            {!isIOS && (
              <Button 
                onClick={handleInstall}
                size="sm" 
                className="text-xs h-8 px-3"
              >
                <Download className="w-3 h-3 mr-1" />
                Instalar
              </Button>
            )}
            
            <Button 
              onClick={handleDismiss}
              variant="outline" 
              size="sm" 
              className="text-xs h-8 px-3"
            >
              {isIOS ? 'OK' : 'Agora não'}
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
  );
}