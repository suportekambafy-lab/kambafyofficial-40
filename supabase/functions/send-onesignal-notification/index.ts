import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
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
    const { userId, title, message, data = {} } = await req.json() as NotificationRequest;

    console.log('📱 Enviando notificação para userId:', userId);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar Player ID do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onesignal_player_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.onesignal_player_id) {
      console.error('❌ Player ID não encontrado para userId:', userId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Player ID não encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerId = profile.onesignal_player_id;
    console.log('✅ Player ID encontrado:', playerId);

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
    const notificationPayload = {
      app_id: oneSignalAppId,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: message },
      data: data,
    };

    console.log('📤 Enviando payload para OneSignal:', notificationPayload);

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
