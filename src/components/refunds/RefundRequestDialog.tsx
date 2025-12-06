import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRefunds } from '@/hooks/useRefunds';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
  isReopen?: boolean;
}

export function RefundRequestDialog({ open, onClose, order, onSuccess, isReopen = false }: Props) {
  const { createRefund, reopenRefund } = useRefunds('buyer');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    setLoading(true);
    
    let result;
    if (isReopen) {
      result = await reopenRefund(order.order_id, reason);
    } else {
      result = await createRefund(order.order_id, reason);
    }
    
    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {isReopen && <RefreshCw className="h-4 w-4" />}
            {isReopen ? 'Solicitar Novamente' : 'Solicitar Reembolso'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isReopen 
              ? `Envie uma nova solicitação para o pedido ${order.order_id}`
              : `Descreva o motivo para o pedido ${order.order_id}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              {isReopen 
                ? 'O vendedor será notificado novamente sobre sua solicitação.'
                : 'O vendedor será notificado e precisará aprovar sua solicitação.'
              }
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-sm">Motivo *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            size="sm"
            onClick={handleSubmit} 
            disabled={!reason.trim() || loading}
            variant="destructive"
          >
            {loading ? 'Enviando...' : isReopen ? 'Reenviar' : 'Solicitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
