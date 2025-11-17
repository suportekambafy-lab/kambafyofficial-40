import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOneSignal = () => {
  const { user } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initOneSignal = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('OneSignal: Not running on native platform');
        return;
      }

      const OneSignal = window.plugins?.OneSignal;
      if (!OneSignal) {
        console.error('OneSignal plugin not found');
        return;
      }

      try {
        // Inicializar OneSignal com o App ID
        const appId = 'e1a77f24-25aa-4f9d-a0fd-316ecc8885cd';
        OneSignal.setAppId(appId);
        console.log('✅ OneSignal inicializado com App ID:', appId);

        // Handler quando notificação é clicada
        OneSignal.setNotificationOpenedHandler((jsonData) => {
          console.log('📱 Notificação clicada:', jsonData);
          
          // Navegar para tela de vendas se houver dados
          if (jsonData?.notification?.additionalData?.orderId) {
            window.location.href = '/vendas';
          }
        });

        // Solicitar permissão de notificações
        OneSignal.promptForPushNotificationsWithUserResponse((accepted) => {
          console.log('🔔 Permissão de notificações:', accepted ? 'Aceita' : 'Recusada');
        });

        // Obter Player ID
        OneSignal.getDeviceState((state) => {
          const userId = state?.userId;
          console.log('🆔 Player ID obtido:', userId);
          
          if (userId) {
            setPlayerId(userId);
            savePlayerIdToProfile(userId);
          }
        });

        setIsInitialized(true);
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

    initOneSignal();
  }, [user]);

  return {
    playerId,
    isInitialized,
  };
};
