import { SEO } from "@/components/SEO";
import { Mail, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubdomainLink } from "@/components/SubdomainLink";

const Contact = () => {
  return (
    <>
      <SEO 
        title="Contato | Kambafy"
        description="Entre em contato conosco. Estamos aqui para ajudar."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <SubdomainLink to="/" className="flex items-center">
                <img 
                  src="/kambafy-logo-white.png" 
                  alt="Kambafy" 
                  className="h-8"
                />
              </SubdomainLink>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SubdomainLink to="/">
                  Voltar ao Início
                </SubdomainLink>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Fale Conosco
            </h1>
            <p className="text-xl text-gray-400 animate-fade-in">
              Estamos aqui para ajudar você
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Email</h3>
                      <p className="text-gray-400">contato@kambafy.com</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Telefone</h3>
                      <p className="text-gray-400">+244 123 456 789</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Chat Online</h3>
                      <p className="text-gray-400">Disponível de segunda a sexta, 9h às 18h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Nome
                    </label>
                    <Input 
                      id="name" 
                      placeholder="Seu nome completo" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                      Assunto
                    </label>
                    <Input 
                      id="subject" 
                      placeholder="Como podemos ajudar?" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Mensagem
                    </label>
                    <Textarea 
                      id="message" 
                      placeholder="Descreva sua dúvida ou solicitação..." 
                      rows={5}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
                    Enviar Mensagem
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 mt-20">
          <div className="mx-auto max-w-7xl px-6 text-center text-gray-500">
            <p>© 2024 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Contact;