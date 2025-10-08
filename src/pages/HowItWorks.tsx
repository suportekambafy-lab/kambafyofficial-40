import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, BookOpen, DollarSign, Shield } from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";

const HowItWorks = () => {
  const steps = [
    {
      step: "1",
      title: "Crie sua Conta",
      description: "Cadastre-se gratuitamente e configure seu perfil de criador em poucos minutos."
    },
    {
      step: "2", 
      title: "Desenvolva seu Conteúdo",
      description: "Use nossas ferramentas para criar cursos, ebooks ou outros infoprodutos de qualidade."
    },
    {
      step: "3",
      title: "Publique e Venda",
      description: "Publique seu conteúdo na plataforma e comece a receber por cada venda realizada."
    },
    {
      step: "4",
      title: "Acompanhe Resultados",
      description: "Monitore suas vendas, engajamento e receita através do nosso dashboard completo."
    }
  ];

  const benefits = [
    { icon: <BookOpen className="w-6 h-6" />, text: "Criação de conteúdo simplificada" },
    { icon: <Users className="w-6 h-6" />, text: "Acesso a milhares de potenciais alunos" },
    { icon: <DollarSign className="w-6 h-6" />, text: "Pagamentos seguros em Kwanza" },
    { icon: <Shield className="w-6 h-6" />, text: "Proteção total do seu conteúdo" }
  ];

  return (
    <>
      <SEO {...pageSEO.howItWorks} />
      <PageLayout title="Como Funciona">
        <div className="space-y-6 sm:space-y-8 md:space-y-12">
          <div className="text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              Transforme seu Conhecimento em <span className="text-checkout-green">Renda</span>
            </h2>
            <p className="text-sm xs:text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A Kambafy torna simples o processo de criar, vender e gerenciar seus infoprodutos. 
              Siga estes passos para começar sua jornada.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3 xs:space-x-4 p-3 xs:p-4 sm:p-6 bg-checkout-green/5 rounded-xl sm:rounded-2xl border border-checkout-green/10 hover:bg-checkout-green/10 transition-colors">
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-checkout-green rounded-full flex items-center justify-center text-white font-bold text-sm xs:text-base sm:text-lg flex-shrink-0">
                  {step.step}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base xs:text-lg sm:text-xl font-semibold mb-1 sm:mb-2 leading-tight">{step.title}</h3>
                  <p className="text-xs xs:text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-background border border-checkout-green/20 rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 lg:p-8 mx-4 sm:mx-6 lg:mx-8">
            <h3 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8">Benefícios da Kambafy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 sm:p-0">
                  <div className="text-checkout-green flex-shrink-0">{benefit.icon}</div>
                  <span className="text-sm xs:text-base sm:text-lg leading-tight">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center px-4 sm:px-6 lg:px-8">
            <h3 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">Pronto para Começar?</h3>
            <p className="text-xs xs:text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed">
              Junte-se a centenas de criadores que já estão monetizando seu conhecimento.
            </p>
            <Button size="lg" className="bg-checkout-green hover:bg-checkout-green/90 text-white w-full xs:w-auto px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base">
              Criar Conta Grátis
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default HowItWorks;