import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OneSignalConfig {
  appId: string;
  userId?: string;
  userEmail?: string;
}

export function useOneSignalIntegration({ appId, userId, userEmail }: OneSignalConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Salvar Player ID no perfil
  const savePlayerId = useCallback(async (newPlayerId: string) => {
    if (!userId || !newPlayerId) return false;

    try {
      console.log('💾 Salvando Player ID:', newPlayerId);

      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_player_id: newPlayerId })
        .eq('user_id', userId);

      if (error) throw error;

      // Log de sucesso
      await supabase.from('onesignal_sync_logs').insert({
        user_id: userId,
        player_id: newPlayerId,
        action: 'player_id_saved',
        status: 'success',
        metadata: { email: userEmail }
      });

      console.log('✅ Player ID salvo com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar Player ID:', error);

      await supabase.from('onesignal_sync_logs').insert({
        user_id: userId,
        player_id: newPlayerId,
        action: 'player_id_save_failed',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }, [userId, userEmail]);

  // Sincronizar external_id
  const syncExternalId = useCallback(async (currentPlayerId: string) => {
    if (!userId || !currentPlayerId) return;

    try {
      console.log('🔄 Enviando Custom Event para OneSignal');

      const { error } = await supabase.functions.invoke('send-onesignal-custom-event', {
        body: {
          external_id: userId,
          event_name: 'user_login',
          properties: {
            email: userEmail,
            player_id: currentPlayerId,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      await supabase.from('onesignal_sync_logs').insert({
        user_id: userId,
        player_id: currentPlayerId,
        action: 'external_id_synced',
        status: 'success'
      });

      console.log('✅ External ID sincronizado');
    } catch (error) {
      console.error('❌ Erro ao sincronizar external_id:', error);

      await supabase.from('onesignal_sync_logs').insert({
        user_id: userId,
        player_id: currentPlayerId,
        action: 'external_id_sync_failed',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [userId, userEmail]);

  // Capturar Player ID
  const capturePlayerId = useCallback(async () => {
    if (!window.OneSignal) {
      console.warn('⚠️ OneSignal não disponível');
      return;
    }

    try {
      console.log('🔍 Capturando Player ID...');

      // Tentar obter o Player ID
      const subscriptionId = await window.OneSignal.User.PushSubscription.id;
      const onesignalId = window.OneSignal.User?.onesignalId;
      
      const detectedPlayerId = subscriptionId || onesignalId;

      console.log('📱 Subscription ID:', subscriptionId);
      console.log('📱 OneSignal ID:', onesignalId);
      console.log('🎯 Player ID Final:', detectedPlayerId);

      if (detectedPlayerId) {
        setPlayerId(detectedPlayerId);
        await savePlayerId(detectedPlayerId);
        await syncExternalId(detectedPlayerId);
      } else {
        console.log('⏳ Player ID ainda não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao capturar Player ID:', error);
    }
  }, [savePlayerId, syncExternalId]);

  // Inicializar OneSignal
  useEffect(() => {
    if (!appId || isInitialized) return;

    const initOneSignal = async () => {
      try {
        console.log('🚀 Inicializando OneSignal...');

        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(async function() {
          await window.OneSignal.init({
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false }
          });

          console.log('✅ OneSignal inicializado');
          setIsInitialized(true);

          // Capturar Player ID após inicialização
          setTimeout(() => capturePlayerId(), 2000);

          // Listener para quando o Player ID mudar
          window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
            console.log('🔔 Push Subscription mudou:', event);
            if (event.current?.id) {
              setPlayerId(event.current.id);
              savePlayerId(event.current.id);
              syncExternalId(event.current.id);
            }
          });
        });
      } catch (error) {
        console.error('❌ Erro ao inicializar OneSignal:', error);
      }
    };

    initOneSignal();
  }, [appId, isInitialized, capturePlayerId, savePlayerId, syncExternalId]);

  return {
    isInitialized,
    playerId,
    capturePlayerId
  };
}
