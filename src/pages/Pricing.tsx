import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  return (
    <>
      <SEO 
        title="Preços | Kambafy"
        description="Conheça nossos planos e comece a vender online hoje mesmo."
      />
      <PageLayout title="Preços">
        <div className="space-y-12">
          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Preços Transparentes
            </h2>
            <p className="text-muted-foreground text-lg">
              Escolha o plano ideal para o seu negócio
            </p>
          </section>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Plano Básico */}
            <div className="border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
              <h3 className="text-2xl font-bold mb-2">Básico</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Grátis</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Até 10 produtos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Checkout personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Suporte por email</span>
                </li>
              </ul>
              <Button className="w-full">Começar Grátis</Button>
            </div>

            {/* Plano Pro */}
            <div className="border-2 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 relative scale-105 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-500">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                <Zap className="w-4 h-4" />
                Popular
              </div>
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">R$ 49</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-purple-500" />
                  <span>Produtos ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-purple-500" />
                  <span>Checkout personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-purple-500" />
                  <span>Analytics avançado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-purple-500" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg">
                Assinar Pro
              </Button>
            </div>

            {/* Plano Enterprise */}
            <div className="border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/50 dark:to-cyan-800/50">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold">Personalizado</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-500" />
                  <span>Tudo do Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-500" />
                  <span>API personalizada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-500" />
                  <span>Suporte dedicado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-500" />
                  <span>Infraestrutura dedicada</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">Falar com Vendas</Button>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Pricing;