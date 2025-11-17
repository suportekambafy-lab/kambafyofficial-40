import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
    oneSignalInitialized?: boolean;
  }
}

export const useOneSignal = () => {
  const { user } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (window.oneSignalInitialized) {
      console.log('ℹ️ OneSignal já foi inicializado');
      setIsInitialized(true);
      return;
    }

    const savePlayerIdToProfile = async (playerId: string) => {
      if (!user?.id) {
        console.log('⚠️ Usuário não autenticado, pulando salvamento do Player ID');
        return;
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Erro ao salvar Player ID:', error);
        } else {
          console.log('✅ Player ID salvo no perfil:', playerId);
        }
      } catch (error) {
        console.error('❌ Erro ao salvar Player ID:', error);
      }
    };

    const initOneSignal = async () => {
      if (window.oneSignalInitialized) return;

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          // Marcar como inicializado ANTES de chamar init
          window.oneSignalInitialized = true;
          
          await OneSignal.init({
            appId: "e1a77f24-25aa-4f9d-a0fd-316ecc8885cd"
          });

          console.log('✅ OneSignal Web SDK inicializado');
          setIsInitialized(true);

          // Aguardar um pouco para o OneSignal processar
          setTimeout(async () => {
            try {
              const subscriptionId = OneSignal.User.PushSubscription.id;
              
              if (subscriptionId) {
                console.log('🆔 Subscription ID obtido:', subscriptionId);
                setPlayerId(subscriptionId);
                if (user) {
                  await savePlayerIdToProfile(subscriptionId);
                }
              } else {
                console.log('⚠️ Subscription ID não disponível ainda');
              }
            } catch (err) {
              console.error('❌ Erro ao obter Subscription ID:', err);
            }
          }, 1000);
        } catch (error) {
          console.error('❌ Erro ao inicializar OneSignal:', error);
          window.oneSignalInitialized = false;
        }
      });
    };

    // Carregar script do OneSignal apenas uma vez globalmente
    const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.onload = () => initOneSignal();
      document.head.appendChild(script);
    } else {
      // Script já existe, apenas inicializar se ainda não foi
      if (!window.oneSignalInitialized) {
        initOneSignal();
      } else {
        setIsInitialized(true);
      }
    }
  }, [user]);

  return {
    playerId,
    isInitialized,
  };
};
