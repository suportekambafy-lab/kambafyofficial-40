import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export const useOneSignal = () => {
  const { user } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    let scriptAdded = false;

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
      if (!isSubscribed) return;

      try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            await OneSignal.init({
              appId: "e1a77f24-25aa-4f9d-a0fd-316ecc8885cd"
            });

            console.log('✅ OneSignal Web SDK inicializado');
            
            if (isSubscribed) {
              setIsInitialized(true);

              // Usar API v16 para obter o subscription ID
              const subscriptionId = OneSignal.User.PushSubscription.id;
              
              if (subscriptionId && isSubscribed) {
                console.log('🆔 Subscription ID obtido:', subscriptionId);
                setPlayerId(subscriptionId);
                if (user) {
                  savePlayerIdToProfile(subscriptionId);
                }
              }
            }
          } catch (error) {
            console.error('❌ Erro ao inicializar OneSignal:', error);
          }
        });
      } catch (error) {
        console.error('❌ Erro ao inicializar OneSignal:', error);
      }
    };

    // Carregar script do OneSignal apenas uma vez
    const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
    
    if (!existingScript && !scriptAdded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.onload = () => initOneSignal();
      document.head.appendChild(script);
      scriptAdded = true;
    } else if (existingScript) {
      initOneSignal();
    }

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  return {
    playerId,
    isInitialized,
  };
};
