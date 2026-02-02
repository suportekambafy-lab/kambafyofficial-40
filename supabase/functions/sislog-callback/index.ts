import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format price helper
function formatPrice(amount: number, currency: string = 'MT'): string {
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Aceitar GET e POST (SISLOG pode enviar de diferentes formas)
  let transactionId: string | null = null;
  let entity: string | null = null;
  let fullBody: any = {};

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Tentar extrair parâmetros de query string (GET) ou body (POST)
    const url = new URL(req.url);
    
    if (req.method === 'GET') {
      // GET: parâmetros vêm na query string
      transactionId = url.searchParams.get('transactionId');
      entity = url.searchParams.get('entity');
      fullBody = Object.fromEntries(url.searchParams.entries());
      console.log('📥 SISLOG Callback (GET):', fullBody);
    } else if (req.method === 'POST') {
      // POST: parâmetros vêm no body JSON
      try {
        fullBody = await req.json();
      } catch {
        // Se não for JSON, tentar form-urlencoded
        const text = await req.text();
        const params = new URLSearchParams(text);
        fullBody = Object.fromEntries(params.entries());
      }
      
      // SISLOG envia: { entity: "...", transactionId: "..." }
      transactionId = fullBody.transactionId || fullBody.transaction_id || fullBody.TransactionId;
      entity = fullBody.entity || fullBody.Entity;
      console.log('📥 SISLOG Callback (POST):', JSON.stringify(fullBody));
    } else {
      console.log('❌ Method not allowed:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📋 Parsed params:', { transactionId, entity, keys: Object.keys(fullBody) });

    // Validar parâmetro entity (obrigatório segundo o código do utilizador)
    if (!entity) {
      console.error('❌ Parâmetro entity em falta');
      return new Response(JSON.stringify({ error: 'Parâmetro entity em falta' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!transactionId) {
      console.error('❌ Parâmetro transactionId em falta');
      return new Response(JSON.stringify({ error: 'Parâmetro transactionId em falta' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar order na tabela 'orders' pelo transactionId
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, products(id, name, user_id, member_area_id, access_duration_type, access_duration_value)')
      .eq('appypay_transaction_id', transactionId)
      .maybeSingle();

    if (orderError) {
      console.error('❌ Erro ao buscar order:', orderError);
      return new Response(JSON.stringify({ error: 'Erro interno' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!order) {
      console.error('❌ Order não encontrada para transactionId:', transactionId);
      return new Response(JSON.stringify({ error: 'Order não encontrada' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📦 Order encontrada:', order.order_id, 'status atual:', order.status);

    // Se já está completed, não processar novamente
    if (order.status === 'completed') {
      console.log('⚠️ Order já está completed, ignorando:', order.order_id);
      return new Response(JSON.stringify({ message: 'Callback recebido com sucesso' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ✅ Atualizar status para 'completed' (equivalente a 'paid')
    console.log('✅ Atualizando order para completed...');
    
    const amount = parseFloat(order.amount);
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'completed', 
        updated_at: new Date().toISOString(),
        original_amount: amount,
        original_currency: 'MZN'
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar order:', updateError);
      return new Response(JSON.stringify({ error: 'Erro ao atualizar order' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Order atualizada para completed');

    const product = order.products;
    const sellerCommission = order.seller_commission || amount;

    // Criar customer_access
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
        }, { onConflict: 'customer_email,product_id' });

      if (accessError) {
        console.error('⚠️ Erro ao criar customer_access:', accessError);
      } else {
        console.log('✅ Customer access criado para:', order.customer_email);
      }
    } catch (accessErr) {
      console.error('⚠️ Erro no customer_access:', accessErr);
    }

    // Notificar vendedor via OneSignal
    try {
      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, user_id')
        .eq('user_id', product?.user_id)
        .maybeSingle();

      if (sellerProfile) {
        const formattedPrice = formatPrice(sellerCommission, 'MT');
        
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
              product_name: product?.name || 'Produto',
              url: 'https://mobile.kambafy.com/app'
            }
          }
        });
        
        console.log('✅ Notificação enviada ao vendedor');
      }
    } catch (notifyErr) {
      console.error('⚠️ Erro ao notificar vendedor:', notifyErr);
    }

    // Enviar email de confirmação
    try {
      await supabaseAdmin.functions.invoke('send-purchase-confirmation', {
        body: {
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          productName: product?.name || 'Produto',
          orderId: order.order_id,
          amount: amount.toString(),
          currency: 'MZN',
          productId: order.product_id,
          sellerId: product?.user_id,
          memberAreaId: product?.member_area_id,
          paymentMethod: order.payment_method,
          paymentStatus: 'completed'
        }
      });
      
      console.log('✅ Email de confirmação enviado');
    } catch (emailErr) {
      console.error('⚠️ Erro ao enviar email:', emailErr);
    }

    // Trigger webhooks do vendedor
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
            product_name: product?.name,
            payment_method: order.payment_method,
            timestamp: new Date().toISOString()
          },
          user_id: product?.user_id,
          order_id: order.order_id,
          product_id: order.product_id
        }
      });
      
      console.log('✅ Webhooks triggered');
    } catch (webhookErr) {
      console.error('⚠️ Erro nos webhooks:', webhookErr);
    }

    // Enviar conversão Facebook
    try {
      const eventId = `sislog_${order.order_id}_${Date.now()}`;
      const nameParts = (order.customer_name || '').trim().split(' ');
      
      await supabaseAdmin.functions.invoke('send-facebook-conversion', {
        body: {
          productId: order.product_id,
          userId: product?.user_id,
          eventId: eventId,
          eventName: 'Purchase',
          value: amount,
          currency: 'MZN',
          orderId: order.order_id,
          customer: {
            email: order.customer_email,
            phone: order.customer_phone || '',
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
          },
          eventSourceUrl: `https://kambafy.com/checkout/${order.product_id}`
        }
      });
      
      console.log('✅ Facebook conversion enviada');
    } catch (fbErr) {
      console.error('⚠️ Erro Facebook conversion:', fbErr);
    }

    // 📊 ENVIAR CONVERSÃO PARA UTMIFY
    try {
      console.log('📊 Sending UTMify conversion...');
      
      const utmifyPayload = {
        orderId: order.order_id,
        orderUuid: order.id,
        amount: parseFloat(order.amount),
        currency: 'MZN',
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        customerCountry: 'Mozambique',
        productId: order.product_id,
        productName: product?.name || 'Produto',
        paymentMethod: order.payment_method,
        utmParams: order.utm_data || {},
        orderBumpData: order.order_bump_data
      };
      
      const { data: utmResult, error: utmError } = await supabaseAdmin.functions.invoke('send-utmify-conversion', {
        body: utmifyPayload
      });
      
      if (utmError) {
        console.error('❌ UTMify error:', utmError);
      } else {
        console.log('✅ UTMify conversion sent:', utmResult);
      }
    } catch (utmifyError) {
      console.error('❌ UTMify process error:', utmifyError);
    }

    // Processar order bumps
    if (order.order_bump_data) {
      try {
        const bumps = Array.isArray(order.order_bump_data) ? order.order_bump_data : [order.order_bump_data];
        
        for (const bump of bumps) {
          if (bump.bump_product_id) {
            await supabaseAdmin
              .from('customer_access')
              .upsert({
                customer_email: order.customer_email.toLowerCase().trim(),
                customer_name: order.customer_name,
                product_id: bump.bump_product_id,
                order_id: order.order_id,
                is_active: true,
                access_granted_at: new Date().toISOString()
              }, { onConflict: 'customer_email,product_id' });
            
            console.log('✅ Order bump access criado:', bump.bump_product_id);
          }
        }
      } catch (bumpErr) {
        console.error('⚠️ Erro order bumps:', bumpErr);
      }
    }

    console.log('✅ SISLOG callback processado com sucesso');

    // Resposta igual ao Laravel: { message: 'Callback recebido com sucesso' }
    return new Response(JSON.stringify({ message: 'Callback recebido com sucesso' }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no sislog-callback:', error);
    return new Response(JSON.stringify({ error: 'Erro interno', details: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
