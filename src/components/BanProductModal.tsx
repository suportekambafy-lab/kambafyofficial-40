import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BanProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  productName: string;
  isLoading?: boolean;
}

const predefinedReasons = [
  'Conteúdo inadequado ou ofensivo',
  'Violação de direitos autorais',
  'Produto não entregue',
  'Descrição enganosa',
  'Qualidade insatisfatória',
  'Preço abusivo',
  'Spam ou conteúdo irrelevante',
  'Violação dos termos de uso',
  'Outro motivo'
];

export default function BanProductModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productName, 
  isLoading = false 
}: BanProductModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const reason = selectedReason === 'Outro motivo' ? customReason : selectedReason;
    if (!reason.trim()) return;
    
    onConfirm(reason);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const finalReason = selectedReason === 'Outro motivo' ? customReason : selectedReason;
  const isValid = finalReason.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">🚫 Banir Produto</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Você está prestes a banir o produto:
            </p>
            <p className="font-medium text-sm bg-muted p-2 rounded">
              {productName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do banimento *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {predefinedReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason === 'Outro motivo' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Descreva o motivo</Label>
              <Textarea
                id="custom-reason"
                placeholder="Digite o motivo específico do banimento..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-amber-50 p-2 rounded border border-amber-200">
            ⚠️ Esta ação banirá o produto permanentemente. O vendedor poderá solicitar revisão.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isLoading ? 'Banindo...' : 'Confirmar Banimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}