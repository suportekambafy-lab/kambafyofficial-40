import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Mail, Send, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BannedUserDialogProps {
  banReason: string;
  userEmail: string;
  userName: string;
}

export function BannedUserDialog({ banReason, userEmail, userName }: BannedUserDialogProps) {
  const [contestMessage, setContestMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contestSent, setContestSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  console.log('🚫 BannedUserDialog renderizando:', { banReason, userEmail, userName });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h1 className="text-xl font-semibold text-destructive">Conta Suspensa</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="space-y-8">
          {/* Ban Reason */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="font-semibold text-destructive mb-3 text-lg">Motivo da suspensão:</h2>
            <p className="text-muted-foreground">{banReason}</p>
          </div>

          {/* Contest Form or Success Message */}
          {contestSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="font-semibold text-green-800 mb-3 flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Contestação Enviada com Sucesso!
              </h2>
              <p className="text-green-700 mb-4">
                Sua contestação foi enviada para nossa equipe de suporte. Você receberá uma resposta em até 48-72 horas úteis no email: <strong>{contactEmail}</strong>
              </p>
              <div className="bg-green-100 p-4 rounded-md">
                <p className="text-green-800 font-medium mb-2">
                  Próximos passos:
                </p>
                <ul className="text-green-700 space-y-1 list-disc list-inside">
                  <li>Aguarde nossa resposta no email fornecido</li>
                  <li>Verifique também a pasta de spam/lixo eletrônico</li>
                  <li>Prepare documentos adicionais que possam comprovar sua contestação</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="font-semibold text-blue-800 mb-3 flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Contestar esta decisão
              </h2>
              <p className="text-blue-700 mb-6">
                Se você acredita que esta suspensão foi um erro, explique sua situação abaixo:
              </p>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="contestEmail" className="text-base font-medium">Email de contato</Label>
                  <Input
                    id="contestEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contestMessage" className="text-base font-medium">Mensagem de contestação</Label>
                  <Textarea
                    id="contestMessage"
                    value={contestMessage}
                    onChange={(e) => setContestMessage(e.target.value)}
                    placeholder="Explique por que acredita que a suspensão foi um erro. Inclua detalhes relevantes e evidências que possam apoiar seu caso..."
                    rows={6}
                    className="resize-none mt-2"
                  />
                </div>
                
                <Button
                  onClick={handleSubmitContest}
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Contestação'}
                </Button>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="text-center text-muted-foreground bg-muted/50 rounded-lg p-6">
            <p className="text-base">Ou envie diretamente para: <strong className="text-foreground">suporte@kambafy.com</strong></p>
            <p className="mt-2">Nossa equipe responderá em até 48-72 horas úteis.</p>
          </div>
        </div>
      </main>
    </div>
  );
}