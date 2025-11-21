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
 * Verifica se o acesso é via app móvel (user-agent contém "Converta")
 */
const isAppAccess = (): boolean => {
  return navigator.userAgent.includes('Converta');
};

/**
 * Tenta obter o onesignal_push_id do cookie com retry
 */
const getOneSignalPlayerId = async (maxAttempts: number = 3, delayMs: number = 3000): Promise<string | null> => {
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
 */
export const linkOneSignalExternalId = async (userEmail: string): Promise<void> => {
  try {
    // 1. Verificar se é acesso via app
    if (!isAppAccess()) {
      console.log('ℹ️ [OneSignal] Não é acesso via app (user-agent não contém "Converta")');
      return;
    }
    
    console.log('📱 [OneSignal] Acesso via app detectado, iniciando vinculação...');
    
    // 2. Tentar obter o player_id do cookie (3 tentativas com delay de 3s)
    const playerId = await getOneSignalPlayerId(3, 3000);
    
    if (!playerId) {
      console.log('⚠️ [OneSignal] Não foi possível obter player_id, abortando vinculação');
      return;
    }
    
    // 3. Chamar edge function para vincular external_id
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
