import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import OneSignal from 'react-onesignal';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
  }
}

const ONESIGNAL_APP_ID = 'e1a77f24-25aa-4f9d-a0fd-316ecc8885cd';

export interface UseOneSignalOptions {
  onNotificationReceived?: (notification: any) => void;
  onNotificationOpened?: (notification: any) => void;
}

export function useOneSignal(options?: UseOneSignalOptions) {
  console.log('🎯 [useOneSignal] Hook called, options:', options);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  console.log('🎯 [useOneSignal] Hook state:', { isInitialized, playerId, permissionGranted });

  useEffect(() => {
    console.log('🎯 [useOneSignal] useEffect running!');
    
    const isNative = Capacitor.isNativePlatform();
    const isWebView = !isNative && typeof window !== 'undefined';
    const platform = Capacitor.getPlatform();
    
    console.log('🔍 OneSignal Environment Check:', { 
      isNative, 
      isWebView, 
      platform,
      hasWindow: typeof window !== 'undefined',
      userAgent: navigator.userAgent 
    });
    
    if (isWebView) {
      console.log('✅ Detected WebView/Web environment - initializing Web SDK');
      // Inicializar OneSignal Web SDK para WebView/Web
      initializeWebSDK();
      return;
    }
    
    if (isNative) {
      console.log('✅ Detected Native environment - initializing Cordova Plugin');
      // Inicializar OneSignal Cordova Plugin para apps nativos
      initializeNativeSDK();
      return;
    }
    
    console.log('⚠️ OneSignal: Environment not supported', { isNative, isWebView });
  }, []);

  // Inicializar OneSignal Web SDK (para WebView e Web)
  const initializeWebSDK = async () => {
    try {
      console.log('🌐 [OneSignal Web SDK] Waiting for OneSignal to be ready...');
      
      // Aguardar que o OneSignal esteja disponível (já inicializado pelo script no index.html)
      const waitForOneSignal = () => {
        return new Promise<void>((resolve) => {
          if (typeof OneSignal !== 'undefined') {
            resolve();
          } else {
            const checkInterval = setInterval(() => {
              if (typeof OneSignal !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          }
        });
      };

      await waitForOneSignal();
      console.log('✅ [OneSignal Web SDK] OneSignal object is ready!');
      setIsInitialized(true);

      // Verificar permissão
      console.log('🔔 [OneSignal Web SDK] Checking permission...');
      const permission = await OneSignal.Notifications.permission;
      console.log('🔔 [OneSignal Web SDK] Permission status:', permission);
      
      if (permission) {
        setPermissionGranted(true);
      }

      // Obter subscription ID
      const subscriptionId = await OneSignal.User.PushSubscription.id;
      console.log('📱 [OneSignal Web SDK] Subscription ID:', subscriptionId);
      
      if (subscriptionId) {
        setPlayerId(subscriptionId);
        await savePlayerIdToProfile(subscriptionId);
        console.log('✅ [OneSignal Web SDK] Player ID saved to profile!');
      }

      // Configurar listeners de notificação
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('🔔 Notification clicked:', event);
        options?.onNotificationOpened?.(event);
      });

      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        console.log('📩 Notification received:', event);
        options?.onNotificationReceived?.(event);
      });

      console.log('✅ [OneSignal Web SDK] Setup complete!');

    } catch (error) {
      console.error('❌ [OneSignal Web SDK] Error during setup:', error);
      console.error('❌ [OneSignal Web SDK] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error
      });
    }
  };

  // Inicializar OneSignal Cordova Plugin (para apps nativos)
  const initializeNativeSDK = async () => {
    try {
      if (!window.plugins?.OneSignal) {
        console.error('❌ OneSignal Cordova plugin not found');
        return;
      }

      const OneSignalPlugin = window.plugins.OneSignal;

      console.log('🔔 Initializing OneSignal Cordova Plugin...');

      OneSignalPlugin.setAppId(ONESIGNAL_APP_ID);

      OneSignalPlugin.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
        console.log('📱 OneSignal permission:', accepted ? 'granted' : 'denied');
        setPermissionGranted(accepted);
      });

      OneSignalPlugin.getDeviceState((state: any) => {
        if (state.userId) {
          console.log('✅ OneSignal Player ID obtained:', state.userId);
          setPlayerId(state.userId);
        }
      });

      OneSignalPlugin.setNotificationWillShowInForegroundHandler((notificationReceivedEvent: any) => {
        console.log('📩 Notification received:', notificationReceivedEvent);
        const notification = notificationReceivedEvent.getNotification();
        options?.onNotificationReceived?.(notification);
        notificationReceivedEvent.complete(notification);
      });

      OneSignalPlugin.setNotificationOpenedHandler((openedEvent: any) => {
        console.log('🔔 Notification opened:', openedEvent);
        const notification = openedEvent.notification;
        options?.onNotificationOpened?.(notification);
      });

      setIsInitialized(true);
      console.log('✅ OneSignal Cordova Plugin initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing OneSignal Cordova Plugin:', error);
    }
  };

  // Salvar Player ID no perfil do usuário
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
      }

      console.log('✅ Player ID saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in savePlayerIdToProfile:', error);
      return false;
    }
  };

  // Atualizar Player ID manualmente
  const updatePlayerId = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative && window.plugins?.OneSignal) {
      window.plugins.OneSignal.getDeviceState((state: any) => {
        if (state.userId) {
          setPlayerId(state.userId);
          savePlayerIdToProfile(state.userId);
        }
      });
    } else {
      // Para Web SDK
      try {
        const subscriptionId = await OneSignal.User.PushSubscription.id;
        if (subscriptionId) {
          setPlayerId(subscriptionId);
          await savePlayerIdToProfile(subscriptionId);
        }
      } catch (error) {
        console.error('❌ Error updating player ID:', error);
      }
    }
  };

  // Definir External User ID (para vincular user_id com OneSignal)
  const setExternalUserId = async (userId: string) => {
    try {
      const isNative = Capacitor.isNativePlatform();

      console.log('🔑 Setting External User ID:', userId);
      
      if (isNative && window.plugins?.OneSignal) {
        // Usar Cordova Plugin
        window.plugins.OneSignal.setExternalUserId(userId, (results: any) => {
          console.log('✅ External User ID set (native):', results);
        });
      } else {
        // Usar Web SDK
        await OneSignal.login(userId);
        console.log('✅ External User ID set (web):', userId);
      }

      return true;
    } catch (error) {
      console.error('❌ Error setting External User ID:', error);
      return false;
    }
  };

  // Solicitar permissão de notificações (para Web SDK)
  const requestPermission = async () => {
    try {
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        // Web SDK
        await OneSignal.Notifications.requestPermission();
        const permission = await OneSignal.Notifications.permission;
        
        if (permission) {
          setPermissionGranted(true);
          
          const subscriptionId = await OneSignal.User.PushSubscription.id;
          if (subscriptionId) {
            setPlayerId(subscriptionId);
            await savePlayerIdToProfile(subscriptionId);
          }
        }
        
        return permission;
      }

      return false;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
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
    requestPermission,
  };
}
