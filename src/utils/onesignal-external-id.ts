import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém o valor de um cookie pelo nome
 */
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  return null;
};

/**
 * Tenta obter o onesignal_push_id do cookie com retry AGRESSIVO
 */
const getOneSignalPlayerId = async (maxAttempts: number = 6, delayMs: number = 2000): Promise<string | null> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 [OneSignal] Tentativa ${attempt}/${maxAttempts} de obter player_id...`);
    
    const playerId = getCookie('onesignal_push_id');
    
    if (playerId && playerId.trim() !== '') {
      console.log(`✅ [OneSignal] Player ID encontrado na tentativa ${attempt}:`, playerId);
      return playerId;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ [OneSignal] Player ID não encontrado, aguardando ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log('❌ [OneSignal] Player ID não encontrado após todas as tentativas');
  return null;
};

/**
 * Vincula o email do usuário ao external_id do OneSignal
 * Sistema de retry AGRESSIVO: 6 tentativas com delay de 2s = 12s total
 */
export const linkOneSignalExternalId = async (userEmail: string): Promise<void> => {
  try {
    console.log('🔍 [OneSignal] Iniciando vinculação de external_id...');
    
    // 1. Tentar obter o player_id do cookie (6 tentativas com delay de 2s = 12s)
    const playerId = await getOneSignalPlayerId(6, 2000);
    
    if (!playerId) {
      console.log('ℹ️ [OneSignal] Cookie onesignal_push_id não encontrado, não é acesso via app');
      return;
    }
    
    // 2. Chamar edge function para vincular external_id
    console.log('🔗 [OneSignal] Chamando edge function para vincular external_id...', {
      player_id: playerId,
      external_id: userEmail
    });
    
    const { data, error } = await supabase.functions.invoke('onesignal-set-external-id', {
      body: {
        player_id: playerId,
        external_id: userEmail
      }
    });
    
    if (error) {
      console.error('❌ [OneSignal] Erro ao vincular external_id:', error);
      return;
    }
    
    if (data?.success) {
      console.log('✅ [OneSignal] External ID vinculado com sucesso!', data);
    } else {
      console.log('⚠️ [OneSignal] Resposta da vinculação:', data);
    }
    
  } catch (error) {
    console.error('❌ [OneSignal] Erro ao vincular external_id:', error);
  }
};
