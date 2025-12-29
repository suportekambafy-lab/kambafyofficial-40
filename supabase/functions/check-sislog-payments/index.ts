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
  if (!product?.access_duration_type || product.access_duration_type === 'lifetime') {
    return null;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const SISLOG_API_KEY = Deno.env.get('SISLOG_API_KEY');
    const SISLOG_USERNAME = Deno.env.get('SISLOG_USERNAME');
    const SISLOG_API_URL = Deno.env.get('SISLOG_API_URL') || 'https://lin4.sislog.com';

    if (!SISLOG_API_KEY || !SISLOG_USERNAME) {
      console.error('❌ SISLOG credentials not configured');
      return new Response(JSON.stringify({ error: 'SISLOG credentials not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('🔍 [CHECK-SISLOG] Starting payment status check...');

    // Buscar ordens pendentes de Moçambique (últimas 48 horas)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*, products(id, name, user_id, member_area_id, access_duration_type, access_duration_value)')
      .in('payment_method', ['emola', 'mpesa'])
      .eq('status', 'pending')
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching pending orders:', ordersError);
      throw ordersError;
    }

    console.log(`📋 Found ${pendingOrders?.length || 0} pending Mozambique orders`);

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending orders to check',
        checked: 0,
        updated: 0
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let checkedCount = 0;
    let updatedCount = 0;
    const results: any[] = [];

    for (const order of pendingOrders) {
      const transactionId = order.appypay_transaction_id;
      
      if (!transactionId) {
        console.log(`⚠️ Order ${order.order_id} has no transaction ID, skipping`);
        continue;
      }

      console.log(`🔄 Checking order ${order.order_id} (${transactionId})...`);
      checkedCount++;

      try {
        // Tentar múltiplos endpoints SISLOG para verificar status
        // A API pode usar diferentes endpoints dependendo da versão
        const endpoints = [
          `${SISLOG_API_URL}/mobile/reference/check`,
          `${SISLOG_API_URL}/mobile/check`,
          `${SISLOG_API_URL}/reference/status`,
          `${SISLOG_API_URL}/api/check`,
        ];

        let statusData: any = null;
        let lastError: any = null;

        for (const endpoint of endpoints) {
          try {
            console.log(`🔄 Trying endpoint: ${endpoint}`);
            
            const statusResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SISLOG_API_KEY
              },
              body: JSON.stringify({
                username: SISLOG_USERNAME,
                transactionId: transactionId
              })
            });

            const responseText = await statusResponse.text();
            
            // Verificar se é JSON válido
            if (responseText.startsWith('{') || responseText.startsWith('[')) {
              statusData = JSON.parse(responseText);
              console.log(`✅ Valid response from ${endpoint}:`, statusData);
              break;
            } else {
              console.log(`⚠️ Non-JSON response from ${endpoint}: ${responseText.substring(0, 100)}`);
            }
          } catch (endpointErr) {
            lastError = endpointErr;
            console.log(`⚠️ Error with ${endpoint}:`, endpointErr.message);
          }
        }

        // Se nenhum endpoint funcionou, a API SISLOG não tem endpoint de status
        // Neste caso, precisamos aguardar o webhook
        if (!statusData) {
          console.log(`⚠️ No valid status endpoint found for SISLOG. Webhook is required.`);
          results.push({
            order_id: order.order_id,
            transaction_id: transactionId,
            status: 'pending',
            updated: false,
            note: 'SISLOG status API not available - waiting for webhook'
          });
          continue;
        }

        console.log(`📥 SISLOG status for ${transactionId}:`, statusData);

        // Verificar se pagamento foi confirmado
        // SISLOG pode retornar: status: "Valid"/"Paid"/"Completed" ou paymentdatetime preenchido
        const isPaid = 
          statusData.status === 'Paid' || 
          statusData.status === 'paid' ||
          statusData.status === 'Completed' ||
          statusData.status === 'completed' ||
          statusData.status === 'Success' ||
          statusData.status === 'success' ||
          statusData.paymentdatetime ||
          statusData.paymentDateTime ||
          statusData.paid === true;

        if (isPaid) {
          console.log(`✅ Payment confirmed for ${order.order_id}!`);

          // Atualizar order para completed
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ 
              status: 'completed', 
              updated_at: new Date().toISOString(),
              payment_confirmed_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Error updating order ${order.order_id}:`, updateError);
            continue;
          }

          updatedCount++;

          // Criar customer_access
          try {
            const product = order.products;
            const accessExpiration = calculateAccessExpiration(product);

            await supabaseAdmin
              .from('customer_access')
              .upsert({
                customer_email: order.customer_email.toLowerCase().trim(),
                customer_name: order.customer_name,
                product_id: order.product_id,
                order_id: order.order_id,
                is_active: true,
                access_expires_at: accessExpiration?.toISOString() || null,
                access_granted_at: new Date().toISOString()
              }, { onConflict: 'customer_email,product_id' });

            console.log(`✅ Customer access created for ${order.customer_email}`);
          } catch (accessErr) {
            console.error(`⚠️ Error creating customer_access:`, accessErr);
          }

          // Enviar email de confirmação
          try {
            await supabaseAdmin.functions.invoke('send-purchase-confirmation', {
              body: { orderId: order.order_id }
            });
            console.log(`✅ Confirmation email sent for ${order.order_id}`);
          } catch (emailErr) {
            console.error(`⚠️ Error sending confirmation email:`, emailErr);
          }

          // Notificar vendedor
          try {
            await supabaseAdmin.functions.invoke('send-seller-notification-email', {
              body: { orderId: order.order_id }
            });
            console.log(`✅ Seller notification sent for ${order.order_id}`);
          } catch (notifyErr) {
            console.error(`⚠️ Error sending seller notification:`, notifyErr);
          }

          // Notificação push para vendedor
          try {
            const { data: sellerProfile } = await supabaseAdmin
              .from('profiles')
              .select('email')
              .eq('user_id', order.products?.user_id)
              .single();

            if (sellerProfile?.email) {
              const sellerAmount = order.seller_commission || order.amount;
              await supabaseAdmin.functions.invoke('send-onesignal-notification', {
                body: {
                  external_id: sellerProfile.email,
                  title: 'Kambafy - Venda aprovada',
                  message: `Sua comissão: ${formatPrice(parseFloat(sellerAmount), 'MZN')}`,
                  data: {
                    type: 'sale',
                    order_id: order.order_id,
                    url: 'https://mobile.kambafy.com/app'
                  }
                }
              });
            }
          } catch (pushErr) {
            console.error(`⚠️ Error sending push notification:`, pushErr);
          }

          results.push({
            order_id: order.order_id,
            transaction_id: transactionId,
            status: 'completed',
            updated: true
          });

        } else {
          console.log(`⏳ Order ${order.order_id} still pending`);
          results.push({
            order_id: order.order_id,
            transaction_id: transactionId,
            status: 'pending',
            updated: false,
            sislog_status: statusData.status || 'unknown'
          });
        }

      } catch (checkErr) {
        console.error(`❌ Error checking order ${order.order_id}:`, checkErr);
        results.push({
          order_id: order.order_id,
          transaction_id: transactionId,
          status: 'error',
          error: checkErr.message
        });
      }

      // Pequeno delay entre chamadas para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`🏁 Check complete: ${checkedCount} checked, ${updatedCount} updated`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Checked ${checkedCount} orders, updated ${updatedCount}`,
      checked: checkedCount,
      updated: updatedCount,
      results
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in check-sislog-payments:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
