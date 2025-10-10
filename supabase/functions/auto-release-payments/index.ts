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
    // ETAPA 1: Processar liberações pendentes (já registradas mas sem crédito)
    // ============================================================
    logStep("🔍 ETAPA 1: Verificando liberações pendentes...");
    
    const { data: pendingReleases } = await supabase
      .from('payment_releases')
      .select(`
        id,
        order_id,
        user_id,
        amount,
        currency,
        release_date,
        orders!inner(
          customer_name,
          customer_email
        )
      `)
      .lte('release_date', new Date().toISOString());

    logStep(`📦 Encontradas ${pendingReleases?.length || 0} liberações registradas`);

    let creditedPending = 0;
    
    // Para cada liberação pendente, verificar se já tem crédito
    for (const release of pendingReleases || []) {
      // Verificar se já existe transação de crédito para esta ordem
      const { data: existingCredit } = await supabase
        .from('balance_transactions')
        .select('id')
        .eq('order_id', release.order_id)
        .eq('type', 'credit')
        .maybeSingle();

      if (!existingCredit) {
        // Criar transação de crédito para esta liberação pendente
        const netAmount = release.amount * 0.92; // 92% após taxa de 8%
        
        const { error: creditError } = await supabase
          .from('balance_transactions')
          .insert({
            user_id: release.user_id,
            type: 'credit',
            amount: netAmount,
            currency: release.currency,
            description: `Crédito de liberação automática (3 dias) - ${release.orders?.customer_name || 'Cliente'}`,
            order_id: release.order_id
          });

        if (creditError) {
          logStep(`⚠️ Erro ao creditar liberação pendente ${release.order_id}:`, creditError);
        } else {
          creditedPending++;
          logStep(`✅ Creditada liberação pendente: ${release.order_id} - ${netAmount} KZ`);
        }
      }
    }

    if (creditedPending > 0) {
      logStep(`💰 ETAPA 1 CONCLUÍDA: ${creditedPending} liberações pendentes creditadas`);
    } else {
      logStep(`ℹ️ ETAPA 1 CONCLUÍDA: Nenhuma liberação pendente para creditar`);
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
        logStep(`✅ ${newReleasesToRecord.length} novas liberações registradas no histórico`);
        
        // ✅ NOVO: Criar transações de crédito para creditar o saldo após 3 dias
        const balanceTransactions = newReleasesToRecord.map(order => ({
          user_id: order.userId,
          type: 'credit',
          amount: order.amount,
          currency: 'KZ',
          description: `Venda liberada após 3 dias - ${order.customerName}`,
          order_id: order.orderId
        }));
        
        const { error: transactionError } = await supabase
          .from('balance_transactions')
          .insert(balanceTransactions);
        
        if (transactionError) {
          logStep("⚠️ Aviso: Erro ao criar transações de crédito:", transactionError);
        } else {
          logStep(`💰 ${newReleasesToRecord.length} transações de crédito criadas`);
        }
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
      step1PendingCredited: creditedPending,
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
      message: `Liberação automática concluída - Etapa 1: ${creditedPending} pendentes creditados | Etapa 2: ${newReleasesToRecord.length} novas vendas liberadas`,
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