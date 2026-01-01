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

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Buscar pedidos pendentes: expires_at passado OU criados há mais de 7 dias
    const { data: expiredByDate, error: fetchError1 } = await supabase
      .from('orders')
      .select('id, order_id, payment_method, expires_at, created_at')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', now.toISOString());

    const { data: expiredByAge, error: fetchError2 } = await supabase
      .from('orders')
      .select('id, order_id, payment_method, expires_at, created_at')
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo);

    if (fetchError1 || fetchError2) {
      console.error('[AUTO-CANCEL] ❌ Erro ao buscar pedidos:', fetchError1 || fetchError2);
      throw fetchError1 || fetchError2;
    }

    // Combinar e remover duplicados
    const allExpired = [...(expiredByDate || []), ...(expiredByAge || [])];
    const uniqueIds = new Set<string>();
    const expiredOrders = allExpired.filter(order => {
      if (uniqueIds.has(order.id)) return false;
      uniqueIds.add(order.id);
      return true;
    });

    console.log(`[AUTO-CANCEL] 📋 Encontrados ${expiredOrders.length} pedidos para cancelar`);
    console.log(`[AUTO-CANCEL] ├─ Por expires_at: ${expiredByDate?.length || 0}`);
    console.log(`[AUTO-CANCEL] └─ Por idade (>7 dias): ${expiredByAge?.length || 0}`);

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
