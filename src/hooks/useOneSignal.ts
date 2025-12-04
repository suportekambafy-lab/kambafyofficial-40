import { useEffect, useState, useCallback } from 'react';
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
  const [externalIdSet, setExternalIdSet] = useState(false);

  // Efeito 1: Conectar ao OneSignal e configurar external_id
  useEffect(() => {
    console.log('🔍 [OneSignal] Verificando estado do OneSignal...');
    
    const checkOneSignal = setInterval(() => {
      if (window.OneSignal) {
        console.log('✅ [OneSignal] OneSignal detectado!');
        clearInterval(checkOneSignal);
        setIsInitialized(true);
        
        // Tentar obter o subscription ID
        setTimeout(() => {
          try {
            const subscriptionId = window.OneSignal?.User?.PushSubscription?.id;
            
            if (subscriptionId) {
              console.log('🆔 [OneSignal] Subscription ID obtido:', subscriptionId);
              setPlayerId(subscriptionId);
            } else {
              console.log('⚠️ [OneSignal] Subscription ID não disponível ainda');
              
              // Escutar mudanças no estado da subscription
              if (window.OneSignal?.User?.PushSubscription) {
                window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
                  console.log('🔔 [OneSignal] Subscription mudou:', event);
                  const newId = window.OneSignal?.User?.PushSubscription?.id;
                  if (newId) {
                    console.log('🆔 [OneSignal] Novo Subscription ID:', newId);
                    setPlayerId(newId);
                  }
                });
              }
            }
          } catch (err) {
            console.error('❌ [OneSignal] Erro ao obter Subscription ID:', err);
          }
        }, 2000);
      }
    }, 500);
    
    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      clearInterval(checkOneSignal);
      console.log('⏱️ [OneSignal] Timeout: OneSignal não detectado após 10 segundos');
    }, 10000);

    return () => {
      clearInterval(checkOneSignal);
      clearTimeout(timeout);
    };
  }, []);

  // Efeito 2: Definir external_id via OneSignal.login() quando usuário logar
  useEffect(() => {
    if (!user?.email || !isInitialized || externalIdSet) return;

    const setExternalId = async () => {
      try {
        console.log('🔗 [OneSignal] Definindo external_id via login():', user.email);
        
        // Usar OneSignal.login() para definir o external_id
        // Isso funciona mesmo SEM subscription (antes de aceitar notificações)
        if (window.OneSignal?.login) {
          await window.OneSignal.login(user.email);
          console.log('✅ [OneSignal] External ID definido com sucesso via login()');
          setExternalIdSet(true);
        } else {
          console.log('⚠️ [OneSignal] Método login() não disponível');
        }
      } catch (error) {
        console.error('❌ [OneSignal] Erro ao definir external_id:', error);
      }
    };

    // Aguardar um pouco para garantir que OneSignal está pronto
    const timer = setTimeout(setExternalId, 3000);
    return () => clearTimeout(timer);
  }, [user?.email, isInitialized, externalIdSet]);

  // Efeito 3: Salvar player ID quando disponível
  useEffect(() => {
    if (!user?.id || !playerId) return;

    const savePlayerIdToProfile = async () => {
      try {
        console.log('💾 [OneSignal] Salvando Player ID no perfil...', { userId: user.id, playerId });
        
        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ [OneSignal] Erro ao salvar Player ID:', error);
        } else {
          console.log('✅ [OneSignal] Player ID salvo no perfil com sucesso');
        }
      } catch (error) {
        console.error('❌ [OneSignal] Erro ao salvar Player ID:', error);
      }
    };

    savePlayerIdToProfile();
  }, [user?.id, playerId]);

  // Função para ativar notificações
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.OneSignal || !isInitialized) {
        console.warn('⚠️ [OneSignal] OneSignal não inicializado');
        return false;
      }

      // Solicitar permissão
      await window.OneSignal.Notifications.requestPermission();
      
      // Verificar se foi concedida
      const permission = await window.OneSignal.Notifications.permission;
      console.log('🔔 [OneSignal] Permissão:', permission);
      
      // Após conceder permissão, tentar obter o subscription ID novamente
      if (permission) {
        setTimeout(() => {
          const subscriptionId = window.OneSignal?.User?.PushSubscription?.id;
          if (subscriptionId && subscriptionId !== playerId) {
            console.log('🆔 [OneSignal] Subscription ID obtido após permissão:', subscriptionId);
            setPlayerId(subscriptionId);
          }
        }, 2000);
      }
      
      return permission;
    } catch (error) {
      console.error('❌ [OneSignal] Erro ao ativar notificações:', error);
      return false;
    }
  }, [isInitialized, playerId]);

  // Função para desativar notificações
  const disableNotifications = useCallback(async (): Promise<void> => {
    try {
      if (!window.OneSignal || !isInitialized) {
        console.warn('⚠️ [OneSignal] OneSignal não inicializado');
        return;
      }

      await window.OneSignal.User.PushSubscription.optOut();
      console.log('🔕 [OneSignal] Notificações desativadas');
    } catch (error) {
      console.error('❌ [OneSignal] Erro ao desativar notificações:', error);
    }
  }, [isInitialized]);

  // Verificar status da permissão
  const checkPermissionStatus = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.OneSignal || !isInitialized) {
        return false;
      }

      const permission = await window.OneSignal.Notifications.permission;
      return permission === true;
    } catch (error) {
      console.error('❌ [OneSignal] Erro ao verificar permissão:', error);
      return false;
    }
  }, [isInitialized]);

  return {
    playerId,
    isInitialized,
    externalIdSet,
    enableNotifications,
    disableNotifications,
    checkPermissionStatus,
  };
};
