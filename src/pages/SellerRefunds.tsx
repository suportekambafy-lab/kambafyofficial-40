import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRefunds } from '@/hooks/useRefunds';
import { 
  RefreshCw, 
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

export default function SellerRefunds() {
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-3">
          <AlertCircle className="h-8 w-8" />
          Gerenciar Reembolsos
        </h1>
        <p className="text-muted-foreground text-lg mb-4">
          Analise e processe solicitações de reembolso dos seus clientes
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
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pendingRefunds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">Nenhuma solicitação de reembolso pendente</p>
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
                      <Badge variant="outline" className="ml-2">Pendente</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Produto: {refund.products?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {refund.orders?.customer_name || refund.buyer_email}
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
                    automaticamente descontado do seu saldo disponível. Se não houver saldo suficiente, 
                    seu saldo ficará negativo até regularização.
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
