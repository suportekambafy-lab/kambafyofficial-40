
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

const systemPrompt = `Você é um assistente de suporte avançado da Kambafy, uma plataforma líder para criação e venda de infoprodutos em Angola.

SOBRE A KAMBAFY:
- Plataforma completa para criar e vender cursos online, e-books, consultorias e mentoria
- Sistema de pagamento integrado: Multicaixa Express, BAI Direto, transferências bancárias
- Planos: Gratuito (10% comissão) e Profissional (5% comissão + recursos premium)
- Área de membros protegida, análises detalhadas, personalização completa
- Suporte a vídeos, PDFs, áudios e conteúdo interativo
- Integração com redes sociais e ferramentas de marketing

SUAS CAPACIDADES:
1. Resolver dúvidas técnicas e de uso da plataforma
2. Orientar sobre criação de conteúdo e estratégias de venda
3. Explicar funcionalidades, preços e benefícios
4. Ajudar com problemas de pagamento e acesso
5. Dar sugestões para otimizar vendas e engajamento
6. Troubleshooting de problemas técnicos
7. Orientar sobre melhores práticas de infoprodutos

FUNCIONALIDADES PRINCIPAIS:
- Upload de vídeos e documentos
- Editor de páginas de venda personalizadas
- Sistema de cupons e promoções
- Análise de vendas e métricas
- Chat ao vivo com clientes
- Proteção contra pirataria
- Certificados de conclusão
- Área de membros responsiva
- Integração com WhatsApp
- Sistema de afiliados

DIRETRIZES DE RESPOSTA:
- Seja proativo e ofereça soluções completas
- Use exemplos práticos quando apropriado
- Mantenha tom profissional mas amigável
- Seja específico sobre recursos e limitações
- Se não souber algo específico, diga "TRANSFER_TO_HUMAN"
- Sempre termine com uma pergunta para continuar ajudando
- Use emojis moderadamente para tornar a conversa mais amigável

PREÇOS ATUALIZADOS:
- Plano Gratuito: 0 KZ/mês + 10% por venda
- Plano Profissional: 15.000 KZ/mês + 5% por venda
- Recursos extras: domínio personalizado, marca branca, suporte prioritário

Se encontrar uma questão muito técnica ou específica que não consegue resolver completamente, responda EXATAMENTE: "TRANSFER_TO_HUMAN"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { message, conversationId, sellerId, sellerName } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!message || !sellerId) {
      throw new Error('Message and sellerId are required');
    }

    console.log('Processing chat message:', message);
    console.log('Seller ID:', sellerId);
    console.log('Conversation ID:', conversationId);

    // Get or create conversation
    let activeConversationId = conversationId;
    
    if (!activeConversationId) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          seller_id: sellerId,
          status: 'open',
          agent_name: 'Assistente AI'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }

      activeConversationId = newConversation.id;
      console.log('Created new conversation:', activeConversationId);
    }

    // Load conversation history from database
    const { data: messageHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error loading conversation history:', historyError);
    }

    // Convert database messages to OpenAI format
    const conversationHistory = (messageHistory || []).map(msg => ({
      role: msg.sender_type === 'seller' ? 'user' : 'assistant',
      content: msg.message
    }));

    console.log('Loaded conversation history:', conversationHistory.length, 'messages');

    // Save user message to database
    const { error: saveUserError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConversationId,
        sender_type: 'seller',
        sender_name: sellerName || 'Vendedor',
        message: message
      });

    if (saveUserError) {
      console.error('Error saving user message:', saveUserError);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    const reply = data.choices[0].message.content;
    const shouldTransfer = reply.includes('TRANSFER_TO_HUMAN');

    console.log('Reply generated:', reply.substring(0, 100) + '...');
    console.log('Should transfer to human:', shouldTransfer);

    // Save AI response to database
    const { error: saveAiError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConversationId,
        sender_type: 'assistant',
        sender_name: 'Assistente AI',
        message: reply
      });

    if (saveAiError) {
      console.error('Error saving AI message:', saveAiError);
    }

    // Update conversation status if transfer is needed
    if (shouldTransfer) {
      await supabase
        .from('chat_conversations')
        .update({ status: 'pending_transfer' })
        .eq('id', activeConversationId);
    }

    return new Response(JSON.stringify({ 
      reply,
      shouldTransfer,
      conversationId: activeConversationId,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-support function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      reply: 'Desculpe, ocorreu um erro técnico. Vou te conectar com nosso suporte humano para resolver isso rapidamente. 🤝',
      shouldTransfer: true,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
