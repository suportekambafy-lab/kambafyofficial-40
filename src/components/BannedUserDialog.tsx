import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Mail, Send, LogOut } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BannedUserDialogProps {
  isOpen: boolean;
  banReason: string;
  userEmail: string;
  userName: string;
}

export function BannedUserDialog({ isOpen, banReason, userEmail, userName }: BannedUserDialogProps) {
  const [contestMessage, setContestMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useCustomToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao sair da conta. Tente novamente.',
        variant: 'error'
      });
    }
  };

  const handleClose = () => {
    navigate('/auth');
  };

  const handleSubmitContest = async () => {
    if (!contestMessage.trim()) {
      toast({
        title: 'Erro',
        message: 'Por favor, digite sua mensagem de contestação.',
        variant: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: userName,
          email: contactEmail,
          subject: `Contestação de Suspensão de Conta - ${userName}`,
          message: `
CONTESTAÇÃO DE SUSPENSÃO DE CONTA

Nome: ${userName}
Email: ${contactEmail}
Motivo da suspensão: ${banReason}

Mensagem de contestação:
${contestMessage}

---
Este email foi enviado através do sistema de contestação da Kambafy.
          `.trim()
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Contestação Enviada',
        message: 'Sua contestação foi enviada para nossa equipe. Aguarde nossa resposta em até 48-72 horas.',
        variant: 'success'
      });

      setContestMessage('');
    } catch (error) {
      console.error('Erro ao enviar contestação:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao enviar contestação. Tente novamente ou envie diretamente para suporte@kambafy.com',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Conta Suspensa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h3 className="font-semibold text-destructive mb-2">Motivo da suspensão:</h3>
            <p className="text-sm text-muted-foreground">{banReason}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contestar esta decisão
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Se você acredita que esta suspensão foi um erro, explique sua situação abaixo:
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="contestEmail">Email de contato</Label>
                <Input
                  id="contestEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="contestMessage">Mensagem de contestação</Label>
                <Textarea
                  id="contestMessage"
                  value={contestMessage}
                  onChange={(e) => setContestMessage(e.target.value)}
                  placeholder="Explique por que acredita que a suspensão foi um erro. Inclua detalhes relevantes e evidências que possam apoiar seu caso..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              <Button
                onClick={handleSubmitContest}
                disabled={isSubmitting}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Enviando...' : 'Enviar Contestação'}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Ou envie diretamente para: <strong>suporte@kambafy.com</strong></p>
            <p className="mt-2">Nossa equipe responderá em até 48-72 horas úteis.</p>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da Conta e Fazer Login com Outra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}