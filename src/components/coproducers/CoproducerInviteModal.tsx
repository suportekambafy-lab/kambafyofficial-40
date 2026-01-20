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
import { Loader2, Mail, Percent, User, Calendar } from 'lucide-react';
import { validateEmail } from '@/components/checkout/EnhancedFormValidation';

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
  const [name, setName] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [errors, setErrors] = useState<{ email?: string; commission?: string; duration?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { email?: string; commission?: string; duration?: string } = {};
    
    // Validar email
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validar comissão
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
    
    // Validar duração
    const duration = parseInt(durationDays);
    if (!durationDays) {
      newErrors.duration = 'Duração é obrigatória';
    } else if (isNaN(duration) || duration < 1) {
      newErrors.duration = 'Duração mínima: 1 dia';
    } else if (duration > 365) {
      newErrors.duration = 'Duração máxima: 365 dias';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onInvite(email.trim(), rate, name.trim() || undefined, duration);
    
    // Reset form
    setEmail('');
    setName('');
    setCommissionRate('');
    setDurationDays('30');
    setErrors({});
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setCommissionRate('');
    setDurationDays('30');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Co-Produtor</DialogTitle>
          <DialogDescription>
            Envie um convite para alguém co-produzir este produto. 
            O co-produtor receberá a percentagem definida em cada venda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email do Co-Produtor *
              </div>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
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

          {/* Nome (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome (opcional)
              </div>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Nome do co-produtor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Comissão */}
          <div className="space-y-2">
            <Label htmlFor="commission">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Percentagem de Comissão *
              </div>
            </Label>
            <div className="relative">
              <Input
                id="commission"
                type="number"
                min="1"
                max={availableCommission}
                step="0.01"
                placeholder={`1 - ${availableCommission}`}
                value={commissionRate}
                onChange={(e) => {
                  setCommissionRate(e.target.value);
                  if (errors.commission) setErrors(prev => ({ ...prev, commission: undefined }));
                }}
                className={errors.commission ? 'border-destructive pr-8' : 'pr-8'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            {errors.commission ? (
              <p className="text-sm text-destructive">{errors.commission}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Disponível: até {availableCommission}%
              </p>
            )}
          </div>

          {/* Duração do contrato */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validade do Contrato *
              </div>
            </Label>
            <div className="relative">
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                placeholder="30"
                value={durationDays}
                onChange={(e) => {
                  setDurationDays(e.target.value);
                  if (errors.duration) setErrors(prev => ({ ...prev, duration: undefined }));
                }}
                className={errors.duration ? 'border-destructive pr-12' : 'pr-12'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                dias
              </span>
            </div>
            {errors.duration ? (
              <p className="text-sm text-destructive">{errors.duration}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Após este período, a co-produção expira automaticamente
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Convite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
