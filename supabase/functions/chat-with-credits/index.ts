import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_TOKENS_REQUIRED = 500; // Minimum tokens to allow chat

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      action,
      message, 
      conversationId, 
      productId, 
      customerName,
      customerEmail 
    } = await req.json();

    // Handle credit check action
    if (action === 'check-credits') {
      console.log('Checking credits for product:', productId);
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('user_id, chat_enabled')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return new Response(JSON.stringify({ 
          hasCredits: false,
          chatEnabled: false,
          error: 'Product not found'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!product.chat_enabled) {
        return new Response(JSON.stringify({ 
          hasCredits: false,
          chatEnabled: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: credits } = await supabase
        .from('seller_chat_credits')
        .select('token_balance')
        .eq('user_id', product.user_id)
        .single();

      const hasCredits = credits && credits.token_balance >= MIN_TOKENS_REQUIRED;

      return new Response(JSON.stringify({ 
        hasCredits,
        chatEnabled: true,
        balance: credits?.token_balance || 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chat message handling
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!message || !productId) {
      throw new Error('Message and productId are required');
    }

    console.log('Chat with credits - Product:', productId);
    console.log('Message:', message.substring(0, 100));

    // Fetch product and verify chat is enabled
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
        chatDisabled: true,
        noCredits: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sellerId = product.user_id;

    // CRITICAL: Verify seller has sufficient tokens BEFORE processing
    const { data: credits, error: creditsError } = await supabase
      .from('seller_chat_credits')
      .select('*')
      .eq('user_id', sellerId)
      .single();

    if (creditsError || !credits || credits.token_balance < MIN_TOKENS_REQUIRED) {
      console.log('Insufficient credits for seller:', sellerId, 'Balance:', credits?.token_balance || 0);
      return new Response(JSON.stringify({ 
        error: 'Seller has insufficient chat credits',
        noCredits: true,
        chatDisabled: true,
        reply: 'O chat está temporariamente indisponível. Por favor, entre em contato pelo WhatsApp ou aguarde o vendedor recarregar os créditos.'
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
      .order('created_at', { ascending: true })
      .limit(20);

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
    const trainingText = chatConfig.training_text || '';
    
    const toneDescriptions: Record<string, string> = {
      friendly: 'amigável e acolhedor',
      professional: 'profissional e objetivo',
      casual: 'descontraído e informal',
      formal: 'formal e respeitoso'
    };

    // Build training knowledge section if available
    const trainingSection = trainingText 
      ? `\n\nCONHECIMENTO ADICIONAL DO VENDEDOR:\n${trainingText}\n\nUse essas informações para responder as perguntas dos clientes de forma precisa.`
      : '';

    const systemPrompt = `Você é um assistente de atendimento ao cliente para o produto "${product.name}".

SOBRE O PRODUTO:
${product.description || 'Produto digital de alta qualidade.'}${trainingSection}

SEU ESTILO:
- Seja ${toneDescriptions[tone] || 'amigável e prestativo'}
- Use respostas concisas mas completas (máximo 3 parágrafos)
- Ajude com dúvidas sobre o produto, pagamento e acesso
- Se não souber algo específico, oriente o cliente a entrar em contato pelo WhatsApp

IMPORTANTE:
- Nunca invente informações sobre o produto
- Priorize as informações do "CONHECIMENTO ADICIONAL" quando disponíveis
- Seja proativo em ajudar
- Use emojis moderadamente`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          reply: 'O sistema está ocupado. Por favor, aguarde um momento e tente novamente.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    const usage = data.usage || { prompt_tokens: 200, completion_tokens: 100 };
    
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
        token_balance: Math.max(0, newBalance), // Never go below 0
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
        balance_after: Math.max(0, newBalance),
        conversation_id: activeConversationId,
        description: `Chat com cliente - ${customerName || 'Anônimo'}`,
        metadata: {
          product_id: productId,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens
        }
      });

    // Check if credits are now low and should disable chat
    const creditsRemaining = newBalance >= MIN_TOKENS_REQUIRED;

    return new Response(JSON.stringify({ 
      reply,
      conversationId: activeConversationId,
      tokensUsed: totalTokensUsed,
      sellerBalance: newBalance,
      noCredits: !creditsRemaining
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
