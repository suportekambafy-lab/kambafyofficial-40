import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Rate limiting config
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests por minuto
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Sandbox test phone numbers
const SANDBOX_TEST_PHONES: Record<string, 'success' | 'failed' | 'pending'> = {
  '923000000': 'success',    // Always succeeds immediately
  '923000001': 'failed',     // Always fails
  '923000002': 'pending',    // Always stays pending
  '+244923000000': 'success',
  '+244923000001': 'failed',
  '+244923000002': 'pending',
};

interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'express' | 'reference' | 'card' | 'mbway' | 'multibanco';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  phoneNumber?: string;
  // Campos específicos para pagamento com cartão/mbway/multibanco
  successUrl?: string;
  cancelUrl?: string;
}

interface RefundRequest {
  paymentId: string;
  reason?: string;
  amount?: number; // Partial refund
}

interface GetOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Check if API key is sandbox (test) mode
function isSandboxKey(apiKey: string): boolean {
  return apiKey.startsWith('kp_test_');
}

// Rate limiter function
function checkRateLimit(partnerId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = partnerId;
  
  let entry = rateLimitCache.get(key);
  
  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitCache.set(key, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
  const allowed = entry.count <= RATE_LIMIT_MAX_REQUESTS;
  
  return { allowed, remaining, resetAt: entry.resetAt };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.replace('/kambafy-payments-api', '');
  const method = req.method;

  try {
    // Inicializar Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticar via API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detectar modo sandbox
    const sandboxMode = isSandboxKey(apiKey);

    // Buscar parceiro (aceitar tanto kp_test_ quanto kp_live_)
    const searchKey = sandboxMode ? apiKey.replace('kp_test_', 'kp_') : apiKey;
    
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .or(`api_key.eq.${apiKey},api_key.eq.${searchKey}`)
      .eq('status', 'approved')
      .single();

    if (partnerError || !partner) {
      await logApiUsage(supabaseAdmin, null, path, method, 401, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(partner.id);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
      'X-Sandbox-Mode': sandboxMode.toString(),
    };

    if (!rateLimit.allowed) {
      await logApiUsage(supabaseAdmin, partner.id, path, method, 429, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString()
          } 
        }
      );
    }

    // Rotas
    if (method === 'POST' && (path === '' || path === '/')) {
      return await createPayment(req, partner, supabaseAdmin, startTime, rateLimitHeaders, sandboxMode);
    }

    if (method === 'GET' && path.startsWith('/payment/')) {
      const paymentId = path.replace('/payment/', '');
      return await getPayment(paymentId, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'GET' && path === '/payments') {
      return await listPayments(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    // Novos endpoints
    if (method === 'GET' && path === '/balance') {
      return await getBalance(partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'GET' && path === '/stats') {
      return await getStats(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'POST' && path === '/refunds') {
      return await createRefund(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'GET' && path === '/refunds') {
      return await listRefunds(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    // Webhook management endpoints
    if (method === 'POST' && path === '/webhooks/test') {
      return await testWebhook(partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'POST' && path === '/webhooks/resend') {
      return await resendWebhook(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    if (method === 'GET' && path === '/webhooks/logs') {
      return await getWebhookLogs(req, partner, supabaseAdmin, startTime, rateLimitHeaders);
    }

    await logApiUsage(supabaseAdmin, partner.id, path, method, 404, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: 'Endpoint not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createPayment(
  req: Request,
  partner: any,
  supabaseAdmin: any,
  startTime: number,
  rateLimitHeaders: Record<string, string>,
  sandboxMode: boolean = false
) {
  try {
    const body: CreatePaymentRequest = await req.json();
    const { orderId, amount, currency = 'AOA', paymentMethod, customerName, customerEmail, customerPhone, metadata, phoneNumber, successUrl, cancelUrl } = body;

    const rawPhoneNumber = phoneNumber ?? customerPhone;
    const normalizedPhoneNumber = rawPhoneNumber ? normalizePhoneNumber(rawPhoneNumber) : null;

    // Validações
    if (!orderId || !amount || !paymentMethod || !customerName || !customerEmail) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          code: 'VALIDATION_ERROR',
          required: ['orderId', 'amount', 'paymentMethod', 'customerName', 'customerEmail']
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentMethod === 'express' && !rawPhoneNumber) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'phoneNumber is required for express payments', 
          code: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentMethod === 'mbway' && !rawPhoneNumber) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'phoneNumber is required for MB WAY payments', 
          code: 'VALIDATION_ERROR',
          details: 'Portuguese phone number required (e.g., +351912345678)'
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentMethod === 'express' && (!normalizedPhoneNumber || !isValidPhoneNumber(normalizedPhoneNumber))) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({
          error: 'Invalid phoneNumber format',
          code: 'VALIDATION_ERROR',
          details: 'Use only digits (9-15). Example: 923456789 or 244923456789. We ignore + and spaces.'
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar moeda para métodos portugueses
    if ((paymentMethod === 'mbway' || paymentMethod === 'multibanco') && currency !== 'EUR') {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({
          error: 'MB WAY and Multibanco only accept EUR currency',
          code: 'VALIDATION_ERROR',
          details: 'Set currency to EUR for Portuguese payment methods'
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than 0', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se orderId já existe
    const { data: existing } = await supabaseAdmin
      .from('external_payments')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('order_id', orderId)
      .single();

    if (existing) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 409, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Order ID already exists', 
          code: 'DUPLICATE_ORDER_ID',
          existingPayment: {
            id: existing.id,
            status: existing.status
          }
        }),
        { status: 409, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let appypayResponse: { transactionId: string; entity: string | null; reference: string | null; merchantTransactionId?: string };
    let paymentStatus = 'pending';

    // Definir expiração baseado no método de pagamento
    const expiresAt = paymentMethod === 'express'
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()  // 5 minutos
      : (paymentMethod === 'card' || paymentMethod === 'mbway' || paymentMethod === 'multibanco')
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()  // 24 horas para cartão/mbway/multibanco
        : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();  // 48 horas para referência

    let payment: any = null;

    // PAGAMENTO COM MB WAY (via PaymentIntents - envia push notification)
    if (paymentMethod === 'mbway') {
      console.log(`📱 Processing MB WAY payment via Stripe PaymentIntents`);
      
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 500, Date.now() - startTime, req);
        return new Response(
          JSON.stringify({ error: 'MB WAY payments not configured', code: 'MBWAY_NOT_CONFIGURED' }),
          { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

      // Converter amount para centavos
      const amountInCents = Math.round(amount);

      // Criar registro no banco primeiro
      const { data: insertedPayment, error: insertError } = await supabaseAdmin
        .from('external_payments')
        .insert({
          partner_id: partner.id,
          order_id: orderId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: rawPhoneNumber || null,
          expires_at: expiresAt,
          metadata: {
            ...metadata,
            is_sandbox: sandboxMode,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error('Failed to save payment');
      }

      payment = insertedPayment;

      try {
        // Formatar telefone português (deve incluir código do país)
        let formattedPhone = rawPhoneNumber!.replace(/\s+/g, '').replace(/-/g, '');
        if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.startsWith('351')) {
            formattedPhone = '+' + formattedPhone;
          } else if (formattedPhone.startsWith('9')) {
            formattedPhone = '+351' + formattedPhone;
          } else {
            formattedPhone = '+351' + formattedPhone;
          }
        }

        console.log(`📱 Creating MB WAY PaymentIntent for phone: ${formattedPhone}`);

        // Criar PaymentIntent com MB WAY
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'eur',
          payment_method_types: ['mbway'],
          payment_method_data: {
            type: 'mbway',
            mbway: {
              phone: formattedPhone,
            },
          },
          confirm: true, // Confirma imediatamente - envia push ao telefone
          metadata: {
            external_payment_id: payment.id,
            partner_id: partner.id,
            order_id: orderId,
            source: 'kambafy_partner_api',
            payment_method: 'mbway',
            customer_phone: formattedPhone,
          },
        });

        console.log(`✅ MB WAY PaymentIntent created:`, paymentIntent.id, 'Status:', paymentIntent.status);

        // Atualizar registro com dados do Stripe
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('external_payments')
          .update({
            card_payment_intent_id: paymentIntent.id,
            status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
            metadata: {
              ...payment.metadata,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_status: paymentIntent.status,
              phone_used: formattedPhone,
            },
            updated_at: new Date().toISOString(),
            ...(paymentIntent.status === 'succeeded' ? { completed_at: new Date().toISOString() } : {}),
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError) {
          console.error('⚠️ Failed to update payment with Stripe data:', updateError);
        } else {
          payment = updatedPayment;
        }

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 201, Date.now() - startTime, req);

        // Retornar resposta para MB WAY
        return new Response(
          JSON.stringify({
            id: payment.id,
            orderId: payment.order_id,
            status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: 'mbway',
            mbway: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              phone: formattedPhone,
              message: 'Notificação MB WAY enviada para o telemóvel do cliente. Aguarde a confirmação.',
            },
            instructions: 'O cliente receberá uma notificação push no app MB WAY para aprovar o pagamento. Use o endpoint GET /payment/{id} para verificar o status.',
            expiresAt: expiresAt,
            createdAt: payment.created_at,
          }),
          { status: 201, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (stripeError: any) {
        console.error('❌ MB WAY Stripe error:', stripeError.message);
        
        // Marcar como failed
        await supabaseAdmin
          .from('external_payments')
          .update({
            status: 'failed',
            webhook_last_error: stripeError.message,
            metadata: {
              ...payment.metadata,
              stripe_error: stripeError.message,
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);

        return new Response(
          JSON.stringify({ 
            error: 'Falha ao enviar notificação MB WAY', 
            code: 'MBWAY_SEND_FAILED',
            details: stripeError.message,
          }),
          { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PAGAMENTO COM MULTIBANCO (via PaymentIntents - retorna entidade/referência)
    if (paymentMethod === 'multibanco') {
      console.log(`🏦 Processing Multibanco payment via Stripe PaymentIntents`);
      
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 500, Date.now() - startTime, req);
        return new Response(
          JSON.stringify({ error: 'Multibanco payments not configured', code: 'MULTIBANCO_NOT_CONFIGURED' }),
          { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
      const amountInCents = Math.round(amount);

      // Criar registro no banco primeiro
      const { data: insertedPayment, error: insertError } = await supabaseAdmin
        .from('external_payments')
        .insert({
          partner_id: partner.id,
          order_id: orderId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: rawPhoneNumber || null,
          expires_at: expiresAt,
          metadata: {
            ...metadata,
            is_sandbox: sandboxMode,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error('Failed to save payment');
      }

      payment = insertedPayment;

      try {
        // Criar PaymentIntent com Multibanco
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'eur',
          payment_method_types: ['multibanco'],
          payment_method_data: {
            type: 'multibanco',
            billing_details: {
              email: customerEmail,
              name: customerName,
            },
          },
          confirm: true,
          metadata: {
            external_payment_id: payment.id,
            partner_id: partner.id,
            order_id: orderId,
            source: 'kambafy_partner_api',
            payment_method: 'multibanco',
          },
        });

        console.log(`✅ Multibanco PaymentIntent created:`, paymentIntent.id, 'Status:', paymentIntent.status);

        // Extrair dados do Multibanco
        let multibancoEntity = null;
        let multibancoReference = null;
        let multibancoExpiresAt = null;

        if (paymentIntent.next_action?.type === 'multibanco_display_details') {
          const details = paymentIntent.next_action.multibanco_display_details;
          multibancoEntity = details?.entity;
          multibancoReference = details?.reference;
          multibancoExpiresAt = details?.expires_at ? new Date(details.expires_at * 1000).toISOString() : null;
        }

        // Atualizar registro com dados do Stripe
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('external_payments')
          .update({
            card_payment_intent_id: paymentIntent.id,
            reference_entity: multibancoEntity,
            reference_number: multibancoReference,
            expires_at: multibancoExpiresAt || expiresAt,
            metadata: {
              ...payment.metadata,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_status: paymentIntent.status,
              multibanco_entity: multibancoEntity,
              multibanco_reference: multibancoReference,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError) {
          console.error('⚠️ Failed to update payment with Stripe data:', updateError);
        } else {
          payment = updatedPayment;
        }

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 201, Date.now() - startTime, req);

        // Retornar resposta para Multibanco
        return new Response(
          JSON.stringify({
            id: payment.id,
            orderId: payment.order_id,
            status: 'pending',
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: 'multibanco',
            multibanco: {
              paymentIntentId: paymentIntent.id,
              entity: multibancoEntity,
              reference: multibancoReference,
              expiresAt: multibancoExpiresAt,
            },
            instructions: 'Utilize a entidade e referência para efetuar o pagamento num ATM ou homebanking. Use o endpoint GET /payment/{id} para verificar o status.',
            expiresAt: multibancoExpiresAt || expiresAt,
            createdAt: payment.created_at,
          }),
          { status: 201, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (stripeError: any) {
        console.error('❌ Multibanco Stripe error:', stripeError.message);
        
        await supabaseAdmin
          .from('external_payments')
          .update({
            status: 'failed',
            webhook_last_error: stripeError.message,
            metadata: {
              ...payment.metadata,
              stripe_error: stripeError.message,
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);

        return new Response(
          JSON.stringify({ 
            error: 'Falha ao criar referência Multibanco', 
            code: 'MULTIBANCO_FAILED',
            details: stripeError.message,
          }),
          { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PAGAMENTO COM CARTÃO (via PaymentIntents - retorna client_secret)
    if (paymentMethod === 'card') {
      console.log(`💳 Processing Card payment via Stripe PaymentIntents`);
      
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 500, Date.now() - startTime, req);
        return new Response(
          JSON.stringify({ error: 'Card payments not configured', code: 'CARD_NOT_CONFIGURED' }),
          { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
      const amountInCents = Math.round(amount);
      const stripeCurrency = currency.toLowerCase();

      // Criar registro no banco primeiro
      const { data: insertedPayment, error: insertError } = await supabaseAdmin
        .from('external_payments')
        .insert({
          partner_id: partner.id,
          order_id: orderId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: rawPhoneNumber || null,
          expires_at: expiresAt,
          metadata: {
            ...metadata,
            is_sandbox: sandboxMode,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error('Failed to save payment');
      }

      payment = insertedPayment;

      try {
        // Criar PaymentIntent (não confirmado - cliente confirma com client_secret)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: stripeCurrency,
          payment_method_types: ['card'],
          metadata: {
            external_payment_id: payment.id,
            partner_id: partner.id,
            order_id: orderId,
            source: 'kambafy_partner_api',
            payment_method: 'card',
          },
          receipt_email: customerEmail,
        });

        console.log(`✅ Card PaymentIntent created:`, paymentIntent.id, 'Status:', paymentIntent.status);

        // Atualizar registro com dados do Stripe
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('external_payments')
          .update({
            card_payment_intent_id: paymentIntent.id,
            metadata: {
              ...payment.metadata,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_status: paymentIntent.status,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError) {
          console.error('⚠️ Failed to update payment with Stripe data:', updateError);
        } else {
          payment = updatedPayment;
        }

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 201, Date.now() - startTime, req);

        // Retornar resposta para Cartão
        return new Response(
          JSON.stringify({
            id: payment.id,
            orderId: payment.order_id,
            status: 'pending',
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: 'card',
            card: {
              paymentIntentId: paymentIntent.id,
              clientSecret: paymentIntent.client_secret,
              publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') || null,
            },
            instructions: 'Use o client_secret com Stripe.js ou Elements no frontend para completar o pagamento. O cliente insere os dados do cartão diretamente no seu site/app.',
            expiresAt: expiresAt,
            createdAt: payment.created_at,
          }),
          { status: 201, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (stripeError: any) {
        console.error('❌ Card Stripe error:', stripeError.message);
        
        await supabaseAdmin
          .from('external_payments')
          .update({
            status: 'failed',
            webhook_last_error: stripeError.message,
            metadata: {
              ...payment.metadata,
              stripe_error: stripeError.message,
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);

        return new Response(
          JSON.stringify({ 
            error: 'Falha ao criar pagamento com cartão', 
            code: 'CARD_FAILED',
            details: stripeError.message,
          }),
          { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // MODO SANDBOX: Simular pagamento sem chamar AppyPay
    if (sandboxMode) {
      console.log('🧪 Sandbox mode: Simulating payment');

      // Gerar IDs simulados
      const sandboxTxId = `SANDBOX_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      appypayResponse = {
        transactionId: sandboxTxId,
        entity: paymentMethod === 'reference' ? '10611' : null,
        reference: paymentMethod === 'reference' ? `${Date.now()}`.slice(-9) : null,
        merchantTransactionId: sandboxTxId,
      };

      // Verificar telefones de teste para Express
      if (paymentMethod === 'express' && rawPhoneNumber) {
        const normalized = normalizePhoneNumber(rawPhoneNumber);
        const cleanPhone = normalized.slice(-9);

        const testResult =
          SANDBOX_TEST_PHONES[rawPhoneNumber] ||
          SANDBOX_TEST_PHONES[normalized] ||
          SANDBOX_TEST_PHONES[cleanPhone] ||
          SANDBOX_TEST_PHONES[`+244${cleanPhone}`];

        if (testResult === 'success') {
          paymentStatus = 'completed';
        } else if (testResult === 'failed') {
          paymentStatus = 'failed';
        }
        // 'pending' permanece como default
      }

      // Salvar no banco (sandbox)
      const { data: insertedPayment, error: insertError } = await supabaseAdmin
        .from('external_payments')
        .insert({
          partner_id: partner.id,
          order_id: orderId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: paymentStatus,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: rawPhoneNumber || null,
          appypay_transaction_id: appypayResponse.transactionId,
          reference_entity: appypayResponse.entity,
          reference_number: appypayResponse.reference,
          expires_at: expiresAt,
          completed_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
          metadata: {
            ...metadata,
            is_sandbox: true,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error('Failed to save payment');
      }

      payment = insertedPayment;
    } else {
      // MODO PRODUÇÃO: criar registro ANTES de chamar AppyPay para evitar race com webhook (express)
      const now = new Date();
      const timestamp = now.getDate().toString().padStart(2, '0') +
                       now.getHours().toString().padStart(2, '0') +
                       now.getMinutes().toString().padStart(2, '0');
      const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
      const merchantTransactionId = `TR${timestamp}${randomSuffix}`;

      const { data: insertedPayment, error: preInsertError } = await supabaseAdmin
        .from('external_payments')
        .insert({
          partner_id: partner.id,
          order_id: orderId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: rawPhoneNumber || null,
          // ⚠️ IMPORTANTE: salvar merchantTransactionId primeiro, para o webhook encontrar imediatamente
          appypay_transaction_id: merchantTransactionId,
          reference_entity: null,
          reference_number: null,
          expires_at: expiresAt,
          completed_at: null,
          metadata: {
            ...metadata,
            is_sandbox: false,
            appypay_merchant_transaction_id: merchantTransactionId,
          },
        })
        .select()
        .single();

      if (preInsertError) {
        console.error('❌ Insert error (pre):', preInsertError);
        throw new Error('Failed to save payment');
      }

      payment = insertedPayment;

      try {
        const oauthToken = await getAppyPayOAuthToken();
        appypayResponse = await createAppyPayCharge(oauthToken, {
          amount,
          paymentMethod,
          phoneNumber: normalizedPhoneNumber || undefined,
          customerName,
          customerEmail,
          orderId,
          merchantTransactionId,
        });

        // Atualizar registro com o chargeId (payload.id) e referência (se houver)
        const updatedMetadata = {
          ...(payment.metadata || {}),
          appypay_merchant_transaction_id: merchantTransactionId,
          appypay_charge_id: appypayResponse.transactionId,
        };

        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('external_payments')
          .update({
            appypay_transaction_id: appypayResponse.transactionId,
            reference_entity: appypayResponse.entity,
            reference_number: appypayResponse.reference,
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError) {
          console.error('⚠️ Failed to update payment with AppyPay IDs:', updateError);
        } else {
          payment = updatedPayment;
        }
      } catch (err: any) {
        // Marcar como failed se a criação da cobrança falhar
        const errorMessage = err?.message || 'Failed to create AppyPay charge';
        console.error('❌ AppyPay create charge error:', errorMessage);

        await supabaseAdmin
          .from('external_payments')
          .update({
            status: 'failed',
            webhook_last_error: errorMessage,
            metadata: {
              ...(payment?.metadata || {}),
              appypay_error: errorMessage,
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        throw err;
      }
    }

    await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 201, Date.now() - startTime, req);

    // Se sandbox e status completed, disparar webhook
    if (sandboxMode && paymentStatus === 'completed' && partner.webhook_url) {
      console.log('🧪 Sandbox: Triggering webhook for completed payment');
      await supabaseAdmin.functions.invoke('process-partner-webhook', {
        body: { paymentId: payment.id, event: 'payment.completed' }
      });
    }

    // Resposta
    const response: any = {
      id: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      expiresAt: payment.expires_at,
      createdAt: payment.created_at,
      sandbox: sandboxMode,
    };

    if (paymentMethod === 'express') {
      response.instructions = {
        message: sandboxMode
          ? `[SANDBOX] Pagamento simulado para ${rawPhoneNumber || normalizedPhoneNumber || ''}.`
          : `Uma notificação de pagamento foi enviada para ${rawPhoneNumber || normalizedPhoneNumber || ''}. O cliente deve confirmar no telemóvel (Multicaixa Express).`,
        transactionId: payment.appypay_transaction_id,
        expiresIn: '5 minutos',
      };
    } else if (paymentMethod === 'reference') {
      response.reference = {
        entity: payment.reference_entity,
        reference: payment.reference_number,
        instructions: sandboxMode
          ? `[SANDBOX] Referência simulada - Entidade: ${payment.reference_entity}, Referência: ${payment.reference_number}`
          : `Pague em qualquer ATM Multicaixa usando:\nEntidade: ${payment.reference_entity}\nReferência: ${payment.reference_number}`,
        expiresIn: '48 horas',
      };
    } else if (paymentMethod === 'card') {
      response.checkout = {
        url: payment.metadata?.checkout_url,
        expiresIn: '24 horas',
      };
      response.instructions = 'Redirecione o cliente para a URL de checkout para completar o pagamento com cartão.';
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Create payment error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment', code: 'CREATE_PAYMENT_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getPayment(
  paymentId: string, 
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const { data: payment, error } = await supabaseAdmin
      .from('external_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('partner_id', partner.id)
      .single();

    if (error || !payment) {
      await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 404, Date.now() - startTime, null);
      return new Response(
        JSON.stringify({ error: 'Payment not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 200, Date.now() - startTime, null);

    const response: any = {
      id: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      customerName: payment.customer_name,
      customerEmail: payment.customer_email,
      customerPhone: payment.customer_phone,
      transactionId: payment.appypay_transaction_id,
      expiresAt: payment.expires_at,
      completedAt: payment.completed_at,
      createdAt: payment.created_at,
      metadata: payment.metadata,
    };

    if (payment.payment_method === 'reference') {
      response.reference = {
        entity: payment.reference_entity,
        reference: payment.reference_number,
      };
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Get payment error:', error);
    await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 500, Date.now() - startTime, null);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get payment', code: 'GET_PAYMENT_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listPayments(
  req: Request, 
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('external_payments')
      .select('*', { count: 'exact' })
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error, count } = await query;

    if (error) {
      throw error;
    }

    await logApiUsage(supabaseAdmin, partner.id, '/payments', 'GET', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        data: payments.map((p: any) => ({
          id: p.id,
          orderId: p.order_id,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.payment_method,
          customerName: p.customer_name,
          customerEmail: p.customer_email,
          transactionId: p.appypay_transaction_id,
          completedAt: p.completed_at,
          createdAt: p.created_at,
        })),
        pagination: {
          total: count,
          limit,
          offset,
        },
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ List payments error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/payments', 'GET', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to list payments', code: 'LIST_PAYMENTS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// NOVO: Endpoint de saldo
async function getBalance(
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    // Calcular saldo baseado em pagamentos completados menos reembolsos
    const { data: completedPayments, error: paymentsError } = await supabaseAdmin
      .from('external_payments')
      .select('amount, status')
      .eq('partner_id', partner.id)
      .eq('status', 'completed');

    if (paymentsError) throw paymentsError;

    const totalReceived = (completedPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    // Buscar reembolsos (se tabela existir)
    let totalRefunded = 0;
    try {
      const { data: refunds } = await supabaseAdmin
        .from('partner_refunds')
        .select('amount, status')
        .eq('partner_id', partner.id)
        .eq('status', 'completed');
      
      totalRefunded = (refunds || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    } catch (e) {
      // Tabela pode não existir ainda
    }

    // Taxa de comissão (configurável por parceiro)
    const commissionRate = partner.commission_rate || 0.03; // 3% padrão
    const commissionAmount = totalReceived * commissionRate;
    
    const availableBalance = totalReceived - totalRefunded - commissionAmount;
    const pendingBalance = await getPendingBalance(partner.id, supabaseAdmin);

    await logApiUsage(supabaseAdmin, partner.id, '/balance', 'GET', 200, Date.now() - startTime, null);

    return new Response(
      JSON.stringify({
        currency: 'AOA',
        available: Math.max(0, availableBalance),
        pending: pendingBalance,
        totalReceived,
        totalRefunded,
        commissionRate: commissionRate * 100,
        commissionAmount,
        lastUpdated: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Get balance error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/balance', 'GET', 500, Date.now() - startTime, null);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get balance', code: 'GET_BALANCE_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getPendingBalance(partnerId: string, supabaseAdmin: any): Promise<number> {
  const { data: pendingPayments } = await supabaseAdmin
    .from('external_payments')
    .select('amount')
    .eq('partner_id', partnerId)
    .eq('status', 'pending');

  return (pendingPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
}

// NOVO: Endpoint de estatísticas
async function getStats(
  req: Request,
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d, all
    
    let startDate: Date;
    const now = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Buscar todos os pagamentos no período
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('external_payments')
      .select('id, amount, status, payment_method, created_at, completed_at')
      .eq('partner_id', partner.id)
      .gte('created_at', startDate.toISOString());

    if (paymentsError) throw paymentsError;

    const allPayments = payments || [];
    
    // Calcular estatísticas
    const totalPayments = allPayments.length;
    const completedPayments = allPayments.filter((p: any) => p.status === 'completed');
    const pendingPayments = allPayments.filter((p: any) => p.status === 'pending');
    const failedPayments = allPayments.filter((p: any) => ['failed', 'expired', 'cancelled'].includes(p.status));
    
    const totalVolume = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const averageTicket = completedPayments.length > 0 ? totalVolume / completedPayments.length : 0;
    const conversionRate = totalPayments > 0 ? (completedPayments.length / totalPayments) * 100 : 0;

    // Por método de pagamento
    const expressPayments = allPayments.filter((p: any) => p.payment_method === 'express');
    const referencePayments = allPayments.filter((p: any) => p.payment_method === 'reference');

    const expressCompleted = expressPayments.filter((p: any) => p.status === 'completed');
    const referenceCompleted = referencePayments.filter((p: any) => p.status === 'completed');

    // Tempo médio de conclusão (apenas para completados)
    let avgCompletionTime = 0;
    if (completedPayments.length > 0) {
      const completionTimes = completedPayments
        .filter((p: any) => p.completed_at)
        .map((p: any) => new Date(p.completed_at).getTime() - new Date(p.created_at).getTime());
      
      if (completionTimes.length > 0) {
        avgCompletionTime = completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length / 1000; // em segundos
      }
    }

    // Dados diários para gráfico
    const dailyData: Record<string, { date: string; count: number; volume: number }> = {};
    completedPayments.forEach((p: any) => {
      const date = p.completed_at ? p.completed_at.split('T')[0] : p.created_at.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, count: 0, volume: 0 };
      }
      dailyData[date].count++;
      dailyData[date].volume += Number(p.amount);
    });

    await logApiUsage(supabaseAdmin, partner.id, '/stats', 'GET', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        period,
        currency: 'AOA',
        summary: {
          totalPayments,
          completedPayments: completedPayments.length,
          pendingPayments: pendingPayments.length,
          failedPayments: failedPayments.length,
          totalVolume,
          averageTicket: Math.round(averageTicket * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          avgCompletionTimeSeconds: Math.round(avgCompletionTime),
        },
        byMethod: {
          express: {
            total: expressPayments.length,
            completed: expressCompleted.length,
            volume: expressCompleted.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
            conversionRate: expressPayments.length > 0 
              ? Math.round((expressCompleted.length / expressPayments.length) * 10000) / 100 
              : 0,
          },
          reference: {
            total: referencePayments.length,
            completed: referenceCompleted.length,
            volume: referenceCompleted.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
            conversionRate: referencePayments.length > 0 
              ? Math.round((referenceCompleted.length / referencePayments.length) * 10000) / 100 
              : 0,
          },
        },
        dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/stats', 'GET', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get stats', code: 'GET_STATS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// NOVO: Criar pedido de reembolso
async function createRefund(
  req: Request,
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const body: RefundRequest = await req.json();
    const { paymentId, reason, amount } = body;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'paymentId is required', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se pagamento existe e pertence ao parceiro
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('external_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('partner_id', partner.id)
      .single();

    if (paymentError || !payment) {
      await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'POST', 404, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ error: 'Payment not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se pagamento está completado
    if (payment.status !== 'completed') {
      await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Only completed payments can be refunded', 
          code: 'INVALID_PAYMENT_STATUS',
          currentStatus: payment.status
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular valor do reembolso
    const refundAmount = amount && amount > 0 && amount <= payment.amount ? amount : payment.amount;

    // Criar registro de reembolso
    const refundId = crypto.randomUUID();
    
    // Tentar inserir na tabela de reembolsos (criar se não existir via metadata)
    const refundData = {
      id: refundId,
      partner_id: partner.id,
      payment_id: paymentId,
      amount: refundAmount,
      original_amount: payment.amount,
      currency: payment.currency,
      reason: reason || 'Requested by partner',
      status: 'pending',
      requested_at: new Date().toISOString(),
    };

    // Atualizar metadata do pagamento com informação de reembolso
    const updatedMetadata = {
      ...(payment.metadata || {}),
      refund: {
        id: refundId,
        amount: refundAmount,
        reason: reason || 'Requested by partner',
        status: 'pending',
        requestedAt: new Date().toISOString(),
      }
    };

    await supabaseAdmin
      .from('external_payments')
      .update({ metadata: updatedMetadata })
      .eq('id', paymentId);

    await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'POST', 201, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        id: refundId,
        paymentId,
        amount: refundAmount,
        originalAmount: payment.amount,
        currency: payment.currency,
        reason: reason || 'Requested by partner',
        status: 'pending',
        message: 'Refund request submitted. It will be processed within 3-5 business days.',
        requestedAt: new Date().toISOString(),
      }),
      { status: 201, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Create refund error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'POST', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create refund', code: 'CREATE_REFUND_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// NOVO: Listar reembolsos
async function listRefunds(
  req: Request,
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Buscar pagamentos com metadata de reembolso
    const { data: payments, error, count } = await supabaseAdmin
      .from('external_payments')
      .select('id, order_id, amount, currency, metadata, created_at', { count: 'exact' })
      .eq('partner_id', partner.id)
      .not('metadata->refund', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const refunds = (payments || []).map((p: any) => ({
      id: p.metadata?.refund?.id,
      paymentId: p.id,
      orderId: p.order_id,
      amount: p.metadata?.refund?.amount,
      originalAmount: p.amount,
      currency: p.currency,
      reason: p.metadata?.refund?.reason,
      status: p.metadata?.refund?.status,
      requestedAt: p.metadata?.refund?.requestedAt,
      processedAt: p.metadata?.refund?.processedAt,
    }));

    await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'GET', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        data: refunds,
        pagination: {
          total: count,
          limit,
          offset,
        },
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ List refunds error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/refunds', 'GET', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to list refunds', code: 'LIST_REFUNDS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper: Obter OAuth token do AppyPay
async function getAppyPayOAuthToken(): Promise<string> {
  const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
  const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
  const resource = Deno.env.get('APPYPAY_RESOURCE') || 'https://gwy-api.appypay.co.ao/';

  if (!clientId || !clientSecret) {
    throw new Error('AppyPay credentials not configured');
  }

  const tokenUrl = 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token';
  const tokenParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    resource: resource
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OAuth error:', errorText);
    throw new Error(`Failed to get OAuth token: ${response.status}`);
  }

  const data: GetOAuthTokenResponse = await response.json();
  return data.access_token;
}

// Helper: Sanitizar description para AppyPay (apenas letras, números e espaços, máx 40 chars)
function sanitizeDescription(text: string): string {
  if (!text) return 'Pagamento Kambafy';
  
  // Remover acentos
  const accentMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N'
  };
  
  let sanitized = text;
  for (const [accent, replacement] of Object.entries(accentMap)) {
    sanitized = sanitized.replace(new RegExp(accent, 'g'), replacement);
  }
  
  // Remover caracteres especiais exceto letras, números e espaços
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  
  // Remover espaços duplicados e trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limitar a 40 caracteres
  return sanitized.substring(0, 40).trim() || 'Pagamento Kambafy';
}

function normalizePhoneNumber(input: string): string {
  return input.replace(/\D/g, '');
}

function isValidPhoneNumber(phoneDigits: string): boolean {
  return /^\d{9,15}$/.test(phoneDigits);
}


// Helper: Criar cobrança AppyPay (Express ou Reference)
async function createAppyPayCharge(token: string, data: {
  amount: number;
  paymentMethod: 'express' | 'reference';
  phoneNumber?: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  // ✅ IMPORTANTE: permitir injetar o merchantTransactionId pré-gerado (evita race com webhook)
  merchantTransactionId?: string;
}) {
  const merchantTxId = data.merchantTransactionId || (() => {
    // Gerar merchantTransactionId (máx 15 chars alfanuméricos)
    const now = new Date();
    const timestamp = now.getDate().toString().padStart(2, '0') +
                     now.getHours().toString().padStart(2, '0') +
                     now.getMinutes().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `TR${timestamp}${randomSuffix}`;
  })();

  // Sanitizar orderId para description (apenas primeiros 20 chars, apenas alfanuméricos)
  const cleanOrderId = data.orderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  const description = sanitizeDescription(`Pagamento ${cleanOrderId}`);
  
  console.log(`📝 AppyPay description: "${description}" (original orderId: ${data.orderId})`);

  const payload: any = {
    amount: data.amount,
    currency: 'AOA',
    description: description,
    merchantTransactionId: merchantTxId,
    paymentMethod: data.paymentMethod === 'express' 
      ? 'GPO_b1cfa3d3-f34a-4cfa-bcff-d52829991567'
      : 'REF_96ee61a9-e9ff-4030-8be6-0b775e847e5f'
  };

  // Adicionar phoneNumber para Express
  if (data.paymentMethod === 'express' && data.phoneNumber) {
    payload.paymentInfo = { phoneNumber: normalizePhoneNumber(data.phoneNumber) };
  }

  const response = await fetch('https://gwy-api.appypay.co.ao/v2.0/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'pt-BR'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ AppyPay charge error:', errorText);
    throw new Error(`Failed to create AppyPay charge: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // Estrutura de resposta da AppyPay v2.0
  return {
    transactionId: result.id,
    entity: result.responseStatus?.reference?.entity || null,
    reference: result.responseStatus?.reference?.referenceNumber || null,
  };
}

// NOVO: Testar conexão do webhook
async function testWebhook(
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    if (!partner.webhook_url) {
      return new Response(
        JSON.stringify({ 
          error: 'No webhook URL configured', 
          code: 'NO_WEBHOOK_URL',
          message: 'Configure a webhook URL in your partner settings first.'
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const testPayload = {
      event: 'webhook.test',
      message: 'This is a test webhook from Kambafy Payments API',
      partner_id: partner.id,
      company_name: partner.company_name,
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(testPayload);
    
    // Gerar assinatura se houver secret
    let signature = '';
    if (partner.webhook_secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(partner.webhook_secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadString));
      signature = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const testStart = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(partner.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kambafy-Signature': signature,
          'X-Kambafy-Event': 'webhook.test',
          'X-Kambafy-Timestamp': testPayload.timestamp,
          'User-Agent': 'Kambafy-Webhook/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - testStart;

      await logApiUsage(supabaseAdmin, partner.id, '/webhooks/test', 'POST', 200, Date.now() - startTime, null);

      return new Response(
        JSON.stringify({
          success: response.ok,
          url: partner.webhook_url,
          statusCode: response.status,
          responseTimeMs: responseTime,
          message: response.ok 
            ? 'Webhook endpoint is reachable and responding correctly'
            : `Webhook endpoint returned status ${response.status}`,
          testedAt: testPayload.timestamp,
        }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError: any) {
      clearTimeout(timeout);
      const responseTime = Date.now() - testStart;
      
      await logApiUsage(supabaseAdmin, partner.id, '/webhooks/test', 'POST', 200, Date.now() - startTime, null);

      return new Response(
        JSON.stringify({
          success: false,
          url: partner.webhook_url,
          error: fetchError.name === 'AbortError' ? 'Connection timeout (10s)' : fetchError.message,
          responseTimeMs: responseTime,
          message: 'Failed to connect to webhook endpoint',
          testedAt: testPayload.timestamp,
        }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ Test webhook error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/webhooks/test', 'POST', 500, Date.now() - startTime, null);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to test webhook', code: 'TEST_WEBHOOK_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// NOVO: Reenviar webhook para um pagamento
async function resendWebhook(
  req: Request,
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'paymentId is required', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se pagamento existe e pertence ao parceiro
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('external_payments')
      .select('id, status')
      .eq('id', paymentId)
      .eq('partner_id', partner.id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!partner.webhook_url) {
      return new Response(
        JSON.stringify({ error: 'No webhook URL configured', code: 'NO_WEBHOOK_URL' }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar evento baseado no status
    let event = 'payment.pending';
    if (payment.status === 'completed') event = 'payment.completed';
    else if (payment.status === 'failed') event = 'payment.failed';
    else if (payment.status === 'expired') event = 'payment.expired';

    // Disparar webhook
    const { data: webhookResult, error: webhookError } = await supabaseAdmin.functions.invoke('process-partner-webhook', {
      body: { paymentId, event }
    });

    await logApiUsage(supabaseAdmin, partner.id, '/webhooks/resend', 'POST', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        success: !webhookError,
        paymentId,
        event,
        result: webhookResult,
        error: webhookError?.message,
        resentAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Resend webhook error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/webhooks/resend', 'POST', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to resend webhook', code: 'RESEND_WEBHOOK_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// NOVO: Listar logs de webhooks
async function getWebhookLogs(
  req: Request,
  partner: any, 
  supabaseAdmin: any, 
  startTime: number,
  rateLimitHeaders: Record<string, string>
) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Buscar pagamentos com webhook logs
    const { data: payments, error, count } = await supabaseAdmin
      .from('external_payments')
      .select('id, order_id, status, webhook_sent, webhook_sent_at, webhook_attempts, webhook_last_error, metadata, created_at', { count: 'exact' })
      .eq('partner_id', partner.id)
      .or('webhook_attempts.gt.0,webhook_sent.eq.true')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const webhookLogs = (payments || []).map((p: any) => ({
      paymentId: p.id,
      orderId: p.order_id,
      paymentStatus: p.status,
      webhookSent: p.webhook_sent,
      webhookSentAt: p.webhook_sent_at,
      attempts: p.webhook_attempts,
      lastError: p.webhook_last_error,
      lastEvent: p.metadata?.last_webhook_event,
      deliveryLogs: p.metadata?.webhook_logs || [],
    }));

    await logApiUsage(supabaseAdmin, partner.id, '/webhooks/logs', 'GET', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        data: webhookLogs,
        pagination: {
          total: count,
          limit,
          offset,
        },
        webhookUrl: partner.webhook_url,
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Get webhook logs error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/webhooks/logs', 'GET', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get webhook logs', code: 'GET_WEBHOOK_LOGS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper: Log de uso da API
async function logApiUsage(
  supabaseAdmin: any,
  partnerId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  req: Request | null
) {
  try {
    await supabaseAdmin.from('api_usage_logs').insert({
      partner_id: partnerId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      ip_address: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip'),
      user_agent: req?.headers.get('user-agent'),
    });
  } catch (error) {
    console.error('⚠️ Failed to log API usage:', error);
  }
}
