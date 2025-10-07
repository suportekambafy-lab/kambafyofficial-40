import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    
    if (!message || !conversationId) {
      throw new Error('message and conversationId are required');
    }

    const TAWK_API_KEY = Deno.env.get('TAWK_API_KEY');
    const TAWK_PROPERTY_ID = '68e4dfc836ce7e19507dc359';

    if (!TAWK_API_KEY) {
      console.error('[SEND-TAWK-MESSAGE] TAWK_API_KEY not configured');
      throw new Error('Tawk.to API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('seller_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // Se não tem tawk_conversation_id, precisamos criar via API do Tawk.to
    let tawkConvId = conversation.tawk_conversation_id;
    
    if (!tawkConvId) {
      console.log('[SEND-TAWK-MESSAGE] Creating new Tawk.to conversation');
      
      // Criar conversa via API do Tawk.to usando Basic Auth
      const basicAuth = btoa(`${TAWK_API_KEY}:`);
      
      const createResponse = await fetch(`https://api.tawk.to/v1/chat.create`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: TAWK_PROPERTY_ID,
          visitorName: user.email?.split('@')[0] || 'Vendedor',
          visitorEmail: user.email,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[SEND-TAWK-MESSAGE] Failed to create conversation:', errorText);
        throw new Error(`Failed to create Tawk.to conversation: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      tawkConvId = createData.chatId;
      
      // Atualizar conversa no banco com o tawk_conversation_id
      await supabase
        .from('chat_conversations')
        .update({ tawk_conversation_id: tawkConvId })
        .eq('id', conversationId);
      
      console.log('[SEND-TAWK-MESSAGE] Conversation created:', tawkConvId);
    }

    // Enviar mensagem via API do Tawk.to usando Basic Auth
    console.log('[SEND-TAWK-MESSAGE] Sending message to Tawk.to:', {
      conversationId: tawkConvId,
      messageLength: message.length,
    });

    const basicAuth = btoa(`${TAWK_API_KEY}:`);
    const tawkResponse = await fetch(`https://api.tawk.to/v1/chat.sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: tawkConvId,
        message: message,
        type: 'msg',
      }),
    });

    if (!tawkResponse.ok) {
      const errorText = await tawkResponse.text();
      console.error('[SEND-TAWK-MESSAGE] Tawk.to API error:', errorText);
      throw new Error(`Tawk.to API error: ${tawkResponse.status}`);
    }

    const responseData = await tawkResponse.json();
    console.log('[SEND-TAWK-MESSAGE] Message sent successfully:', responseData);

    return new Response(
      JSON.stringify({ success: true, conversationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SEND-TAWK-MESSAGE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
