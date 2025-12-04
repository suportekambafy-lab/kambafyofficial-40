import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { linkOneSignalExternalId } from '@/utils/onesignal-external-id';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

/**
 * Hook para verificar e vincular OneSignal ID automaticamente
 * Usa múltiplas estratégias:
 * 1. OneSignal.login(email) - define external_id sem precisar de subscription
 * 2. linkOneSignalExternalId - usa subscription ID quando disponível
 */
export const useOneSignalAutoLink = (userEmail?: string | null, userId?: string | null) => {
  const hasAttemptedLink = useRef(false);
  const hasSetExternalId = useRef(false);

  useEffect(() => {
    if (!userEmail || !userId) return;

    const checkAndLink = async () => {
      // Evitar múltiplas tentativas na mesma sessão
      if (hasAttemptedLink.current) {
        console.log('🔄 [useOneSignalAutoLink] Já tentou vincular nesta sessão, ignorando...');
        return;
      }
      hasAttemptedLink.current = true;

      try {
        console.log('🔍 [useOneSignalAutoLink] Verificando vínculo para:', userEmail);
        
        // Verificar se já tem o ID no banco
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('❌ [useOneSignalAutoLink] Erro ao verificar perfil:', error);
          return;
        }
        
        // Se já tem, não fazer nada
        if (profile?.onesignal_player_id) {
          console.log('✅ [useOneSignalAutoLink] ID já vinculado:', profile.onesignal_player_id);
          return;
        }
        
        console.log('⚠️ [useOneSignalAutoLink] ID não encontrado, iniciando vinculação...');
        
        // ESTRATÉGIA 1: Usar OneSignal.login() para definir external_id diretamente
        // Funciona mesmo SEM subscription (antes de aceitar notificações)
        const tryOneSignalLogin = async (): Promise<boolean> => {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const tryLogin = () => {
              attempts++;
              console.log(`🔗 [useOneSignalAutoLink] Tentativa ${attempts}/${maxAttempts} de OneSignal.login()...`);
              
              if (window.OneSignal?.login && !hasSetExternalId.current) {
                window.OneSignal.login(userEmail)
                  .then(() => {
                    console.log('✅ [useOneSignalAutoLink] External ID definido via OneSignal.login()!');
                    hasSetExternalId.current = true;
                    resolve(true);
                  })
                  .catch((err: any) => {
                    console.log('⚠️ [useOneSignalAutoLink] Erro no OneSignal.login():', err);
                    if (attempts < maxAttempts) {
                      setTimeout(tryLogin, 2000);
                    } else {
                      resolve(false);
                    }
                  });
              } else if (attempts < maxAttempts) {
                setTimeout(tryLogin, 2000);
              } else {
                console.log('⚠️ [useOneSignalAutoLink] OneSignal.login() não disponível após tentativas');
                resolve(false);
              }
            };
            
            // Aguardar 3s antes de começar (dar tempo para OneSignal carregar)
            setTimeout(tryLogin, 3000);
          });
        };

        // ESTRATÉGIA 2: Vincular via subscription ID (para notificações push)
        const tryLinkViaSubscription = () => {
          setTimeout(() => {
            linkOneSignalExternalId(userEmail).catch(err => {
              console.error('❌ [useOneSignalAutoLink] Erro ao vincular via subscription:', err);
            });
          }, 5000);
        };

        // Executar ambas estratégias em paralelo
        tryOneSignalLogin();
        tryLinkViaSubscription();
        
      } catch (error) {
        console.error('❌ [useOneSignalAutoLink] Erro:', error);
      }
    };

    checkAndLink();
  }, [userEmail, userId]);
};
