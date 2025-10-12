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
      .eq('slug', productId)
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
    
    // CORREÇÃO CRÍTICA: Converter valores corretamente para KZ antes de salvar no banco
    // Taxas de conversão para KZ (alinhadas com useGeoLocation)
    const exchangeRates: Record<string, number> = {
      'EUR': 1100, // 1 EUR = ~1100 KZ (atualizado)
      'MZN': 14.3, // 1 MZN = ~14.3 KZ  
      'USD': 825   // 1 USD = ~825 KZ
    };
    
    let finalAmount: string;
    let finalCurrency: string = 'KZ'; // SEMPRE KZ no banco
    
    console.log('🔍 PAYMENT INTENT - DADOS DE ENTRADA:', {
      originalAmount,
      originalCurrency,
      convertedAmount,
      targetCurrency,
      stripeAmount: amount,
      stripeCurrency: currency
    });
    
    // LÓGICA CORRIGIDA - PRIORIDADE PARA CONVERSÃO DE MOEDA ESTRANGEIRA:
    // 1. PRIMEIRA PRIORIDADE: Se há targetCurrency diferente de KZ E convertedAmount, usar conversão
    if (targetCurrency && targetCurrency !== 'KZ' && convertedAmount && convertedAmount > 0) {
      // Cliente está pagando em moeda estrangeira (EUR, MZN, USD) - CONVERTER PARA KZ
      const rate = exchangeRates[targetCurrency] || 1;
      const convertedValueToKZ = Math.round(convertedAmount * rate);
      finalAmount = convertedValueToKZ.toString();
      console.log(`💱 PAGAMENTO EM MOEDA ESTRANGEIRA: ${convertedAmount} ${targetCurrency} → ${finalAmount} KZ (taxa: ${rate})`);
    } 
    // 2. SEGUNDA PRIORIDADE: Cliente está pagando direto em KZ
    else if (originalCurrency === 'KZ' && originalAmount && (!targetCurrency || targetCurrency === 'KZ')) {
      finalAmount = originalAmount.toString();
      console.log(`💰 PAGAMENTO DIRETO EM KZ: ${finalAmount} KZ`);
    }
    // 3. FALLBACK: converter do amount do Stripe para KZ
    else {
      const stripeAmount = amount / 100; // Converter de centavos
      const stripeCurrency = currency.toUpperCase();
      const rate = exchangeRates[stripeCurrency] || 1;
      const convertedValue = Math.round(stripeAmount * rate);
      finalAmount = convertedValue.toString();
      console.log(`💱 FALLBACK - Convertendo: ${stripeAmount} ${stripeCurrency} → ${finalAmount} KZ (taxa: ${rate})`);
    }
    
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
      stripe_payment_intent_id: paymentIntent.id,
      // Popular seller_commission com 8% de taxa descontado
      seller_commission: parseFloat(finalAmount) * 0.92 // 8% platform fee
    };

    console.log('Saving order with corrected data:', orderData);

    // Usar upsert para evitar duplicação - atualizar se já existe
    const { error: orderError } = await supabase
      .from('orders')
      .upsert(orderData, {
        onConflict: 'order_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

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
