import { useMemo } from 'react';
import { CountryInfo } from '@/utils/priceFormatting';

type CheckoutLanguage = 'pt' | 'en' | 'es';

// Países por idioma
const ENGLISH_COUNTRIES = ['US', 'GB'];
const SPANISH_COUNTRIES = ['MX', 'CL', 'AR'];

// Traduções específicas do checkout
const CHECKOUT_TRANSLATIONS: Record<CheckoutLanguage, Record<string, string>> = {
  pt: {
    // Header
    'checkout.secure': '100% Seguro',
    'checkout.sales': 'vendas',
    'checkout.per': 'por',
    'checkout.instantDelivery': 'Entrega instantânea',
    
    // Form labels
    'checkout.billing': 'Informações de Cobrança',
    'checkout.fullName': 'Nome completo',
    'checkout.fullName.placeholder': 'Digite seu nome completo',
    'checkout.email': 'E-mail',
    'checkout.email.placeholder': 'Digite seu e-mail para receber a compra',
    'checkout.country': 'País',
    'checkout.phone': 'Telefone ou Whatsapp',
    'checkout.phone.placeholder': 'Digite seu telefone',
    'checkout.phone.optional': '(opcional)',
    'checkout.phone.required': '* obrigatório',
    
    // Validation messages
    'checkout.validation.nameValid': '✓ Nome válido',
    'checkout.validation.nameInvalid': 'Nome deve ter pelo menos 3 caracteres',
    'checkout.validation.emailValid': '✓ Email válido',
    'checkout.validation.emailInvalid': 'Por favor, insira um email válido',
    'checkout.validation.phoneValid': '✓ Telefone válido',
    'checkout.validation.phoneRequired': 'Telefone obrigatório para este método de pagamento',
    
    // Payment
    'checkout.payment': 'Pagamento',
    'checkout.paymentMethod': 'Método de Pagamento',
    'checkout.payWith': 'Pagar com:',
    'checkout.selectPayment': 'Selecione a forma de pagamento desejada',
    'checkout.noPaymentMethods': 'Métodos de pagamento não disponíveis para',
    'checkout.comingSoon': 'Em breve teremos opções de pagamento para sua região.',
    'checkout.coupon': 'Cupom de Desconto',
    'checkout.subtotal': 'Subtotal',
    'checkout.discount': 'Desconto',
    'checkout.discountApplied': 'Desconto aplicado:',
    'checkout.total': 'Total',
    'checkout.orderSummary': 'Resumo do pedido',
    'checkout.product': 'Produto',
    
    // Buttons
    'checkout.buyNow': 'COMPRAR AGORA',
    'checkout.processing': 'PROCESSANDO...',
    'checkout.completePurchase': 'Finalizar Compra',
    'checkout.subscribe': 'Assinar Agora',
    'checkout.subscribing': 'Processando Assinatura...',
    'checkout.tryAgain': 'Tentar novamente',
    'checkout.generateReference': 'GERAR REFERÊNCIA',
    
    // Status
    'checkout.offerExpired': 'Oferta Expirada',
    'checkout.offerExpiredDesc': 'Infelizmente, esta oferta não está mais disponível.',
    'checkout.productNotFound': 'Produto não encontrado',
    'checkout.loading': 'Carregando...',
    
    // Trust badges
    'checkout.securePayment': 'Pagamento Seguro',
    'checkout.moneyBack': 'Garantia de Reembolso',
    'checkout.instantAccess': 'Acesso Imediato',
    'checkout.support': 'Suporte 24/7',
    'checkout.trustBadges.title': 'COMPRA 100% SEGURA',
    'checkout.trustBadges.ssl': 'SSL Criptografado',
    'checkout.trustBadges.guarantee': 'Garantia 7 Dias',
    'checkout.trustBadges.support': 'Suporte 24/7',
    'checkout.trustBadges.buyers': 'Compradores',
    'checkout.trustBadges.verified': 'Produto Verificado',
    'checkout.trustBadges.footer': 'Seus dados estão protegidos e sua compra é 100% segura',
    
    // Subscription
    'checkout.subscription.recurring': 'Pagamento recorrente via Stripe. Pode cancelar a qualquer momento.',
    'checkout.subscription.interval.day': 'dia',
    'checkout.subscription.interval.days': 'dias',
    'checkout.subscription.interval.week': 'semana',
    'checkout.subscription.interval.weeks': 'semanas',
    'checkout.subscription.interval.month': 'mês',
    'checkout.subscription.interval.months': 'meses',
    'checkout.subscription.interval.year': 'ano',
    'checkout.subscription.interval.years': 'anos',
    
    // Order bumps
    'checkout.specialOffer': 'Oferta Especial',
    'checkout.addToOrder': 'Adicionar ao Pedido',
    
    // Multicaixa Express
    'checkout.express.attention': 'ATENÇÃO: Após clicar no botão',
    'checkout.express.instruction': 'abra o aplicativo Multicaixa Express, e encontre o botão →',
    'checkout.express.pendingOp': 'Operação por Autorizar',
    'checkout.express.finalize': 'clica no botão, selecione o pagamento pendente e finalize o pagamento.',
    'checkout.express.phoneLabel': 'Por favor, insira o número de telefone ativo do Multicaixa Express.',
    
    // Reference payment
    'checkout.reference.success': 'Referência gerada com sucesso!',
    'checkout.reference.instructions': 'Use os dados abaixo para efetuar o pagamento em qualquer banco ou ATM',
    'checkout.reference.entity': 'Entidade:',
    'checkout.reference.number': 'Referência:',
    'checkout.reference.amount': 'Valor:',
    'checkout.reference.expires': 'Válido até:',
    
    // Errors
    'checkout.error.requiredFields': 'Dados obrigatórios',
    'checkout.error.fillAllFields': 'Por favor, preencha todos os campos obrigatórios.',
    'checkout.error.unavailable': 'Sistema indisponível',
    'checkout.error.contactSupport': 'Contacte o suporte.',
    'checkout.error.paymentError': 'Erro no pagamento',
    'checkout.error.invalidResponse': 'Resposta inválida do sistema de pagamento.',
    'checkout.error.configError': 'Erro de configuração',
    
    // Stripe
    'checkout.stripe.securePayment': 'Pagamento Seguro',
    'checkout.stripe.processedBy': 'Processado de forma segura pelo Stripe',
    'checkout.stripe.pay': 'Pagar',
    'checkout.stripe.currency': 'Moeda',
    'checkout.stripe.poweredBy': 'Powered by',
    
    // Live viewers
    'checkout.liveViewers': 'pessoas estão vendo este produto agora',
    
    // Country selector
    'checkout.selectCountry': 'Selecionar país',
    
    // Coupon
    'coupon.placeholder': 'CÓDIGO DO CUPOM',
    'coupon.apply': 'Aplicar',
    'coupon.enterCode': 'Digite um código de cupom',
    'coupon.applied': 'Cupom aplicado com sucesso!',
    'coupon.removed': 'Cupom removido',
    'coupon.error': 'Erro ao validar cupom',
    'coupon.maxUsesReached': 'Este cupom atingiu o limite de usos',
    'coupon.alreadyUsed': 'Você já usou este cupom',
    'coupon.minPurchase': 'Compra mínima de',
    'coupon.haveCoupon': 'Tem cupom? Clique aqui',
    
    // Footer
    'checkout.allRightsReserved': 'Todos os direitos reservados.',
    'checkout.termsNotice': 'Ao clicar em Comprar agora, eu declaro que li e concordo (1) com a Kambafy está processando este pedido em nome de',
    'checkout.termsNotice2': 'não possui responsabilidade pelo conteúdo e/ou faz controle prévio deste (li) com os',
    'checkout.termsOfUse': 'Termos de uso',
    'checkout.privacyPolicy': 'Política de privacidade',
    'checkout.and': 'e',
    'checkout.refundPolicy': 'Política de reembolso',
  },
  en: {
    // Header
    'checkout.secure': '100% Secure',
    'checkout.sales': 'sales',
    'checkout.per': 'per',
    'checkout.instantDelivery': 'Instant delivery',
    
    // Form labels
    'checkout.billing': 'Billing Information',
    'checkout.fullName': 'Full name',
    'checkout.fullName.placeholder': 'Enter your full name',
    'checkout.email': 'Email',
    'checkout.email.placeholder': 'Enter your email to receive the purchase',
    'checkout.country': 'Country',
    'checkout.phone': 'Phone or WhatsApp',
    'checkout.phone.placeholder': 'Enter your phone number',
    'checkout.phone.optional': '(optional)',
    'checkout.phone.required': '* required',
    
    // Validation messages
    'checkout.validation.nameValid': '✓ Valid name',
    'checkout.validation.nameInvalid': 'Name must have at least 3 characters',
    'checkout.validation.emailValid': '✓ Valid email',
    'checkout.validation.emailInvalid': 'Please enter a valid email',
    'checkout.validation.phoneValid': '✓ Valid phone',
    'checkout.validation.phoneRequired': 'Phone is required for this payment method',
    
    // Payment
    'checkout.payment': 'Payment',
    'checkout.paymentMethod': 'Payment Method',
    'checkout.payWith': 'Pay with:',
    'checkout.selectPayment': 'Select your preferred payment method',
    'checkout.noPaymentMethods': 'Payment methods not available for',
    'checkout.comingSoon': 'Payment options for your region coming soon.',
    'checkout.coupon': 'Discount Coupon',
    'checkout.subtotal': 'Subtotal',
    'checkout.discount': 'Discount',
    'checkout.discountApplied': 'Discount applied:',
    'checkout.total': 'Total',
    'checkout.orderSummary': 'Order Summary',
    'checkout.product': 'Product',
    
    // Buttons
    'checkout.buyNow': 'BUY NOW',
    'checkout.processing': 'PROCESSING...',
    'checkout.completePurchase': 'Complete Purchase',
    'checkout.subscribe': 'Subscribe Now',
    'checkout.subscribing': 'Processing Subscription...',
    'checkout.tryAgain': 'Try again',
    'checkout.generateReference': 'GENERATE REFERENCE',
    
    // Status
    'checkout.offerExpired': 'Offer Expired',
    'checkout.offerExpiredDesc': 'Unfortunately, this offer is no longer available.',
    'checkout.productNotFound': 'Product not found',
    'checkout.loading': 'Loading...',
    
    // Trust badges
    'checkout.securePayment': 'Secure Payment',
    'checkout.moneyBack': 'Money Back Guarantee',
    'checkout.instantAccess': 'Instant Access',
    'checkout.support': '24/7 Support',
    'checkout.trustBadges.title': '100% SECURE PURCHASE',
    'checkout.trustBadges.ssl': 'SSL Encrypted',
    'checkout.trustBadges.guarantee': '7 Day Guarantee',
    'checkout.trustBadges.support': '24/7 Support',
    'checkout.trustBadges.buyers': 'Buyers',
    'checkout.trustBadges.verified': 'Verified Product',
    'checkout.trustBadges.footer': 'Your data is protected and your purchase is 100% secure',
    
    // Subscription
    'checkout.subscription.recurring': 'Recurring payment via Stripe. Cancel anytime.',
    'checkout.subscription.interval.day': 'day',
    'checkout.subscription.interval.days': 'days',
    'checkout.subscription.interval.week': 'week',
    'checkout.subscription.interval.weeks': 'weeks',
    'checkout.subscription.interval.month': 'month',
    'checkout.subscription.interval.months': 'months',
    'checkout.subscription.interval.year': 'year',
    'checkout.subscription.interval.years': 'years',
    
    // Order bumps
    'checkout.specialOffer': 'Special Offer',
    'checkout.addToOrder': 'Add to Order',
    
    // Multicaixa Express (keep in Portuguese as it's Angola-specific)
    'checkout.express.attention': 'ATTENTION: After clicking the button',
    'checkout.express.instruction': 'open the Multicaixa Express app, and find the button →',
    'checkout.express.pendingOp': 'Pending Authorization',
    'checkout.express.finalize': 'click the button, select the pending payment and complete the payment.',
    'checkout.express.phoneLabel': 'Please enter your active Multicaixa Express phone number.',
    
    // Reference payment
    'checkout.reference.success': 'Reference generated successfully!',
    'checkout.reference.instructions': 'Use the information below to make payment at any bank or ATM',
    'checkout.reference.entity': 'Entity:',
    'checkout.reference.number': 'Reference:',
    'checkout.reference.amount': 'Amount:',
    'checkout.reference.expires': 'Valid until:',
    
    // Errors
    'checkout.error.requiredFields': 'Required fields',
    'checkout.error.fillAllFields': 'Please fill in all required fields.',
    'checkout.error.unavailable': 'System unavailable',
    'checkout.error.contactSupport': 'Contact support.',
    'checkout.error.paymentError': 'Payment error',
    'checkout.error.invalidResponse': 'Invalid response from payment system.',
    'checkout.error.configError': 'Configuration error',
    
    // Stripe
    'checkout.stripe.securePayment': 'Secure Payment',
    'checkout.stripe.processedBy': 'Securely processed by Stripe',
    'checkout.stripe.pay': 'Pay',
    'checkout.stripe.currency': 'Currency',
    'checkout.stripe.poweredBy': 'Powered by',
    
    // Live viewers
    'checkout.liveViewers': 'people are viewing this product now',
    
    // Country selector
    'checkout.selectCountry': 'Select country',
    
    // Coupon
    'coupon.placeholder': 'COUPON CODE',
    'coupon.apply': 'Apply',
    'coupon.enterCode': 'Enter a coupon code',
    'coupon.applied': 'Coupon applied successfully!',
    'coupon.removed': 'Coupon removed',
    'coupon.error': 'Error validating coupon',
    'coupon.maxUsesReached': 'This coupon has reached its usage limit',
    'coupon.alreadyUsed': 'You have already used this coupon',
    'coupon.minPurchase': 'Minimum purchase of',
    'coupon.haveCoupon': 'Have a coupon? Click here',
    
    // Footer
    'checkout.allRightsReserved': 'All rights reserved.',
    'checkout.termsNotice': 'By clicking Buy now, I declare that I have read and agree (1) that Kambafy is processing this order on behalf of',
    'checkout.termsNotice2': 'is not responsible for the content and/or does not pre-control it (li) with the',
    'checkout.termsOfUse': 'Terms of use',
    'checkout.privacyPolicy': 'Privacy policy',
    'checkout.and': 'and',
    'checkout.refundPolicy': 'Refund policy',
  },
  es: {
    // Header
    'checkout.secure': '100% Seguro',
    'checkout.sales': 'ventas',
    'checkout.per': 'por',
    'checkout.instantDelivery': 'Entrega instantánea',
    
    // Form labels
    'checkout.billing': 'Información de Facturación',
    'checkout.fullName': 'Nombre completo',
    'checkout.fullName.placeholder': 'Ingresa tu nombre completo',
    'checkout.email': 'Correo electrónico',
    'checkout.email.placeholder': 'Ingresa tu correo para recibir la compra',
    'checkout.country': 'País',
    'checkout.phone': 'Teléfono o WhatsApp',
    'checkout.phone.placeholder': 'Ingresa tu teléfono',
    'checkout.phone.optional': '(opcional)',
    'checkout.phone.required': '* requerido',
    
    // Validation messages
    'checkout.validation.nameValid': '✓ Nombre válido',
    'checkout.validation.nameInvalid': 'El nombre debe tener al menos 3 caracteres',
    'checkout.validation.emailValid': '✓ Correo válido',
    'checkout.validation.emailInvalid': 'Por favor, ingresa un correo válido',
    'checkout.validation.phoneValid': '✓ Teléfono válido',
    'checkout.validation.phoneRequired': 'Teléfono requerido para este método de pago',
    
    // Payment
    'checkout.payment': 'Pago',
    'checkout.paymentMethod': 'Método de Pago',
    'checkout.payWith': 'Pagar con:',
    'checkout.selectPayment': 'Selecciona tu método de pago preferido',
    'checkout.noPaymentMethods': 'Métodos de pago no disponibles para',
    'checkout.comingSoon': 'Próximamente opciones de pago para tu región.',
    'checkout.coupon': 'Cupón de Descuento',
    'checkout.subtotal': 'Subtotal',
    'checkout.discount': 'Descuento',
    'checkout.discountApplied': 'Descuento aplicado:',
    'checkout.total': 'Total',
    'checkout.orderSummary': 'Resumen del pedido',
    'checkout.product': 'Producto',
    
    // Buttons
    'checkout.buyNow': 'COMPRAR AHORA',
    'checkout.processing': 'PROCESANDO...',
    'checkout.completePurchase': 'Finalizar Compra',
    'checkout.subscribe': 'Suscribirse Ahora',
    'checkout.subscribing': 'Procesando Suscripción...',
    'checkout.tryAgain': 'Intentar de nuevo',
    'checkout.generateReference': 'GENERAR REFERENCIA',
    
    // Status
    'checkout.offerExpired': 'Oferta Expirada',
    'checkout.offerExpiredDesc': 'Lamentablemente, esta oferta ya no está disponible.',
    'checkout.productNotFound': 'Producto no encontrado',
    'checkout.loading': 'Cargando...',
    
    // Trust badges
    'checkout.securePayment': 'Pago Seguro',
    'checkout.moneyBack': 'Garantía de Devolución',
    'checkout.instantAccess': 'Acceso Inmediato',
    'checkout.support': 'Soporte 24/7',
    'checkout.trustBadges.title': 'COMPRA 100% SEGURA',
    'checkout.trustBadges.ssl': 'SSL Encriptado',
    'checkout.trustBadges.guarantee': 'Garantía 7 Días',
    'checkout.trustBadges.support': 'Soporte 24/7',
    'checkout.trustBadges.buyers': 'Compradores',
    'checkout.trustBadges.verified': 'Producto Verificado',
    'checkout.trustBadges.footer': 'Tus datos están protegidos y tu compra es 100% segura',
    
    // Subscription
    'checkout.subscription.recurring': 'Pago recurrente vía Stripe. Puedes cancelar en cualquier momento.',
    'checkout.subscription.interval.day': 'día',
    'checkout.subscription.interval.days': 'días',
    'checkout.subscription.interval.week': 'semana',
    'checkout.subscription.interval.weeks': 'semanas',
    'checkout.subscription.interval.month': 'mes',
    'checkout.subscription.interval.months': 'meses',
    'checkout.subscription.interval.year': 'año',
    'checkout.subscription.interval.years': 'años',
    
    // Order bumps
    'checkout.specialOffer': 'Oferta Especial',
    'checkout.addToOrder': 'Agregar al Pedido',
    
    // Multicaixa Express (not applicable for MX/CL)
    'checkout.express.attention': 'ATENCIÓN: Después de hacer clic en el botón',
    'checkout.express.instruction': 'abre la app Multicaixa Express y busca el botón →',
    'checkout.express.pendingOp': 'Operación Pendiente',
    'checkout.express.finalize': 'haz clic en el botón, selecciona el pago pendiente y finaliza el pago.',
    'checkout.express.phoneLabel': 'Por favor, ingresa el número de teléfono activo de Multicaixa Express.',
    
    // Reference payment
    'checkout.reference.success': '¡Referencia generada con éxito!',
    'checkout.reference.instructions': 'Usa los datos a continuación para realizar el pago en cualquier banco o ATM',
    'checkout.reference.entity': 'Entidad:',
    'checkout.reference.number': 'Referencia:',
    'checkout.reference.amount': 'Monto:',
    'checkout.reference.expires': 'Válido hasta:',
    
    // Errors
    'checkout.error.requiredFields': 'Campos requeridos',
    'checkout.error.fillAllFields': 'Por favor, completa todos los campos requeridos.',
    'checkout.error.unavailable': 'Sistema no disponible',
    'checkout.error.contactSupport': 'Contacta a soporte.',
    'checkout.error.paymentError': 'Error en el pago',
    'checkout.error.invalidResponse': 'Respuesta inválida del sistema de pago.',
    'checkout.error.configError': 'Error de configuración',
    
    // Stripe
    'checkout.stripe.securePayment': 'Pago Seguro',
    'checkout.stripe.processedBy': 'Procesado de forma segura por Stripe',
    'checkout.stripe.pay': 'Pagar',
    'checkout.stripe.currency': 'Moneda',
    'checkout.stripe.poweredBy': 'Powered by',
    
    // Live viewers
    'checkout.liveViewers': 'personas están viendo este producto ahora',
    
    // Country selector
    'checkout.selectCountry': 'Seleccionar país',
    
    // Coupon
    'coupon.placeholder': 'CÓDIGO DE CUPÓN',
    'coupon.apply': 'Aplicar',
    'coupon.enterCode': 'Ingresa un código de cupón',
    'coupon.applied': '¡Cupón aplicado con éxito!',
    'coupon.removed': 'Cupón eliminado',
    'coupon.error': 'Error al validar cupón',
    'coupon.maxUsesReached': 'Este cupón ha alcanzado su límite de usos',
    'coupon.alreadyUsed': 'Ya has usado este cupón',
    'coupon.minPurchase': 'Compra mínima de',
    'coupon.haveCoupon': '¿Tienes cupón? Haz clic aquí',
    
    // Footer
    'checkout.allRightsReserved': 'Todos los derechos reservados.',
    'checkout.termsNotice': 'Al hacer clic en Comprar ahora, declaro que he leído y acepto (1) que Kambafy está procesando este pedido en nombre de',
    'checkout.termsNotice2': 'no es responsable del contenido y/o no realiza control previo del mismo (li) con los',
    'checkout.termsOfUse': 'Términos de uso',
    'checkout.privacyPolicy': 'Política de privacidad',
    'checkout.and': 'y',
    'checkout.refundPolicy': 'Política de reembolso',
  }
};


