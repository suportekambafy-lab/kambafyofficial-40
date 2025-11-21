import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { linkOneSignalExternalId } from '@/utils/onesignal-external-id';

/**
 * Hook para verificar e vincular OneSignal ID automaticamente
 * Pode ser usado em qualquer componente para garantir que o usuário tem o ID vinculado
 */
export const useOneSignalAutoLink = (userEmail?: string | null, userId?: string | null) => {
  useEffect(() => {
    if (!userEmail || !userId) return;

    const checkAndLink = async () => {
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
        
        // Se não tem, tentar vincular após 2s (aguardar DOM)
        console.log('⚠️ [useOneSignalAutoLink] ID não encontrado, tentando vincular...');
        setTimeout(() => {
          linkOneSignalExternalId(userEmail).catch(err => {
            console.error('❌ [useOneSignalAutoLink] Erro ao vincular:', err);
          });
        }, 2000);
        
      } catch (error) {
        console.error('❌ [useOneSignalAutoLink] Erro:', error);
      }
    };

    checkAndLink();
  }, [userEmail, userId]);
};
