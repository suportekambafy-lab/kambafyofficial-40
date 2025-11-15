import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { player_id, title, message, data } = await req.json();

    console.log('📱 Sending OneSignal notification:', {
      player_id,
      title,
      message,
      data
    });

    // Validar dados obrigatórios
    if (!player_id || !title || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: player_id, title, message' 
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

    // Preparar payload para OneSignal
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [player_id],
      headings: { en: title },
      contents: { en: message },
      data: data || {},
      priority: 10, // Alta prioridade
      ttl: 259200, // 3 dias
    };

    console.log('📤 Sending to OneSignal API:', notificationPayload);

    // Enviar para OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
          details: result 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Notification sent successfully:', result.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        notification_id: result.id,
        recipients: result.recipients 
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
