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
      // TODO: Implementar criação de conversa via API do Tawk.to
      // Por enquanto, apenas logar
      console.log('[SEND-TAWK-MESSAGE] Tawk.to conversation creation not yet implemented');
    }

    // Enviar mensagem via API do Tawk.to
    if (tawkConvId) {
      console.log('[SEND-TAWK-MESSAGE] Sending message to Tawk.to:', {
        conversationId: tawkConvId,
        messageLength: message.length,
      });

      // TODO: Implementar envio via API REST do Tawk.to
      // Endpoint: POST https://api.tawk.to/v3/chats/{chatId}/messages
      // Headers: Authorization: Bearer {API_KEY}
      
      const tawkResponse = await fetch(`https://api.tawk.to/v3/chats/${tawkConvId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TAWK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          type: 'text',
        }),
      });

      if (!tawkResponse.ok) {
        const errorText = await tawkResponse.text();
        console.error('[SEND-TAWK-MESSAGE] Tawk.to API error:', errorText);
        throw new Error(`Tawk.to API error: ${tawkResponse.status}`);
      }

      console.log('[SEND-TAWK-MESSAGE] Message sent successfully to Tawk.to');
    }

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
