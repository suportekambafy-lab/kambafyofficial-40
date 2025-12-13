import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      message, 
      conversationId, 
      productId, 
      customerName,
      customerEmail 
    } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!message || !productId) {
      throw new Error('Message and productId are required');
    }

    console.log('Chat with credits - Product:', productId);
    console.log('Message:', message.substring(0, 100));

    // Buscar produto e verificar se chat está ativado
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description, user_id, chat_enabled, chat_config')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    if (!product.chat_enabled) {
      return new Response(JSON.stringify({ 
        error: 'Chat not enabled for this product',
        chatDisabled: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sellerId = product.user_id;

    // Verificar saldo de tokens do vendedor
    const { data: credits, error: creditsError } = await supabase
      .from('seller_chat_credits')
      .select('*')
      .eq('user_id', sellerId)
      .single();

    if (creditsError || !credits || credits.token_balance < 500) {
      console.log('Insufficient credits for seller:', sellerId);
      return new Response(JSON.stringify({ 
        error: 'Seller has insufficient chat credits',
        noCredits: true,
        reply: 'Desculpe, o chat está temporariamente indisponível. Por favor, entre em contato pelo WhatsApp.'
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create conversation
    let activeConversationId = conversationId;
    
    if (!activeConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          seller_id: sellerId,
          status: 'open',
          agent_name: 'Assistente IA'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }

      activeConversationId = newConversation.id;
    }

    // Load conversation history
    const { data: messageHistory } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true });

    const conversationHistory = (messageHistory || []).map(msg => ({
      role: msg.sender_type === 'customer' ? 'user' : 'assistant',
      content: msg.message
    }));

    // Save customer message
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConversationId,
        sender_type: 'customer',
        sender_name: customerName || 'Cliente',
        message: message
      });

    // Build system prompt with product context
    const chatConfig = product.chat_config || {};
    const greeting = chatConfig.greeting || 'Olá! Como posso ajudar?';
    const tone = chatConfig.tone || 'friendly';
    
    const toneDescriptions: Record<string, string> = {
      friendly: 'amigável e acolhedor',
      professional: 'profissional e objetivo',
      casual: 'descontraído e informal',
      formal: 'formal e respeitoso'
    };

    const systemPrompt = `Você é um assistente de atendimento ao cliente para o produto "${product.name}".

SOBRE O PRODUTO:
${product.description || 'Produto digital de alta qualidade.'}

SEU ESTILO:
- Seja ${toneDescriptions[tone] || 'amigável e prestativo'}
- Use respostas concisas mas completas
- Ajude com dúvidas sobre o produto, pagamento e acesso
- Se não souber algo específico, oriente o cliente a entrar em contato pelo WhatsApp

MENSAGEM DE BOAS-VINDAS: ${greeting}

IMPORTANTE:
- Nunca invente informações sobre o produto
- Seja proativo em ajudar
- Use emojis moderadamente para tornar a conversa mais amigável`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    // Calculate input tokens (rough estimate: 4 chars = 1 token)
    const inputTokensEstimate = Math.ceil(JSON.stringify(messages).length / 4);

    console.log('Calling OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    const usage = data.usage;
    
    const totalTokensUsed = usage.prompt_tokens + usage.completion_tokens;

    console.log('Tokens used:', totalTokensUsed);

    // Save AI response
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConversationId,
        sender_type: 'assistant',
        sender_name: 'Assistente IA',
        message: reply
      });

    // Debit tokens from seller's balance
    const newBalance = credits.token_balance - totalTokensUsed;
    
    await supabase
      .from('seller_chat_credits')
      .update({
        token_balance: newBalance,
        total_tokens_used: credits.total_tokens_used + totalTokensUsed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', sellerId);

    // Log transaction
    await supabase
      .from('chat_token_transactions')
      .insert({
        user_id: sellerId,
        type: 'usage',
        tokens: -totalTokensUsed,
        balance_after: newBalance,
        conversation_id: activeConversationId,
        description: `Chat com cliente - ${customerName || 'Anônimo'}`,
        metadata: {
          product_id: productId,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens
        }
      });

    return new Response(JSON.stringify({ 
      reply,
      conversationId: activeConversationId,
      tokensUsed: totalTokensUsed,
      sellerBalance: newBalance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-credits:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      reply: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contato pelo WhatsApp.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
