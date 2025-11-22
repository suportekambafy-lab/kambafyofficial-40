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

    // Usar o endpoint correto: Create alias (by subscription)
    // https://documentation.onesignal.com/reference/create-alias-by-subscription
    console.log('🔄 Criando/atualizando external_id via subscription...');
    const response = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${player_id}/user/identity`,
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
      
      // Se o erro for "user-2" (alias já reivindicado por outro usuário)
      // Usamos o endpoint de Transfer Subscription para mover o external_id
      if (responseData.errors?.[0]?.code === 'user-2') {
        console.log('🔄 External ID já existe em outro device, forçando transferência...');
        
        // Primeiro, tentar obter o OneSignal ID do usuário atual
        try {
          // Buscar o usuário pelo external_id para obter o onesignal_id
          const userResponse = await fetch(
            `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id:${external_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
              },
            }
          );
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            const onesignalId = userData.identity?.onesignal_id;
            
            if (onesignalId) {
              console.log('🔍 OneSignal ID encontrado:', onesignalId);
              
              // Agora usar o Transfer Subscription endpoint
              // https://documentation.onesignal.com/reference/transfer-subscription
              const transferResponse = await fetch(
                `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${player_id}/owner`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                  },
                  body: JSON.stringify({
                    identity: {
                      external_id: external_id,
                      onesignal_id: onesignalId
                    }
                  }),
                }
              );
              
              const transferData = await transferResponse.json();
              
              if (!transferResponse.ok) {
                console.error('❌ Erro ao transferir subscription:', transferData);
              } else {
                console.log('✅ Subscription transferida com sucesso!');
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    message: 'External ID transferido com sucesso!',
                    data: transferData
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        } catch (transferError) {
          console.error('❌ Erro ao transferir:', transferError);
        }
      }
      
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
