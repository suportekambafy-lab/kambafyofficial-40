import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  event: string;
  data: any;
  user_id?: string;
  order_id?: string;
  product_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    
    console.log('📨 Payload recebido no trigger-webhooks:', JSON.stringify(payload, null, 2));
    
    const { event, user_id, product_id, order_id, ...restData } = payload;

    console.log('🔔 Triggering webhooks for event:', event, 'user_id:', user_id);
    console.log('📦 Payload data:', { product_id, order_id, ...restData });

    const webhooksToTrigger: any[] = [];

    // 1. Buscar webhooks da tabela webhook_settings
    let query = supabase
      .from('webhook_settings')
      .select('*')
      .eq('active', true);

    // Se temos product_id, buscar webhooks específicos do produto
    if (payload.product_id) {
      query = query.eq('product_id', payload.product_id);
      console.log('🎯 Filtering webhooks by product_id:', payload.product_id);
    }
    // Se não tem product_id mas tem user_id, buscar webhooks globais do usuário (sem product_id)
    else if (user_id) {
      query = query.eq('user_id', user_id).is('product_id', null);
      console.log('🌐 Filtering webhooks by user_id (global):', user_id);
    }

    const { data: webhooks, error: webhookError } = await query;

    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError);
      throw webhookError;
    }

    if (webhooks && webhooks.length > 0) {
      webhooksToTrigger.push(...webhooks);
      console.log(`📦 Found ${webhooks.length} webhooks from webhook_settings`);
    }

    // 2. Se for evento de assinatura, verificar se há webhook configurado no produto
    if (payload.product_id && event.startsWith('subscription.')) {
      console.log('🔍 Checking for subscription webhook in product config');
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('subscription_config, user_id')
        .eq('id', payload.product_id)
        .single();

      if (!productError && product?.subscription_config) {
        const subConfig = product.subscription_config;
        
        // Verificar se webhook está habilitado e configurado para este evento
        if (
          subConfig.webhook_enabled && 
          subConfig.webhook_url && 
          subConfig.webhook_events?.includes(event)
        ) {
          webhooksToTrigger.push({
            id: `subscription-webhook-${payload.product_id}`,
            url: subConfig.webhook_url,
            secret: subConfig.webhook_secret || null,
            events: subConfig.webhook_events,
            active: true,
            user_id: product.user_id,
            headers: {},
            timeout: 30
          });
          console.log('✅ Added subscription webhook from product config:', subConfig.webhook_url);
        }
      }
    }

    if (webhooksToTrigger.length === 0) {
      console.log('📭 No active webhooks found');
      return new Response(JSON.stringify({ 
        message: 'No active webhooks found',
        triggered: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📦 Total webhooks to process: ${webhooksToTrigger.length}`);

    const results = await Promise.allSettled(
      webhooksToTrigger.map(async (webhook) => {
        // Verificar se o webhook escuta este evento
        const events = webhook.events || [];
        if (!events.includes(event)) {
          console.log(`⏭️ Webhook ${webhook.id} doesn't listen to event ${event}`);
          return { webhook_id: webhook.id, skipped: true };
        }

        console.log(`🚀 Sending webhook to: ${webhook.url}`);

        // Construir o payload com todos os dados relevantes
        // Extrair campos importantes para o nível superior (compatibilidade)
        const email = restData.email || restData.customer_email;
        const name = restData.name || restData.customer_name;
        
        console.log('🔍 Campos extraídos para webhook:', { email, name, restData });
        
        const webhookPayload = {
          event,
          timestamp: new Date().toISOString(),
          email, // Campo no nível superior para compatibilidade
          name,  // Campo no nível superior para compatibilidade
          data: {
            ...restData,
            order_id,
            product_id,
          },
          webhook_id: webhook.id,
          version: "1.0"
        };
        
        console.log('📤 Webhook payload final:', JSON.stringify(webhookPayload, null, 2));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Kambafy-Webhook/1.0',
          ...(webhook.headers as Record<string, string> || {})
        };

        if (webhook.secret) {
          headers['X-Webhook-Secret'] = webhook.secret;
          headers['Authorization'] = `Bearer ${webhook.secret}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(), 
          (webhook.timeout || 30) * 1000
        );

        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          const responseText = await response.text().catch(() => 'Sem corpo de resposta');
          
          // Log do webhook
          await supabase.from('webhook_logs').insert({
            user_id: webhook.user_id,
            webhook_id: webhook.id,
            event_type: event,
            payload: webhookPayload,
            response_status: response.status,
            response_body: responseText.substring(0, 1000), // Limitar tamanho
          });

          console.log(`✅ Webhook ${webhook.id} sent successfully: ${response.status}`);
          
          return {
            webhook_id: webhook.id,
            success: response.ok,
            status: response.status,
            url: webhook.url
          };

        } catch (error) {
          clearTimeout(timeoutId);
          
          let errorMessage = 'Unknown error';
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = `Timeout após ${webhook.timeout || 30} segundos`;
            } else {
              errorMessage = error.message;
            }
          }

          console.error(`❌ Webhook ${webhook.id} failed:`, errorMessage);

          // Log do erro
          await supabase.from('webhook_logs').insert({
            user_id: webhook.user_id,
            webhook_id: webhook.id,
            event_type: event,
            payload: webhookPayload,
            response_status: 0,
            response_body: errorMessage,
          });

          return {
            webhook_id: webhook.id,
            success: false,
            error: errorMessage,
            url: webhook.url
          };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    const skipped = results.filter(r => r.status === 'fulfilled' && r.value.skipped).length;

    console.log(`📊 Webhook results: ${successful} successful, ${failed} failed, ${skipped} skipped`);

    return new Response(JSON.stringify({
      message: 'Webhooks processed',
      event,
      triggered: webhooksToTrigger.length,
      successful,
      failed,
      skipped,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error in trigger-webhooks:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to process webhooks'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});