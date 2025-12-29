import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔔 Stripe Partner Webhook received');

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_PARTNER_WEBHOOK_SECRET') || Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    // Verificar assinatura se webhook secret estiver configurado
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
        console.log('✅ Webhook signature verified');
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Sem verificação de assinatura (modo dev)
      console.warn('⚠️ No webhook secret configured, skipping signature verification');
      event = JSON.parse(body);
    }

    console.log(`📧 Event type: ${event.type}`);

    // Inicializar Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar eventos relevantes
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('🎯 Checkout session completed:', session.id);
      console.log('📦 Session metadata:', session.metadata);

      // Verificar se é um pagamento de parceiro
      const externalPaymentId = session.metadata?.external_payment_id;
      const partnerId = session.metadata?.partner_id;

      if (!externalPaymentId || !partnerId) {
        console.log('ℹ️ Not a partner payment, skipping');
        return new Response(
          JSON.stringify({ received: true, message: 'Not a partner payment' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🔗 Partner payment detected: ${externalPaymentId}`);

      // Buscar pagamento externo
      const { data: externalPayment, error: fetchError } = await supabaseAdmin
        .from('external_payments')
        .select('*')
        .eq('id', externalPaymentId)
        .eq('partner_id', partnerId)
        .single();

      if (fetchError || !externalPayment) {
        console.error('❌ External payment not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'External payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se já foi processado
      if (externalPayment.status === 'completed') {
        console.log('ℹ️ Payment already completed, skipping');
        return new Response(
          JSON.stringify({ received: true, message: 'Already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar pagamento para completed
      const { error: updateError } = await supabaseAdmin
        .from('external_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          card_payment_intent_id: session.payment_intent as string,
          metadata: {
            ...externalPayment.metadata,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            stripe_customer: session.customer,
            completed_via: 'stripe_partner_webhook',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', externalPaymentId);

      if (updateError) {
        console.error('❌ Failed to update payment:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Payment marked as completed');

      // Disparar webhook para o parceiro
      try {
        console.log('📤 Triggering partner webhook');
        await supabaseAdmin.functions.invoke('process-partner-webhook', {
          body: { 
            paymentId: externalPaymentId, 
            event: 'payment.completed' 
          }
        });
        console.log('✅ Partner webhook triggered');
      } catch (webhookError: any) {
        console.error('⚠️ Failed to trigger partner webhook:', webhookError.message);
        // Não falhar a resposta por causa do webhook
      }

      return new Response(
        JSON.stringify({ received: true, status: 'completed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Evento de pagamento falhou
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      let externalPaymentId: string | undefined;
      let partnerId: string | undefined;

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        externalPaymentId = session.metadata?.external_payment_id;
        partnerId = session.metadata?.partner_id;
      } else {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        externalPaymentId = paymentIntent.metadata?.external_payment_id;
        partnerId = paymentIntent.metadata?.partner_id;
      }

      if (!externalPaymentId || !partnerId) {
        console.log('ℹ️ Not a partner payment, skipping');
        return new Response(
          JSON.stringify({ received: true, message: 'Not a partner payment' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newStatus = event.type === 'checkout.session.expired' ? 'expired' : 'failed';

      // Atualizar status
      const { error: updateError } = await supabaseAdmin
        .from('external_payments')
        .update({
          status: newStatus,
          metadata: {
            stripe_event: event.type,
            failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', externalPaymentId)
        .eq('partner_id', partnerId);

      if (updateError) {
        console.error('❌ Failed to update payment:', updateError);
      }

      // Disparar webhook para o parceiro
      try {
        await supabaseAdmin.functions.invoke('process-partner-webhook', {
          body: { 
            paymentId: externalPaymentId, 
            event: `payment.${newStatus}` 
          }
        });
      } catch (webhookError: any) {
        console.error('⚠️ Failed to trigger partner webhook:', webhookError.message);
      }

      return new Response(
        JSON.stringify({ received: true, status: newStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Outros eventos - apenas confirmar recebimento
    console.log(`ℹ️ Unhandled event type: ${event.type}`);
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
