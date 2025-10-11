import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Log helper function
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RELEASE] ${timestamp} ${step}${detailsStr}`);
};

// Função para calcular data de liberação (3 dias corridos)
const calculateReleaseDate = (orderDate: Date): Date => {
  const releaseDate = new Date(orderDate);
  releaseDate.setDate(orderDate.getDate() + 3); // 3 dias corridos
  return releaseDate;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("🚀 Iniciando processo de liberação automática de pagamentos");

  try {
    // Criar cliente Supabase com service role key para operações administrativas
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    logStep("✅ Cliente Supabase configurado com service role");

    // ============================================================
    // ETAPA 1: Verificar se há vendas completed sem transações sale_revenue
    // (vendas antigas antes da correção do trigger)
    // ============================================================
    logStep("🔍 ETAPA 1: Verificando vendas sem transações...");
    
    const { data: ordersWithoutTransactions } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        user_id,
        amount,
        seller_commission,
        currency,
        created_at,
        customer_name,
        products!inner(
          id,
          name,
          user_id
        )
      `)
      .eq('status', 'completed');

    logStep(`📦 Encontradas ${ordersWithoutTransactions?.length || 0} vendas completed`);

    let fixedOldSales = 0;
    
    // Para cada venda, verificar se já tem transação sale_revenue
    for (const order of ordersWithoutTransactions || []) {
      // Verificar se já existe transação sale_revenue para esta ordem
      const { data: existingTransaction } = await supabase
        .from('balance_transactions')
        .select('id')
        .eq('order_id', order.order_id)
        .eq('type', 'sale_revenue')
        .maybeSingle();

      if (!existingTransaction) {
        // Verificar se tem platform_fee
        const { data: existingFee } = await supabase
          .from('balance_transactions')
          .select('id')
          .eq('order_id', order.order_id)
          .eq('type', 'platform_fee')
          .maybeSingle();
        
        // Acessar products corretamente (é um objeto, não array, quando usa !inner)
        const sellerId = (order.products as any)?.user_id || order.user_id;
        const productName = (order.products as any)?.name || 'Produto';
        
        // Usar seller_commission se disponível (já tem valor líquido 92%)
        // Senão usar amount e calcular 92%
        let netAmount: number;
        let feeAmount: number;
        
        if (order.seller_commission) {
          // seller_commission = valor líquido (já descontado 8%)
          netAmount = parseFloat(order.seller_commission);
          feeAmount = netAmount * 0.08 / 0.92; // Calcular fee a partir do líquido
        } else {
          // amount = valor bruto (precisa descontar 8%)
          const grossAmount = parseFloat(order.amount || '0');
          feeAmount = grossAmount * 0.08;
          netAmount = grossAmount * 0.92;
        }
        
        // Criar taxa da plataforma (negativa) se não existir
        if (!existingFee) {
          const { error: feeError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: sellerId,
              type: 'platform_fee',
              amount: -feeAmount,
              currency: order.currency || 'KZ',
              description: `Taxa da plataforma Kambafy (8%) - Correção automática`,
              order_id: order.order_id,
              created_at: order.created_at
            });

          if (feeError) {
            logStep(`⚠️ Erro ao criar taxa para ${order.order_id}:`, feeError);
            continue;
          }
        }

        // Criar receita líquida (positiva)
        const { error: revenueError } = await supabase
          .from('balance_transactions')
          .insert({
            user_id: sellerId,
            type: 'sale_revenue',
            amount: netAmount,
            currency: order.currency || 'KZ',
            description: `Receita de venda (valor líquido) - ${productName} - Correção automática`,
            order_id: order.order_id,
            created_at: order.created_at
          });

        if (revenueError) {
          logStep(`⚠️ Erro ao criar receita para ${order.order_id}:`, revenueError);
        } else {
          fixedOldSales++;
          logStep(`✅ Corrigida venda antiga: ${order.order_id} - Líquido: ${netAmount} KZ, Taxa: ${feeAmount} KZ`);
        }
      }
    }

    if (fixedOldSales > 0) {
      logStep(`💰 ETAPA 1 CONCLUÍDA: ${fixedOldSales} vendas antigas corrigidas`);
    } else {
      logStep(`ℹ️ ETAPA 1 CONCLUÍDA: Todas as vendas já têm transações`);
    }

    // ============================================================
    // ETAPA 2: Registrar e creditar novas liberações
    // ============================================================
    logStep("🔍 ETAPA 2: Processando novas liberações...");

    // Buscar vendas já liberadas para evitar duplicatas
    const { data: alreadyReleased } = await supabase
      .from('payment_releases')
      .select('order_id');

    const releasedOrderIds = new Set(alreadyReleased?.map(r => r.order_id) || []);
    logStep(`🔒 ${releasedOrderIds.size} vendas já registradas em payment_releases`);

    // Buscar todas as vendas completed que ainda não foram liberadas
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        user_id,
        amount,
        seller_commission,
        currency,
        created_at,
        customer_name,
        customer_email,
        products (
          id,
          name,
          user_id
        )
      `)
      .eq('status', 'completed')
      .not('order_id', 'in', `(${Array.from(releasedOrderIds).map(id => `"${id}"`).join(',') || '""'})`)
      .order('created_at', { ascending: true });

    if (ordersError) {
      logStep("❌ Erro ao buscar orders:", ordersError);
      throw ordersError;
    }

    logStep(`📋 Encontradas ${orders?.length || 0} vendas pendentes de liberação`);

    const now = new Date();
    const releasedOrders: Array<{
      orderId: string;
      userId: string;
      amount: number;
      releaseDate: Date;
      customerName: string;
    }> = [];

    let totalReleasedAmount = 0;
    const userReleases: { [userId: string]: { amount: number; orders: number } } = {};

    // Processar cada venda
    for (const order of orders || []) {
      const orderDate = new Date(order.created_at);
      const releaseDate = calculateReleaseDate(orderDate);
      
      // Verificar se hoje é o dia de liberação ou posterior
      const releaseStart = new Date(releaseDate);
      releaseStart.setHours(0, 0, 0, 0);
      
      const nowStart = new Date(now);
      nowStart.setHours(0, 0, 0, 0);

      if (nowStart >= releaseStart) {
        // Buscar dados do produto
        const sellerId = order.products?.[0]?.user_id || order.user_id;
        const productName = order.products?.[0]?.name || 'Produto';
        
        // Verificar se já tem sale_revenue para esta venda
        const { data: existingRevenue } = await supabase
          .from('balance_transactions')
          .select('id')
          .eq('order_id', order.order_id)
          .eq('type', 'sale_revenue')
          .maybeSingle();

        // Calcular valores (usar seller_commission quando disponível, senão amount * 0.92)
        const grossAmount = parseFloat(order.seller_commission || order.amount || '0');
        const netAmount = grossAmount; // seller_commission já tem o valor líquido (92%)
        
        // ⚠️ CRÍTICO: SEMPRE criar sale_revenue se não existir
        if (!existingRevenue) {
          logStep(`🔄 Criando sale_revenue para ${order.order_id}...`, {
            grossAmount,
            netAmount,
            sellerId,
            orderDate: order.created_at
          });
          
          // Criar transação sale_revenue (positiva)
          const { error: revenueError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: sellerId,
              type: 'sale_revenue',
              amount: netAmount,
              currency: order.currency || 'KZ',
              description: `Receita de venda liberada após 3 dias - ${productName}`,
              order_id: order.order_id
            });

          if (revenueError) {
            logStep(`❌ ERRO ao criar sale_revenue para ${order.order_id}:`, revenueError);
            // NÃO continuar - se falhou, não registrar em payment_releases
            continue;
          }
          
          logStep(`✅ Sale_revenue criado com sucesso: ${order.order_id} = ${netAmount} KZ`);
        } else {
          logStep(`ℹ️ Sale_revenue já existe para ${order.order_id}, pulando criação`);
        }

        const amount = parseFloat(order.amount || '0');
        
        releasedOrders.push({
          orderId: order.order_id,
          userId: order.user_id,
          amount: amount,
          releaseDate: releaseDate,
          customerName: order.customer_name
        });

        totalReleasedAmount += amount;

        // Agrupar por usuário
        if (!userReleases[order.user_id]) {
          userReleases[order.user_id] = { amount: 0, orders: 0 };
        }
        userReleases[order.user_id].amount += amount;
        userReleases[order.user_id].orders += 1;

        logStep(`💰 Ordem liberada: ${order.order_id} - ${amount} ${order.currency}`, {
          userId: order.user_id,
          orderDate: orderDate.toISOString(),
          releaseDate: releaseDate.toISOString()
        });
      }
    }

    logStep(`🎯 Total de vendas liberadas: ${releasedOrders.length}`);
    logStep(`💵 Valor total liberado: ${totalReleasedAmount.toLocaleString()} KZ`);

    // Registrar liberações no histórico (verificar se vendas já foram liberadas)
    const { data: existingReleases } = await supabase
      .from('payment_releases')
      .select('order_id')
      .in('order_id', releasedOrders.map(o => o.orderId));

    const existingOrderIds = new Set(existingReleases?.map(r => r.order_id) || []);
    const newReleasesToRecord = releasedOrders.filter(order => !existingOrderIds.has(order.orderId));

    // Registrar apenas as novas liberações no histórico
    if (newReleasesToRecord.length > 0) {
      const releaseRecords = newReleasesToRecord.map(order => ({
        user_id: order.userId,
        order_id: order.orderId,
        amount: order.amount,
        currency: 'KZ',
        release_date: order.releaseDate.toISOString(),
        processed_at: now.toISOString()
      }));

      const { error: insertError } = await supabase
        .from('payment_releases')
        .insert(releaseRecords);

      if (insertError) {
        logStep("⚠️ Aviso: Erro ao registrar liberações no histórico:", insertError);
      } else {
        logStep(`✅ ${newReleasesToRecord.length} novas liberações registradas e creditadas no saldo disponível`);
      }
    } else {
      logStep("ℹ️ Nenhuma nova liberação para registrar");
    }

    // Log resumo por usuário
    Object.entries(userReleases).forEach(([userId, data]) => {
      logStep(`👤 Usuário ${userId}: ${data.orders} vendas liberadas = ${data.amount.toLocaleString()} KZ`);
    });

    // Resposta com resumo
    const summary = {
      processedAt: now.toISOString(),
      step1OldSalesFixed: fixedOldSales,
      step2NewReleasesFound: orders?.length || 0,
      step2NewReleasesProcessed: releasedOrders.length,
      step2NewReleasesRecorded: newReleasesToRecord.length,
      totalAmountReleased: totalReleasedAmount,
      usersSummary: Object.keys(userReleases).length,
      releasedOrders: releasedOrders.map(order => ({
        orderId: order.orderId,
        amount: order.amount,
        customerName: order.customerName,
        releaseDate: order.releaseDate.toISOString()
      }))
    };

    logStep("🏁 Processo de liberação automática concluído com sucesso", summary);

    return new Response(JSON.stringify({
      success: true,
      message: `Liberação automática concluída - Etapa 1: ${fixedOldSales} vendas antigas corrigidas | Etapa 2: ${newReleasesToRecord.length} novas vendas liberadas`,
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("💥 ERRO no processo de liberação automática:", { error: errorMessage });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      processedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});