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
    'nav.startNow': 'Começar Agora',
    
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
    'stats.students': 'Alunos Satisfeitos',
    'stats.courses': 'Cursos Disponíveis',
    'stats.satisfaction': 'Satisfação dos Usuários',
    
    // How It Works
    'howItWorks.title': 'Como',
    'howItWorks.titleHighlight': 'Funciona',
    'howItWorks.subtitle': 'Comece a vender seus produtos digitais em 3 passos simples',
    'howItWorks.step1.title': 'Crie sua Conta',
    'howItWorks.step1.description': 'Cadastre-se gratuitamente e configure seu perfil de criador em minutos. Sem burocracias, sem complicações.',
    'howItWorks.step2.title': 'Configure seu Produto',
    'howItWorks.step2.description': 'Adicione seus cursos, e-books ou produtos digitais. Personalize seu checkout e defina seus preços.',
    'howItWorks.step3.title': 'Comece a Vender',
    'howItWorks.step3.description': 'Compartilhe seu link e comece a receber pagamentos. Receba em até 3 dias úteis após cada venda.',
    
    // Testimonials
    'testimonials.title': 'O que Dizem Nossos',
    'testimonials.titleHighlight': 'Criadores',
    'testimonials.subtitle': 'Histórias reais de pessoas que transformaram suas vidas com a Kambafy',
    'testimonials.1.content': 'Esta é a plataforma que faltava no mercado, fácil de usar, converte muito bem, aumentou minha conversão em lançamentos.',
    'testimonials.2.content': 'Este serviço transformou minha forma de trabalhar. Design limpo, recursos poderosos e excelente suporte.',
    'testimonials.3.content': 'Já testei muitas plataformas, mas esta se destaca. Intuitiva, confiável e genuinamente útil para produtividade.',
    
    // Pricing
    'pricing.title': 'Preços',
    'pricing.titleHighlight': 'Transparentes',
    'pricing.subtitle': 'Sem mensalidades, sem custos fixos. Pague apenas quando vender.',
    'pricing.planName': 'Plano Comissão',
    'pricing.rate': 'por venda',
    'pricing.rateInfo': 'Angola 8,99% • Internacional 9,99%',
    'pricing.feature1': 'Sem mensalidade ou taxa de adesão',
    'pricing.feature2': 'Checkout personalizado e profissional',
    'pricing.feature3': 'Sistema completo de afiliados',
    'pricing.feature4': 'Order Bump para aumentar vendas',
    'pricing.feature5': 'Integração com Facebook Pixel',
    'pricing.feature6': 'Área de membros ilimitada',
    'pricing.feature7': 'Pagamento em até 3 dias úteis',
    'pricing.feature8': 'Suporte prioritário',
    'pricing.cta': 'Começar Agora Grátis',
    
    // About
    'about.title': 'Sobre a',
    'about.titleHighlight': 'Kambafy',
    'about.description1': 'Somos uma startup angolana dedicada a democratizar o acesso ao conhecimento e empoderar criadores de conteúdo em toda Angola e países lusófonos.',
    'about.description2': 'Nossa missão é criar uma ponte entre quem tem conhecimento e quem quer aprender, proporcionando oportunidades de crescimento pessoal e profissional para todos.',
    'about.feature1': 'Plataforma 100% nacional',
    'about.feature2': 'Pagamentos em multimoedas',
    
    // FAQ
    'faq.title': 'Perguntas',
    'faq.titleHighlight': 'Frequentes',
    'faq.subtitle': 'Tire suas dúvidas sobre a plataforma',
    'faq.1.question': 'Como começar a vender na Kambafy?',
    'faq.1.answer': 'Para começar, crie sua conta gratuita, configure seu perfil de criador e publique seu primeiro produto. Nossa equipe está disponível para ajudar em cada passo.',
    'faq.2.question': 'Como funciona a comissão da plataforma?',
    'faq.2.answer': 'Trabalhamos com um modelo justo: cobramos apenas 8,99% de comissão para vendas em Angola e 9,99% para vendas internacionais (Moçambique, Portugal, cartões). Sem mensalidades, sem custos fixos.',
    'faq.3.question': 'Posso vender diferentes tipos de produtos?',
    'faq.3.answer': 'Sim! Você pode vender cursos online, e-books, mentorias, templates, consultorias e muito mais. A plataforma é flexível para diversos tipos de infoprodutos.',
    'faq.4.question': 'Como recebo meus pagamentos?',
    'faq.4.answer': 'Os pagamentos são processados automaticamente e transferidos para sua conta bancária em até 3 dias úteis. Suportamos múltiplas moedas e métodos de pagamento.',
    'faq.5.question': 'Preciso de conhecimentos técnicos?',
    'faq.5.answer': 'Não! Nossa plataforma foi desenvolvida para ser intuitiva e fácil de usar. Qualquer pessoa pode criar e vender seus produtos digitais sem precisar de conhecimentos técnicos.',
    'faq.notFound': 'Não encontrou a resposta que procurava?',
    'faq.helpCenter': 'Ir para Central de Ajuda',
    
    // CTA
    'cta.title': 'Pronto para',
    'cta.titleHighlight': 'Começar?',
    'cta.subtitle': 'Cadastre-se gratuitamente e comece a monetizar seu conhecimento hoje mesmo',
    'cta.button': 'Criar Conta Grátis',
    'cta.secondary': 'Falar com Especialista',
    
    // Footer
    'footer.tagline': 'A maior plataforma Lusófona de infoprodutos',
    'footer.platform': 'Plataforma',
    'footer.support': 'Suporte',
    'footer.legal': 'Legal',
    'footer.howItWorks': 'Como Funciona',
    'footer.pricing': 'Preços',
    'footer.features': 'Recursos',
    'footer.helpCenter': 'Central de Ajuda',
    'footer.contact': 'Contacto',
    'footer.report': 'Denuncie',
    'footer.status': 'Status',
    'footer.privacy': 'Privacidade',
    'footer.terms': 'Termos',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 Kambafy. Todos os direitos reservados. Feito com ❤️ em Angola.',
  },
  
  en: {
    // Header/Nav
    'nav.features': 'Features',
    'nav.howItWorks': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.login': 'Log In',
    'nav.signup': 'Get Started Free',
    'nav.startNow': 'Get Started',
    
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
    'stats.students': 'Satisfied Students',
    'stats.courses': 'Available Courses',
    'stats.satisfaction': 'User Satisfaction',
    
    // How It Works
    'howItWorks.title': 'How It',
    'howItWorks.titleHighlight': 'Works',
    'howItWorks.subtitle': 'Start selling your digital products in 3 simple steps',
    'howItWorks.step1.title': 'Create Your Account',
    'howItWorks.step1.description': 'Sign up for free and set up your creator profile in minutes. No bureaucracy, no hassle.',
    'howItWorks.step2.title': 'Set Up Your Product',
    'howItWorks.step2.description': 'Add your courses, e-books or digital products. Customize your checkout and set your prices.',
    'howItWorks.step3.title': 'Start Selling',
    'howItWorks.step3.description': 'Share your link and start receiving payments. Get paid within 3 business days after each sale.',
    
    // Testimonials
    'testimonials.title': 'What Our',
    'testimonials.titleHighlight': 'Creators Say',
    'testimonials.subtitle': 'Real stories from people who transformed their lives with Kambafy',
    'testimonials.1.content': 'This is the platform the market was missing, easy to use, converts really well, increased my launch conversions.',
    'testimonials.2.content': 'This service transformed the way I work. Clean design, powerful features and excellent support.',
    'testimonials.3.content': "I've tested many platforms, but this one stands out. Intuitive, reliable and genuinely useful for productivity.",
    
    // Pricing
    'pricing.title': 'Transparent',
    'pricing.titleHighlight': 'Pricing',
    'pricing.subtitle': 'No monthly fees, no fixed costs. Pay only when you sell.',
    'pricing.planName': 'Commission Plan',
    'pricing.rate': 'per sale',
    'pricing.rateInfo': 'Angola 8.99% • International 9.99%',
    'pricing.feature1': 'No monthly fee or setup fee',
    'pricing.feature2': 'Customized professional checkout',
    'pricing.feature3': 'Complete affiliate system',
    'pricing.feature4': 'Order Bump to increase sales',
    'pricing.feature5': 'Facebook Pixel integration',
    'pricing.feature6': 'Unlimited member area',
    'pricing.feature7': 'Payment within 3 business days',
    'pricing.feature8': 'Priority support',
    'pricing.cta': 'Get Started Free',
    
    // About
    'about.title': 'About',
    'about.titleHighlight': 'Kambafy',
    'about.description1': 'We are an Angolan startup dedicated to democratizing access to knowledge and empowering content creators across Angola and Portuguese-speaking countries.',
    'about.description2': 'Our mission is to create a bridge between those who have knowledge and those who want to learn, providing opportunities for personal and professional growth for everyone.',
    'about.feature1': '100% national platform',
    'about.feature2': 'Multi-currency payments',
    
    // FAQ
    'faq.title': 'Frequently Asked',
    'faq.titleHighlight': 'Questions',
    'faq.subtitle': 'Get your questions about the platform answered',
    'faq.1.question': 'How do I start selling on Kambafy?',
    'faq.1.answer': 'To get started, create your free account, set up your creator profile and publish your first product. Our team is available to help every step of the way.',
    'faq.2.question': 'How does the platform commission work?',
    'faq.2.answer': 'We work with a fair model: we charge only 8.99% commission for sales in Angola and 9.99% for international sales (Mozambique, Portugal, cards). No monthly fees, no fixed costs.',
    'faq.3.question': 'Can I sell different types of products?',
    'faq.3.answer': 'Yes! You can sell online courses, e-books, mentoring, templates, consulting and more. The platform is flexible for various types of digital products.',
    'faq.4.question': 'How do I receive my payments?',
    'faq.4.answer': 'Payments are processed automatically and transferred to your bank account within 3 business days. We support multiple currencies and payment methods.',
    'faq.5.question': 'Do I need technical knowledge?',
    'faq.5.answer': 'No! Our platform was developed to be intuitive and easy to use. Anyone can create and sell their digital products without any technical knowledge.',
    'faq.notFound': "Didn't find the answer you were looking for?",
    'faq.helpCenter': 'Go to Help Center',
    
    // CTA
    'cta.title': 'Ready to',
    'cta.titleHighlight': 'Get Started?',
    'cta.subtitle': 'Sign up for free and start monetizing your knowledge today',
    'cta.button': 'Create Free Account',
    'cta.secondary': 'Talk to a Specialist',
    
    // Footer
    'footer.tagline': 'The largest Portuguese-speaking digital products platform',
    'footer.platform': 'Platform',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.howItWorks': 'How It Works',
    'footer.pricing': 'Pricing',
    'footer.features': 'Features',
    'footer.helpCenter': 'Help Center',
    'footer.contact': 'Contact',
    'footer.report': 'Report',
    'footer.status': 'Status',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 Kambafy. All rights reserved. Made with ❤️ in Angola.',
  },
  
  es: {
    // Header/Nav
    'nav.features': 'Características',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.pricing': 'Precios',
    'nav.about': 'Nosotros',
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Empezar Gratis',
    'nav.startNow': 'Empezar Ahora',
    
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
    'stats.students': 'Estudiantes Satisfechos',
    'stats.courses': 'Cursos Disponibles',
    'stats.satisfaction': 'Satisfacción de Usuarios',
    
    // How It Works
    'howItWorks.title': 'Cómo',
    'howItWorks.titleHighlight': 'Funciona',
    'howItWorks.subtitle': 'Empieza a vender tus productos digitales en 3 simples pasos',
    'howItWorks.step1.title': 'Crea tu Cuenta',
    'howItWorks.step1.description': 'Regístrate gratis y configura tu perfil de creador en minutos. Sin burocracia, sin complicaciones.',
    'howItWorks.step2.title': 'Configura tu Producto',
    'howItWorks.step2.description': 'Agrega tus cursos, e-books o productos digitales. Personaliza tu checkout y define tus precios.',
    'howItWorks.step3.title': 'Comienza a Vender',
    'howItWorks.step3.description': 'Comparte tu enlace y empieza a recibir pagos. Recibe en hasta 3 días hábiles después de cada venta.',
    
    // Testimonials
    'testimonials.title': 'Lo que Dicen Nuestros',
    'testimonials.titleHighlight': 'Creadores',
    'testimonials.subtitle': 'Historias reales de personas que transformaron sus vidas con Kambafy',
    'testimonials.1.content': 'Esta es la plataforma que faltaba en el mercado, fácil de usar, convierte muy bien, aumentó mis conversiones en lanzamientos.',
    'testimonials.2.content': 'Este servicio transformó mi forma de trabajar. Diseño limpio, funciones potentes y excelente soporte.',
    'testimonials.3.content': 'He probado muchas plataformas, pero esta se destaca. Intuitiva, confiable y genuinamente útil para la productividad.',
    
    // Pricing
    'pricing.title': 'Precios',
    'pricing.titleHighlight': 'Transparentes',
    'pricing.subtitle': 'Sin mensualidades, sin costos fijos. Paga solo cuando vendas.',
    'pricing.planName': 'Plan Comisión',
    'pricing.rate': 'por venta',
    'pricing.rateInfo': 'Angola 8,99% • Internacional 9,99%',
    'pricing.feature1': 'Sin mensualidad ni cuota de inscripción',
    'pricing.feature2': 'Checkout personalizado y profesional',
    'pricing.feature3': 'Sistema completo de afiliados',
    'pricing.feature4': 'Order Bump para aumentar ventas',
    'pricing.feature5': 'Integración con Facebook Pixel',
    'pricing.feature6': 'Área de miembros ilimitada',
    'pricing.feature7': 'Pago en hasta 3 días hábiles',
    'pricing.feature8': 'Soporte prioritario',
    'pricing.cta': 'Empezar Ahora Gratis',
    
    // About
    'about.title': 'Sobre',
    'about.titleHighlight': 'Kambafy',
    'about.description1': 'Somos una startup angoleña dedicada a democratizar el acceso al conocimiento y empoderar a los creadores de contenido en toda Angola y países lusófonos.',
    'about.description2': 'Nuestra misión es crear un puente entre quienes tienen conocimiento y quienes quieren aprender, proporcionando oportunidades de crecimiento personal y profesional para todos.',
    'about.feature1': 'Plataforma 100% nacional',
    'about.feature2': 'Pagos en múltiples monedas',
    
    // FAQ
    'faq.title': 'Preguntas',
    'faq.titleHighlight': 'Frecuentes',
    'faq.subtitle': 'Resuelve tus dudas sobre la plataforma',
    'faq.1.question': '¿Cómo empezar a vender en Kambafy?',
    'faq.1.answer': 'Para empezar, crea tu cuenta gratuita, configura tu perfil de creador y publica tu primer producto. Nuestro equipo está disponible para ayudarte en cada paso.',
    'faq.2.question': '¿Cómo funciona la comisión de la plataforma?',
    'faq.2.answer': 'Trabajamos con un modelo justo: cobramos solo 8,99% de comisión para ventas en Angola y 9,99% para ventas internacionales (Mozambique, Portugal, tarjetas). Sin mensualidades, sin costos fijos.',
    'faq.3.question': '¿Puedo vender diferentes tipos de productos?',
    'faq.3.answer': '¡Sí! Puedes vender cursos online, e-books, mentorías, templates, consultorías y mucho más. La plataforma es flexible para diversos tipos de productos digitales.',
    'faq.4.question': '¿Cómo recibo mis pagos?',
    'faq.4.answer': 'Los pagos se procesan automáticamente y se transfieren a tu cuenta bancaria en hasta 3 días hábiles. Soportamos múltiples monedas y métodos de pago.',
    'faq.5.question': '¿Necesito conocimientos técnicos?',
    'faq.5.answer': '¡No! Nuestra plataforma fue desarrollada para ser intuitiva y fácil de usar. Cualquier persona puede crear y vender sus productos digitales sin necesitar conocimientos técnicos.',
    'faq.notFound': '¿No encontraste la respuesta que buscabas?',
    'faq.helpCenter': 'Ir al Centro de Ayuda',
    
    // CTA
    'cta.title': '¿Listo para',
    'cta.titleHighlight': 'Empezar?',
    'cta.subtitle': 'Regístrate gratis y comienza a monetizar tu conocimiento hoy mismo',
    'cta.button': 'Crear Cuenta Gratis',
    'cta.secondary': 'Hablar con un Especialista',
    
    // Footer
    'footer.tagline': 'La mayor plataforma lusófona de infoproductos',
    'footer.platform': 'Plataforma',
    'footer.support': 'Soporte',
    'footer.legal': 'Legal',
    'footer.howItWorks': 'Cómo Funciona',
    'footer.pricing': 'Precios',
    'footer.features': 'Características',
    'footer.helpCenter': 'Centro de Ayuda',
    'footer.contact': 'Contacto',
    'footer.report': 'Denunciar',
    'footer.status': 'Estado',
    'footer.privacy': 'Privacidad',
    'footer.terms': 'Términos',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 Kambafy. Todos los derechos reservados. Hecho con ❤️ en Angola.',
  }
};

// Hook helper para usar traduções da landing
export const getLandingTranslation = (language: Language, key: string): string => {
  return LANDING_TRANSLATIONS[language]?.[key] || LANDING_TRANSLATIONS.pt[key] || key;
};
