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
    
    const { player_id, external_user_id, title, message, data, image_url, sound } = body;

    console.log('📱 Sending OneSignal notification:', {
      player_id,
      external_user_id,
      title,
      message,
      data,
      image_url,
      sound
    });

    // Validar dados obrigatórios - aceitar player_id OU external_user_id
    if ((!player_id && !external_user_id) || !title || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: (player_id OR external_user_id), title, message' 
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
