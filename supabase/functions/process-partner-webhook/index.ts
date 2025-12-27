import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  payment_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  payment_method: string;
  completed_at?: string;
  reference?: {
    entity?: string;
    reference_number?: string;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

// Gerar assinatura HMAC-SHA256
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Calcular delay com exponential backoff
function getRetryDelay(attempt: number): number {
  // Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s
  return Math.pow(2, attempt) * 1000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId, event } = await req.json();

    if (!paymentId || !event) {
      return new Response(
        JSON.stringify({ error: 'paymentId and event are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Processing webhook for payment ${paymentId}, event: ${event}`);

    // Buscar pagamento com dados do parceiro
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('external_payments')
      .select(`
        *,
        partners!inner(
          id,
          company_name,
          webhook_url,
          webhook_secret
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const partner = payment.partners;
    
    // Verificar se parceiro tem webhook configurado
    if (!partner.webhook_url) {
      console.log('⚠️ Partner has no webhook URL configured');
      return new Response(
        JSON.stringify({ message: 'No webhook URL configured', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload do webhook completo
    const webhookPayload: WebhookPayload = {
      event,
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      customer_email: payment.customer_email,
      customer_name: payment.customer_name,
      customer_phone: payment.customer_phone,
      payment_method: payment.payment_method,
      completed_at: payment.completed_at,
      reference: payment.reference_entity ? {
        entity: payment.reference_entity,
        reference_number: payment.reference_number,
      } : undefined,
      metadata: payment.metadata,
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(webhookPayload);
    
    // Gerar assinatura HMAC
    const signature = partner.webhook_secret 
      ? await generateSignature(payloadString, partner.webhook_secret)
      : null;

    // Enviar webhook com retry e exponential backoff
    let lastError: string | null = null;
    let success = false;
    const maxAttempts = 3;
    const previousAttempts = payment.webhook_attempts || 0;
    let totalAttempts = previousAttempts;

    const webhookLogs: Array<{
      attempt: number;
      timestamp: string;
      status: number | null;
      error?: string;
      responseTime: number;
    }> = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = Date.now();
      totalAttempts++;
      
      try {
        console.log(`📤 Webhook attempt ${attempt}/${maxAttempts} to ${partner.webhook_url}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(partner.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kambafy-Signature': signature || '',
            'X-Kambafy-Event': event,
            'X-Kambafy-Timestamp': webhookPayload.timestamp,
            'X-Kambafy-Delivery-Attempt': attempt.toString(),
            'X-Kambafy-Payment-Id': payment.id,
            'User-Agent': 'Kambafy-Webhook/1.0',
          },
          body: payloadString,
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        const responseTime = Date.now() - attemptStart;

        if (response.ok) {
          success = true;
          webhookLogs.push({
            attempt,
            timestamp: new Date().toISOString(),
            status: response.status,
            responseTime,
          });
          console.log(`✅ Webhook delivered successfully (${responseTime}ms)`);
          break;
        } else {
          const errorBody = await response.text();
          lastError = `HTTP ${response.status}: ${errorBody.substring(0, 200)}`;
          webhookLogs.push({
            attempt,
            timestamp: new Date().toISOString(),
            status: response.status,
            error: lastError,
            responseTime,
          });
          console.error(`❌ Webhook failed: ${lastError}`);
        }
      } catch (error: any) {
        const responseTime = Date.now() - attemptStart;
        lastError = error.name === 'AbortError' ? 'Request timeout (30s)' : error.message;
        webhookLogs.push({
          attempt,
          timestamp: new Date().toISOString(),
          status: null,
          error: lastError,
          responseTime,
        });
        console.error(`❌ Webhook error: ${lastError}`);
      }

      // Esperar antes de tentar novamente (exponential backoff)
      if (attempt < maxAttempts) {
        const delay = getRetryDelay(attempt);
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Atualizar status do webhook no pagamento
    const existingLogs = payment.metadata?.webhook_logs || [];
    const updatedMetadata = {
      ...(payment.metadata || {}),
      webhook_logs: [...existingLogs, ...webhookLogs],
      last_webhook_attempt: new Date().toISOString(),
      last_webhook_event: event,
    };

    await supabaseAdmin
      .from('external_payments')
      .update({
        webhook_sent: success,
        webhook_sent_at: success ? new Date().toISOString() : null,
        webhook_attempts: totalAttempts,
        webhook_last_error: success ? null : lastError,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    console.log(`📊 Webhook processing complete: success=${success}, attempts=${totalAttempts}`);

    return new Response(
      JSON.stringify({
        success,
        event,
        attempts: totalAttempts,
        error: success ? null : lastError,
        logs: webhookLogs,
      }),
      { status: success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
