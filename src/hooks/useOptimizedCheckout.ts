import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { COUNTRY_TO_CURRENCY } from '@/utils/accountCurrency';

import { getPaymentMethodsByCountry } from '@/utils/paymentMethods';

interface UseOptimizedCheckoutProps {
  productId: string;
}

export const useOptimizedCheckout = ({ productId }: UseOptimizedCheckoutProps) => {
  console.log('🔧 useOptimizedCheckout initialized - waiting for geo data before showing content');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Não iniciar como loading - carregar rápido
  const [error, setError] = useState<string>("");
  const [productNotFound, setProductNotFound] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  const [productExtraBump, setProductExtraBump] = useState<any>(null);
  const [accessExtensionBump, setAccessExtensionBump] = useState<any>(null);
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<Map<string, { data: any; price: number }>>(new Map());
  const [accessExtensionPrice, setAccessExtensionPrice] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Calculate total order bump price from all selected bumps
  const productExtraPrice = useMemo(() => {
    const allPrices = Array.from(selectedOrderBumps.values());
    const total = allPrices.reduce((sum, { price }) => sum + price, 0);
    console.log(`🔥 TOTAL ORDER BUMP PRICE CALCULATION:`, {
      selectedBumpsCount: selectedOrderBumps.size,
      allPrices: allPrices.map(({ data, price }) => ({ id: data.id, name: data.bump_product_name, price })),
      total
    });
    return total;
  }, [selectedOrderBumps]);

  // Obter código de telefone inicial baseado no país do cache
  const getInitialPhoneData = () => {
    try {
      const cachedCountry = localStorage.getItem('userCountry');
      if (cachedCountry) {
        const phoneCodes: Record<string, string> = {
          'AO': '+244', 'PT': '+351', 'MZ': '+258', 'BR': '+55', 'US': '+1',
          'ES': '+34', 'FR': '+33', 'GB': '+44', 'DE': '+49', 'IT': '+39',
          'ZA': '+27', 'CV': '+238', 'MX': '+52', 'CL': '+56'
        };
        return {
          phoneCountry: cachedCountry,
          phone: (phoneCodes[cachedCountry] || '+244') + ' '
        };
      }
    } catch {}
    return { phoneCountry: '', phone: '' };
  };

  const initialPhoneData = getInitialPhoneData();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: initialPhoneData.phone,
    phoneCountry: initialPhoneData.phoneCountry
  });

  const { 
    userCountry, 
    loading: geoLoading, 
    formatPrice, 
    convertPrice,
    changeCountry, 
    supportedCountries,
    isReady: geoReady
  } = useGeoLocation();

  const { 
    affiliateCode, 
    hasAffiliate, 
    markAsValidAffiliate, 
    markAsInvalidAffiliate,
    clearAffiliateCode 
  } = useAffiliateTracking();

  const { fetchBalanceByEmail } = useKambaPayBalance();

  // Função para obter moeda base do vendedor (derivada do país)
  const getSellerBaseCurrency = useCallback(() => {
    const sellerCountry = product?.profiles?.country;
    if (sellerCountry && COUNTRY_TO_CURRENCY[sellerCountry]) {
      console.log('💱 useOptimizedCheckout: moeda do vendedor:', COUNTRY_TO_CURRENCY[sellerCountry], 'país:', sellerCountry);
      return COUNTRY_TO_CURRENCY[sellerCountry];
    }
    return 'KZ'; // Fallback
  }, [product?.profiles?.country]);

  // Wrapper para formatPrice que passa a moeda base do produto
  const formatPriceWithProductCurrency = useCallback((priceValue: number, targetCountry?: any, customPrices?: Record<string, string>) => {
    const sourceCurrency = getSellerBaseCurrency();
    const country = targetCountry || userCountry;
    return formatPrice(priceValue, country, customPrices, sourceCurrency);
  }, [formatPrice, userCountry, getSellerBaseCurrency]);

  // Wrapper para convertPrice que passa a moeda base do produto
  const convertPriceWithProductCurrency = useCallback((priceValue: number, targetCountry?: any, customPrices?: Record<string, string>) => {
    const sourceCurrency = getSellerBaseCurrency();
    const country = targetCountry || userCountry;
    return convertPrice(priceValue, country, customPrices, sourceCurrency);
  }, [convertPrice, userCountry, getSellerBaseCurrency]);

  const totalAmountForDetection = useMemo(() => {
    if (!product) return 0;
    
    // Calcular preço do produto principal na moeda do país usando preços personalizados
    const productPriceInTargetCurrency = convertPriceWithProductCurrency(parseFloat(product.price), product?.custom_prices);
    
    // Somar order bumps (que já estão na moeda do país) - usar o cálculo atualizado
    const totalOrderBumpPrice = Array.from(selectedOrderBumps.values()).reduce((sum, { price }) => sum + price, 0);
    const total = productPriceInTargetCurrency + totalOrderBumpPrice + accessExtensionPrice;
    
    console.log(`🔥 TOTAL AMOUNT DETECTION - DEBUGGING:`, {
      productPrice: parseFloat(product.price),
      productCurrency: product?.currency,
      productPriceInTargetCurrency,
      totalOrderBumpPrice,
      selectedOrderBumpsCount: selectedOrderBumps.size,
      accessExtensionPrice,
      total,
      currency: userCountry?.currency,
      userCountry: userCountry?.code,
      productCustomPrices: product?.custom_prices,
      hasOrderBump: totalOrderBumpPrice > 0,
      hasExtension: accessExtensionPrice > 0
    });
    
    return total;
  }, [product, selectedOrderBumps, accessExtensionPrice, userCountry, convertPriceWithProductCurrency]);

  // Função memoizada para obter métodos de pagamento
  const availablePaymentMethods = useMemo(() => {
    if (!userCountry) return [];
    
    // Primeiro, verificar se o produto tem métodos de pagamento configurados
    if (product?.payment_methods && Array.isArray(product.payment_methods)) {
      const enabledMethods = product.payment_methods.filter((method: any) => method.enabled);
      
      const countryMethods = enabledMethods.filter((method: any) => {
        if (userCountry.code === 'AO') {
          // Angola usa KambaPay e métodos tradicionais
          return ['express', 'reference', 'transfer', 'kambapay'].includes(method.id);
        } else if (userCountry.code === 'PT') {
          // Portugal usa métodos tradicionais
          return ['card', 'klarna', 'multibanco', 'mbway'].includes(method.id);
        } else if (userCountry.code === 'MZ') {
          // Moçambique usa card_mz (Stripe) e métodos locais
          return ['card_mz', 'emola', 'mpesa'].includes(method.id);
        } else if (userCountry.code === 'GB') {
          // UK usa card e klarna
          return ['card_uk', 'klarna_uk'].includes(method.id);
        } else if (userCountry.code === 'US') {
          // US usa apenas card
          return ['card_us'].includes(method.id);
        } else if (userCountry.code === 'MX') {
          // México usa apenas Stripe card
          return ['card_mx'].includes(method.id);
        } else if (userCountry.code === 'CL') {
          // Chile usa apenas Stripe card
          return ['card_cl'].includes(method.id);
        }
        return false;
      });

      return countryMethods;
    }

    // Fallback: usar métodos baseados no país selecionado
    const countryMethods = getPaymentMethodsByCountry(userCountry.code);
    
    // Não há países que usam apenas Stripe
    return [];
    
    // Adicionar KambaPay a outros países
    const kambaPayMethod = {
      id: "kambapay",
      name: "KambaPay",
      image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzI1NjNFQiIvPgo8cGF0aCBkPSJNMTIgMTJIMjhWMjhIMTJWMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgMTZIMjBWMjRIMTZWMTZaIiBmaWxsPSIjMjU2M0VCIi8+CjxwYXRoIGQ9Ik0yMCAxNkgyNFYyNEgyMFYxNloiIGZpbGw9IiMyNTYzRUIiLz4KPC9zdmc+",
      enabled: true
    };
    
    return [...countryMethods, kambaPayMethod];
  }, [userCountry, product]);

  // Carregar produto com cache otimizado
  const loadProduct = useCallback(async () => {
    if (!productId) {
      setError("ID do produto não fornecido");
      setLoading(false);
      return;
    }

    try {
      setLoading(true); // Ativar loading apenas quando carregar
      console.log('Loading product by UUID:', productId);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          member_areas (
            id,
            name,
            url
          )
        `)
        .eq(isUUID ? 'id' : 'slug', productId)
        .maybeSingle();

      console.log('🔍 DEBUGGING PRODUCT QUERY RESULT:', {
        productData,
        hasCustomPrices: !!(productData?.custom_prices),
        customPricesValue: productData?.custom_prices,
        customPricesType: typeof productData?.custom_prices,
        productError
      });

      if (productError) {
        setError(`Erro ao carregar produto: ${productError.message}`);
        setTimeout(() => setProductNotFound(true), 2000);
      } else if (!productData) {
        setTimeout(() => {
          setError("Produto não encontrado");
          setProductNotFound(true);
        }, 2000);
      } else if (productData?.status === 'Rascunho' || productData?.status === 'Draft') {
        setTimeout(() => {
          setError("Este produto ainda está em desenvolvimento e não está disponível para compra");
          setProductNotFound(true);
        }, 2000);
      } else {
        console.log('🔍 ANTES DE setProduct - productData:', {
          name: productData.name,
          id: productData.id,
          hasCustomPrices: !!(productData?.custom_prices),
          customPricesValue: productData?.custom_prices,
          customPricesKeys: productData?.custom_prices ? Object.keys(productData.custom_prices) : 'N/A'
        });
        
        setProduct(productData);
        
        console.log('✅ DEPOIS DE setProduct - confirmando:', {
          productData: productData,
          customPricesConfirmation: productData?.custom_prices
        });
        
        setError("");
        setLoading(false); // Definir loading como false quando produto carregar
        
        // Aplicar SEO apenas quando necessário
        if (typeof window !== 'undefined' && productData) {
          import('@/utils/seoUtils').then(({ setProductSEO }) => {
            setProductSEO(productData);
          });
        }
      }
    } catch (error) {
      setLoading(false); // Definir loading como false em caso de erro
      setTimeout(() => {
        setError("Erro inesperado ao carregar produto");
        setProductNotFound(true);
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Carregar configurações do checkout de forma otimizada
  const loadCheckoutSettings = useCallback(async () => {
    if (!productId) return;
    
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId);
      
      let actualProductId = productId;
      if (!isUUID) {
        const { data: productData } = await supabase
          .from('products')
          .select('id')
          .eq('slug', productId)
          .maybeSingle();
        
        if (productData) {
          actualProductId = productData.id;
        }
      }
      
      // Buscar configurações do checkout
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('*')
        .eq('product_id', actualProductId)
        .maybeSingle();

      if (!error && data?.settings) {
        setCheckoutSettings(data.settings);
      }

      // Buscar order bump de produto extra com preços personalizados
      const { data: productExtraData, error: productExtraError } = await supabase
        .from('order_bump_settings')
        .select(`
          *,
          bump_product:products!order_bump_settings_bump_product_id_fkey(custom_prices)
        `)
        .eq('product_id', actualProductId)
        .eq('bump_category', 'product_extra')
        .eq('enabled', true)
        .maybeSingle();

      if (!productExtraError && productExtraData) {
        // Extrair custom_prices do produto do bump se existir
        let bumpProductCustomPrices: Record<string, string> = {};
        if (productExtraData.bump_product && productExtraData.bump_product.custom_prices) {
          bumpProductCustomPrices = productExtraData.bump_product.custom_prices as Record<string, string>;
          console.log('✅ Custom prices encontrados para product extra bump:', bumpProductCustomPrices);
        }
        
        const productExtraWithCustomPrices = {
          ...productExtraData,
          bump_product_custom_prices: bumpProductCustomPrices
        };
        
        console.log('✅ Product Extra Bump found:', productExtraWithCustomPrices);
        setProductExtraBump(productExtraWithCustomPrices);
      } else {
        console.log('❌ No Product Extra Bump found or error:', productExtraError);
      }

      // Buscar order bump de extensão de acesso
      const { data: accessExtensionData, error: accessExtensionError } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', actualProductId)
        .eq('bump_category', 'access_extension')
        .eq('enabled', true)
        .maybeSingle();

      if (!accessExtensionError && accessExtensionData) {
        console.log('✅ Access Extension Bump found:', accessExtensionData);
        setAccessExtensionBump(accessExtensionData);
      } else {
        console.log('❌ No Access Extension Bump found or error:', accessExtensionError);
      }
    } catch (error) {
      console.error('Error loading checkout settings:', error);
    }
  }, [productId]);

  // Função otimizada para atualizar form data
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Função para mudar apenas o código do telefone (NÃO muda o país do checkout)
  const handlePhoneCountryChange = useCallback((countryCode: string) => {
    const phoneCodes: Record<string, string> = {
      'AO': '+244', 'PT': '+351', 'MZ': '+258', 'BR': '+55', 'US': '+1',
      'ES': '+34', 'FR': '+33', 'GB': '+44', 'DE': '+49', 'IT': '+39',
      'ZA': '+27', 'CV': '+238', 'MX': '+52', 'CL': '+56'
    };
    const phoneCode = phoneCodes[countryCode] || '+244';
    
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  }, []);

  // Função para mudança de país do checkout (muda métodos de pagamento disponíveis)
  const handleCountryChange = useCallback((countryCode: string) => {
    changeCountry(countryCode);
    const phoneCodes: Record<string, string> = {
      'AO': '+244', 'PT': '+351', 'MZ': '+258', 'BR': '+55', 'US': '+1',
      'ES': '+34', 'FR': '+33', 'GB': '+44', 'DE': '+49', 'IT': '+39',
      'ZA': '+27', 'CV': '+238', 'MX': '+52', 'CL': '+56'
    };
    const phoneCode = phoneCodes[countryCode] || '+244';
    
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  }, [changeCountry]);

  // Função otimizada para order bumps - agora suporta múltiplos bumps
  const handleProductExtraToggle = useCallback((isSelected: boolean, bumpData: any) => {
    console.log(`🚨🚨🚨 HANDLE PRODUCT EXTRA TOGGLE - FUNCTION ENTRY:`, { 
      isSelected, 
      bumpId: bumpData?.id,
      bumpName: bumpData?.bump_product_name,
      currentMapSize: selectedOrderBumps.size,
      currentTotal: productExtraPrice
    });
    
    if (isSelected && bumpData) {
      console.log(`🚨 ADDING ORDER BUMP:`, bumpData.id);
      
      // Calcular preço considerando preços personalizados para o país do usuário
      const originalPriceKZ = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      let finalPrice = originalPriceKZ;
      
      console.log(`🚨 CALCULATING ORDER BUMP PRICE:`, {
        bumpId: bumpData.id,
        originalPriceKZ,
        hasCustomPrices: !!(bumpData.bump_product_custom_prices),
        userCountryCode: userCountry?.code,
        customPriceForCountry: bumpData.bump_product_custom_prices?.[userCountry?.code || '']
      });
      
      // SEMPRE usar preços personalizados se existirem
      if (bumpData.bump_product_custom_prices && userCountry?.code && bumpData.bump_product_custom_prices[userCountry.code]) {
        finalPrice = parseFloat(bumpData.bump_product_custom_prices[userCountry.code]);
        console.log(`🚨 USANDO PREÇO PERSONALIZADO DO ORDER BUMP: ${finalPrice} ${userCountry.currency}`);
      } else {
        // Fallback: converter KZ para moeda local
        finalPrice = convertPrice(originalPriceKZ, userCountry);
        console.log(`🚨 USANDO CONVERSÃO KZ: ${finalPrice} ${userCountry?.currency}`);
      }
      
      // Aplicar desconto ao preço final
      const discountedPrice = bumpData.discount > 0 
        ? finalPrice * (1 - bumpData.discount / 100)
        : finalPrice;
      
      console.log(`🔥 Order bump final price: ${discountedPrice} ${userCountry?.currency}`);
      
      // Adicionar ao mapa de order bumps selecionados
      setSelectedOrderBumps(prev => {
        const newMap = new Map(prev);
        newMap.set(bumpData.id, { data: bumpData, price: discountedPrice });
        console.log(`🔥 ADDING BUMP TO MAP:`, {
          bumpId: bumpData.id,
          bumpName: bumpData.bump_product_name,
          price: discountedPrice,
          totalBumpsAfterAdd: newMap.size,
          allBumpsInMap: Array.from(newMap.entries()).map(([id, { data, price }]) => ({ id, name: data.bump_product_name, price }))
        });
        return newMap;
      });
      
      // Para compatibilidade com o código existente, definir o primeiro bump como principal
      if (!productExtraBump) {
        setProductExtraBump(bumpData);
      }
    } else if (!isSelected && bumpData) {
      console.log(`🔥 REMOVING ORDER BUMP:`, bumpData.id);
      
      // Remover do mapa de order bumps selecionados
      setSelectedOrderBumps(prev => {
        const newMap = new Map(prev);
        const wasRemoved = newMap.delete(bumpData.id);
        console.log(`🔥 REMOVING BUMP FROM MAP:`, {
          bumpId: bumpData.id,
          bumpName: bumpData.bump_product_name,
          wasRemoved,
          remainingBumps: newMap.size,
          allBumpsInMap: Array.from(newMap.entries()).map(([id, { data, price }]) => ({ id, name: data.bump_product_name, price }))
        });
        return newMap;
      });
      
      // Se era o bump principal, limpar
      if (productExtraBump && productExtraBump.id === bumpData.id) {
        setProductExtraBump(null);
      }
    }
  }, [userCountry, convertPrice, productExtraBump]);

  const handleAccessExtensionToggle = useCallback((isSelected: boolean, bumpData: any) => {
    if (isSelected && bumpData) {
      setAccessExtensionBump(bumpData);
      
      // Calcular preço considerando preços personalizados para extensões de acesso
      const originalPriceKZ = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      let finalPrice = originalPriceKZ;
      
      // Verificar se há preços personalizados para o país atual
      if (bumpData.bump_product_custom_prices && userCountry?.code && bumpData.bump_product_custom_prices[userCountry.code]) {
        const customPrice = parseFloat(bumpData.bump_product_custom_prices[userCountry.code]);
        if (!isNaN(customPrice)) {
          // Use o preço personalizado na moeda local
          finalPrice = customPrice;
          console.log(`💰 Access extension usando preço personalizado: ${customPrice} ${userCountry.currency} (original: ${originalPriceKZ} KZ)`);
        }
      } else {
        // Se não há preço personalizado, converter o preço KZ para a moeda local
        if (userCountry && userCountry.currency !== 'KZ') {
          finalPrice = originalPriceKZ / userCountry.exchangeRate;
        }
      }
      
      console.log(`💰 Access extension final price: ${finalPrice} ${userCountry?.currency}`);
      setAccessExtensionPrice(finalPrice);
    } else {
      setAccessExtensionPrice(0);
    }
  }, [userCountry]);

  // Effect otimizado - carregamento rápido
  useEffect(() => {
    if (!productId) return;

    const initializeCheckout = async () => {
      console.log('🚀 Starting fast checkout initialization...');
      
      // Carregar produto imediatamente (sem esperar geo)
      console.log('⚡ Loading product immediately...');
      await loadProduct();
      
      // Carregar configurações do checkout
      const timeout = setTimeout(() => {
        loadCheckoutSettings();
      }, 100);
      
      return () => clearTimeout(timeout);
    };
    
    initializeCheckout();
  }, [productId, loadProduct, loadCheckoutSettings]);

  // Otimização secundária - quando geo estiver pronto, preços se atualizam automaticamente
  useEffect(() => {
    if (geoReady && product) {
      console.log('🎯 Geo ready - prices will update smoothly');
      // Os preços são atualizados automaticamente via userCountry nos componentes
    }
  }, [geoReady, product]);

  // Definir phoneCountry com base no país detectado - sempre sincronizar quando geo muda
  useEffect(() => {
    if (geoReady && userCountry) {
      const phoneCodes: Record<string, string> = {
        'AO': '+244', 'PT': '+351', 'MZ': '+258', 'BR': '+55', 'US': '+1',
        'ES': '+34', 'FR': '+33', 'GB': '+44', 'DE': '+49', 'IT': '+39',
        'ZA': '+27', 'CV': '+238', 'MX': '+52', 'CL': '+56'
      };
      const expectedPhoneCode = phoneCodes[userCountry.code] || '+244';
      
      // Verificar se precisa atualizar (country mudou ou phone não corresponde ao country)
      const currentPhoneCode = formData.phone.split(' ')[0];
      const isPhoneOutOfSync = formData.phoneCountry !== userCountry.code || 
                               (currentPhoneCode && currentPhoneCode !== expectedPhoneCode);
      
      if (!formData.phoneCountry || isPhoneOutOfSync) {
        console.log('🌍 Syncing phone with detected country:', userCountry.code, expectedPhoneCode);
        setFormData(prev => ({
          ...prev,
          phoneCountry: userCountry.code,
          phone: expectedPhoneCode + " "
        }));
      }
    }
  }, [geoReady, userCountry?.code]);

  // Handler para aplicar cupom
  const handleCouponApplied = useCallback((coupon: any, discountAmount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discountAmount);
    console.log('💰 Coupon applied:', { coupon, discountAmount });
  }, []);

  return {
    // Estado
    product,
    loading,
    error,
    productNotFound,
    checkoutSettings,
    productExtraBump,
    accessExtensionBump,
    productExtraPrice,
    accessExtensionPrice,
    selectedOrderBumps,
    formData,
    
    // Cupom
    appliedCoupon,
    couponDiscount,
    handleCouponApplied,
    
    // Geolocalização - com wrappers que respeitam moeda do produto
    userCountry,
    geoLoading,
    geoReady,
    formatPrice: formatPriceWithProductCurrency,
    convertPrice: convertPriceWithProductCurrency,
    supportedCountries,
    
    // Afiliados
    affiliateCode,
    hasAffiliate,
    markAsValidAffiliate,
    markAsInvalidAffiliate,
    clearAffiliateCode,
    
    // Métodos de pagamento
    availablePaymentMethods,
    
    // Funções
    handleInputChange,
    handleCountryChange,
    handlePhoneCountryChange,
    handleProductExtraToggle,
    handleAccessExtensionToggle,
    fetchBalanceByEmail
  };
};