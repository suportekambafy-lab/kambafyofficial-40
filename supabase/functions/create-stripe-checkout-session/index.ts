import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const { 
      amount, 
      currency, 
      productId, 
      productName,
      customerData,
      paymentMethod 
    } = await req.json();

    console.log('Creating Stripe Checkout Session:', {
      amount,
      currency,
      productId,
      paymentMethod,
      customerName: customerData?.name
    });

    const origin = req.headers.get("origin") || "https://kambafy.com";
    
    // Configurar payment method types baseado na seleção
    let paymentMethodTypes = ['card'];
    if (paymentMethod === 'apple_pay') {
      paymentMethodTypes = ['card']; // Apple Pay é automaticamente habilitado quando disponível
    } else if (paymentMethod === 'klarna') {
      paymentMethodTypes = ['klarna'];
    } else if (paymentMethod === 'multibanco') {
      paymentMethodTypes = ['multibanco'];
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: productName || 'Produto Digital',
            },
            unit_amount: Math.round(amount * 100), // Converter para centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}&product_id=${productId}`,
      cancel_url: `${origin}/checkout/${productId}`,
      customer_email: customerData?.email,
      metadata: {
        product_id: productId,
        customer_name: customerData?.name,
        customer_phone: customerData?.phone,
        payment_method: paymentMethod,
      },
    };

    console.log('Session params:', JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('✅ Checkout Session created:', session.id);
    console.log('🔗 Session URL:', session.url);

    if (!session.url) {
      console.error('❌ No URL in session:', session);
      throw new Error('Stripe não retornou URL do checkout');
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
