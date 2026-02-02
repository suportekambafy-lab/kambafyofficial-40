import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Check, AlertTriangle, CheckCircle, Wallet, Receipt, Copy } from "lucide-react";
import { COUNTRY_TO_CURRENCY } from "@/utils/accountCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import professionalManImage from "@/assets/professional-man.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { FacebookPixelTracker } from "@/components/FacebookPixelTracker";
import { useCustomToast } from "@/hooks/useCustomToast";
import { PhoneInput } from "@/components/PhoneInput";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getPaymentMethodsByCountry } from "@/utils/paymentMethods";
import { getPaymentMethodImage } from "@/utils/paymentMethodImages";
import { SEO } from "@/components/SEO";
import { setProductSEO } from "@/utils/seoUtils";
import { useAffiliateTracking, getAffiliateCodeFromAllSources } from "@/hooks/useAffiliateTracking";
import { logger } from "@/utils/productionLogger";
import { getSubscriptionIntervalText } from "@/utils/priceFormatting";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import { useAbandonedCartDetection } from "@/hooks/useAbandonedCartDetection";
import { useCheckoutTranslation } from "@/hooks/useCheckoutTranslation";

import { BankTransferForm } from "@/components/checkout/BankTransferForm";
import { MozambiquePaymentForm } from "@/components/checkout/MozambiquePaymentForm";
import { useOptimizedCheckout } from "@/hooks/useOptimizedCheckout";
import { TermsModal } from "@/components/checkout/TermsModal";
import { PrivacyModal } from "@/components/checkout/PrivacyModal";
import { RefundPolicyModal } from "@/components/checkout/RefundPolicyModal";
import { countTotalSales } from "@/utils/orderUtils";
import { CollapsibleCouponSection } from "@/components/checkout/CollapsibleCouponSection";
import { LiveChatWidget } from "@/components/apps/live-chat/LiveChatWidget";
import { ValidationFeedback, validateEmail, validateName } from "@/components/checkout/EnhancedFormValidation";

// Importar componentes otimizados
import { OptimizedCustomBanner, OptimizedCountdownTimer, OptimizedFakeReviews, OptimizedSocialProof, OptimizedSpotsCounter, OptimizedOrderBump, OptimizedStripeCardPayment } from '@/components/checkout/OptimizedCheckoutComponents';

