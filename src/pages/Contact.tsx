import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Contact = () => {
  return (
    <>
      <SEO 
        title="Contato | Kambafy"
        description="Entre em contato conosco. Estamos aqui para ajudar."
      />
      <PageLayout title="Contato">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Fale Conosco
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">contato@kambafy.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telefone</h3>
                  <p className="text-muted-foreground">+244 123 456 789</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Chat Online</h3>
                  <p className="text-muted-foreground">Disponível de segunda a sexta, 9h às 18h</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-2xl p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Nome
                </label>
                <Input id="name" placeholder="Seu nome completo" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input id="email" type="email" placeholder="seu@email.com" />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Assunto
                </label>
                <Input id="subject" placeholder="Como podemos ajudar?" />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Mensagem
                </label>
                <Textarea 
                  id="message" 
                  placeholder="Descreva sua dúvida ou solicitação..." 
                  rows={5}
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg">
                Enviar Mensagem
              </Button>
            </form>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Contact;