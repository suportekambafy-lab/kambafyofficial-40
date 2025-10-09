
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Mail, Clock } from 'lucide-react';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO, pageSEO } from "@/components/SEO";

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message
        }
      });

      if (error) {
        console.error('Error sending contact email:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar mensagem. Tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Mensagem enviada!",
          description: "Recebemos sua mensagem e responderemos em breve."
        });
        
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
      }
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO {...pageSEO.contact} />
      <PageLayout title="Contacto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 px-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Entre em Contacto</h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input 
                    placeholder="Seu nome completo" 
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <Input 
                  placeholder="+244 XXX XXX XXX" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assunto</label>
                <Select value={formData.subject} onValueChange={(value) => handleInputChange("subject", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o assunto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suporte">Suporte Técnico</SelectItem>
                    <SelectItem value="vendas">Informações de Vendas</SelectItem>
                    <SelectItem value="parceria">Parcerias</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mensagem</label>
                <Textarea 
                  placeholder="Descreva como podemos ajudar você..."
                  rows={6}
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-checkout-green hover:bg-checkout-green/90 text-white"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </form>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Informações de Contacto</h3>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-checkout-green mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Endereço</h4>
                    <p className="text-muted-foreground">
                      Rua da Independência, Nº 123<br />
                      Maianga, Luanda - Angola
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Mail className="w-6 h-6 text-checkout-green mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Email</h4>
                    <p className="text-muted-foreground">suporte@kambafy.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Clock className="w-6 h-6 text-checkout-green mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Horário de Atendimento</h4>
                    <p className="text-muted-foreground">Segunda a Sexta: 8h às 18h</p>
                    <p className="text-muted-foreground">Sábado: 8h às 14h</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
              <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Precisa de Ajuda?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Para questões urgentes, utilize o nosso chat inteligente no canto inferior direito do ecrã ou entre em contacto pelos canais tradicionais.
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Contact;
