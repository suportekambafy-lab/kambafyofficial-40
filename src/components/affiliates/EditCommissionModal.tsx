import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent } from 'lucide-react';

interface EditCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliate: {
    id: string;
    affiliate_name: string;
    affiliate_email: string;
    commission_rate: string;
    products?: {
      name: string;
    };
  } | null;
  onSave: (affiliateId: string, newCommission: string) => Promise<void>;
  isSaving: boolean;
}

export function EditCommissionModal({
  open,
  onOpenChange,
  affiliate,
  onSave,
  isSaving,
}: EditCommissionModalProps) {
  const [newCommission, setNewCommission] = useState<string>('');

  // Reset when modal opens with new affiliate
  React.useEffect(() => {
    if (affiliate && open) {
      // Extract just the number from commission_rate (e.g., "20%" -> "20")
      const currentRate = affiliate.commission_rate.replace('%', '').trim();
      setNewCommission(currentRate);
    }
  }, [affiliate, open]);

  const handleSave = async () => {
    if (!affiliate || !newCommission) return;
    await onSave(affiliate.id, `${newCommission}%`);
    onOpenChange(false);
  };

  // Generate commission options from 1% to 100% in 5% increments
  const commissionOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Editar Comissão
          </DialogTitle>
          <DialogDescription>
            Altere a porcentagem de comissão deste afiliado.
          </DialogDescription>
        </DialogHeader>

        {affiliate && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Afiliado</Label>
              <p className="font-medium">{affiliate.affiliate_name}</p>
              <p className="text-sm text-muted-foreground">{affiliate.affiliate_email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Produto</Label>
              <p className="font-medium">{affiliate.products?.name || 'Produto não encontrado'}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Comissão Atual</Label>
              <p className="font-medium">{affiliate.commission_rate}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-commission">Nova Comissão</Label>
              <Select value={newCommission} onValueChange={setNewCommission}>
                <SelectTrigger id="new-commission">
                  <SelectValue placeholder="Selecione a comissão" />
                </SelectTrigger>
                <SelectContent>
                  {commissionOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !newCommission}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
