import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { external_id, event_name, properties } = await req.json();

    console.log('🎯 [Custom Event] Sending to OneSignal:', {
      external_id,
      event_name,
      properties
    });

    // Validar dados obrigatórios
    if (!external_id) {
      throw new Error('external_id (user_id) is required');
    }

    if (!event_name) {
      throw new Error('event_name is required');
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || 
                              '85da5c4b-c2a7-426f-851f-5c7c42afd64a';
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error('ONESIGNAL_REST_API_KEY not configured');
    }

    // Preparar payload do Custom Event
    const eventPayload = {
      app_id: ONESIGNAL_APP_ID,
      events: [
        {
          name: event_name,
          external_id: external_id,
          timestamp: Math.floor(Date.now() / 1000),
          properties: properties || {}
        }
      ]
    };

    console.log('📤 Sending Custom Event to OneSignal API:', eventPayload);

    // Enviar Custom Event para OneSignal
    const response = await fetch('https://api.onesignal.com/apps/custom_events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(eventPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ OneSignal API error:', result);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send custom event',
          details: result,
          errors: result.errors || []
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Custom Event sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        event_name: event_name,
        external_id: external_id,
        response: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Error sending custom event:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
