import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAllPaymentMethods } from '@/utils/paymentMethods';
import { countOrderItems } from '@/utils/orderUtils';

/**
 * ⚠️ IMPORTANTE - PADRÃO DE USO CORRETO:
 * 
 * Este hook retorna uma função estável (loadOrdersWithStats) que NÃO deve ser
 * incluída como dependência em useCallback/useEffect de componentes.
 * 
 * ❌ ERRADO:
 * const loadData = useCallback(async () => {
 *   await loadOrdersWithStats(...);
 * }, [loadOrdersWithStats]); // ← Causa loops infinitos
 * 
 * ✅ CORRETO:
 * const loadData = useCallback(async () => {
 *   await loadOrdersWithStats(...);
 * }, [user, toast]); // ← Sem incluir loadOrdersWithStats
 * 
 * E no useEffect, use um useRef para garantir execução única:
 * const hasLoadedRef = useRef(false);
 * useEffect(() => {
 *   if (user && !hasLoadedRef.current) {
 *     hasLoadedRef.current = true;
 *     loadData();
 *   }
 * }, [user, loadData]);
 */
export const useStreamingQuery = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const isLoadingRef = useRef(false); // ✅ Proteção contra chamadas simultâneas

  // 🔥 VERSÃO PARA TODAS AS VENDAS - Chunks maiores, todos os dados (vendas próprias + afiliado)
  const loadOrdersWithStats = useCallback(async (
    userId: string,
    onStatsUpdate: (stats: any) => void,
    onOrdersChunk: (orders: any[]) => void,
    chunkSize = 500 // ⚡ Chunks MUITO maiores para carregar mais rápido
  ) => {
    // ✅ PROTEÇÃO: Evitar chamadas simultâneas
    if (isLoadingRef.current) {
      console.warn('⚠️ useStreamingQuery: Tentativa de chamada simultânea bloqueada');
      return;
    }
    
    isLoadingRef.current = true;
    
    // Cancelar query anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      const startTime = performance.now();

      // Primeiro, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', userId)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      // 📊 STATS RÁPIDOS - vendas dos produtos do usuário (incluindo vendas locais)
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];

      // Buscar member_areas do usuário para incluir module_payments
      const { data: memberAreas, error: memberAreasError } = await supabase
        .from('member_areas')
        .select('id')
        .eq('user_id', userId);

      if (memberAreasError) throw memberAreasError;

      const memberAreaIds = memberAreas?.map(ma => ma.id) || [];
      
      if (userProductIds.length === 0 && memberAreaIds.length === 0) {
        console.log('⚠️ Usuário não tem produtos nem member areas, retornando dados vazios');
        setTotalCount(0);
        onStatsUpdate({
          paid: 0, pending: 0, cancelled: 0,
          paidTotal: 0, pendingTotal: 0, cancelledTotal: 0,
          totalAffiliateCommissions: 0,
          totalSellerEarnings: 0,
          ...getAllPaymentMethods().reduce((methodsAcc, method) => {
            methodsAcc[method.id] = 0;
            return methodsAcc;
          }, {} as Record<string, number>)
        });
        onOrdersChunk([]);
        return;
      }

      // Buscar vendas de produtos normais - TODAS as vendas
      let ownSalesData: any[] = [];
      if (userProductIds.length > 0) {
        const { data, error: ownSalesError } = await supabase
          .from('orders')
          .select('status, payment_method, amount, affiliate_commission, seller_commission, product_id, order_id, order_bump_data')
          .in('product_id', userProductIds)
          .in('status', ['completed', 'pending', 'failed', 'cancelled']); // Todas as vendas

        if (ownSalesError) throw ownSalesError;
        ownSalesData = data || [];
      }

      // Buscar vendas de módulos - TODAS as vendas
      let moduleSalesData: any[] = [];
      if (memberAreaIds.length > 0) {
        const { data, error: moduleSalesError } = await supabase
          .from('module_payments')
          .select('status, payment_method, amount, member_area_id, order_id')
          .in('member_area_id', memberAreaIds)
          .in('status', ['completed', 'pending', 'failed', 'cancelled']); // Todas as vendas

        if (moduleSalesError) throw moduleSalesError;
        moduleSalesData = data || [];
      }

      // Vendas recuperadas removidas - sistema de recuperação desabilitado
      const recoveredOrderIds = new Set();

      // 📊 STATS RÁPIDOS - vendas como afiliado - TODAS as vendas
      let affiliateSalesData: any[] = [];
      if (userAffiliateCodes.length > 0) {
        const { data: affiliateData, error: affiliateDataError } = await supabase
          .from('orders')
          .select('status, payment_method, amount, affiliate_commission, seller_commission, affiliate_code, order_bump_data')
          .in('affiliate_code', userAffiliateCodes)
          .not('affiliate_commission', 'is', null)
          .in('status', ['completed', 'pending', 'failed', 'cancelled']); // Todas as vendas

        if (affiliateDataError) throw affiliateDataError;
        affiliateSalesData = affiliateData || [];
      }

      // Buscar saldo real do customer_balances (fonte de verdade)
      const { data: balanceData, error: balanceError } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (balanceError) {
        console.error('Error loading balance:', balanceError);
      }

      const realBalance = balanceData?.balance || 0;

      const statsData = [...ownSalesData, ...moduleSalesData, ...affiliateSalesData];

      console.log(`📊 STATS INPUT DATA:`, {
        ownSales: ownSalesData.length,
        moduleSales: moduleSalesData.length,
        affiliateSales: affiliateSalesData.length,
        total: statsData.length
      });

      // ✅ CALCULAR STATS POR STATUS: completed, pending, cancelled/failed
      // ✅ CONTAR ORDER BUMPS SEPARADAMENTE (igual ao Dashboard)
      // Todos os valores representam o que o vendedor VAI RECEBER
      // Isso garante que Dashboard, Vendas e Financeiro mostrem os mesmos valores
      const stats = (statsData || []).reduce((acc, order) => {
        const isAffiliateEarning = userAffiliateCodes.includes(order.affiliate_code);
        
        // ✅ Contar items (principal + order bumps) usando countOrderItems
        const itemCount = countOrderItems(order);
        
        // Calcular valor de acordo com tipo de venda
        let orderValue = 0;
        if (isAffiliateEarning) {
          // Para vendas como afiliado, mostra apenas a comissão que ele recebe
          orderValue = parseFloat(order.affiliate_commission?.toString() || '0');
        } else {
          // Para vendas próprias - usar seller_commission (lucro após descontar comissão do afiliado)
          // Se não tiver seller_commission, usar amount (vendas antigas)
          let sellerEarning = parseFloat(order.seller_commission?.toString() || '0');
          
          if (sellerEarning === 0) {
            // Venda antiga sem comissão registrada - usar valor total
            sellerEarning = parseFloat(order.amount || '0');
          }
          
          orderValue = sellerEarning;
        }
        
        // ✅ Separar por status
        if (order.status === 'completed') {
          acc.paid += itemCount;
          acc.paidTotal += orderValue;
          
          if (isAffiliateEarning) {
            acc.totalAffiliateCommissions += orderValue;
          }
          
          // Contar vendas pagas por método de pagamento
          if (order.payment_method) {
            if (!acc[order.payment_method]) {
              acc[order.payment_method] = 0;
            }
            acc[order.payment_method] += itemCount;
          }
        } else if (order.status === 'pending') {
          acc.pending += itemCount;
          acc.pendingTotal += orderValue;
        } else if (order.status === 'failed' || order.status === 'cancelled') {
          acc.cancelled += itemCount;
          acc.cancelledTotal += orderValue;
        }

        return acc;
      }, {
        paid: 0, pending: 0, cancelled: 0,
        paidTotal: 0, pendingTotal: 0, cancelledTotal: 0,
        totalAffiliateCommissions: 0,
        totalSellerEarnings: realBalance, // ✅ USAR saldo real do customer_balances
        // Inicializar contadores para todos os métodos de pagamento
        ...getAllPaymentMethods().reduce((methodsAcc, method) => {
          methodsAcc[method.id] = 0;
          return methodsAcc;
        }, {} as Record<string, number>)
      });

      console.log('📊 RESUMO FINAL DAS STATS:', {
        totalVendas: statsData?.length || 0,
        paid: stats.paid,
        paidTotal: stats.paidTotal,
        pending: stats.pending,
        pendingTotal: stats.pendingTotal,
        cancelled: stats.cancelled,
        cancelledTotal: stats.cancelledTotal,
        totalAffiliateCommissions: stats.totalAffiliateCommissions,
        totalSellerEarnings: stats.totalSellerEarnings,
        nota: 'paidTotal representa LUCRO REAL do vendedor (seller_commission + affiliate_commission)'
      });

      console.log('🔍 DETALHAMENTO POR STATUS:');
      const completedSales = statsData.filter(o => o.status === 'completed');
      const pendingSales = statsData.filter(o => o.status === 'pending');
      const failedSales = statsData.filter(o => o.status === 'failed' || o.status === 'cancelled');
      
      // Calcular lucro real para cada categoria
      const completedEarnings = completedSales.reduce((sum, o) => {
        const isAffiliate = userAffiliateCodes.includes(o.affiliate_code);
        if (isAffiliate) {
          return sum + parseFloat(o.affiliate_commission?.toString() || '0');
        }
        const sellerEarning = parseFloat(o.seller_commission?.toString() || '0') || parseFloat(o.amount || '0');
        return sum + sellerEarning;
      }, 0);
      
      console.log(`  ✅ Completed: ${completedSales.length} vendas, lucro real: ${completedEarnings.toFixed(2)} KZ`);
      console.log(`  ⏳ Pending: ${pendingSales.length} vendas`);
      console.log(`  ❌ Failed/Cancelled: ${failedSales.length} vendas`);

      setTotalCount(statsData?.length || 0);
      onStatsUpdate(stats);

      // 📋 CARREGANDO TODAS AS VENDAS progressivamente (próprias + afiliado)
      console.log('⚡ Iniciando carregamento RÁPIDO de vendas (chunks de 500)...');
      let offset = 0;
      let hasMore = true;
      const allOrders: any[] = [];
      let chunkNumber = 1;

      // Usar as vendas recuperadas já buscadas anteriormente

      // Carregar vendas de produtos normais
      if (userProductIds.length > 0) {
        while (hasMore) {
          console.log(`📦 Carregando chunk ${chunkNumber} de vendas próprias (offset: ${offset}, size: ${chunkSize})`);
          
          const { data: ownOrders, error: ownOrdersError } = await supabase
            .from('orders')
            .select(`
              id,
              order_id,
              customer_name,
              customer_email,
              customer_phone,
              amount,
              currency,
              status,
              payment_method,
              created_at,
              product_id,
              affiliate_code,
              affiliate_commission,
              seller_commission,
              order_bump_data
            `)
            .in('product_id', userProductIds)
            .order('created_at', { ascending: false })
            .range(offset, offset + chunkSize - 1);

          if (ownOrdersError) throw ownOrdersError;
          
          if (!ownOrders || ownOrders.length === 0) {
            console.log('🔚 Não há mais vendas próprias para carregar');
            break;
          }

          console.log(`✅ Chunk ${chunkNumber} vendas próprias: ${ownOrders.length} vendas carregadas`);

          // Buscar produtos para este chunk
          const productIds = [...new Set(ownOrders.map(o => o.product_id))];
          const { data: products } = await supabase
            .from('products')
            .select('id, name, cover, type, price')
            .in('id', productIds);

          // Combinar dados e marcar tipo de venda
          const productMap = new Map(products?.map(p => [p.id, p]) || []);
          const ordersWithProducts = ownOrders.map(order => {
            // Verificar se é venda recuperada
            const isRecovered = recoveredOrderIds.has(order.order_id);
            
            // Debug detalhado da venda antes de processar
            console.log(`🔍 VENDA RAW DO BANCO:`, {
              orderId: order.order_id,
              customer: order.customer_name,
              amount: order.amount,
              currency: order.currency,
              tipo: 'própria'
            });
            
            return {
              ...order,
              // Preservar moeda e valor originais para exibição
              original_amount: order.amount,
              original_currency: order.currency,
              products: productMap.get(order.product_id) || null,
              sale_type: isRecovered ? 'recovered' : 'own' // Marcar como recuperada ou própria
            };
          });

          allOrders.push(...ordersWithProducts);

          // Verifica se há mais dados
          hasMore = ownOrders.length === chunkSize;

          offset += chunkSize;
          chunkNumber++;

          console.log(`📊 Total acumulado (próprias): ${allOrders.length} vendas | Continuar: ${hasMore}`);
        }
      }

      // Carregar pagamentos de módulos
      if (memberAreaIds.length > 0) {
        console.log('💳 Carregando pagamentos de módulos...');
        
        const { data: modulePayments, error: modulePaymentsError } = await supabase
          .from('module_payments')
          .select(`
            id,
            order_id,
            student_name,
            student_email,
            amount,
            currency,
            status,
            payment_method,
            created_at,
            module_id,
            reference_number,
            entity,
            due_date,
            modules (
              title,
              cover_image_url
            )
          `)
          .in('member_area_id', memberAreaIds)
          .order('created_at', { ascending: false });

        if (modulePaymentsError) throw modulePaymentsError;

        if (modulePayments && modulePayments.length > 0) {
          console.log(`✅ Pagamentos de módulos: ${modulePayments.length} pagamentos carregados`);
          
          // Converter module_payments para formato compatível com orders
          const moduleOrdersWithType = modulePayments.map(payment => {
            console.log(`🔍 MODULE PAYMENT RAW:`, {
              orderId: payment.order_id,
              customer: payment.student_name,
              amount: payment.amount,
              currency: payment.currency,
              tipo: 'módulo'
            });
            
            return {
              id: payment.id,
              order_id: payment.order_id,
              customer_name: payment.student_name,
              customer_email: payment.student_email,
              customer_phone: null,
              amount: payment.amount.toString(),
              currency: payment.currency,
              original_amount: payment.amount.toString(),
              original_currency: payment.currency,
              status: payment.status,
              payment_method: payment.payment_method,
              created_at: payment.created_at,
              product_id: payment.module_id,
              affiliate_code: null,
              affiliate_commission: null,
              seller_commission: payment.amount,
              products: payment.modules ? {
                id: payment.module_id,
                name: payment.modules.title,
                cover: payment.modules.cover_image_url,
                type: 'module',
                price: payment.amount.toString()
              } : null,
              sale_type: 'module', // Marcar como venda de módulo
              reference_number: payment.reference_number,
              entity: payment.entity,
              due_date: payment.due_date
            };
          });

          allOrders.push(...moduleOrdersWithType);
        }
      }

      // Carregar vendas como afiliado se existirem códigos (excluindo vendas próprias)
      if (userAffiliateCodes.length > 0) {
        console.log('📋 Carregando vendas como afiliado...');
        
        const { data: affiliateOrders, error: affiliateOrdersError } = await supabase
          .from('orders')
          .select(`
            id,
            order_id,
            customer_name,
            customer_email,
            customer_phone,
            amount,
            currency,
            status,
            payment_method,
            created_at,
            product_id,
            affiliate_code,
            affiliate_commission,
            seller_commission,
            order_bump_data,
            products (
              id,
              name,
              cover,
              type,
              price
            )
          `)
          .in('affiliate_code', userAffiliateCodes)
          .not('affiliate_commission', 'is', null)
          .in('status', ['completed', 'pending', 'cancelled', 'failed']) // Incluir todas as vendas
          // Excluir vendas de produtos próprios para evitar duplicação
          .not('product_id', 'in', `(${userProductIds.length > 0 ? userProductIds.join(',') : 'null'})`)
          .order('created_at', { ascending: false });

        if (affiliateOrdersError) throw affiliateOrdersError;

        if (affiliateOrders && affiliateOrders.length > 0) {
          console.log(`✅ Vendas como afiliado: ${affiliateOrders.length} vendas carregadas`);
          
          // Marcar como vendas de afiliado
          const affiliateOrdersWithType = affiliateOrders.map(order => {
            // Debug detalhado da venda de afiliado
            console.log(`🔍 VENDA AFILIADO RAW:`, {
              orderId: order.order_id,
              customer: order.customer_name,
              amount: order.amount,
              currency: order.currency,
              tipo: 'afiliado'
            });
            
            return {
              ...order,
              // Preservar moeda e valor originais para exibição
              original_amount: order.amount,
              original_currency: order.currency,
              sale_type: 'affiliate' // Marcar como venda de afiliado
            };
          });

          allOrders.push(...affiliateOrdersWithType);
        }
      }

      // Ordenar todas as vendas por data
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      onOrdersChunk([...allOrders]); // Envia TODOS os dados acumulados

      console.log(`🎯 CARREGAMENTO COMPLETO: ${allOrders.length} vendas de ${totalCount} em ${(performance.now() - startTime).toFixed(0)}ms`);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Erro no carregamento:', error);
        throw error;
      }
    } finally {
      // ✅ SEMPRE liberar o lock, mesmo em caso de erro
      isLoadingRef.current = false;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { loadOrdersWithStats, cancelStream, totalCount };
};