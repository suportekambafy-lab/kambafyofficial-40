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
    const { user_id, player_id } = await req.json();
    
    console.log('🔗 [Link External ID] Request received:', { user_id, player_id });

    if (!user_id || !player_id) {
      throw new Error('user_id and player_id are required');
    }

    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error('ONESIGNAL_REST_API_KEY not configured');
    }

    // Vincular External User ID ao player via API REST do OneSignal
    console.log('📤 [Link External ID] Calling OneSignal API to link external_id...');
    console.log(`📤 [Link External ID] URL: https://onesignal.com/api/v1/players/${player_id}`);
    console.log(`📤 [Link External ID] Body: { "external_user_id": "${user_id}" }`);

    const response = await fetch(`https://onesignal.com/api/v1/players/${player_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        external_user_id: user_id
      }),
    });

    const responseData = await response.json();
    
    console.log('📊 [Link External ID] OneSignal Response Status:', response.status);
    console.log('📄 [Link External ID] OneSignal Response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('❌ [Link External ID] OneSignal API Error:', responseData);
      throw new Error(`OneSignal API error: ${JSON.stringify(responseData)}`);
    }

    console.log('✅ [Link External ID] External User ID linked successfully!');
    console.log('✅ [Link External ID] Player:', player_id);
    console.log('✅ [Link External ID] External ID:', user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'External User ID linked successfully',
        player_id,
        external_user_id: user_id,
        onesignal_response: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [Link External ID] Error:', error);
    
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
