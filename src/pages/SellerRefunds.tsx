import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRefunds } from '@/hooks/useRefunds';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  MessageSquare 
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
import { useTranslation } from '@/hooks/useTranslation';

export default function SellerRefunds() {
  const { t } = useTranslation();
  const { refunds, loading, sellerProcessRefund } = useRefunds('seller');
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!selectedRefund || !action) return;

    setProcessing(true);
    const result = await sellerProcessRefund(selectedRefund.id, action, comment);
    setProcessing(false);

    if (result.success) {
      setSelectedRefund(null);
      setAction(null);
      setComment('');
    }
  };

  const openDialog = (refund: any, actionType: 'approve' | 'reject') => {
    setSelectedRefund(refund);
    setAction(actionType);
    setComment('');
  };

  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const processedRefunds = refunds.filter(r => r.status !== 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendente</Badge>;
      case 'approved':
      case 'approved_by_seller':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprovado</Badge>;
      case 'rejected':
      case 'rejected_by_seller':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejeitado</Badge>;
      case 'approved_by_admin':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Aprovado (Admin)</Badge>;
      case 'rejected_by_admin':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Rejeitado (Admin)</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'approved_by_seller':
      case 'approved_by_admin':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
      case 'rejected_by_seller':
      case 'rejected_by_admin':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
          <AlertCircle className="h-5 w-5" />
          {t('refunds.title')}
        </h1>
        <p className="text-muted-foreground text-sm mb-3">
          {t('refunds.subtitle')}
        </p>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-md">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{pendingRefunds.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-md">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="text-sm font-semibold">48h úteis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Impacto</p>
                  <p className="text-sm font-semibold">Imediato</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Analise o motivo antes de decidir</li>
                <li>Ao aprovar, o valor é descontado do seu saldo</li>
                <li>Se rejeitar, explique o motivo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <PageSkeleton variant="refunds" />
      ) : (
        <div className="space-y-6">
          {/* Pendentes */}
          <div>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Solicitações Pendentes
            </h2>
            {pendingRefunds.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingRefunds.map((refund) => (
                  <Card key={refund.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <h3 className="font-medium text-sm">
                              Pedido: {refund.order_id}
                            </h3>
                            {getStatusBadge(refund.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Produto: {refund.products?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cliente: {refund.buyer_email}
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
                          Motivo:
                        </p>
                        <p className="text-xs text-muted-foreground">{refund.reason}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openDialog(refund, 'approve')}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openDialog(refund, 'reject')}
                          variant="destructive"
                          className="flex-1 h-8 text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Histórico */}
          {processedRefunds.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Histórico de Reembolsos
              </h2>
              <div className="space-y-2">
                {processedRefunds.map((refund) => (
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
                          
                          {(refund.seller_comment || refund.admin_comment) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {refund.seller_comment && (
                                <p><span className="font-medium">Comentário:</span> {refund.seller_comment}</p>
                              )}
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
      )}

      <Dialog open={!!selectedRefund && !!action} onOpenChange={() => {
        setSelectedRefund(null);
        setAction(null);
        setComment('');
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {action === 'approve' ? 'Aprovar Reembolso' : 'Rejeitar Reembolso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {action === 'approve' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-xs text-red-800">
                  <strong>Atenção:</strong> O valor de <strong>{selectedRefund?.amount} {selectedRefund?.currency}</strong> será descontado do seu saldo.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="comment" className="text-sm">
                Comentário {action === 'reject' ? '(obrigatório)' : '(opcional)'}
              </Label>
              <Textarea
                id="comment"
                placeholder={
                  action === 'approve' 
                    ? "Comentário opcional..." 
                    : "Motivo da rejeição..."
                }
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
              disabled={processing || (action === 'reject' && !comment.trim())}
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
