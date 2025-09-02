import { useState, useEffect } from 'react';
import { useGeoLocation } from './useGeoLocation';

// Definição das traduções para o checkout
const CHECKOUT_TRANSLATIONS = {
  pt: {
    // Informações do produto
    productInfo: 'Informações do produto',
    by: 'Por',
    
    // Formulário
    personalInfo: 'Informações pessoais',
    fullName: 'Nome completo',
    email: 'Email',
    phone: 'Telefone',
    country: 'País',
    
    // Métodos de pagamento
    paymentMethods: 'Métodos de pagamento',
    selectPaymentMethod: 'Selecione o método de pagamento',
    
    // Order bump
    specialOffer: 'Oferta especial',
    addToOrder: 'Adicionar ao pedido',
    
    // Resumo do pedido
    orderSummary: 'Resumo do pedido',
    product: 'Produto',
    orderBump: 'Produto extra',
    total: 'Total',
    
    // Botões
    completeOrder: 'Finalizar pedido',
    processing: 'Processando...',
    
    // Erros e validações
    fillAllFields: 'Preencha todos os campos obrigatórios',
    invalidEmail: 'Email inválido',
    invalidPhone: 'Telefone inválido',
    
    // Segurança
    secureCheckout: 'Checkout seguro',
    sslProtected: 'Protegido por SSL',
    
    // Estados do produto
    productNotFound: 'Produto não encontrado',
    productInactive: 'Este produto está temporariamente indisponível',
    productBanned: 'Este produto não está mais disponível',
    
    // KambaPay
    kambaPayNotRegistered: 'O email não está registrado no KambaPay. Use outro método de pagamento ou crie uma conta KambaPay.',
    kambaPayError: 'Erro ao verificar conta KambaPay. Tente outro método de pagamento.',
    
    // Carrinho abandonado
    cartAbandoned: 'Carrinho abandonado detectado',
    continueCheckout: 'Continue sua compra',
    
    // Order bump textos adicionais
    limitedOffers: 'Ofertas limitadas',
    lifetimeAccess: 'Acesso Vitalício',
    accessExtension: 'de tempo de acesso',
    day: 'dia',
    days: 'dias',
    month: 'mês',
    months: 'meses',
    year: 'ano',
    years: 'anos',
    
    // Mensagens de erro e sucesso
    paymentError: 'Erro no pagamento',
    processingError: 'Erro ao finalizar compra. Entre em contato conosco.',
    invalidCode: 'Código inválido',
    codeExpired: 'O código de verificação está incorreto ou expirado',
    
    // Status do produto 
    inactive: 'Inativo',
    contactSeller: 'Entre em contato com o vendedor para mais informações sobre a disponibilidade deste produto.',
    
    // Footer
    allRightsReserved: 'Todos os direitos reservados.',
    termsText: 'Ao clicar em Comprar agora, eu declaro que li e concordo (1) com a Kambafy está processando este pedido em nome de',
    noResponsibility: 'não possui responsabilidade pelo conteúdo e/ou faz controle prévio deste (li) com os',
    termsOfUse: 'Termos de uso',
    privacyPolicy: 'Política de privacidade',
    producer: 'produtor'
  },
  
  en: {
    // Product information
    productInfo: 'Product information',
    by: 'By',
    
    // Form
    personalInfo: 'Personal information',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    
    // Payment methods
    paymentMethods: 'Payment methods',
    selectPaymentMethod: 'Select payment method',
    
    // Order bump
    specialOffer: 'Special offer',
    addToOrder: 'Add to order',
    
    // Order summary
    orderSummary: 'Order summary',
    product: 'Product',
    orderBump: 'Extra product',
    total: 'Total',
    
    // Buttons
    completeOrder: 'Complete order',
    processing: 'Processing...',
    
    // Errors and validations
    fillAllFields: 'Fill in all required fields',
    invalidEmail: 'Invalid email',
    invalidPhone: 'Invalid phone',
    
    // Security
    secureCheckout: 'Secure checkout',
    sslProtected: 'SSL protected',
    
    // Product states
    productNotFound: 'Product not found',
    productInactive: 'This product is temporarily unavailable',
    productBanned: 'This product is no longer available',
    
    // KambaPay
    kambaPayNotRegistered: 'Email is not registered in KambaPay. Please use another payment method or create a KambaPay account.',
    kambaPayError: 'Error checking KambaPay account. Try another payment method.',
    
    // Abandoned cart
    cartAbandoned: 'Abandoned cart detected',
    continueCheckout: 'Continue your purchase',
    
    // Order bump additional texts
    limitedOffers: 'Limited offers',
    lifetimeAccess: 'Lifetime Access',
    accessExtension: 'of access time',
    day: 'day',
    days: 'days',
    month: 'month',
    months: 'months',
    year: 'year',
    years: 'years',
    
    // Error and success messages
    paymentError: 'Payment error',
    processingError: 'Error completing purchase. Please contact us.',
    invalidCode: 'Invalid code',
    codeExpired: 'The verification code is incorrect or expired',
    
    // Product status
    inactive: 'Inactive',
    contactSeller: 'Contact the seller for more information about this product availability.',
    
    // Footer
    allRightsReserved: 'All rights reserved.',
    termsText: 'By clicking Buy now, I declare that I have read and agree (1) that Kambafy is processing this order on behalf of',
    noResponsibility: 'has no responsibility for the content and/or prior control of this (read) with the',
    termsOfUse: 'Terms of use',
    privacyPolicy: 'Privacy policy',
    producer: 'producer'
  },
  
  es: {
    // Información del producto
    productInfo: 'Información del producto',
    by: 'Por',
    
    // Formulario
    personalInfo: 'Información personal',
    fullName: 'Nombre completo',
    email: 'Email',
    phone: 'Teléfono',
    country: 'País',
    
    // Métodos de pago
    paymentMethods: 'Métodos de pago',
    selectPaymentMethod: 'Selecciona método de pago',
    
    // Order bump
    specialOffer: 'Oferta especial',
    addToOrder: 'Añadir al pedido',
    
    // Resumen del pedido
    orderSummary: 'Resumen del pedido',
    product: 'Producto',
    orderBump: 'Producto extra',
    total: 'Total',
    
    // Botones
    completeOrder: 'Finalizar pedido',
    processing: 'Procesando...',
    
    // Errores y validaciones
    fillAllFields: 'Rellena todos los campos obligatorios',
    invalidEmail: 'Email inválido',
    invalidPhone: 'Teléfono inválido',
    
    // Seguridad
    secureCheckout: 'Checkout seguro',
    sslProtected: 'Protegido por SSL',
    
    // Estados del producto
    productNotFound: 'Producto no encontrado',
    productInactive: 'Este producto está temporalmente no disponible',
    productBanned: 'Este producto ya no está disponible',
    
    // KambaPay
    kambaPayNotRegistered: 'El email no está registrado en KambaPay. Usa otro método de pago o crea una cuenta KambaPay.',
    kambaPayError: 'Error al verificar cuenta KambaPay. Prueba otro método de pago.',
    
    // Carrito abandonado
    cartAbandoned: 'Carrito abandonado detectado',
    continueCheckout: 'Continúa tu compra',
    
    // Order bump textos adicionales
    limitedOffers: 'Ofertas limitadas',
    lifetimeAccess: 'Acceso de por Vida',
    accessExtension: 'de tiempo de acceso',
    day: 'día',
    days: 'días',
    month: 'mes',
    months: 'meses',
    year: 'año',
    years: 'años',
    
    // Mensajes de error y éxito
    paymentError: 'Error de pago',
    processingError: 'Error al finalizar compra. Contacta con nosotros.',
    invalidCode: 'Código inválido',
    codeExpired: 'El código de verificación es incorrecto o ha expirado',
    
    // Estado del producto
    inactive: 'Inactivo',
    contactSeller: 'Contacta con el vendedor para más información sobre la disponibilidad de este producto.',
    
    // Footer
    allRightsReserved: 'Todos los derechos reservados.',
    termsText: 'Al hacer clic en Comprar ahora, declaro que he leído y acepto (1) que Kambafy está procesando este pedido en nombre de',
    noResponsibility: 'no tiene responsabilidad por el contenido y/o control previo de este (leído) con los',
    termsOfUse: 'Términos de uso',
    privacyPolicy: 'Política de privacidad',
    producer: 'productor'
  },
  
  fr: {
    // Informations sur le produit
    productInfo: 'Informations sur le produit',
    by: 'Par',
    
    // Formulaire
    personalInfo: 'Informations personnelles',
    fullName: 'Nom complet',
    email: 'Email',
    phone: 'Téléphone',
    country: 'Pays',
    
    // Méthodes de paiement
    paymentMethods: 'Méthodes de paiement',
    selectPaymentMethod: 'Sélectionner une méthode de paiement',
    
    // Order bump
    specialOffer: 'Offre spéciale',
    addToOrder: 'Ajouter à la commande',
    
    // Résumé de commande
    orderSummary: 'Résumé de commande',
    product: 'Produit',
    orderBump: 'Produit extra',
    total: 'Total',
    
    // Boutons
    completeOrder: 'Finaliser la commande',
    processing: 'Traitement...',
    
    // Erreurs et validations
    fillAllFields: 'Remplissez tous les champs obligatoires',
    invalidEmail: 'Email invalide',
    invalidPhone: 'Téléphone invalide',
    
    // Sécurité
    secureCheckout: 'Checkout sécurisé',
    sslProtected: 'Protégé par SSL',
    
    // États du produit
    productNotFound: 'Produit non trouvé',
    productInactive: 'Ce produit est temporairement indisponible',
    productBanned: 'Ce produit n\'est plus disponible',
    
    // KambaPay
    kambaPayNotRegistered: 'L\'email n\'est pas enregistré dans KambaPay. Utilisez une autre méthode de paiement ou créez un compte KambaPay.',
    kambaPayError: 'Erreur lors de la vérification du compte KambaPay. Essayez une autre méthode de paiement.',
    
    // Panier abandonné
    cartAbandoned: 'Panier abandonné détecté',
    continueCheckout: 'Continuez votre achat',
    
    // Order bump textes supplémentaires
    limitedOffers: 'Offres limitées',
    lifetimeAccess: 'Accès à Vie',
    accessExtension: 'de temps d\'accès',
    day: 'jour',
    days: 'jours',
    month: 'mois',
    months: 'mois',
    year: 'an',
    years: 'ans',
    
    // Messages d'erreur et de succès
    paymentError: 'Erreur de paiement',
    processingError: 'Erreur lors de la finalisation de l\'achat. Contactez-nous.',
    invalidCode: 'Code invalide',
    codeExpired: 'Le code de vérification est incorrect ou expiré',
    
    // Statut du produit
    inactive: 'Inactif',
    contactSeller: 'Contactez le vendeur pour plus d\'informations sur la disponibilité de ce produit.',
    
    // Pied de page
    allRightsReserved: 'Tous droits réservés.',
    termsText: 'En cliquant sur Acheter maintenant, je déclare avoir lu et accepté (1) que Kambafy traite cette commande au nom de',
    noResponsibility: 'n\'a aucune responsabilité pour le contenu et/ou le contrôle préalable de celui-ci (lu) avec les',
    termsOfUse: 'Conditions d\'utilisation',
    privacyPolicy: 'Politique de confidentialité',
    producer: 'producteur'
  }
};

export const useCheckoutTranslations = () => {
  const { detectedLanguage } = useGeoLocation();
  const [currentTranslations, setCurrentTranslations] = useState(CHECKOUT_TRANSLATIONS.pt);

  useEffect(() => {
    console.log(`🌐 useCheckoutTranslations: Detected language changed to: ${detectedLanguage}`);
    
    // Aplicar traduções automaticamente baseado no idioma detectado
    const translations = CHECKOUT_TRANSLATIONS[detectedLanguage as keyof typeof CHECKOUT_TRANSLATIONS] || CHECKOUT_TRANSLATIONS.pt;
    setCurrentTranslations(translations);
    
    console.log(`🌐 Checkout translations applied for language: ${detectedLanguage}`);
    console.log(`🌐 Sample translation - "addToOrder": ${translations.addToOrder}`);
  }, [detectedLanguage]);

  // Função helper para obter uma tradução
  const t = (key: keyof typeof CHECKOUT_TRANSLATIONS.pt): string => {
    const translation = currentTranslations[key] || CHECKOUT_TRANSLATIONS.pt[key] || key;
    return translation;
  };

  return {
    t,
    currentLanguage: detectedLanguage,
    translations: currentTranslations
  };
};