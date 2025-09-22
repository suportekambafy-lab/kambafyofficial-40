import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAllPaymentMethods } from '@/utils/paymentMethods';

export const useStreamingQuery = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 🔥 VERSÃO PARA TODAS AS VENDAS - Chunks maiores, todos os dados (vendas próprias + afiliado)
  const loadOrdersWithStats = useCallback(async (
    userId: string,
    onStatsUpdate: (stats: any) => void,
    onOrdersChunk: (orders: any[]) => void,
    chunkSize = 100 // Chunks maiores para eficiência
  ) => {
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
      
      if (userProductIds.length === 0) {
        console.log('⚠️ Usuário não tem produtos, retornando dados vazios');
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

      const { data: ownSalesData, error: ownSalesError } = await supabase
        .from('orders')
        .select('status, payment_method, amount, affiliate_commission, seller_commission, product_id, order_id')
        .in('product_id', userProductIds)
        .in('status', ['completed', 'pending', 'cancelled', 'failed']); // Incluir todas as vendas

      if (ownSalesError) throw ownSalesError;

      // Buscar vendas recuperadas para calcular stats corretos
      const { data: recoveredPurchases } = await supabase
        .from('abandoned_purchases')
        .select('recovered_order_id')
        .eq('status', 'recovered')
        .not('recovered_order_id', 'is', null);

      const recoveredOrderIds = new Set(
        recoveredPurchases?.map(p => p.recovered_order_id).filter(Boolean) || []
      );

      // 📊 STATS RÁPIDOS - vendas como afiliado
      let affiliateSalesData: any[] = [];
      if (userAffiliateCodes.length > 0) {
        const { data: affiliateData, error: affiliateDataError } = await supabase
          .from('orders')
          .select('status, payment_method, amount, affiliate_commission, seller_commission, affiliate_code')
          .in('affiliate_code', userAffiliateCodes)
          .not('affiliate_commission', 'is', null)
          .in('status', ['completed', 'pending', 'cancelled', 'failed']); // Incluir todas as vendas

        if (affiliateDataError) throw affiliateDataError;
        affiliateSalesData = affiliateData || [];
      }

      const statsData = [...(ownSalesData || []), ...affiliateSalesData];

      // Calcular stats - vendas próprias + comissões de afiliado
      const stats = (statsData || []).reduce((acc, order) => {
        let amount = parseFloat(order.amount) || 0;
        const isAffiliateEarning = userAffiliateCodes.includes(order.affiliate_code);
        const isRecovered = recoveredOrderIds.has(order.order_id);
        
        if (isAffiliateEarning) {
          // Para vendas como afiliado, mostra apenas a comissão
          const affiliateCommission = parseFloat(order.affiliate_commission?.toString() || '0');
          acc.paid++;
          acc.paidTotal += affiliateCommission;
          acc.totalAffiliateCommissions += affiliateCommission;
        } else {
          // Para vendedores, converter para KZ se necessário
          let sellerCommission = parseFloat(order.seller_commission?.toString() || '0');
          if (sellerCommission === 0) {
            // Para vendas antigas sem seller_commission, converter para KZ
            if (order.currency === 'EUR') {
              sellerCommission = amount * 1053; // Taxa EUR->KZ
            } else if (order.currency === 'MZN') {
              sellerCommission = amount * 14.3; // Taxa MZN->KZ
            } else {
              sellerCommission = amount; // Se já está em KZ
            }
          } else {
            // Se há seller_commission mas pode estar em moeda personalizada, converter
            if (order.currency && order.currency !== 'KZ') {
              const exchangeRates: Record<string, number> = {
                'EUR': 1053, // 1 EUR = ~1053 KZ
                'MZN': 14.3  // 1 MZN = ~14.3 KZ
              };
              const rate = exchangeRates[order.currency.toUpperCase()] || 1;
              sellerCommission = Math.round(sellerCommission * rate);
            }
          }
          
          // Aplicar desconto de 20% se for venda recuperada
          if (isRecovered) {
            sellerCommission = sellerCommission * 0.8;
          }
          
          if (order.status === 'completed') {
            acc.paid++;
            acc.paidTotal += sellerCommission; // Usar valor convertido
            acc.totalSellerEarnings += sellerCommission;
          } else if (order.status === 'pending') {
            acc.pending++;
            acc.pendingTotal += sellerCommission; // Usar valor convertido também para pending
          } else if (order.status === 'failed' || order.status === 'cancelled') {
            acc.cancelled++;
            acc.cancelledTotal += sellerCommission;
          }
        }

        // Contar vendas por método de pagamento
        if (order.payment_method) {
          if (!acc[order.payment_method]) {
            acc[order.payment_method] = 0;
          }
          acc[order.payment_method]++;
        }

        return acc;
      }, {
        paid: 0, pending: 0, cancelled: 0,
        paidTotal: 0, pendingTotal: 0, cancelledTotal: 0,
        totalAffiliateCommissions: 0,
        totalSellerEarnings: 0,
        // Inicializar contadores para todos os métodos de pagamento
        ...getAllPaymentMethods().reduce((methodsAcc, method) => {
          methodsAcc[method.id] = 0;
          return methodsAcc;
        }, {} as Record<string, number>)
      });

      setTotalCount(statsData?.length || 0);
      onStatsUpdate(stats);

      // 🔍 VERIFICAÇÃO DE RLS - Contar total sem RLS para debug
      console.log(`🔍 Total de vendas encontradas (próprias + afiliado): ${statsData?.length || 0}`);
      
      setTotalCount(statsData?.length || 0);
      onStatsUpdate(stats);

      // 📋 CARREGANDO TODAS AS VENDAS progressivamente (próprias + afiliado)
      console.log('📋 Iniciando carregamento de TODAS as vendas (próprias + afiliado)...');
      let offset = 0;
      let hasMore = true;
      const allOrders: any[] = [];
      let chunkNumber = 1;

      // Usar as vendas recuperadas já buscadas anteriormente

      // Carregar vendas próprias
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
            seller_commission
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

        // Verifica se há mais dados de forma mais robusta
        if (ownOrders.length === chunkSize) {
          hasMore = true;
        } else {
          // Fazer uma verificação extra para ter certeza
          console.log(`🔍 Verificando se há mais vendas próprias além do offset ${offset + chunkSize}...`);
          const { data: nextChunk } = await supabase
            .from('orders')
            .select('id')
            .in('product_id', userProductIds)
            .order('created_at', { ascending: false })
            .range(offset + chunkSize, offset + chunkSize);
          
          hasMore = nextChunk && nextChunk.length > 0;
          console.log(`🔍 Verificação vendas próprias: ${hasMore ? 'Há mais dados' : 'Não há mais dados'}`);
        }

        offset += chunkSize;
        chunkNumber++;

        console.log(`📊 Total acumulado (próprias): ${allOrders.length} vendas | Continuar: ${hasMore}`);

        // Pequeno delay para não travar UI
        await new Promise(resolve => setTimeout(resolve, 5));
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
          const affiliateOrdersWithType = affiliateOrders.map(order => ({
            ...order,
            // Preservar moeda e valor originais para exibição
            original_amount: order.amount,
            original_currency: order.currency,
            sale_type: 'affiliate' // Marcar como venda de afiliado
          }));

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
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { loadOrdersWithStats, cancelStream, totalCount };
};