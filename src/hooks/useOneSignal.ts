import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
  }
}

export interface UseOneSignalOptions {
  onNotificationReceived?: (notification: any) => void;
  onNotificationOpened?: (notification: any) => void;
}

export function useOneSignal(options?: UseOneSignalOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const initializeOneSignal = async () => {
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        console.log('⚠️ OneSignal: Not a native platform, skipping initialization');
        return;
      }

      try {
        // Verificar se OneSignal plugin está disponível
        if (!window.plugins?.OneSignal) {
          console.error('❌ OneSignal plugin not found');
          return;
        }

        const OneSignal = window.plugins.OneSignal;

        console.log('🔔 Initializing OneSignal...');

        // Configurar OneSignal App ID (obtido do .env ou direto)
        const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 
                                  '85da5c4b-c2a7-426f-851f-5c7c42afd64a';

        // Inicializar OneSignal
        OneSignal.setAppId(ONESIGNAL_APP_ID);

        // Solicitar permissão de notificações
        OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
          console.log('📱 OneSignal permission:', accepted ? 'granted' : 'denied');
          setPermissionGranted(accepted);
        });

        // Obter Player ID (Device Token)
        OneSignal.getDeviceState((state: any) => {
          if (state.userId) {
            console.log('✅ OneSignal Player ID obtained:', state.userId);
            setPlayerId(state.userId);
          }
        });

        // Handler quando notificação é recebida (app aberto)
        OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent: any) => {
          console.log('📩 Notification received:', notificationReceivedEvent);
          
          const notification = notificationReceivedEvent.getNotification();
          options?.onNotificationReceived?.(notification);
          
          // Mostrar a notificação
          notificationReceivedEvent.complete(notification);
        });

        // Handler quando notificação é aberta/clicada
        OneSignal.setNotificationOpenedHandler((openedEvent: any) => {
          console.log('🔔 Notification opened:', openedEvent);
          
          const notification = openedEvent.notification;
          options?.onNotificationOpened?.(notification);
        });

        setIsInitialized(true);
        console.log('✅ OneSignal initialized successfully');

      } catch (error) {
        console.error('❌ Error initializing OneSignal:', error);
      }
    };

    initializeOneSignal();
  }, []);

  // Função pública para salvar Player ID no perfil do usuário
  const savePlayerIdToProfile = async (playerIdValue: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('⚠️ No authenticated user, cannot save player ID');
        return false;
      }

      console.log('💾 Saving Player ID to profile:', playerIdValue);

      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_player_id: playerIdValue })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error saving player ID:', error);
        return false;
      } else {
        console.log('✅ Player ID saved successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Error in savePlayerIdToProfile:', error);
      return false;
    }
  };

  // Função para atualizar Player ID manualmente
  const updatePlayerId = async () => {
    if (!window.plugins?.OneSignal) return;

    window.plugins.OneSignal.getDeviceState((state: any) => {
      if (state.userId) {
        setPlayerId(state.userId);
        savePlayerIdToProfile(state.userId);
      }
    });
  };

  // Função para definir External User ID (necessário para Custom Events)
  const setExternalUserId = async (userId: string) => {
    try {
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        console.log('⚠️ OneSignal: Not a native platform, skipping External User ID');
        return false;
      }

      if (!window.plugins?.OneSignal) {
        console.error('❌ OneSignal plugin not found');
        return false;
      }

      const OneSignal = window.plugins.OneSignal;

      console.log('🔑 Setting External User ID:', userId);
      
      OneSignal.setExternalUserId(userId, (results: any) => {
        console.log('✅ External User ID set successfully:', results);
      });

      return true;
    } catch (error) {
      console.error('❌ Error setting External User ID:', error);
      return false;
    }
  };

  return {
    isInitialized,
    playerId,
    permissionGranted,
    updatePlayerId,
    savePlayerIdToProfile,
    setExternalUserId,
  };
}
