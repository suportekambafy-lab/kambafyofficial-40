import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-CHAT-TOKENS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const {
      packageId,
      packageName,
      tokens,
      amount,
      currency,
      paymentMethod,
      mbwayPhone,
      successUrl,
      cancelUrl
    } = await req.json();

    logStep('Request received', { packageId, packageName, tokens, amount, currency, paymentMethod });

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { email: user.email });

    // For Stripe payments (PT, GB, US)
    if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us'].includes(paymentMethod)) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      
      if (!stripeKey) {
        logStep('ERROR: Stripe not configured');
        return new Response(JSON.stringify({ 
          error: 'Stripe não configurado. Entre em contato com o suporte.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });

      logStep('Stripe initialized');

      // Create or get customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string;
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep('Existing customer found', { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
        logStep('New customer created', { customerId });
      }

      // Map payment methods to Stripe payment method types
      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [];
      
      if (paymentMethod === 'card' || paymentMethod === 'card_uk' || paymentMethod === 'card_us') {
        paymentMethodTypes.push('card');
      } else if (paymentMethod === 'klarna' || paymentMethod === 'klarna_uk') {
        paymentMethodTypes.push('klarna');
      } else if (paymentMethod === 'multibanco') {
        paymentMethodTypes.push('multibanco');
      } else if (paymentMethod === 'mbway') {
        // MB Way needs to be handled differently - not supported in Checkout directly
        // Use card as fallback for now
        paymentMethodTypes.push('card');
      }

      logStep('Payment method types', { paymentMethodTypes });

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: paymentMethodTypes.length > 0 ? paymentMethodTypes : ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Chat Tokens: ${packageName}`,
                description: `${tokens.toLocaleString()} tokens para Chat IA`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: 'chat_tokens',
          package_id: packageId,
          tokens: tokens.toString(),
          user_id: user.id,
        },
      });

      logStep('Stripe session created', { sessionId: session.id, url: session.url });

      return new Response(JSON.stringify({ 
        url: session.url,
        sessionId: session.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For unsupported methods
    return new Response(JSON.stringify({ 
      error: `Método de pagamento ${paymentMethod} não suportado para tokens.`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('ERROR', { message: error instanceof Error ? error.message : 'Unknown error' });
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
