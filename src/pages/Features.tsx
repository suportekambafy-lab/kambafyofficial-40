import { PageLayout } from "@/components/PageLayout";
import { BookOpen, DollarSign, Users, Shield, BarChart, Zap, Globe, HeadphonesIcon } from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";

const Features = () => {
  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-checkout-green" />,
      title: "Editor de Conteúdo Avançado",
      description: "Crie cursos interativos com vídeos, textos, quizzes e certificados de forma intuitiva."
    },
    {
      icon: <DollarSign className="w-8 h-8 text-checkout-green" />,
      title: "Pagamentos Locais",
      description: "Receba em Kwanza através de Multicaixa, BAI Direto e outros métodos populares em Angola."
    },
    {
      icon: <Users className="w-8 h-8 text-checkout-green" />,
      title: "Gestão de Alunos",
      description: "Acompanhe o progresso dos seus alunos e mantenha-os engajados com ferramentas de comunicação."
    },
    {
      icon: <Shield className="w-8 h-8 text-checkout-green" />,
      title: "Proteção de Conteúdo",
      description: "Seu conteúdo está protegido contra pirataria com tecnologia de ponta."
    },
    {
      icon: <BarChart className="w-8 h-8 text-checkout-green" />,
      title: "Analytics Detalhados",
      description: "Dashboards completos com métricas de vendas, engajamento e performance dos seus produtos."
    },
    {
      icon: <Zap className="w-8 h-8 text-checkout-green" />,
      title: "Automação de Marketing",
      description: "Cupons automáticos, campanhas por email e funis de vendas para maximizar seus resultados."
    },
    {
      icon: <Globe className="w-8 h-8 text-checkout-green" />,
      title: "Presença Online",
      description: "Página personalizada para cada criador com domínio próprio e branding personalizado."
    },
    {
      icon: <HeadphonesIcon className="w-8 h-8 text-checkout-green" />,
      title: "Suporte Especializado",
      description: "Equipe dedicada para ajudar você a crescer, com suporte em português 24/7."
    }
  ];

  return (
    <>
      <SEO {...pageSEO.features} />
      <PageLayout title="Recursos">
        <div className="space-y-8 md:space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Recursos Poderosos para <span className="text-checkout-green">Seu Sucesso</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Descubra todas as ferramentas que a Kambafy oferece para transformar 
              seu conhecimento em um negócio próspero.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-4 sm:p-6 bg-background border border-checkout-green/10 rounded-2xl hover:shadow-lg hover:shadow-checkout-green/5 transition-all duration-300 hover:border-checkout-green/20"
              >
                <div className="mb-3 sm:mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-checkout-green/10 to-emerald-500/10 rounded-2xl p-4 sm:p-6 lg:p-8 text-center mx-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">E Muito Mais!</h3>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto">
              Estamos constantemente desenvolvendo novos recursos baseados no feedback 
              da nossa comunidade de criadores.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Integração com Redes Sociais
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                App Mobile em Breve
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Webinars ao Vivo
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Kamba Extra - Afiliados
              </span>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Features;