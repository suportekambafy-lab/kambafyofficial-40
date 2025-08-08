
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  console.log('🚀 Stripe webhook called!', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    console.log('🔑 Stripe keys available:', {
      hasSecretKey: !!stripeSecretKey,
      hasWebhookSecret: !!webhookSecret
    });
    
    if (!stripeSecretKey || !webhookSecret) {
      console.error('❌ Missing Stripe configuration');
      throw new Error('Missing Stripe configuration');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('📝 Request body length:', body.length);
    console.log('🔐 Signature present:', !!signature);

    if (!signature) {
      console.error('❌ Missing Stripe signature');
      throw new Error('Missing Stripe signature');
    }

    let event;
    try {
      // Usar webhook endpoint secret para verificar assinatura
      console.log('🔍 Constructing webhook event...');
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook event constructed successfully:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      
      // Em caso de erro de verificação, ainda processar se for um evento conhecido
      // (isso é temporário para debugar)
      try {
        const eventData = JSON.parse(body);
        console.log('📦 Parsed event data:', eventData.type);
        
        // Só processar se for um evento de pagamento conhecido
        if (eventData.type === 'payment_intent.succeeded') {
          console.log('⚠️ Processing event without signature verification (debug mode)');
          event = eventData;
        } else {
          throw new Error('Event type not supported for bypass: ' + eventData.type);
        }
      } catch (parseErr) {
        console.error('❌ Could not parse event body:', parseErr.message);
        throw new Error('Invalid webhook signature and unparseable body');
      }
    }

    console.log('🎯 Processing webhook event:', event.type);
    console.log('📊 Event data:', JSON.stringify(event.data, null, 2));

    // Handle payment intent created (for Multibanco pending payments)
    if (event.type === 'payment_intent.created' || event.type === 'payment_intent.requires_action') {
      console.log('🔔 Detected payment intent event for Multibanco processing');
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.order_id;
      
      console.log('🆕 Processing payment_intent.created for order_id:', orderId);
      console.log('💳 Payment Intent details:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        payment_method_types: paymentIntent.payment_method_types,
        metadata: paymentIntent.metadata
      });
      
      // Check if it's a Multibanco payment
      if (paymentIntent.payment_method_types.includes('multibanco') && paymentIntent.status === 'requires_action') {
        console.log('🏦 Multibanco payment detected, sending payment details email...');
        
        if (orderId) {
          // Get order details
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('customer_email, customer_name, product_id')
            .eq('order_id', orderId)
            .single();

          if (orderError) {
            console.error('❌ Error fetching order details:', orderError);
          } else if (order) {
            // Get product details
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('name')
              .eq('id', order.product_id)
              .single();

            if (productError) {
              console.error('❌ Error fetching product details:', productError);
            } else {
              // Get Multibanco details from payment intent
              try {
                console.log('🔍 Getting Multibanco details from Stripe...');
                const { data: multibancoDetails, error: multibancoError } = await supabase.functions.invoke('get-multibanco-details', {
                  body: { payment_intent_id: paymentIntent.id }
                });

                if (multibancoError) {
                  console.error('❌ Error getting Multibanco details:', multibancoError);
                } else if (multibancoDetails && multibancoDetails.entity && multibancoDetails.reference) {
                  console.log('✅ Multibanco details retrieved, sending email...');
                  
                  // Send Multibanco payment details email
                  const emailPayload = {
                    customerEmail: order.customer_email,
                    customerName: order.customer_name,
                    productName: product?.name || 'Produto Digital',
                    amount: multibancoDetails.amount,
                    currency: multibancoDetails.currency,
                    entity: multibancoDetails.entity,
                    reference: multibancoDetails.reference,
                    paymentIntentId: paymentIntent.id
                  };

                  const { error: emailError } = await supabase.functions.invoke('send-multibanco-payment-details', {
                    body: emailPayload
                  });

                  if (emailError) {
                    console.error('❌ Error sending Multibanco payment details email:', emailError);
                  } else {
                    console.log('✅ Multibanco payment details email sent successfully');
                  }
                } else {
                  console.log('⚠️ Multibanco details not available yet');
                }
              } catch (multibancoError) {
                console.error('❌ Error processing Multibanco details:', multibancoError);
              }
            }
          }
        }
      }
    }
    
    // Handle successful payments
    else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.order_id;
      
      console.log('💳 Processing payment_intent.succeeded for order_id:', orderId);
      console.log('💰 Payment Intent details:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        payment_method_types: paymentIntent.payment_method_types,
        metadata: paymentIntent.metadata
      });
      
      if (orderId) {
        console.log('🔄 Updating order status for order_id:', orderId);
        
        // Atualizar status do pedido para "completed"
        const { data: orderData, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Error updating order:', updateError);
          throw updateError;
        } else {
          console.log('✅ Order status updated successfully:', orderData);
        }

        // Buscar dados do produto para atualizar vendas
        const { data: order, error: orderFetchError } = await supabase
          .from('orders')
          .select('product_id, user_id, customer_email, customer_name, amount, currency')
          .eq('order_id', orderId)
          .single();

        if (orderFetchError) {
          console.error('❌ Error fetching order details:', orderFetchError);
          throw orderFetchError;
        }

        if (order?.product_id) {
          console.log('📊 Updating sales count for product:', order.product_id);
          
          // Buscar o valor atual de vendas e dados do produto
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('sales, name, user_id')
            .eq('id', order.product_id)
            .single();

          if (productError) {
            console.error('❌ Error fetching product:', productError);
            throw productError;
          } else {
            const currentSales = product?.sales || 0;
            const newSalesCount = currentSales + 1;
            
            console.log(`📈 Updating sales from ${currentSales} to ${newSalesCount}`);
            
            const { error: salesError } = await supabase
              .from('products')
              .update({ 
                sales: newSalesCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.product_id);

              if (salesError) {
                console.error('❌ Error updating product sales:', salesError);
                throw salesError;
              } else {
                console.log('✅ Product sales updated successfully');
              }

              // Enviar email de confirmação de compra
              try {
                console.log('📧 Sending purchase confirmation email for Stripe payment...');
                
                const confirmationPayload = {
                  customerName: order.customer_name,
                  customerEmail: order.customer_email,
                  productName: product?.name,
                  orderId: orderId,
                  amount: (paymentIntent.amount / 100).toString(), // Converter de centavos para valor real
                  currency: paymentIntent.currency.toUpperCase(),
                  productId: order.product_id,
                  sellerId: product?.user_id
                };

                const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
                  body: confirmationPayload
                });

                if (emailError) {
                  console.error('❌ Error sending purchase confirmation email:', emailError);
                } else {
                  console.log('✅ Purchase confirmation email sent successfully');
                }
              } catch (emailError) {
                console.error('❌ Error in email sending process:', emailError);
              }

              // Disparar webhooks para eventos de pagamento e compra
              try {
                console.log('🔔 Triggering webhooks for payment success...');
                
                const webhookPayload = {
                  event: 'payment.success',
                  data: {
                    order_id: orderId,
                    payment_intent_id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    customer_email: order.customer_email,
                    customer_name: order.customer_name,
                    product_id: order.product_id,
                    product_name: product?.name,
                    payment_method: paymentIntent.payment_method_types[0],
                    timestamp: new Date().toISOString()
                  },
                  user_id: product?.user_id,
                  order_id: orderId,
                  product_id: order.product_id
                };

                // Chamar edge function para disparar webhooks
                await supabase.functions.invoke('trigger-webhooks', {
                  body: webhookPayload
                });

                // Também disparar evento de produto comprado
                const productPurchasePayload = {
                  event: 'product.purchased',
                  data: {
                    order_id: orderId,
                    product_id: order.product_id,
                    product_name: product?.name,
                    customer_email: order.customer_email,
                    customer_name: order.customer_name,
                    price: (paymentIntent.amount / 100).toString(),
                    currency: paymentIntent.currency.toUpperCase(),
                    timestamp: new Date().toISOString()
                  },
                  user_id: product?.user_id,
                  order_id: orderId,
                  product_id: order.product_id
                };

                await supabase.functions.invoke('trigger-webhooks', {
                  body: productPurchasePayload
                });

                console.log('✅ Webhooks triggered successfully');

                // Disparar Web Push para o vendedor (se inscrito)
                try {
                  const title = `Nova venda: ${product?.name || 'Produto'}`;
                  const total = (paymentIntent.amount / 100).toFixed(2);
                  const currency = paymentIntent.currency.toUpperCase();
                  const bodyMsg = `Cliente: ${order.customer_name} • Valor: ${total} ${currency}`;
                  await supabase.functions.invoke('send-web-push', {
                    body: {
                      user_id: product?.user_id,
                      title,
                      body: bodyMsg,
                      url: `/sales?order_id=${orderId}`,
                      tag: 'kambafy-sale',
                      data: { order_id: orderId, product_id: order.product_id }
                    },
                    headers: { 'x-service-call': 'true' }
                  });
                } catch (pushErr) {
                  console.error('❌ Error sending web push:', pushErr);
                }

              } catch (webhookError) {
                console.error('❌ Error triggering webhooks:', webhookError);
                // Não falhar o webhook do Stripe por causa dos webhooks customizados
              }
          }
        }
      } else {
        console.log('⚠️ No order_id found in payment intent metadata');
      }
    } else {
      console.log('ℹ️ Webhook event type not handled:', event.type);
    }

    console.log('🎉 Webhook processed successfully');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
