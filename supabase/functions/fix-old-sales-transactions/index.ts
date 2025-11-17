import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Buscando vendas completed sem transações corretas...');

    // Buscar todas as vendas completed
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        amount,
        seller_commission,
        currency,
        created_at,
        product_id,
        products!inner(user_id)
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (ordersError) throw ordersError;

    console.log(`📦 Encontradas ${completedOrders?.length || 0} vendas completed`);

    let fixed = 0;
    let alreadyCorrect = 0;
    const errors: any[] = [];

    for (const order of completedOrders || []) {
      try {
        const sellerId = order.products.user_id;
        
        // Verificar se já tem as transações corretas
        const { data: existingTransactions } = await supabase
          .from('balance_transactions')
          .select('type, amount')
          .eq('order_id', order.order_id)
          .eq('user_id', sellerId);

        const hasPlatformFee = existingTransactions?.some(t => t.type === 'platform_fee');
        const hasSaleRevenue = existingTransactions?.some(t => t.type === 'sale_revenue');
        
        // Se já tem ambas as transações, pular
        if (hasPlatformFee && hasSaleRevenue) {
          alreadyCorrect++;
          continue;
        }

        console.log(`🔧 Corrigindo order_id: ${order.order_id}`);

        // Calcular valores corretos
        const grossAmount = parseFloat(order.amount);
        const netAmount = order.seller_commission 
          ? parseFloat(order.seller_commission)
          : grossAmount * 0.9101; // 8.99% de taxa
        const feeAmount = grossAmount - netAmount;

        // Se não tem platform_fee, criar
        if (!hasPlatformFee) {
          const { error: feeError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: sellerId,
              type: 'platform_fee',
              amount: -feeAmount,
              currency: order.currency || 'KZ',
              description: 'Taxa da plataforma (8.99%)',
              order_id: order.order_id,
              created_at: order.created_at
            });

          if (feeError && !feeError.message.includes('duplicate')) {
            throw feeError;
          }
        }

        // Se tem sale_revenue mas está com valor errado (bruto), corrigir
        const wrongRevenue = existingTransactions?.find(
          t => t.type === 'sale_revenue' && Math.abs(t.amount - grossAmount) < 0.01
        );

        if (wrongRevenue) {
          // Deletar revenue incorreto
          await supabase
            .from('balance_transactions')
            .delete()
            .eq('order_id', order.order_id)
            .eq('user_id', sellerId)
            .eq('type', 'sale_revenue')
            .eq('amount', grossAmount);
        }

        // Se não tem sale_revenue correto, criar
        if (!hasSaleRevenue || wrongRevenue) {
          const { error: revenueError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: sellerId,
              type: 'sale_revenue',
              amount: netAmount,
              currency: order.currency || 'KZ',
              description: 'Receita de venda (valor líquido após taxa de 8.99%)',
              order_id: order.order_id,
              created_at: order.created_at
            });

          if (revenueError && !revenueError.message.includes('duplicate')) {
            throw revenueError;
          }
        }

        // Recalcular saldo do vendedor
        await supabase.rpc('recalculate_user_balance', { target_user_id: sellerId });

        fixed++;
        console.log(`✅ Corrigido: ${order.order_id}`);

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${order.order_id}:`, error);
        errors.push({
          order_id: order.order_id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Correção concluída',
        statistics: {
          total_orders: completedOrders?.length || 0,
          fixed,
          already_correct: alreadyCorrect,
          errors: errors.length
        },
        errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
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
