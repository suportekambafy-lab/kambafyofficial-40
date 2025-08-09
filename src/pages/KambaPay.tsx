import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { 
  ArrowRight, 
  Menu, 
  X, 
  Wallet, 
  Shield, 
  Zap, 
  Globe, 
  Star, 
  CreditCard, 
  ShoppingCart,
  ChevronRight,
  Check,
  Users,
  DollarSign,
  Mail,
  Lock,
  PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KambaPayRegistration } from '@/components/KambaPayRegistration';
import { SEO } from '@/components/SEO';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  }
};

export default function KambaPay() {
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleRegistrationSuccess = (email: string) => {
    setRegisteredEmail(email);
  };

  return (
    <>
      <SEO 
        title="KambaPay - Carteira Digital Segura | Pagamentos Rápidos"
        description="A carteira digital mais segura de Angola. Pagamentos instantâneos, proteção 2FA e aceita em todo o país. Registre-se grátis e comece a pagar com apenas seu email."
      />
      
      <div className="min-h-screen bg-background">
        <Header isLoginOpen={isLoginOpen} setIsLoginOpen={setIsLoginOpen} />
        
        <main className="overflow-hidden">
          <HeroSection registeredEmail={registeredEmail} onRegistrationSuccess={handleRegistrationSuccess} />
          <FeaturesSection />
          <HowItWorksSection />
          <SecuritySection />
          <StatsSection />
          <TestimonialsSection />
          <CTASection />
        </main>
        
        <Footer />
      </div>
    </>
  );
}

const Header = ({ isLoginOpen, setIsLoginOpen }: { isLoginOpen: boolean; setIsLoginOpen: (open: boolean) => void }) => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    setIsLoginOpen(true);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" 
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              KambaPay
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="#recursos" className="text-muted-foreground hover:text-primary transition-colors">
              Recursos
            </Link>
            <Link to="#como-funciona" className="text-muted-foreground hover:text-primary transition-colors">
              Como Funciona
            </Link>
            <Link to="#seguranca" className="text-muted-foreground hover:text-primary transition-colors">
              Segurança
            </Link>
            <Link to="/partners/apply" className="text-muted-foreground hover:text-primary transition-colors">
              Torne-se Parceiro
            </Link>
            <Link to="/contato" className="text-muted-foreground hover:text-primary transition-colors">
              Suporte
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Drawer open={isLoginOpen} onOpenChange={setIsLoginOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Entrar no KambaPay</DrawerTitle>
                </DrawerHeader>
                <div className="p-6">
                  <KambaPayRegistration onSuccess={(email) => {
                    setIsLoginOpen(false);
                  }} />
                </div>
              </DrawerContent>
            </Drawer>
            
            <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80">
              <a href="#registro">Criar Conta</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMenuState(!menuState)}
          >
            {menuState ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuState && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <nav className="py-4 space-y-2">
              <Link to="#recursos" className="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                Recursos
              </Link>
              <Link to="#como-funciona" className="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                Como Funciona
              </Link>
              <Link to="#seguranca" className="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                Segurança
              </Link>
              <Link to="/partners/apply" className="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                Torne-se Parceiro
              </Link>
              <Link to="/contato" className="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                Suporte
              </Link>
              <div className="px-4 py-2 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLoginClick}>
                  Entrar
                </Button>
                <Button size="sm" className="w-full bg-gradient-to-r from-primary to-primary/80">
                  <a href="#registro">Criar Conta</a>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const HeroSection = ({ registeredEmail, onRegistrationSuccess }: { 
  registeredEmail: string; 
  onRegistrationSuccess: (email: string) => void; 
}) => {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <AnimatedGroup preset="blur-slide" className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4" />
                <span>100% Seguro com 2FA</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Pagamentos{' '}
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Instantâneos
                </span>{' '}
                com Apenas Seu Email
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                A carteira digital mais avançada de Angola. Pague em qualquer loja online 
                com máxima segurança e praticidade.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 px-8">
                <a href="#registro">Criar Conta Grátis</a>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                <a href="#como-funciona">Como Funciona</a>
              </Button>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Grátis para sempre</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Sem taxas ocultas</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Segurança 2FA</span>
              </div>
            </div>
          </AnimatedGroup>
          
          {/* Registration Form */}
          <div id="registro" className="lg:sticky lg:top-24">
            <Card className="shadow-2xl border-0 bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Crie Sua Conta KambaPay</CardTitle>
                <CardDescription>
                  Comece a pagar com segurança em segundos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!registeredEmail ? (
                  <KambaPayRegistration onSuccess={onRegistrationSuccess} />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Conta Criada com Sucesso!</h3>
                    <p className="text-muted-foreground">
                      Bem-vindo ao KambaPay, {registeredEmail}
                    </p>
                    <Button className="w-full">
                      Gerenciar Minha Conta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Zap,
      title: "Pagamentos Instantâneos",
      description: "Pague em qualquer loja online usando apenas seu email. Sem precisar digitar dados do cartão."
    },
    {
      icon: Shield,
      title: "Máxima Segurança",
      description: "Proteção 2FA por email em todas as transações. Seus dados bancários ficam sempre protegidos."
    },
    {
      icon: Globe,
      title: "Aceito em Todo o País",
      description: "Use o KambaPay em milhares de lojas online em Angola e Moçambique."
    },
    {
      icon: Wallet,
      title: "Controle Total",
      description: "Gerencie seu saldo, veja histórico completo e controle todos os seus gastos em um só lugar."
    }
  ];

  return (
    <section id="recursos" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Por que Escolher o KambaPay?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A solução de pagamentos mais avançada, segura e prática de Angola
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <AnimatedGroup key={index} preset="blur-slide">
              <Card className="h-full text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </AnimatedGroup>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    {
      step: "1",
      icon: Mail,
      title: "Registre-se com Email",
      description: "Crie sua conta KambaPay usando apenas seu endereço de email. Rápido e sem complicações."
    },
    {
      step: "2",
      icon: CreditCard,
      title: "Carregue Saldo",
      description: "Adicione saldo à sua carteira usando Multibanco, Transferência ou outros métodos locais."
    },
    {
      step: "3",
      icon: ShoppingCart,
      title: "Pague com Segurança",
      description: "Use seu email para pagar em qualquer loja. Confirmação por 2FA para máxima segurança."
    }
  ];

  return (
    <section id="como-funciona" className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Como Funciona o KambaPay
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Três passos simples para começar a pagar com segurança
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <AnimatedGroup key={index} preset="blur-slide">
              <div className="text-center relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full">
                    <ChevronRight className="h-6 w-6 text-muted-foreground mx-auto" />
                  </div>
                )}
                
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <step.icon className="h-10 w-10 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-background rounded-full flex items-center justify-center border-2 border-primary">
                    <span className="text-sm font-bold text-primary">{step.step}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </AnimatedGroup>
          ))}
        </div>
      </div>
    </section>
  );
};

