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

    console.log('📱 Enviando notificação:', { userId, external_id, player_id });

    let targetIdentifier = external_id || player_id;
    let useExternalId = !!external_id;

    // Se não foi fornecido external_id nem player_id, buscar no banco
    if (!targetIdentifier && userId) {
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

      // Preferir external_id (email) se disponível
      if (profile.email) {
        targetIdentifier = profile.email;
        useExternalId = true;
        console.log('✅ Using email as external_id:', targetIdentifier);
      } else if (profile.onesignal_player_id) {
        targetIdentifier = profile.onesignal_player_id;
        useExternalId = false;
        console.log('✅ Using player_id:', targetIdentifier);
      } else {
        console.error('❌ Nenhum identificador encontrado');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Nenhum identificador OneSignal encontrado' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!targetIdentifier) {
      console.error('❌ Nenhum identificador fornecido');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'É necessário fornecer userId, external_id ou player_id' 
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

    // Usar include_aliases para external_id ou include_player_ids para player_id
    if (useExternalId) {
      notificationPayload.include_aliases = {
        external_id: [targetIdentifier]
      };
      notificationPayload.target_channel = 'push';
      console.log('📤 Enviando notificação via external_id:', targetIdentifier);
    } else {
      notificationPayload.include_player_ids = [targetIdentifier];
      console.log('📤 Enviando notificação via player_id:', targetIdentifier);
    }

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
