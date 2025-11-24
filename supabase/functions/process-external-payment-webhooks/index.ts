import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar pagamentos pendentes que precisam enviar webhook
    const { data: pendingWebhooks, error } = await supabaseAdmin
      .from('external_payments')
      .select(`
        *,
        partners:partner_id (
          webhook_url,
          webhook_secret,
          webhook_events
        )
      `)
      .eq('webhook_sent', false)
      .in('status', ['completed', 'failed'])
      .lt('webhook_attempts', 5)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      throw error;
    }

    const results = [];

    for (const payment of pendingWebhooks || []) {
      const partner = payment.partners as any;

      if (!partner?.webhook_url) {
        console.log(`⚠️ Pagamento ${payment.id} - parceiro sem webhook_url`);
        continue;
      }

      try {
        // Construir payload
        const webhookPayload = {
          event: payment.status === 'completed' ? 'payment.completed' : 'payment.failed',
          timestamp: new Date().toISOString(),
          data: {
            id: payment.id,
            orderId: payment.order_id,
            transactionId: payment.appypay_transaction_id,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.payment_method,
            status: payment.status,
            customerName: payment.customer_name,
            customerEmail: payment.customer_email,
            customerPhone: payment.customer_phone,
            referenceEntity: payment.reference_entity,
            referenceNumber: payment.reference_number,
            completedAt: payment.completed_at,
            createdAt: payment.created_at,
            metadata: payment.metadata,
          },
        };

        // Gerar assinatura HMAC (se webhook_secret estiver configurado)
        let signature = '';
        if (partner.webhook_secret) {
          const hmac = createHmac('sha256', partner.webhook_secret);
          hmac.update(JSON.stringify(webhookPayload));
          signature = hmac.digest('hex');
        }

        // Enviar webhook
        const webhookResponse = await fetch(partner.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kambafy-Signature': signature,
            'X-Kambafy-Event': webhookPayload.event,
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          // Sucesso - marcar como enviado
          await supabaseAdmin
            .from('external_payments')
            .update({
              webhook_sent: true,
              webhook_sent_at: new Date().toISOString(),
              webhook_attempts: payment.webhook_attempts + 1,
            })
            .eq('id', payment.id);

          console.log(`✅ Webhook enviado com sucesso - Pagamento ${payment.id}`);
          results.push({ id: payment.id, status: 'success' });
        } else {
          // Falhou - incrementar tentativas
          const errorText = await webhookResponse.text();
          await supabaseAdmin
            .from('external_payments')
            .update({
              webhook_attempts: payment.webhook_attempts + 1,
              webhook_last_error: `HTTP ${webhookResponse.status}: ${errorText.substring(0, 500)}`,
            })
            .eq('id', payment.id);

          console.error(`❌ Webhook falhou - Pagamento ${payment.id} - ${webhookResponse.status}`);
          results.push({ id: payment.id, status: 'failed', error: errorText });
        }

      } catch (webhookError: any) {
        console.error(`❌ Erro ao enviar webhook - Pagamento ${payment.id}:`, webhookError);
        
        // Incrementar tentativas
        await supabaseAdmin
          .from('external_payments')
          .update({
            webhook_attempts: payment.webhook_attempts + 1,
            webhook_last_error: webhookError.message?.substring(0, 500) || 'Unknown error',
          })
          .eq('id', payment.id);

        results.push({ id: payment.id, status: 'error', error: webhookError.message });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
