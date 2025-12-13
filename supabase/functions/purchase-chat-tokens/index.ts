import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      packageId,
      packageName,
      tokens,
      amount,
      currency,
      paymentMethod,
      successUrl,
      cancelUrl
    } = await req.json();

    console.log('Purchase chat tokens request:', { packageId, packageName, tokens, amount, currency, paymentMethod });

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

    console.log('User:', user.email);

    // For Stripe payments (PT, GB, US)
    if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us'].includes(paymentMethod)) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      
      if (!stripeKey) {
        throw new Error('Stripe not configured');
      }

      const stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });

      // Create or get customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string;
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
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
        // MB Way is not directly supported in Stripe Checkout - use card
        paymentMethodTypes.push('card');
      }

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

      console.log('Stripe session created:', session.id);

      return new Response(JSON.stringify({ 
        url: session.url,
        sessionId: session.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For AppyPay payments (Angola)
    if (['express', 'reference'].includes(paymentMethod)) {
      const appyPayApiKey = Deno.env.get('APPYPAY_API_KEY');
      
      if (!appyPayApiKey) {
        // Fallback: Create pending order and return instructions
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Generate order ID
        const orderId = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Log the pending purchase
        await supabaseAdmin
          .from('chat_token_transactions')
          .insert({
            user_id: user.id,
            type: 'pending_purchase',
            tokens: tokens,
            balance_after: 0,
            package_id: packageId,
            description: `Compra pendente: ${packageName} - ${orderId}`,
            metadata: {
              order_id: orderId,
              payment_method: paymentMethod,
              amount: amount,
              currency: currency
            }
          });

        return new Response(JSON.stringify({ 
          pending: true,
          orderId,
          message: paymentMethod === 'express' 
            ? 'Pagamento via Multicaixa Express. Após confirmar, os tokens serão creditados automaticamente.'
            : 'Pagamento por referência gerado. Os tokens serão creditados após confirmação.',
          instructions: paymentMethod === 'reference' 
            ? `Use a referência ${orderId} para efectuar o pagamento.`
            : null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // TODO: Implement AppyPay integration when API key is available
      return new Response(JSON.stringify({ 
        error: 'AppyPay integration pending',
        pending: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For other methods (M-Pesa, e-Mola, transfer)
    return new Response(JSON.stringify({ 
      pending: true,
      message: `Pagamento via ${paymentMethod}. Entre em contato com o suporte para finalizar a compra.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
