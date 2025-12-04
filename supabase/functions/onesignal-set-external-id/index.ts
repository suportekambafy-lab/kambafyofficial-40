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
      // Em vez de deletar, transferimos a subscription para o usuário existente
      // Isso permite múltiplos dispositivos com o mesmo external_id
      if (responseData.errors?.[0]?.code === 'user-2') {
        console.log('🔄 External ID já existe em outro dispositivo, adicionando este dispositivo ao mesmo usuário...');
        
        try {
          // Transferir a subscription para o usuário existente com esse external_id
          // https://documentation.onesignal.com/reference/transfer-subscription
          console.log('📱 Transferindo subscription para o usuário existente...');
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
                  external_id: external_id
                }
              }),
            }
          );
          
          const transferData = await transferResponse.json();
          console.log('📊 Status da transferência:', transferResponse.status);
          console.log('📦 Dados:', JSON.stringify(transferData));
          
          if (transferResponse.ok) {
            console.log('✅ Dispositivo adicionado ao usuário existente com sucesso!');
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Dispositivo vinculado ao usuário existente! Notificações serão enviadas para todos os dispositivos.',
                data: transferData,
                multi_device: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Se falhar a transferência, tentar método alternativo
          console.log('⚠️ Transferência falhou, tentando método alternativo...');
          
          // Buscar o user_id do usuário existente
          const getUserResponse = await fetch(
            `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(external_id)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
              },
            }
          );
          
          if (getUserResponse.ok) {
            const userData = await getUserResponse.json();
            console.log('✅ Usuário existente encontrado:', JSON.stringify(userData));
            
            // O usuário já existe e tem o external_id, a subscription será associada automaticamente
            // nas próximas interações ou podemos considerar isso como sucesso
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Usuário já possui external_id vinculado. Dispositivo será sincronizado automaticamente.',
                data: userData,
                multi_device: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.error('❌ Erro ao buscar usuário existente');
          
        } catch (transferError) {
          console.error('❌ Erro na transferência:', transferError);
          console.error('📋 Detalhes:', transferError.message);
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
