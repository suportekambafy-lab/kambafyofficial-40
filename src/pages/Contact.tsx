import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";
import { SEO } from "@/components/SEO";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres"),
  phone: z.string().trim().max(20, "Telefone deve ter no máximo 20 caracteres").optional().or(z.literal("")),
  message: z.string().trim().min(1, "Mensagem é obrigatória").max(1000, "Mensagem deve ter no máximo 1000 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Mensagem enviada com sucesso!",
        description: "Entraremos em contato em breve.",
      });

      // Limpar formulário
      setFormData({ name: "", email: "", phone: "", message: "" });
      
      // Redirecionar após 2 segundos
      setTimeout(() => navigate("/"), 2000);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      <SEO 
        title="Contato - Falar com Especialista | Kambafy"
        description="Entre em contato com nossa equipe de especialistas. Estamos prontos para ajudar você a transformar seu conhecimento em um negócio digital de sucesso."
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Falar com Especialista</h1>
              <p className="text-muted-foreground text-lg">
                Preencha o formulário abaixo e entraremos em contato em breve
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    placeholder="Como podemos ajudar você?"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className={errors.message ? "border-destructive" : ""}
                    rows={6}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Enviar mensagem"}
                </Button>
              </form>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-6 text-center space-y-3">
              <div className="flex justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ou entre em contato diretamente:</p>
                <a 
                  href="mailto:contato@kambafy.com" 
                  className="text-primary hover:underline font-medium"
                >
                  contato@kambafy.com
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Contact;
