import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefundRequestDialog } from '@/components/refunds/RefundRequestDialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Link } from 'react-router-dom';

export default function CustomerPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
        .select(`
          *,
          products(name),
          refund_requests!refund_requests_order_id_fkey(id, status, created_at)
        `)
        .eq('customer_email', user.email)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ CustomerPurchases: Error loading purchases', error);
        throw error;
      }

      console.log('✅ CustomerPurchases: Loaded', data?.length || 0, 'purchases');
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [user]);

  const canRequestRefund = (order: any) => {
    if (order.has_active_refund) return false;
    if (!order.refund_deadline) return false;
    return new Date(order.refund_deadline) > new Date();
  };

  const getDaysLeft = (deadline: string) => {
    return differenceInDays(new Date(deadline), new Date());
  };

  const totalCompras = purchases.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/meus-acessos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
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

      {/* Info cards */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>Prazo: 7 dias corridos após a compra</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <Clock className="h-4 w-4" />
          <span>Processamento: até 48 horas úteis</span>
        </div>
      </div>

      {loading ? (
        <PageSkeleton variant="list" />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não fez nenhuma compra</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {purchases.map((order) => {
            const activeRefund = order.refund_requests?.[0];
            const canRefund = canRequestRefund(order);
            const daysLeft = order.refund_deadline ? getDaysLeft(order.refund_deadline) : 0;

            return (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <ShoppingBag className="h-12 w-12 text-primary" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{order.products?.name || 'Produto'}</h3>
                          <p className="text-sm text-muted-foreground">Pedido: {order.order_id}</p>
                          <p className="text-sm text-muted-foreground">
                            Comprado em: {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{order.amount} {order.currency}</p>
                          <Badge variant="default">Pago</Badge>
                        </div>
                      </div>

                      {activeRefund && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-blue-900">
                              Reembolso em andamento
                            </span>
                            <Badge variant="outline">{activeRefund.status}</Badge>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            Solicitado em: {format(new Date(activeRefund.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      )}

                      {!activeRefund && (
                        <div className="mt-4 flex items-center justify-between">
                          {canRefund ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {daysLeft > 0 && `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} restantes para solicitar reembolso`}
                              </p>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                Solicitar Reembolso
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Prazo de 7 dias para reembolso expirado
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
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onSuccess={loadPurchases}
        />
      )}
    </div>
  );
}
