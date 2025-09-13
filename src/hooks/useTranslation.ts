import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Traduções estáticas básicas como fallback
const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  pt: {
    // Textos do formulário
    'form.title': 'Informações do Cliente',
    'form.name': 'Nome Completo',
    'form.name.placeholder': 'Digite seu nome completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Digite seu email',
    'form.phone': 'Telefone',
    
    // Textos de pagamento
    'payment.title': 'Método de Pagamento',
    'payment.secure': '100% Seguro',
    'payment.processing': 'Processando...',
    'payment.powered': 'Powered by',
    
    // Textos de cartão
    'payment.card.title': 'Pagamento Seguro',
    'payment.card.description': 'Processado de forma segura pelo Stripe',
    'payment.card.currency': 'Moeda',
    'payment.card.pay': 'Pagar',
    
    // Textos gerais
    'button.loading': 'Carregando...',
    'button.buy': 'Finalizar Compra',
    'product.sales': 'vendas',
    'orderbump.title': 'Oferta Especial'
  },
  en: {
    // Form texts
    'form.title': 'Customer Information',
    'form.name': 'Full Name',
    'form.name.placeholder': 'Enter your full name',
    'form.email': 'Email',
    'form.email.placeholder': 'Enter your email',
    'form.phone': 'Phone',
    
    // Payment texts
    'payment.title': 'Payment Method',
    'payment.secure': '100% Secure',
    'payment.processing': 'Processing...',
    'payment.powered': 'Powered by',
    
    // Card texts
    'payment.card.title': 'Secure Payment',
    'payment.card.description': 'Securely processed by Stripe',
    'payment.card.currency': 'Currency',
    'payment.card.pay': 'Pay',
    
    // General texts
    'button.loading': 'Loading...',
    'button.buy': 'Complete Purchase',
    'product.sales': 'sales',
    'orderbump.title': 'Special Offer'
  },
  es: {
    // Textos del formulario
    'form.title': 'Información del Cliente',
    'form.name': 'Nombre Completo',
    'form.name.placeholder': 'Ingrese su nombre completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Ingrese su email',
    'form.phone': 'Teléfono',
    
    // Textos de pago
    'payment.title': 'Método de Pago',
    'payment.secure': '100% Seguro',
    'payment.processing': 'Procesando...',
    'payment.powered': 'Powered by',
    
    // Textos de tarjeta
    'payment.card.title': 'Pago Seguro',
    'payment.card.description': 'Procesado de forma segura por Stripe',
    'payment.card.currency': 'Moneda',
    'payment.card.pay': 'Pagar',
    
    // Textos generales
    'button.loading': 'Cargando...',
    'button.buy': 'Finalizar Compra',
    'product.sales': 'ventas',
    'orderbump.title': 'Oferta Especial'
  }
};

// Cache de traduções
const translationCache = new Map<string, string>();

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState('pt');
  const [isTranslationReady, setIsTranslationReady] = useState(true);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});

  // Detectar idioma automaticamente baseado no localStorage ou navegador
  useEffect(() => {
    const detectedLang = localStorage.getItem('detectedLanguage') || 'pt';
    console.log('🌍 Translation hook - detected language:', detectedLang);
    setCurrentLanguage(detectedLang);
  }, []);

  // Função para traduzir usando OpenAI
  const translateWithAI = async (text: string, targetLanguage: string): Promise<string> => {
    const cacheKey = `${text}_${targetLanguage}`;
    
    // Verificar cache primeiro
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      console.log('🤖 Translating with AI:', { text, targetLanguage });
      
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, targetLanguage, sourceLanguage: 'auto' }
      });

      if (error) {
        console.error('Translation error:', error);
        return text; // Return original text if translation fails
      }

      const translatedText = data.translatedText || text;
      
      // Armazenar no cache
      translationCache.set(cacheKey, translatedText);
      
      console.log('✅ AI Translation completed:', { original: text, translated: translatedText });
      return translatedText;
    } catch (error) {
      console.error('❌ Translation API error:', error);
      return text; // Return original text if API fails
    }
  };

  const t = (key: string): string => {
    // Primeiro, verificar traduções dinâmicas (cache)
    const dynamicTranslation = dynamicTranslations[`${key}_${currentLanguage}`];
    if (dynamicTranslation) {
      return dynamicTranslation;
    }

    // Depois, verificar traduções estáticas
    const staticTranslation = STATIC_TRANSLATIONS[currentLanguage]?.[key] || 
                            STATIC_TRANSLATIONS.pt[key];
    
    if (staticTranslation) {
      console.log(`🔤 Static Translation: ${key} -> ${staticTranslation} (${currentLanguage})`);
      return staticTranslation;
    }

    // Se não encontrar tradução estática, tentar traduzir com AI (apenas se não for português)
    if (currentLanguage !== 'pt') {
      const portugueeseText = STATIC_TRANSLATIONS.pt[key] || key;
      
      // Fazer tradução assíncrona e armazenar resultado
      translateWithAI(portugueeseText, currentLanguage).then(translated => {
        setDynamicTranslations(prev => ({
          ...prev,
          [`${key}_${currentLanguage}`]: translated
        }));
      });
    }

    // Retornar texto original como fallback
    console.log(`🔤 Fallback Translation: ${key} -> ${key} (${currentLanguage})`);
    return STATIC_TRANSLATIONS.pt[key] || key;
  };

  const changeLanguage = (language: string) => {
    console.log('🌍 Changing language to:', language);
    setCurrentLanguage(language);
    localStorage.setItem('detectedLanguage', language);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    isTranslationReady,
    translateWithAI // Expor função para uso direto se necessário
  };
};