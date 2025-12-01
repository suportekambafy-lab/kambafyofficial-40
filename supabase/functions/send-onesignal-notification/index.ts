import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string;
  external_id?: string;
  player_id?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, external_id, player_id, title, message, data = {} } = await req.json() as NotificationRequest;

    console.log('📱 Iniciando envio de notificação:', { userId, external_id, player_id });

    let targetPlayerId = player_id;
    let targetExternalId = external_id;

    // Se não foram fornecidos, buscar no banco
    if ((!targetPlayerId || !targetExternalId) && userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onesignal_player_id, email')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        console.error('❌ Perfil não encontrado para userId:', userId);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Perfil não encontrado' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar player_id se não foi fornecido
      if (!targetPlayerId && profile.onesignal_player_id) {
        targetPlayerId = profile.onesignal_player_id;
        console.log('✅ Player ID encontrado no banco:', targetPlayerId);
      }

      // Buscar external_id (email) se não foi fornecido
      if (!targetExternalId && profile.email) {
        targetExternalId = profile.email;
        console.log('✅ External ID (email) encontrado no banco:', targetExternalId);
      }
    }

    // Verificar se tem pelo menos um identificador
    if (!targetPlayerId && !targetExternalId) {
      console.error('❌ Nenhum identificador encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum identificador OneSignal encontrado (player_id ou external_id)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar credenciais do OneSignal
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('❌ Credenciais do OneSignal não configuradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do OneSignal não configuradas' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificação via OneSignal REST API
    // IMPORTANTE: OneSignal permite apenas UM método de targeting por requisição
    // Prioridade: external_id (mais confiável) > subscription_id (player_id)
    const notificationPayload: any = {
      app_id: oneSignalAppId,
      headings: { en: title },
      contents: { en: message },
      data: data,
    };

    // Detectar palavras-chave para som personalizado
    const keywordPatterns = [
      'Venda aprovada', 
      'Referência gerada', 
      'Comissão',
      'Nova venda',
      'Nova comissão'
    ];
    const messageWithTitle = `${title} ${message}`.toLowerCase();
    const hasKeyword = keywordPatterns.some(keyword => 
      messageWithTitle.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      // Adicionar som personalizado para iOS
      notificationPayload.ios_sound = 'venda_alerta.wav';
      
      // Adicionar channel ID para Android
      // IMPORTANTE: O canal "CANAL_VENDA" precisa ser criado no código nativo Android
      // com o som personalizado configurado. Veja SONS_NOTIFICACAO.md para instruções.
      notificationPayload.android_channel_id = 'CANAL_VENDA';
      
      console.log('🔔 Som personalizado adicionado - iOS: venda_alerta.wav | Android: CANAL_VENDA');
      console.log('🎯 Palavra-chave detectada no texto:', keywordPatterns.find(k => messageWithTitle.includes(k.toLowerCase())));
    }

    let targetingMethod = '';
    
    // Prioridade 1: external_id (funciona para web e app, mais confiável)
    if (targetExternalId) {
      notificationPayload.include_aliases = {
        external_id: [targetExternalId]
      };
      notificationPayload.target_channel = 'push';
      targetingMethod = `external_id: ${targetExternalId}`;
      console.log('🔗 Usando external_id:', targetExternalId);
    }
    // Prioridade 2: subscription_id (player_id) - fallback para quando não tem external_id
    else if (targetPlayerId) {
      notificationPayload.include_subscription_ids = [targetPlayerId];
      targetingMethod = `subscription_id: ${targetPlayerId}`;
      console.log('📱 Usando subscription_id (player_id):', targetPlayerId);
    }

    console.log('📤 Enviando notificação via:', targetingMethod);
    console.log('📤 Payload completo:', JSON.stringify(notificationPayload, null, 2));

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (oneSignalResponse.ok) {
      console.log('✅ Notificação enviada com sucesso:', oneSignalResult);
      return new Response(
        JSON.stringify({ 
          success: true, 
          result: oneSignalResult 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('❌ Erro ao enviar notificação:', oneSignalResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: oneSignalResult 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
