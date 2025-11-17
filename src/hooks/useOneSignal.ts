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

  // Efeito 1: Inicializar OneSignal UMA ÚNICA VEZ
  useEffect(() => {
    // NUNCA inicializar mais de uma vez globalmente
    if (window.oneSignalInitialized) {
      console.log('ℹ️ OneSignal já foi inicializado anteriormente');
      setIsInitialized(true);
      return;
    }

    // Verificar se já existe script carregando
    const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
    if (existingScript) {
      console.log('ℹ️ Script do OneSignal já está sendo carregado');
      return;
    }

    const initOneSignal = () => {
      // Proteção final contra inicialização duplicada
      if (window.oneSignalInitialized) {
        console.log('ℹ️ OneSignal já inicializado, pulando...');
        return;
      }

      // Marcar como inicializado IMEDIATAMENTE
      window.oneSignalInitialized = true;
      console.log('🚀 Iniciando OneSignal pela primeira vez...');

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          await OneSignal.init({
            appId: "e1a77f24-25aa-4f9d-a0fd-316ecc8885cd"
          });

          console.log('✅ OneSignal Web SDK inicializado com sucesso');
          setIsInitialized(true);

          // Aguardar processamento do OneSignal
          setTimeout(async () => {
            try {
              const subscriptionId = OneSignal.User?.PushSubscription?.id;
              
              if (subscriptionId) {
                console.log('🆔 Subscription ID obtido:', subscriptionId);
                setPlayerId(subscriptionId);
              } else {
                console.log('⚠️ Subscription ID não disponível - usuário pode não ter permitido notificações');
              }
            } catch (err) {
              console.error('❌ Erro ao obter Subscription ID:', err);
            }
          }, 1500);
        } catch (error: any) {
          console.error('❌ Erro ao inicializar OneSignal:', error);
          
          // Se erro for de domínio, informar ao usuário
          if (error?.message?.includes('Can only be used on')) {
            console.error('🚨 Configure o domínio atual no painel do OneSignal!');
          }
          
          // Reset flag apenas se não for erro de "já inicializado"
          if (!error?.message?.includes('already initialized')) {
            window.oneSignalInitialized = false;
          }
        }
      });
    };

    // Carregar script apenas UMA VEZ
    console.log('📦 Carregando script do OneSignal...');
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Script do OneSignal carregado');
      initOneSignal();
    };
    script.onerror = () => {
      console.error('❌ Erro ao carregar script do OneSignal');
      window.oneSignalInitialized = false;
    };
    document.head.appendChild(script);

    // Cleanup não remove o script pois queremos manter OneSignal ativo
    return () => {
      console.log('🧹 Limpando hook useOneSignal');
    };
  }, []); // Array vazio - inicializar APENAS uma vez na montagem

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
