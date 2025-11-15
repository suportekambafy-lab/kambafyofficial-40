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
    
    // Verificar se temos External ID nativo do WebView (injetado pelo app nativo)
    const checkNativeExternalId = () => {
      const nativeId = (window as any).NATIVE_EXTERNAL_ID;
      if (nativeId) {
        console.log('✅ [OneSignal] External ID NATIVO detectado do WebView:', nativeId);
        return nativeId;
      }
      console.log('⚠️ [OneSignal] External ID NATIVO não encontrado em window.NATIVE_EXTERNAL_ID');
      console.log('⚠️ [OneSignal] Isso significa que o código nativo (Android/iOS) ainda não foi implementado');
      console.log('⚠️ [OneSignal] Verifique os arquivos: android-implementation.md e ios-implementation.md');
      return null;
    };
    
    // Função para gerar/recuperar External ID do localStorage como fallback
    const getOrCreateFallbackExternalId = () => {
      const storedId = localStorage.getItem('onesignal_external_id');
      if (storedId) {
        console.log('📦 [OneSignal] External ID recuperado do localStorage:', storedId);
        return storedId;
      }
      
      // Gerar novo UUID
      const newId = crypto.randomUUID();
      localStorage.setItem('onesignal_external_id', newId);
      console.log('🆕 [OneSignal] Novo External ID gerado e salvo:', newId);
      return newId;
    };
    
    const isNative = Capacitor.isNativePlatform();
    const hasCordovaPlugin = typeof window !== 'undefined' && window.plugins?.OneSignal;
    const platform = Capacitor.getPlatform();
    const nativeExternalId = checkNativeExternalId();
    const fallbackExternalId = !nativeExternalId ? getOrCreateFallbackExternalId() : null;
    const finalExternalId = nativeExternalId || fallbackExternalId;
    
    console.log('🔍 [CRITICAL DEBUG] OneSignal Environment Check:', { 
      isNative, 
      hasCordovaPlugin,
      platform,
      hasWindow: typeof window !== 'undefined',
      hasWebOneSignal: typeof window !== 'undefined' && typeof window.OneSignal !== 'undefined',
      hasPlugins: typeof window !== 'undefined' && typeof window.plugins !== 'undefined',
      userAgent: navigator.userAgent,
      nativeExternalId,
      fallbackExternalId,
      finalExternalId 
    });
    
    // IMPORTANTE: No app nativo (Capacitor), APENAS usar Cordova Plugin
    if (isNative) {
      console.log('📱 [NATIVE APP] Running in Capacitor - waiting for Cordova Plugin...');
      
      let attempts = 0;
      const maxAttempts = 40; // 20 segundos (500ms * 40)
      
      const checkPlugin = setInterval(() => {
        attempts++;
        const pluginAvailable = window.plugins?.OneSignal;
        
        console.log(`🔍 [NATIVE APP] Check ${attempts}/${maxAttempts}: Plugin available = ${!!pluginAvailable}`);
        
        if (pluginAvailable) {
          clearInterval(checkPlugin);
          console.log('✅ [NATIVE APP] Cordova Plugin found! Initializing Native SDK...');
          initializeNativeSDK();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkPlugin);
          console.error('❌ [NATIVE APP] Cordova Plugin NOT found after 20 seconds! OneSignal will NOT work.');
          console.error('❌ [NATIVE APP] Make sure to run: npx cap sync');
        }
      }, 500);
      
      return () => clearInterval(checkPlugin);
    }
    
    // Apenas para web browser (não Capacitor)
    console.log('🌐 [WEB BROWSER] Not Capacitor - Web SDK removed, OneSignal disabled');
    console.log('⚠️ [WEB BROWSER] Web SDK was removed from index.html to avoid conflicts with native app');
  }, []);

  // Inicializar OneSignal Web SDK (para WebView e Web)
  const initializeWebSDK = async () => {
    try {
      console.log('🌐 [OneSignal Web SDK] Waiting for OneSignal to be ready...');
      
      // Verificar External ID (nativo ou fallback)
      const nativeExternalId = (window as any).NATIVE_EXTERNAL_ID;
      const fallbackExternalId = !nativeExternalId ? localStorage.getItem('onesignal_external_id') : null;
      const externalId = nativeExternalId || fallbackExternalId;
      
      console.log('🔍 [OneSignal Web SDK] External ID Status:', {
        nativeExternalId,
        fallbackExternalId,
        finalExternalId: externalId,
        source: nativeExternalId ? 'NATIVE' : 'FALLBACK'
      });
      
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

      // Se temos External ID, fazer login imediatamente
      if (externalId) {
        const source = nativeExternalId ? 'NATIVO' : 'FALLBACK';
        console.log(`📱 [OneSignal Web SDK] Fazendo login com External ID ${source}:`, externalId);
        try {
          await OneSignal.login(externalId);
          console.log(`✅ [OneSignal Web SDK] Login com External ID ${source} bem-sucedido!`);
        } catch (loginError) {
          console.error(`❌ [OneSignal Web SDK] Erro ao fazer login com External ID ${source}:`, loginError);
        }
      } else {
        console.error('❌ [OneSignal Web SDK] Nenhum External ID disponível para login!');
      }

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
      console.log('🚀 [NATIVE SDK] initializeNativeSDK() called!');
      console.log('🔍 [NATIVE SDK] Checking window.plugins.OneSignal...');
      
      if (!window.plugins?.OneSignal) {
        console.error('❌ [NATIVE SDK] OneSignal Cordova plugin not found!');
        console.error('❌ [NATIVE SDK] window.plugins:', window.plugins);
        return;
      }

      const OneSignalPlugin = window.plugins.OneSignal;
      console.log('✅ [NATIVE SDK] OneSignal Plugin object found!', typeof OneSignalPlugin);

      console.log('🔔 [NATIVE SDK] Setting App ID:', ONESIGNAL_APP_ID);
      OneSignalPlugin.setAppId(ONESIGNAL_APP_ID);
      console.log('✅ [NATIVE SDK] App ID set successfully');

      // Verificar External ID (nativo ou fallback)
      const nativeExternalId = (window as any).NATIVE_EXTERNAL_ID;
      const fallbackExternalId = !nativeExternalId ? localStorage.getItem('onesignal_external_id') : null;
      const externalId = nativeExternalId || fallbackExternalId;
      
      console.log('🔍 [NATIVE SDK] External ID Status:', {
        nativeExternalId,
        fallbackExternalId,
        finalExternalId: externalId,
        source: nativeExternalId ? 'NATIVE' : 'FALLBACK'
      });
      
      if (externalId) {
        const source = nativeExternalId ? 'NATIVO' : 'FALLBACK';
        console.log(`📱 [NATIVE SDK] Configurando External ID ${source}:`, externalId);
        try {
          OneSignalPlugin.setExternalUserId(externalId);
          console.log(`✅ [NATIVE SDK] External ID ${source} configurado com sucesso!`);
        } catch (loginError) {
          console.error(`❌ [NATIVE SDK] Erro ao configurar External ID ${source}:`, loginError);
        }
      } else {
        console.error('❌ [NATIVE SDK] Nenhum External ID disponível!');
      }

      console.log('📱 [NATIVE SDK] Requesting push notification permission...');
      OneSignalPlugin.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
        console.log(`📱 [NATIVE SDK] Permission response: ${accepted ? '✅ GRANTED' : '❌ DENIED'}`);
        setPermissionGranted(accepted);
      });

      console.log('🔍 [NATIVE SDK] Getting device state...');
      OneSignalPlugin.getDeviceState((state: any) => {
        console.log('📱 [NATIVE SDK] ========== DEVICE STATE ==========');
        console.log('📱 [NATIVE SDK] Full State:', JSON.stringify(state, null, 2));
        console.log('📱 [NATIVE SDK] userId (Player ID):', state.userId);
        console.log('📱 [NATIVE SDK] pushToken:', state.pushToken);
        console.log('📱 [NATIVE SDK] isSubscribed:', state.isSubscribed);
        console.log('📱 [NATIVE SDK] isPushDisabled:', state.isPushDisabled);
        console.log('📱 [NATIVE SDK] =====================================');
        
        if (state.userId) {
          console.log('✅ [NATIVE SDK] Player ID found! Setting to state:', state.userId);
          setPlayerId(state.userId);
          savePlayerIdToProfile(state.userId);
        } else {
          console.error('❌ [NATIVE SDK] NO PLAYER ID (userId) found in device state!');
          console.error('❌ [NATIVE SDK] This is critical - check OneSignal setup');
        }
      });

      console.log('🎧 [NATIVE SDK] Setting up notification handlers...');
      
      OneSignalPlugin.setNotificationWillShowInForegroundHandler((notificationReceivedEvent: any) => {
        console.log('📩 [NATIVE SDK] Notification received in foreground:', notificationReceivedEvent);
        const notification = notificationReceivedEvent.getNotification();
        console.log('📩 [NATIVE SDK] Notification data:', notification);
        options?.onNotificationReceived?.(notification);
        notificationReceivedEvent.complete(notification);
      });

      OneSignalPlugin.setNotificationOpenedHandler((openedEvent: any) => {
        console.log('🔔 [NATIVE SDK] Notification opened:', openedEvent);
        const notification = openedEvent.notification;
        console.log('🔔 [NATIVE SDK] Opened notification data:', notification);
        options?.onNotificationOpened?.(notification);
      });

      setIsInitialized(true);
      console.log('✅ [NATIVE SDK] OneSignal Cordova Plugin initialized successfully!');

    } catch (error) {
      console.error('❌ [NATIVE SDK] Error initializing OneSignal Cordova Plugin:', error);
      console.error('❌ [NATIVE SDK] Error details:', JSON.stringify(error, null, 2));
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
      console.log('🔑 [setExternalUserId] Called with userId:', userId);
      
      const isNative = Capacitor.isNativePlatform();
      const hasCordovaPlugin = typeof window !== 'undefined' && window.plugins?.OneSignal;
      const hasWebSDK = typeof window !== 'undefined' && typeof window.OneSignal !== 'undefined';

      console.log('🔍 [setExternalUserId] Environment check:', {
        isNative,
        hasCordovaPlugin,
        hasWebSDK,
        platform: Capacitor.getPlatform(),
        currentPlayerId: playerId
      });
      
      // Se temos player_id, usar API REST para garantir vínculo
      if (playerId) {
        console.log('🌐 [setExternalUserId] Using REST API to link external_id');
        
        try {
          const { error } = await supabase.functions.invoke('link-onesignal-external-id', {
            body: { 
              user_id: userId,
              player_id: playerId 
            }
          });
          
          if (error) {
            console.error('❌ [setExternalUserId] Error calling edge function:', error);
          } else {
            console.log('✅ [setExternalUserId] External ID linked via REST API!');
            return true;
          }
        } catch (apiError) {
          console.error('❌ [setExternalUserId] API Error:', apiError);
        }
      }
      
      // Fallback: tentar via SDK nativo
      if (hasCordovaPlugin) {
        console.log('📱 [setExternalUserId] Trying via Cordova Plugin as fallback');
        window.plugins.OneSignal.setExternalUserId(userId, (results: any) => {
          console.log('✅ [setExternalUserId] External User ID set via Native SDK:', results);
        });
        return true;
      } else if (hasWebSDK && window.OneSignal.login) {
        console.log('🌐 [setExternalUserId] Trying via Web SDK as fallback');
        try {
          await window.OneSignal.login(userId);
          console.log('✅ [setExternalUserId] External User ID set via Web SDK:', userId);
          return true;
        } catch (error) {
          console.warn('⚠️ [setExternalUserId] Could not set External User ID on web:', error);
          return false;
        }
      } else {
        console.log('⚠️ [setExternalUserId] No player_id available yet');
        console.log('⚠️ [setExternalUserId] Will retry after player_id is obtained');
        return false;
      }
    } catch (error) {
      console.error('❌ [setExternalUserId] Error:', error);
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
