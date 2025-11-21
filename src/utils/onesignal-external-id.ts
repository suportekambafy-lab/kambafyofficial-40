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
 * Tenta obter o player_id do OneSignal SDK com múltiplas tentativas
 */
const getOneSignalPlayerIdFromSDK = async (retries: number = 3, delayMs: number = 1000): Promise<string | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 [OneSignal SDK] Tentativa ${i + 1}/${retries}...`);
      
      // @ts-ignore - Método 1: subscription.id (padrão)
      if (window.OneSignal?.User?.PushSubscription?.id) {
        // @ts-ignore
        const playerId = window.OneSignal.User.PushSubscription.id;
        console.log('✅ [OneSignal SDK] Player ID obtido (subscription.id):', playerId);
        return playerId;
      }
      
      // @ts-ignore - Método 2: subscription.token
      if (window.OneSignal?.User?.PushSubscription?.token) {
        // @ts-ignore
        const token = window.OneSignal.User.PushSubscription.token;
        console.log('✅ [OneSignal SDK] Token obtido (subscription.token):', token);
        return token;
      }
      
      // @ts-ignore - Método 3: onesignalId (fallback)
      if (window.OneSignal?.User?.onesignalId) {
        // @ts-ignore
        const onesignalId = window.OneSignal.User.onesignalId;
        console.log('✅ [OneSignal SDK] OneSignal ID obtido:', onesignalId);
        return onesignalId;
      }
      
      if (i < retries - 1) {
        console.log(`⏳ [OneSignal SDK] Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ [OneSignal SDK] Erro na tentativa ${i + 1}:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.log('⚠️ [OneSignal SDK] Nenhum ID encontrado após todas as tentativas');
  return null;
};

/**
 * Tenta obter o onesignal_push_id do cookie OU do SDK com retry ULTRA AGRESSIVO
 * Ordem de prioridade:
 * 1. Cookie onesignal_push_id (iOS/Android app com OneSignal nativo)
 * 2. SDK OneSignal.User.PushSubscription.id (Web e app com SDK)
 * 3. SDK OneSignal.User.onesignalId (Fallback)
 */
const getOneSignalPlayerId = async (maxAttempts: number = 8, delayMs: number = 2500): Promise<string | null> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 [OneSignal] === TENTATIVA ${attempt}/${maxAttempts} ===`);
    
    // 1. PRIORIDADE MÁXIMA: Cookie (funciona melhor em apps nativos)
    const cookiePlayerId = getCookie('onesignal_push_id');
    if (cookiePlayerId && cookiePlayerId.trim() !== '') {
      console.log(`✅ [OneSignal COOKIE] Player ID encontrado na tentativa ${attempt}:`, cookiePlayerId);
      return cookiePlayerId;
    } else {
      console.log(`⚠️ [OneSignal COOKIE] Cookie 'onesignal_push_id' não encontrado na tentativa ${attempt}`);
    }
    
    // 2. Tentar do SDK (3 tentativas internas com delay de 1s)
    console.log(`🔍 [OneSignal] Tentando obter do SDK (com retry interno)...`);
    const sdkPlayerId = await getOneSignalPlayerIdFromSDK(3, 1000);
    if (sdkPlayerId && sdkPlayerId.trim() !== '') {
      console.log(`✅ [OneSignal SDK] Player ID encontrado na tentativa ${attempt}:`, sdkPlayerId);
      return sdkPlayerId;
    }
    
    // 3. Log detalhado do estado do OneSignal para debug
    try {
      // @ts-ignore
      const oneSignalState = {
        exists: !!window.OneSignal,
        hasUser: !!window.OneSignal?.User,
        hasPushSubscription: !!window.OneSignal?.User?.PushSubscription,
        subscriptionId: window.OneSignal?.User?.PushSubscription?.id || null,
        token: window.OneSignal?.User?.PushSubscription?.token || null,
        onesignalId: window.OneSignal?.User?.onesignalId || null,
      };
      console.log(`📊 [OneSignal] Estado atual (tentativa ${attempt}):`, oneSignalState);
    } catch (err) {
      console.log('⚠️ [OneSignal] Não foi possível verificar estado:', err);
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ [OneSignal] Aguardando ${delayMs}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('❌ [OneSignal] FALHA: Player ID não encontrado após TODAS as tentativas');
  console.error('❌ [OneSignal] Possíveis causas:');
  console.error('  - OneSignal não inicializado corretamente no app');
  console.error('  - Permissões de notificação não concedidas');
  console.error('  - Cookie não está sendo definido (Android)');
  console.error('  - Usuário está em modo web sem OneSignal instalado');
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
