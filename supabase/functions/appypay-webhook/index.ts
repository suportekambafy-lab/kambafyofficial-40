
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    
    console.log('AppyPay webhook received:', webhookData);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar a ordem pelo ID da AppyPay
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('appypay_charge_id', webhookData.charge_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response('Order not found', { status: 404 });
    }

    let newStatus = 'pending';
    
    // Mapear status da AppyPay para nosso sistema
    switch (webhookData.status) {
      case 'paid':
      case 'completed':
        newStatus = 'completed';
        break;
      case 'failed':
      case 'expired':
        newStatus = 'failed';
        break;
      case 'pending':
      default:
        newStatus = 'pending';
        break;
    }

    // Atualizar status da ordem
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response('Error updating order', { status: 500 });
    }

    // Se pagamento foi completado, enviar email de confirmação
    if (newStatus === 'completed') {
      try {
        await supabase.functions.invoke('send-purchase-confirmation', {
          body: {
            orderId: order.order_id,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            productName: order.product_name || 'Produto',
            amount: order.amount
          }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }
    }

    console.log(`Order ${order.order_id} status updated to: ${newStatus}`);

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
