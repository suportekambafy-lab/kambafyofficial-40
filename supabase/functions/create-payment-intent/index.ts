import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
      upsellFrom,
      customerCountry
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

    // Try to find product by ID first, then by slug
    let product = null;
    let productError = null;
    
    // First try by ID (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(productId)) {
      const result = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      product = result.data;
      productError = result.error;
    }
    
    // If not found by ID, try by slug
    if (!product) {
      const result = await supabase
        .from('products')
        .select('*')
        .eq('slug', productId)
        .single();
      product = result.data;
      productError = result.error;
    }

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

    // Verificar se já existe ordem recente para evitar duplicação
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('order_id, id')
      .eq('customer_email', customerData.email)
      .eq('product_id', productId)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Últimos 5 minutos
      .order('created_at', { ascending: false })
      .limit(1);
    
    let orderId: string;
    
    if (!checkError && existingOrders && existingOrders.length > 0) {
      // Reutilizar order_id existente para evitar duplicação
      orderId = existingOrders[0].order_id;
      console.log('♻️ Reutilizando order_id existente:', orderId);
    } else {
      // Gerar novo order ID único
      orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log('🆕 Gerando novo order_id:', orderId);
    }

    let automaticPaymentMethods;
    let allowRedirects;

    if (paymentMethod === 'apple_pay') {
      automaticPaymentMethods = {
        enabled: true,
        allow_redirects: 'never'
      };
      allowRedirects = 'never';
    } else if (paymentMethod === 'klarna' || paymentMethod === 'klarna_uk') {
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
    } else if (paymentMethod === 'mbway') {
      automaticPaymentMethods = {
        enabled: true,
        allow_redirects: 'always'
      };
      allowRedirects = 'always';
    } else {
      // card, card_uk e outros
      automaticPaymentMethods = {
        enabled: true,
      };
      allowRedirects = 'never';
    }

    const paymentIntentData = {
      amount: amount,
      currency: currency,
      customer: customerId,
      description: product.name, // Nome do produto visível no Stripe Dashboard
      metadata: {
        productId,
        productName: product.name, // Nome do produto no metadata
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

    // ✅ MULTI-CURRENCY: salvar a venda na moeda original do pagamento (sem converter para KZ)
    const targetCurrencyUpper = (targetCurrency || '').toString().toUpperCase();
    const originalCurrencyUpper = (originalCurrency || '').toString().toUpperCase();
    const stripeCurrencyUpper = (currency || '').toString().toUpperCase();

    // Moeda de exibição/contabilização da venda (wallet)
    const saleCurrency = targetCurrencyUpper || stripeCurrencyUpper || originalCurrencyUpper || 'KZ';

    // Valor na moeda da venda
    let saleAmountNumber: number;

    // 1) Preferir o valor convertido para a moeda alvo (ex: EUR, MZN)
    if (targetCurrencyUpper && typeof convertedAmount === 'number' && convertedAmount > 0) {
      saleAmountNumber = convertedAmount;
      console.log(`💱 Venda em moeda alvo: ${saleAmountNumber} ${saleCurrency}`);
    }
    // 2) Se for KZ, usar o valor original do sistema
    else if (saleCurrency === 'KZ' && typeof originalAmount === 'number' && originalAmount > 0) {
      saleAmountNumber = originalAmount;
      console.log(`💰 Venda em KZ: ${saleAmountNumber} ${saleCurrency}`);
    }
    // 3) Fallback: usar o valor do Stripe (em unidades, não centavos)
    else {
      saleAmountNumber = amount / 100;
      console.log(`🧩 Fallback valor Stripe: ${saleAmountNumber} ${stripeCurrencyUpper} (registrando como ${saleCurrency})`);
    }

    const orderData = {
      product_id: productId,
      order_id: orderId,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      customer_country: customerCountry || null,

      // Campos atuais usados em várias telas
      amount: saleAmountNumber.toString(),
      currency: saleCurrency,

      // Campos de preservação (multi-moeda)
      original_amount: saleAmountNumber,
      original_currency: saleCurrency,

      payment_method: paymentMethod,
      status: orderStatus,
      user_id: product.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      // Stripe payments = 9.99% platform fee (seller gets 90.01%)
      seller_commission: saleAmountNumber * 0.9001
    };

    console.log('Saving order with corrected data:', orderData);

    // Verificar se já existe ordem com esse order_id para evitar duplicação
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    let orderError = null;
    if (existingOrder) {
      // Atualizar ordem existente
      const { error } = await supabase
        .from('orders')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          amount: orderData.amount,
          currency: orderData.currency,
          original_amount: orderData.original_amount,
          original_currency: orderData.original_currency,
          payment_method: paymentMethod,
          status: orderStatus,
          customer_country: customerCountry || null,
          seller_commission: orderData.seller_commission,
        })
        .eq('order_id', orderId);
      orderError = error;
      console.log('Order updated with ID:', orderId);
    } else {
      // Inserir nova ordem
      const { error } = await supabase
        .from('orders')
        .insert(orderData);
      orderError = error;
      console.log('Order inserted with ID:', orderId);
    }

    if (orderError) {
      console.error('Erro ao salvar ordem:', orderError);
    } else {
      console.log('Order saved/updated successfully with ID:', orderId);
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
