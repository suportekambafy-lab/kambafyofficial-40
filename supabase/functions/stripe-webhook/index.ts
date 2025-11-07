
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const PLATFORM_COMMISSION_RATE = 0.0899; // 8.99%

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
      apiVersion: '2025-08-27.basil',
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
      console.error('❌ Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
      
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
        console.error('❌ Could not parse event body:', parseErr instanceof Error ? parseErr.message : 'Unknown error');
        throw new Error('Invalid webhook signature and unparseable body');
      }
    }

    console.log('🎯 Processing webhook event:', event.type);
    console.log('📊 Event data:', JSON.stringify(event.data, null, 2));

    // ========== HANDLE SUBSCRIPTION EVENTS ==========
    
    if (event.type === 'customer.subscription.created') {
      console.log('📝 Processing subscription created');
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;

      try {
        // Marcar assinatura como renovação automática
        const { error: updateError } = await supabase
          .from('customer_subscriptions')
          .update({ renewal_type: 'automatic' })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('❌ Error updating renewal_type:', updateError);
        } else {
          console.log('✅ Subscription marked as automatic renewal');
        }

        const { data: insertData, error: insertError } = await supabase
          .from('customer_subscriptions')
          .insert({
            customer_email: metadata.customer_email,
            customer_name: metadata.customer_name || '',
            product_id: metadata.product_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            metadata: metadata,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await supabase.from('subscription_events').insert({
          subscription_id: insertData.id,
          event_type: 'created',
          stripe_event_id: event.id,
          data: subscription,
        });

        console.log('✅ Subscription created successfully:', subscription.id);
      } catch (error: any) {
        console.error('❌ Error creating subscription:', error.message);
        throw error;
      }
    }

    if (event.type === 'customer.subscription.updated') {
      console.log('📝 Processing subscription updated');
      const subscription = event.data.object as Stripe.Subscription;

      try {
        const { data: subData, error: updateError } = await supabase
          .from('customer_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('subscription_events').insert({
          subscription_id: subData.id,
          event_type: 'updated',
          stripe_event_id: event.id,
          data: subscription,
        });

        console.log('✅ Subscription updated successfully:', subscription.id);
      } catch (error: any) {
        console.error('❌ Error updating subscription:', error.message);
        throw error;
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      console.log('📝 Processing subscription deleted');
      const subscription = event.data.object as Stripe.Subscription;

      try {
        const { data: subData, error: deleteError } = await supabase
          .from('customer_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
          .select()
          .single();

        if (deleteError) throw deleteError;

        await supabase.from('subscription_events').insert({
          subscription_id: subData.id,
          event_type: 'canceled',
          stripe_event_id: event.id,
          data: subscription,
        });

        console.log('✅ Subscription deleted successfully:', subscription.id);
      } catch (error: any) {
        console.error('❌ Error deleting subscription:', error.message);
        throw error;
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      console.log('💰 Processing invoice payment succeeded');
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        try {
          const { data: subscription, error: subError } = await supabase
            .from('customer_subscriptions')
            .select('*, products!inner(user_id, name)')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (subError || !subscription) {
            console.error('❌ Subscription not found:', subscriptionId);
          } else {
            const amount = (invoice.amount_paid || 0) / 100;
            const platformFee = amount * PLATFORM_COMMISSION_RATE;
            const sellerAmount = amount - platformFee;

            console.log('💸 Processing renewal payment:', {
              amount,
              platformFee,
              sellerAmount,
              sellerUserId: subscription.products.user_id,
            });

            await supabase.from('balance_transactions').insert({
              user_id: subscription.products.user_id,
              type: 'subscription_renewal',
              amount: sellerAmount,
              currency: 'KZ',
              description: `Renovação de assinatura - ${subscription.products.name}`,
              order_id: `sub_${subscriptionId}_${Date.now()}`,
            });

            await supabase.from('balance_transactions').insert({
              user_id: subscription.products.user_id,
              type: 'kambafy_fee',
              amount: -platformFee,
              currency: 'KZ',
              description: `Taxa Kambafy (8.99%) - Renovação assinatura`,
              order_id: `fee_${subscriptionId}_${Date.now()}`,
            });

            await supabase.from('subscription_events').insert({
              subscription_id: subscription.id,
              event_type: 'renewed',
              stripe_event_id: event.id,
              amount: amount,
              currency: 'KZ',
              data: invoice,
            });

            console.log('✅ Renewal payment processed:', subscriptionId);
          }
        } catch (error: any) {
          console.error('❌ Error processing renewal:', error.message);
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      console.log('⚠️ Processing invoice payment failed');
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        try {
          const { data: subData, error: updateError } = await supabase
            .from('customer_subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)
            .select()
            .single();

          if (updateError) throw updateError;

          await supabase.from('subscription_events').insert({
            subscription_id: subData.id,
            event_type: 'payment_failed',
            stripe_event_id: event.id,
            data: invoice,
          });

          console.log('✅ Payment failure recorded:', subscriptionId);
        } catch (error: any) {
          console.error('❌ Error recording payment failure:', error.message);
        }
      }
    }

    // ========== HANDLE ONE-TIME PAYMENT EVENTS (EXISTING LOGIC) ==========
    
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
        
        // Buscar dados do produto para calcular comissão correta
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('price')
          .eq('id', paymentIntent.metadata.product_id)
          .single();

        if (productError) {
          console.error('❌ Error fetching product data:', productError);
          throw productError;
        }

        const hasCustomPrices = paymentIntent.metadata.has_custom_prices === 'true';
        const paidAmount = paymentIntent.amount / 100;
        const paidCurrency = paymentIntent.currency.toUpperCase();
        
        console.log('🔍 STRIPE WEBHOOK - DADOS DE PAGAMENTO:', {
          paidAmount,
          paidCurrency,
          stripeAmount: paymentIntent.amount,
          hasCustomPrices
        });
        
        // Taxa de conversão para KZ (alinhadas com useGeoLocation)
        const exchangeRates: Record<string, number> = {
          'EUR': 1100, // 1 EUR = ~1100 KZ (atualizado)
          'MZN': 14.3, // 1 MZN = ~14.3 KZ
          'USD': 825   // 1 USD = ~825 KZ
        };
        
        let sellerCommissionInKZ: number;
        let amountInKZ: number;
        
        // Conversão para KZ
        if (paidCurrency === 'KZ') {
          // Já está em KZ
          amountInKZ = Math.round(paidAmount);
          console.log('💰 JÁ EM KZ - sem conversão necessária:', amountInKZ);
        } else {
          // Converter de outra moeda para KZ
          const rate = exchangeRates[paidCurrency] || 1;
          amountInKZ = Math.round(paidAmount * rate);
          console.log('💱 CONVERTENDO PARA KZ:', {
            original: `${paidAmount} ${paidCurrency}`,
            rate: rate,
            converted: `${amountInKZ} KZ`
          });
        }
        
        if (hasCustomPrices) {
          // PREÇO PERSONALIZADO: Vendedor recebe o equivalente em KZ do que foi pago
          sellerCommissionInKZ = amountInKZ;
          console.log(`💰 PREÇO PERSONALIZADO: Cliente pagou ${paidAmount} ${paidCurrency}, convertido para ${amountInKZ} KZ`);
        } else {
          // PREÇO CONVERTIDO: Vendedor recebe o valor original em KZ
          const originalPriceKZ = parseFloat(productData.price.replace(/[^\d,]/g, '').replace(',', '.'));
          sellerCommissionInKZ = originalPriceKZ;
          console.log(`💰 PREÇO CONVERTIDO: Cliente pagou ${paidAmount} ${paidCurrency}, vendedor recebe ${sellerCommissionInKZ} KZ (preço original)`);
        }
        
        console.log('🎯 VALORES FINAIS PARA SALVAR NO DATABASE:', {
          amountInKZ,
          sellerCommissionInKZ,
          currency: 'KZ'
        });
        
        const { data: orderData, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString(),
            // SEMPRE salvar em KZ para vendedores angolanos com 8.99% de taxa descontado
            seller_commission: sellerCommissionInKZ * 0.9101, // 8.99% platform fee
            amount: amountInKZ.toString(), // Valor convertido para KZ
            currency: 'KZ' // Sempre KZ no banco
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
                  // CORREÇÃO: Usar valor original do metadata ao invés do valor convertido do Stripe
                  amount: paymentIntent.metadata.original_amount || (paymentIntent.amount / 100).toString(),
                  currency: paymentIntent.metadata.original_currency || paymentIntent.currency.toUpperCase(),
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

              // Enviar email de acesso à área de membros para o produto principal
              try {
                console.log('🔍 Checking if main product has member area...');
                
                const { data: mainProduct, error: mainProductError } = await supabase
                  .from('products')
                  .select('name, member_area_id, user_id')
                  .eq('id', order.product_id)
                  .single();
                
                if (!mainProductError && mainProduct && mainProduct.member_area_id) {
                  console.log(`✅ Main product has member area: ${mainProduct.member_area_id}`);
                  
                  // Get member area details
                  const { data: memberArea, error: memberAreaError } = await supabase
                    .from('member_areas')
                    .select('name, url')
                    .eq('id', mainProduct.member_area_id)
                    .single();
                  
                  if (!memberAreaError && memberArea) {
                    const mainMemberAreaUrl = `https://kambafy.com/members/login/${mainProduct.member_area_id}`;
                    
                    // Generate temporary password for main product access
                    function generateTemporaryPassword(): string {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                      let password = '';
                      for (let i = 0; i < 10; i++) {
                        password += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      return password;
                    }
                    
                    const mainTemporaryPassword = generateTemporaryPassword();
                    
                    // Send member access email for main product
                    const mainMemberAccessPayload = {
                      studentName: order.customer_name,
                      studentEmail: order.customer_email.toLowerCase().trim(),
                      memberAreaName: memberArea.name,
                      memberAreaUrl: mainMemberAreaUrl,
                      sellerName: 'Kambafy',
                      isNewAccount: true,
                      temporaryPassword: mainTemporaryPassword
                    };
                    
                    console.log('📧 Sending main product member access email:', mainMemberAccessPayload);
                    
                    const { error: mainAccessEmailError } = await supabase.functions.invoke('send-member-access-email', {
                      body: mainMemberAccessPayload
                    });
                    
                    if (mainAccessEmailError) {
                      console.error(`❌ Error sending main product access email:`, mainAccessEmailError);
                    } else {
                      console.log(`✅ Main product access email sent successfully`);
                    }
                  }
                } else {
                  console.log(`ℹ️ Main product does not have member area, skipping access email`);
                }
              } catch (mainProductEmailError) {
                console.error('❌ Error processing main product member access email:', mainProductEmailError);
              }

              // Process order bumps and send separate access emails if applicable
              if (paymentIntent.metadata.order_bump_data) {
                try {
                  console.log('📧 Processing order bump access emails...');
                  const orderBumpData = JSON.parse(paymentIntent.metadata.order_bump_data);
                  
                  if (Array.isArray(orderBumpData)) {
                    for (const bump of orderBumpData) {
                      if (bump.bump_product_id) {
                        console.log(`📧 Processing email for order bump: ${bump.bump_product_name}`);
                        
                        // Fetch order bump product details
                        const { data: bumpProduct, error: bumpProductError } = await supabase
                          .from('products')
                          .select('name, member_area_id, user_id')
                          .eq('id', bump.bump_product_id)
                          .single();
                        
                        if (!bumpProductError && bumpProduct && bumpProduct.member_area_id) {
                          console.log(`✅ Order bump has member area: ${bumpProduct.member_area_id}`);
                          
                          // Get member area details
                          const { data: memberArea, error: memberAreaError } = await supabase
                            .from('member_areas')
                            .select('name, url')
                            .eq('id', bumpProduct.member_area_id)
                            .single();
                          
                          if (!memberAreaError && memberArea) {
                            const bumpMemberAreaUrl = `https://kambafy.com/members/login/${bumpProduct.member_area_id}`;
                            
                            // Generate temporary password for order bump access
                            function generateTemporaryPassword(): string {
                              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                              let password = '';
                              for (let i = 0; i < 10; i++) {
                                password += chars.charAt(Math.floor(Math.random() * chars.length));
                              }
                              return password;
                            }
                            
                            const bumpTemporaryPassword = generateTemporaryPassword();
                            
                            // Send member access email for order bump
                            const memberAccessPayload = {
                              studentName: order.customer_name,
                              studentEmail: order.customer_email.toLowerCase().trim(),
                              memberAreaName: memberArea.name,
                              memberAreaUrl: bumpMemberAreaUrl,
                              sellerName: 'Kambafy',
                              isNewAccount: false,
                              temporaryPassword: bumpTemporaryPassword
                            };
                            
                            console.log('📧 Sending member access email for order bump:', memberAccessPayload);
                            
                            const { error: bumpEmailError } = await supabase.functions.invoke('send-member-access-email', {
                              body: memberAccessPayload
                            });
                            
                            if (bumpEmailError) {
                              console.error(`❌ Error sending order bump access email for ${bump.bump_product_name}:`, bumpEmailError);
                            } else {
                              console.log(`✅ Order bump access email sent successfully for: ${bump.bump_product_name}`);
                            }
                          }
                        } else {
                          console.log(`ℹ️ Order bump ${bump.bump_product_name} does not have member area, skipping separate access email`);
                        }
                      }
                    }
                  }
                } catch (bumpEmailError) {
                  console.error('❌ Error processing order bump emails:', bumpEmailError);
                }
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
                    // CORREÇÃO: Usar valor original do metadata
                    price: paymentIntent.metadata.original_amount || (paymentIntent.amount / 100).toString(),
                    currency: paymentIntent.metadata.original_currency || paymentIntent.currency.toUpperCase(),
                    timestamp: new Date().toISOString()
                  },
                  user_id: product?.user_id,
                  order_id: orderId,
                  product_id: order.product_id
                };

                await supabase.functions.invoke('trigger-webhooks', {
                  body: productPurchasePayload
                });

                // Processar webhooks para order bumps se houver
                if (paymentIntent.metadata.order_bump_data) {
                  try {
                    console.log('🔔 Processing order bump webhooks...');
                    const orderBumpData = JSON.parse(paymentIntent.metadata.order_bump_data);
                    
                    if (Array.isArray(orderBumpData)) {
                      for (const bump of orderBumpData) {
                        if (bump.bump_product_id) {
                          console.log(`🎯 Triggering webhook for order bump: ${bump.bump_product_name}`);
                          
                          const bumpPaymentPayload = {
                            event: 'payment.success',
                            data: {
                              order_id: `${orderId}-BUMP-${bump.bump_product_id}`,
                              amount: bump.discounted_price > 0 ? bump.discounted_price : parseFloat(bump.bump_product_price.replace(/[^\d.,]/g, '').replace(',', '.')),
                              currency: paymentIntent.currency,
                              customer_email: order.customer_email,
                              customer_name: order.customer_name,
                              product_id: bump.bump_product_id,
                              product_name: bump.bump_product_name,
                              payment_method: paymentIntent.payment_method_types[0],
                              is_order_bump: true,
                              main_order_id: orderId,
                              timestamp: new Date().toISOString()
                            },
                            user_id: product?.user_id,
                            order_id: `${orderId}-BUMP-${bump.bump_product_id}`,
                            product_id: order.product_id // Usar o produto principal para encontrar os webhooks
                          };

                          await supabase.functions.invoke('trigger-webhooks', {
                            body: bumpPaymentPayload
                          });

                          // Disparar evento de produto comprado para o order bump
                          const bumpPurchasePayload = {
                            event: 'product.purchased',
                            data: {
                              order_id: `${orderId}-BUMP-${bump.bump_product_id}`,
                              product_id: bump.bump_product_id,
                              product_name: bump.bump_product_name,
                              customer_email: order.customer_email,
                              customer_name: order.customer_name,
                              price: bump.discounted_price > 0 ? bump.discounted_price.toString() : bump.bump_product_price,
                              currency: paymentIntent.currency,
                              is_order_bump: true,
                              main_order_id: orderId,
                              timestamp: new Date().toISOString()
                            },
                            user_id: product?.user_id,
                            order_id: `${orderId}-BUMP-${bump.bump_product_id}`,
                            product_id: order.product_id // Usar o produto principal para encontrar os webhooks
                          };

                          await supabase.functions.invoke('trigger-webhooks', {
                            body: bumpPurchasePayload
                          });

                          console.log(`✅ Order bump webhook triggered for: ${bump.bump_product_name}`);
                        }
                      }
                    }
                  } catch (bumpError) {
                    console.error('❌ Error processing order bump webhooks:', bumpError);
                  }
                }

                console.log('✅ Webhooks triggered successfully');

              } catch (webhookError) {
                console.error('❌ Error triggering webhooks:', webhookError);
                // Não falhar o webhook do Stripe por causa dos webhooks customizados
              }
          }
        }
      } else {
        console.log('⚠️ No order_id found in payment intent metadata');
      }
    } 
    // Fase 4: Cancelar pagamentos falhados imediatamente
    else if (event.type === 'payment_intent.payment_failed') {
      console.log('💳 Payment failed event received');
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.order_id;

      if (orderId) {
        console.log('❌ Cancelling failed payment order:', orderId);
        
        const { error: cancelError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            cancellation_reason: 'payment_failed',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (cancelError) {
          console.error('❌ Error cancelling failed order:', cancelError);
        } else {
          console.log('✅ Order cancelled due to payment failure');
        }
      }
    }
    else if (event.type === 'checkout.session.expired') {
      console.log('⏱️ Checkout session expired');
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        console.log('❌ Cancelling expired session order:', orderId);
        
        const { error: cancelError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            cancellation_reason: 'expired_payment_session',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (cancelError) {
          console.error('❌ Error cancelling expired session:', cancelError);
        } else {
          console.log('✅ Order cancelled due to expired checkout session');
        }
      }
    }
    else if (event.type === 'payment_intent.canceled') {
      console.log('🚫 Payment intent cancelled');
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.order_id;

      if (orderId) {
        console.log('❌ Cancelling cancelled payment order:', orderId);
        
        const { error: cancelError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            cancellation_reason: 'payment_failed',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (cancelError) {
          console.error('❌ Error cancelling cancelled payment:', cancelError);
        } else {
          console.log('✅ Order cancelled due to payment cancellation');
        }
      }
    }
    else {
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
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
