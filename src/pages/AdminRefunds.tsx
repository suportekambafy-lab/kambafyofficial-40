import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  MessageSquare,
  Shield,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useCustomToast';

interface RefundRequest {
  id: string;
  order_id: string;
  buyer_email: string;
  seller_user_id: string;
  product_id: string;
  amount: number;
  currency: string;
  reason: string;
  seller_comment?: string;
  admin_comment?: string;
  status: string;
  refund_deadline: string;
  created_at: string;
  updated_at: string;
  products?: { name: string };
  profiles?: { full_name: string; email: string };
}

export default function AdminRefunds() {
  const { admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefundRequest[];
    }
  });

  const handleProcess = async () => {
    if (!selectedRefund || !action || !admin) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('admin_process_refund', {
        p_refund_id: selectedRefund.id,
        p_action: action,
        p_admin_email: admin.email,
        p_comment: comment
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Reembolso Aprovado" : "Reembolso Rejeitado",
        description: "A decisão administrativa foi aplicada",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setSelectedRefund(null);
      setAction(null);
      setComment('');
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o reembolso",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (refund: RefundRequest, actionType: 'approve' | 'reject') => {
    setSelectedRefund(refund);
    setAction(actionType);
    setComment('');
  };

  // Refunds that need admin intervention (rejected by seller or pending too long)
  const disputedRefunds = refunds.filter(r => 
    r.status === 'rejected_by_seller' || 
    r.status === 'pending'
  );
  const resolvedRefunds = refunds.filter(r => 
    r.status === 'approved_by_admin' || 
    r.status === 'rejected_by_admin' ||
    r.status === 'approved_by_seller'
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Pendente</Badge>;
      case 'approved_by_seller':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">Aprovado (Vendedor)</Badge>;
      case 'rejected_by_seller':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">Rejeitado (Vendedor)</Badge>;
      case 'approved_by_admin':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">Aprovado (Admin)</Badge>;
      case 'rejected_by_admin':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">Rejeitado (Admin)</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved_by_seller':
      case 'approved_by_admin':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected_by_seller':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'rejected_by_admin':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="refunds" />;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
          <Shield className="h-5 w-5" />
          Gestão de Reembolsos
        </h1>
        <p className="text-muted-foreground text-sm mb-3">
          Intervenha em disputas entre compradores e vendedores
        </p>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-md">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{disputedRefunds.filter(r => r.status === 'rejected_by_seller').length}</p>
                  <p className="text-xs text-muted-foreground">Disputas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-md">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{disputedRefunds.filter(r => r.status === 'pending').length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{resolvedRefunds.length}</p>
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-900">
              <p className="font-medium mb-1">Quando intervir:</p>
              <ul className="list-disc list-inside space-y-0.5 text-orange-800">
                <li>Vendedor rejeitou e cliente contestou</li>
                <li>Prazo de resposta do vendedor expirado</li>
                <li>Casos de fraude ou disputa grave</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Disputas - Requer atenção */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            Requer Intervenção
          </h2>
          {disputedRefunds.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground">Nenhuma disputa pendente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {disputedRefunds.map((refund) => (
                <Card key={refund.id} className={`border-l-4 ${refund.status === 'rejected_by_seller' ? 'border-l-orange-500' : 'border-l-yellow-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(refund.status)}
                          <h3 className="font-medium text-sm">
                            Pedido: {refund.order_id}
                          </h3>
                          {getStatusBadge(refund.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Produto: {refund.products?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comprador: {refund.buyer_email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {refund.amount} {refund.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(refund.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Motivo do Cliente:
                      </p>
                      <p className="text-xs text-muted-foreground">{refund.reason}</p>
                    </div>

                    {refund.seller_comment && (
                      <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                        <p className="text-xs font-medium mb-1 text-orange-800">
                          Resposta do Vendedor:
                        </p>
                        <p className="text-xs text-orange-700">{refund.seller_comment}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openDialog(refund, 'approve')}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprovar (Forçar)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openDialog(refund, 'reject')}
                        variant="destructive"
                        className="flex-1 h-8 text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejeitar (Final)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Histórico */}
        {resolvedRefunds.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Histórico de Resoluções
            </h2>
            <div className="space-y-2">
              {resolvedRefunds.map((refund) => (
                <Card key={refund.id} className="border-l-2 border-l-muted">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(refund.status)}
                          <span className="font-medium text-xs">
                            {refund.order_id}
                          </span>
                          {getStatusBadge(refund.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {refund.products?.name || 'N/A'} • {refund.buyer_email}
                        </p>
                        
                        {refund.admin_comment && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <p><span className="font-medium">Admin:</span> {refund.admin_comment}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {refund.amount} {refund.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(refund.created_at), "dd/MM/yy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedRefund && !!action} onOpenChange={() => {
        setSelectedRefund(null);
        setAction(null);
        setComment('');
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {action === 'approve' ? 'Aprovar Reembolso (Admin)' : 'Rejeitar Reembolso (Admin)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {action === 'approve' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-800">
                  <strong>Ação Administrativa:</strong> O reembolso de <strong>{selectedRefund?.amount} {selectedRefund?.currency}</strong> será forçado, descontando do saldo do vendedor.
                </p>
              </div>
            )}

            {action === 'reject' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-xs text-red-800">
                  <strong>Decisão Final:</strong> Esta rejeição é definitiva e não pode ser contestada.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="comment" className="text-sm">
                Justificativa administrativa (obrigatório)
              </Label>
              <Textarea
                id="comment"
                placeholder="Explique a decisão..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => {
                setSelectedRefund(null);
                setAction(null);
                setComment('');
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleProcess}
              disabled={processing || !comment.trim()}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
