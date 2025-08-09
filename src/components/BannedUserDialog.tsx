import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [contestSent, setContestSent] = useState(false);
  const { toast } = useToast();

  const handleSubmitContest = async () => {
    if (!contestMessage.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, digite sua mensagem de contestação.',
        variant: 'destructive'
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
        description: 'Sua contestação foi enviada para nossa equipe. Aguarde nossa resposta em até 48-72 horas.',
      });

      setContestSent(true);
      setContestMessage('');
    } catch (error) {
      console.error('Erro ao enviar contestação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar contestação. Tente novamente ou envie diretamente para suporte@kambafy.com',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
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

          {contestSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contestação Enviada com Sucesso!
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Sua contestação foi enviada para nossa equipe de suporte. Você receberá uma resposta em até 48-72 horas úteis no email: <strong>{contactEmail}</strong>
              </p>
              <div className="bg-green-100 p-3 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Próximos passos:</strong>
                </p>
                <ul className="text-sm text-green-700 mt-1 list-disc list-inside">
                  <li>Aguarde nossa resposta no email fornecido</li>
                  <li>Verifique também a pasta de spam/lixo eletrônico</li>
                  <li>Prepare documentos adicionais que possam comprovar sua contestação</li>
                </ul>
              </div>
            </div>
          ) : (
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
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Ou envie diretamente para: <strong>suporte@kambafy.com</strong></p>
            <p className="mt-2">Nossa equipe responderá em até 48-72 horas úteis.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}