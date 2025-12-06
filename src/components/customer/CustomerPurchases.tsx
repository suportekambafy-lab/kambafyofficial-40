import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, AlertCircle, Clock, ArrowLeft, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefundRequestDialog } from '@/components/refunds/RefundRequestDialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Link } from 'react-router-dom';
import { ProductImage } from '@/components/ui/fallback-image';
import { getProductImageUrl } from '@/utils/imageUtils';

export default function CustomerPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isReopening, setIsReopening] = useState(false);

  const loadPurchases = async () => {
    if (!user?.email) {
      console.warn('CustomerPurchases: User or email not available');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log('🛒 CustomerPurchases: Loading purchases for', user.email);
      const { data, error } = await supabase
        .from('orders')
        .select(`*, products(name, cover)`)
        .eq('customer_email', user.email)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ CustomerPurchases: Error loading purchases', error);
        throw error;
      }

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

        console.log('✅ CustomerPurchases: Loaded', ordersWithRefunds?.length || 0, 'purchases with refunds');
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
      .channel('refund-updates-customer')
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

  const getRefundDeadline = (order: any) => {
    if (order.refund_deadline) {
      return new Date(order.refund_deadline);
    }
    const createdAt = new Date(order.created_at);
    createdAt.setDate(createdAt.getDate() + 7);
    return createdAt;
  };

  const canRequestRefund = (order: any) => {
    const refund = order.refund;
    if (refund && ['pending', 'approved', 'approved_by_seller', 'approved_by_admin'].includes(refund.status)) {
      return false;
    }
    const deadline = getRefundDeadline(order);
    return deadline > new Date();
  };

  const canReopenRefund = (order: any) => {
    const refund = order.refund;
    if (!refund) return false;
    if (!['rejected', 'rejected_by_seller', 'rejected_by_admin', 'cancelled'].includes(refund.status)) {
      return false;
    }
    const deadline = getRefundDeadline(order);
    return deadline > new Date();
  };

  const getDaysLeft = (order: any) => {
    const deadline = getRefundDeadline(order);
    return differenceInDays(deadline, new Date());
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', icon: Clock };
      case 'approved':
      case 'approved_by_seller':
        return { label: 'Aprovado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: CheckCircle };
      case 'approved_by_admin':
        return { label: 'Aprovado (Admin)', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: CheckCircle };
      case 'rejected':
      case 'rejected_by_seller':
        return { label: 'Rejeitado pelo Vendedor', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle };
      case 'rejected_by_admin':
        return { label: 'Rejeitado (Admin)', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle };
      case 'cancelled':
        return { label: 'Cancelado', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', icon: XCircle };
      default:
        return { label: status, color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border', icon: Clock };
    }
  };

  const handleOpenRefundDialog = (order: any, reopen: boolean = false) => {
    setIsReopening(reopen);
    setSelectedOrder(order);
  };
  const totalCompras = purchases.length;
  return <div className="p-4 md:p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/meus-acessos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            
            Minhas Compras
            <Badge variant="secondary" className="ml-1">
              {totalCompras}
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualize suas compras e gerencie reembolsos
          </p>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground bg-muted/30 border border-border/50 px-4 py-2.5 rounded-xl w-fit">
        <Clock className="h-4 w-4 text-primary/70" />
        <span>Prazo para reembolso: <strong className="text-foreground">7 dias</strong> após a compra</span>
      </div>

      {loading ? <PageSkeleton variant="list" /> : purchases.length === 0 ? <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não fez nenhuma compra</p>
          </CardContent>
        </Card> : <div className="grid gap-4">
          {purchases.map(order => {
        const canRefund = canRequestRefund(order);
        const daysLeft = getDaysLeft(order);
        return <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <ProductImage src={order.products?.cover ? getProductImageUrl(order.products.cover) : null} name={order.products?.name} className="w-full h-full object-cover" size="md" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base md:text-lg truncate">{order.products?.name || 'Produto'}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground">Pedido: {order.order_id}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd/MM/yyyy", {
                        locale: ptBR
                      })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 md:flex-col md:items-end">
                          <p className="text-lg md:text-xl font-bold">{order.amount} {order.currency}</p>
                          <Badge variant="default" className="text-xs">Pago</Badge>
                        </div>
                      </div>

                      {/* Status do Reembolso */}
                      {order.refund && (
                        <div className={`mt-4 p-3 rounded-lg border ${getStatusInfo(order.refund.status).bgColor}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {(() => {
                              const status = getStatusInfo(order.refund.status);
                              const IconComponent = status.icon;
                              return (
                                <>
                                  <IconComponent className={`h-5 w-5 ${status.color}`} />
                                  <span className={`font-medium ${status.color}`}>
                                    Reembolso: {status.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          
                          {order.refund.seller_comment && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">Resposta do vendedor:</span> {order.refund.seller_comment}
                            </p>
                          )}
                          
                          {order.refund.admin_comment && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Admin:</span> {order.refund.admin_comment}
                            </p>
                          )}

                          {/* Botão para solicitar novamente se rejeitado */}
                          {canReopenRefund(order) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3"
                              onClick={() => handleOpenRefundDialog(order, true)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Solicitar Novamente
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Opção de solicitar reembolso (primeira vez) */}
                      {!order.refund && (
                        <div className="mt-4 flex items-center justify-between">
                          {canRequestRefund(order) ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {daysLeft > 0 && `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} restantes para solicitar reembolso`}
                              </p>
                              <Button variant="destructive" size="sm" onClick={() => handleOpenRefundDialog(order, false)}>
                                Solicitar Reembolso
                              </Button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Prazo expirado
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>;
      })}
        </div>}

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
    </div>;
}