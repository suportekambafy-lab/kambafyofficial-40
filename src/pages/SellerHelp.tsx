import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Search, 
  Book, 
  Video, 
  Users,
  Clock
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

// Função para abrir o Crisp Chat
const openCrispChat = () => {
  if (window.$crisp) {
    window.$crisp.push(['do', 'chat:show']);
    window.$crisp.push(['do', 'chat:open']);
  }
};

// Declaração de tipos globais
declare global {
  interface Window {
    $crisp: any[];
  }
}

export default function SellerHelp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("faq");
  
  // Form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });

  const faqs = [
    {
      question: "Como criar meu primeiro produto?",
      answer: "Para criar seu primeiro produto, vá até a seção 'Produtos' no menu lateral e clique em 'Novo Produto'. Preencha as informações necessárias como nome, descrição, preço e tipo de produto. Depois disso, você pode configurar as opções de pagamento e publicar seu produto.",
      category: "produtos"
    },
    {
      question: "Como funciona o sistema de comissões?",
      answer: "A Kambafy cobra apenas 8% por cada venda realizada. A comissão é automaticamente deduzida do valor da venda e o restante fica disponível em seu saldo para saque. Sem planos, sem mensalidades - você paga apenas quando vende.",
      category: "financeiro"
    },
    {
      question: "Quando recebo o dinheiro das vendas?",
      answer: "O dinheiro das vendas fica disponível em seu saldo 7 dias após a data da venda. Você pode solicitar saques a qualquer momento através da seção 'Financeiro', e o processamento leva até 2 dias úteis.",
      category: "financeiro"
    },
    {
      question: "Como proteger meu conteúdo digital?",
      answer: "A Kambafy oferece proteção avançada para seu conteúdo: arquivos são criptografados, há controle de acesso por usuário, marca d'água em vídeos e monitoramento de compartilhamento não autorizado.",
      category: "segurança"
    },
    {
      question: "Posso vender produtos físicos também?",
      answer: "Sim! Além de produtos digitais, você pode vender produtos físicos, serviços e até mesmo criar uma área de membros com conteúdo exclusivo.",
      category: "produtos"
    },
    {
      question: "Como funciona o programa de afiliados?",
      answer: "Você pode convidar outras pessoas para promover seus produtos e ganhar uma comissão por cada venda que gerarem. Configure a porcentagem de comissão na seção 'Meus Afiliados' e compartilhe seu link especial.",
      category: "afiliados"
    },
    {
      question: "Como configurar meu IBAN para recebimentos?",
      answer: "Vá na seção 'Financeiro' e preencha seu IBAN sem o código do país (AO06). Certifique-se de que o nome do titular coincide com o da sua conta bancária para evitar problemas nos pagamentos.",
      category: "financeiro"
    },
    {
      question: "Posso personalizar minha página de checkout?",
      answer: "Sim! Na seção de cada produto, você pode personalizar cores, textos, adicionar provas sociais e configurar elementos visuais para aumentar suas conversões.",
      category: "personalização"
    }
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: contactForm.name,
          email: contactForm.email,
          phone: "",
          subject: contactForm.subject,
          message: contactForm.message
        }
      });

      if (error) {
        console.error('Error sending contact email:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar email. Tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Recebemos seu email e responderemos em breve."
        });
        
        setContactForm({ name: "", email: "", subject: "", category: "", message: "" });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar email. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">{t('help.title')}</h1>
        <p className="text-lg text-muted-foreground">
          {t('help.subtitle')}
        </p>
        
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('common.search')} 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={openCrispChat}
        >
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Chat ao Vivo</h3>
            <p className="text-sm text-muted-foreground mb-3">Suporte imediato das 8h às 18h</p>
            <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => window.location.href = '/vendedor/documentacao'}
        >
          <CardContent className="p-6 text-center">
            <Book className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Documentação</h3>
            <p className="text-sm text-muted-foreground mb-3">Guias completos e tutoriais</p>
            <Badge className="bg-blue-500 hover:bg-blue-600">Disponível</Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Video className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Vídeo Tutoriais</h3>
            <p className="text-sm text-muted-foreground mb-3">Aprenda assistindo</p>
            <Badge variant="secondary">Em Breve</Badge>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => window.location.href = '/comunidade'}
        >
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Comunidade</h3>
            <p className="text-sm text-muted-foreground mb-3">Conecte-se com outros criadores</p>
            <Badge className="bg-purple-500 hover:bg-purple-600">Disponível</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              {filteredFaqs.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchQuery}"</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("contact")}>
                    Entrar em contato
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Enviar Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo</label>
                    <Input 
                      placeholder="Seu nome"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email"
                      placeholder="seu@email.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assunto</label>
                    <Input 
                      placeholder="Descreva brevemente seu problema"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <Select value={contactForm.category} onValueChange={(value) => setContactForm({...contactForm, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Problema técnico">Problema técnico</SelectItem>
                        <SelectItem value="Dúvida sobre pagamento">Dúvida sobre pagamento</SelectItem>
                        <SelectItem value="Configuração de produto">Configuração de produto</SelectItem>
                        <SelectItem value="Sugestão de melhoria">Sugestão de melhoria</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem</label>
                    <Textarea 
                      placeholder="Descreva seu problema ou dúvida em detalhes..."
                      className="min-h-[120px]"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários de Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Segunda a Sexta</span>
                    <span className="font-semibold">8h às 18h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sábado</span>
                    <span className="font-semibold">9h às 14h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domingo</span>
                    <span className="text-muted-foreground">Fechado</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Outros Canais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => window.open("https://chat.whatsapp.com/JgR87LKoVkYJ3ZGpNlmGMh", "_blank")}>
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-muted-foreground">Grupo da Comunidade</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => window.location.href = 'mailto:suporte@kambafy.com'}>
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">suporte@kambafy.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
  );
}
