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
 * Tenta obter o player_id do OneSignal SDK
 */
const getOneSignalPlayerIdFromSDK = async (): Promise<string | null> => {
  try {
    // @ts-ignore
    if (window.OneSignal?.User?.PushSubscription?.id) {
      // @ts-ignore
      const playerId = window.OneSignal.User.PushSubscription.id;
      console.log('✅ [OneSignal] Player ID obtido do SDK:', playerId);
      return playerId;
    }
    
    // @ts-ignore
    if (window.OneSignal?.User?.PushSubscription?.token) {
      // @ts-ignore
      const token = window.OneSignal.User.PushSubscription.token;
      console.log('✅ [OneSignal] Token obtido do SDK:', token);
      return token;
    }
    
    console.log('⚠️ [OneSignal] SDK não retornou player_id ou token');
    return null;
  } catch (error) {
    console.error('❌ [OneSignal] Erro ao obter player_id do SDK:', error);
    return null;
  }
};

/**
 * Tenta obter o onesignal_push_id do cookie OU do SDK com retry AGRESSIVO
 */
const getOneSignalPlayerId = async (maxAttempts: number = 6, delayMs: number = 2000): Promise<string | null> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 [OneSignal] Tentativa ${attempt}/${maxAttempts} de obter player_id...`);
    
    // 1. Tentar do cookie primeiro (para acesso via app)
    const cookiePlayerId = getCookie('onesignal_push_id');
    if (cookiePlayerId && cookiePlayerId.trim() !== '') {
      console.log(`✅ [OneSignal] Player ID encontrado no COOKIE na tentativa ${attempt}:`, cookiePlayerId);
      return cookiePlayerId;
    }
    
    // 2. Tentar do SDK (para acesso via web com OneSignal inicializado)
    const sdkPlayerId = await getOneSignalPlayerIdFromSDK();
    if (sdkPlayerId && sdkPlayerId.trim() !== '') {
      console.log(`✅ [OneSignal] Player ID encontrado no SDK na tentativa ${attempt}:`, sdkPlayerId);
      return sdkPlayerId;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ [OneSignal] Player ID não encontrado, aguardando ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log('❌ [OneSignal] Player ID não encontrado após todas as tentativas (cookie e SDK)');
  return null;
};

/**
 * Vincula o email do usuário ao external_id do OneSignal
 * Sistema de retry AGRESSIVO: 6 tentativas com delay de 2s = 12s total
 * Funciona tanto via COOKIE (app mobile) quanto via SDK (web)
 */
export const linkOneSignalExternalId = async (userEmail: string): Promise<void> => {
  try {
    console.log('🔍 [OneSignal] Iniciando vinculação de external_id para:', userEmail);
    
    // 1. Tentar obter o player_id (cookie OU SDK - 6 tentativas com delay de 2s = 12s)
    const playerId = await getOneSignalPlayerId(6, 2000);
    
    if (!playerId) {
      console.log('ℹ️ [OneSignal] Player ID não encontrado (nem cookie nem SDK)');
      console.log('ℹ️ [OneSignal] Usuário pode estar acessando via WEB sem OneSignal ou app sem permissões');
      return;
    }
    
    console.log('🎯 [OneSignal] Player ID encontrado! Iniciando vinculação...');
    
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
