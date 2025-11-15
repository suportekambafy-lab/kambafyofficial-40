import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyOrderRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[VERIFY-APPYPAY-ORDER] Request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { orderId }: VerifyOrderRequest = await req.json();
    console.log('[VERIFY-APPYPAY-ORDER] Verifying order:', orderId);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar encomenda
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[VERIFY-APPYPAY-ORDER] Order not found error:', orderError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Pedido não encontrado na base de dados',
        error: 'Order not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('[VERIFY-APPYPAY-ORDER] Order found:', {
      order_id: order.order_id,
      status: order.status,
      payment_method: order.payment_method
    });

    // Só verificar encomendas AppyPay (express ou reference)
    if (!['express', 'reference'].includes(order.payment_method)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'This order is not an AppyPay payment'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Obter credenciais AppyPay
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const authBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL');
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    const resource = Deno.env.get('APPYPAY_RESOURCE');
    const grantType = Deno.env.get('APPYPAY_GRANT_TYPE');

    if (!clientId || !clientSecret || !authBaseUrl || !apiBaseUrl) {
      throw new Error('AppyPay credentials not configured');
    }

    // Obter token OAuth (usar authBaseUrl diretamente, sem adicionar /oauth2/token)
    console.log('[VERIFY-APPYPAY-ORDER] Getting OAuth token...');
    const tokenParams = new URLSearchParams({
      grant_type: grantType || 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource: resource || apiBaseUrl
    });

    console.log('[VERIFY-APPYPAY-ORDER] Token request URL:', authBaseUrl);

    const tokenResponse = await fetch(authBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });

    console.log('[VERIFY-APPYPAY-ORDER] Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[VERIFY-APPYPAY-ORDER] Token error response:', errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Erro ao autenticar com AppyPay',
        error: 'Failed to get authentication token',
        details: errorText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.error('[VERIFY-APPYPAY-ORDER] No access token in response:', tokenData);
      throw new Error('No access token received from AppyPay');
    }
    
    console.log('[VERIFY-APPYPAY-ORDER] Token obtained successfully');

    // Consultar transação no AppyPay usando o merchantTransactionId (appypay_transaction_id)
    const transactionId = order.appypay_transaction_id;
    
    if (!transactionId) {
      console.log('[VERIFY-APPYPAY-ORDER] No merchantTransactionId found for this order');
      return new Response(JSON.stringify({
        success: false,
        message: 'Esta encomenda não tem ID de transação AppyPay. Encomendas antigas não podem ser verificadas automaticamente.',
        cannotVerify: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    console.log('[VERIFY-APPYPAY-ORDER] Checking transaction:', transactionId);

    const checkUrl = `https://gwy-api.appypay.co.ao/v2.0/charges/${transactionId}`;
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('[VERIFY-APPYPAY-ORDER] Check error:', errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Transaction not found in AppyPay',
        details: errorText
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const transactionData = await checkResponse.json();
    console.log('[VERIFY-APPYPAY-ORDER] Transaction data:', JSON.stringify(transactionData, null, 2));

    // Extrair status
    const paymentStatus = transactionData.responseStatus?.status;
    const isSuccessful = transactionData.responseStatus?.successful;
    
    let newOrderStatus = order.status; // Manter status atual por padrão
    
    if (isSuccessful && paymentStatus === 'Success') {
      newOrderStatus = 'completed';
    } else if (!isSuccessful || paymentStatus === 'Failed') {
      newOrderStatus = 'failed';
    } else if (paymentStatus === 'Pending') {
      newOrderStatus = 'pending';
    }

    console.log('[VERIFY-APPYPAY-ORDER] Status comparison:', {
      currentStatus: order.status,
      appyPayStatus: paymentStatus,
      newStatus: newOrderStatus
    });

    // Atualizar se mudou
    if (order.status !== newOrderStatus) {
      console.log('[VERIFY-APPYPAY-ORDER] Updating order status...');
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newOrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      console.log('[VERIFY-APPYPAY-ORDER] Order updated successfully');

      // Se pagamento foi completado, enviar confirmação
      if (newOrderStatus === 'completed' && order.status !== 'completed') {
        console.log('[VERIFY-APPYPAY-ORDER] Payment completed - sending confirmation...');
        
        const { data: product } = await supabase
          .from('products')
          .select('name, user_id, member_area_id')
          .eq('id', order.product_id)
          .single();

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

        await supabase.functions.invoke('send-purchase-confirmation', {
          body: confirmationPayload
        });

        console.log('[VERIFY-APPYPAY-ORDER] Confirmation sent');

        // 🔔 ENVIAR NOTIFICAÇÃO ONESIGNAL PARA O VENDEDOR
        try {
          console.log('[VERIFY-APPYPAY-ORDER] 📱 Checking OneSignal notification...');
          
          // Buscar OneSignal Player ID do vendedor
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('onesignal_player_id')
            .eq('user_id', product?.user_id)
            .single();
          
          if (sellerProfile?.onesignal_player_id) {
            console.log('[VERIFY-APPYPAY-ORDER] 📤 Sending OneSignal notification to seller...');
            
            const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
              body: {
                player_id: sellerProfile.onesignal_player_id,
                title: '🎉 Nova Venda!',
                message: `Você vendeu para ${order.customer_name} - ${order.amount} ${order.currency}`,
                data: {
                  type: 'sale',
                  order_id: order.order_id,
                  amount: order.amount,
                  currency: order.currency,
                  customer_name: order.customer_name
                }
              }
            });
            
            if (notificationError) {
              console.error('[VERIFY-APPYPAY-ORDER] ❌ Error sending OneSignal notification:', notificationError);
            } else {
              console.log('[VERIFY-APPYPAY-ORDER] ✅ OneSignal notification sent successfully');
            }
          } else {
            console.log('[VERIFY-APPYPAY-ORDER] ⚠️ Seller does not have OneSignal Player ID configured');
          }

          // 🎯 ENVIAR CUSTOM EVENT PARA ONESIGNAL JOURNEY
          console.log('[VERIFY-APPYPAY-ORDER] 📤 Sending OneSignal Custom Event...');
          const { error: customEventError } = await supabase.functions.invoke('send-onesignal-custom-event', {
            body: {
              external_id: product?.user_id,
              event_name: 'new_sale',
              properties: {
                order_id: order.order_id,
                amount: parseFloat(order.amount),
                currency: order.currency,
                customer_name: order.customer_name,
                product_name: product?.name || ''
              }
            }
          });

          if (customEventError) {
            console.error('[VERIFY-APPYPAY-ORDER] ❌ Error sending Custom Event:', customEventError);
          } else {
            console.log('[VERIFY-APPYPAY-ORDER] ✅ Custom Event sent successfully');
          }
        } catch (notifError) {
          console.error('[VERIFY-APPYPAY-ORDER] ❌ Error in OneSignal notification process:', notifError);
          // Não falhar a operação principal por erro de notificação
        }

        // ✅ Enviar evento para Facebook Conversions API
        try {
          console.log('[VERIFY-APPYPAY-ORDER] Sending Facebook Conversion event...');
          await supabase.functions.invoke('send-facebook-conversion', {
            body: {
              productId: order.product_id,
              orderId: order.order_id,
              amount: parseFloat(order.amount),
              currency: order.currency,
              customerEmail: order.customer_email,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              eventSourceUrl: `https://kambafy.com/produto/${order.product_id}`
            }
          });
          console.log('[VERIFY-APPYPAY-ORDER] ✅ Facebook Conversion event sent successfully');
        } catch (fbError) {
          console.error('[VERIFY-APPYPAY-ORDER] ❌ Error sending Facebook conversion:', fbError);
          // Não falhar a operação principal por erro no Facebook
        }
      }

      return new Response(JSON.stringify({
        success: true,
        updated: true,
        oldStatus: order.status,
        newStatus: newOrderStatus,
        transactionData: transactionData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      updated: false,
      status: order.status,
      message: 'Status unchanged',
      transactionData: transactionData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[VERIFY-APPYPAY-ORDER] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
