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
    const { event, data, user_id } = payload;

    console.log('🔔 Triggering webhooks for event:', event, 'user_id:', user_id);

    // Buscar webhooks ativos que escutam este evento
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

    if (!webhooks || webhooks.length === 0) {
      console.log('📭 No active webhooks found');
      return new Response(JSON.stringify({ 
        message: 'No active webhooks found',
        triggered: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📦 Found ${webhooks.length} webhooks to process`);

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        // Verificar se o webhook escuta este evento
        const events = webhook.events || [];
        if (!events.includes(event)) {
          console.log(`⏭️ Webhook ${webhook.id} doesn't listen to event ${event}`);
          return { webhook_id: webhook.id, skipped: true };
        }

        console.log(`🚀 Sending webhook to: ${webhook.url}`);

        const webhookPayload = {
          event,
          timestamp: new Date().toISOString(),
          data,
          webhook_id: webhook.id,
          version: "1.0"
        };

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
      triggered: webhooks.length,
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