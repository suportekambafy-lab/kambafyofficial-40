import { useMemo } from 'react';
import { CountryInfo } from '@/utils/priceFormatting';

type CheckoutLanguage = 'pt' | 'en';

// Traduções específicas do checkout
const CHECKOUT_TRANSLATIONS: Record<CheckoutLanguage, Record<string, string>> = {
  pt: {
    // Header
    'checkout.secure': '100% Seguro',
    'checkout.sales': 'vendas',
    'checkout.per': 'por',
    
    // Form labels
    'checkout.billing': 'Informações de Cobrança',
    'checkout.fullName': 'Nome Completo',
    'checkout.fullName.placeholder': 'Digite seu nome completo',
    'checkout.email': 'Email',
    'checkout.email.placeholder': 'Digite seu email',
    'checkout.country': 'País',
    'checkout.phone': 'Telefone',
    'checkout.phone.optional': '(opcional)',
    'checkout.phone.required': 'Telefone é obrigatório',
    
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
    'checkout.coupon': 'Cupom de Desconto',
    'checkout.subtotal': 'Subtotal',
    'checkout.discount': 'Desconto',
    'checkout.total': 'Total',
    
    // Buttons
    'checkout.buyNow': 'Comprar Agora',
    'checkout.processing': 'Processando...',
    'checkout.completePurchase': 'Finalizar Compra',
    'checkout.subscribe': 'Assinar Agora',
    'checkout.subscribing': 'Processando Assinatura...',
    'checkout.tryAgain': 'Tentar novamente',
    
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
  },
  en: {
    // Header
    'checkout.secure': '100% Secure',
    'checkout.sales': 'sales',
    'checkout.per': 'per',
    
    // Form labels
    'checkout.billing': 'Billing Information',
    'checkout.fullName': 'Full Name',
    'checkout.fullName.placeholder': 'Enter your full name',
    'checkout.email': 'Email',
    'checkout.email.placeholder': 'Enter your email',
    'checkout.country': 'Country',
    'checkout.phone': 'Phone',
    'checkout.phone.optional': '(optional)',
    'checkout.phone.required': 'Phone is required',
    
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
    'checkout.coupon': 'Discount Coupon',
    'checkout.subtotal': 'Subtotal',
    'checkout.discount': 'Discount',
    'checkout.total': 'Total',
    
    // Buttons
    'checkout.buyNow': 'Buy Now',
    'checkout.processing': 'Processing...',
    'checkout.completePurchase': 'Complete Purchase',
    'checkout.subscribe': 'Subscribe Now',
    'checkout.subscribing': 'Processing Subscription...',
    'checkout.tryAgain': 'Try again',
    
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
  }
};

// Países que usam inglês
const ENGLISH_COUNTRIES = ['US', 'GB'];

export const useCheckoutTranslation = (userCountry?: CountryInfo | null) => {
  const language = useMemo<CheckoutLanguage>(() => {
    if (userCountry?.code && ENGLISH_COUNTRIES.includes(userCountry.code)) {
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
    getSubscriptionInterval
  };
};
