import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, UserX } from 'lucide-react';

interface BanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
  isLoading: boolean;
}

export function BanUserDialog({ isOpen, onClose, onConfirm, userName, isLoading }: BanUserDialogProps) {
  const [banReason, setBanReason] = useState('');

  const handleConfirm = () => {
    if (banReason.trim()) {
      onConfirm(banReason);
      setBanReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Banir Usuário
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está prestes a banir o usuário <strong>{userName}</strong>. 
            Esta ação irá suspender a conta e enviar um email de notificação.
          </p>
          
          <div>
            <Label htmlFor="banReason">Motivo do banimento *</Label>
            <Textarea
              id="banReason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Explique o motivo do banimento (ex: Violação dos termos de uso, conteúdo inadequado, etc.)"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!banReason.trim() || isLoading}
          >
            <UserX className="h-4 w-4 mr-2" />
            {isLoading ? 'Banindo...' : 'Confirmar Banimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}