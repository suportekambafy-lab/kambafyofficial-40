
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentSale {
  id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  currency: string;
  created_at: string;
  product_name?: string;
  sale_type?: 'own' | 'affiliate';
  earning_amount?: number;
  affiliate_commission?: number;
  seller_commission?: number;
}

export function ModernRecentSales() {
  const { user } = useAuth();
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

      // Primeiro, buscar códigos de afiliação do usuário
      const { data: affiliateCodes, error: affiliateError } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) throw affiliateError;

      const userAffiliateCodes = affiliateCodes?.map(a => a.affiliate_code) || [];

      const promises = [
        // ✅ Vendas próprias
        supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            customer_email,
            amount,
            currency,
            created_at,
            product_id,
            affiliate_commission,
            seller_commission,
            products (
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)
      ];

      // Adicionar vendas como afiliado se houver códigos
      if (userAffiliateCodes.length > 0) {
        promises.push(
          supabase
            .from('orders')
            .select(`
              id,
              customer_name,
              customer_email,
              amount,
              currency,
              created_at,
              product_id,
              affiliate_commission,
              seller_commission,
              affiliate_code,
              products (
                name
              )
            `)
            .in('affiliate_code', userAffiliateCodes)
            .not('affiliate_commission', 'is', null)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(10)
        );
      }

      const results = await Promise.all(promises);
      const [ownOrdersData, affiliateOrdersData] = results;

      const { data: ownOrders, error } = ownOrdersData;
      const affiliateOrders = affiliateOrdersData ? affiliateOrdersData.data : [];

      if (error) {
        console.error('❌ Erro ao buscar vendas recentes:', error);
        return;
      }

      console.log(`✅ Recent Sales carregou ${ownOrders?.length || 0} vendas próprias e ${affiliateOrders?.length || 0} comissões`);

      // Combinar e formatar vendas
      const allOrders = [
        // Vendas próprias
        ...(ownOrders || []).map((order: any) => ({
          ...order,
          sale_type: 'own',
          earning_amount: parseFloat(order.seller_commission?.toString() || order.amount || '0')
        })),
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
    // Usar earning_amount para mostrar apenas o que o usuário ganhou
    const amount = sale.earning_amount || parseFloat(sale.amount);
    const currency = sale.currency;
    
    if (currency === 'EUR') {
      return `€${amount.toFixed(2)}`;
    } else if (currency === 'MZN') {
      return `${amount.toLocaleString()} MT`;
    }
    return `${amount.toLocaleString()} KZ`;
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
                    : 'bg-primary/10'
                }`}>
                  <span className={`font-medium text-sm ${
                    sale.sale_type === 'affiliate'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-primary'
                  }`}>
                    {getInitials(sale.customer_name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {sale.customer_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {sale.product_name || 'Produto'}
                    </p>
                    {sale.sale_type === 'affiliate' && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
                        Afiliado
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
                      : 'text-foreground'
                  }`}>
                    {formatAmount(sale)}
                  </p>
                  {sale.sale_type === 'affiliate' && (
                    <p className="text-xs text-muted-foreground line-through">
                      {parseFloat(sale.amount).toLocaleString()} {sale.currency}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
