import { PageLayout } from "@/components/PageLayout";
import { 
  BookOpen, 
  DollarSign, 
  Users, 
  Shield, 
  BarChart, 
  Zap, 
  Globe, 
  HeadphonesIcon,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Mail,
  RefreshCw,
  Target,
  UserCheck,
  Smartphone,
  Lock,
  Settings
} from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";

const Features = () => {
  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-checkout-green" />,
      title: "Área de Membros Completa",
      description: "Crie cursos interativos com módulos, lições, vídeos, quizzes e acompanhe o progresso dos alunos em tempo real."
    },
    {
      icon: <DollarSign className="w-8 h-8 text-checkout-green" />,
      title: "Pagamentos Locais Angolanos",
      description: "Aceite pagamentos em Kwanza via Multicaixa Express, Referência Bancária, Transferência e Apple Pay."
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-checkout-green" />,
      title: "Checkout Inteligente",
      description: "Páginas de checkout otimizadas com Order Bumps, recuperação de carrinho abandonado e provas sociais."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-checkout-green" />,
      title: "Sistema de Afiliados",
      description: "Expanda suas vendas com programa de afiliados automático. Gestão completa de comissões e códigos."
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-checkout-green" />,
      title: "Recuperação de Vendas",
      description: "Sistema automático que recupera vendas abandonadas via WhatsApp e email com taxa de 20%."
    },
    {
      icon: <BarChart className="w-8 h-8 text-checkout-green" />,
      title: "Dashboard Analítico",
      description: "Métricas em tempo real, gráficos de vendas, metas de faturamento e relatórios financeiros detalhados."
    },
    {
      icon: <CreditCard className="w-8 h-8 text-checkout-green" />,
      title: "KambaPay Wallet",
      description: "Carteira digital integrada para receber, enviar e sacar dinheiro com taxas competitivas."
    },
    {
      icon: <Target className="w-8 h-8 text-checkout-green" />,
      title: "Facebook Pixel & Analytics",
      description: "Integração completa com Facebook Pixel para otimizar campanhas publicitárias e acompanhar conversões."
    },
    {
      icon: <UserCheck className="w-8 h-8 text-checkout-green" />,
      title: "Verificação de Identidade",
      description: "Sistema KYC completo para verificação de identidade dos vendedores com aprovação administrativa."
    },
    {
      icon: <Mail className="w-8 h-8 text-checkout-green" />,
      title: "Automação de Email",
      description: "Emails automáticos para confirmação de compra, detalhes de pagamento e notificações de acesso."
    },
    {
      icon: <Lock className="w-8 h-8 text-checkout-green" />,
      title: "Autenticação 2FA",
      description: "Segurança avançada com autenticação de dois fatores inteligente baseada em comportamento do usuário."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-checkout-green" />,
      title: "Interface Mobile Otimizada",
      description: "Dashboard mobile responsivo com navegação intuitiva e todas as funcionalidades principais."
    },
    {
      icon: <Settings className="w-8 h-8 text-checkout-green" />,
      title: "Personalização Avançada",
      description: "Customize páginas de checkout, cores, logos e configure webhooks para integrações externas."
    },
    {
      icon: <Users className="w-8 h-8 text-checkout-green" />,
      title: "Gestão de Estudantes",
      description: "Adicione estudantes a cursos, acompanhe progresso, permita comentários e interação nas lições."
    },
    {
      icon: <Shield className="w-8 h-8 text-checkout-green" />,
      title: "Proteção Anti-Fraude",
      description: "Sistema de detecção de fraudes, proteção contra chargeback e validação de transações."
    },
    {
      icon: <Globe className="w-8 h-8 text-checkout-green" />,
      title: "SEO Otimizado",
      description: "URLs amigáveis, meta tags automáticas, sitemap e otimização para mecanismos de busca."
    }
  ];

  const appsFeatures = [
    {
      title: "Dashboard Moderno",
      description: "Interface redesenhada com métricas em tempo real e navegação intuitiva"
    },
    {
      title: "Sistema Financeiro",
      description: "Controle total de receitas, saques e liberação automática de pagamentos após 3 dias"
    },
    {
      title: "Gestão de Produtos",
      description: "Criação, edição e gerenciamento completo de produtos digitais e cursos"
    },
    {
      title: "Portal de Afiliados",
      description: "Plataforma dedicada para afiliados gerirem seus links e comissões"
    },
    {
      title: "Painel Administrativo",
      description: "Sistema completo para administradores gerirem usuários, saques e verificações"
    },
    {
      title: "Centro de Ajuda",
      description: "Base de conhecimento integrada com guias e tutoriais"
    }
  ];

  return (
    <>
      <SEO {...pageSEO.features} />
      <PageLayout title="Recursos">
        <div className="space-y-8 md:space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Plataforma Completa para <span className="text-checkout-green">Vender Online</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
              Descubra todos os recursos avançados que a Kambafy oferece para transformar 
              seu conhecimento em um negócio digital próspero e escalável.
            </p>
          </div>

          {/* Recursos Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-4 sm:p-6 bg-background border border-checkout-green/10 rounded-2xl hover:shadow-lg hover:shadow-checkout-green/5 transition-all duration-300 hover:border-checkout-green/20 group"
              >
                <div className="mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Seção Apps & Funcionalidades */}
          <div className="bg-gradient-to-r from-checkout-green/5 to-emerald-500/5 rounded-2xl p-4 sm:p-6 lg:p-8 mx-4">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
                Apps & Funcionalidades Especiais
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Acesse ferramentas específicas desenvolvidas para otimizar seu negócio digital.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {appsFeatures.map((app, index) => (
                <div 
                  key={index}
                  className="bg-background/80 backdrop-blur border border-checkout-green/20 rounded-xl p-4 sm:p-5 hover:shadow-md transition-all duration-300"
                >
                  <h4 className="font-semibold text-base sm:text-lg mb-2 text-checkout-green">
                    {app.title}
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {app.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recursos em Desenvolvimento */}
          <div className="bg-gradient-to-r from-checkout-green/10 to-emerald-500/10 rounded-2xl p-4 sm:p-6 lg:p-8 text-center mx-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Próximos Lançamentos</h3>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto">
              Estamos constantemente inovando e desenvolvendo novos recursos baseados no feedback 
              da nossa comunidade de criadores.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                App Mobile Nativo
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Webinars ao Vivo
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Marketplace de Cursos
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                API Pública
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Certificados Digitais
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                Integração Zoom
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center px-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">
              Pronto para Começar?
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              Junte-se a centenas de criadores que já estão monetizando seu conhecimento na Kambafy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a 
                href="/auth" 
                className="inline-block bg-checkout-green hover:bg-checkout-green/90 text-white font-medium px-6 sm:px-8 py-3 rounded-xl transition-colors duration-300"
              >
                Criar Conta Grátis
              </a>
              <a 
                href="/como-funciona" 
                className="inline-block border border-checkout-green text-checkout-green hover:bg-checkout-green hover:text-white font-medium px-6 sm:px-8 py-3 rounded-xl transition-colors duration-300"
              >
                Ver Como Funciona
              </a>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Features;