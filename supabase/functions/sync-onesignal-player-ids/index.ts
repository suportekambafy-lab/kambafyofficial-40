import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 [sync-onesignal] Syncing Player ID for user:', user_id);

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('onesignal_player_id, email')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('❌ [sync-onesignal] Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já tem Player ID salvo, retornar sucesso
    if (profile.onesignal_player_id) {
      console.log('✅ [sync-onesignal] Player ID already exists:', profile.onesignal_player_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          player_id: profile.onesignal_player_id,
          message: 'Player ID already synced'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não tem Player ID, tentar buscar na API do OneSignal pelo email
    console.log('🔍 [sync-onesignal] No Player ID in profile, searching OneSignal API...');
    
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('❌ [sync-onesignal] OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar players por external_user_id
    const searchResponse = await fetch(
      `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=1&offset=0`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error('❌ [sync-onesignal] OneSignal API error:', await searchResponse.text());
      return new Response(
        JSON.stringify({ 
          error: 'Failed to search OneSignal API',
          needs_reactivation: true 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchResult = await searchResponse.json();
    
    if (searchResult.players && searchResult.players.length > 0) {
      const player = searchResult.players[0];
      const playerId = player.id;
      
      console.log('✅ [sync-onesignal] Found Player ID in OneSignal:', playerId);
      
      // Salvar no perfil
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ onesignal_player_id: playerId })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('❌ [sync-onesignal] Error saving Player ID:', updateError);
      } else {
        console.log('✅ [sync-onesignal] Player ID synced successfully');
        
        // Log de sucesso
        await supabaseClient.from('onesignal_sync_logs').insert({
          user_id,
          player_id: playerId,
          action: 'sync_from_api',
          status: 'success',
          metadata: { source: 'onesignal_api' }
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          player_id: playerId,
          message: 'Player ID synced from OneSignal API'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não encontrou, usuário precisa reativar notificações
    console.log('⚠️ [sync-onesignal] No Player ID found, user needs to reactivate notifications');
    
    await supabaseClient.from('onesignal_sync_logs').insert({
      user_id,
      player_id: null,
      action: 'sync_from_api',
      status: 'not_found',
      metadata: { message: 'User needs to reactivate notifications' }
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        needs_reactivation: true,
        message: 'Player ID not found. Please enable notifications in the app.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [sync-onesignal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});