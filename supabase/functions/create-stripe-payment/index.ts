import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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
      hasCustomPrices = false,
      paymentMethod,
      mbwayPhone
    } = await req.json();

    console.log('Creating Stripe payment for:', { 
      amount, 
      currency, 
      customerEmail, 
      productName,
      orderId,
      paymentMethod,
      amountType: typeof amount,
      currencyType: typeof currency
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Converter amount para centavos baseado na moeda
    let amountInCents;
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    
    if (zeroDecimalCurrencies.includes(currency?.toUpperCase())) {
      amountInCents = Math.round(amount);
    } else {
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
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = customer.id;
      console.log('New customer created:', customerId);
    }

    console.log(`Final amount for Stripe: ${amountInCents} cents in ${currency?.toLowerCase()}`);

    const origin = req.headers.get("origin") || "https://kambafy.com";

    // Configurar payment method types baseado na seleção
    let paymentMethodTypes: string[] = ['card'];
    
    if (paymentMethod === 'multibanco') {
      paymentMethodTypes = ['multibanco'];
    } else if (paymentMethod === 'mbway') {
      paymentMethodTypes = ['card']; // MBWay usa Payment Intent separado
    } else if (paymentMethod === 'klarna' || paymentMethod === 'klarna_uk') {
      paymentMethodTypes = ['klarna'];
    } else if (paymentMethod === 'card' || paymentMethod === 'card_uk' || paymentMethod === 'card_us') {
      paymentMethodTypes = ['card'];
    }

    console.log(`Payment method types: ${paymentMethodTypes.join(', ')}`);

    // Para MBWay, criar Payment Intent diretamente
    if (paymentMethod === 'mbway' && mbwayPhone) {
      console.log('Creating MBWay payment for phone:', mbwayPhone);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          product_id: productId || '',
          product_name: productName,
          order_id: orderId || '',
          customer_email: customerEmail,
          payment_method: 'mbway',
          mbway_phone: mbwayPhone
        }
      });

      // MBWay não é suportado diretamente pelo Stripe - usar checkout com cartão
      console.log('MBWay not directly supported, falling back to card checkout');
    }

    // Calcular expires_at
    const isMultibanco = paymentMethod === 'multibanco';
    const expirationMinutes = isMultibanco ? (5 * 24 * 60) : 30;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
    
    console.log(`Expiration set: ${isMultibanco ? '5 days' : '30 minutes'} for ${paymentMethod}`);

    // Configurar success e cancel URLs
    let successUrl = `${origin}/vendedor/apps?purchase=success`;
    let cancelUrl = `${origin}/vendedor/apps?purchase=cancelled`;
    
    if (productId && !productId.startsWith('chat-tokens')) {
      successUrl = `${origin}/checkout/${productId}/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/checkout/${productId}`;
    }

    // Criar sessão de checkout
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [
        {
          price_data: {
            currency: (currency || 'eur').toLowerCase(),
            product_data: {
              name: productName,
              metadata: {
                product_id: productId || '',
                order_id: orderId || '',
              }
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_id: productId || '',
        product_name: productName,
        order_id: orderId || '',
        customer_email: customerEmail,
        original_amount: amount.toString(),
        original_currency: (currency || 'EUR').toUpperCase(),
        has_custom_prices: hasCustomPrices.toString(),
        expires_at: expiresAt,
        payment_method: paymentMethod || 'card'
      },
      payment_intent_data: {
        metadata: {
          product_id: productId || '',
          product_name: productName,
          order_id: orderId || '',
          customer_email: customerEmail,
          original_amount: amount.toString(),
          original_currency: (currency || 'EUR').toUpperCase(),
          has_custom_prices: hasCustomPrices.toString(),
          expires_at: expiresAt,
          payment_method: paymentMethod || 'card'
        }
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', session.id, 'URL:', session.url);

    if (!session.url) {
      throw new Error('Stripe não retornou URL do checkout');
    }

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
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
