import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[TAWK-WEBHOOK] Received:', JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar diferentes tipos de eventos do Tawk.to
    const eventType = payload.event || payload.type;
    
    switch (eventType) {
      case 'chat:start':
        console.log('[TAWK-WEBHOOK] Chat started:', payload);
        // TODO: Criar ou atualizar conversa no Supabase
        break;

      case 'chat:message':
        console.log('[TAWK-WEBHOOK] New message from agent:', payload);
        
        // Extrair dados da mensagem
        const chatId = payload.chatId || payload.chat_id;
        const messageText = payload.message?.text || payload.text;
        const agentName = payload.agent?.name || payload.sender?.name || 'Agente';
        
        if (!chatId || !messageText) {
          console.error('[TAWK-WEBHOOK] Missing chatId or message text');
          break;
        }

        // Encontrar conversa pelo tawk_conversation_id
        const { data: conversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('tawk_conversation_id', chatId)
          .single();

        if (convError) {
          console.error('[TAWK-WEBHOOK] Conversation not found:', convError);
          break;
        }

        // Atualizar nome do agente se necessário
        if (conversation && !conversation.agent_name) {
          await supabase
            .from('chat_conversations')
            .update({ agent_name: agentName })
            .eq('id', conversation.id);
        }

        // Salvar mensagem do agente
        const { error: msgError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversation.id,
            sender_type: 'agent',
            sender_name: agentName,
            message: messageText,
          });

        if (msgError) {
          console.error('[TAWK-WEBHOOK] Error saving message:', msgError);
        } else {
          console.log('[TAWK-WEBHOOK] Message saved successfully');
        }
        break;

      case 'chat:end':
        console.log('[TAWK-WEBHOOK] Chat ended:', payload);
        // TODO: Marcar conversa como fechada
        break;

      default:
        console.log('[TAWK-WEBHOOK] Unknown event type:', eventType);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TAWK-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
