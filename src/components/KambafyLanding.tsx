import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { ArrowRight, Menu, X, Play, Star, Users, BookOpen, DollarSign, Shield, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { SubdomainLink } from './SubdomainLink';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
const professionalWoman = '/lovable-uploads/09933f06-0001-46b9-9e43-62a0ebdd9868.png';
const professionalMan = '/lovable-uploads/730e6c93-f015-4eb9-a5cb-a980f00fcde0.png';
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
export function KambafyLanding() {
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    // Carregar apenas o script do Chatbase
    const loadChatbase = setTimeout(() => {
      const existingChatbaseScript = document.querySelector(`script[id="H0mee1mnl3CYCtMtq-hix"]`);
      if (!existingChatbaseScript) {
        const chatbaseScript = `
          (function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="H0mee1mnl3CYCtMtq-hix";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();
        `;
        const chatbaseScriptElement = document.createElement("script");
        chatbaseScriptElement.innerHTML = chatbaseScript;
        document.body.appendChild(chatbaseScriptElement);
      }
    }, 2000);

    return () => {
      clearTimeout(loadChatbase);
      const existingChatbaseScript = document.querySelector(`script[id="H0mee1mnl3CYCtMtq-hix"]`);
      if (existingChatbaseScript) {
        document.body.removeChild(existingChatbaseScript);
      }
    };
  }, []);
  const handleLoginOptionSelect = (option: 'business' | 'customer') => {
    setIsLoginDrawerOpen(false);
    const userType = option === 'business' ? 'seller' : 'customer';
    window.location.href = `${window.location.protocol}//app.${window.location.hostname.replace(/^app\./, '')}${window.location.port ? ':' + window.location.port : ''}/auth?type=${userType}`;
  };
  return <div className="font-bricolage">
      <Header onLoginOptionSelect={handleLoginOptionSelect} />
      <main className="overflow-hidden">
        <HeroSection />
        <FeaturesSection />
        <StatsSection />
        <TestimonialsSection />
        <AboutSection />
        <CTASection />
      </main>
      <Footer />
    </div>;
}
const menuItems = [{
  name: 'Recursos',
  href: '/recursos'
}, {
  name: 'Como Funciona',
  href: '/como-funciona'
}, {
  name: 'Preços',
  href: '/precos'
}, {
  name: 'Contacto',
  href: '/contato'
}];
const Header = ({
  onLoginOptionSelect
}: {
  onLoginOptionSelect: (option: 'business' | 'customer') => void;
}) => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  const navigate = useNavigate();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const handleAuthNavigation = (mode: 'login' | 'signup') => {
    window.location.href = `${window.location.protocol}//app.${window.location.hostname.replace(/^app\./, '')}${window.location.port ? ':' + window.location.port : ''}/auth?mode=${mode}`;
  };
  return <header>
      <nav data-state={menuState && 'active'} className="fixed z-20 w-full px-2 group">
        <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/80 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/" aria-label="home" className="flex items-center space-x-2">
                <img 
                  src="/lovable-uploads/1b886133-8d1b-413b-ba03-40484b2df798.png" 
                  alt="Kambafy" 
                  className="h-20 w-auto"
                />
              </Link>
              <div className="flex items-center space-x-2 lg:hidden">
                <Drawer>
                  <DrawerTrigger asChild>
                    <button aria-label="Abrir Menu" className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5">
                      <Menu className="m-auto size-6" />
                    </button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Menu</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-6 space-y-6">
                      <ul className="space-y-6 text-base">
                        {menuItems.map((item, index) => <li key={index}>
                            <SubdomainLink to={item.href} className="text-muted-foreground hover:text-accent-foreground block duration-150">
                              <span>{item.name}</span>
                            </SubdomainLink>
                          </li>)}
                      </ul>
                      <div className="flex flex-col space-y-3">
                        <Button variant="outline" size="sm" onClick={() => onLoginOptionSelect('customer')}>
                          Acessar minhas compras
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onLoginOptionSelect('business')}>
                          Gerenciar meus negócios
                        </Button>
                        <Button size="sm" className="bg-checkout-green hover:bg-checkout-green/90" onClick={() => handleAuthNavigation('signup')}>
                          <span>Cadastrar</span>
                        </Button>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => <li key={index}>
                    <SubdomainLink to={item.href} className="text-muted-foreground hover:text-accent-foreground block duration-150">
                      <span>{item.name}</span>
                    </SubdomainLink>
                  </li>)}
              </ul>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <DropdownMenu onOpenChange={setIsLoginOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('group justify-between', isScrolled && 'lg:hidden')}>
                    <span>Entrar</span>
                    <div className="ml-2 transition-transform duration-200">
                      {isLoginOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onLoginOptionSelect('customer')}>
                    Acessar minhas compras
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLoginOptionSelect('business')}>
                    Gerenciar meus negócios
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className={cn('bg-checkout-green hover:bg-checkout-green/90', isScrolled && 'lg:hidden')} onClick={() => handleAuthNavigation('signup')}>
                <span>Cadastrar</span>
              </Button>
              <Button size="sm" className={cn('bg-checkout-green hover:bg-checkout-green/90', isScrolled ? 'lg:inline-flex' : 'hidden')} onClick={() => handleAuthNavigation('signup')}>
                <span>Começar Agora</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>;
};
const HeroSection = () => {
  const navigate = useNavigate();
  const handleGetStarted = () => {
    window.location.href = `${window.location.protocol}//app.${window.location.hostname.replace(/^app\./, '')}${window.location.port ? ':' + window.location.port : ''}/auth?mode=signup`;
  };
  return <section>
      <div className="relative pt-24 md:pt-36">
        <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
            <AnimatedGroup variants={transitionVariants}>
              <div className="hover:bg-background bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300">
                <span className="text-foreground text-sm">🌍 Plataforma Lusófona de Infoprodutos</span>
                <span className="block h-4 w-0.5 border-l bg-checkout-gray"></span>
                <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                  <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                  </div>
                </div>
              </div>
              <h1 className="mt-8 max-w-4xl mx-auto text-balance sm:text-4xl lg:text-6xl xl:text-7xl lg:mt-16 font-bold md:text-4xl text-3xl text-checkout-green">TRANSFORME SEU CONHECIMENTO EM RENDA</h1>
              <p className="mx-auto mt-6 sm:mt-8 max-w-2xl text-balance text-muted-foreground px-4 sm:px-0 sm:text-base text-base">A Kambafy é uma plataforma digital inovadora que permite a criadores, educadores, marcas e especialistas em toda a lusofonia partilharem conhecimento, criarem infoprodutos e transformarem a sua audiência em rendimento real.</p>
            </AnimatedGroup>

            <AnimatedGroup variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.75
                }
              }
            },
            ...transitionVariants
          }} className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
              <div className="bg-checkout-green/10 rounded-[14px] border border-checkout-green/20 p-0.5">
                <Button size="lg" className="rounded-xl px-8 text-base bg-checkout-green hover:bg-checkout-green/90 text-white" onClick={handleGetStarted}>
                  <span className="text-nowrap">Começar a Vender</span>
                </Button>
              </div>
              <Button asChild size="lg" variant="ghost" className="h-10.5 rounded-xl px-8 hover:bg-checkout-green/10">
                <SubdomainLink to="/como-funciona">
                  <Play className="mr-2 size-4" />
                  <span className="text-nowrap">Ver Como Funciona</span>
                </SubdomainLink>
              </Button>
            </AnimatedGroup>
          </div>
        </div>

      </div>
    </section>;
};
const FeaturesSection = () => {
  const features = [{
    icon: <BookOpen className="w-8 h-8 text-checkout-green" />,
    title: "Order Bump",
    description: "Aumente suas vendas com ofertas complementares no momento da compra."
  }, {
    icon: <DollarSign className="w-8 h-8 text-checkout-green" />,
    title: "Checkout Personalizado",
    description: "Customize completamente sua página de checkout para maximizar conversões."
  }, {
    icon: <Users className="w-8 h-8 text-checkout-green" />,
    title: "Pixel",
    description: "Integre Facebook Pixel e outras ferramentas de tracking para otimizar campanhas."
  }, {
    icon: <Shield className="w-8 h-8 text-checkout-green" />,
    title: "Afiliação",
    description: "Sistema completo de afiliados para expandir suas vendas através de parceiros."
  }];
  return <section id="recursos" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          <AnimatedGroup preset="slide">
            <div className="text-center lg:text-left px-4 sm:px-0">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Tudo que Você Precisa para{' '}
                <span className="text-checkout-green">Ter Sucesso</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground">
                Ferramentas poderosas e simples para transformar seu conhecimento em um negócio próspero
              </p>
            </div>
          </AnimatedGroup>
          <AnimatedGroup preset="scale">
            <div className="relative">
              <img src="/lovable-uploads/be22ac17-d2d9-4d84-8ffa-3ed3d91cfaed.png" alt="Profissional jovem trabalhando" className="rounded-2xl shadow-lg object-cover w-full h-80 lg:h-96" />
              <div className="absolute inset-0 bg-gradient-to-t from-checkout-green/20 to-transparent rounded-2xl"></div>
            </div>
          </AnimatedGroup>
        </div>

        <AnimatedGroup preset="blur-slide" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => <div key={index} className="bg-background border border-checkout-green/10 rounded-2xl p-6 hover:shadow-lg hover:shadow-checkout-green/5 transition-all duration-300 hover:border-checkout-green/20">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>)}
        </AnimatedGroup>
      </div>
    </section>;
};
const StatsSection = () => {
  const stats = [{
    number: "1000+",
    label: "Criadores Ativos"
  }, {
    number: "15k+",
    label: "Alunos Satisfeitos"
  }, {
    number: "500+",
    label: "Cursos Disponíveis"
  }, {
    number: "98%",
    label: "Satisfação dos Usuários"
  }];
  return <section className="py-16 bg-checkout-green/5">
      <div className="mx-auto max-w-7xl px-6">
        <AnimatedGroup preset="slide" className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => <div key={index} className="text-center">
              <div className="text-4xl font-bold text-checkout-green mb-2">
                {stat.number}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>)}
        </AnimatedGroup>
      </div>
    </section>;
};
const TestimonialsSection = () => {
  const testimonials = [{
    name: "Maria Santos",
    role: "Criadora de Conteúdo",
    content: "A Kambafy mudou minha vida! Consegui monetizar meu conhecimento em marketing digital e hoje tenho uma renda extra consistente.",
    rating: 5
  }, {
    name: "João Pedro",
    role: "Professor de Inglês",
    content: "Plataforma incrível! Muito fácil de usar e o suporte é excepcional. Recomendo para todos os educadores.",
    rating: 5
  }, {
    name: "Ana Luiza",
    role: "Coach de Vida",
    content: "O que mais me impressiona é a qualidade da plataforma e como ela foi pensada para o mercado angolano. Parabéns!",
    rating: 5
  }];
  return <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12 sm:mb-16 px-4 sm:px-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            O que Dizem Nossos{' '}
            <span className="text-checkout-green">Criadores</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Histórias reais de pessoas que transformaram suas vidas com a Kambafy
          </p>
        </div>

        <AnimatedGroup preset="scale" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <div key={index} className="bg-background border border-checkout-green/10 rounded-2xl p-6 hover:shadow-lg hover:shadow-checkout-green/5 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                  <img src={index === 1 ? professionalMan : professionalWoman} alt={testimonial.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-5 h-5 text-checkout-orange fill-current" />)}
                </div>
              </div>
              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.content}"
              </p>
              <div>
                <h4 className="font-semibold">{testimonial.name}</h4>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>)}
        </AnimatedGroup>
      </div>
    </section>;
};
const AboutSection = () => {
  return <section id="sobre" className="py-24 bg-checkout-green/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <AnimatedGroup preset="slide">
            <div className="px-4 sm:px-0">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">
                Sobre a{' '}
                <span className="text-checkout-green">Kambafy</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6">
                Somos uma startup angolana dedicada a democratizar o acesso ao conhecimento e 
                empoderar criadores de conteúdo em toda Angola e países lusófonos.
              </p>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Nossa missão é criar uma ponte entre quem tem conhecimento e quem quer aprender, 
                proporcionando oportunidades de crescimento pessoal e profissional para todos.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-checkout-green rounded-full"></div>
                  <span>Plataforma 100% nacional</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-checkout-green rounded-full"></div>
                  <span>Pagamentos em multimoedas</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-checkout-green rounded-full"></div>
                  <span>Suporte em português</span>
                </div>
              </div>
            </div>
          </AnimatedGroup>
          <AnimatedGroup preset="scale">
            <div className="relative">
              <img src={professionalMan} alt="Profissional jovem focado" className="rounded-2xl shadow-lg object-cover w-full h-80 lg:h-96" />
              <div className="absolute inset-0 bg-gradient-to-t from-checkout-green/30 to-transparent rounded-2xl flex items-end">
                <div className="p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">Junte-se à Revolução</h3>
                  <p className="text-white/90">
                    Seja parte da maior comunidade de criadores de conteúdo de Angola
                  </p>
                </div>
              </div>
            </div>
          </AnimatedGroup>
        </div>
      </div>
    </section>;
};
const CTASection = () => {
  const navigate = useNavigate();
  const handleGetStarted = () => {
    window.location.href = `${window.location.protocol}//app.${window.location.hostname.replace(/^app\./, '')}${window.location.port ? ':' + window.location.port : ''}/auth?mode=signup`;
  };
  return <section className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <AnimatedGroup preset="blur-slide">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 px-4 sm:px-0">
            Pronto para{' '}
            <span className="text-checkout-green">Começar?</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 px-4 sm:px-0">
            Cadastre-se gratuitamente e comece a monetizar seu conhecimento hoje mesmo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-checkout-green hover:bg-checkout-green/90 text-white px-8 py-4 text-lg" onClick={handleGetStarted}>
              Criar Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button asChild size="lg" variant="outline" className="border-checkout-green text-checkout-green hover:bg-checkout-green/10 px-8 py-4 text-lg">
              <SubdomainLink to="/contato">
                Falar com Especialista
              </SubdomainLink>
            </Button>
          </div>
        </AnimatedGroup>
      </div>
    </section>;
};
const Footer = () => {
  return <footer className="bg-checkout-text dark:bg-background text-white dark:text-foreground py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <KambafyLogo className="text-white dark:text-foreground mb-4" />
            <p className="text-white/70 dark:text-muted-foreground mb-4">A maior plataforma Lusófona de infoprodutos</p>
            <div className="flex space-x-4">
              
              
              
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-2">
              <li><SubdomainLink to="/como-funciona" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Como Funciona</SubdomainLink></li>
              <li><SubdomainLink to="/precos" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Preços</SubdomainLink></li>
              <li><SubdomainLink to="/recursos" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Recursos</SubdomainLink></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              <li><SubdomainLink to="/ajuda" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Central de Ajuda</SubdomainLink></li>
              <li><SubdomainLink to="/contato" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Contacto</SubdomainLink></li>
              <li><SubdomainLink to="/status" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Status</SubdomainLink></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><SubdomainLink to="/privacidade" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Privacidade</SubdomainLink></li>
              <li><SubdomainLink to="/termos" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Termos</SubdomainLink></li>
              <li><SubdomainLink to="/cookies" className="text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground transition-colors">Cookies</SubdomainLink></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 dark:border-border mt-12 pt-8 text-center">
          <p className="text-white/70 dark:text-muted-foreground">© 2025 Kambafy. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
        </div>
      </div>
    </footer>;
};
const KambafyLogo = ({
  className
}: {
  className?: string;
}) => {
  return <div className={cn('flex items-center', className)}>
      <img 
        src="/lovable-uploads/1b886133-8d1b-413b-ba03-40484b2df798.png" 
        alt="Kambafy" 
        className="h-20 w-auto"
      />
    </div>;
};