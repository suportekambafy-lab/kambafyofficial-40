import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { useAbandonedPurchaseDetection } from '@/hooks/useAbandonedPurchaseDetection';
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
  const [productExtraPrice, setProductExtraPrice] = useState(0);
  const [accessExtensionPrice, setAccessExtensionPrice] = useState(0);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    phoneCountry: "AO"
  });

  const { 
    userCountry, 
    loading: geoLoading, 
    formatPrice, 
    convertPrice,
    changeCountry, 
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

  // Hook para detectar carrinhos abandonados - memoizado
  const totalAmountForDetection = useMemo(() => 
    product ? parseFloat(product.price) + productExtraPrice + accessExtensionPrice : 0, 
    [product, productExtraPrice, accessExtensionPrice]
  );

  const { markAsRecovered, hasDetected, abandonedPurchaseId } = useAbandonedPurchaseDetection({
    product,
    formData,
    totalAmount: totalAmountForDetection,
    currency: userCountry?.currency || 'KZ',
    enabled: !!product && !!formData.email && !!formData.fullName
  });

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
        } else if (['PT', 'MZ'].includes(userCountry.code)) {
          // Portugal e Moçambique usam métodos tradicionais
          return ['express', 'reference', 'transfer', 'multibanco', 'card'].includes(method.id);
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
      } else if (productData?.status === 'Rascunho') {
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

      // Buscar order bump de produto extra
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
        // Extrair custom_prices do produto do bump
        const bumpProduct = Array.isArray(productExtraData.bump_product) ? productExtraData.bump_product[0] : productExtraData.bump_product;
        let bumpProductCustomPrices: Record<string, string> = {};
        if (bumpProduct?.custom_prices && typeof bumpProduct.custom_prices === 'object') {
          bumpProductCustomPrices = bumpProduct.custom_prices as Record<string, string>;
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
        .select(`
          *,
          bump_product:products!order_bump_settings_bump_product_id_fkey(custom_prices)
        `)
        .eq('product_id', actualProductId)
        .eq('bump_category', 'access_extension')
        .eq('enabled', true)
        .maybeSingle();

      if (!accessExtensionError && accessExtensionData) {
        // Extrair custom_prices do produto do bump
        const bumpProduct = Array.isArray(accessExtensionData.bump_product) ? accessExtensionData.bump_product[0] : accessExtensionData.bump_product;
        let bumpProductCustomPrices: Record<string, string> = {};
        if (bumpProduct?.custom_prices && typeof bumpProduct.custom_prices === 'object') {
          bumpProductCustomPrices = bumpProduct.custom_prices as Record<string, string>;
        }
        
        const accessExtensionWithCustomPrices = {
          ...accessExtensionData,
          bump_product_custom_prices: bumpProductCustomPrices
        };
        
        console.log('✅ Access Extension Bump found:', accessExtensionWithCustomPrices);
        setAccessExtensionBump(accessExtensionWithCustomPrices);
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

  // Função otimizada para mudança de país
  const handleCountryChange = useCallback((countryCode: string) => {
    changeCountry(countryCode);
    const phoneCodes: Record<string, string> = {
      'AO': '+244', 'PT': '+351', 'MZ': '+258'
    };
    const phoneCode = phoneCodes[countryCode] || '+244';
    
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  }, [changeCountry]);

  // Função otimizada para order bumps
  const handleProductExtraToggle = useCallback((isSelected: boolean, bumpData: any) => {
    if (isSelected && bumpData) {
      setProductExtraBump(bumpData);
      const originalPrice = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      const discountedPriceInKZ = bumpData.discount > 0 
        ? originalPrice * (1 - bumpData.discount / 100)
        : originalPrice;
      setProductExtraPrice(discountedPriceInKZ);
    } else {
      setProductExtraPrice(0);
    }
  }, []);

  const handleAccessExtensionToggle = useCallback((isSelected: boolean, bumpData: any) => {
    if (isSelected && bumpData) {
      setAccessExtensionBump(bumpData);
      const originalPrice = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      setAccessExtensionPrice(originalPrice);
    } else {
      setAccessExtensionPrice(0);
    }
  }, []);

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
    formData,
    
    // Geolocalização
    userCountry,
    geoLoading,
    geoReady,
    formatPrice,
    convertPrice,
    
    // Afiliados
    affiliateCode,
    hasAffiliate,
    markAsValidAffiliate,
    markAsInvalidAffiliate,
    clearAffiliateCode,
    
    // Carrinho abandonado
    markAsRecovered,
    hasDetected,
    abandonedPurchaseId,
    
    // Métodos de pagamento
    availablePaymentMethods,
    
    // Funções
    handleInputChange,
    handleCountryChange,
    handleProductExtraToggle,
    handleAccessExtensionToggle,
    fetchBalanceByEmail
  };
};