const SecuritySection = () => {
  return (
    <section id="seguranca" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <AnimatedGroup preset="blur-slide">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Segurança de Nível Bancário
              </h2>
              <p className="text-xl text-muted-foreground">
                Protegemos suas transações com as mais avançadas tecnologias de segurança disponíveis no mercado.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Autenticação 2FA</h3>
                    <p className="text-muted-foreground">Código de verificação por email em todas as transações</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Criptografia Avançada</h3>
                    <p className="text-muted-foreground">Dados protegidos com criptografia de nível militar</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Monitoramento 24/7</h3>
                    <p className="text-muted-foreground">Sistema de detecção de fraudes em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedGroup>
          
          <AnimatedGroup preset="blur-slide">
            <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold">SSL 256-bit</h3>
                  <p className="text-sm text-muted-foreground">Criptografia</p>
                </div>
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold">2FA</h3>
                  <p className="text-sm text-muted-foreground">Autenticação</p>
                </div>
                <div className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold">50k+</h3>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </div>
                <div className="text-center">
                  <PhoneCall className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold">24/7</h3>
                  <p className="text-sm text-muted-foreground">Suporte</p>
                </div>
              </div>
            </div>
          </AnimatedGroup>
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  const stats = [
    { value: "50k+", label: "Usuários Ativos" },
    { value: "1M+", label: "Transações Processadas" },
    { value: "99.9%", label: "Tempo de Atividade" },
    { value: "500+", label: "Lojas Parceiras" }
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <AnimatedGroup key={index} preset="blur-slide">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            </AnimatedGroup>
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Maria Santos",
      role: "Empresária",
      content: "O KambaPay revolucionou a forma como faço pagamentos online. Rápido, seguro e super prático.",
      rating: 5
    },
    {
      name: "João Silva",
      role: "Freelancer",
      content: "Finalmente uma carteira digital que funciona de verdade em Angola. Recomendo a todos.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Estudante",
      content: "Uso o KambaPay para todas as minhas compras online. A segurança com 2FA é excelente.",
      rating: 5
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que Dizem Nossos Usuários
          </h2>
          <p className="text-xl text-muted-foreground">
            Milhares de angolanos já confiam no KambaPay
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <AnimatedGroup key={index} preset="blur-slide">
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedGroup>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-center text-white">
          <AnimatedGroup preset="blur-slide">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para Começar?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Junte-se a milhares de angolanos que já usam o KambaPay para pagamentos seguros
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100">
                <a href="#registro">Criar Conta Grátis</a>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <a href="#como-funciona">Saber Mais</a>
              </Button>
            </div>
          </AnimatedGroup>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-muted/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">KambaPay</span>
            </div>
            <p className="text-muted-foreground">
              A carteira digital mais segura e prática de Angola.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Produto</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="#recursos" className="hover:text-primary">Recursos</Link></li>
              <li><Link to="#seguranca" className="hover:text-primary">Segurança</Link></li>
              <li><Link to="#como-funciona" className="hover:text-primary">Como Funciona</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/contato" className="hover:text-primary">Contacto</Link></li>
              <li><Link to="/ajuda" className="hover:text-primary">Central de Ajuda</Link></li>
              <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/privacidade" className="hover:text-primary">Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-primary">Termos de Uso</Link></li>
              <li><Link to="/cookies" className="hover:text-primary">Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 KambaPay. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};