export const useCheckoutTranslation = (userCountry?: CountryInfo | null) => {
  const language = useMemo<CheckoutLanguage>(() => {
    const countryCode = userCountry?.code;
    const isEnglishCountry = countryCode && ENGLISH_COUNTRIES.includes(countryCode);
    const isSpanishCountry = countryCode && SPANISH_COUNTRIES.includes(countryCode);
    
    console.log('🌐 CHECKOUT TRANSLATION DEBUG:', {
      countryCode,
      isEnglishCountry,
      isSpanishCountry,
      language: isSpanishCountry ? 'es' : (isEnglishCountry ? 'en' : 'pt'),
      userCountry
    });
    
    if (isSpanishCountry) {
      return 'es';
    }
    if (isEnglishCountry) {
      return 'en';
    }
    return 'pt';
  }, [userCountry?.code]);

  const tc = useMemo(() => {
    return (key: string): string => {
      return CHECKOUT_TRANSLATIONS[language]?.[key] || 
             CHECKOUT_TRANSLATIONS.pt[key] || 
             key;
    };
  }, [language]);

  // Helper para obter intervalo de assinatura traduzido
  const getSubscriptionInterval = useMemo(() => {
    return (interval: string, count: number = 1): string => {
      const key = count === 1 
        ? `checkout.subscription.interval.${interval}`
        : `checkout.subscription.interval.${interval}s`;
      
      const translated = tc(key);
      
      if (count === 1) {
        return translated;
      }
      return `${count} ${translated}`;
    };
  }, [tc]);

  return {
    tc,
    language,
    isEnglish: language === 'en',
    isSpanish: language === 'es',
    getSubscriptionInterval
  };
};