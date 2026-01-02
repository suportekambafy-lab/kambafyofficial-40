export type Language = 'pt' | 'en' | 'es';

export const LANDING_TRANSLATIONS: Record<Language, Record<string, string>> = {
  pt: {
    // Header/Nav
    'nav.features': 'Recursos',
    'nav.howItWorks': 'Como Funciona',
    'nav.pricing': 'Preços',
    'nav.about': 'Sobre',
    'nav.login': 'Entrar',
    'nav.signup': 'Começar Grátis',
    
    // Hero
    'hero.badge': 'Plataforma #1 para Criadores Digitais',
    'hero.title': 'Venda seus produtos',
    'hero.rotatingWords': 'digitais,criativos,exclusivos,incríveis,únicos',
    'hero.subtitle': 'Crie, gerencie e venda seus cursos, e-books e produtos digitais em uma única plataforma. Tudo que você precisa para construir seu negócio online.',
    'hero.cta.primary': 'Começar a Vender',
    'hero.cta.secondary': 'Ver Como Funciona',
    'hero.noCosts': 'Sem custos fixos • Sem mensalidades',
    
    // Features
    'features.title': 'Tudo que Você Precisa para',
    'features.titleHighlight': 'Ter Sucesso',
    'features.subtitle': 'Ferramentas poderosas e simples para transformar seu conhecimento em um negócio próspero',
    'features.orderBump.title': 'Order Bump',
    'features.orderBump.description': 'Aumente suas vendas com ofertas complementares no momento da compra.',
    'features.checkout.title': 'Checkout Personalizado',
    'features.checkout.description': 'Customize completamente sua página de checkout para maximizar conversões.',
    'features.pixel.title': 'Pixel',
    'features.pixel.description': 'Integre Facebook Pixel e outras ferramentas de tracking para otimizar campanhas.',
    'features.affiliate.title': 'Afiliação',
    'features.affiliate.description': 'Sistema completo de afiliados para expandir suas vendas através de parceiros.',
    
    // Stats
    'stats.creators': 'Criadores Ativos',
    'stats.products': 'Produtos Vendidos',
    'stats.transactions': 'em Transações',
    'stats.support': 'Suporte Dedicado',
    
    // How It Works
    'howItWorks.title': 'Simples Assim',
    'howItWorks.step1.title': 'Crie sua Conta',
    'howItWorks.step1.description': 'Cadastre-se gratuitamente em menos de 2 minutos',
    'howItWorks.step2.title': 'Configure seu Produto',
    'howItWorks.step2.description': 'Adicione seus cursos, e-books ou outros produtos digitais',
    'howItWorks.step3.title': 'Comece a Vender',
    'howItWorks.step3.description': 'Compartilhe seu link e comece a receber pagamentos',
    
    // Pricing
    'pricing.title': 'Preços Transparentes',
    'pricing.subtitle': 'Sem surpresas. Você só paga quando vende.',
    'pricing.rate': 'por transação',
    'pricing.noMonthly': 'Sem mensalidade',
    'pricing.noSetup': 'Sem taxa de adesão',
    'pricing.unlimited': 'Produtos ilimitados',
    'pricing.cta': 'Começar Agora',
    
    // Testimonials
    'testimonials.title': 'O que Nossos Criadores Dizem',
    
    // About
    'about.title': 'Sobre a Kambafy',
    'about.subtitle': 'Somos uma plataforma angolana dedicada a empoderar criadores digitais em todo o mundo lusófono.',
    
    // CTA
    'cta.title': 'Pronto para Começar?',
    'cta.subtitle': 'Junte-se a milhares de criadores que já estão vendendo com a Kambafy',
    'cta.button': 'Criar Conta Grátis',
    
    // Footer
    'footer.description': 'A plataforma completa para criar, vender e gerenciar seus produtos digitais.',
    'footer.product': 'Produto',
    'footer.company': 'Empresa',
    'footer.legal': 'Legal',
    'footer.support': 'Suporte',
    'footer.rights': 'Todos os direitos reservados.',
  },
  
  en: {
    // Header/Nav
    'nav.features': 'Features',
    'nav.howItWorks': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.login': 'Log In',
    'nav.signup': 'Get Started Free',
    
    // Hero
    'hero.badge': '#1 Platform for Digital Creators',
    'hero.title': 'Sell your',
    'hero.rotatingWords': 'digital,creative,exclusive,amazing,unique',
    'hero.subtitle': 'Create, manage and sell your courses, e-books and digital products on a single platform. Everything you need to build your online business.',
    'hero.cta.primary': 'Start Selling',
    'hero.cta.secondary': 'See How It Works',
    'hero.noCosts': 'No fixed costs • No monthly fees',
    
    // Features
    'features.title': 'Everything You Need to',
    'features.titleHighlight': 'Succeed',
    'features.subtitle': 'Powerful and simple tools to transform your knowledge into a thriving business',
    'features.orderBump.title': 'Order Bump',
    'features.orderBump.description': 'Increase your sales with complementary offers at checkout.',
    'features.checkout.title': 'Custom Checkout',
    'features.checkout.description': 'Fully customize your checkout page to maximize conversions.',
    'features.pixel.title': 'Pixel Integration',
    'features.pixel.description': 'Integrate Facebook Pixel and other tracking tools to optimize campaigns.',
    'features.affiliate.title': 'Affiliate System',
    'features.affiliate.description': 'Complete affiliate system to expand your sales through partners.',
    
    // Stats
    'stats.creators': 'Active Creators',
    'stats.products': 'Products Sold',
    'stats.transactions': 'in Transactions',
    'stats.support': 'Dedicated Support',
    
    // How It Works
    'howItWorks.title': 'It\'s That Simple',
    'howItWorks.step1.title': 'Create Your Account',
    'howItWorks.step1.description': 'Sign up for free in less than 2 minutes',
    'howItWorks.step2.title': 'Set Up Your Product',
    'howItWorks.step2.description': 'Add your courses, e-books or other digital products',
    'howItWorks.step3.title': 'Start Selling',
    'howItWorks.step3.description': 'Share your link and start receiving payments',
    
    // Pricing
    'pricing.title': 'Transparent Pricing',
    'pricing.subtitle': 'No surprises. You only pay when you sell.',
    'pricing.rate': 'per transaction',
    'pricing.noMonthly': 'No monthly fee',
    'pricing.noSetup': 'No setup fee',
    'pricing.unlimited': 'Unlimited products',
    'pricing.cta': 'Get Started Now',
    
    // Testimonials
    'testimonials.title': 'What Our Creators Say',
    
    // About
    'about.title': 'About Kambafy',
    'about.subtitle': 'We are an Angolan platform dedicated to empowering digital creators across the Portuguese-speaking world.',
    
    // CTA
    'cta.title': 'Ready to Get Started?',
    'cta.subtitle': 'Join thousands of creators already selling with Kambafy',
    'cta.button': 'Create Free Account',
    
    // Footer
    'footer.description': 'The complete platform to create, sell and manage your digital products.',
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.legal': 'Legal',
    'footer.support': 'Support',
    'footer.rights': 'All rights reserved.',
  },
  
  es: {
    // Header/Nav
    'nav.features': 'Características',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.pricing': 'Precios',
    'nav.about': 'Nosotros',
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Empezar Gratis',
    
    // Hero
    'hero.badge': 'Plataforma #1 para Creadores Digitales',
    'hero.title': 'Vende tus productos',
    'hero.rotatingWords': 'digitales,creativos,exclusivos,increíbles,únicos',
    'hero.subtitle': 'Crea, gestiona y vende tus cursos, e-books y productos digitales en una sola plataforma. Todo lo que necesitas para construir tu negocio online.',
    'hero.cta.primary': 'Empezar a Vender',
    'hero.cta.secondary': 'Ver Cómo Funciona',
    'hero.noCosts': 'Sin costos fijos • Sin mensualidades',
    
    // Features
    'features.title': 'Todo lo que Necesitas para',
    'features.titleHighlight': 'Tener Éxito',
    'features.subtitle': 'Herramientas poderosas y simples para transformar tu conocimiento en un negocio próspero',
    'features.orderBump.title': 'Order Bump',
    'features.orderBump.description': 'Aumenta tus ventas con ofertas complementarias al momento de la compra.',
    'features.checkout.title': 'Checkout Personalizado',
    'features.checkout.description': 'Personaliza completamente tu página de checkout para maximizar conversiones.',
    'features.pixel.title': 'Pixel',
    'features.pixel.description': 'Integra Facebook Pixel y otras herramientas de seguimiento para optimizar campañas.',
    'features.affiliate.title': 'Afiliación',
    'features.affiliate.description': 'Sistema completo de afiliados para expandir tus ventas a través de socios.',
    
    // Stats
    'stats.creators': 'Creadores Activos',
    'stats.products': 'Productos Vendidos',
    'stats.transactions': 'en Transacciones',
    'stats.support': 'Soporte Dedicado',
    
    // How It Works
    'howItWorks.title': 'Así de Simple',
    'howItWorks.step1.title': 'Crea tu Cuenta',
    'howItWorks.step1.description': 'Regístrate gratis en menos de 2 minutos',
    'howItWorks.step2.title': 'Configura tu Producto',
    'howItWorks.step2.description': 'Agrega tus cursos, e-books u otros productos digitales',
    'howItWorks.step3.title': 'Comienza a Vender',
    'howItWorks.step3.description': 'Comparte tu enlace y empieza a recibir pagos',
    
    // Pricing
    'pricing.title': 'Precios Transparentes',
    'pricing.subtitle': 'Sin sorpresas. Solo pagas cuando vendes.',
    'pricing.rate': 'por transacción',
    'pricing.noMonthly': 'Sin mensualidad',
    'pricing.noSetup': 'Sin cuota de inscripción',
    'pricing.unlimited': 'Productos ilimitados',
    'pricing.cta': 'Empezar Ahora',
    
    // Testimonials
    'testimonials.title': 'Lo que Dicen Nuestros Creadores',
    
    // About
    'about.title': 'Sobre Kambafy',
    'about.subtitle': 'Somos una plataforma angoleña dedicada a empoderar a los creadores digitales en todo el mundo lusófono.',
    
    // CTA
    'cta.title': '¿Listo para Empezar?',
    'cta.subtitle': 'Únete a miles de creadores que ya están vendiendo con Kambafy',
    'cta.button': 'Crear Cuenta Gratis',
    
    // Footer
    'footer.description': 'La plataforma completa para crear, vender y gestionar tus productos digitales.',
    'footer.product': 'Producto',
    'footer.company': 'Empresa',
    'footer.legal': 'Legal',
    'footer.support': 'Soporte',
    'footer.rights': 'Todos los derechos reservados.',
  }
};

// Hook helper para usar traduções da landing
export const getLandingTranslation = (language: Language, key: string): string => {
  return LANDING_TRANSLATIONS[language]?.[key] || LANDING_TRANSLATIONS.pt[key] || key;
};
