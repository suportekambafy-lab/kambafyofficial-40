import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppyPayWebhookPayload {
  id: string;
  merchantTransactionId: string;
  amount: number;
  options?: any;
  reference: {
    referenceNumber: string;
    dueDate: string;
    entity: string;
  };
  eletronicReceipt?: any;
  responseStatus: {
    successful: boolean;
    status: "Success" | "Failed" | "Pending";
    code: number;
    message: string;
    source: string;
    sourceDetails?: any;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[APPYPAY-WEBHOOK] Webhook received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[APPYPAY-WEBHOOK] Method not allowed: ${req.method}`);
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse webhook payload
    const payload: AppyPayWebhookPayload = await req.json();
    console.log('[APPYPAY-WEBHOOK] Received payload:', JSON.stringify(payload, null, 2));

    // Step 1: Extract order ID - either from merchantTransactionId (Express) or reference.referenceNumber (Reference)
    const orderIdFromPayload = payload.merchantTransactionId || payload.reference?.referenceNumber;
    
    if (!orderIdFromPayload) {
      console.error('[APPYPAY-WEBHOOK] Missing order ID in payload');
      return new Response(JSON.stringify({ 
        error: 'Missing merchantTransactionId or referenceNumber in payload' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const paymentType = payload.merchantTransactionId ? 'express' : 'reference';
    console.log(`[APPYPAY-WEBHOOK] Processing ${paymentType} payment for order ID: ${orderIdFromPayload}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 2: Search for order matching the order ID (works for both express and reference)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderIdFromPayload)
      .in('payment_method', ['express', 'reference'])
      .limit(1);

    if (orderError) {
      console.error('[APPYPAY-WEBHOOK] Error fetching order:', orderError);
      throw new Error(`Database error: ${orderError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log(`[APPYPAY-WEBHOOK] No order found for order ID: ${orderIdFromPayload}`);
      return new Response(JSON.stringify({ 
        message: 'Order not found',
        orderId: orderIdFromPayload,
        paymentType: paymentType
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const order = orders[0];
    console.log(`[APPYPAY-WEBHOOK] Found order:`, {
      id: order.id,
      order_id: order.order_id,
      status: order.status,
      customer_email: order.customer_email
    });

    // Step 3: Extract status from responseStatus and update order
    const paymentStatus = payload.responseStatus?.status;
    const isSuccessful = payload.responseStatus?.successful;
    
    let newOrderStatus = 'pending'; // default
    
    if (isSuccessful && paymentStatus === 'Success') {
      newOrderStatus = 'completed';
    } else if (!isSuccessful || paymentStatus === 'Failed') {
      newOrderStatus = 'failed';
    }

    console.log(`[APPYPAY-WEBHOOK] Payment status mapping:`, {
      appyPayStatus: paymentStatus,
      isSuccessful: isSuccessful,
      newOrderStatus: newOrderStatus
    });

    // Only update if status changed
    if (order.status !== newOrderStatus) {
      console.log(`[APPYPAY-WEBHOOK] Updating order status from ${order.status} to ${newOrderStatus}`);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newOrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[APPYPAY-WEBHOOK] Error updating order status:', updateError);
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      console.log(`[APPYPAY-WEBHOOK] Order status updated successfully`);

      // If payment was completed, trigger post-payment actions
      if (newOrderStatus === 'completed') {
        console.log('[APPYPAY-WEBHOOK] Payment completed - triggering post-payment actions');
        
        try {
          // Fetch product details for confirmation
          const { data: product } = await supabase
            .from('products')
            .select('name, user_id, member_area_id')
            .eq('id', order.product_id)
            .single();

          // Send purchase confirmation email and SMS
          const confirmationPayload = {
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            productName: product?.name || order.product_id,
            orderId: order.order_id,
            amount: order.amount,
            currency: order.currency,
            productId: order.product_id,
            memberAreaId: product?.member_area_id,
            sellerId: product?.user_id,
            paymentMethod: order.payment_method,
            paymentStatus: 'completed'
          };

          const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
            body: confirmationPayload
          });

          if (emailError) {
            console.error('[APPYPAY-WEBHOOK] Error sending confirmation email:', emailError);
          } else {
            console.log('[APPYPAY-WEBHOOK] Purchase confirmation sent successfully');
          }

          // Trigger webhooks for payment success
          const { error: webhookError } = await supabase.functions.invoke('trigger-webhooks', {
            body: {
              event: 'payment.success',
              user_id: product?.user_id,
              product_id: order.product_id,
              order_id: order.order_id,
              amount: order.amount,
              currency: order.currency,
              customer_email: order.customer_email,
              payment_method: order.payment_method
            }
          });

          if (webhookError) {
            console.error('[APPYPAY-WEBHOOK] Error triggering webhooks:', webhookError);
          } else {
            console.log('[APPYPAY-WEBHOOK] Webhooks triggered successfully');
          }

          // Process order bumps and send separate access emails if applicable
          if (order.order_bump_data) {
            try {
              console.log('[APPYPAY-WEBHOOK] Processing order bump access emails...');
              const orderBumpData = typeof order.order_bump_data === 'string' 
                ? JSON.parse(order.order_bump_data)
                : order.order_bump_data;
              
              if (orderBumpData && orderBumpData.bump_product_id) {
                console.log(`[APPYPAY-WEBHOOK] Processing email for order bump: ${orderBumpData.bump_product_name}`);
                
                // Fetch order bump product details
                const { data: bumpProduct, error: bumpProductError } = await supabase
                  .from('products')
                  .select('name, member_area_id, user_id')
                  .eq('id', orderBumpData.bump_product_id)
                  .single();
                
                if (!bumpProductError && bumpProduct && bumpProduct.member_area_id) {
                  console.log(`[APPYPAY-WEBHOOK] Order bump has member area: ${bumpProduct.member_area_id}`);
                  
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
                    
                    console.log('[APPYPAY-WEBHOOK] Sending member access email for order bump:', memberAccessPayload);
                    
                    const { error: bumpEmailError } = await supabase.functions.invoke('send-member-access-email', {
                      body: memberAccessPayload
                    });
                    
                    if (bumpEmailError) {
                      console.error(`[APPYPAY-WEBHOOK] Error sending order bump access email for ${orderBumpData.bump_product_name}:`, bumpEmailError);
                    } else {
                      console.log(`[APPYPAY-WEBHOOK] Order bump access email sent successfully for: ${orderBumpData.bump_product_name}`);
                    }
                  }
                } else {
                  console.log(`[APPYPAY-WEBHOOK] Order bump ${orderBumpData.bump_product_name} does not have member area, skipping separate access email`);
                }
              }
            } catch (bumpEmailError) {
              console.error('[APPYPAY-WEBHOOK] Error processing order bump emails:', bumpEmailError);
            }
          }

        } catch (postPaymentError) {
          console.error('[APPYPAY-WEBHOOK] Error in post-payment actions:', postPaymentError);
        }
      }

    } else {
      console.log(`[APPYPAY-WEBHOOK] Order status unchanged: ${order.status}`);
    }

    // Return success response
    const response = {
      success: true,
      message: 'Webhook processed successfully',
      order_id: order.order_id,
      paymentType: paymentType,
      oldStatus: order.status,
      newStatus: newOrderStatus,
      updated: order.status !== newOrderStatus
    };

    console.log('[APPYPAY-WEBHOOK] Webhook processing completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[APPYPAY-WEBHOOK] Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);