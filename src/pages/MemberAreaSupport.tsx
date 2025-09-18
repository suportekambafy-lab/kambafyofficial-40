import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Mail, Phone, Clock, Send, HelpCircle } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';

export default function MemberAreaSupport() {
  const { student, memberArea } = useMemberAreaAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simular envio - em produção conectaria com o backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Mensagem enviada!",
        description: "Nossa equipe responderá em até 24 horas."
      });
      
      setFormData({ subject: '', message: '', priority: 'normal' });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportChannels = [
    {
      icon: MessageCircle,
      title: "Chat Online",
      description: "Disponível das 9h às 18h",
      action: "Iniciar Chat",
      available: true
    },
    {
      icon: Mail,
      title: "Email",
      description: "suporte@exemplo.com",
      action: "Enviar Email",
      available: true
    },
    {
      icon: Phone,
      title: "Telefone",
      description: "(11) 9999-9999",
      action: "Ligar Agora",
      available: false
    }
  ];

  const faqs = [
    {
      question: "Como acessar as aulas?",
      answer: "Você pode acessar as aulas através do menu 'Conteúdos' ou diretamente pela página inicial."
    },
    {
      question: "Posso baixar os materiais?",
      answer: "Sim! Todos os materiais de apoio estão disponíveis para download na seção 'Materiais de Apoio'."
    },
    {
      question: "Como acompanhar meu progresso?",
      answer: "Seu progresso é atualizado automaticamente e pode ser visualizado na página 'Meus Cursos'."
    },
    {
      question: "O certificado é válido?",
      answer: "Sim, nosso certificado é reconhecido e você pode utilizá-lo em seu currículo profissional."
    }
  ];

  return (
    <>
      <SEO 
        title={`Suporte - ${memberArea?.name || 'Área de Membros'}`}
        description="Entre em contato conosco. Estamos aqui para ajudar você!"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Centro de Suporte</h1>
            <p className="text-muted-foreground">Estamos aqui para ajudar você! Entre em contato conosco</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Enviar Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome</Label>
                        <Input 
                          id="name" 
                          value={student?.name || ''} 
                          disabled 
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={student?.email || ''} 
                          disabled 
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Descreva brevemente sua dúvida"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="priority">Prioridade</Label>
                      <select
                        id="priority"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full p-2 border border-input rounded-md bg-background"
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Descreva sua dúvida ou problema em detalhes..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Support Channels & FAQ */}
            <div className="space-y-6">
              {/* Contact Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Canais de Atendimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportChannels.map((channel, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      channel.available ? 'border-primary/20 bg-primary/5' : 'border-muted bg-muted/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <channel.icon className={`w-5 h-5 ${
                          channel.available ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <h4 className="font-semibold">{channel.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
                      <Button 
                        size="sm" 
                        variant={channel.available ? "default" : "secondary"}
                        disabled={!channel.available}
                        className="w-full"
                      >
                        {channel.action}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Tempo de Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chat Online</span>
                    <span className="font-semibold text-green-600">Imediato</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-semibold">Até 24h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formulário</span>
                    <span className="font-semibold">Até 48h</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-semibold text-primary">{faq.question}</h4>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}