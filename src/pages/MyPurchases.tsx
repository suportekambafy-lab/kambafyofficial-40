import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, AlertCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefundRequestDialog } from '@/components/refunds/RefundRequestDialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOneSignalAutoLink } from '@/hooks/useOneSignalAutoLink';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export default function MyPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isReopening, setIsReopening] = useState(false);

  useOneSignalAutoLink(user?.email, user?.id);

  const loadPurchases = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products(name)
        `)
        .eq('customer_email', user.email)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar refunds separadamente para pegar o mais recente por order_id
      const orderIds = data?.map(o => o.order_id) || [];
      
      if (orderIds.length > 0) {
        const { data: refunds } = await supabase
          .from('refund_requests')
          .select('*')
          .in('order_id', orderIds)
          .order('updated_at', { ascending: false });

        // Agrupar refunds por order_id (pegar o mais recente)
        const refundsByOrder = new Map();
        refunds?.forEach(r => {
          if (!refundsByOrder.has(r.order_id)) {
            refundsByOrder.set(r.order_id, r);
          }
        });

        // Anexar o refund mais recente a cada order
        const ordersWithRefunds = data?.map(order => ({
          ...order,
          refund: refundsByOrder.get(order.order_id) || null
        }));

        setPurchases(ordersWithRefunds || []);
      } else {
        setPurchases(data || []);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [user]);

  // Real-time subscription para atualizações de reembolsos
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('refund-updates-buyer')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refund_requests',
          filter: `buyer_email=eq.${user.email}`
        },
        (payload) => {
          console.log('Refund update received:', payload);
          loadPurchases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const canRequestRefund = (order: any) => {
    const refund = order.refund;
    // Se tem reembolso pendente, aprovado ou completo, não pode solicitar
    if (refund && ['pending', 'approved', 'approved_by_seller', 'approved_by_admin', 'completed'].includes(refund.status)) {
      return false;
    }
    if (!order.refund_deadline) return false;
    return new Date(order.refund_deadline) > new Date();
  };

  const canReopenRefund = (order: any) => {
    const refund = order.refund;
    if (!refund) return false;
    // Pode reabrir se foi rejeitado e ainda está no prazo
    if (!['rejected', 'rejected_by_seller', 'rejected_by_admin', 'cancelled'].includes(refund.status)) {
      return false;
    }
    if (!order.refund_deadline) return false;
    return new Date(order.refund_deadline) > new Date();
  };

  const getDaysLeft = (deadline: string) => {
    return differenceInDays(new Date(deadline), new Date());
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', variant: 'outline' as const, color: 'text-yellow-600', icon: Clock };
      case 'approved':
      case 'approved_by_seller':
        return { label: 'Aprovado', variant: 'outline' as const, color: 'text-green-600', icon: CheckCircle };
      case 'approved_by_admin':
        return { label: 'Aprovado (Admin)', variant: 'outline' as const, color: 'text-green-600', icon: CheckCircle };
      case 'completed':
        return { label: 'Reembolsado', variant: 'outline' as const, color: 'text-green-600', icon: CheckCircle };
      case 'rejected':
      case 'rejected_by_seller':
        return { label: 'Rejeitado', variant: 'outline' as const, color: 'text-red-600', icon: XCircle };
      case 'rejected_by_admin':
        return { label: 'Rejeitado (Admin)', variant: 'outline' as const, color: 'text-red-600', icon: XCircle };
      case 'cancelled':
        return { label: 'Cancelado', variant: 'outline' as const, color: 'text-gray-600', icon: XCircle };
      default:
        return { label: status, variant: 'outline' as const, color: 'text-muted-foreground', icon: Clock };
    }
  };

  const handleOpenRefundDialog = (order: any, reopen: boolean = false) => {
    setIsReopening(reopen);
    setSelectedOrder(order);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <ShoppingBag className="h-5 w-5" />
          Minhas Compras
        </h1>
        <p className="text-muted-foreground text-sm mb-3">
          Gerencie suas compras e solicitações de reembolso
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            <AlertCircle className="h-3 w-3" />
            <span>Prazo: 7 dias</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            <Clock className="h-3 w-3" />
            <span>Processamento: 48h</span>
          </div>
        </div>
      </div>

      {loading ? (
        <PageSkeleton variant="list" />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma compra encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {purchases.map((order) => {
            const refund = order.refund;
            const canRefund = canRequestRefund(order);
            const canReopen = canReopenRefund(order);
            const daysLeft = order.refund_deadline ? getDaysLeft(order.refund_deadline) : 0;

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <ShoppingBag className="h-8 w-8 text-primary" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{order.products?.name || 'Produto'}</h3>
                          <p className="text-xs text-muted-foreground">Pedido: {order.order_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold">{order.amount} {order.currency}</p>
                          <Badge variant="default" className="text-xs">Pago</Badge>
                        </div>
                      </div>

                      {/* Status do Reembolso */}
                      {refund && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            {(() => {
                              const status = getStatusInfo(refund.status);
                              const IconComponent = status.icon;
                              return (
                                <>
                                  <IconComponent className={`h-4 w-4 ${status.color}`} />
                                  <span className={`text-xs font-medium ${status.color}`}>
                                    Reembolso: {status.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          
                          {refund.seller_comment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Vendedor:</span> {refund.seller_comment}
                            </p>
                          )}
                          
                          {refund.admin_comment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Admin:</span> {refund.admin_comment}
                            </p>
                          )}

                          {/* Botão para solicitar novamente se rejeitado */}
                          {canReopen && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 text-xs"
                              onClick={() => handleOpenRefundDialog(order, true)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Solicitar Novamente
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Opção de solicitar reembolso (primeira vez) */}
                      {!refund && (
                        <div className="mt-2 flex items-center justify-between">
                          {canRefund ? (
                            <>
                              <p className="text-xs text-muted-foreground">
                                {daysLeft > 0 && `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
                              </p>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleOpenRefundDialog(order, false)}
                              >
                                Solicitar Reembolso
                              </Button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Prazo de reembolso expirado
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <RefundRequestDialog
          open={!!selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            setIsReopening(false);
          }}
          order={selectedOrder}
          onSuccess={loadPurchases}
          isReopen={isReopening}
        />
      )}
    </div>
  );
}
