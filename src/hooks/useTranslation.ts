import { useState, useEffect } from 'react';
import { useGeoLocation } from './useGeoLocation';

// Textos de tradução para o checkout
const translations = {
  pt: {
    // Produto
    'product.title': 'Finalize sua compra',
    'product.price': 'Preço',
    'product.description': 'Descrição',
    'product.sales': 'vendas',
    
    // Formulário
    'form.title': 'Informações de contato',
    'form.name': 'Nome completo',
    'form.name.placeholder': 'Digite seu nome completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Digite seu email',
    'form.phone': 'Telefone (opcional)',
    'form.phone.placeholder': 'Digite seu telefone',
    
    // Pagamento
    'payment.title': 'Forma de pagamento',
    'payment.processing': 'Processando pagamento...',
    'payment.complete': 'Finalizar compra',
    'payment.secure': 'Pagamento 100% seguro',
    
    // Botões
    'button.buy': 'Comprar agora',
    'button.loading': 'Carregando...',
    
    // Mensagens
    'loading.product': 'Carregando produto...',
    'error.load': 'Erro ao carregar produto',
    'success.purchase': 'Compra realizada com sucesso!',
    
    // Order Bump
    'orderbump.title': 'Oferta especial!',
    'orderbump.add': 'Adicionar à compra',
    
    // Garantia
    'guarantee.title': 'Garantia de 7 dias',
    'guarantee.description': 'Se não ficar satisfeito, devolvemos seu dinheiro'
  },
  
  es: {
    // Producto
    'product.title': 'Finaliza tu compra',
    'product.price': 'Precio',
    'product.description': 'Descripción',
    'product.sales': 'ventas',
    
    // Formulario
    'form.title': 'Información de contacto',
    'form.name': 'Nombre completo',
    'form.name.placeholder': 'Ingresa tu nombre completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Ingresa tu email',
    'form.phone': 'Teléfono (opcional)',
    'form.phone.placeholder': 'Ingresa tu teléfono',
    
    // Pago
    'payment.title': 'Forma de pago',
    'payment.processing': 'Procesando pago...',
    'payment.complete': 'Finalizar compra',
    'payment.secure': 'Pago 100% seguro',
    
    // Botones
    'button.buy': 'Comprar ahora',
    'button.loading': 'Cargando...',
    
    // Mensajes
    'loading.product': 'Cargando producto...',
    'error.load': 'Error al cargar producto',
    'success.purchase': '¡Compra realizada con éxito!',
    
    // Order Bump
    'orderbump.title': '¡Oferta especial!',
    'orderbump.add': 'Agregar a la compra',
    
    // Garantía
    'guarantee.title': 'Garantía de 7 días',
    'guarantee.description': 'Si no quedas satisfecho, devolvemos tu dinero'
  },
  
  en: {
    // Product
    'product.title': 'Complete your purchase',
    'product.price': 'Price',
    'product.description': 'Description',
    'product.sales': 'sales',
    
    // Form
    'form.title': 'Contact information',
    'form.name': 'Full name',
    'form.name.placeholder': 'Enter your full name',
    'form.email': 'Email',
    'form.email.placeholder': 'Enter your email',
    'form.phone': 'Phone (optional)',
    'form.phone.placeholder': 'Enter your phone',
    
    // Payment
    'payment.title': 'Payment method',
    'payment.processing': 'Processing payment...',
    'payment.complete': 'Complete purchase',
    'payment.secure': '100% secure payment',
    
    // Buttons
    'button.buy': 'Buy now',
    'button.loading': 'Loading...',
    
    // Messages
    'loading.product': 'Loading product...',
    'error.load': 'Error loading product',
    'success.purchase': 'Purchase completed successfully!',
    
    // Order Bump
    'orderbump.title': 'Special offer!',
    'orderbump.add': 'Add to purchase',
    
    // Guarantee
    'guarantee.title': '7-day guarantee',
    'guarantee.description': "If you're not satisfied, we'll refund your money"
  }
};

// Mapeamento de países para idiomas (expandido)
const COUNTRY_TO_LANGUAGE: Record<string, keyof typeof translations> = {
  // Português
  'AO': 'pt', // Angola
  'PT': 'pt', // Portugal
  'BR': 'pt', // Brasil
  'MZ': 'pt', // Moçambique
  'CV': 'pt', // Cabo Verde
  'ST': 'pt', // São Tomé e Príncipe
  'GW': 'pt', // Guiné-Bissau
  'TL': 'pt', // Timor-Leste
  
  // Espanhol
  'ES': 'es', // Espanha
  'MX': 'es', // México
  'AR': 'es', // Argentina
  'CO': 'es', // Colômbia
  'PE': 'es', // Peru
  'VE': 'es', // Venezuela
  'CL': 'es', // Chile
  'EC': 'es', // Equador
  'GT': 'es', // Guatemala
  'CU': 'es', // Cuba
  'BO': 'es', // Bolívia
  'DO': 'es', // República Dominicana
  'HN': 'es', // Honduras
  'PY': 'es', // Paraguai
  'SV': 'es', // El Salvador
  'NI': 'es', // Nicarágua
  'CR': 'es', // Costa Rica
  'PA': 'es', // Panamá
  'UY': 'es', // Uruguai
  'GQ': 'es', // Guiné Equatorial
  
  // Inglês
  'US': 'en', // Estados Unidos  
  'GB': 'en', // Reino Unido
  'CA': 'en', // Canadá
  'AU': 'en', // Austrália
  'NZ': 'en', // Nova Zelândia
  'IE': 'en', // Irlanda
  'ZA': 'en', // África do Sul
  'IN': 'en', // Índia
  'PK': 'en', // Paquistão
  'NG': 'en', // Nigéria
  'KE': 'en', // Quénia
  'UG': 'en', // Uganda
  'TZ': 'en', // Tanzânia
  'GH': 'en', // Gana
  'ZW': 'en', // Zimbábue
  'BW': 'en', // Botswana
  'MW': 'en', // Malawi
  'ZM': 'en', // Zâmbia
  'SL': 'en', // Serra Leoa
  'LR': 'en', // Libéria
};

export const useTranslation = () => {
  const { userCountry, detectedLanguage, isReady } = useGeoLocation();
  const [currentLanguage, setCurrentLanguage] = useState<keyof typeof translations>('pt');
  const [isTranslationReady, setIsTranslationReady] = useState(false);

  useEffect(() => {
    if (isReady && userCountry) {
      // Detectar idioma baseado no país
      const detectedLang = COUNTRY_TO_LANGUAGE[userCountry.code] || 'pt';
      setCurrentLanguage(detectedLang);
      setIsTranslationReady(true);
      
      console.log(`Auto-detected language: ${detectedLang} for country: ${userCountry.code}`);
    }
  }, [isReady, userCountry]);

  // Função para obter tradução
  const t = (key: string): string => {
    const translation = translations[currentLanguage]?.[key as keyof typeof translations[typeof currentLanguage]];
    
    // Fallback para português se a tradução não existir
    if (!translation) {
      return translations.pt[key as keyof typeof translations.pt] || key;
    }
    
    return translation;
  };

  // Função para mudar idioma manualmente
  const changeLanguage = (lang: keyof typeof translations) => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    console.log(`Language changed to: ${lang}`);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    isTranslationReady,
    availableLanguages: Object.keys(translations) as (keyof typeof translations)[]
  };
};