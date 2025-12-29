import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas aceitar POST
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse body JSON
    const body = await req.json();
    
    // SISLOG pode enviar o transactionId com diferentes nomes de campo
    // Tentar múltiplas variações para garantir compatibilidade
    const transactionId = body.transactionId || 
                          body.transaction_id || 
                          body.TransactionId || 
                          body.transactionid ||
                          body.reference ||
                          body.Reference ||
                          body.id ||
                          body.Id;
    
    const status = body.status || body.Status || body.result || body.Result;

    console.log('📥 SISLOG Callback received:', { 
      transactionId, 
      status, 
      fullBody: JSON.stringify(body),
      bodyKeys: Object.keys(body)
    });

    if (!transactionId) {
      console.error('❌ Missing transactionId in callback. Body keys:', Object.keys(body));
      console.error('❌ Full body:', JSON.stringify(body));
      return new Response(JSON.stringify({ 
        error: 'Missing transactionId',
        received_keys: Object.keys(body),
        received_body: body
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar order pelo transactionId (guardado em appypay_transaction_id ou sislog_reference)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, products(id, name, user_id, member_area_id, access_duration_type, access_duration_value)')
      .or(`appypay_transaction_id.eq.${transactionId},sislog_reference.eq.${transactionId}`)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found for transactionId:', transactionId, orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📦 Found order:', order.order_id, 'current status:', order.status);

    // Se já está completed, não processar novamente
    if (order.status === 'completed') {
      console.log('⚠️ Order already completed, skipping:', order.order_id);
      return new Response(JSON.stringify({ success: true, message: 'Already processed', status: 'completed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determinar novo status baseado no status recebido ou assumir sucesso
    const isSuccess = status === 'success' || status === 'completed' || status === 200 || status === '200' || !status;

    if (isSuccess) {
      console.log('✅ Processing successful payment for order:', order.order_id);

      // Atualizar para completed
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'completed', 
          updated_at: new Date().toISOString(),
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('❌ Error updating order status:', updateError);
        throw updateError;
      }

      // Criar customer_access
      try {
        const product = order.products;
        let accessExpiration = null;

        if (product?.access_duration_type && product?.access_duration_value) {
          const now = new Date();
          if (product.access_duration_type === 'days') {
            accessExpiration = new Date(now.getTime() + product.access_duration_value * 24 * 60 * 60 * 1000);
          } else if (product.access_duration_type === 'months') {
            accessExpiration = new Date(now.setMonth(now.getMonth() + product.access_duration_value));
          } else if (product.access_duration_type === 'years') {
            accessExpiration = new Date(now.setFullYear(now.getFullYear() + product.access_duration_value));
          }
        }

        const { error: accessError } = await supabaseAdmin
          .from('customer_access')
          .upsert({
            customer_email: order.customer_email.toLowerCase().trim(),
            customer_name: order.customer_name,
            product_id: order.product_id,
            order_id: order.order_id,
            is_active: true,
            access_expires_at: accessExpiration?.toISOString() || null
          }, { onConflict: 'customer_email,product_id' });

        if (accessError) {
          console.error('⚠️ Error creating customer_access:', accessError);
        } else {
          console.log('✅ Customer access created for:', order.customer_email);
        }
      } catch (accessErr) {
        console.error('⚠️ Error in customer_access creation:', accessErr);
      }

      // Creditar saldo do vendedor
      try {
        const sellerAmount = parseFloat(order.seller_amount || order.amount);
        if (sellerAmount > 0 && order.user_id) {
          const { error: balanceError } = await supabaseAdmin
            .from('balance_transactions')
            .insert({
              user_id: order.user_id,
              amount: sellerAmount,
              type: 'sale_revenue',
              description: `Venda do produto ${order.products?.name || 'N/A'} - ${order.order_id}`,
              order_id: order.order_id,
              currency: order.currency || 'MZN'
            });

          if (balanceError) {
            console.error('⚠️ Error crediting seller balance:', balanceError);
          } else {
            console.log('✅ Seller balance credited:', sellerAmount);
          }
        }
      } catch (balanceErr) {
        console.error('⚠️ Error in balance credit:', balanceErr);
      }

      // Enviar email de confirmação
      try {
        await supabaseAdmin.functions.invoke('send-purchase-confirmation', {
          body: { orderId: order.order_id }
        });
        console.log('✅ Purchase confirmation email sent');
      } catch (emailErr) {
        console.error('⚠️ Error sending confirmation email:', emailErr);
      }

      // Notificar vendedor
      try {
        await supabaseAdmin.functions.invoke('send-seller-notification-email', {
          body: { orderId: order.order_id }
        });
        console.log('✅ Seller notification sent');
      } catch (notifyErr) {
        console.error('⚠️ Error sending seller notification:', notifyErr);
      }

      console.log('✅ Order fully processed:', order.order_id);
      return new Response(JSON.stringify({ 
        success: true, 
        status: 'completed',
        order_id: order.order_id 
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      console.log('❌ Payment failed for order:', order.order_id, 'status:', status);

      // Atualizar para failed
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'failed', 
          cancellation_reason: `Payment callback failed with status: ${status}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('❌ Error updating order to failed:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'failed',
        order_id: order.order_id 
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Error in sislog-callback:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
