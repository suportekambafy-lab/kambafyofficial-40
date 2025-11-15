import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
    OneSignal?: any;
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
    const hasCordovaPlugin = typeof window !== 'undefined' && window.plugins?.OneSignal;
    const platform = Capacitor.getPlatform();
    
    console.log('🔍 OneSignal Environment Check:', { 
      isNative, 
      hasCordovaPlugin,
      platform,
      hasWindow: typeof window !== 'undefined',
      userAgent: navigator.userAgent 
    });
    
    // Se tem o Cordova Plugin disponível, usar Native SDK
    if (hasCordovaPlugin) {
      console.log('✅ Detected Cordova Plugin - initializing Native SDK');
      initializeNativeSDK();
      return;
    }
    
    // Se é nativo mas ainda não tem o plugin, aguardar
    if (isNative && !hasCordovaPlugin) {
      console.log('⏳ Native platform detected, waiting for Cordova Plugin...');
      const checkPlugin = setInterval(() => {
        if (window.plugins?.OneSignal) {
          clearInterval(checkPlugin);
          console.log('✅ Cordova Plugin now available - initializing Native SDK');
          initializeNativeSDK();
        }
      }, 500);
      
      // Timeout após 10 segundos
      setTimeout(() => {
        clearInterval(checkPlugin);
        if (!window.plugins?.OneSignal) {
          console.log('⚠️ Cordova Plugin not available after timeout, falling back to Web SDK');
          initializeWebSDK();
        }
      }, 10000);
      return;
    }
    
    // Caso contrário, usar Web SDK
    console.log('✅ Using Web SDK for browser environment');
    initializeWebSDK();
  }, []);

  // Inicializar OneSignal Web SDK (para WebView e Web)
  const initializeWebSDK = async () => {
    try {
      console.log('🌐 [OneSignal Web SDK] Waiting for OneSignal to be ready...');
      
      // Aguardar que o OneSignal esteja disponível (já inicializado pelo script no index.html)
      const waitForOneSignal = () => {
        return new Promise<void>((resolve) => {
          if (typeof window.OneSignal !== 'undefined') {
            resolve();
          } else {
            const checkInterval = setInterval(() => {
              if (typeof window.OneSignal !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          }
        });
      };

      await waitForOneSignal();
      const OneSignal = window.OneSignal;
      console.log('✅ [OneSignal Web SDK] OneSignal object is ready!');
      setIsInitialized(true);

      // Verificar permissão do browser primeiro
      const browserPermission = await Notification.permission;
      console.log('🔔 [OneSignal Web SDK] Browser permission:', browserPermission);

      // Verificar permissão no OneSignal
      let permission = await OneSignal.Notifications.permission;
      console.log('🔔 [OneSignal Web SDK] OneSignal permission status:', permission);
      
      // Se o browser concedeu mas OneSignal não sabe, precisamos pedir explicitamente
      if (browserPermission === 'granted' && !permission) {
        console.log('🔔 [OneSignal Web SDK] Browser granted but OneSignal not aware, requesting...');
        try {
          await OneSignal.Notifications.requestPermission();
          permission = await OneSignal.Notifications.permission;
          console.log('🔔 [OneSignal Web SDK] After request, permission is now:', permission);
        } catch (permError) {
          console.error('❌ [OneSignal Web SDK] Error requesting permission:', permError);
        }
      }
      
      if (permission) {
        setPermissionGranted(true);
        console.log('✅ [OneSignal Web SDK] Permission granted, subscribing...');
      }

      // Obter subscription ID
      let subscriptionId = await OneSignal.User.PushSubscription.id;
      console.log('📱 [OneSignal Web SDK] Subscription ID:', subscriptionId);
      
      // Se não tem subscription ID mas tem permissão, fazer opt-in
      if (!subscriptionId && permission) {
        console.log('🔔 [OneSignal Web SDK] Has permission but no subscription, opting in...');
        try {
          await OneSignal.User.PushSubscription.optIn();
          // Aguardar processamento
          await new Promise(resolve => setTimeout(resolve, 2000));
          subscriptionId = await OneSignal.User.PushSubscription.id;
          console.log('📱 [OneSignal Web SDK] New Subscription ID after opt-in:', subscriptionId);
        } catch (optInError) {
          console.error('❌ [OneSignal Web SDK] Error during opt-in:', optInError);
        }
      }
      
      if (subscriptionId) {
        setPlayerId(subscriptionId);
        await savePlayerIdToProfile(subscriptionId);
        console.log('✅ [OneSignal Web SDK] Player ID saved to profile!');
      } else {
        console.log('⚠️ [OneSignal Web SDK] No subscription ID yet. User needs to grant permission.');
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
        console.log('📱 [Native SDK] Device State completo:', JSON.stringify(state, null, 2));
        console.log('📱 [Native SDK] Player ID (userId):', state.userId);
        console.log('📱 [Native SDK] Push Token:', state.pushToken);
        console.log('📱 [Native SDK] Subscription:', state.isSubscribed);
        
        if (state.userId) {
          console.log('✅ [Native SDK] Setting player ID to state:', state.userId);
          setPlayerId(state.userId);
          savePlayerIdToProfile(state.userId);
        } else {
          console.warn('⚠️ [Native SDK] No userId found in device state!');
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
        if (typeof window.OneSignal !== 'undefined') {
          const OneSignal = window.OneSignal;
          const subscriptionId = await OneSignal.User.PushSubscription.id;
          if (subscriptionId) {
            setPlayerId(subscriptionId);
            await savePlayerIdToProfile(subscriptionId);
          }
        }
      } catch (error) {
        console.error('❌ Error updating player ID:', error);
      }
    }
  };

  // Definir External User ID (para vincular user_id com OneSignal)
  const setExternalUserId = async (userId: string) => {
    try {
      const hasCordovaPlugin = typeof window !== 'undefined' && window.plugins?.OneSignal;

      console.log('🔑 Setting External User ID:', userId);
      
      if (hasCordovaPlugin) {
        // Usar Cordova Plugin
        window.plugins.OneSignal.setExternalUserId(userId, (results: any) => {
          console.log('✅ External User ID set (native):', results);
        });
      } else {
        // Usar Web SDK - verificar se está completamente inicializado
        if (typeof window.OneSignal !== 'undefined') {
          // Aguardar que OneSignal esteja completamente pronto
          const waitForOneSignalReady = async () => {
            let attempts = 0;
            const maxAttempts = 20; // 10 segundos máximo
            
            while (attempts < maxAttempts) {
              try {
                // Verificar se o método login existe e está acessível
                if (window.OneSignal && window.OneSignal.User && typeof window.OneSignal.login === 'function') {
                  await window.OneSignal.login(userId);
                  console.log('✅ External User ID set (web):', userId);
                  return true;
                }
              } catch (error) {
                console.log(`⏳ OneSignal not ready yet, attempt ${attempts + 1}/${maxAttempts}...`);
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
              attempts++;
            }
            
            throw new Error('OneSignal initialization timeout');
          };
          
          await waitForOneSignalReady();
        } else {
          throw new Error('OneSignal Web SDK not available');
        }
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
        if (typeof window.OneSignal !== 'undefined') {
          const OneSignal = window.OneSignal;
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
