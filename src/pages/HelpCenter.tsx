import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Phone, Search, Send } from 'lucide-react';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO, pageSEO } from "@/components/SEO";
import { CrispChat } from "@/components/CrispChat";
const HelpCenter = () => {
  const {
    toast
  } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });
  const faqs = [{
    question: "Como começar a vender na Kambafy?",
    answer: "Para começar, crie sua conta gratuita, configure seu perfil de criador e publique seu primeiro produto. Nossa equipe está disponível para ajudar em cada passo."
  }, {
    question: "Quais métodos de pagamento são aceitos?",
    answer: "Aceitamos Multicaixa Express, BAI Direto, transferências bancárias e outros métodos populares em Angola. Todos os pagamentos são processados em Kwanza."
  }, {
    question: "Como funciona a comissão da plataforma?",
    answer: "A Kambafy cobra apenas 8% por cada venda realizada. Não há planos ou mensalidades - você paga apenas quando vende."
  }, {
    question: "Posso personalizar minha página de criador?",
    answer: "Sim! Você pode personalizar cores, logos, descrições e até usar seu próprio domínio no plano profissional."
  }, {
    question: "Como proteger meu conteúdo contra pirataria?",
    answer: "Usamos tecnologia avançada de proteção, incluindo marca d'água em vídeos, acesso restrito e monitoramento contínuo."
  }, {
    question: "Qual suporte técnico disponível?",
    answer: "Oferecemos suporte por email, chat ao vivo e telefone. Usuários profissionais têm suporte prioritário 24/7."
  }];
  const filteredFaqs = faqs.filter(faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('send-contact-email', {
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
        setContactForm({
          name: "",
          email: "",
          subject: "",
          category: "",
          message: ""
        });
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
  const contactOptions = [{
    icon: <MessageCircle className="w-6 h-6 text-checkout-green" />,
    title: "Chat ao Vivo",
    description: "Resposta imediata das 8h às 18h",
    action: "Iniciar Chat",
    onClick: () => {
      if (window.$crisp) {
        window.$crisp.push(['do', 'chat:show']);
        window.$crisp.push(['do', 'chat:open']);
      }
    }
  }, {
    icon: <Mail className="w-6 h-6 text-checkout-green" />,
    title: "Email",
    description: "suporte@kambafy.com",
    action: "Enviar Email",
    onClick: () => window.location.href = 'mailto:suporte@kambafy.com'
  }, {
    icon: <Phone className="w-6 h-6 text-checkout-green" />,
    title: "Telefone",
    description: "+244 XXX XXX XXX",
    action: "Ligar Agora",
    onClick: () => window.location.href = 'tel:+244XXXXXXXXX'
  }];
  return <>
      <SEO {...pageSEO.helpCenter} />
      <CrispChat />
      <PageLayout title="Centro de Ajuda">
      <div className="space-y-8 md:space-y-12 px-4">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Como Podemos <span className="text-checkout-green">Ajudar?</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
            Encontre respostas rápidas ou entre em contato conosco.
          </p>
          
          <div className="relative max-w-md mx-auto">
            <Input placeholder="Pesquisar na central de ajuda..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {contactOptions.map((option, index) => <div key={index} className="text-center p-4 sm:p-6 bg-checkout-green/5 border border-checkout-green/10 rounded-2xl">
              <div className="mb-3 sm:mb-4 flex justify-center">{option.icon}</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">{option.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{option.description}</p>
              <Button variant="outline" size="sm" className="border-checkout-green text-checkout-green hover:bg-checkout-green/10 w-full sm:w-auto" onClick={option.onClick}>
                  {option.action}
                </Button>
            </div>)}
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Perguntas Frequentes</h3>
          <div className="space-y-4 sm:space-y-6">
            {filteredFaqs.map((faq, index) => <div key={index} className="border border-checkout-green/10 rounded-2xl p-4 sm:p-6">
                <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-checkout-green">
                  {faq.question}
                </h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>)}
            
            {filteredFaqs.length === 0 && searchQuery && <div className="text-center py-6 sm:py-8">
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                  Nenhum resultado encontrado para "{searchQuery}"
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Não encontrou o que procura? Entre em contato conosco abaixo.
                </p>
              </div>}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg sm:text-xl">Entre em Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input placeholder="Seu nome" value={contactForm.name} onChange={e => setContactForm({
                    ...contactForm,
                    name: e.target.value
                  })} required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="seu@email.com" value={contactForm.email} onChange={e => setContactForm({
                    ...contactForm,
                    email: e.target.value
                  })} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input placeholder="Descreva brevemente seu problema" value={contactForm.subject} onChange={e => setContactForm({
                  ...contactForm,
                  subject: e.target.value
                })} required />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={contactForm.category} onValueChange={value => setContactForm({
                  ...contactForm,
                  category: value
                })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dúvida geral">Dúvida geral</SelectItem>
                    <SelectItem value="Problema técnico">Problema técnico</SelectItem>
                    <SelectItem value="Dúvida sobre pagamento">Dúvida sobre pagamento</SelectItem>
                    <SelectItem value="Sugestão">Sugestão</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea placeholder="Descreva seu problema ou dúvida em detalhes..." className="min-h-[120px]" value={contactForm.message} onChange={e => setContactForm({
                  ...contactForm,
                  message: e.target.value
                })} required />
              </div>
              
              <Button type="submit" className="w-full bg-checkout-green hover:bg-checkout-green/90" disabled={loading}>
                {loading ? "Enviando..." : <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Email
                  </>}
              </Button>
            </form>
          </CardContent>
        </Card>

        
      </div>
      </PageLayout>
    </>;
};
export default HelpCenter;