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
    const notificationPayload: any = {
      app_id: oneSignalAppId,
      headings: { en: title },
      contents: { en: message },
      data: data,
    };

    // Enviar para ambos os identificadores quando disponíveis
    const targets: string[] = [];
    
    if (targetPlayerId) {
      notificationPayload.include_player_ids = [targetPlayerId];
      targets.push(`player_id: ${targetPlayerId}`);
      console.log('📱 Adicionando player_id ao payload:', targetPlayerId);
    }
    
    if (targetExternalId) {
      notificationPayload.include_aliases = {
        external_id: [targetExternalId]
      };
      notificationPayload.target_channel = 'push';
      targets.push(`external_id: ${targetExternalId}`);
      console.log('🔗 Adicionando external_id ao payload:', targetExternalId);
    }

    console.log('📤 Enviando notificação para:', targets.join(' e '));
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
