import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/PageLayout";
import { CheckCircle, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  return (
    <>
      <SEO 
        title="Como Funciona | Kambafy"
        description="Entenda como a Kambafy funciona e comece a vender online hoje mesmo."
      />
      <PageLayout title="Como Funciona">
        <div className="space-y-12">
          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Simples e Rápido
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              A Kambafy foi desenvolvida para tornar suas vendas online simples e eficientes.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-8">
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 hover:shadow-lg transition-all duration-300 border-purple-200 dark:border-purple-800">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Cadastre seus Produtos</h3>
              <p className="text-muted-foreground">
                Adicione seus produtos digitais ou físicos em minutos com nossa interface intuitiva.
              </p>
            </div>

            <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:shadow-lg transition-all duration-300 border-blue-200 dark:border-blue-800">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Configure o Checkout</h3>
              <p className="text-muted-foreground">
                Personalize sua página de checkout com seu logo, cores e informações da marca.
              </p>
            </div>

            <div className="border rounded-2xl p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-lg transition-all duration-300 border-green-200 dark:border-green-800">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Receba Pagamentos</h3>
              <p className="text-muted-foreground">
                Aceite pagamentos seguros via PIX, cartão e boleto com aprovação instantânea.
              </p>
            </div>

            <div className="border rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 hover:shadow-lg transition-all duration-300 border-orange-200 dark:border-orange-800">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">4. Acompanhe Resultados</h3>
              <p className="text-muted-foreground">
                Monitore suas vendas, clientes e métricas em tempo real no dashboard completo.
              </p>
            </div>
          </section>

          <section className="text-center bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-12 border border-purple-200 dark:border-purple-800">
            <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pronto para Começar?
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Junte-se a centenas de empreendedores que já estão vendendo online.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg">
              Criar Conta Grátis
            </Button>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default HowItWorks;