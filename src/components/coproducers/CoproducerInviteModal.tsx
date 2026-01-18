import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, HelpCircle } from 'lucide-react';
import { validateEmail } from '@/components/checkout/EnhancedFormValidation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CoproducerInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, commissionRate: number, name?: string, durationDays?: number) => void;
  isLoading: boolean;
  availableCommission: number;
}

export function CoproducerInviteModal({
  open,
  onOpenChange,
  onInvite,
  isLoading,
  availableCommission
}: CoproducerInviteModalProps) {
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [errors, setErrors] = useState<{ email?: string; commission?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { email?: string; commission?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }
    
    const rate = parseFloat(commissionRate);
    if (!commissionRate) {
      newErrors.commission = 'Comissão é obrigatória';
    } else if (isNaN(rate) || rate <= 0) {
      newErrors.commission = 'Comissão deve ser maior que 0%';
    } else if (rate >= 100) {
      newErrors.commission = 'Comissão deve ser menor que 100%';
    } else if (rate > availableCommission) {
      newErrors.commission = `Máximo disponível: ${availableCommission}%`;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onInvite(email.trim(), rate, undefined, parseInt(durationDays));
    
    setEmail('');
    setCommissionRate('');
    setDurationDays('30');
    setErrors({});
  };

  const handleClose = () => {
    setEmail('');
    setCommissionRate('');
    setDurationDays('30');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Co-produção</DialogTitle>
          <DialogDescription>
            Preencha as informações do seu co-produtor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Email */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label htmlFor="email" className="text-right text-muted-foreground">
              E-mail do co-produtor
            </Label>
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Duração do contrato */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label htmlFor="duration" className="text-right text-muted-foreground">
              Duração do contrato
            </Label>
            <Select value={durationDays} onValueChange={setDurationDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
                <SelectItem value="365">365 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comissão */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label htmlFor="commission" className="text-right text-muted-foreground">
              Comissão (%)
            </Label>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  id="commission"
                  type="number"
                  min="1"
                  max={availableCommission}
                  step="0.01"
                  placeholder=""
                  value={commissionRate}
                  onChange={(e) => {
                    setCommissionRate(e.target.value);
                    if (errors.commission) setErrors(prev => ({ ...prev, commission: undefined }));
                  }}
                  className={`w-24 ${errors.commission ? 'border-destructive' : ''}`}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              {errors.commission && (
                <p className="text-sm text-destructive">{errors.commission}</p>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-3 bg-primary/5 border-l-4 border-primary rounded-r-md">
            <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <a href="#" className="text-primary hover:underline text-sm">
              Aprenda mais sobre modelos de co-produção
            </a>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Convidando...
                </>
              ) : (
                'Convidar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
