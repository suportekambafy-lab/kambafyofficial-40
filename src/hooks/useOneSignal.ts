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
    const initOneSignal = async () => {
      try {
        // Inicializar OneSignal Web SDK
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        window.OneSignalDeferred.push(function(OneSignal: any) {
          OneSignal.init({
            appId: "e1a77f24-25aa-4f9d-a0fd-316ecc8885cd"
          });

          console.log('✅ OneSignal Web SDK inicializado');

          // Obter Player ID
          OneSignal.getUserId(function(userId: string | null) {
            if (userId) {
              console.log('🆔 Player ID obtido:', userId);
              setPlayerId(userId);
              savePlayerIdToProfile(userId);
            }
          });

          setIsInitialized(true);
        });
      } catch (error) {
        console.error('❌ Erro ao inicializar OneSignal:', error);
      }
    };

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

    // Carregar script do OneSignal
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      initOneSignal();
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [user]);

  return {
    playerId,
    isInitialized,
  };
};
