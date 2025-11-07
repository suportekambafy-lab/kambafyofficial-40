import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { productId, customerEmail, customerName, cohortId } = await req.json();
    logStep('Request data', { productId, customerEmail, cohortId });

    if (!productId || !customerEmail) {
      throw new Error('Missing required fields: productId, customerEmail');
    }

    // Buscar produto e configuração de assinatura
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*, subscription_config')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    logStep('Product found', { 
      productName: product.name, 
      hasSubscriptionConfig: !!product.subscription_config 
    });

    if (!product.subscription_config?.stripe_price_id) {
      throw new Error('Product does not have subscription configuration');
    }

    const subscriptionConfig = product.subscription_config;
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Verificar/criar cliente Stripe
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Existing customer found', { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = newCustomer.id;
      logStep('New customer created', { customerId });
    }

    // Criar sessão de checkout
    const sessionConfig: any = {
      customer: customerId,
      line_items: [
        {
          price: subscriptionConfig.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      metadata: {
        product_id: productId,
        seller_user_id: product.user_id,
        customer_email: customerEmail,
        customer_name: customerName || '',
        cohort_id: cohortId || '',
      },
    };

    // Adicionar trial se configurado
    if (subscriptionConfig.trial_days && subscriptionConfig.trial_days > 0) {
      sessionConfig.subscription_data = {
        trial_period_days: subscriptionConfig.trial_days,
      };
      logStep('Trial period configured', { days: subscriptionConfig.trial_days });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep('Checkout session created', { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep('ERROR', { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
