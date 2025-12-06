import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_COMMISSION_RATE = 0.0899; // 8.99%

serve(async (req) => {
  console.log('🔄 Recover Stripe Payments called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { payment_intent_id, product_id, days_back = 7 } = body;

    const results = {
      recovered: [] as any[],
      already_exists: [] as any[],
      errors: [] as any[],
    };

    // Se um payment_intent_id específico foi fornecido, recuperar apenas esse
    if (payment_intent_id) {
      console.log('🎯 Recovering specific payment intent:', payment_intent_id);
      
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      console.log('📦 Payment Intent:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata
      });

      if (paymentIntent.status === 'succeeded') {
        const result = await recoverPayment(supabase, stripe, paymentIntent, product_id);
        if (result.success) {
          results.recovered.push(result);
        } else if (result.already_exists) {
          results.already_exists.push(result);
        } else {
          results.errors.push(result);
        }
      } else {
        results.errors.push({
          payment_intent_id,
          error: `Payment not succeeded. Status: ${paymentIntent.status}`
        });
      }
    } else {
      // Buscar todos os pagamentos bem-sucedidos dos últimos X dias
      console.log(`🔍 Searching for successful payments in the last ${days_back} days...`);
      
      const startDate = Math.floor(Date.now() / 1000) - (days_back * 24 * 60 * 60);
      
      const paymentIntents = await stripe.paymentIntents.list({
        created: { gte: startDate },
        limit: 100,
      });

      console.log(`📊 Found ${paymentIntents.data.length} payment intents`);

      for (const pi of paymentIntents.data) {
        if (pi.status === 'succeeded') {
          const result = await recoverPayment(supabase, stripe, pi, null);
          if (result.success) {
            results.recovered.push(result);
          } else if (result.already_exists) {
            results.already_exists.push(result);
          } else {
            results.errors.push(result);
          }
        }
      }
    }

    console.log('✅ Recovery complete:', {
      recovered: results.recovered.length,
      already_exists: results.already_exists.length,
      errors: results.errors.length
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function recoverPayment(
  supabase: any, 
  stripe: any, 
  paymentIntent: any,
  overrideProductId: string | null
): Promise<any> {
  const orderId = paymentIntent.metadata?.order_id;
  const productId = overrideProductId || paymentIntent.metadata?.product_id;
  
  console.log('🔄 Processing payment:', {
    pi_id: paymentIntent.id,
    order_id: orderId,
    product_id: productId,
    amount: paymentIntent.amount
  });

  // Verificar se já existe uma ordem com este payment_intent_id
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, order_id, status')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  if (existingOrder) {
    console.log('⚠️ Order already exists for this payment intent:', existingOrder.order_id);
    
    // Se existe mas está pendente, atualizar para paid
    if (existingOrder.status !== 'paid') {
      await updateOrderToPaid(supabase, existingOrder.id, paymentIntent);
      return {
        success: true,
        payment_intent_id: paymentIntent.id,
        order_id: existingOrder.order_id,
        action: 'updated_to_paid'
      };
    }
    
    return {
      already_exists: true,
      payment_intent_id: paymentIntent.id,
      order_id: existingOrder.order_id
    };
  }

  // Verificar por order_id se existir no metadata
  if (orderId) {
    const { data: orderByOrderId } = await supabase
      .from('orders')
      .select('id, order_id, status, stripe_payment_intent_id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderByOrderId) {
      console.log('📌 Found order by order_id:', orderByOrderId);
      
      // Atualizar com payment_intent_id e status
      if (orderByOrderId.status !== 'paid' || !orderByOrderId.stripe_payment_intent_id) {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderByOrderId.id);
        
        // Processar saldo do vendedor
        await processSellerBalance(supabase, orderByOrderId.id, paymentIntent);
        
        return {
          success: true,
          payment_intent_id: paymentIntent.id,
          order_id: orderId,
          action: 'updated_existing_order'
        };
      }
      
      return {
        already_exists: true,
        payment_intent_id: paymentIntent.id,
        order_id: orderId
      };
    }
  }

  // Se não encontrou ordem, criar uma nova
  if (!productId) {
    console.log('❌ No product_id available to create order');
    return {
      success: false,
      payment_intent_id: paymentIntent.id,
      error: 'No product_id in metadata and no override provided'
    };
  }

  // Buscar informações do produto
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, user_id, price, currency')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    console.log('❌ Product not found:', productId);
    return {
      success: false,
      payment_intent_id: paymentIntent.id,
      error: `Product not found: ${productId}`
    };
  }

  // Extrair informações do cliente do Stripe
  let customerEmail = paymentIntent.metadata?.customer_email || paymentIntent.receipt_email;
  let customerName = paymentIntent.metadata?.customer_name || 'Cliente Stripe';

  // Se tiver customer_id, buscar mais informações
  if (paymentIntent.customer && !customerEmail) {
    try {
      const customer = await stripe.customers.retrieve(paymentIntent.customer);
      customerEmail = customer.email || customerEmail;
      customerName = customer.name || customerName;
    } catch (e) {
      console.log('⚠️ Could not retrieve customer details');
    }
  }

  if (!customerEmail) {
    console.log('❌ No customer email available');
    return {
      success: false,
      payment_intent_id: paymentIntent.id,
      error: 'No customer email available'
    };
  }

  // Criar nova ordem
  const amount = paymentIntent.amount / 100;
  const currency = paymentIntent.currency?.toUpperCase() || 'EUR';
  const sellerCommission = amount * (1 - PLATFORM_COMMISSION_RATE);
  const newOrderId = orderId || `STRIPE-${Date.now()}`;

  // Detectar método de pagamento
  let paymentMethod = 'stripe';
  if (paymentIntent.payment_method_types?.includes('multibanco')) {
    paymentMethod = 'multibanco';
  } else if (paymentIntent.payment_method_types?.includes('card')) {
    paymentMethod = paymentIntent.metadata?.payment_method || 'stripe';
  }

  const { data: newOrder, error: insertError } = await supabase
    .from('orders')
    .insert({
      product_id: productId,
      order_id: newOrderId,
      customer_email: customerEmail,
      customer_name: customerName,
      amount: amount.toString(),
      currency: currency,
      status: 'paid',
      payment_method: paymentMethod,
      stripe_payment_intent_id: paymentIntent.id,
      user_id: product.user_id,
      seller_commission: sellerCommission,
      created_at: new Date(paymentIntent.created * 1000).toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error creating order:', insertError);
    return {
      success: false,
      payment_intent_id: paymentIntent.id,
      error: insertError.message
    };
  }

  console.log('✅ Order created:', newOrder.order_id);

  // Adicionar saldo ao vendedor
  await processSellerBalance(supabase, newOrder.id, paymentIntent);

  // Enviar confirmação de compra
  try {
    await supabase.functions.invoke('send-purchase-confirmation', {
      body: {
        orderId: newOrder.order_id,
        customerEmail: customerEmail,
        customerName: customerName,
        productName: product.name,
        amount: amount,
        currency: currency
      }
    });
    console.log('📧 Purchase confirmation sent');
  } catch (e) {
    console.log('⚠️ Could not send purchase confirmation');
  }

  return {
    success: true,
    payment_intent_id: paymentIntent.id,
    order_id: newOrder.order_id,
    action: 'created_new_order',
    amount: amount,
    currency: currency
  };
}

async function updateOrderToPaid(supabase: any, orderId: string, paymentIntent: any) {
  const amount = paymentIntent.amount / 100;
  const sellerCommission = amount * (1 - PLATFORM_COMMISSION_RATE);

  await supabase
    .from('orders')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      seller_commission: sellerCommission,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  await processSellerBalance(supabase, orderId, paymentIntent);
}

async function processSellerBalance(supabase: any, orderId: string, paymentIntent: any) {
  // Buscar ordem com produto
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, products!inner(user_id, name)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.log('⚠️ Could not find order for balance processing');
    return;
  }

  const sellerUserId = order.products.user_id;
  if (!sellerUserId) {
    console.log('⚠️ No seller user_id found');
    return;
  }

  // Verificar se já existe transação de saldo para esta ordem
  const { data: existingTx } = await supabase
    .from('balance_transactions')
    .select('id')
    .eq('order_id', order.order_id)
    .eq('type', 'sale')
    .maybeSingle();

  if (existingTx) {
    console.log('⚠️ Balance transaction already exists for this order');
    return;
  }

  const amount = paymentIntent.amount / 100;
  const sellerCommission = amount * (1 - PLATFORM_COMMISSION_RATE);

  // Adicionar saldo ao vendedor
  await supabase.from('balance_transactions').insert({
    user_id: sellerUserId,
    type: 'sale',
    amount: sellerCommission,
    currency: paymentIntent.currency?.toUpperCase() || 'EUR',
    description: `Venda - ${order.products.name}`,
    order_id: order.order_id
  });

  console.log('💰 Seller balance updated:', {
    seller_id: sellerUserId,
    amount: sellerCommission
  });
}
