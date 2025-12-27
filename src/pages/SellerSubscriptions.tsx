import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, DollarSign, Users, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Subscription {
  id: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  renewal_type: string | null;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    price: string;
  };
}

export default function SellerSubscriptions() {
  const { t } = useTranslation();
  
  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['seller-subscriptions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Buscar produtos do vendedor
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;
      if (!products || products.length === 0) return [];

      const productIds = products.map(p => p.id);

      // Buscar assinaturas dos produtos do vendedor
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          id,
          customer_email,
          customer_name,
          status,
          renewal_type,
          current_period_start,
          current_period_end,
          created_at,
          products!inner(id, name, price)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Subscription[];
    },
  });

  // Calcular estatísticas
  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const nextBillingIn7Days = subscriptions?.filter(s => {
    if (s.status !== 'active') return false;
    const endDate = new Date(s.current_period_end);
    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }) || [];

  // Calcular MRR (Monthly Recurring Revenue)
  const mrr = activeSubscriptions.reduce((total, sub) => {
    const price = parseFloat(sub.products.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    return total + price;
  }, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Ativa</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Vencida</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    return `Kz ${numPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('subscriptions.title')}</h1>
          <p className="text-muted-foreground">{t('subscriptions.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptions.active')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSubscriptions.length === 0 ? t('subscriptions.noSubscriptions') : 'assinaturas ativas'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">Kz {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">{t('financial.totalEarnings')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptions.nextBilling')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{nextBillingIn7Days.length}</div>
                <p className="text-xs text-muted-foreground">{t('period.last7days')}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptions.title')}</CardTitle>
          <CardDescription>
            {t('subscriptions.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{sub.customer_name || sub.customer_email}</p>
                      {getStatusBadge(sub.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{sub.products.name}</span>
                      <span>•</span>
                      <span>{formatPrice(sub.products.price)}/mês</span>
                      {sub.renewal_type === 'automatic' && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Automática
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Próxima cobrança</p>
                    <p className="font-medium">
                      {sub.status === 'active' 
                        ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">
                {t('subscriptions.noSubscriptions')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('products.createFirst')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
