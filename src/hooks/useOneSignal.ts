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
    
    // Processar retry queue primeiro
    const processRetryQueue = async () => {
      const retryQueue = JSON.parse(localStorage.getItem('onesignal_retry_queue') || '[]');
      if (retryQueue.length > 0) {
        console.log('🔄 [useOneSignal] Found retry queue with', retryQueue.length, 'items');
        for (const item of retryQueue) {
          console.log('🔄 [useOneSignal] Retrying Player ID save:', item.playerIdValue);
          const success = await savePlayerIdToProfile(item.playerIdValue);
          if (success) {
            console.log('✅ [useOneSignal] Retry successful for Player ID:', item.playerIdValue);
          }
        }
      }
    };
    
    processRetryQueue();
    
    // Função para obter o user_id do Supabase como External ID
    const getSupabaseUserId = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('❌ [OneSignal] Erro ao buscar usuário do Supabase:', error);
          return null;
        }
        
        if (!user) {
          console.log('⚠️ [OneSignal] Usuário não autenticado no Supabase');
          return null;
        }
        
        console.log('✅ [OneSignal] User ID do Supabase obtido:', user.id);
        return user.id;
      } catch (error) {
        console.error('❌ [OneSignal] Exceção ao buscar user_id:', error);
        return null;
      }
    };
    
    // Verificar se temos External ID nativo do WebView (injetado pelo app nativo)
    const checkNativeExternalId = () => {
      const nativeId = (window as any).NATIVE_EXTERNAL_ID;
      if (nativeId) {
        console.log('✅ [OneSignal] External ID NATIVO detectado do WebView:', nativeId);
        return nativeId;
      }
      console.log('⚠️ [OneSignal] External ID NATIVO não encontrado em window.NATIVE_EXTERNAL_ID');
      console.log('⚠️ [OneSignal] Tentando usar user_id do Supabase como External ID');
      return null;
    };
    
    const isNative = Capacitor.isNativePlatform();
    const hasCordovaPlugin = typeof window !== 'undefined' && window.plugins?.OneSignal;
    const platform = Capacitor.getPlatform();
    
    console.log('🔍 [CRITICAL DEBUG] OneSignal Environment Check:', { 
      isNative, 
      hasCordovaPlugin,
      platform,
      hasWindow: typeof window !== 'undefined',
      hasWebOneSignal: typeof window !== 'undefined' && typeof window.OneSignal !== 'undefined',
      hasPlugins: typeof window !== 'undefined' && typeof window.plugins !== 'undefined',
      userAgent: navigator.userAgent
    });
    
    // Inicializar OneSignal (aguardar user_id do Supabase)
    const initializeOneSignal = async () => {
      const nativeExternalId = checkNativeExternalId();
      const supabaseUserId = await getSupabaseUserId();
      const finalExternalId = nativeExternalId || supabaseUserId;
      
      if (!finalExternalId) {
        console.log('⚠️ [OneSignal] Não foi possível obter External ID (usuário não autenticado)');
        return;
      }
      
      console.log('🎯 [OneSignal] External ID final:', finalExternalId);
      console.log('🎯 [OneSignal] Fonte:', nativeExternalId ? 'NATIVE' : 'SUPABASE');
      
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
            initializeNativeSDK(finalExternalId);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkPlugin);
            console.error('❌ [NATIVE APP] Cordova Plugin NOT found after 20 seconds! OneSignal will NOT work.');
            console.error('❌ [NATIVE APP] Make sure to run: npx cap sync');
          }
        }, 500);
        
        return () => clearInterval(checkPlugin);
      }
      
      // Apenas para web browser (não Capacitor)
      console.log('🌐 [WEB BROWSER] Not Capacitor - initializing Web SDK...');
      initializeWebSDK(finalExternalId);
    };
    
    initializeOneSignal();
  }, []);

  // Inicializar OneSignal Web SDK (para WebView e Web)
  const initializeWebSDK = async (externalId: string) => {
    try {
      console.log('🌐 [OneSignal Web SDK] Waiting for OneSignal to be ready...');
      
      console.log('🔍 [OneSignal Web SDK] External ID fornecido:', externalId);
      
      // Aguardar que o OneSignal esteja disponível E inicializado
      const waitForOneSignalReady = async () => {
        return new Promise<void>((resolve) => {
          if (typeof window.OneSignal !== 'undefined') {
            // OneSignal existe, agora esperar que esteja totalmente inicializado
            window.OneSignal.push(() => {
              console.log('✅ [OneSignal Web SDK] OneSignal is fully initialized!');
              resolve();
            });
          } else {
            // Esperar o objeto OneSignal aparecer primeiro
            const checkInterval = setInterval(() => {
              if (typeof window.OneSignal !== 'undefined') {
                clearInterval(checkInterval);
                window.OneSignal.push(() => {
                  console.log('✅ [OneSignal Web SDK] OneSignal is fully initialized!');
                  resolve();
                });
              }
            }, 100);
          }
        });
      };

      await waitForOneSignalReady();
      const OneSignal = window.OneSignal;
      setIsInitialized(true);

      // Se temos External ID, configurar via User API (método correto para Web SDK)
      if (externalId) {
        console.log(`📱 [OneSignal Web SDK] Setting External ID via User.addAlias:`, externalId);
        try {
          // Usar addAlias ao invés de login para Web SDK
          await OneSignal.User.addAlias('external_id', externalId);
          console.log(`✅ [OneSignal Web SDK] External ID set successfully!`);
        } catch (aliasError) {
          console.error(`❌ [OneSignal Web SDK] Erro ao configurar External ID:`, aliasError);
        }
      } else {
        console.error('❌ [OneSignal Web SDK] Nenhum External ID disponível!');
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

      // Tentar obter Player ID de múltiplas fontes
      console.log('📱 [OneSignal Web SDK] ===== INICIANDO CAPTURA DE PLAYER ID =====');
      console.log('📱 [OneSignal Web SDK] OneSignal Object:', OneSignal);
      console.log('📱 [OneSignal Web SDK] OneSignal.User:', OneSignal.User);
      
      // Método 1: PushSubscription ID
      let subscriptionId = await OneSignal.User.PushSubscription.id;
      console.log('📱 [OneSignal Web SDK] 🔍 Método 1 - PushSubscription.id:', subscriptionId);
      
      // Método 2: User.onesignalId (pode existir mesmo sem subscription)
      const onesignalId = OneSignal.User?.onesignalId;
      console.log('📱 [OneSignal Web SDK] 🔍 Método 2 - User.onesignalId:', onesignalId);
      
      // Método 3: Tentar pegar o ID do estado interno
      try {
        const userId = OneSignal.User?.id;
        console.log('📱 [OneSignal Web SDK] 🔍 Método 3 - User.id:', userId);
      } catch (e) {
        console.log('📱 [OneSignal Web SDK] ⚠️ User.id não disponível:', e);
      }
      
      // Usar o que estiver disponível
      let playerId = subscriptionId || onesignalId;
      console.log('📱 [OneSignal Web SDK] 🎯 Player ID FINAL detectado:', playerId);
      console.log('📱 [OneSignal Web SDK] 🎯 Fonte:', subscriptionId ? 'PushSubscription' : (onesignalId ? 'onesignalId' : 'NENHUM'));
      
      // Se não tem subscription ID mas tem permissão, fazer opt-in
      if (!subscriptionId && permission) {
        console.log('🔔 [OneSignal Web SDK] Has permission but no subscription, opting in...');
        try {
          await OneSignal.User.PushSubscription.optIn();
          // Aguardar processamento
          await new Promise(resolve => setTimeout(resolve, 2000));
          subscriptionId = await OneSignal.User.PushSubscription.id;
          playerId = subscriptionId;
          console.log('📱 [OneSignal Web SDK] ✅ New Subscription ID after opt-in:', subscriptionId);
        } catch (optInError) {
          console.error('❌ [OneSignal Web SDK] Error during opt-in:', optInError);
        }
      }
      
      // Salvar Player ID se disponível
      if (playerId) {
        console.log('💾 [OneSignal Web SDK] ===== INICIANDO SALVAMENTO =====');
        console.log('💾 [OneSignal Web SDK] Player ID a ser salvo:', playerId);
        setPlayerId(playerId);
        
        const saved = await savePlayerIdToProfile(playerId);
        if (saved) {
          console.log('✅ [OneSignal Web SDK] ===== PLAYER ID SALVO COM SUCESSO! =====');
        } else {
          console.error('❌ [OneSignal Web SDK] ===== FALHA AO SALVAR PLAYER ID! =====');
        }
      } else {
        console.warn('⚠️ [OneSignal Web SDK] ===== NENHUM PLAYER ID DISPONÍVEL =====');
        console.warn('⚠️ [OneSignal Web SDK] Motivos possíveis:');
        console.warn('   1. Usuário não concedeu permissão de notificação');
        console.warn('   2. OneSignal ainda não criou o subscription');
        console.warn('   3. OneSignal Web SDK não está completamente inicializado');
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

      // 🔄 LISTENER AUTOMÁTICO: Detectar mudanças no Player ID
      console.log('🔄 [OneSignal Web SDK] Configurando listener de mudanças no Player ID...');
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        console.log('🔄 [OneSignal Web SDK] Push Subscription mudou!', event);
        
        const newPlayerId = event.current?.id;
        const previousPlayerId = event.previous?.id;
        
        console.log('🆔 Player ID anterior:', previousPlayerId);
        console.log('🆔 Novo Player ID:', newPlayerId);
        
        if (newPlayerId && newPlayerId !== previousPlayerId) {
          console.log('✅ [OneSignal Web SDK] Novo Player ID detectado! Sincronizando com Supabase...');
          setPlayerId(newPlayerId);
          await savePlayerIdToProfile(newPlayerId);
          console.log('✅ [OneSignal Web SDK] Player ID atualizado automaticamente no Supabase!');
        }
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
  const initializeNativeSDK = async (externalId: string) => {
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

      console.log('🔍 [NATIVE SDK] External ID fornecido (Supabase user_id):', externalId);
      
      if (externalId) {
        console.log(`📱 [NATIVE SDK] Configurando External ID (Supabase user_id):`, externalId);
        try {
          OneSignalPlugin.setExternalUserId(externalId);
          console.log(`✅ [NATIVE SDK] External ID configurado com sucesso!`);
        } catch (loginError) {
          console.error(`❌ [NATIVE SDK] Erro ao configurar External ID:`, loginError);
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

      // 🔄 LISTENER AUTOMÁTICO: Detectar mudanças no Player ID (Native)
      console.log('🔄 [NATIVE SDK] Configurando listener de mudanças no Player ID...');
      OneSignalPlugin.addSubscriptionObserver(async (state: any) => {
        console.log('🔄 [NATIVE SDK] Subscription mudou!', state);
        
        const newPlayerId = state.to?.userId;
        const previousPlayerId = state.from?.userId;
        
        console.log('🆔 Player ID anterior:', previousPlayerId);
        console.log('🆔 Novo Player ID:', newPlayerId);
        
        if (newPlayerId && newPlayerId !== previousPlayerId) {
          console.log('✅ [NATIVE SDK] Novo Player ID detectado! Sincronizando com Supabase...');
          setPlayerId(newPlayerId);
          await savePlayerIdToProfile(newPlayerId);
          console.log('✅ [NATIVE SDK] Player ID atualizado automaticamente no Supabase!');
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

  // Salvar Player ID no perfil do usuário com retry logic robusto
  const savePlayerIdToProfile = async (playerIdValue: string, retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 segundo
    
    try {
      // Esperar autenticação estar pronta (até 10 segundos)
      let user = null;
      let attempts = 0;
      const maxAuthAttempts = 20;
      
      while (!user && attempts < maxAuthAttempts) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          user = authUser;
          break;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!user) {
        console.log('⚠️ [savePlayerIdToProfile] No authenticated user after waiting, saving to retry queue');
        // Salvar no localStorage para tentar depois
        const retryQueue = JSON.parse(localStorage.getItem('onesignal_retry_queue') || '[]');
        retryQueue.push({ playerIdValue, timestamp: Date.now() });
        localStorage.setItem('onesignal_retry_queue', JSON.stringify(retryQueue));
        return false;
      }

      console.log(`💾 [savePlayerIdToProfile] Attempt ${retryCount + 1}/${MAX_RETRIES + 1} - Saving Player ID:`, playerIdValue);

      // Usar UPSERT ao invés de UPDATE para garantir que salva mesmo se não existe
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id,
          onesignal_player_id: playerIdValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ [savePlayerIdToProfile] Error on attempt ${retryCount + 1}:`, error);
        
        // Log do erro no Supabase
        await supabase.from('onesignal_sync_logs').insert([{
          user_id: user.id,
          player_id: playerIdValue,
          action: 'save_player_id',
          status: 'error',
          error_message: error.message,
          metadata: { 
            retry_count: retryCount, 
            error_code: error.code,
            error_details: error.details 
          } as any
        }]);
        
        // Retry com backoff exponencial
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`🔄 [savePlayerIdToProfile] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return savePlayerIdToProfile(playerIdValue, retryCount + 1);
        }
        
        return false;
      }

      console.log('✅ [savePlayerIdToProfile] Player ID saved successfully!');
      
      // Log de sucesso
      await supabase.from('onesignal_sync_logs').insert([{
        user_id: user.id,
        player_id: playerIdValue,
        action: 'save_player_id',
        status: 'success',
        metadata: { retry_count: retryCount } as any
      }]);
      
      // IMPORTANTE: Vincular External ID automaticamente após salvar Player ID
      console.log('🔗 [savePlayerIdToProfile] Vinculando External ID automaticamente...');
      try {
        const { error: linkError } = await supabase.functions.invoke('link-onesignal-external-id', {
          body: { 
            user_id: user.id,
            player_id: playerIdValue 
          }
        });
        
        if (linkError) {
          console.error('❌ [savePlayerIdToProfile] Erro ao vincular External ID:', linkError);
          
          // Log do erro
          await supabase.from('onesignal_sync_logs').insert([{
            user_id: user.id,
            player_id: playerIdValue,
            action: 'link_external_id',
            status: 'error',
            error_message: linkError.message
          }]);
        } else {
          console.log('✅ [savePlayerIdToProfile] External ID vinculado com sucesso!');
          
          // Log de sucesso
          await supabase.from('onesignal_sync_logs').insert([{
            user_id: user.id,
            player_id: playerIdValue,
            action: 'link_external_id',
            status: 'success'
          }]);
        }
      } catch (linkError) {
        console.error('❌ [savePlayerIdToProfile] Exceção ao vincular External ID:', linkError);
      }
      
      // Limpar retry queue se houver
      localStorage.removeItem('onesignal_retry_queue');
      
      return true;
    } catch (error) {
      console.error(`❌ [savePlayerIdToProfile] Exception on attempt ${retryCount + 1}:`, error);
      
      // Retry em caso de exception
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`🔄 [savePlayerIdToProfile] Retrying after exception in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return savePlayerIdToProfile(playerIdValue, retryCount + 1);
      }
      
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
