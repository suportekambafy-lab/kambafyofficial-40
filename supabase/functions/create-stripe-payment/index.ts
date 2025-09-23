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
    const { 
      amount, 
      currency, 
      productName, 
      customerEmail, 
      customerName,
      productId,
      orderId,
      hasCustomPrices = false
    } = await req.json();

    console.log('Creating Stripe payment for:', { 
      amount, 
      currency, 
      customerEmail, 
      productName,
      orderId,
      amountType: typeof amount,
      currencyType: typeof currency
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Converter amount para centavos baseado na moeda
    let amountInCents;
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    
    if (zeroDecimalCurrencies.includes(currency)) {
      // Moedas sem decimais (yen, won, etc.)
      amountInCents = Math.round(amount);
    } else {
      // Moedas com decimais (USD, EUR, ARS, etc.)
      amountInCents = Math.round(amount * 100);
    }

    console.log(`Amount converted: ${amount} ${currency} = ${amountInCents} cents`);

    // Verificar se cliente existe
    const customers = await stripe.customers.list({ 
      email: customerEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      // Criar novo cliente
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = customer.id;
      console.log('New customer created:', customerId);
    }

    console.log(`Final amount for Stripe: ${amountInCents} cents in ${currency.toLowerCase()}`);

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: productName,
              metadata: {
                product_id: productId,
                order_id: orderId,
              }
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/checkout/${productId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/${productId}`,
      metadata: {
        product_id: productId,
        order_id: orderId,
        customer_email: customerEmail,
        original_amount: amount.toString(), // Valor original antes da conversão para centavos
        original_currency: currency.toUpperCase(), // Moeda original
        has_custom_prices: hasCustomPrices.toString() // Indicar se usa preço personalizado
      },
      payment_intent_data: {
        metadata: {
          product_id: productId,
          order_id: orderId,
          customer_email: customerEmail,
          original_amount: amount.toString(), // Valor original antes da conversão para centavos
          original_currency: currency.toUpperCase(), // Moeda original
          has_custom_prices: hasCustomPrices.toString() // Indicar se usa preço personalizado
        }
      }
    });

    console.log('Checkout session created:', session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Stripe payment error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});