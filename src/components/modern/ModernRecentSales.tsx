
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
}

export function ModernRecentSales() {
  const { user } = useAuth();
  const { getCurrencyInfo, convertToKZ } = useCurrencyToCountry();
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

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

      const formattedSales: RecentSale[] = recentOrders.map(order => ({
        id: order.id,
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
        seller_commission: order.seller_commission
      }));

      setRecentSales(formattedSales);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (sale: RecentSale) => {
    // Para vendedores, usar seller_commission que já vem em KZ da base de dados
    // Se for venda de afiliado, usar affiliate_commission
    let amount = 0;
    let currency = sale.currency;
    
    if (sale.sale_type === 'affiliate') {
      amount = sale.affiliate_commission || 0;
    } else {
      // Para vendas próprias, usar seller_commission ou converter de volta se for venda antiga
      amount = sale.seller_commission || 0;
      if (amount === 0) {
        // Venda antiga sem comissão registrada - usar valor original da venda
        amount = parseFloat(sale.amount);
      } else {
        // Se seller_commission existe, já está em KZ
        currency = 'KZ';
      }
    }
    
    // Aplicar desconto de 20% para vendas recuperadas
    if (sale.sale_type === 'recovered') {
      amount = amount * 0.8;
    }
    
    const currencyInfo = getCurrencyInfo(currency);
    
    // Usar a função formatPriceForSeller que faz a conversão adequada
    return {
      main: formatPriceForSeller(amount, currency),
      flag: currencyInfo.flag,
      countryName: currencyInfo.name,
      showCountry: currency.toUpperCase() !== 'KZ'
    };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center space-x-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  sale.sale_type === 'affiliate' 
                    ? 'bg-purple-100 dark:bg-purple-900/20' 
                    : sale.sale_type === 'recovered'
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-primary/10'
                }`}>
                  <span className={`font-medium text-sm ${
                    sale.sale_type === 'affiliate'
                      ? 'text-purple-600 dark:text-purple-400'
                      : sale.sale_type === 'recovered'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-primary'
                  }`}>
                    {getInitials(sale.customer_name)}
                  </span>
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      <span>{sale.customer_name}</span>
                      {sale.customer_email && (
                        <span className="font-normal text-muted-foreground"> • {sale.customer_email}</span>
                      )}
                      {sale.customer_phone && (
                        <span className="font-normal text-muted-foreground"> • {sale.customer_phone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {(() => {
                          const countryInfo = getCountryByPaymentMethod(sale.payment_method || '');
                          return (
                            <>
                              <span>{countryInfo.flag}</span>
                              <span>{countryInfo.name}</span>
                            </>
                          );
                        })()}
                      </div>
                      {sale.sale_type === 'affiliate' && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
                          Afiliado
                        </Badge>
                      )}
                      {sale.sale_type === 'recovered' && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400">
                          Recuperado (20% taxa)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sale.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    sale.sale_type === 'affiliate' 
                      ? 'text-purple-600 dark:text-purple-400' 
                      : sale.sale_type === 'recovered'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-foreground'
                  }`}>
                    {formatAmount(sale).main}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
