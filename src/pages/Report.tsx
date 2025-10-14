import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Report = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    reportedUrl: '',
    category: '',
    description: ''
  });

  const categories = [
    'Produto fraudulento',
    'Conteúdo pirata',
    'Golpe/Burla',
    'Informações enganosas',
    'Violação de direitos autorais',
    'Outro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envio (aqui você pode integrar com backend)
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Denúncia enviada com sucesso",
      description: "Vamos analisar sua denúncia em até 48 horas.",
    });

    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <>
      <SEO 
        title="Denuncie - Kambafy"
        description="Denuncie fraudes, burlas e conteúdos suspeitos na plataforma Kambafy"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <SubdomainLink to="/" className="flex items-center">
              <img 
                src="/kambafy-logo-white.png" 
                alt="Kambafy" 
                className="h-16 w-auto"
              />
            </SubdomainLink>
            <SubdomainLink to="/">
              <Button variant="ghost">Voltar à Página Inicial</Button>
            </SubdomainLink>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-4xl px-6 py-16">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Denuncie Conteúdo Suspeito</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Ajude-nos a manter a Kambafy segura. Se encontrou algo suspeito, fraudulento ou que viole nossas políticas, denuncie aqui.
                </p>
              </div>

              {/* Info Boxes */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">Confidencialidade</h3>
                  <p className="text-xs text-muted-foreground">
                    Suas informações serão mantidas confidenciais e usadas apenas para investigação.
                  </p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">Análise em 48h</h3>
                  <p className="text-xs text-muted-foreground">
                    Analisamos todas as denúncias em até 48 horas úteis.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="reporterName">Seu Nome (Opcional)</Label>
                    <Input
                      id="reporterName"
                      name="reporterName"
                      value={formData.reporterName}
                      onChange={handleChange}
                      placeholder="Digite seu nome"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reporterEmail">Seu Email *</Label>
                    <Input
                      id="reporterEmail"
                      name="reporterEmail"
                      type="email"
                      value={formData.reporterEmail}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      className="mt-2"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usado apenas para atualizações sobre sua denúncia
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reportedUrl">URL ou Nome do Produto/Vendedor *</Label>
                    <Input
                      id="reportedUrl"
                      name="reportedUrl"
                      value={formData.reportedUrl}
                      onChange={handleChange}
                      placeholder="https://kambafy.com/produto/exemplo ou @username"
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria da Denúncia *</Label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição Detalhada *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descreva o problema em detalhes. Inclua evidências, capturas de tela ou qualquer informação relevante."
                      className="mt-2 min-h-[150px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo 50 caracteres. Quanto mais detalhes, melhor.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting || formData.description.length < 50}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Denúncia"}
                  </Button>
                </div>
              </form>

              {/* Additional Info */}
              <div className="mt-8 bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">O que acontece após denunciar?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Nossa equipe receberá e analisará sua denúncia</li>
                  <li>• Investigaremos o conteúdo reportado em até 48 horas</li>
                  <li>• Se confirmada a violação, tomaremos medidas apropriadas</li>
                  <li>• Você receberá uma atualização por email sobre o resultado</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Denúncia Recebida!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Obrigado por ajudar a manter a Kambafy segura. Vamos analisar sua denúncia e entraremos em contato em até 48 horas.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    reporterName: '',
                    reporterEmail: '',
                    reportedUrl: '',
                    category: '',
                    description: ''
                  });
                }}>
                  Fazer Outra Denúncia
                </Button>
                <SubdomainLink to="/">
                  <Button variant="outline">Voltar à Página Inicial</Button>
                </SubdomainLink>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Report;
