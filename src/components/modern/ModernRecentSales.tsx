
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

interface RecentSale {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: string;
  currency: string;
  created_at: string;
  payment_method?: string;
  product_name?: string;
  sale_type?: 'own' | 'affiliate' | 'recovered';
  earning_amount?: number;
  affiliate_commission?: number;
  seller_commission?: number;
  country_flag?: string;
  country_name?: string;
}

export function ModernRecentSales() {
  const { user } = useAuth();
  const { getCurrencyInfo, convertToKZ } = useCurrencyToCountry();
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
          (payload) => {
            console.log('Recent sales update triggered:', payload);
            fetchRecentSales();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRecentSales = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('📋 Recent Sales carregando vendas próprias + afiliado para:', user.id);

      // Primeiro, buscar produtos do usuário
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const userProductIds = userProducts?.map(p => p.id) || [];

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

      // Buscar vendas recuperadas para identificar corretamente
      const { data: recoveredPurchases } = await supabase
        .from('abandoned_purchases')
        .select('recovered_order_id')
        .eq('status', 'recovered')
        .not('recovered_order_id', 'is', null);

      const recoveredOrderIds = new Set(
        recoveredPurchases?.map(p => p.recovered_order_id).filter(Boolean) || []
      );

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
              created_at,
              product_id,
              affiliate_commission,
              seller_commission,
              products (
                name,
                price
              )
            `)
            .in('product_id', userProductIds)
            .in('status', ['completed', 'pending']) // Incluir vendas pendentes também
            .order('created_at', { ascending: false })
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
              customer_name,
              customer_email,
              customer_phone,
              payment_method,
              amount,
              currency,
              created_at,
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
            .order('created_at', { ascending: false })
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

      console.log(`✅ Recent Sales carregou ${ownOrders?.length || 0} vendas próprias e ${affiliateOrders?.length || 0} comissões`);

      // Combinar e formatar vendas
      const allOrders = [
        // Vendas próprias - verificar se são recuperadas
        ...(ownOrders || []).map((order: any) => {
          const isRecovered = recoveredOrderIds.has(order.order_id);
          return {
            ...order,
            sale_type: isRecovered ? 'recovered' : 'own',
            earning_amount: parseFloat(order.seller_commission?.toString() || order.amount || '0')
          };
        }),
        // Vendas como afiliado
        ...(affiliateOrders || []).map((order: any) => ({
          ...order,
          sale_type: 'affiliate', 
          earning_amount: parseFloat(order.affiliate_commission?.toString() || '0')
        }))
      ];

      // Ordenar por data e pegar as 5 mais recentes
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
          created_at: order.created_at,
          product_name: (order.products as any)?.name,
          sale_type: order.sale_type,
          earning_amount: order.earning_amount,
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
    let amount = 0;
    let currency = 'KZ'; // Sempre KZ pois agora salvamos convertido no banco
    
    if (sale.sale_type === 'affiliate') {
      amount = sale.affiliate_commission || 0;
    } else {
      // Para vendas próprias, verificar se há seller_commission
      if (sale.seller_commission && sale.seller_commission > 0) {
        amount = sale.seller_commission;
      } else {
        // Venda antiga - usar valor original da venda
        amount = parseFloat(sale.amount);
      }
    }
    
    // Aplicar desconto de 20% para vendas recuperadas
    if (sale.sale_type === 'recovered') {
      amount = amount * 0.8;
    }
    
    // A função formatPriceForSeller já faz a conversão automaticamente
    const formattedPrice = formatPriceForSeller(amount, currency);
    
    const currencyInfo = getCurrencyInfo('KZ'); // Sempre mostrar flag de Angola
    
    return {
      main: formattedPrice,
      flag: currencyInfo.flag,
      countryName: currencyInfo.name,
      showCountry: false // Sempre mostrar como KZ para vendedores
    };
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Vendas Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentSales.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma venda recente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSales.map((sale, index) => (
              <div key={sale.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {sale.product_name || 'Produto'}
                  </p>
                   <p className="text-xs text-muted-foreground">
                     #{(totalSalesCount - index).toString().padStart(4, '0')}
                   </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatAmount(sale).main}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-2xl">{sale.country_flag}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
