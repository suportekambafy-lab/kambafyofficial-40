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
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [productNotFound, setProductNotFound] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  const [orderBump, setOrderBump] = useState<any>(null);
  const [orderBumpPrice, setOrderBumpPrice] = useState(0);

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
    product ? parseFloat(product.price) + orderBumpPrice : 0, 
    [product, orderBumpPrice]
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
          return ['express', 'reference', 'transfer', 'kambapay'].includes(method.id);
        } else if (userCountry.code === 'MZ') {
          return ['emola', 'epesa', 'kambapay'].includes(method.id);
        } else if (userCountry.code === 'PT') {
          return ['card', 'klarna', 'multibanco', 'apple_pay', 'kambapay'].includes(method.id);
        }
        return false;
      });

      return countryMethods;
    }

    // Fallback: usar métodos baseados no país selecionado
    const countryMethods = getPaymentMethodsByCountry(userCountry.code);
    
    // Adicionar KambaPay a todos os países
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
        setProduct(productData);
        setError("");
        
        // Aplicar SEO apenas quando necessário
        if (typeof window !== 'undefined' && productData) {
          import('@/utils/seoUtils').then(({ setProductSEO }) => {
            setProductSEO(productData);
          });
        }
      }
    } catch (error) {
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
      
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('*')
        .eq('product_id', actualProductId)
        .maybeSingle();

      if (!error && data?.settings) {
        setCheckoutSettings(data.settings);
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
      'AO': '+244', 'PT': '+351', 'MZ': '+258', 'BR': '+55',
      'US': '+1', 'GB': '+44', 'ES': '+34', 'FR': '+33',
      'IT': '+39', 'DE': '+49', 'CV': '+238', 'ST': '+239'
    };
    const phoneCode = phoneCodes[countryCode] || '+244';
    
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  }, [changeCountry]);

  // Função otimizada para order bump
  const handleOrderBumpToggle = useCallback((isSelected: boolean, bumpData: any) => {
    if (isSelected && bumpData) {
      setOrderBump(bumpData);
      const originalPrice = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      const discountedPriceInKZ = bumpData.discount > 0 
        ? originalPrice * (1 - bumpData.discount / 100)
        : originalPrice;
      setOrderBumpPrice(discountedPriceInKZ);
    } else {
      setOrderBump(null);
      setOrderBumpPrice(0);
    }
  }, []);

  // Effect otimizado para carregar dados
  useEffect(() => {
    if (productId) {
      loadProduct();
      // Delay para carregamento das configurações
      const timeout = setTimeout(() => {
        loadCheckoutSettings();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [productId, loadProduct, loadCheckoutSettings]);

  return {
    // Estado
    product,
    loading,
    error,
    productNotFound,
    checkoutSettings,
    orderBump,
    orderBumpPrice,
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
    handleOrderBumpToggle,
    fetchBalanceByEmail
  };
};