const Checkout = () => {
  console.log('🛒 Checkout component initialized');
  const {
    productId
  } = useParams();
  
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useCustomToast();
  const {
    setTheme
  } = useTheme();
  const {
    userCountry,
    loading: geoLoading,
    formatPrice: formatPriceOriginal,
    convertPrice: convertPriceOriginal,
    changeCountry,
    supportedCountries,
    isReady: geoReady
  } = useGeoLocation();
  
  // Hook de tradução baseado no país (US/UK = inglês)
  const { tc, isEnglish } = useCheckoutTranslation(userCountry);
  
  // Track visitor presence in real-time for Live View (using unified geo detection)
  useCheckoutPresence(productId, userCountry?.name || 'Desconhecido');
  
  console.log('🌍 Geo state:', {
    geoLoading,
    geoReady,
    userCountry: userCountry?.code
  });

  // 🌍 Aplicar país detectado via IP automaticamente
  useEffect(() => {
    if (geoReady && userCountry && !geoLoading) {
      console.log('🌍 Auto-applying detected country from IP:', userCountry.code);
      setFormData(prev => {
        // Só aplicar se phoneCountry estiver vazio ou for o primeiro load
        if (!prev.phoneCountry) {
          return {
            ...prev,
            phoneCountry: userCountry.code
          };
        }
        return prev;
      });
    }
  }, [geoReady, userCountry, geoLoading]);
  const {
    affiliateCode,
    hasAffiliate,
    markAsValidAffiliate,
    markAsInvalidAffiliate,
    clearAffiliateCode
  } = useAffiliateTracking();
  
  // Estado para afiliado validado (usado especialmente para Moçambique)
  const [validatedAffiliate, setValidatedAffiliate] = useState<{
    code: string;
    commission_rate: number;
    commission_amount: number;
  } | null>(null);
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [productNotFound, setProductNotFound] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Wrappers que passam a moeda base do produto (derivada do país do vendedor)
  const getSellerBaseCurrency = useCallback(() => {
    // Usa o país do vendedor para determinar a moeda base do produto
    const sellerCountry = product?.profiles?.country;
    if (sellerCountry && COUNTRY_TO_CURRENCY[sellerCountry]) {
      return COUNTRY_TO_CURRENCY[sellerCountry];
    }
    return 'KZ'; // Fallback para KZ se não conseguir determinar
  }, [product?.profiles?.country]);

  const formatPrice = useCallback((priceValue: number, targetCountry?: any, customPrices?: Record<string, string>) => {
    const sourceCurrency = getSellerBaseCurrency();
    console.log('💱 formatPrice usando sourceCurrency:', sourceCurrency, 'do vendedor país:', product?.profiles?.country);
    return formatPriceOriginal(priceValue, targetCountry || userCountry, customPrices, sourceCurrency);
  }, [formatPriceOriginal, userCountry, getSellerBaseCurrency, product?.profiles?.country]);

  const convertPrice = useCallback((priceValue: number, targetCountry?: any, customPrices?: Record<string, string>) => {
    const sourceCurrency = getSellerBaseCurrency();
    return convertPriceOriginal(priceValue, targetCountry || userCountry, customPrices, sourceCurrency);
  }, [convertPriceOriginal, userCountry, getSellerBaseCurrency]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    phoneCountry: "" // Será definido dinamicamente pelo país detectado
  });
  const [expressPhone, setExpressPhone] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  const [orderBump, setOrderBump] = useState<any>(null);
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<Map<string, {
    data: any;
    price: number;
  }>>(new Map());
  const [productTotalSales, setProductTotalSales] = useState<number>(0);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [cohortLoading, setCohortLoading] = useState(false);
  
  // State para oferta específica
  const [offerId, setOfferId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  
  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const handleCouponApplied = useCallback((coupon: any, discountAmount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discountAmount);
    console.log('💰 Coupon applied:', { coupon, discountAmount });
  }, []);

  const totalOrderBumpPrice = useMemo(() => {
    const allPrices = Array.from(selectedOrderBumps.values());
    const total = allPrices.reduce((sum, {
      price
    }) => sum + price, 0);
    console.log(`🔥 TOTAL ORDER BUMP PRICE CALCULATION:`, {
      selectedBumpsCount: selectedOrderBumps.size,
      allPrices: allPrices.map(({
        data,
        price
      }) => ({
        id: data.id,
        name: data.bump_product_name,
        price
      })),
      total
    });
    return total;
  }, [selectedOrderBumps]);
  const [resetOrderBumps, setResetOrderBumps] = useState(false);
  const [bankTransferData, setBankTransferData] = useState<{
    file: File;
    bank: string;
  } | null>(null);
  const [expressCountdownTime, setExpressCountdownTime] = useState(60);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar se é um upsell de outro pedido
  const [upsellFromOrder, setUpsellFromOrder] = useState<string | null>(null);
  const [referenceData, setReferenceData] = useState<{
    referenceNumber: string;
    entity: string;
    dueDate: string;
    amount: number;
    currency: string;
    productName: string;
    orderId: string;
  } | null>(null);
  const [copiedEntity, setCopiedEntity] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);
  // State para UTM params
  const [utmParams, setUtmParams] = useState<{
    src?: string;
    sck?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const upsellFrom = urlParams.get('upsell_from');
    const cohortParam = urlParams.get('cohort');
    const offerParam = urlParams.get('offer');
    
    if (upsellFrom) {
      setUpsellFromOrder(upsellFrom);
      console.log('🎯 Detectado upsell do pedido:', upsellFrom);
    }
    
    if (cohortParam) {
      setCohortId(cohortParam);
      console.log('🎓 Detectado cohort_id:', cohortParam);
    }
    
    if (offerParam) {
      setOfferId(offerParam);
      console.log('🏷️ Detectado offer_id:', offerParam);
    }

    // Capturar UTM params
    const capturedUtmParams = {
      src: urlParams.get('src') || undefined,
      sck: urlParams.get('sck') || undefined,
      utm_source: urlParams.get('utm_source') || undefined,
      utm_medium: urlParams.get('utm_medium') || undefined,
      utm_campaign: urlParams.get('utm_campaign') || undefined,
      utm_content: urlParams.get('utm_content') || undefined,
      utm_term: urlParams.get('utm_term') || undefined,
    };

    // Só salvar se tiver pelo menos um parâmetro
    const hasAnyParam = Object.values(capturedUtmParams).some(v => v !== undefined);
    if (hasAnyParam) {
      setUtmParams(capturedUtmParams);
      console.log('📊 UTM params capturados:', capturedUtmParams);
    }
  }, []);

  // Controlar countdown do Express Payment
  useEffect(() => {
    if (selectedPayment === 'express' && processing) {
      // Iniciar countdown
      // Multicaixa Express expira em 15 minutos no backend (create-appypay-charge)
      // então o countdown do checkout deve refletir isso para evitar “timeout” prematuro.
      setExpressCountdownTime(15 * 60);
      const interval = setInterval(() => {
        setExpressCountdownTime(prevTime => {
          if (prevTime <= 1) {
            // Tempo esgotado
            clearInterval(interval);
            handleExpressPaymentTimeout();
            return 0;
          }

          // Atualizar elemento do DOM se existir
          const timerElement = document.getElementById('countdown-timer');
          if (timerElement) {
            timerElement.textContent = (prevTime - 1).toString();
          }
          return prevTime - 1;
        });
      }, 1000);
      countdownIntervalRef.current = interval;
    } else {
      // Limpar countdown quando não é express ou não está processando
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setExpressCountdownTime(15 * 60);

      // Resetar elemento do DOM
      const timerElement = document.getElementById('countdown-timer');
      if (timerElement) {
        timerElement.textContent = String(15 * 60);
      }
    }

    // Cleanup ao desmontar componente
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [selectedPayment, processing]);

  // Definir todas as variáveis primeiro
  const originalPriceKZ = useMemo(() => product ? parseFloat(product.price) : 0, [product]);

  // Função para converter preço - usando a conversão direta sem arredondamentos extras
  const getConvertedPrice = useCallback((priceInKZ: number): number => {
    // Verificar se convertPrice está disponível antes de usar
    if (!convertPrice || !userCountry) {
      console.log(`Converting ${priceInKZ} KZ - geo not ready, returning original`);
      return priceInKZ;
    }
    try {
      const converted = convertPrice(priceInKZ, userCountry);
      console.log(`Converting ${priceInKZ} KZ to ${converted} ${userCountry.currency}`);
      return converted;
    } catch (error) {
      console.error('Error converting price:', error);
      return priceInKZ;
    }
  }, [convertPrice, userCountry]);

  // Calcular o valor total usando preços finais (considerando ofertas, turmas e personalizados)
  const getProductFinalPrice = useCallback(() => {
    if (!product) return 0;
    
    // 🏷️ PRIORIDADE 1: Se houver oferta selecionada via ?offer=, usar esse preço
    if (selectedOffer && selectedOffer.price > 0) {
      console.log('🏷️ Usando preço da oferta:', selectedOffer.price, selectedOffer.currency);
      
      // Se a moeda da oferta for diferente da moeda do país, pode precisar converter
      if (userCountry && selectedOffer.currency !== userCountry.currency) {
        // Mapeamento de moeda para código KZ-like
        const currencyToKZ: Record<string, boolean> = { 'AOA': true, 'KZ': true };
        if (currencyToKZ[selectedOffer.currency]) {
          const converted = getConvertedPrice(selectedOffer.price);
          console.log('🔄 Convertendo oferta de', selectedOffer.currency, 'para', userCountry.currency, ':', converted);
          return converted;
        }
        // Oferta em outra moeda, usar direto
        console.log('✅ Usando preço da oferta direto:', selectedOffer.price);
        return selectedOffer.price;
      }
      
      return selectedOffer.price;
    }
    
    // Se houver turma com preço personalizado, usar esse preço
    if (cohort && cohort.price && cohort.price.trim() !== '' && cohort.product_id === product.id) {
      // Remover caracteres não numéricos (exceto ponto e vírgula)
      const cleanPrice = cohort.price.replace(/[^\d.,]/g, '').replace(',', '.');
      const cohortPrice = parseFloat(cleanPrice);
      
      if (!isNaN(cohortPrice) && cohortPrice > 0) {
        console.log('💰 Usando preço personalizado da turma:', cohortPrice, cohort.currency);
        console.log('🔍 Debug turma:', { 
          cohortName: cohort.name, 
          cohortPrice: cohort.price, 
          currency: cohort.currency,
          cleanPrice,
          parsed: cohortPrice
        });
        
        // Se a moeda da turma for diferente da moeda do país, usar o preço direto da turma
        if (userCountry && cohort.currency !== userCountry.currency) {
          console.log('⚠️ Moeda da turma diferente do país. Turma:', cohort.currency, 'País:', userCountry.currency);
          // Se turma está em KZ e país não, converter
          if (cohort.currency === 'KZ') {
            const converted = getConvertedPrice(cohortPrice);
            console.log('🔄 Convertendo de KZ para', userCountry.currency, ':', converted);
            return converted;
          }
          // Se turma está em outra moeda, usar direto
          console.log('✅ Usando preço da turma sem conversão:', cohortPrice);
          return cohortPrice;
        }
        
        // Mesma moeda, usar direto
        console.log('✅ Mesma moeda, usando preço da turma:', cohortPrice);
        return cohortPrice;
      }
    }
    
    const productPriceKZ = originalPriceKZ;
    if (product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
      return parseFloat(product.custom_prices[userCountry.code]);
    }
    return getConvertedPrice(productPriceKZ);
  }, [product, originalPriceKZ, userCountry, getConvertedPrice, cohort, selectedOffer]);
  const totalAmountForDetection = useMemo(() => product ? getProductFinalPrice() + totalOrderBumpPrice : 0, [product, getProductFinalPrice, totalOrderBumpPrice]);

  // State para controlar se o pagamento foi completado
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Hook para detecção de carrinho abandonado
  const { markAsRecovered } = useAbandonedCartDetection(
    {
      productId: productId || '',
      customerEmail: formData.email.trim().toLowerCase(),
      customerName: formData.fullName.trim(),
      customerPhone: formData.phone || expressPhone || undefined,
      amount: totalAmountForDetection,
      currency: userCountry?.currency || 'KZ'
    },
    {
      enabled: !!productId && !!product,
      minDataRequired: formData.fullName.trim().length > 2 && formData.email.trim().length > 5 && formData.email.includes('@'),
      paymentCompleted
    }
  );

  // 🔗 Validar afiliado quando produto carregar (para Moçambique e outros)
  useEffect(() => {
    const validateAffiliate = async () => {
      if (!affiliateCode || !product?.id) {
        setValidatedAffiliate(null);
        return;
      }
      
      console.log('🔍 Validando afiliado:', affiliateCode, 'para produto:', product.id);
      
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('commission_rate, affiliate_user_id')
        .eq('affiliate_code', affiliateCode)
        .eq('product_id', product.id)
        .eq('status', 'ativo')
        .maybeSingle();
      
      if (affiliate && !error) {
        console.log('✅ Afiliado válido encontrado:', affiliate);
        const rate = parseFloat(affiliate.commission_rate.replace('%', '')) / 100;
        
        markAsValidAffiliate();
        setValidatedAffiliate({
          code: affiliateCode,
          commission_rate: rate,
          commission_amount: 0 // Será calculado pelo próximo useEffect
        });
      } else {
        console.log('❌ Afiliado inválido ou não encontrado:', affiliateCode, error);
        markAsInvalidAffiliate();
        setValidatedAffiliate(null);
      }
    };
    
    validateAffiliate();
  }, [affiliateCode, product?.id, markAsValidAffiliate, markAsInvalidAffiliate]);

  // 💰 Recalcular comissão do afiliado quando preço mudar
  useEffect(() => {
    if (validatedAffiliate && totalAmountForDetection > 0) {
      const newCommission = Math.round(totalAmountForDetection * validatedAffiliate.commission_rate * 100) / 100;
      console.log('💰 Recalculando comissão afiliado:', {
        totalPrice: totalAmountForDetection,
        rate: validatedAffiliate.commission_rate,
        commission: newCommission
      });
      
      setValidatedAffiliate(prev => prev ? {
        ...prev,
        commission_amount: newCommission
      } : null);
    }
  }, [totalAmountForDetection, validatedAffiliate?.commission_rate]);

  // Remover efeito que aguarda geo - não precisamos mais
  // Os preços se atualizam automaticamente quando geo estiver pronto

  // Atualizar código de telefone automaticamente baseado no país detectado
  useEffect(() => {
    if (userCountry && !geoLoading) {
      const expectedCode = getPhoneCodeByCountry(userCountry.code);
      setFormData(prev => {
        const prevPhone = (prev.phone || '').trim();
        const parts = prevPhone.split(' ');
        const currentCode = parts[0] || '';
        const rest = parts.slice(1).join(' ').trim();

        const shouldReplaceCode = !currentCode.startsWith('+') || currentCode !== expectedCode;
        const nextPhone = shouldReplaceCode
          ? `${expectedCode}${rest ? ` ${rest}` : ' '}`
          : prev.phone;

        return {
          ...prev,
          phoneCountry: userCountry.code,
          phone: nextPhone
        };
      });
    }
  }, [userCountry, geoLoading]);

  // Função para obter código de telefone baseado no país
  const getPhoneCodeByCountry = (countryCode: string): string => {
    const phoneCodes: Record<string, string> = {
      'AO': '+244',
      'PT': '+351',
      'MZ': '+258',
      'BR': '+55',
      'US': '+1',
      'GB': '+44',
      'ES': '+34',
      'FR': '+33',
      'DE': '+49',
      'IT': '+39',
      'ZA': '+27',
      'CV': '+238',
      'ST': '+239',
      'MX': '+52',
      'CL': '+56'
    };
    return phoneCodes[countryCode] || '+244';
  };
  // Helper para formatar número - só mostra decimais se necessário
  const formatAmount = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    const hasDecimals = rounded % 1 !== 0;
    
    if (hasDecimals) {
      return rounded.toFixed(2);
    } else {
      return Math.round(rounded).toString();
    }
  };

  // Helper para formatar com separadores de milhar (pt-BR style)
  const formatAmountLocale = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    const hasDecimals = rounded % 1 !== 0;
    
    if (hasDecimals) {
      return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return Math.round(rounded).toLocaleString('pt-BR');
    }
  };

  const getDisplayPrice = useCallback((priceInKZ: number, isAlreadyConverted = false): string => {
    // Se já é um valor convertido (total calculado), apenas formatar
    if (isAlreadyConverted) {
      if (userCountry?.currency === 'EUR') {
        const displayPrice = `€${formatAmount(priceInKZ)}`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO EUR: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'GBP') {
        const displayPrice = `£${formatAmount(priceInKZ)}`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO GBP: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'USD') {
        const displayPrice = `$${formatAmount(priceInKZ)}`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO USD: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'MXN') {
        const hasDecimals = priceInKZ % 1 !== 0;
        const displayPrice = hasDecimals
          ? `$${priceInKZ.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
          : `$${Math.round(priceInKZ).toLocaleString('es-MX')} MXN`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO MXN: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'CLP') {
        const displayPrice = `$${Math.round(priceInKZ).toLocaleString('es-CL')} CLP`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO CLP: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'ARS') {
        const hasDecimals = priceInKZ % 1 !== 0;
        const displayPrice = hasDecimals 
          ? `$${priceInKZ.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
          : `$${Math.round(priceInKZ).toLocaleString('es-AR')} ARS`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO ARS: ${displayPrice}`);
        return displayPrice;
      }
      if (userCountry?.currency === 'MZN') {
        const displayPrice = `${formatAmount(priceInKZ)} MT`;
        console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO MZN: ${displayPrice}`);
        return displayPrice;
      }
      // KZ ou outro
      const displayPrice = `${formatAmountLocale(priceInKZ)} KZ`;
      console.log(`🚨 getDisplayPrice - VALOR JÁ CONVERTIDO KZ: ${displayPrice}`);
      return displayPrice;
    }

    // Verificar se userCountry está disponível
    if (!userCountry) {
      console.log(`🚨 getDisplayPrice - GEO NOT READY: ${priceInKZ} KZ`);
      return `${formatAmountLocale(priceInKZ)} KZ`;
    }

    // SEMPRE usar preços personalizados se disponíveis para o país do usuário
    if (product?.custom_prices && userCountry?.code && product.custom_prices[userCountry.code] && priceInKZ === originalPriceKZ) {
      const customPrice = parseFloat(product.custom_prices[userCountry.code]);
      let displayPrice: string;
      if (userCountry.currency === 'EUR') {
        displayPrice = `€${formatAmount(customPrice)}`;
      } else if (userCountry.currency === 'GBP') {
        displayPrice = `£${formatAmount(customPrice)}`;
      } else if (userCountry.currency === 'USD') {
        displayPrice = `$${formatAmount(customPrice)}`;
      } else if (userCountry.currency === 'MXN') {
        const hasDecimals = customPrice % 1 !== 0;
        displayPrice = hasDecimals
          ? `$${customPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
          : `$${Math.round(customPrice).toLocaleString('es-MX')} MXN`;
      } else if (userCountry.currency === 'CLP') {
        displayPrice = `$${Math.round(customPrice).toLocaleString('es-CL')} CLP`;
      } else if (userCountry.currency === 'ARS') {
        const hasDecimals = customPrice % 1 !== 0;
        displayPrice = hasDecimals 
          ? `$${customPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
          : `$${Math.round(customPrice).toLocaleString('es-AR')} ARS`;
      } else if (userCountry.currency === 'MZN') {
        displayPrice = `${formatAmount(customPrice)} MT`;
      } else {
        displayPrice = `${formatAmountLocale(customPrice)} KZ`;
      }
      console.log(`🚨 getDisplayPrice - USANDO PREÇO PERSONALIZADO: ${priceInKZ} KZ -> ${displayPrice}`);
      return displayPrice;
    }

    // Verificar se formatPrice está disponível antes de usar
    if (!formatPrice || !userCountry) {
      console.log(`🚨 getDisplayPrice - FORMAT NOT READY: ${priceInKZ} KZ`);
      return `${formatAmountLocale(priceInKZ)} KZ`;
    }
    try {
      const displayPrice = formatPrice(priceInKZ, userCountry, product?.custom_prices);
      console.log(`🚨 getDisplayPrice - USANDO FORMATAÇÃO PADRÃO: ${priceInKZ} KZ -> ${displayPrice}`);
      return displayPrice;
    } catch (error) {
      console.error('Error formatting price:', error);
      return `${priceInKZ.toLocaleString()} KZ`;
    }
  }, [product, userCountry, formatPrice, originalPriceKZ]);

  // Função específica para order bump - formata sem aplicar conversão dupla
  const getOrderBumpDisplayPrice = useCallback((price: number): string => {
    if (!userCountry) {
      return `${price.toLocaleString()} KZ`;
    }

    // O price já vem calculado corretamente (seja KZ original ou valor personalizado)
    // Apenas formatar com o símbolo correto da moeda
    if (userCountry.currency === 'EUR') {
      return `€${price.toFixed(2)}`;
    } else if (userCountry.currency === 'GBP') {
      return `£${price.toFixed(2)}`;
    } else if (userCountry.currency === 'USD') {
      return `$${price.toFixed(2)}`;
    } else if (userCountry.currency === 'MXN') {
      return `$${price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    } else if (userCountry.currency === 'CLP') {
      return `$${Math.round(price).toLocaleString('es-CL')} CLP`;
    } else if (userCountry.currency === 'ARS') {
      const hasDecimals = price % 1 !== 0;
      return hasDecimals 
        ? `$${price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
        : `$${Math.round(price).toLocaleString('es-AR')} ARS`;
    } else if (userCountry.currency === 'MZN') {
      return `${price.toFixed(2)} MT`;
    } else {
      return `${price.toLocaleString()} KZ`;
    }
  }, [userCountry]);

  // Forçar modo claro sempre e resetar order bumps quando país muda
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Resetar order bumps quando país muda para evitar conflitos de preço
  useEffect(() => {
    if (userCountry) {
      console.log('🌍 País mudou, resetando order bumps selecionados para evitar conflitos de preço');
      setOrderBump(null);
      setResetOrderBumps(true);

      // Reset do flag após um pequeno delay para garantir que os components recebam a prop
      setTimeout(() => setResetOrderBumps(false), 100);
    }
  }, [userCountry?.code]);
  useEffect(() => {
    console.log('Checkout page loaded with productId:', productId);

    // Verificar se há erros de pagamento na URL (redirecionamento de pagina de obrigado)
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'payment_failed' || errorParam === 'payment_rejected') {
      console.log('❌ Payment error detected from redirect:', errorParam);
      toast({
        title: "Pagamento recusado",
        message: "O pagamento foi recusado ou cancelado. Por favor, tente novamente.",
        variant: "error"
      });
      // Limpar parâmetros de erro da URL - MAS PRESERVAR ref e UTMs
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('error');
      const newUrl = cleanParams.toString() 
        ? `${window.location.pathname}?${cleanParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    // Verificar se o usuário foi redirecionado de volta do Klarna
    const paymentReturn = urlParams.get('payment_return');
    const redirectStatus = urlParams.get('redirect_status');
    const orderId = urlParams.get('order_id');
    const paymentIntentId = urlParams.get('payment_intent_id');
    if (paymentReturn === 'klarna') {
      console.log('🔄 User returned from Klarna payment');

      // Verificar o status do pagamento e redirecionar adequadamente
      if (redirectStatus === 'succeeded' && orderId) {
        // Pagamento bem-sucedido, redirecionar para página de obrigado
        // Buscar amount e currency da URL original
        const returnAmount = urlParams.get('amount') || '0';
        const returnCurrency = urlParams.get('currency') || 'EUR';
        const params = new URLSearchParams({
          order_id: orderId,
          payment_intent_id: paymentIntentId || '',
          status: 'completed',
          amount: returnAmount,
          currency: returnCurrency
        });
        // ✅ STRIPE/KLARNA: Disparar evento do Facebook Pixel (pagamento já confirmado pelo gateway)
        const currentParams = new URLSearchParams(window.location.search);
        const purchaseAmount = parseFloat(currentParams.get('amount') || '0');
        const purchaseCurrency = currentParams.get('currency') || 'EUR';
        
        console.log('✅ Stripe/Klarna payment confirmed, dispatching Facebook Pixel purchase event');
        window.dispatchEvent(new CustomEvent('purchase-completed', {
          detail: {
            productId,
            orderId,
            amount: purchaseAmount,
            currency: purchaseCurrency
          }
        }));

        // Enviar evento para Facebook Conversions API
        supabase.functions.invoke('send-facebook-conversion', {
          body: {
            productId,
            orderId,
            amount: purchaseAmount,
            currency: purchaseCurrency,
            customerEmail: formData.email,
            customerName: formData.fullName,
            customerPhone: formData.phone,
            eventSourceUrl: window.location.href
          }
        }).catch(err => console.error('Error sending Facebook conversion:', err));
        navigate(`/obrigado?${params.toString()}`);
        return;
      } else if (redirectStatus === 'failed') {
        console.log('❌ Klarna payment failed or cancelled, staying on checkout');
        // Limpar os parâmetros da URL mas PRESERVAR ref e UTMs
        const cleanParams = new URLSearchParams(window.location.search);
        ['error', 'payment_return', 'redirect_status', 'order_id', 'payment_intent_id', 'amount', 'currency'].forEach(p => cleanParams.delete(p));
        const newUrl = cleanParams.toString() 
          ? `${window.location.pathname}?${cleanParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        toast({
          title: "Pagamento cancelado",
          message: "O pagamento foi cancelado. Você pode tentar novamente.",
          variant: "error"
        });
      }
    }
    
    // Verificar se o usuário foi redirecionado de volta do MB Way
    if (paymentReturn === 'mbway') {
      console.log('🔄 User returned from MB Way payment');
      
      // Verificar o status do pagamento via API
      if (paymentIntentId) {
        supabase.functions.invoke('check-payment-status', {
          body: { paymentIntentId }
        }).then(({ data, error }) => {
          if (error) {
            console.error('Error checking payment status:', error);
            // Limpar parâmetros da URL mas PRESERVAR ref e UTMs
            const cleanParams = new URLSearchParams(window.location.search);
            ['error', 'payment_return', 'redirect_status', 'order_id', 'payment_intent_id', 'amount', 'currency'].forEach(p => cleanParams.delete(p));
            const newUrl = cleanParams.toString() 
              ? `${window.location.pathname}?${cleanParams.toString()}`
              : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            toast({
              title: "Erro",
              message: "Não foi possível verificar o status do pagamento.",
              variant: "error"
            });
            return;
          }
          
          console.log('🔍 MB Way payment status:', data);
          
          if (data?.status === 'succeeded') {
            // Pagamento bem-sucedido, redirecionar para página de obrigado
            // Buscar amount e currency da URL original
            const returnAmount = urlParams.get('amount') || '0';
            const returnCurrency = urlParams.get('currency') || 'EUR';
            const params = new URLSearchParams({
              order_id: orderId || '',
              payment_intent_id: paymentIntentId || '',
              status: 'paid',
              payment_method: 'mbway',
              amount: returnAmount,
              currency: returnCurrency
            });
            navigate(`/obrigado?${params.toString()}`);
          } else if (data?.status === 'canceled' || data?.status === 'requires_payment_method') {
            // Pagamento foi recusado/cancelado
            console.log('❌ MB Way payment was rejected/canceled');
            const cleanParams2 = new URLSearchParams(window.location.search);
            ['error', 'payment_return', 'redirect_status', 'order_id', 'payment_intent_id', 'amount', 'currency'].forEach(p => cleanParams2.delete(p));
            const newUrl2 = cleanParams2.toString() 
              ? `${window.location.pathname}?${cleanParams2.toString()}`
              : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl2);
            toast({
              title: "Pagamento recusado",
              message: "O pagamento MB Way foi recusado ou cancelado. Por favor, tente novamente.",
              variant: "error"
            });
          } else if (data?.status === 'requires_action' || data?.status === 'processing') {
            // Pagamento ainda pendente de confirmação
            console.log('⏳ MB Way payment still pending');
            const cleanParams3 = new URLSearchParams(window.location.search);
            ['error', 'payment_return', 'redirect_status', 'order_id', 'payment_intent_id', 'amount', 'currency'].forEach(p => cleanParams3.delete(p));
            const newUrl3 = cleanParams3.toString() 
              ? `${window.location.pathname}?${cleanParams3.toString()}`
              : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl3);
            toast({
              title: "Aguardando confirmação",
              message: "Por favor, confirme o pagamento na aplicação MB Way do seu telemóvel.",
              variant: "default"
            });
          }
        });
      } else {
        // Sem payment intent id, mostrar erro
        const cleanParams4 = new URLSearchParams(window.location.search);
        ['error', 'payment_return', 'redirect_status', 'order_id', 'payment_intent_id', 'amount', 'currency'].forEach(p => cleanParams4.delete(p));
        const newUrl4 = cleanParams4.toString() 
          ? `${window.location.pathname}?${cleanParams4.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, document.title, newUrl4);
        toast({
          title: "Pagamento recusado",
          message: "O pagamento foi recusado. Por favor, tente novamente.",
          variant: "error"
        });
      }
    }
    // ⚡ OTIMIZAÇÃO: Carregar produto e settings em paralelo
    const loadCheckoutData = async () => {
      if (!productId) return;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId);
      
      try {
        // Usar função RPC segura para buscar produto (não expõe user_id, commission, etc.)
        let productResult;
        if (isUUID) {
          productResult = await supabase.rpc('get_product_for_checkout', { p_product_id: productId });
        } else {
          productResult = await supabase.rpc('get_product_for_checkout_by_slug', { p_slug: productId });
        }
        
        const { data: productArray, error: productError } = productResult;
        const productData = productArray && productArray.length > 0 ? productArray[0] : null;
        
        // Processar produto
        if (productError) {
          logger.error('Error loading product', { component: 'Checkout', data: productError });
          setError(`Erro ao carregar produto: ${productError.message}`);
          setProduct(null);
          setTimeout(() => setProductNotFound(true), 2000);
          return;
        } else if (!productData) {
          setTimeout(() => {
            setError("Produto não encontrado");
            setProductNotFound(true);
          }, 2000);
          setProduct(null);
          return;
        } else if (productData?.status === 'Rascunho') {
          setTimeout(() => {
            setError("Este produto ainda está em desenvolvimento e não está disponível para compra");
            setProductNotFound(true);
          }, 2000);
          setProduct(null);
          return;
        } else if (productData?.status === 'Pendente') {
          setTimeout(() => {
            setError("Este produto está em revisão e não está disponível para compra no momento");
            setProductNotFound(true);
          }, 2000);
          setProduct(null);
          return;
        } else if (productData?.status === 'Banido') {
          setProduct(productData);
          setError("");
        } else if (productData?.status === 'Inativo') {
          setProduct(productData);
          setError("");
        } else {
          // Carregar info do vendedor via RPC segura, member_area e settings em paralelo
          const [sellerResult, memberAreaResult, settingsResult] = await Promise.all([
            supabase.rpc('get_seller_public_info', { p_product_id: productData.id }),
            productData.member_area_id 
              ? supabase.from('member_areas').select('id, name, url').eq('id', productData.member_area_id).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            supabase.from('checkout_customizations').select('*').eq('product_id', productData.id).maybeSingle()
          ]);
          
          // Adicionar info do vendedor e member_area ao produto
          const productWithExtras = {
            ...productData,
            profiles: sellerResult.data && sellerResult.data.length > 0 ? sellerResult.data[0] : null,
            member_areas: memberAreaResult.data
          };
          
          setProduct(productWithExtras);
          setError("");
          setProductSEO(productData);
          
          // Processar settings
          const { data: settingsData, error: settingsError } = settingsResult;
          if (settingsError) {
            logger.error('Error loading checkout settings', { component: 'Checkout', data: settingsError });
          } else if (settingsData?.settings) {
            setCheckoutSettings(settingsData.settings);
          }
        }
      } catch (error) {
        logger.error('Unexpected error loading checkout data', { component: 'Checkout', data: error });
        setTimeout(() => {
          setError("Erro inesperado ao carregar produto");
          setProductNotFound(true);
        }, 2000);
        setProduct(null);
      }
    };
    
    loadCheckoutData();
  }, [productId, navigate, toast]); // Carregar imediatamente, sem esperar geo
  
  // Carregar informações da turma (APENAS se houver cohortId na URL)
  useEffect(() => {
    // IMPORTANTE: Só carregar turma se houver cohortId explícito na URL
    if (!cohortId || !product?.member_area_id) return;
    
    const loadCohort = async () => {
      setCohortLoading(true);
      try {
        const { data, error } = await supabase
          .from('member_area_cohorts')
          .select('*')
          .eq('id', cohortId)
          .eq('status', 'active')
          .maybeSingle();
        
        if (error) {
          console.error('❌ Erro ao carregar turma:', error);
        } else if (data) {
          setCohort(data);
          console.log('✅ Turma carregada com sucesso:', {
            id: data.id,
            name: data.name,
            price: data.price,
            currency: data.currency,
            product_id: data.product_id
          });
          
          // Verificar se a turma está cheia
          if (data.max_students && data.current_students >= data.max_students) {
            toast({
              title: "Turma lotada",
              message: "Esta turma já atingiu o número máximo de alunos.",
              variant: "error"
            });
          }
        } else {
          console.log('⚠️ Turma não encontrada para ID:', cohortId);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar turma:', error);
      } finally {
        setCohortLoading(false);
      }
    };
    
    loadCohort();
  }, [cohortId, product?.member_area_id, toast]);
  
  // Carregar oferta específica (APENAS se houver offerId na URL)
  useEffect(() => {
    if (!offerId || !product?.id) return;
    
    const loadOffer = async () => {
      try {
        const { data, error } = await supabase
          .from('product_offers')
          .select('*')
          .eq('id', offerId)
          .eq('product_id', product.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) {
          console.error('❌ Erro ao carregar oferta:', error);
        } else if (data) {
          setSelectedOffer(data);
          console.log('✅ Oferta carregada com sucesso:', {
            id: data.id,
            name: data.name,
            price: data.price,
            currency: data.currency
          });
        } else {
          console.log('⚠️ Oferta não encontrada ou inativa:', offerId);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar oferta:', error);
      }
    };
    
    loadOffer();
  }, [offerId, product?.id]);
  
  // Buscar vendas do produto específico
  useEffect(() => {
    if (!product?.id) return;
    
    const fetchProductSales = async () => {
      try {
        // @ts-ignore - evitar inferência profunda do TypeScript
        const response = await supabase
          .from('orders')
          .select('order_bump_data')
          .eq('product_id', product.id)
          .eq('status', 'completed');
        
        if (!response.error && response.data) {
          const totalSales = countTotalSales(response.data);
          console.log('📊 Total de vendas do produto:', totalSales);
          setProductTotalSales(totalSales);
        }
      } catch (err) {
        console.error('Erro ao buscar vendas:', err);
      }
    };
    
    fetchProductSales();
  }, [product?.id]);

  const handleInputChange = (field: string, value: string) => {
    // Sanitizar email para rejeitar números de telefone
    const sanitizedValue = field === 'email' 
      ? value.toLowerCase().replace(/\s/g, '') // Remove espaços e converte para lowercase
      : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };
  const handlePhoneCountryChange = (countryCode: string) => {
    // APENAS atualiza o código do país do telefone
    // NÃO muda o país do checkout
    const phoneCode = getPhoneCodeByCountry(countryCode);
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  };
  
  const handleCountryChange = (countryCode: string) => {
    changeCountry(countryCode);
    const phoneCode = getPhoneCodeByCountry(countryCode);
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));

    // Limpar método de pagamento selecionado e dados relacionados quando mudar país
    setSelectedPayment("");
    setBankTransferData(null);
  };
  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) {
      return cover;
    }
    // Se a URL já inclui supabase ou http/https, usar diretamente
    if (cover.includes('supabase') || cover.startsWith('http')) {
      return cover;
    }
    // Caso contrário, assumir que é ID do Unsplash (compatibilidade)
    return `https://images.unsplash.com/${cover}`;
  };

  // Memoizar métodos de pagamento para evitar recálculos
  const availablePaymentMethods = useMemo(() => {
    if (!userCountry) return [];

    // ✅ Argentina: sempre disponibilizar cartão (Stripe) para qualquer produto
    if (userCountry.code === 'AR') {
      return [
        {
          id: 'card',
          name: 'Tarjeta de Crédito/Débito',
          image: getPaymentMethodImage('card') || getPaymentMethodImage('card_us'),
          enabled: true,
          countryFlag: '🇦🇷',
          countryName: 'Argentina'
        }
      ];
    }

    // ✅ Espanha: sempre disponibilizar cartão (Stripe) em espanhol
    if (userCountry.code === 'ES') {
      return [
        {
          id: 'card',
          name: 'Tarjeta de Crédito/Débito',
          image: getPaymentMethodImage('card') || getPaymentMethodImage('card_us'),
          enabled: true,
          countryFlag: '🇪🇸',
          countryName: 'España'
        }
      ];
    }

    // Definir ordem dos métodos por país
    const paymentOrder: Record<string, string[]> = {
      'AO': ['express', 'reference', 'transfer'],
      'MZ': ['card_mz', 'emola', 'mpesa'], // Cartão, e-Mola e M-Pesa
      'PT': ['card', 'klarna', 'multibanco', 'mbway'],
      'ES': ['card'],
      'GB': ['card_uk', 'klarna_uk'],
      'US': ['card_us'],
      'MX': ['card_mx'],
      'CL': ['card_cl']
    };

    // Primeiro, verificar se o produto tem métodos de pagamento configurados
    if (product?.payment_methods && Array.isArray(product.payment_methods)) {
      const enabledMethods = product.payment_methods.filter((method: any) => method.enabled);
      const countryMethods = enabledMethods.filter((method: any) => {
        if (userCountry.code === 'AO') {
          return ['express', 'transfer', 'reference'].includes(method.id);
        } else if (userCountry.code === 'MZ') {
          return ['card_mz', 'emola', 'mpesa'].includes(method.id); // Cartão, e-Mola e M-Pesa
        } else if (userCountry.code === 'PT') {
          return ['card', 'klarna', 'multibanco', 'mbway'].includes(method.id);
        } else if (userCountry.code === 'ES') {
          // 🇪🇸 Espanha usa apenas cartão
          return method.id === 'card';
        } else if (userCountry.code === 'GB') {
          return ['card_uk', 'klarna_uk'].includes(method.id);
        } else if (userCountry.code === 'US') {
          return ['card_us'].includes(method.id);
        } else if (userCountry.code === 'MX') {
          return ['card_mx'].includes(method.id);
        } else if (userCountry.code === 'CL') {
          return ['card_cl'].includes(method.id);
        }
        return false;
      });
      
      // Se não encontrou métodos para o país, usar fallback
      if (countryMethods.length === 0) {
        console.log('⚠️ No payment methods found for country in product config, using fallback for:', userCountry.code);
        return getPaymentMethodsByCountry(userCountry.code);
      }
      
      // Ordenar de acordo com a ordem definida para o país
      const order = paymentOrder[userCountry.code] || [];
      const sortedMethods = countryMethods.sort((a: any, b: any) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        return indexA - indexB;
      });
      
      // Adicionar imagens aos métodos de pagamento se não existirem
      return sortedMethods.map((method: any) => ({
        ...method,
        image: method.image || getPaymentMethodImage(method.id)
      }));
    }

    // Fallback: usar métodos baseados no país selecionado
    return getPaymentMethodsByCountry(userCountry.code);
  }, [userCountry, product]);

  const getPaymentMethods = () => availablePaymentMethods;
  const getSelectedPaymentName = () => {
    const selected = availablePaymentMethods.find(method => method.id === selectedPayment);
    return selected ? selected.name : "";
  };
  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };
  const handleOrderBumpToggle = (isSelected: boolean, bumpData: any) => {
    console.log(`🚨 CHECKOUT.TSX - handleOrderBumpToggle CALLED:`, {
      isSelected,
      bumpData: bumpData ? {
        id: bumpData.id,
        bump_product_price: bumpData.bump_product_price,
        bump_product_custom_prices: bumpData.bump_product_custom_prices,
        discount: bumpData.discount
      } : null,
      userCountry: userCountry?.code
    });
    if (isSelected && bumpData) {
      // Calcular preço considerando preços personalizados para o país do usuário
      const originalPriceKZ = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      let finalPrice = originalPriceKZ;
      console.log(`🚨 CHECKOUT.TSX - CALCULATING ORDER BUMP PRICE:`, {
        originalPriceKZ,
        hasCustomPrices: !!bumpData.bump_product_custom_prices,
        userCountryCode: userCountry?.code,
        customPriceForCountry: bumpData.bump_product_custom_prices?.[userCountry?.code || '']
      });

      // SEMPRE usar preços personalizados se existirem
      if (bumpData.bump_product_custom_prices && userCountry?.code && bumpData.bump_product_custom_prices[userCountry.code]) {
        finalPrice = parseFloat(bumpData.bump_product_custom_prices[userCountry.code]);
        console.log(`🚨 CHECKOUT.TSX - USANDO PREÇO PERSONALIZADO: ${finalPrice} ${userCountry.currency}`);
      } else {
        // Fallback: converter KZ para moeda local
        if (convertPrice && userCountry) {
          finalPrice = convertPrice(originalPriceKZ, userCountry);
          console.log(`🚨 CHECKOUT.TSX - USANDO CONVERSÃO KZ: ${finalPrice} ${userCountry?.currency}`);
        } else {
          console.log(`🚨 CHECKOUT.TSX - CONVERSION NOT READY: using original price ${originalPriceKZ} KZ`);
          finalPrice = originalPriceKZ;
        }
      }

      // Aplicar desconto ao preço final
      const discountedPrice = bumpData.discount > 0 ? finalPrice * (1 - bumpData.discount / 100) : finalPrice;
      console.log(`🚨 CHECKOUT.TSX - Final order bump price: ${discountedPrice} KZ`);

      // Adicionar ao Map de order bumps selecionados
      setSelectedOrderBumps(prev => {
        const updated = new Map(prev);
        updated.set(bumpData.id, {
          data: bumpData,
          price: discountedPrice
        });
        console.log(`🚨 CHECKOUT.TSX - Added to selectedOrderBumps:`, {
          bumpId: bumpData.id,
          bumpName: bumpData.bump_product_name,
          price: discountedPrice,
          totalBumps: updated.size
        });
        return updated;
      });

      // Manter compatibilidade com código legado
      setOrderBump(bumpData);
    } else {
      console.log(`🚨 CHECKOUT.TSX - Order bump deselected, setting price to 0`);

      // Remover do Map de order bumps selecionados
      if (bumpData?.id) {
        setSelectedOrderBumps(prev => {
          const updated = new Map(prev);
          updated.delete(bumpData.id);
          console.log(`🚨 CHECKOUT.TSX - Removed from selectedOrderBumps:`, {
            bumpId: bumpData.id,
            bumpName: bumpData.bump_product_name,
            remainingBumps: updated.size
          });
          return updated;
        });
      }

      // Se não há mais bumps selecionados, limpar o estado legado também
      if (selectedOrderBumps.size <= 1) {
        setOrderBump(null);
      }
    }
  };
  const handleCardPaymentSuccess = async (paymentResult: any) => {
    try {
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const {
        error: orderError
      } = await supabase.from('orders').update({
        status: 'completed',
        order_id: orderId
      }).eq('customer_email', formData.email).eq('product_id', productId).eq('status', 'pending');
      if (orderError) {
        console.error('Erro ao atualizar ordem:', orderError);
      }
      const newSalesCount = (product.sales || 0) + 1;

      // Handle both UUID and slug formats for productId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId || '');
      await supabase.from('products').update({
        sales: newSalesCount
      }).eq(isUUID ? 'id' : 'slug', productId);
      try {
        console.log('🔔 Triggering webhooks for Stripe payment success...');
        const totalAmountInKZ = finalProductPrice + totalOrderBumpPrice;
        const webhookPayload = {
          event: 'payment.success',
          data: {
            order_id: orderId,
            amount: totalAmountInKZ.toString(),
            base_product_price: product.price,
            currency: 'KZ',
            customer_email: formData.email,
            customer_name: formData.fullName,
            customer_phone: formData.phone || null,
            product_id: product.id,
            product_name: product.name,
            payment_method: 'stripe',
            timestamp: new Date().toISOString(),
            order_bump: orderBump ? {
              bump_product_name: orderBump.bump_product_name,
              bump_product_price: orderBump.bump_product_price,
              discount: orderBump.discount,
              discounted_price: totalOrderBumpPrice
            } : null
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: product.id
        };
        const {
          error: webhookError
        } = await supabase.functions.invoke('trigger-webhooks', {
          body: webhookPayload
        });
        if (webhookError) {
          console.error('Error triggering payment webhooks:', webhookError);
        }
        const productPurchasePayload = {
          event: 'product.purchased',
          data: {
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            customer_email: formData.email,
            customer_name: formData.fullName,
            customer_phone: formData.phone || null,
            price: totalAmountInKZ.toString(),
            currency: 'KZ',
            timestamp: new Date().toISOString()
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: product.id
        };
        const {
          error: productWebhookError
        } = await supabase.functions.invoke('trigger-webhooks', {
          body: productPurchasePayload
        });
        if (productWebhookError) {
          console.error('Error triggering product purchase webhooks:', productWebhookError);
        } else {
          console.log('✅ Webhooks triggered successfully for Stripe payment');
        }
      } catch (webhookError) {
        console.error('❌ Error triggering webhooks for Stripe payment:', webhookError);
      }
      const totalAmountInKZ = finalProductPrice + totalOrderBumpPrice;

      // Verificar se há upsell configurado
      const shouldRedirectToUpsell = checkoutSettings?.upsell?.enabled && checkoutSettings.upsell.link;
      if (shouldRedirectToUpsell) {
        // Redirecionar para página de upsell
        const upsellUrl = new URL(checkoutSettings.upsell.link);
        upsellUrl.searchParams.set('from_order', orderId);

        // Criar URL de retorno para página de obrigado
        const returnParams = new URLSearchParams({
          order_id: orderId,
          customer_name: formData.fullName.trim(),
          customer_email: formData.email.trim().toLowerCase(),
          product_name: product.name,
          amount: totalAmountInKZ.toString(),
          currency: 'KZ',
          product_id: productId || '',
          seller_id: product.user_id,
          base_product_price: product.price,
          ...(orderBump && {
            order_bump_name: orderBump.bump_product_name,
            order_bump_price: orderBump.bump_product_price,
            order_bump_discount: orderBump.discount.toString(),
            order_bump_discounted_price: totalOrderBumpPrice.toString()
          })
        });
        const returnUrl = `${window.location.origin}/obrigado?${returnParams.toString()}`;
        upsellUrl.searchParams.set('return_url', returnUrl);
        console.log('🎯 Redirecionando para upsell:', upsellUrl.toString());
        window.location.href = upsellUrl.toString();
        return;
      }
      const params = new URLSearchParams({
        order_id: orderId,
        customer_name: formData.fullName.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        product_name: product.name,
        amount: totalAmountInKZ.toString(),
        currency: 'KZ',
        product_id: productId || '',
        seller_id: product.user_id,
        base_product_price: product.price,
        ...(orderBump && {
          order_bump_name: orderBump.bump_product_name,
          order_bump_price: orderBump.bump_product_price,
          order_bump_discount: orderBump.discount.toString(),
          order_bump_discounted_price: totalOrderBumpPrice.toString()
        })
      });

      // Não marcar como recuperado aqui - será feito na seção de transferência bancária se necessário

      // ✅ STRIPE: Disparar evento do Facebook Pixel (Stripe já confirmou o pagamento)
      console.log('✅ Stripe payment confirmed, dispatching Facebook Pixel purchase event');
      window.dispatchEvent(new CustomEvent('purchase-completed', {
        detail: {
          productId,
          orderId,
          amount: totalAmountInKZ,
          currency: 'KZ'
        }
      }));

      // Enviar evento para Facebook Conversions API
      supabase.functions.invoke('send-facebook-conversion', {
        body: {
          productId,
          orderId,
          amount: totalAmountInKZ,
          currency: 'KZ',
          customerEmail: formData.email,
          customerName: formData.fullName,
          customerPhone: formData.phone,
          eventSourceUrl: window.location.href
        }
      }).catch(err => console.error('Error sending Facebook conversion:', err));
      navigate(`/obrigado?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao processar sucesso do pagamento:', error);
      toast({
        title: "Erro",
        message: "Erro ao finalizar compra. Entre em contato conosco.",
        variant: "error"
      });
    }
  };
  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      message: error,
      variant: "error"
    });
  };
  const handleBankTransferPurchase = async (proofFile: File, selectedBank: string) => {
    console.log('🏦 Processing bank transfer purchase with proof:', {
      fileName: proofFile.name,
      bank: selectedBank
    });
    console.log('🏦 Form data check:', {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      product: !!product,
      productId
    });
    setProcessing(true);
    try {
      const requiredPhone = selectedPayment === 'express' ? expressPhone : formData.phone;
      if (!formData.fullName || !formData.email || !requiredPhone) {
        console.error('🏦 Missing required fields:', {
          fullName: !!formData.fullName,
          email: !!formData.email,
          phone: !!requiredPhone
        });
        toast({
          title: "Campos obrigatórios",
          message: "Por favor, preencha todos os campos antes de continuar",
          variant: "error"
        });
        setProcessing(false);
        return;
      }
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const totalAmount = finalProductPrice + totalOrderBumpPrice;

      // Upload do comprovativo para o storage
      console.log('📤 Uploading payment proof to storage...');
      const fileExtension = proofFile.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExtension}`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('payment-proofs').upload(fileName, proofFile, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) {
        console.error('❌ Error uploading payment proof:', uploadError);
        toast({
          title: "Erro no upload",
          message: "Erro ao carregar comprovativo. Tente novamente.",
          variant: "error"
        });
        setProcessing(false);
        return;
      }
      console.log('✅ Payment proof uploaded successfully:', uploadData);

      // 🔒 Calcular hash SHA-256 do comprovativo para anti-duplicação
      console.log('🔐 Calculando hash SHA-256 do comprovativo...');
      let proofHash: string | null = null;
      try {
        const arrayBuffer = await proofFile.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        proofHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('✅ Hash calculado:', proofHash.substring(0, 16) + '...');
      } catch (hashError) {
        console.error('⚠️ Erro ao calcular hash do comprovativo:', hashError);
        // Continuar mesmo se falhar o hash - não bloquear o checkout
      }

      // Calcular comissões se houver afiliado - usar função consolidada
      let affiliate_commission = null;
      let seller_commission = null;
      const bankTransferAffiliateCode = getAffiliateCodeFromAllSources() || affiliateCode;
      
      if (bankTransferAffiliateCode) {
        console.log('🔍 Calculando comissões para afiliado (transferência):', bankTransferAffiliateCode);
        const {
          data: affiliate,
          error: affiliateError
        } = await supabase.from('affiliates').select('commission_rate').eq('affiliate_code', bankTransferAffiliateCode).eq('product_id', product.id).eq('status', 'ativo').maybeSingle();
        if (affiliate && !affiliateError) {
          console.log('✅ Afiliado válido encontrado:', affiliate);
          markAsValidAffiliate();
          const commission_rate = affiliate.commission_rate;
          const commission_decimal = parseFloat(commission_rate.replace('%', '')) / 100;
          affiliate_commission = Math.round(totalAmount * commission_decimal * 100) / 100;
          // Aplicar taxa de 8.99% no valor restante após comissão do afiliado
          seller_commission = Math.round((totalAmount - affiliate_commission) * 0.9101 * 100) / 100;
        } else {
          console.log('❌ Nenhum afiliado válido encontrado para o código:', bankTransferAffiliateCode, affiliateError);
          markAsInvalidAffiliate();
          // Aplicar taxa de 8.99% mesmo quando não há afiliado válido
          seller_commission = Math.round(totalAmount * 0.9101 * 100) / 100;
          // NÃO limpar o código aqui - deixar o backend fazer a validação final
          affiliate_commission = null;
        }
      } else {
        // Aplicar taxa de 8.99% mesmo quando não há afiliado
        seller_commission = Math.round(totalAmount * 0.9101 * 100) / 100;
      }

      // Converter valores para KZ para vendedores angolanos
      const totalAmountInKZ = userCountry.currency !== 'KZ' ? Math.round(totalAmount * userCountry.exchangeRate) : totalAmount;
      const affiliate_commission_kz = affiliate_commission ? userCountry.currency !== 'KZ' ? Math.round(affiliate_commission * userCountry.exchangeRate) : affiliate_commission : null;
      const seller_commission_kz = seller_commission ? userCountry.currency !== 'KZ' ? Math.round(seller_commission * userCountry.exchangeRate) : seller_commission : null;
      console.log('🏦 Conversão de moeda para transferência:', {
        originalAmount: totalAmount,
        originalCurrency: userCountry.currency,
        convertedAmount: totalAmountInKZ,
        exchangeRate: userCountry.exchangeRate
      });

      const orderData = {
        product_id: product.id,
        order_id: orderId,
        customer_name: formData.fullName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        amount: totalAmountInKZ.toString(),
        currency: 'KZ',
        payment_method: 'transfer',
        status: 'pending',
        user_id: null,
        affiliate_code: bankTransferAffiliateCode || null,
        affiliate_commission: affiliate_commission_kz,
        seller_commission: seller_commission_kz,
        order_bump_data: orderBump ? JSON.stringify({
          bump_product_name: orderBump.bump_product_name,
          bump_product_price: orderBump.bump_product_price,
          bump_product_image: orderBump.bump_product_image,
          discount: orderBump.discount,
          discounted_price: totalOrderBumpPrice
        }) : null,
        payment_proof_data: JSON.stringify({
          bank: selectedBank,
          proof_file_name: proofFile.name,
          proof_file_path: uploadData.path,
          upload_timestamp: new Date().toISOString(),
          proof_hash: proofHash // ✅ Hash para detecção de duplicatas
        }),
        payment_proof_hash: proofHash // ✅ Campo separado para indexação rápida
      };
      console.log('🏦 Creating bank transfer order:', orderData);

      // Create order through secure edge function instead of direct DB insert
      const {
        data: insertedOrder,
        error: orderError
      } = await supabase.functions.invoke('create-multibanco-order', {
        body: orderData
      });
      if (orderError || !insertedOrder) {
        console.error('❌ Error saving bank transfer order:', orderError);
        toast({
          title: "Erro",
          message: `Erro ao processar compra: ${orderError?.message || 'Erro desconhecido'}`,
          variant: "error"
        });
        setProcessing(false);
        return;
      }
      console.log('✅ Bank transfer order saved successfully:', insertedOrder);

      // Navegar para página de agradecimento COM STATUS PENDING
      const params = new URLSearchParams({
        order_id: orderId,
        customer_name: formData.fullName.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        product_name: product.name,
        amount: totalAmount.toString(),
        currency: userCountry.currency,
        product_id: productId || '',
        seller_id: product.user_id,
        base_product_price: product.price,
        payment_method: 'transfer',
        status: 'pending',
        // IMPORTANTE: Manter como pending
        ...(orderBump && {
          order_bump_name: orderBump.bump_product_name,
          order_bump_price: orderBump.bump_product_price,
          order_bump_discount: orderBump.discount.toString(),
          order_bump_discounted_price: totalOrderBumpPrice.toString()
        })
      });

      // ❌ TRANSFER: NÃO disparar evento aqui - transferência bancária sempre começa como 'pending'
      // O evento será disparado apenas quando o webhook confirmar o pagamento
      console.log('🏦 Bank transfer order created as pending - Facebook Pixel event will be triggered by webhook upon payment confirmation');
      
      navigate(`/obrigado?${params.toString()}`);
    } catch (error) {
      console.error('❌ Bank transfer purchase error:', error);
      toast({
        title: "Erro no pagamento",
        message: "Erro inesperado ao processar transferência bancária",
        variant: "error"
      });
      setProcessing(false);
    }
  };
  const handleExpressPaymentTimeout = async () => {
    console.log('⏰ Express payment timeout - checking if payment was completed...');
    
    // Antes de mostrar erro, verificar se o pagamento foi concluído no backend
    try {
      // Buscar a última ordem criada para este email
      const { data: recentOrder, error } = await supabase
        .from('orders')
        .select('order_id, status, payment_method')
        .eq('customer_email', formData.email.toLowerCase().trim())
        .eq('payment_method', 'express')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && recentOrder && recentOrder.status === 'completed') {
        console.log('✅ Payment was actually completed! Redirecting to success page...');
        setProcessing(false);
        navigate(`/checkout/success?orderId=${recentOrder.order_id}`);
        return;
      }
      
      // Se não encontrou ordem completa, verificar se há ordem pendente recente
      if (!error && recentOrder && recentOrder.status === 'pending') {
        // Verificar status no AppyPay
        const { data: verifyData } = await supabase.functions.invoke('check-order-status', {
          body: { orderId: recentOrder.order_id }
        });
        
        if (verifyData?.status === 'completed') {
          console.log('✅ Payment verified as completed via check-order-status!');
          setProcessing(false);
          navigate(`/checkout/success?orderId=${recentOrder.order_id}`);
          return;
        }
      }
    } catch (checkError) {
      console.error('Error checking payment status on timeout:', checkError);
    }
    
    // Se chegou aqui, o pagamento realmente não foi concluído
    console.log('⏰ Payment not completed - showing timeout error');
    setProcessing(false);
    toast({
      title: "Tempo Esgotado",
      message: "O tempo para concluir o pagamento esgotou. Por favor, tente novamente.",
      variant: "error"
    });
  };
  const handleExpressPaymentRestart = () => {
    console.log('🔄 Restarting express payment');
    setProcessing(false);
    toast({
      title: "Pronto para novo pagamento",
      message: "Você pode agora iniciar um novo pagamento express.",
      variant: "success"
    });
  };
  // Função para checkout de assinatura
  const handleSubscriptionCheckout = async () => {
    if (!product || !productId) return;

    const subscriptionConfig = product.subscription_config;
    if (!subscriptionConfig?.is_subscription || !subscriptionConfig?.stripe_price_id) {
      console.error('❌ Product is not configured as subscription');
      toast({
        title: "Erro",
        message: "Produto não configurado corretamente para assinatura",
        variant: "error"
      });
      return;
    }

    setProcessing(true);
    try {
      console.log('🔄 Starting subscription checkout for:', product.name);
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          productId: productId,
          customerEmail: formData.email.trim().toLowerCase(),
          customerName: formData.fullName.trim(),
          paymentMethod: selectedPayment
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        console.log('✅ Redirecting to Stripe subscription checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('❌ Subscription checkout error:', error);
      toast({
        title: "Erro ao criar checkout",
        message: error.message || "Erro ao processar assinatura",
        variant: "error"
      });
      setProcessing(false);
    }
  };

  const handlePurchase = async () => {
    console.log('🚀 HandlePurchase called with:', {
      selectedPayment,
      formData: {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone
      },
      userCountry: userCountry.code,
      availablePaymentMethods: availablePaymentMethods.map(m => m.id)
    });
    const requiredPhone = selectedPayment === 'express' ? expressPhone : formData.phone;
    if (!formData.fullName || !formData.email || !requiredPhone || !selectedPayment) {
      console.log('❌ Validation failed - missing required fields');
      return;
    }
    if (!product || !productId) {
      console.log('❌ Product not found');
      toast({
        title: "Erro",
        message: "Produto não encontrado",
        variant: "error"
      });
      return;
    }

    // ✅ VERIFICAR SE É ASSINATURA - redirecionar para Stripe Subscription Checkout
    // APENAS se o método de pagamento selecionado for Stripe (card, klarna, multibanco)
    if (product.subscription_config?.is_subscription && product.subscription_config?.stripe_price_id) {
      // Se for método Stripe, usar checkout de assinatura Stripe
      if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us', 'card_mz'].includes(selectedPayment)) {
        console.log('📦 Product is subscription with Stripe payment, redirecting to Stripe subscription checkout');
        await handleSubscriptionCheckout();
        return;
      }
      // Para AppyPay (express, reference), continuar com o fluxo normal de pagamento único
      console.log('📦 Product is subscription but using AppyPay payment method - processing as single payment');
    }

    // Para métodos Stripe, o processamento é feito pelo componente StripeCardPayment
    if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us', 'card_mx', 'card_cl', 'card_mz'].includes(selectedPayment)) {
      console.log('Stripe payment method selected, processing handled by StripeCardPayment component');
      return;
    }

    // Para pagamento express, validar credenciais primeiro
    if (selectedPayment === 'express') {
      console.log('🔄 Pagamento Express - validar credenciais primeiro');
      try {
        console.log('🔍 Testing AppyPay credentials before showing countdown...');
        const credentialsTest = await supabase.functions.invoke('create-appypay-charge', {
          body: {
            amount: 1,
            // Test with minimal amount
            productId: 'test',
            customerData: {
              name: 'Test',
              email: 'test@test.com',
              phone: '923000000'
            },
            originalAmount: 1,
            originalCurrency: 'AOA',
            paymentMethod: 'express',
            phoneNumber: '923000000',
            testCredentials: true // Add test flag
          }
        });

        // Check for any error or failed response
        if (credentialsTest.error || !credentialsTest.data || !credentialsTest.data.success) {
          console.error('❌ AppyPay credentials test failed:', credentialsTest);
          console.log('🚨 Showing error toast to user...');
          toast({
            title: "Sistema indisponível",
            message: "O pagamento Multicaixa Express está temporariamente indisponível. Contacte o suporte.",
            variant: "error"
          });
          console.log('✅ Error toast triggered');
          setProcessing(false);
          return;
        }
        console.log('✅ AppyPay credentials validated, proceeding with payment...');
        // Continue to process payment below
      } catch (credError) {
        console.error('❌ Credentials test error:', credError);
        console.log('🚨 Showing error toast from catch block...');
        toast({
          title: "Sistema indisponível",
          message: "O pagamento Multicaixa Express está temporariamente indisponível. Contacte o suporte.",
          variant: "error"
        });
        console.log('✅ Error toast from catch block triggered');
        setProcessing(false);
        return;
      }
    }

    // ⚠️ IMPORTANTE: não iniciar countdown aqui.
    // O countdown oficial já é controlado pelo useEffect (selectedPayment + processing)
    // e é limpo corretamente quando o pagamento é confirmado.
    setProcessing(true);
    try {
      console.log('Starting purchase process for product:', product);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const totalAmount = finalProductPrice + totalOrderBumpPrice;

      // ✅ Afiliado (Express/Reference): usar validatedAffiliate quando disponível,
      // mas fazer fallback de validação no momento da compra para não perder o código
      // caso o useEffect ainda não tenha finalizado.
      let affiliate_commission: number | null = null;
      let seller_commission: number | null = null;
      let affiliate_code_to_use: string | null = null;

      // ✅ SEMPRE capturar o código de afiliado de TODAS as fontes possíveis usando a função consolidada.
      // Prioridade: 1) URL, 2) Cookie cross-subdomain, 3) window.name, 4) localStorage, 5) hook state
      // O backend (create-appypay-charge) fará a validação final.
      affiliate_code_to_use = getAffiliateCodeFromAllSources() || affiliateCode || null;
      
      if (affiliate_code_to_use) {
        console.log('🔗 Código de afiliado capturado para envio ao backend:', {
          code: affiliate_code_to_use,
          hookValue: affiliateCode,
          fromConsolidatedFunction: true
        });
      } else {
        console.log('⚠️ Nenhum código de afiliado encontrado em nenhuma fonte');
      }

      const validateAffiliateOnDemand = async (codeToValidate: string | null): Promise<number | null> => {
        if (!codeToValidate || !product?.id) return null;

        // Se o estado já está validado e bate com o código atual, reaproveitar
        if (validatedAffiliate?.code === codeToValidate && validatedAffiliate?.commission_rate) {
          return validatedAffiliate.commission_rate;
        }

        console.log('🔍 Fallback: validando afiliado no momento da compra:', codeToValidate);
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('commission_rate')
          .eq('affiliate_code', codeToValidate)
          .eq('product_id', product.id)
          .eq('status', 'ativo')
          .maybeSingle();

        if (affiliate && !affiliateError) {
          const rate = parseFloat(affiliate.commission_rate.replace('%', '')) / 100;
          return Number.isFinite(rate) ? rate : null;
        }

        return null;
      };

      const affiliateRate = await validateAffiliateOnDemand(affiliate_code_to_use);

      if (affiliateRate && affiliate_code_to_use) {
        // (Opcional) cálculo local apenas para logs/UI; o backend é a fonte de verdade.
        affiliate_commission = Math.round(totalAmount * affiliateRate * 100) / 100;
        seller_commission = Math.round((totalAmount - affiliate_commission) * 100) / 100;

        console.log('💰 Comissões para Express/Reference:', {
          totalAmount,
          commission_rate: affiliateRate,
          affiliate_commission,
          seller_commission,
          affiliate_code: affiliate_code_to_use,
        });
      } else {
        console.log('ℹ️ Afiliado não validado no frontend (vai depender do backend), vendedor recebe tudo (temporário)');
        seller_commission = totalAmount;
      }

      // Converter valores para KZ para vendedores angolanos
      const totalAmountInKZ = userCountry.currency !== 'KZ' ? Math.round(totalAmount * userCountry.exchangeRate) : totalAmount;
      const affiliate_commission_kz = affiliate_commission !== null && !Number.isNaN(affiliate_commission)
        ? (userCountry.currency !== 'KZ' ? Math.round(affiliate_commission * userCountry.exchangeRate) : affiliate_commission)
        : null;
      const seller_commission_kz = seller_commission !== null && !Number.isNaN(seller_commission)
        ? (userCountry.currency !== 'KZ' ? Math.round(seller_commission * userCountry.exchangeRate) : seller_commission)
        : null;
      console.log('💱 Conversão de moeda:', {
        originalAmount: totalAmount,
        originalCurrency: userCountry.currency,
        convertedAmount: totalAmountInKZ,
        exchangeRate: userCountry.exchangeRate
      });
      const orderData = {
        product_id: product.id,
        order_id: orderId,
        customer_name: formData.fullName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        amount: totalAmountInKZ.toString(),
        // Sempre em KZ
        currency: 'KZ',
        // Sempre salvar como KZ
        payment_method: selectedPayment,
        status: 'pending',
        // Angola payment methods should start as pending
        user_id: null,
        // Always null for checkout page orders (guest orders)
        affiliate_code: affiliate_code_to_use,
        affiliate_commission: affiliate_commission_kz,
        seller_commission: seller_commission_kz,
        cohort_id: cohortId, // Adicionar cohort_id
        utm_params: utmParams, // Parâmetros UTM para tracking
        order_bump_data: orderBump ? JSON.stringify({
          bump_product_name: orderBump.bump_product_name,
          bump_product_price: orderBump.bump_product_price,
          bump_product_image: orderBump.bump_product_image,
          discount: orderBump.discount,
          discounted_price: totalOrderBumpPrice
        }) : null
      };
      console.log('Inserting order with corrected data:', orderData);
      console.log('🔍 Order data keys:', Object.keys(orderData));
      console.log('🔍 Order data values:', Object.values(orderData));

      // Route payments to appropriate system based on payment method
      let insertedOrder, orderError;
      if (selectedPayment === 'express' || selectedPayment === 'reference') {
        // Use AppyPay for both express and reference payments in Angola
        console.log('🚀 Using AppyPay for payment method:', selectedPayment);
        
        // Use expressPhone for Multicaixa Express, formData.phone for reference
        const phoneToUse = selectedPayment === 'express' ? expressPhone : formData.phone;
        
        console.log('📱 Phone number for payment:', {
          selectedPayment,
          expressPhone,
          formDataPhone: formData.phone,
          phoneToUse
        });
        
        const appyPayResponse = await supabase.functions.invoke('create-appypay-charge', {
          body: {
            amount: totalAmountInKZ,
            productId: product.id,
            customerData: {
              name: formData.fullName,
              email: formData.email,
              phone: phoneToUse
            },
            originalAmount: totalAmountInKZ,
            originalCurrency: 'KZ',
            paymentMethod: selectedPayment,
            phoneNumber: phoneToUse,
            orderData: orderData, // Pass order data for saving
            customerCountry: userCountry?.name || '' // Pass detected country
          }
        });
        if (appyPayResponse.error) {
          console.error('❌ AppyPay error:', appyPayResponse.error);
          toast({
            title: "Erro no pagamento",
            message: `Erro AppyPay: ${appyPayResponse.error.message || 'Erro desconhecido'}`,
            variant: "error"
          });
          setProcessing(false);
          return;
        }
        // Normalizar a resposta do AppyPay para ter um campo 'status' consistente
        const appyPayData = appyPayResponse.data;
        insertedOrder = {
          ...appyPayData,
          status: appyPayData?.payment_status || appyPayData?.status,
          order_id: appyPayData?.order_id
        };
        console.log('✅ AppyPay response (normalized):', insertedOrder);
      } else {
        // Use create-multibanco-order for other payment methods (transfer, etc.)
        console.log('🏦 Using Multibanco system for payment method:', selectedPayment);
        const multibancoResponse = await supabase.functions.invoke('create-multibanco-order', {
          body: orderData
        });
        insertedOrder = multibancoResponse.data;
        orderError = multibancoResponse.error;
      }
      if (orderError || !insertedOrder) {
        console.error('Error saving order:', orderError);
        toast({
          title: "Erro",
          message: `Erro ao processar compra: ${orderError?.message || 'Erro desconhecido'}`,
          variant: "error"
        });
        setProcessing(false);
        return;
      } else {
        console.log('Order saved successfully:', insertedOrder);
        try {
          console.log('Updating product sales count...');
          const newSalesCount = (product.sales || 0) + 1;

          // Handle both UUID and slug formats for productId
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isUUID = uuidRegex.test(productId || '');
          const {
            data: updatedProduct,
            error: updateError
          } = await supabase.from('products').update({
            sales: newSalesCount
          }).eq(isUUID ? 'id' : 'slug', productId).select();
          if (updateError) {
            console.error('Error updating product sales:', updateError);
            console.error('Update error details:', JSON.stringify(updateError, null, 2));
          } else {
            console.log('Product sales count updated successfully:', updatedProduct);
            if (updatedProduct && updatedProduct.length > 0) {
              setProduct(prev => ({
                ...prev,
                sales: newSalesCount
              }));
            }
          }
          try {
            console.log('🔔 Triggering webhooks for local payment method...');
            
            // ✅ CRITICAL: Só disparar webhooks se o pagamento foi realmente completado
            // Verificar status para TODOS os métodos (express, reference, etc)
            const shouldTriggerWebhooks = insertedOrder?.status === 'completed';
            
            console.log('🔍 Webhook trigger check:', {
              status: insertedOrder?.status,
              shouldTrigger: shouldTriggerWebhooks,
              payment_method: selectedPayment
            });
            
            if (shouldTriggerWebhooks) {
              const webhookPayload = {
                event: 'payment.success',
                data: {
                  order_id: orderId,
                  amount: totalAmount.toString(),
                  base_product_price: product.price,
                  currency: userCountry.currency,
                  customer_email: formData.email,
                  customer_name: formData.fullName,
                  customer_phone: formData.phone || null,
                  product_id: product.id,
                  product_name: product.name,
                  payment_method: selectedPayment,
                  timestamp: new Date().toISOString(),
                  order_bump: orderBump ? {
                    bump_product_name: orderBump.bump_product_name,
                    bump_product_price: orderBump.bump_product_price,
                    discount: orderBump.discount,
                    discounted_price: totalOrderBumpPrice
                  } : null
                },
                user_id: product.user_id,
                order_id: orderId,
                product_id: product.id
              };
              const {
                error: webhookError
              } = await supabase.functions.invoke('trigger-webhooks', {
                body: webhookPayload
              });
              if (webhookError) {
                console.error('Error triggering payment webhooks:', webhookError);
              }
              const productPurchasePayload = {
                event: 'product.purchased',
                data: {
                  order_id: orderId,
                  product_id: product.id,
                  product_name: product.name,
                  customer_email: formData.email,
                  customer_name: formData.fullName,
                  customer_phone: formData.phone || null,
                  price: totalAmount.toString(),
                  currency: userCountry.currency,
                  timestamp: new Date().toISOString()
                },
                user_id: product.user_id,
                order_id: orderId,
                product_id: product.id
              };
              const {
                error: productWebhookError
              } = await supabase.functions.invoke('trigger-webhooks', {
                body: productPurchasePayload
              });
              if (productWebhookError) {
                console.error('Error triggering product purchase webhooks:', productWebhookError);
              } else {
                console.log('✅ Webhooks triggered successfully for local payment');
              }
            } else {
              console.log('⏸️ Webhooks skipped - payment is pending (reference payment)');
            }
          } catch (webhookError) {
            console.error('❌ Error triggering webhooks for local payment:', webhookError);
          }
        } catch (updateError) {
          console.error('Unexpected error updating sales:', updateError);
        }
      }
      // ✅ Enviar email APENAS para pagamentos pendentes (referência)
      // Para pagamentos completados, o webhook enviará o email
      if (selectedPayment === 'reference') {
        try {
          console.log('Sending pending payment email...');
          const emailData = {
            customerName: formData.fullName.trim(),
            customerEmail: formData.email.trim().toLowerCase(),
            customerPhone: formData.phone.trim(),
            productName: product.name,
            orderId: orderId,
            amount: totalAmount.toString(),
            currency: userCountry.currency,
            productId: productId,
            shareLink: product.share_link,
            memberAreaId: product.member_areas?.id,
            sellerId: product.user_id,
            orderBump: orderBump ? {
              bump_product_name: orderBump.bump_product_name,
              bump_product_price: orderBump.bump_product_price,
              bump_product_image: orderBump.bump_product_image,
              discount: orderBump.discount,
              discounted_price: totalOrderBumpPrice
            } : null,
            baseProductPrice: product.price,
            paymentMethod: selectedPayment,
            paymentStatus: 'pending',
            referenceData: {
              referenceNumber: insertedOrder.reference_number,
              entity: insertedOrder.entity,
              dueDate: insertedOrder.due_date
            }
          };
          const {
            data: emailResponse,
            error: emailError
          } = await supabase.functions.invoke('send-purchase-confirmation', {
            body: emailData
          });
          if (emailError) {
            console.error('Error sending pending payment email:', emailError);
          } else {
            console.log('Pending payment email sent successfully:', emailResponse);
          }
        } catch (emailError) {
          console.error('Unexpected error sending pending payment email:', emailError);
        }
      } else {
        console.log('✅ Payment completed - email will be sent by webhook');
      }
      const params = new URLSearchParams({
        order_id: orderId,
        customer_name: formData.fullName.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        product_name: product.name,
        amount: totalAmount.toString(),
        currency: userCountry.currency,
        product_id: productId || '',
        seller_id: product.user_id,
        base_product_price: product.price,
        ...(orderBump && {
          order_bump_name: orderBump.bump_product_name,
          order_bump_price: orderBump.bump_product_price,
          order_bump_discount: orderBump.discount.toString(),
          order_bump_discounted_price: totalOrderBumpPrice.toString()
        })
      });

      // Marcar pagamento como completado e abandonos como recuperados
      setPaymentCompleted(true);
      markAsRecovered(orderId);
      console.log('✅ Venda concluída - abandonos marcados como recuperados');

      // ═══════════════════════════════════════════════════════════════
      // 🎯 LÓGICA DE UPSELL CORRIGIDA
      // Upsell SÓ deve aparecer para pagamentos EXPRESS CONFIRMADOS
      // ═══════════════════════════════════════════════════════════════
      
      if (selectedPayment === 'express') {
        console.log('⏳ Verificando status do pagamento Express...');
        
        // 🚀 CRITICAL FIX: Verificar se pagamento JÁ FOI APROVADO instantaneamente
        // Antes de iniciar polling, verificar resposta direta do AppyPay
        if (insertedOrder?.status === 'completed') {
          console.log('✅ Pagamento Express aprovado INSTANTANEAMENTE! Redirecionando...');
          
          // Mostrar toast de sucesso
          toast({
            title: "Pagamento Aprovado!",
            message: "Seu pagamento foi confirmado com sucesso.",
            variant: "success",
            position: "top-center",
            duration: 3000
          });
          
          // Disparar evento Facebook Pixel
          window.dispatchEvent(new CustomEvent('purchase-completed', {
            detail: {
              productId,
              orderId,
              amount: totalAmount,
              currency: userCountry.currency
            }
          }));
          
          // Enviar evento para Facebook Conversions API
          supabase.functions.invoke('send-facebook-conversion', {
            body: {
              productId,
              orderId,
              amount: totalAmount,
              currency: userCountry.currency,
              customerEmail: formData.email,
              customerName: formData.fullName,
              customerPhone: expressPhone || formData.phone,
              eventSourceUrl: window.location.href
            }
          }).catch(err => console.error('Error sending Facebook conversion:', err));
          
          // Verificar upsell
          // 🚨 IMPORTANTE: Adicionar status=completed ao redirect
          params.append('status', 'completed');
          params.append('payment_method', 'express');
          
          if (checkoutSettings?.upsell?.enabled && checkoutSettings.upsell.link_pagina_upsell?.trim()) {
            console.log('🎯 Redirecionando para upsell:', checkoutSettings.upsell.link_pagina_upsell);
            const upsellUrl = new URL(checkoutSettings.upsell.link_pagina_upsell);
            upsellUrl.searchParams.append('from_order', orderId);
            upsellUrl.searchParams.append('customer_email', formData.email);
            upsellUrl.searchParams.append('return_url', `${window.location.origin}/obrigado?${params.toString()}`);
            window.location.href = upsellUrl.toString();
          } else {
            console.log('🚀 Redirect URL (instant):', `/obrigado?${params.toString()}`);
            navigate(`/obrigado?${params.toString()}`);
          }
          
          setProcessing(false);
          return; // Sair da função - não precisa de polling
        }
        
        console.log('⏳ Pagamento pendente, iniciando polling...');
        
        // Start polling for payment status
        let pollAttempts = 0;
        const maxPollAttempts = 18; // Poll for up to 90 seconds (18 * 5 seconds)
        
        const pollInterval = setInterval(async () => {
          pollAttempts++;
          console.log(`🔍 Polling attempt ${pollAttempts}/${maxPollAttempts} for order ${orderId}`);
          
          try {
            const { data: orderStatus, error: pollError } = await supabase
              .from('orders')
              .select('status')
              .eq('order_id', orderId)
              .single();
            
            if (pollError) {
              console.error('❌ Error polling order status:', pollError);
              return;
            }
            
            console.log('📊 Current order status:', orderStatus?.status);
            
            if (orderStatus?.status === 'completed') {
              clearInterval(pollInterval);
              
              // CRÍTICO: Limpar countdown timer para evitar toast de timeout
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              
              console.log('✅ Pagamento Express confirmado! Verificando upsell...');
              
              // CRÍTICO: Mostrar toast no topo IMEDIATAMENTE quando pagamento confirmado
              toast({
                title: "Pagamento Aprovado!",
                message: "Seu pagamento foi confirmado com sucesso.",
                variant: "success",
                position: "top-center",
                duration: 3000
              });
              
              // ✅ EXPRESS: Disparar evento do Facebook Pixel (polling confirmou status 'completed')
              console.log('✅ Express payment confirmed via polling (status: completed), dispatching Facebook Pixel purchase event');
              window.dispatchEvent(new CustomEvent('purchase-completed', {
                detail: {
                  productId,
                  orderId,
                  amount: totalAmount,
                  currency: userCountry.currency
                }
              }));

              // Enviar evento para Facebook Conversions API
              supabase.functions.invoke('send-facebook-conversion', {
                body: {
                  productId,
                  orderId,
                  amount: totalAmount,
                  currency: userCountry.currency,
                  customerEmail: formData.email,
                  customerName: formData.fullName,
                  customerPhone: expressPhone || formData.phone,
                  eventSourceUrl: window.location.href
                }
              }).catch(err => console.error('Error sending Facebook conversion:', err));
              
              // 🚨 IMPORTANTE: Adicionar status=completed ao redirect após polling
              params.append('status', 'completed');
              params.append('payment_method', 'express');
              
              // 🎯 AGORA SIM: Verificar upsell APÓS confirmar pagamento
              if (checkoutSettings?.upsell?.enabled && checkoutSettings.upsell.link_pagina_upsell?.trim()) {
                console.log('🎯 Pagamento confirmado! Redirecionando para upsell:', checkoutSettings.upsell.link_pagina_upsell);
                const upsellUrl = new URL(checkoutSettings.upsell.link_pagina_upsell);
                upsellUrl.searchParams.append('from_order', orderId);
                upsellUrl.searchParams.append('customer_email', formData.email);
                upsellUrl.searchParams.append('return_url', `${window.location.origin}/obrigado?${params.toString()}`);
                window.location.href = upsellUrl.toString();
              } else {
                // Sem upsell, redirecionar para página de sucesso
                console.log('🚀 Redirect URL:', `/obrigado?${params.toString()}`);
                navigate(`/obrigado?${params.toString()}`);
              }
            } else if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval);
              setProcessing(false);
              console.log('⏱️ Polling timeout após 90 segundos - pagamento não confirmado');
              toast({
                title: "Tempo Esgotado",
                message: "Não conseguimos confirmar seu pagamento. Por favor, verifique no app Multicaixa Express e aguarde o email de confirmação.",
                variant: "warning"
              });
            }
          } catch (pollError) {
            console.error('💥 Polling error:', pollError);
          }
        }, 5000); // Poll every 5 seconds
        
        setProcessing(false);
      } else if (selectedPayment === 'reference' || selectedPayment === 'transfer') {
        // 📋 REFERENCE e TRANSFER: NUNCA mostrar upsell (sempre pending)
        console.log(`📋 Pagamento por ${selectedPayment} - redirecionando sem upsell (pagamento pendente)`);
        
        if (selectedPayment === 'reference') {
          console.log('📋 Processando pagamento por referência AppyPay');
          console.log('📦 insertedOrder:', insertedOrder);
          
          // Para pagamento por referência, sempre mostrar modal com dados da referência
          const refNumber = insertedOrder?.reference_number || insertedOrder?.reference?.referenceNumber;
          const refEntity = insertedOrder?.entity || insertedOrder?.reference?.entity;
          const refDueDate = insertedOrder?.due_date || insertedOrder?.reference?.dueDate;
          
          if (refNumber && refEntity) {
            console.log('✅ Dados da referência encontrados:', { refNumber, refEntity, refDueDate });
            setReferenceData({
              referenceNumber: refNumber,
              entity: refEntity,
              dueDate: refDueDate,
              amount: totalAmountInKZ,
              currency: 'KZ',
              productName: product.name,
              orderId: orderId
            });
            setProcessing(false);
          } else {
            console.error('❌ Dados da referência não encontrados:', { refNumber, refEntity, insertedOrder });
            toast({
              title: "Erro",
              message: "Erro ao obter dados da referência. Verifique seu email para os detalhes do pagamento.",
              variant: "error"
            });
            // Redirecionar para página de obrigado mesmo sem modal
            navigate(`/obrigado?${params.toString()}`);
          }
        } else {
          // Transfer: redirecionar diretamente
          navigate(`/obrigado?${params.toString()}`);
        }
      } else {
        // 🎯 OUTROS MÉTODOS: Verificar se pagamento já está confirmado
        console.log('🏠 Processando outros métodos de pagamento');
        
        // ✅ CRITICAL: Só disparar evento de Purchase quando pagamento REALMENTE confirmado
        // - Express: Após polling confirmar status 'completed'
        // - Reference: NÃO disparar aqui (será disparado quando webhook confirmar pagamento)
        // - Stripe: Após redirect de sucesso do Stripe Checkout
        // - Transfer/Outros: NÃO disparar automaticamente
        const shouldDispatchPixelEvent = insertedOrder?.status === 'completed';
        
        console.log('📊 Facebook Pixel Purchase Event Check:', {
          orderId,
          paymentStatus: insertedOrder?.status,
          paymentMethod: selectedPayment,
          shouldDispatch: shouldDispatchPixelEvent
        });
        
        if (shouldDispatchPixelEvent) {
          console.log('✅ Payment confirmed (status: completed), dispatching Facebook Pixel purchase event');
          // Disparar evento para Facebook Pixel
          window.dispatchEvent(new CustomEvent('purchase-completed', {
            detail: {
              productId,
              orderId,
              amount: totalAmount,
              currency: userCountry.currency
            }
          }));

          // Enviar evento para Facebook Conversions API
          supabase.functions.invoke('send-facebook-conversion', {
            body: {
              productId,
              orderId,
              amount: totalAmount,
              currency: userCountry.currency,
              customerEmail: formData.email,
              customerName: formData.fullName,
              customerPhone: formData.phone,
              eventSourceUrl: window.location.href
            }
          }).catch(err => console.error('Error sending Facebook conversion:', err));
          
          // 🎯 Verificar upsell APENAS se pagamento confirmado
          if (checkoutSettings?.upsell?.enabled && checkoutSettings.upsell.link_pagina_upsell?.trim()) {
            console.log('🎯 Pagamento confirmado! Redirecionando para upsell:', checkoutSettings.upsell.link_pagina_upsell);
            const upsellUrl = new URL(checkoutSettings.upsell.link_pagina_upsell);
            upsellUrl.searchParams.append('from_order', orderId);
            upsellUrl.searchParams.append('customer_email', formData.email);
            upsellUrl.searchParams.append('return_url', `${window.location.origin}/obrigado?${params.toString()}`);
            window.location.href = upsellUrl.toString();
          } else {
            navigate(`/obrigado?${params.toString()}`);
          }
        } else {
          console.log('⚠️ Payment not confirmed yet (status: ' + insertedOrder?.status + '), skipping Facebook Pixel event and upsell');
          navigate(`/obrigado?${params.toString()}`);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erro",
        message: "Erro ao processar pagamento. Tente novamente.",
        variant: "error"
      });
      setProcessing(false);
    }
  };
  if (loading || cohortLoading) {
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner text={cohortLoading ? "Carregando informações da turma..." : "Carregando informações do produto..."} size="lg" />
        </div>
      </ThemeProvider>;
  }
  if (error) {
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Erro</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Product ID: {productId || 'Não fornecido'}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        </div>
      </ThemeProvider>;
  }
  if (!product && productNotFound) {
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <p className="text-muted-foreground">O produto que você está procurando não existe ou foi removido.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Product ID: {productId}
            </p>
          </div>
        </div>
      </ThemeProvider>;
  }
  if (product?.status === 'Inativo') {
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Oferta Expirada</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Infelizmente, esta oferta não está mais disponível. O produto foi temporariamente desativado pelo vendedor.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{product.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">Status: Inativo</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Entre em contato com o vendedor para mais informações sobre a disponibilidade deste produto.
            </p>
          </div>
        </div>
      </ThemeProvider>;
  }
  if (product?.status === 'Banido') {
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Produto Indisponível</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Este produto não está mais disponível para compra. Foi removido temporariamente por questões administrativas.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{product.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">Status: Indisponível</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              O vendedor foi notificado e está resolvendo a situação. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </ThemeProvider>;
  }
  if (!product) {
    // Render a minimal, non-animated placeholder while we confirm product availability
    return <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50" />
      </ThemeProvider>;
  }

  // CALCULAR PRECOS CORRETOS USANDO PREÇOS PERSONALIZADOS

  // 🔥 CALCULAR PREÇO FINAL DO PRODUTO PRINCIPAL (considerando preços personalizados e turmas)
  const finalProductPrice = getProductFinalPrice();
  
  console.log(`🚨 CÁLCULO DO PREÇO FINAL:`);
  console.log(`- Produto: ${product?.name}`);
  console.log(`- Preço original KZ: ${originalPriceKZ} KZ`);
  console.log(`- Turma: ${cohort?.name || 'Nenhuma'}`);
  console.log(`- Preço da turma: ${cohort?.price || 'N/A'}`);
  console.log(`- Moeda da turma: ${cohort?.currency || 'N/A'}`);
  console.log(`- País do usuário: ${userCountry?.code} (${userCountry?.currency})`);
  console.log(`- Preço final calculado: ${finalProductPrice} ${userCountry?.currency}`);
  console.log(`- Preço order bump: ${totalOrderBumpPrice} ${userCountry?.currency}`);

  // 🔥 CALCULAR TOTAL CORRETO (ambos na mesma moeda final) - incluindo desconto de cupom
  const totalPrice = Math.max(0, finalProductPrice + totalOrderBumpPrice - couponDiscount);
  console.log(`🚨 TOTAL FINAL: ${totalPrice} ${userCountry?.currency} (desconto cupom: ${couponDiscount})`);
  console.log(`Display price: ${getDisplayPrice(originalPriceKZ)}`);

  // Para compatibilidade com variáveis existentes
  const originalPrice = originalPriceKZ;
  const convertedPrice = finalProductPrice;
  const convertedTotalPrice = totalPrice;
  return <ThemeProvider forceLightMode={true}>
      
      <FacebookPixelTracker productId={productId || ''} />
      {product && <SEO title={product.seo_title && product.seo_title.trim() ? product.seo_title : `${product.name} | Kambafy`} description={product.seo_description || product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`} ogImage={product.cover || 'https://kambafy.com/kambafy-social-preview.png'} keywords={product.seo_keywords && product.seo_keywords.length > 0 ? product.seo_keywords.join(', ') : `${product.name}, comprar ${product.name}, checkout, pagamento seguro, ${product.tags?.join(', ') || ''}`} structuredData={{
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.seo_description || product.description || `Produto digital: ${product.name}`,
      "image": product.cover || 'https://kambafy.com/kambafy-social-preview.png',
      "brand": {
        "@type": "Brand",
        "name": product.fantasy_name || "Kambafy"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://pay.kambafy.com/checkout/${product.id}`,
        "priceCurrency": "AOA",
        "price": product.price,
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": product.fantasy_name || "Kambafy"
        }
      }
    }} />}
      <div className="min-h-screen bg-gray-50">
        {checkoutSettings?.countdown?.enabled && <OptimizedCountdownTimer minutes={checkoutSettings.countdown.minutes} title={checkoutSettings.countdown.title} backgroundColor={checkoutSettings.countdown.backgroundColor} textColor={checkoutSettings.countdown.textColor} />}

        {checkoutSettings?.banner?.enabled && checkoutSettings.banner.bannerImage && <OptimizedCustomBanner bannerImage={checkoutSettings.banner.bannerImage} />}

        {checkoutSettings?.spotsCounter?.enabled && (
          <OptimizedSpotsCounter 
            count={checkoutSettings.spotsCounter.currentCount} 
            title={checkoutSettings.spotsCounter.title} 
            backgroundColor={checkoutSettings.spotsCounter.backgroundColor} 
            textColor={checkoutSettings.spotsCounter.textColor}
            mode={checkoutSettings.spotsCounter.mode}
            decrementInterval={checkoutSettings.spotsCounter.decrementInterval}
          />
        )}

        <div className="bg-checkout-secure text-white py-3">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center justify-center">
                <Shield className="w-5 h-5" />
                <Check className="w-2.5 h-2.5 absolute inset-0 m-auto text-white" />
              </div>
              <span className="font-bold text-lg">{tc('checkout.trustBadges.title')}</span>
            </div>
            <CountrySelector selectedCountry={userCountry} onCountryChange={handleCountryChange} supportedCountries={supportedCountries} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Prova social com vendas reais do produto */}
          <OptimizedSocialProof settings={{
          totalSales: productTotalSales,
          position: checkoutSettings?.socialProof?.position || 'bottom-right',
          enabled: checkoutSettings?.socialProof?.enabled === true // Mostrar APENAS quando explicitamente habilitado
        }} />
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && <div className="fixed top-0 left-0 bg-red-100 p-2 text-xs z-50">
              CheckoutSettings: {checkoutSettings ? 'Loaded' : 'Not Loaded'}<br />
              SocialProof: {checkoutSettings?.socialProof?.enabled ? 'Enabled' : 'Default/Disabled'}
            </div>}

          <Card className="mb-8 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden shadow-sm">
                  <img src={getProductImage(product.cover)} alt={product.image_alt || product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">{product.name.toUpperCase()}</h2>
                  
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs sm:text-sm text-gray-600">{tc('checkout.instantDelivery')}</span>
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                    {/* Se houver turma com preço, mostrar o preço da turma com o preço original como comparativo */}
                    {cohort && cohort.price && cohort.price.trim() !== '' ? (
                      <>
                        <div className="text-xl sm:text-2xl font-bold text-green-600 whitespace-nowrap">
                          {getDisplayPrice(finalProductPrice, true)}
                        </div>
                        {/* Mostrar preço original do produto como comparativo */}
                        <div className="text-base sm:text-lg text-gray-500 line-through whitespace-nowrap">
                          {formatPrice(originalPriceKZ, userCountry, product?.custom_prices)}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Exibição normal quando não há turma */}
                        <div className={`font-bold text-green-600 whitespace-nowrap ${
                          product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price)
                            ? 'text-xl sm:text-2xl'
                            : 'text-2xl'
                        }`}>
                          {getDisplayPrice(finalProductPrice, true)}
                          {product.subscription_config?.is_subscription && (
                            <span className="text-base font-normal text-gray-500">
                              {' / '}{getSubscriptionIntervalText(
                                product.subscription_config.interval || 'month',
                                product.subscription_config.interval_count || 1
                              )}
                            </span>
                          )}
                        </div>
                        {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                          <div className="text-base sm:text-lg text-gray-500 line-through whitespace-nowrap">
                            {formatPrice(parseFloat(product.compare_at_price), userCountry, product?.custom_prices)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700 font-medium">
                  {tc('checkout.fullName')}
                </Label>
                <Input id="fullName" placeholder={tc('checkout.fullName.placeholder')} value={formData.fullName} onChange={e => handleInputChange("fullName", e.target.value)} className="h-12 border-gray-300 focus:border-green-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  {tc('checkout.email')}
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={tc('checkout.email.placeholder')} 
                  value={formData.email} 
                  onChange={e => handleInputChange("email", e.target.value)} 
                  className={`h-12 border-gray-300 focus:border-green-500 ${
                    formData.email && !validateEmail(formData.email) ? 'border-red-500' : 
                    formData.email && validateEmail(formData.email) ? 'border-green-500' : ''
                  }`} 
                />
                {formData.email && !validateEmail(formData.email) && (
                  <ValidationFeedback 
                    isValid={false}
                    message={tc('checkout.validation.emailInvalid')}
                    show={true}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  {tc('checkout.phone')} {tc('checkout.phone.required')}
                </Label>
                <PhoneInput value={formData.phone} onChange={value => handleInputChange("phone", value)} selectedCountry={formData.phoneCountry} onCountryChange={handlePhoneCountryChange} placeholder={tc('checkout.phone.placeholder')} className="h-12" />
              </div>


              <OptimizedOrderBump productId={productId || ''} position="before_payment_method" onToggle={handleOrderBumpToggle} userCountry={userCountry} formatPrice={formatPrice} resetSelection={resetOrderBumps} />

              {availablePaymentMethods.length > 0 ? <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-green-600 font-medium">
                      {tc('checkout.payWith')} {selectedPayment && <span className="text-gray-700">{getSelectedPaymentName()}</span>}
                    </span>
                    <p className="text-gray-700 font-medium">{tc('checkout.selectPayment')}</p>
                  </div>
                  
                  <div className={`grid ${getPaymentGridClasses()} gap-3`}>
                     {availablePaymentMethods.map(method => <div key={method.id} className={`cursor-pointer transition-all border rounded-xl p-3 flex flex-col items-center relative ${selectedPayment === method.id ? 'border-green-500 border-2 bg-green-50' : 'border-gray-300 hover:border-green-400'}`} onClick={async () => {
                  console.log('🔍 Método de pagamento selecionado:', method.id);
                  setSelectedPayment(method.id);
                }}>
                        {selectedPayment === method.id && <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>}
                        <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 flex items-center justify-center">
                          <img src={method.image} alt={method.name} className={`w-10 h-10 object-contain transition-all ${selectedPayment === method.id ? '' : 'opacity-60 saturate-50'}`} />
                        </div>
                        <p className="text-xs text-gray-700 text-center leading-tight">
                          {method.name}
                        </p>
                      </div>)}
                  </div>
                </div> : <div className="space-y-4">
                  <div className="text-center py-8 bg-gray-100 rounded-lg">
                    <p className="text-gray-600 font-medium">
                      {tc('checkout.noPaymentMethods')} {userCountry.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {tc('checkout.comingSoon')}
                    </p>
                  </div>
                </div>}

              <OptimizedOrderBump productId={productId || ''} position="after_payment_method" onToggle={handleOrderBumpToggle} userCountry={userCountry} formatPrice={formatPrice} resetSelection={resetOrderBumps} />

              {/* Campo de Cupom de Desconto - Collapsible */}
              {product?.id && (
                <CollapsibleCouponSection
                  productId={product.id}
                  customerEmail={formData.email || ''}
                  totalAmount={finalProductPrice + totalOrderBumpPrice}
                  currency={userCountry?.currency || 'KZ'}
                  onCouponApplied={handleCouponApplied}
                  tc={tc}
                />
              )}

              {/* Mostrar desconto aplicado */}
              {couponDiscount > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700 font-medium">{tc('checkout.discountApplied')}</span>
                    <span className="text-green-700 font-bold">
                      -{getDisplayPrice(couponDiscount, true)}
                    </span>
                  </div>
                </div>
              )}

              {/* Apple Pay removido */}

              {/* Botão de Assinatura para produtos de assinatura */}
              {product?.subscription_config?.is_subscription && product?.subscription_config?.stripe_price_id && ['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us', 'card_mz'].includes(selectedPayment) && (
                <div className="mt-6">
                  <Button
                    onClick={handleSubscriptionCheckout}
                    disabled={!formData.fullName || !formData.email || !formData.phone || processing}
                    className="w-full h-12 font-semibold bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        PROCESSANDO...
                      </div>
                    ) : (
                      <>
                        ASSINAR POR {getDisplayPrice(totalPrice, true)}
                        {product.subscription_config.interval && (
                          <span className="ml-1">
                            / {getSubscriptionIntervalText(
                              product.subscription_config.interval,
                              product.subscription_config.interval_count || 1
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Pagamento recorrente via Stripe. Pode cancelar a qualquer momento.
                  </p>
                </div>
              )}

              {/* Componente Stripe para pagamentos únicos (não assinatura) */}
              {['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us', 'card_mx', 'card_cl', 'card_mz'].includes(selectedPayment) && !(product?.subscription_config?.is_subscription && product?.subscription_config?.stripe_price_id) && <div className="mt-6">
                  <OptimizedStripeCardPayment amount={totalPrice} originalAmountKZ={originalPriceKZ} currency={userCountry.currency} productId={productId || ''} customerData={{
                name: formData.fullName,
                email: formData.email,
                phone: formData.phone
              }} paymentMethod={selectedPayment} onSuccess={handleCardPaymentSuccess} onError={handleCardPaymentError} processing={processing} setProcessing={setProcessing} displayPrice={getDisplayPrice(totalPrice, true)} convertedAmount={convertedTotalPrice} customerCountry={userCountry?.name || ''} countryCode={userCountry?.code} />
                </div>}

            </div>

            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{tc('checkout.orderSummary')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">{product?.name || tc('checkout.product')}</span>
                      <span className="font-medium text-gray-900">
                        {getDisplayPrice(finalProductPrice, true)}
                      </span>
                    </div>
                    
                    {Array.from(selectedOrderBumps.values()).map(({
                    data: bump,
                    price
                  }) => <div key={bump.id} className="flex justify-between items-center text-green-600">
                        <div className="flex-1">
                          <span className="text-sm">{bump.bump_product_name}</span>
                          {bump.discount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded ml-2">
                              -{bump.discount}%
                            </span>}
                        </div>
                        <span className="font-medium">
                          +{getOrderBumpDisplayPrice(price)}
                        </span>
                      </div>)}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">{tc('checkout.total')}</span>
                        <span className="text-2xl font-bold text-green-600">
                          {getDisplayPrice(totalPrice, true)}
                        </span>
                      </div>
                    </div>

                    {/* Reference Payment Details */}
                    {referenceData && <div className="border-t pt-4 mt-4">
                        <div className="bg-white rounded-lg p-4 space-y-4 border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-center mb-4">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                              <Check className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          
                          <div className="text-center mb-4">
                            <p className="text-gray-900 font-semibold mb-2">
                              {tc('checkout.reference.success')}
                            </p>
                            <p className="text-sm text-gray-700">
                              {tc('checkout.reference.instructions')}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">{tc('checkout.reference.entity')}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-lg text-gray-900">{referenceData.entity}</span>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                navigator.clipboard.writeText(referenceData.entity);
                                setCopiedEntity(true);
                                setTimeout(() => setCopiedEntity(false), 2000);
                              }} className="h-6 w-6 p-0">
                                    {copiedEntity ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">{tc('checkout.reference.number')}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-lg text-gray-900">{referenceData.referenceNumber}</span>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                navigator.clipboard.writeText(referenceData.referenceNumber);
                                setCopiedReference(true);
                                setTimeout(() => setCopiedReference(false), 2000);
                              }} className="h-6 w-6 p-0">
                                    {copiedReference ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg p-3 mt-4 bg-zinc-50">
                            <p className="text-sm text-sky-800">
                              Passos: <strong>Pagamentos &gt;&gt; Pagamentos de serviços &gt;&gt; Pagamentos por referência</strong>
                            </p>
                          </div>

                          <Button onClick={() => {
                        console.log('🚀 Finalizando pagamento por referência:', referenceData);
                        const params = new URLSearchParams({
                          order_id: referenceData.orderId,
                          customer_name: formData.fullName.trim(),
                          customer_email: formData.email.trim().toLowerCase(),
                          product_name: referenceData.productName,
                          amount: referenceData.amount.toString(),
                          currency: referenceData.currency,
                          product_id: productId || '',
                          seller_id: product.user_id,
                          base_product_price: product.price,
                          payment_method: 'reference',
                          status: 'pending',
                          reference_number: referenceData.referenceNumber,
                          entity: referenceData.entity,
                          due_date: referenceData.dueDate,
                          ...(orderBump && {
                            order_bump_name: orderBump.bump_product_name,
                            order_bump_price: orderBump.bump_product_price,
                            order_bump_discount: orderBump.discount.toString(),
                            order_bump_discounted_price: totalOrderBumpPrice.toString()
                          })
                        });
                        console.log('✅ Redirecionando para:', `/obrigado?${params.toString()}`);
                        navigate(`/obrigado?${params.toString()}`);
                      }} className="w-full mt-4">
                            Finalizar e continuar
                          </Button>
                        </div>
                      </div>}
                    
                    {selectedPayment === 'express' && !processing && <div className="mt-4 space-y-4">
                        {/* Instrução para pagamento express */}
                        <div className="text-left p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm font-medium text-gray-700 leading-relaxed">
                            <span className="font-semibold">ATENÇÃO:</span> Após clicar no botão <span className="font-semibold">Comprar Agora</span>
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed mt-1">
                            → abra o aplicativo Multicaixa Express, e encontre o botão → <span className="text-red-500 font-semibold">Operação por Autorizar</span> clica no botão, selecione o pagamento pendente e <span className="font-semibold">finalize o pagamento.</span>
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600">
                            Por favor, insira o número de telefone ativo do Multicaixa Express.
                          </label>
                          <PhoneInput value={expressPhone} onChange={value => setExpressPhone(value)} placeholder="9xxxxxxxx" selectedCountry="AO" allowedCountries={["AO"]} className="w-full" formatForMulticaixa={true} />
                        </div>
                      </div>}

                    {selectedPayment === 'express' && processing && <div className="mt-4 space-y-4">
                        <div className="text-center">
                          <p className="text-gray-900 font-medium text-lg mb-4">
                            Confirme o pagamento no seu telemóvel
                          </p>
                          
                          {/* Círculo de countdown */}
                          <div className="relative inline-flex items-center justify-center mb-6">
                            <svg width="200" height="200" className="transform -rotate-90">
                              {/* Círculo de fundo */}
                              <circle cx="100" cy="100" r="90" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                              {/* Círculo de progresso */}
                              <circle 
                                cx="100" 
                                cy="100" 
                                r="90" 
                                stroke={expressCountdownTime > 60 ? '#22c55e' : expressCountdownTime > 30 ? '#f59e0b' : expressCountdownTime > 10 ? '#f97316' : '#ef4444'} 
                                strokeWidth="12" 
                                fill="transparent" 
                                strokeLinecap="round" 
                                strokeDasharray={565.48} 
                                strokeDashoffset={565.48 - (565.48 * (90 - expressCountdownTime) / 90)} 
                                style={{
                                  transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease'
                                }} 
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-sm text-gray-500 mb-2">Tempo Restante</span>
                              <span className="text-4xl font-bold text-gray-900" id="countdown-timer">{expressCountdownTime}</span>
                              <span className="text-sm text-gray-500 mt-1">segundos</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600 max-w-xs mx-auto">
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">→</span>
                              Abra o <strong>Multicaixa Express</strong>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">→</span>
                              Procure por <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">→</span>
                              <strong>Confirme a transação</strong>
                            </p>
                          </div>
                        </div>
                      </div>}

                    {selectedPayment === 'reference' && !referenceData && <div className="mt-4 space-y-4">
                        <div className="text-left p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-sm font-medium text-gray-900 leading-relaxed">
                            Clique em gerar referência, copie os dados e pague pelo app do seu banco ou em qualquer ATM.
                          </p>
                        </div>
                      </div>}
                  </div>
                </CardContent>
              </Card>

              {selectedPayment === 'transfer' && <div className="mt-6">
                  <BankTransferForm totalAmount={totalPrice.toString()} currency={userCountry.currency} onPaymentComplete={async (file, bank) => {
                setBankTransferData({
                  file,
                  bank
                });
                console.log('🏦 Bank transfer proof uploaded:', {
                  fileName: file.name,
                  bank
                });
                try {
                  console.log('🏦 Starting bank transfer purchase process...');
                  // Processar compra por transferência imediatamente
                  await handleBankTransferPurchase(file, bank);
                  console.log('🏦 Bank transfer purchase completed successfully');
                } catch (error) {
                  console.error('🏦 Error in bank transfer purchase:', error);
                }
              }} disabled={processing} />
                </div>}

              {/* Mozambique Payment Form (e-Mola / M-Pesa) */}
              {['emola', 'mpesa'].includes(selectedPayment) && (
                <div className="mt-6">
                  <MozambiquePaymentForm
                    product={product}
                    customerInfo={{
                      name: formData.fullName,
                      email: formData.email,
                      phone: formData.phone
                    }}
                    amount={totalPrice}
                    currency="MZN"
                    formatPrice={getDisplayPrice}
                    selectedProvider={selectedPayment as 'emola' | 'mpesa'}
                    onPaymentComplete={(orderId) => {
                      console.log('🇲🇿 Mozambique payment reference generated:', orderId);
                      toast({
                        title: "Referência gerada!",
                        message: "Complete o pagamento no app do seu operador mobile",
                        variant: "success"
                      });
                    }}
                    orderBumpData={orderBump ? Array.from(selectedOrderBumps.values()).map(({ data }) => data) : null}
                    affiliateCode={(() => {
                      // ✅ SEMPRE capturar o código de afiliado de TODAS as fontes possíveis para Moçambique
                      const storedCode = localStorage.getItem('affiliate_code');
                      const urlParams = new URLSearchParams(window.location.search);
                      const urlCode = urlParams.get('ref');
                      const code = validatedAffiliate?.code || affiliateCode || storedCode || urlCode || null;
                      if (code) {
                        console.log('🇲🇿 Código de afiliado para Moçambique:', code);
                      }
                      return code;
                    })()}
                    affiliateCommission={validatedAffiliate?.commission_amount || null}
                    cohortId={cohortId}
                    t={(key: string) => key}
                  />
                </div>
              )}

              {!['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us', 'card_mx', 'card_cl', 'card_mz', 'transfer', 'emola', 'mpesa'].includes(selectedPayment) && availablePaymentMethods.length > 0 && !referenceData && <Button onClick={handlePurchase} disabled={!formData.fullName || !formData.email || !(selectedPayment === 'express' ? expressPhone : formData.phone) || !selectedPayment || processing} className={`w-full h-12 font-semibold relative transition-all ${!formData.fullName || !formData.email || !(selectedPayment === 'express' ? expressPhone : formData.phone) || !selectedPayment || processing ? 'bg-green-600/50 cursor-not-allowed text-white/70' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                  {processing ? <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2">
                      </div>
                      {tc('checkout.processing')}
                    </div> : selectedPayment === 'reference' ? tc('checkout.generateReference') : tc('checkout.buyNow')}
                </Button>}
            </div>
          </div>

          {checkoutSettings?.reviews?.enabled && <div className="mt-8 mb-8">
              <OptimizedFakeReviews reviews={checkoutSettings.reviews.reviews} title={checkoutSettings.reviews.title} />
            </div>}

          <div className="mt-12 text-center space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <img src="/kambafy-secure-icon.png" alt="Kambafy" className="w-16 h-16 rounded-lg" />
              <div>
                <h4 className="font-semibold text-green-600">Kambafy</h4>
                <p className="text-sm text-gray-600">{tc('checkout.allRightsReserved')}</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 max-w-2xl mx-auto">
              {tc('checkout.termsNotice')}{' '}
              <span className="text-green-600">
                {product?.fantasy_name || product?.profiles?.full_name || 'produtor'}
              </span> {tc('checkout.termsNotice2')}{' '}
              <TermsModal>
                <span className="underline cursor-pointer">{tc('checkout.termsOfUse')}</span>
              </TermsModal>,{' '}
              <PrivacyModal>
                <span className="underline cursor-pointer">{tc('checkout.privacyPolicy')}</span>
              </PrivacyModal> {tc('checkout.and')}{' '}
              <RefundPolicyModal>
                <span className="underline cursor-pointer">{tc('checkout.refundPolicy')}</span>
              </RefundPolicyModal>.
            </p>
          </div>
        </div>
      </div>
      
      {/* Live Chat AI Widget */}
      {product?.id && (
        <LiveChatWidget 
          productId={product.id}
          customerName={formData.fullName}
          customerEmail={formData.email}
        />
      )}
    </ThemeProvider>
};
export default Checkout;