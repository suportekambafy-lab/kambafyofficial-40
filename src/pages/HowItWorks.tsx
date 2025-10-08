import { SEO } from "@/components/SEO";
import { CheckCircle, Zap, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  return (
    <>
      <SEO 
        title="Como Funciona | Kambafy"
        description="Entenda como a Kambafy funciona e comece a vender online hoje mesmo."
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
              Como Funciona
            </h1>
            <p className="text-xl text-gray-400 animate-fade-in">
              Comece a vender online em 4 passos simples
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">1. Cadastre seus Produtos</h3>
                <p className="text-gray-400 leading-relaxed">
                  Adicione seus produtos digitais ou físicos em minutos com nossa interface intuitiva. Defina preços, descrições e imagens.
                </p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">2. Configure o Checkout</h3>
                <p className="text-gray-400 leading-relaxed">
                  Personalize sua página de checkout com seu logo, cores e informações da marca. Deixe tudo com a sua cara.
                </p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">3. Receba Pagamentos</h3>
                <p className="text-gray-400 leading-relaxed">
                  Aceite pagamentos seguros via PIX, cartão e boleto com aprovação instantânea. Seus clientes pagam de forma fácil e rápida.
                </p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">4. Acompanhe Resultados</h3>
                <p className="text-gray-400 leading-relaxed">
                  Monitore suas vendas, clientes e métricas em tempo real no dashboard completo. Tenha controle total do seu negócio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-4xl text-center bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Crie sua conta gratuita e comece a vender hoje mesmo
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
              <SubdomainLink to="/">
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </SubdomainLink>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8">
          <div className="mx-auto max-w-7xl px-6 text-center text-gray-500">
            <p>© 2024 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HowItWorks;