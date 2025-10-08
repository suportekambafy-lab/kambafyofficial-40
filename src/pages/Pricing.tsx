import { SEO } from "@/components/SEO";
import { Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubdomainLink } from "@/components/SubdomainLink";

const Pricing = () => {
  return (
    <>
      <SEO 
        title="Preços | Kambafy"
        description="Conheça nossos planos e comece a vender online hoje mesmo."
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
              Preços Transparentes
            </h1>
            <p className="text-xl text-gray-400 animate-fade-in">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Plano Básico */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-2">Básico</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">Grátis</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Até 10 produtos</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Checkout personalizado</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Suporte por email</span>
                  </li>
                </ul>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  Começar Grátis
                </Button>
              </div>

              {/* Plano Pro */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border-2 border-purple-500/50 rounded-2xl p-8 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 relative scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Popular
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">R$ 49</span>
                  <span className="text-gray-400">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Produtos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Checkout personalizado</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Analytics avançado</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
                  Assinar Pro
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>

              {/* Plano Enterprise */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">Personalizado</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Tudo do Pro</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Suporte dedicado</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Infraestrutura dedicada</span>
                  </li>
                </ul>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  Falar com Vendas
                </Button>
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

export default Pricing;