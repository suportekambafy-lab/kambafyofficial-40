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

    const { batch_size = 50 } = await req.json().catch(() => ({}));

    console.log('🔄 [recover-player-ids] Starting recovery process, batch size:', batch_size);

    // Buscar usuários sem Player ID
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, full_name')
      .is('onesignal_player_id', null)
      .limit(batch_size);

    if (profilesError) {
      console.error('❌ [recover-player-ids] Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 [recover-player-ids] Found ${profiles.length} users without Player ID`);

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total_processed: 0,
      recovered: 0,
      not_found: 0,
      errors: 0,
      details: [] as any[]
    };

    // Processar cada perfil
    for (const profile of profiles) {
      results.total_processed++;
      
      try {
        console.log(`🔍 [recover-player-ids] Processing user: ${profile.email}`);

        // Buscar na API do OneSignal
        // Nota: A API do OneSignal não permite busca direta por email, então tentamos por external_user_id
        const searchResponse = await fetch(
          `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          
          // Tentar encontrar o player pelo external_user_id que corresponde ao user_id
          const player = searchResult.players?.find((p: any) => 
            p.external_user_id === profile.user_id
          );

          if (player) {
            const playerId = player.id;
            console.log(`✅ [recover-player-ids] Found Player ID for ${profile.email}:`, playerId);

            // Salvar no perfil
            const { error: updateError } = await supabaseClient
              .from('profiles')
              .update({ onesignal_player_id: playerId })
              .eq('user_id', profile.user_id);

            if (!updateError) {
              results.recovered++;
              
              // Log de sucesso
              await supabaseClient.from('onesignal_sync_logs').insert({
                user_id: profile.user_id,
                player_id: playerId,
                action: 'recover_player_id',
                status: 'success',
                metadata: { source: 'recovery_script' }
              });

              results.details.push({
                user_id: profile.user_id,
                email: profile.email,
                status: 'recovered',
                player_id: playerId
              });
            } else {
              results.errors++;
              console.error(`❌ [recover-player-ids] Error updating ${profile.email}:`, updateError);
            }
          } else {
            results.not_found++;
            console.log(`⚠️ [recover-player-ids] No Player ID found for ${profile.email}`);
            
            results.details.push({
              user_id: profile.user_id,
              email: profile.email,
              status: 'not_found'
            });
          }
        }
      } catch (error) {
        results.errors++;
        console.error(`❌ [recover-player-ids] Error processing ${profile.email}:`, error);
      }

      // Aguardar um pouco entre requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('📊 [recover-player-ids] Recovery complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [recover-player-ids] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});