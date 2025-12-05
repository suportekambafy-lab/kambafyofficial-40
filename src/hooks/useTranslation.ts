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
    'orderbump.title': 'Oferta Especial',

    // Settings page
    'settings.title': 'Configurações da Conta',
    'settings.subtitle': 'Gerencie suas informações pessoais e configurações',
    'settings.tab.profile': 'Perfil',
    'settings.tab.account': 'Conta',
    'settings.tab.security': 'Segurança',
    'settings.profile.title': 'Perfil Público',
    'settings.profile.photo': 'Foto de Perfil',
    'settings.profile.photo.hint': 'Clique na foto para alterar. Máximo 5MB.',
    'settings.profile.upload': 'Enviar Foto',
    'settings.profile.uploading': 'Enviando...',
    'settings.profile.remove': 'Remover',
    'settings.profile.name': 'Nome Completo',
    'settings.profile.name.placeholder': 'Seu nome completo',
    'settings.profile.bio': 'Biografia',
    'settings.profile.bio.placeholder': 'Conte um pouco sobre você...',
    'settings.profile.bio.hint': 'Esta informação será visível para seus clientes',
    'settings.profile.save': 'Salvar Alterações',
    'settings.profile.saving': 'Salvando...',
    'settings.account.title': 'Informações da Conta',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'Para alterar seu email, entre em contato com o suporte',
    'settings.account.id': 'ID da Conta',
    'settings.account.id.hint': 'Este é seu identificador único no sistema',
    'settings.account.member.since': 'Membro desde',
    'settings.language.title': 'Preferências de Idioma',
    'settings.language.subtitle': 'Escolha o idioma da interface',
    'settings.language.label': 'Idioma da Interface',
    'settings.language.hint': 'A alteração será aplicada imediatamente em toda a interface',
    'settings.success': 'Perfil atualizado',
    'settings.success.message': 'Suas informações foram salvas com sucesso!',
    'settings.error': 'Erro',
    'settings.error.message': 'Erro ao atualizar perfil',
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
    'orderbump.title': 'Special Offer',

    // Settings page
    'settings.title': 'Account Settings',
    'settings.subtitle': 'Manage your personal information and settings',
    'settings.tab.profile': 'Profile',
    'settings.tab.account': 'Account',
    'settings.tab.security': 'Security',
    'settings.profile.title': 'Public Profile',
    'settings.profile.photo': 'Profile Photo',
    'settings.profile.photo.hint': 'Click on the photo to change. Max 5MB.',
    'settings.profile.upload': 'Upload Photo',
    'settings.profile.uploading': 'Uploading...',
    'settings.profile.remove': 'Remove',
    'settings.profile.name': 'Full Name',
    'settings.profile.name.placeholder': 'Your full name',
    'settings.profile.bio': 'Bio',
    'settings.profile.bio.placeholder': 'Tell us about yourself...',
    'settings.profile.bio.hint': 'This information will be visible to your customers',
    'settings.profile.save': 'Save Changes',
    'settings.profile.saving': 'Saving...',
    'settings.account.title': 'Account Information',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'To change your email, contact support',
    'settings.account.id': 'Account ID',
    'settings.account.id.hint': 'This is your unique identifier in the system',
    'settings.account.member.since': 'Member since',
    'settings.language.title': 'Language Preferences',
    'settings.language.subtitle': 'Choose the interface language',
    'settings.language.label': 'Interface Language',
    'settings.language.hint': 'Changes will be applied immediately across the interface',
    'settings.success': 'Profile updated',
    'settings.success.message': 'Your information has been saved successfully!',
    'settings.error': 'Error',
    'settings.error.message': 'Error updating profile',
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
    'orderbump.title': 'Oferta Especial',

    // Settings page
    'settings.title': 'Configuración de la Cuenta',
    'settings.subtitle': 'Administra tu información personal y configuración',
    'settings.tab.profile': 'Perfil',
    'settings.tab.account': 'Cuenta',
    'settings.tab.security': 'Seguridad',
    'settings.profile.title': 'Perfil Público',
    'settings.profile.photo': 'Foto de Perfil',
    'settings.profile.photo.hint': 'Haz clic en la foto para cambiar. Máximo 5MB.',
    'settings.profile.upload': 'Subir Foto',
    'settings.profile.uploading': 'Subiendo...',
    'settings.profile.remove': 'Eliminar',
    'settings.profile.name': 'Nombre Completo',
    'settings.profile.name.placeholder': 'Tu nombre completo',
    'settings.profile.bio': 'Biografía',
    'settings.profile.bio.placeholder': 'Cuéntanos sobre ti...',
    'settings.profile.bio.hint': 'Esta información será visible para tus clientes',
    'settings.profile.save': 'Guardar Cambios',
    'settings.profile.saving': 'Guardando...',
    'settings.account.title': 'Información de la Cuenta',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'Para cambiar tu email, contacta al soporte',
    'settings.account.id': 'ID de la Cuenta',
    'settings.account.id.hint': 'Este es tu identificador único en el sistema',
    'settings.account.member.since': 'Miembro desde',
    'settings.language.title': 'Preferencias de Idioma',
    'settings.language.subtitle': 'Elige el idioma de la interfaz',
    'settings.language.label': 'Idioma de la Interfaz',
    'settings.language.hint': 'Los cambios se aplicarán inmediatamente en toda la interfaz',
    'settings.success': 'Perfil actualizado',
    'settings.success.message': '¡Tu información se ha guardado correctamente!',
    'settings.error': 'Error',
    'settings.error.message': 'Error al actualizar el perfil',
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
    console.log('🌍 Available static translations:', Object.keys(STATIC_TRANSLATIONS));
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
    console.log(`🌍 Translation request: ${key} (${currentLanguage})`);
    
    // Primeiro, verificar traduções dinâmicas (cache)
    const dynamicTranslation = dynamicTranslations[`${key}_${currentLanguage}`];
    if (dynamicTranslation) {
      console.log(`🎯 Found dynamic translation: ${key} -> ${dynamicTranslation}`);
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
      console.log(`🤖 Triggering AI translation for: ${portugueeseText} -> ${currentLanguage}`);
      
      // Fazer tradução assíncrona e armazenar resultado
      translateWithAI(portugueeseText, currentLanguage).then(translated => {
        console.log(`✅ AI translation completed: ${key} -> ${translated}`);
        setDynamicTranslations(prev => ({
          ...prev,
          [`${key}_${currentLanguage}`]: translated
        }));
      }).catch(error => {
        console.error(`❌ AI translation failed for ${key}:`, error);
      });
    }

    // Retornar texto original como fallback
    const fallback = STATIC_TRANSLATIONS.pt[key] || key;
    console.log(`🔤 Fallback Translation: ${key} -> ${fallback} (${currentLanguage})`);
    return fallback;
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