import { useEffect, useState } from 'react';
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

  // Efeito 1: Conectar ao OneSignal (não inicializar, apenas usar)
  useEffect(() => {
    console.log('🔍 Verificando estado do OneSignal...');
    
    // Aguardar o OneSignal estar disponível (pode ser carregado por script externo)
    const checkOneSignal = setInterval(() => {
      if (window.OneSignal) {
        console.log('✅ OneSignal detectado!');
        clearInterval(checkOneSignal);
        setIsInitialized(true);
        
        // Tentar obter o subscription ID
        setTimeout(() => {
          try {
            const subscriptionId = window.OneSignal?.User?.PushSubscription?.id;
            
            if (subscriptionId) {
              console.log('🆔 Subscription ID obtido:', subscriptionId);
              setPlayerId(subscriptionId);
            } else {
              console.log('⚠️ Subscription ID não disponível');
              
              // Escutar mudanças no estado da subscription
              if (window.OneSignal?.User?.PushSubscription) {
                window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
                  console.log('🔔 Subscription mudou:', event);
                  const newId = window.OneSignal?.User?.PushSubscription?.id;
                  if (newId) {
                    console.log('🆔 Novo Subscription ID:', newId);
                    setPlayerId(newId);
                  }
                });
              }
            }
          } catch (err) {
            console.error('❌ Erro ao obter Subscription ID:', err);
          }
        }, 2000);
      }
    }, 500);
    
    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      clearInterval(checkOneSignal);
      console.error('⏱️ Timeout: OneSignal não detectado após 10 segundos');
    }, 10000);

    return () => {
      clearInterval(checkOneSignal);
      clearTimeout(timeout);
    };
  }, []); // Array vazio - verificar APENAS uma vez na montagem

  // Efeito 2: Salvar player ID quando usuário fizer login
  useEffect(() => {
    if (!user?.id || !playerId) return;

    const savePlayerIdToProfile = async () => {
      try {
        console.log('💾 Salvando Player ID no perfil do usuário...', { userId: user.id, playerId });
        
        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Erro ao salvar Player ID:', error);
        } else {
          console.log('✅ Player ID salvo no perfil com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao salvar Player ID:', error);
      }
    };

    savePlayerIdToProfile();
  }, [user, playerId]); // Executar quando user ou playerId mudar

  return {
    playerId,
    isInitialized,
  };
};
