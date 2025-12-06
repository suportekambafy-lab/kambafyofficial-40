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
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-3 text-foreground">
          <AlertCircle className="h-8 w-8" />
          {t('refunds.title')}
        </h1>
        <p className="text-muted-foreground text-lg mb-4">
          {t('refunds.subtitle')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRefunds.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo de resposta</p>
                  <p className="text-lg font-semibold">48h úteis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Impacto no saldo</p>
                  <p className="text-lg font-semibold">Imediato</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Analise o motivo da solicitação antes de decidir</li>
                <li>Ao aprovar, o valor é descontado automaticamente do seu saldo</li>
                <li>Se rejeitar, explique o motivo para manter um bom relacionamento</li>
                <li>O prazo máximo de resposta é de 7 dias corridos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <PageSkeleton variant="refunds" />
      ) : (
        <div className="space-y-8">
          {/* Pendentes */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Solicitações Pendentes
            </h2>
            {pendingRefunds.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRefunds.map((refund) => (
                  <Card key={refund.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-yellow-600" />
                            <h3 className="font-semibold text-lg">
                              Pedido: {refund.order_id}
                            </h3>
                            {getStatusBadge(refund.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Produto: {refund.products?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {refund.buyer_email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            {refund.amount} {refund.currency}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(refund.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Motivo do Cliente:
                        </p>
                        <p className="text-sm text-muted-foreground">{refund.reason}</p>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Atenção:</strong> Ao aprovar, o valor de {refund.amount} {refund.currency} será 
                          automaticamente descontado do seu saldo disponível.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => openDialog(refund, 'approve')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar Reembolso
                        </Button>
                        <Button
                          onClick={() => openDialog(refund, 'reject')}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar Pedido
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
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                Histórico de Reembolsos
              </h2>
              <div className="space-y-3">
                {processedRefunds.map((refund) => (
                  <Card key={refund.id} className="border-l-4 border-l-muted">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(refund.status)}
                            <h3 className="font-medium">
                              Pedido: {refund.order_id}
                            </h3>
                            {getStatusBadge(refund.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Produto: {refund.products?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {refund.buyer_email}
                          </p>
                          
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Motivo:</span> {refund.reason}
                            </p>
                            {refund.seller_comment && (
                              <p className="text-muted-foreground mt-1">
                                <span className="font-medium">Seu comentário:</span> {refund.seller_comment}
                              </p>
                            )}
                            {refund.admin_comment && (
                              <p className="text-muted-foreground mt-1">
                                <span className="font-medium">Comentário Admin:</span> {refund.admin_comment}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {refund.amount} {refund.currency}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(refund.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          {refund.updated_at && refund.updated_at !== refund.created_at && (
                            <p className="text-xs text-muted-foreground">
                              Atualizado: {format(new Date(refund.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Aprovar Reembolso' : 'Rejeitar Reembolso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {action === 'approve' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Confirmação Necessária:</strong><br />
                  O valor de <strong>{selectedRefund?.amount} {selectedRefund?.currency}</strong> será 
                  descontado do seu saldo imediatamente após aprovação.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">
                Comentário {action === 'reject' ? '(obrigatório)' : '(opcional)'}
              </Label>
              <Textarea
                id="comment"
                placeholder={
                  action === 'approve' 
                    ? "Adicione um comentário opcional..." 
                    : "Explique o motivo da rejeição..."
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
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
              onClick={handleProcess}
              disabled={processing || (action === 'reject' && !comment.trim())}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processando...' : action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
