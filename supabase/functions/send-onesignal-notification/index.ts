import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📥 Request body recebido:', body);
    
    let { player_id, external_user_id, title, message, data, image_url, sound, user_id } = body;

    console.log('📱 Sending OneSignal notification:', {
      player_id,
      external_user_id,
      user_id,
      title,
      message,
      data,
      image_url,
      sound
    });

    // Validar dados obrigatórios
    if (!title || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: title, message' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // FALLBACK 1: Se temos user_id mas não temos player_id, buscar no Supabase
    if (!player_id && user_id) {
      console.log('🔍 No player_id provided, fetching from Supabase profiles...');
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('onesignal_player_id')
        .eq('user_id', user_id)
        .single();
      
      if (profile?.onesignal_player_id) {
        player_id = profile.onesignal_player_id;
        console.log('✅ Found player_id in Supabase:', player_id);
      } else {
        console.warn('⚠️ No player_id found in Supabase for user:', user_id);
      }
    }
    
    // FALLBACK 2: Se ainda não temos player_id nem external_user_id, falhar
    if (!player_id && !external_user_id) {
      console.error('❌ No player_id or external_user_id available after fallbacks');
      return new Response(
        JSON.stringify({ 
          error: 'Cannot send notification: no player_id or external_user_id available',
          fallback_attempted: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('❌ OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Preparar payload para OneSignal seguindo melhores práticas
    const notificationPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { 
        en: title,
        pt: title // Suporte multi-idioma
      },
      contents: { 
        en: message,
        pt: message // Suporte multi-idioma
      },
      data: data || {},
      priority: 10, // Alta prioridade para notificações de venda
      ttl: 259200, // 3 dias
      android_sound: sound || "default",
      ios_sound: sound || "default.caf",
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
    };

    // Usar external_user_id se fornecido (preferencial para apps nativos), senão player_id
    if (external_user_id) {
      notificationPayload.include_external_user_ids = [external_user_id];
      console.log('📤 Using external_user_id:', external_user_id);
    } else {
      notificationPayload.include_player_ids = [player_id];
      console.log('📤 Using player_id:', player_id);
    }

    // Adicionar imagem se fornecida
    if (image_url) {
      notificationPayload.big_picture = image_url; // Android
      notificationPayload.ios_attachments = { id: image_url }; // iOS
      notificationPayload.chrome_web_image = image_url; // Web
    }

    console.log('📤 Sending to OneSignal API:', notificationPayload);

    // Enviar para OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    console.log('📥 OneSignal API Response:', result);

    if (!response.ok) {
      console.error('❌ OneSignal API Error:', result);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send notification',
          details: result,
          errors: result.errors || []
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Notification sent successfully:', result.id);
    console.log('📊 Recipients:', result.recipients);

    return new Response(
      JSON.stringify({ 
        success: true,
        notification_id: result.id,
        recipients: result.recipients,
        external_id: result.external_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
