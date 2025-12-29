import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ResendAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: {
    id: string;
    customer_email: string;
    customer_name: string;
    status: string;
  } | null;
}

export function ResendAccessDialog({ 
  open, 
  onOpenChange, 
  sale 
}: ResendAccessDialogProps) {
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && sale) {
      setEmail(sale.customer_email);
      setIsEditing(false);
    }
  }, [open, sale]);

  const handleResend = async () => {
    if (!sale) return;

    if (sale.status !== 'completed') {
      toast({
        title: 'Erro',
        description: 'Só é possível reenviar acesso para vendas pagas.',
        variant: 'destructive',
      });
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const normalizedEmail = email.trim().toLowerCase();
      const isEmailChanged = normalizedEmail !== sale.customer_email.toLowerCase().trim();
      
      console.log('🔄 Reenviando acesso para:', normalizedEmail, isEmailChanged ? '(email alterado)' : '');
      
      const { data, error } = await supabase.functions.invoke('resend-purchase-access', {
        body: { 
          orderIds: [sale.id],
          overrideEmail: isEmailChanged ? normalizedEmail : undefined
        }
      });

      if (error) throw error;

      console.log('✅ Resultado do reenvio:', data);

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.success) {
          if (result.error === 'already_has_access') {
            toast({
              title: 'Acesso reenviado',
              description: `O cliente já tinha acesso — reenviamos o email para ${normalizedEmail}.`,
            });
          } else {
            toast({
              title: 'Acesso reenviado com sucesso',
              description: `Email enviado para ${normalizedEmail}${result.account_created ? ' (nova conta criada)' : ''}`,
            });
          }
        } else {
          throw new Error(result.error || 'Falha ao reenviar acesso');
        }
      } else {
        toast({
          title: 'Acesso reenviado',
          description: `Email de acesso enviado para ${normalizedEmail}`,
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Erro ao reenviar acesso:', error);
      toast({
        title: 'Erro ao reenviar acesso',
        description: error.message || 'Não foi possível reenviar o acesso.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Reenviar Acesso ao Cliente
          </DialogTitle>
          <DialogDescription>
            Envie o email de acesso para o cliente. Você pode alterar o email de destino se necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Cliente</Label>
            <Input 
              id="customer-name" 
              value={sale?.customer_name || ""} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="customer-email">Email de envio</Label>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Alterar
                </Button>
              )}
            </div>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
              placeholder="email@exemplo.com"
            />
            {isEditing && email.toLowerCase().trim() !== sale?.customer_email.toLowerCase().trim() && (
              <p className="text-xs text-amber-600">
                ⚠️ O email foi alterado. O acesso será concedido a este novo email.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleResend}
            disabled={isProcessing || !email.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Acesso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
