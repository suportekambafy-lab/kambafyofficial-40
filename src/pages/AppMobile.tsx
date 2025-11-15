import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogin } from '@/components/app/AppLogin';
import { AppHome } from '@/components/app/AppHome';
import { AppOnboarding } from '@/components/app/AppOnboarding';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SellerThemeProvider, useSellerTheme } from '@/hooks/useSellerTheme';
import { initializeNativeFeatures } from '@/utils/nativeService';
import { SEO } from '@/components/SEO';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useRealtimeSellerNotifications } from '@/hooks/useRealtimeSellerNotifications';
import { OneSignalDebug } from '@/components/OneSignalDebug';

const ONBOARDING_KEY = 'kambafy_onboarding_completed';

export default function AppMobile() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Inicializar OneSignal para o app mobile nativo
  const { isInitialized, playerId, setExternalUserId } = useOneSignal({
    onNotificationReceived: (notification) => {
      console.log('📩 [App Mobile] Notification received:', notification);
    },
    onNotificationOpened: (notification) => {
      console.log('🔔 [App Mobile] Notification opened:', notification);
    }
  });

  // Hook para notificações em tempo real do vendedor
  useRealtimeSellerNotifications(user?.id);

  // Vincular user_id com OneSignal External ID quando usuário está autenticado
  useEffect(() => {
    if (user?.id && isInitialized) {
      console.log('🔗 [App Mobile] Vinculando user_id com OneSignal External ID:', user.id);
      console.log('🔗 [App Mobile] Player ID atual:', playerId);
      
      setExternalUserId(user.id).then(success => {
        if (success) {
          console.log('✅ [App Mobile] External User ID configurado - Journeys podem funcionar');
        } else {
          console.log('⚠️ [App Mobile] External User ID não configurado (tentaremos novamente quando player_id estiver disponível)');
        }
      });
    }
  }, [user?.id, isInitialized, playerId, setExternalUserId]); // Adicionado playerId como dependência

  useEffect(() => {
    // Verificar se há um query parameter para forçar onboarding (útil para desenvolvimento)
    const urlParams = new URLSearchParams(window.location.search);
    const forceOnboarding = urlParams.get('onboarding') === 'true';
    
    if (forceOnboarding) {
      setShowOnboarding(true);
    } else {
      const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(!hasCompletedOnboarding);
    }
    setCheckingOnboarding(false);

    // Inicializar recursos nativos
    const theme = localStorage.getItem('seller-theme') || 'light';
    initializeNativeFeatures(theme === 'dark');
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md p-3">
            <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
          </div>
          <LoadingSpinner text="Carregando..." size="lg" />
        </div>
      </div>
    );
  }

  if (showOnboarding && !user) {
    return <AppOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <SEO noIndex={true} />
      <SellerThemeProvider>
        {!user ? <AppLogin /> : <AppHome />}
      </SellerThemeProvider>
      <OneSignalDebug />
    </>
  );
}
