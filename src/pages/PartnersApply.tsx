import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { CheckCircle, ArrowRight, Shield, Zap, Globe, BarChart3 } from "lucide-react";
import { LogoIcon } from "@/components/PaymentMethodIcon";

export default function PartnersApply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    phone: "",
    website: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("partners")
        .insert([formData]);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Aplicação enviada!",
        description: "Receberá uma resposta em até 48 horas.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar aplicação",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <SEO 
          title="Aplicação Enviada - KambaPay Partners"
          description="Sua aplicação para parceiro KambaPay foi enviada com sucesso"
        />
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Aplicação Enviada!</CardTitle>
            <CardDescription>
              Recebemos sua aplicação para se tornar parceiro KambaPay. 
              Nossa equipe irá analisá-la e retornará o contacto em até 48 horas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <SEO 
        title="Seja Parceiro - KambaPay API"
        description="Integre pagamentos KambaPay na sua aplicação. API simples, segura e confiável para empresas"
        keywords="kambapay, api, parceiros, pagamentos, integração"
      />
      
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LogoIcon type="full" height={32} />
              <span className="text-xl font-bold text-primary">KambaPay Partners</span>
            </div>
            <Button variant="outline" asChild>
              <a href="/">Voltar</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Benefits */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Torne-se Parceiro 
                <span className="text-primary block">KambaPay</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Integre pagamentos KambaPay na sua aplicação e ofereça aos seus clientes 
                uma experiência de pagamento simples e segura.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">API Simples</h3>
                  <p className="text-muted-foreground">
                    Integração em minutos com nossa API RESTful bem documentada
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Segurança Máxima</h3>
                  <p className="text-muted-foreground">
                    Autenticação por API key, logs detalhados e monitoramento em tempo real
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Webhooks Inteligentes</h3>
                  <p className="text-muted-foreground">
                    Receba notificações automáticas sobre pagamentos e alterações de saldo
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Analytics Detalhadas</h3>
                  <p className="text-muted-foreground">
                    Dashboard completo com estatísticas de uso e performance
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Comissão Competitiva</span>
                  <Badge variant="secondary">2.5%</Badge>
                </CardTitle>
                <CardDescription>
                  Apenas 2.5% por transação processada. Sem taxas de setup ou mensalidades.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Right Column - Application Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Aplicação de Parceria</CardTitle>
              <CardDescription>
                Preencha os dados da sua empresa para iniciar o processo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Nome da Empresa *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    placeholder="Ex: TechCorp Lda"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_name">Nome do Contacto *</Label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    required
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">Email Corporativo *</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    required
                    placeholder="joao@techcorp.ao"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+244 900 000 000"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://techcorp.ao"
                  />
                </div>


                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Enviar Aplicação"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}