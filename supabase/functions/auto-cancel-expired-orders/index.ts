import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[AUTO-CANCEL] 🚀 Iniciando processo de cancelamento de pedidos expirados');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar pedidos pendentes com expires_at passado
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_id, payment_method, expires_at, created_at')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[AUTO-CANCEL] ❌ Erro ao buscar pedidos expirados:', fetchError);
      throw fetchError;
    }

    console.log(`[AUTO-CANCEL] 📋 Encontrados ${expiredOrders?.length || 0} pedidos expirados`);

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum pedido expirado para cancelar',
          cancelled_count: 0 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cancelledCount = 0;
    const cancelledOrders = [];

    // Cancelar cada pedido expirado
    for (const order of expiredOrders) {
      const cancellationReason = getCancellationReason(order.payment_method);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`[AUTO-CANCEL] ❌ Erro ao cancelar pedido ${order.order_id}:`, updateError);
      } else {
        cancelledCount++;
        cancelledOrders.push({
          order_id: order.order_id,
          payment_method: order.payment_method,
          reason: cancellationReason,
          expired_at: order.expires_at
        });
        console.log(`[AUTO-CANCEL] ✅ Pedido ${order.order_id} cancelado - ${cancellationReason}`);
      }
    }

    console.log(`[AUTO-CANCEL] 🏁 Processo concluído - ${cancelledCount} pedidos cancelados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cancelled_count: cancelledCount,
        cancelled_orders: cancelledOrders,
        total_found: expiredOrders.length
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[AUTO-CANCEL] 💥 Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function getCancellationReason(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'reference':
      return 'expired_reference';
    case 'express':
      return 'expired_payment_session';
    case 'card':
    case 'klarna':
    case 'multibanco':
      return 'expired_payment_session';
    default:
      return 'expired_payment_session';
  }
}
