import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface SetExternalIdRequest {
  player_id: string;
  external_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { player_id, external_id } = await req.json() as SetExternalIdRequest;

    console.log('🔗 Vinculando External ID:', { player_id, external_id });

    const ONESIGNAL_APP_ID = 'e1a77f24-25aa-4f9d-a0fd-316ecc8885cd';
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error('ONESIGNAL_REST_API_KEY não configurada');
    }

    // 1. Primeiro, obter o user_id usando o player_id (subscription_id)
    console.log('📡 Buscando user_id a partir do player_id...');
    const getUserResponse = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/subscriptions/${player_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    if (!getUserResponse.ok) {
      const errorData = await getUserResponse.json();
      console.error('❌ Erro ao buscar user_id:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar user_id',
          details: errorData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: getUserResponse.status
        }
      );
    }

    const userData = await getUserResponse.json();
    const userId = userData.identity?.onesignal_id;

    if (!userId) {
      console.error('❌ user_id não encontrado na resposta:', userData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'user_id não encontrado'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('✅ user_id encontrado:', userId);

    // 2. Agora atualizar o external_id usando o user_id correto
    console.log('🔄 Atualizando external_id...');
    const response = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          identity: {
            external_id: external_id
          }
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao vincular External ID:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao vincular External ID',
          details: responseData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status
        }
      );
    }

    console.log('✅ External ID vinculado com sucesso:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'External ID vinculado com sucesso!',
        data: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
