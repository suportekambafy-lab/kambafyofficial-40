import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { 
      amount, 
      currency, 
      productId, 
      customerData, 
      originalAmount, 
      originalCurrency, 
      convertedAmount,
      targetCurrency,
      paymentMethod = 'card',
      testMode,
      upsellFrom
    } = requestBody;

    if (!amount || !currency || !productId || !customerData) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    console.log('Creating payment intent:', {
      amount: amount,
      currency: currency,
      productId: productId,
      originalAmount: originalAmount,
      originalCurrency: originalCurrency,
      convertedAmount: convertedAmount,
      targetCurrency: targetCurrency,
      paymentMethod: paymentMethod,
      testMode: testMode || false
    });

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }

    console.log('Using Stripe production key that starts with:', stripeSecretKey.substring(0, 7));

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      throw new Error('Produto não encontrado');
    }

    console.log('Product found:', product.name);

    let customerId;
    try {
      const customers = await stripe.customers.list({ 
        email: customerData.email, 
        limit: 1 
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('Found existing customer:', customerId);
      } else {
        const customer = await stripe.customers.create({
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
        });
        customerId = customer.id;
        console.log('Created new customer:', customerId);
      }
    } catch (customerError) {
      console.error('Error handling customer:', customerError);
      throw new Error('Erro ao processar cliente');
    }

    // Gerar order ID único
    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Verificar se é um upsell de outro pedido

    let automaticPaymentMethods;
    let allowRedirects;

    if (paymentMethod === 'apple_pay') {
      automaticPaymentMethods = {
        enabled: true,
        allow_redirects: 'never'
      };
      allowRedirects = 'never';
    } else if (paymentMethod === 'klarna') {
      automaticPaymentMethods = {
        enabled: true,
        allow_redirects: 'always'
      };
      allowRedirects = 'always';
    } else if (paymentMethod === 'multibanco') {
      automaticPaymentMethods = {
        enabled: true,
        allow_redirects: 'always'
      };
      allowRedirects = 'always';
    } else {
      automaticPaymentMethods = {
        enabled: true,
      };
      allowRedirects = 'never';
    }

    const paymentIntentData = {
      amount: amount,
      currency: currency,
      customer: customerId,
      metadata: {
        productId,
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        originalAmount: originalAmount?.toString() || '',
        originalCurrency: originalCurrency || 'KZ',
        convertedAmount: convertedAmount?.toString() || '',
        targetCurrency: targetCurrency || '',
        paymentMethod: paymentMethod,
        testMode: testMode ? 'true' : 'false',
        order_id: orderId,
        upsell_from: upsellFrom || ''
      },
      automatic_payment_methods: automaticPaymentMethods,
    };

    if (allowRedirects === 'always') {
      paymentIntentData.automatic_payment_methods.allow_redirects = 'always';
    }

    console.log('Creating payment intent with converted amount:', paymentIntentData);

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    console.log('Payment intent created successfully:', {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ? 'present' : 'missing',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

    // Salvar ordem no banco com status "pending" para todos os métodos Stripe
    const orderStatus = 'pending';
    
    // CORREÇÃO CRÍTICA: Vendedor SEMPRE deve ver o valor original em KZ que ele definiu
    // independente de como o cliente pagou (EUR, USD, etc.)
    const finalAmount = (originalAmount || (amount / 100)).toString();
    const finalCurrency = (originalCurrency || 'KZ');
    
    const orderData = {
      product_id: productId,
      order_id: orderId,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      amount: finalAmount,
      currency: finalCurrency,
      payment_method: paymentMethod,
      status: orderStatus,
      user_id: product.user_id,
      stripe_payment_intent_id: paymentIntent.id
    };

    console.log('Saving order with corrected data:', orderData);

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) {
      console.error('Erro ao salvar ordem:', orderError);
    } else {
      console.log('Order saved successfully with ID:', orderId);
    }

    const response = {
      client_secret: paymentIntent.client_secret,
      order_id: orderId,
      payment_intent_id: paymentIntent.id
    };

    console.log('Returning response with client_secret:', response.client_secret ? 'present' : 'missing');

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na criação do Payment Intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
