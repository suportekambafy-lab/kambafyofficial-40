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

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 [update-external-ids] Fetching all Player IDs from OneSignal...');

    // Buscar todos os Player IDs do OneSignal (sem external_user_id)
    const fetchResponse = await fetch(
      `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=300`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!fetchResponse.ok) {
      console.error('❌ [update-external-ids] Failed to fetch players from OneSignal');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch players from OneSignal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { players } = await fetchResponse.json();
    console.log(`📊 [update-external-ids] Found ${players?.length || 0} total players in OneSignal`);

    // Filtrar apenas os que NÃO têm external_user_id
    const playersWithoutExternalId = players?.filter((p: any) => !p.external_user_id) || [];
    console.log(`⚠️ [update-external-ids] ${playersWithoutExternalId.length} players without external_user_id`);

    const results = {
      total_players: players?.length || 0,
      without_external_id: playersWithoutExternalId.length,
      updated: 0,
      matched: 0,
      not_matched: 0,
      errors: 0,
      details: [] as any[]
    };

    // Buscar todos os perfis do Supabase que já têm onesignal_player_id
    const { data: existingProfiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, onesignal_player_id')
      .not('onesignal_player_id', 'is', null);

    if (profilesError) {
      console.error('❌ [update-external-ids] Error fetching profiles:', profilesError);
    }

    // Criar um mapa de player_id -> user_id para os que já estão vinculados
    const playerIdToUserId = new Map();
    existingProfiles?.forEach(profile => {
      if (profile.onesignal_player_id) {
        playerIdToUserId.set(profile.onesignal_player_id, profile.user_id);
      }
    });

    console.log(`📋 [update-external-ids] Found ${playerIdToUserId.size} existing player_id mappings in Supabase`);

    // Para cada Player ID sem external_user_id, tentar atualizar no OneSignal
    for (const player of playersWithoutExternalId) {
      const playerId = player.id;

      // Verificar se já temos esse player_id mapeado no Supabase
      const userId = playerIdToUserId.get(playerId);

      if (userId) {
        results.matched++;
        console.log(`✅ [update-external-ids] Player ${playerId} already mapped to user ${userId}`);

        // Atualizar o Player ID no OneSignal com o external_user_id
        try {
          const updateResponse = await fetch(
            `https://onesignal.com/api/v1/players/${playerId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                external_user_id: userId
              })
            }
          );

          if (updateResponse.ok) {
            results.updated++;
            console.log(`✅ [update-external-ids] Updated Player ${playerId} with external_user_id: ${userId}`);

            // Log de sucesso
            await supabaseClient.from('onesignal_sync_logs').insert({
              user_id: userId,
              player_id: playerId,
              action: 'update_external_user_id',
              status: 'success',
              metadata: { source: 'update_external_ids_script' }
            });

            results.details.push({
              player_id: playerId,
              user_id: userId,
              status: 'updated'
            });
          } else {
            results.errors++;
            console.error(`❌ [update-external-ids] Failed to update Player ${playerId}`);
          }
        } catch (error) {
          results.errors++;
          console.error(`❌ [update-external-ids] Error updating Player ${playerId}:`, error);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        results.not_matched++;
        results.details.push({
          player_id: playerId,
          status: 'not_matched',
          note: 'Player ID not found in Supabase profiles'
        });
      }
    }

    console.log('📊 [update-external-ids] Update complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        recommendation: results.not_matched > 0 
          ? 'Alguns Player IDs não puderam ser mapeados. Considere uma campanha de reativação.'
          : 'Todos os Player IDs foram atualizados com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [update-external-ids] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
