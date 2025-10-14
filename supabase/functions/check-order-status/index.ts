import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckOrderRequest {
  orderId?: string;
  sessionId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[CHECK-ORDER-STATUS] Request received');

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
    const { orderId, sessionId }: CheckOrderRequest = await req.json();
    console.log('[CHECK-ORDER-STATUS] Checking order:', { orderId, sessionId });

    if (!orderId && !sessionId) {
      throw new Error('Order ID or Session ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar encomenda pelo order_id ou session_id
    let query = supabase
      .from('orders')
      .select('*');
    
    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (sessionId) {
      query = query.eq('stripe_session_id', sessionId);
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError) {
      console.error('[CHECK-ORDER-STATUS] Database error:', orderError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Erro ao buscar pedido',
        error: orderError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!order) {
      console.log('[CHECK-ORDER-STATUS] Order not found');
      return new Response(JSON.stringify({
        success: false,
        message: 'Pedido não encontrado'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('[CHECK-ORDER-STATUS] Order found:', {
      order_id: order.order_id,
      status: order.status,
      payment_method: order.payment_method
    });

    let paymentVerified = false;

    // Para AppyPay (express ou reference), SEMPRE verificar com a API
    if (['express', 'reference'].includes(order.payment_method)) {
      console.log('[CHECK-ORDER-STATUS] AppyPay payment detected - verifying with API...');
      
      // Chamar verify-appypay-order para atualizar status
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-appypay-order',
        { body: { orderId: order.id } }
      );

      if (verifyError) {
        console.error('[CHECK-ORDER-STATUS] Error verifying AppyPay:', verifyError);
      } else if (verifyData) {
        console.log('[CHECK-ORDER-STATUS] AppyPay verification result:', verifyData);
        
        // Se foi atualizado, buscar novamente
        if (verifyData.updated) {
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();
          
          if (updatedOrder) {
            order.status = updatedOrder.status;
          }
        }
        
        // Só considerar verificado se o status for 'completed'
        paymentVerified = verifyData.newStatus === 'completed' || order.status === 'completed';
      }
    } else if (order.payment_method === 'stripe') {
      // Para Stripe, confiar no status do banco de dados
      paymentVerified = order.status === 'completed';
    } else {
      // Para outros métodos (transfer, etc), confiar no status do banco
      paymentVerified = order.status === 'completed';
    }

    console.log('[CHECK-ORDER-STATUS] Final verification:', {
      status: order.status,
      paymentVerified
    });

    return new Response(JSON.stringify({
      success: true,
      order: order,
      paymentVerified: paymentVerified
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[CHECK-ORDER-STATUS] Error:', error);
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
