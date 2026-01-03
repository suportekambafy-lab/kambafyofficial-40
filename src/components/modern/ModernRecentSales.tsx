
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCurrencyToCountry } from "@/hooks/useCurrencyToCountry";
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { getCountryByPaymentMethod } from "@/utils/paymentMethods";
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';
import { getActualCurrency, getActualAmount, calculateSellerEarning } from '@/utils/currencyUtils';

interface RecentSale {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: string;
  currency: string;
  original_amount?: number | null;
  original_currency?: string | null;
  payment_method?: string;
  created_at: string;
  product_name?: string;
  sale_type?: 'own' | 'affiliate' | 'recovered';
  earning_amount?: number;
  earning_currency?: string;
  affiliate_commission?: number;
  seller_commission?: number;
  country_flag?: string;
  country_name?: string;
}

export function ModernRecentSales() {
  const { user } = useAuth();
  const { getCurrencyInfo, convertToKZ } = useCurrencyToCountry();
  const { formatInPreferredCurrency, currencyConfig } = usePreferredCurrency();
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSalesCount, setTotalSalesCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchRecentSales();
      
      // Set up real-time subscription for recent sales updates
      const channel = supabase
        .channel('recent-sales-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload: any) => {
            console.log('🔔 [RECENT SALES] Mudança detectada:', {
              event: payload.eventType,
              order_id: payload.new?.order_id || payload.old?.order_id,
              new_status: payload.new?.status,
              old_status: payload.old?.status,
              payment_method: payload.new?.payment_method,
              updated_at: payload.new?.updated_at
            });
            
            // Atualizar em qualquer mudança para completed ou nova venda completed
            if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
              console.log('✅ [RECENT SALES] Venda APROVADA detectada! Atualizando lista...', payload.new?.order_id);
              fetchRecentSales();
            } else if (payload.eventType === 'INSERT' && payload.new?.status === 'completed') {
              console.log('✅ [RECENT SALES] Nova venda COMPLETED detectada! Atualizando lista...', payload.new?.order_id);
              fetchRecentSales();
            } else {
              console.log('⏩ [RECENT SALES] Mudança ignorada (não é completed)', {
                event: payload.eventType,
                status: payload.new?.status
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 [RECENT SALES] Realtime status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRecentSales = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('📋 [RECENT SALES] Carregando vendas para:', user.id);

      // Primeiro, buscar produtos do usuário
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];
      console.log('📦 [RECENT SALES] Produtos do usuário:', userProductIds.length);

      // Segundo, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      // Buscar total de vendas do vendedor para numeração
      const { count: totalSales, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('product_id', userProductIds.length > 0 ? userProductIds : [])
        .eq('status', 'completed');

      if (!countError && totalSales !== null) {
        setTotalSalesCount(totalSales);
      }

      const promises = [];

      // Vendas recuperadas removidas - sistema de recuperação desabilitado
      const recoveredOrderIds = new Set();

      // ✅ Vendas próprias - usando product_id
      if (userProductIds.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select(`
              id,
              order_id,
              customer_name,
              customer_email,
              customer_phone,
              payment_method,
              amount,
              currency,
              original_amount,
              original_currency,
              created_at,
              updated_at,
              product_id,
              affiliate_commission,
              seller_commission,
              products (
                name,
                price
              )
            `)
            .in('product_id', userProductIds)
            .eq('status', 'completed') // Apenas vendas pagas
            .order('updated_at', { ascending: false }) // Ordenar por data de aprovação/atualização
            .limit(10)
        );
      }

      // Adicionar vendas como afiliado se houver códigos (excluindo vendas próprias)
      if (userAffiliateCodes.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select(`
              id,
              order_id,
              customer_name,
              customer_email,
              customer_phone,
              payment_method,
              amount,
              currency,
              created_at,
              updated_at,
              product_id,
              affiliate_commission,
              seller_commission,
              affiliate_code,
              products (
                name,
                price
              )
            `)
            .in('affiliate_code', userAffiliateCodes)
            .not('affiliate_commission', 'is', null)
            .eq('status', 'completed')
            // Excluir vendas de produtos próprios para evitar duplicação
            .not('product_id', 'in', `(${userProductIds.length > 0 ? userProductIds.join(',') : 'null'})`)
            .order('updated_at', { ascending: false }) // Ordenar por data de aprovação/atualização
            .limit(10)
        );
      }

      if (promises.length === 0) {
        setRecentSales([]);
        return;
      }

      const results = await Promise.all(promises);
      let ownOrders: any[] = [];
      let affiliateOrders: any[] = [];

      if (userProductIds.length > 0) {
        const ownOrdersData = results[0];
        ownOrders = ownOrdersData.data || [];
        
        if (userAffiliateCodes.length > 0 && results[1]) {
          const affiliateOrdersData = results[1];
          affiliateOrders = affiliateOrdersData.data || [];
        }
      } else if (userAffiliateCodes.length > 0) {
        const affiliateOrdersData = results[0];
        affiliateOrders = affiliateOrdersData.data || [];
      }

      if (results[0].error) {
        console.error('❌ Erro ao buscar vendas recentes:', results[0].error);
        return;
      }

      console.log(`✅ [RECENT SALES] Carregou ${ownOrders?.length || 0} vendas próprias e ${affiliateOrders?.length || 0} comissões`);
      console.log('📊 [RECENT SALES] Detalhes das vendas:', {
        own_orders: ownOrders?.map(o => ({
          order_id: o.order_id,
          status: o.status,
          created_at: o.created_at,
          updated_at: o.updated_at,
          payment_method: o.payment_method
        })),
        affiliate_orders: affiliateOrders?.map(o => ({
          order_id: o.order_id,
          status: o.status,
          created_at: o.created_at,
          updated_at: o.updated_at
        }))
      });

      // Combinar e formatar vendas
      const allOrders = [
        // Vendas próprias - usar moeda real baseada no payment_method
        ...(ownOrders || []).map((order: any) => {
          const isRecovered = recoveredOrderIds.has(order.order_id);
          
          // ✅ Usar getActualCurrency para determinar moeda real pelo payment_method
          const actualCurrency = getActualCurrency(order);
          const actualAmount = getActualAmount(order);
          const earning_amount = calculateSellerEarning(actualAmount, actualCurrency);
          
          return {
            ...order,
            sale_type: isRecovered ? 'recovered' : 'own',
            earning_amount,
            earning_currency: actualCurrency
          };
        }),
        // Vendas como afiliado (sempre em KZ)
        ...(affiliateOrders || []).map((order: any) => ({
          ...order,
          sale_type: 'affiliate', 
          earning_amount: parseFloat(order.affiliate_commission?.toString() || '0'),
          earning_currency: 'KZ'
        }))
      ];

      // Ordenar por updated_at (vendas recém-aprovadas aparecem primeiro)
      allOrders.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      const recentOrders = allOrders.slice(0, 5);

      const formattedSales: RecentSale[] = recentOrders.map(order => {
        const countryInfo = getCountryByPaymentMethod(order.payment_method || '');
        return {
          id: order.id,
          order_id: order.order_id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          payment_method: order.payment_method,
          amount: order.amount,
          currency: order.currency || 'KZ',
          original_amount: order.original_amount,
          original_currency: order.original_currency,
          created_at: order.created_at,
          product_name: (order.products as any)?.name,
          sale_type: order.sale_type,
          earning_amount: order.earning_amount,
          earning_currency: order.earning_currency,
          affiliate_commission: order.affiliate_commission,
          seller_commission: order.seller_commission,
          country_flag: countryInfo.flag,
          country_name: countryInfo.name
        };
      });

      setRecentSales(formattedSales);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (sale: RecentSale) => {
    // ✅ Usar earning_amount e earning_currency calculados corretamente
    let amount = sale.earning_amount || 0;
    const currency = sale.earning_currency || 'KZ';
    
    // Aplicar desconto de 20% para vendas recuperadas
    if (sale.sale_type === 'recovered') {
      amount = amount * 0.8;
    }
    
    // Função para formatar com pontos de milhar e vírgula decimal
    const formatWithThousands = (value: number): string => {
      const [intPart, decPart] = value.toFixed(2).split('.');
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${formattedInt},${decPart}`;
    };
    
    // Formatar baseado na moeda real da venda
    let formattedPrice: string;
    if (currency === 'EUR') {
      formattedPrice = `€${formatWithThousands(amount)}`;
    } else if (currency === 'USD') {
      formattedPrice = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'GBP') {
      formattedPrice = `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'MZN') {
      formattedPrice = `${formatWithThousands(amount)} MZN`;
    } else if (currency === 'BRL') {
      formattedPrice = `R$${formatWithThousands(amount)}`;
    } else {
      // KZ - usar formatação com pontos de milhar
      formattedPrice = `${formatWithThousands(amount)} KZ`;
    }
    
    return {
      main: formattedPrice,
      flag: sale.country_flag || currencyConfig.flag,
      countryName: sale.country_name || currencyConfig.name,
      showCountry: false
    };
  };

  return (
    <Card className="rounded-2xl shadow-sm w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Vendas Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 overflow-x-hidden">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 sm:space-x-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-muted rounded-full animate-pulse shrink-0"></div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 sm:h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-2 sm:h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentSales.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 sm:py-8">
            <p className="text-sm">Nenhuma venda recente</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recentSales.map((sale, index) => (
              <div key={sale.id} className="flex items-center justify-between py-2 sm:py-3 gap-2 min-w-0">
                <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {sale.product_name || 'Produto'}
                  </p>
                   <p className="text-[10px] sm:text-xs text-muted-foreground">
                     #{(totalSalesCount - index + 1000).toString().padStart(4, '0')}
                   </p>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="text-right min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {formatAmount(sale).main}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">
                      {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-xl sm:text-2xl">{sale.country_flag}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
