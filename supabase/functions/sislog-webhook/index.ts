import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format price helper
function formatPrice(amount: number, currency: string = 'MZN'): string {
  return `${parseFloat(amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

// Calculate access expiration based on product settings
function calculateAccessExpiration(product: any): Date | null {
  if (!product.access_duration_type || product.access_duration_type === 'lifetime') {
    return null; // Lifetime access
  }
  
  const now = new Date();
  const value = product.access_duration_value || 1;
  
  switch (product.access_duration_type) {
    case 'days':
      now.setDate(now.getDate() + value);
      break;
    case 'months':
      now.setMonth(now.getMonth() + value);
      break;
    case 'years':
      now.setFullYear(now.getFullYear() + value);
      break;
    default:
      return null;
  }
  
  return now;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SISLOG sends webhook as GET with query parameters
    const url = new URL(req.url);
    const params = url.searchParams;

    // Extract SISLOG webhook parameters
    const entity = params.get('entity');
    const reference = params.get('reference');
    const value = params.get('value'); // Amount in centavos
    const transactionId = params.get('transactionId');
    const provider = params.get('provider');
    const paymentDateTime = params.get('paymentdatetime');
    const errorMessage = params.get('errormessage');

    console.log('📥 SISLOG Webhook received:', {
      entity,
      reference,
      value,
      transactionId,
      provider,
      paymentDateTime,
      errorMessage
    });

    // Validate required parameters
    if (!transactionId) {
      console.error('❌ Missing transactionId');
      return new Response('Missing transactionId', { status: 400 });
    }

    // Find order by transaction ID (stored in appypay_transaction_id field)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, products(id, name, user_id, access_duration_type, access_duration_value, member_area_id)')
      .eq('appypay_transaction_id', transactionId)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found for transactionId:', transactionId, orderError);
      return new Response('Order not found', { status: 404 });
    }

    console.log('📦 Found order:', order.order_id, 'Status:', order.status);

    // Check if payment failed (entity = "00000" indicates error)
    if (entity === '00000' || errorMessage) {
      console.log('❌ Payment failed:', errorMessage);
      
      // Update order status to failed
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          cancellation_reason: errorMessage || 'Payment failed'
        })
        .eq('id', order.id);

      return new Response('Payment failed processed', { status: 200 });
    }

    // Payment successful - update order
    console.log('✅ Payment successful, processing...');

    // Update order to completed
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      return new Response('Error updating order', { status: 500 });
    }

    console.log('✅ Order updated to completed');

    const product = order.products;
    const amount = parseFloat(order.amount);
    const sellerCommission = order.seller_commission || amount;

    // Create customer access
    try {
      const accessExpiration = calculateAccessExpiration(product);
      
      const { error: accessError } = await supabaseAdmin
        .from('customer_access')
        .upsert({
          customer_email: order.customer_email.toLowerCase().trim(),
          customer_name: order.customer_name,
          product_id: order.product_id,
          order_id: order.order_id,
          is_active: true,
          access_expires_at: accessExpiration?.toISOString() || null,
          access_granted_at: new Date().toISOString()
        }, {
          onConflict: 'customer_email,product_id'
        });

      if (accessError) {
        console.error('⚠️ Error creating customer access:', accessError);
      } else {
        console.log('✅ Customer access created');
      }
    } catch (accessErr) {
      console.error('⚠️ Error in customer access creation:', accessErr);
    }

    // Credit seller balance
    try {
      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, user_id')
        .eq('user_id', product.user_id)
        .single();

      if (sellerProfile) {
        // Create balance transaction for seller
        const { error: balanceError } = await supabaseAdmin
          .from('balance_transactions')
          .insert({
            user_id: product.user_id,
            email: sellerProfile.email,
            amount: sellerCommission,
            type: 'sale_revenue',
            description: `Venda do produto ${product.name} - Pedido ${order.order_id}`,
            order_id: order.order_id,
            currency: 'MZN'
          });

        if (balanceError) {
          console.error('⚠️ Error crediting seller:', balanceError);
        } else {
          console.log('✅ Seller balance credited:', sellerCommission, 'MZN');
        }

        // Send OneSignal notification to seller
        const formattedPrice = formatPrice(sellerCommission, 'MZN');
        
        await supabaseAdmin.functions.invoke('send-onesignal-notification', {
          body: {
            external_id: sellerProfile.email,
            title: 'Kambafy - Venda aprovada',
            message: `Sua comissão: ${formattedPrice}`,
            data: {
              type: 'sale',
              order_id: order.order_id,
              amount: amount.toString(),
              seller_commission: formattedPrice,
              currency: 'MZN',
              product_name: product.name,
              url: 'https://mobile.kambafy.com/app'
            }
          }
        });
        
        console.log('✅ Seller notification sent');
      }
    } catch (balanceErr) {
      console.error('⚠️ Error in seller balance/notification:', balanceErr);
    }

    // Send purchase confirmation email
    try {
      await supabaseAdmin.functions.invoke('send-purchase-confirmation', {
        body: {
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          productName: product.name,
          orderId: order.order_id,
          amount: amount.toString(),
          currency: 'MZN',
          productId: order.product_id,
          sellerId: product.user_id,
          memberAreaId: product.member_area_id,
          paymentMethod: provider?.toLowerCase() || order.payment_method,
          paymentStatus: 'completed'
        }
      });
      
      console.log('✅ Confirmation email sent');
    } catch (emailErr) {
      console.error('⚠️ Error sending confirmation email:', emailErr);
    }

    // Trigger webhooks
    try {
      await supabaseAdmin.functions.invoke('trigger-webhooks', {
        body: {
          event: 'payment.success',
          data: {
            order_id: order.order_id,
            amount: amount.toString(),
            currency: 'MZN',
            customer_email: order.customer_email,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            product_id: order.product_id,
            product_name: product.name,
            payment_method: provider?.toLowerCase() || order.payment_method,
            timestamp: new Date().toISOString()
          },
          user_id: product.user_id,
          order_id: order.order_id,
          product_id: order.product_id
        }
      });
      
      console.log('✅ Webhooks triggered');
    } catch (webhookErr) {
      console.error('⚠️ Error triggering webhooks:', webhookErr);
    }

    // Process order bumps if any
    if (order.order_bump_data) {
      try {
        const orderBumpData = order.order_bump_data;
        console.log('📦 Processing order bumps:', orderBumpData);
        
        // Handle array or single order bump
        const bumps = Array.isArray(orderBumpData) ? orderBumpData : [orderBumpData];
        
        for (const bump of bumps) {
          if (bump.bump_product_id) {
            // Create access for bump product
            await supabaseAdmin
              .from('customer_access')
              .upsert({
                customer_email: order.customer_email.toLowerCase().trim(),
                customer_name: order.customer_name,
                product_id: bump.bump_product_id,
                order_id: order.order_id,
                is_active: true,
                access_granted_at: new Date().toISOString()
              }, {
                onConflict: 'customer_email,product_id'
              });
            
            console.log('✅ Order bump access created for product:', bump.bump_product_id);
          }
        }
      } catch (bumpErr) {
        console.error('⚠️ Error processing order bumps:', bumpErr);
      }
    }

    console.log('✅ SISLOG webhook processing complete');

    // Return success (SISLOG expects HTTP 200)
    return new Response('OK', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('❌ Error in sislog-webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
