import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('[FIX-MISSING-ACCESS] Function started');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FIX-MISSING-ACCESS] Processing request...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todas as vendas completed sem customer_access
    const { data: allCompletedOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        product_id,
        customer_email,
        customer_name,
        customer_phone,
        amount,
        currency,
        payment_method,
        status,
        created_at
      `)
      .in('payment_method', ['express', 'reference'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(500);

    if (fetchError) {
      throw new Error(`Error fetching orders: ${fetchError.message}`);
    }

    if (!allCompletedOrders || allCompletedOrders.length === 0) {
      console.log('[FIX-MISSING-ACCESS] No completed orders found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No completed orders found',
        fixed: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`[FIX-MISSING-ACCESS] Found ${allCompletedOrders.length} completed orders, checking for missing access...`);

    // Filtrar apenas pedidos sem acesso
    const ordersWithoutAccess = [];
    for (const order of allCompletedOrders) {
      const { data: existingAccess } = await supabase
        .from('customer_access')
        .select('id')
        .eq('order_id', order.order_id)
        .single();
      
      if (!existingAccess) {
        // Buscar dados do produto
        const { data: product } = await supabase
          .from('products')
          .select('id, name, share_link, member_area_id, access_duration_type, access_duration_value')
          .eq('id', order.product_id)
          .single();
        
        if (product) {
          ordersWithoutAccess.push({ ...order, products: product });
        }
      }
    }

    if (fetchError) {
      throw new Error(`Error fetching orders: ${fetchError.message}`);
    }

    if (!ordersWithoutAccess || ordersWithoutAccess.length === 0) {
      console.log('[FIX-MISSING-ACCESS] No orders without access found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No orders without access found',
        fixed: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`[FIX-MISSING-ACCESS] Found ${ordersWithoutAccess.length} orders without access`);

    let fixed = 0;
    let errors = 0;

    for (const order of ordersWithoutAccess) {
      try {
        const product = order.products;

        // Verificar se já existe acesso (pode ter sido criado entre queries)
        const { data: existingAccess } = await supabase
          .from('customer_access')
          .select('id')
          .eq('customer_email', order.customer_email.toLowerCase().trim())
          .eq('product_id', order.product_id)
          .single();

        if (existingAccess) {
          console.log(`[FIX-MISSING-ACCESS] Access already exists for order ${order.order_id}, skipping...`);
          continue;
        }

        // Calcular expiração de acesso
        const accessExpiresAt = product.access_duration_type === 'lifetime' || !product.access_duration_type
          ? null
          : (() => {
              const now = new Date();
              switch (product.access_duration_type) {
                case 'days':
                  return new Date(now.setDate(now.getDate() + product.access_duration_value));
                case 'months':
                  return new Date(now.setMonth(now.getMonth() + product.access_duration_value));
                case 'years':
                  return new Date(now.setFullYear(now.getFullYear() + product.access_duration_value));
                default:
                  return null;
              }
            })();

        // Criar customer_access
        const { error: accessError } = await supabase.from('customer_access').insert({
          customer_email: order.customer_email.toLowerCase().trim(),
          customer_name: order.customer_name,
          product_id: order.product_id,
          order_id: order.order_id,
          access_granted_at: new Date().toISOString(),
          access_expires_at: accessExpiresAt,
          is_active: true
        });

        if (accessError) {
          console.error(`[FIX-MISSING-ACCESS] Error creating access for order ${order.order_id}:`, accessError);
          errors++;
        } else {
          console.log(`[FIX-MISSING-ACCESS] ✅ Access created for order ${order.order_id}`);
          fixed++;

          // Enviar email de confirmação com link de acesso
          try {
            const confirmationPayload = {
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              customerPhone: order.customer_phone,
              productName: product.name,
              orderId: order.order_id,
              amount: order.amount,
              currency: order.currency,
              productId: order.product_id,
              shareLink: product.share_link,
              memberAreaId: product.member_area_id,
              paymentMethod: order.payment_method,
              paymentStatus: 'completed'
            };

            await supabase.functions.invoke('send-purchase-confirmation', {
              body: confirmationPayload
            });

            console.log(`[FIX-MISSING-ACCESS] ✅ Confirmation email sent for order ${order.order_id}`);
          } catch (emailError) {
            console.error(`[FIX-MISSING-ACCESS] Error sending email for order ${order.order_id}:`, emailError);
            // Não falhar a operação se email falhar
          }
        }
      } catch (orderError) {
        console.error(`[FIX-MISSING-ACCESS] Error processing order ${order.order_id}:`, orderError);
        errors++;
      }
    }

    console.log(`[FIX-MISSING-ACCESS] Completed. Fixed: ${fixed}, Errors: ${errors}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed ${fixed} orders, ${errors} errors`,
      fixed,
      errors,
      total: ordersWithoutAccess.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[FIX-MISSING-ACCESS] Error:', error);
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
