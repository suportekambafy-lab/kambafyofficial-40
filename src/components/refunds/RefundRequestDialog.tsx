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
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

export function RefundRequestDialog({ open, onClose, order, onSuccess }: Props) {
  const { createRefund } = useRefunds('buyer');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    setLoading(true);
    const result = await createRefund(order.order_id, reason);
    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Reembolso</DialogTitle>
          <DialogDescription>
            Descreva o motivo da solicitação de reembolso para o pedido {order.order_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Atenção</p>
              <p>O vendedor será notificado e terá que aprovar sua solicitação. Após aprovação, o valor será automaticamente creditado na sua conta.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Reembolso *</Label>
            <Textarea
              id="reason"
              placeholder="Ex: O produto não corresponde à descrição, não consegui acessar o conteúdo, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja claro e detalhado para facilitar a análise do vendedor
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim() || loading}
            variant="destructive"
          >
            {loading ? 'Enviando...' : 'Solicitar Reembolso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
