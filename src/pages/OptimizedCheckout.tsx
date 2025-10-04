import { memo, useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Check, AlertTriangle, CheckCircle, Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { FacebookPixelTracker } from "@/components/FacebookPixelTracker";
import { useToast } from "@/hooks/use-toast";
import { PhoneInput } from "@/components/PhoneInput";
import { SEO } from "@/components/SEO";
import { BankTransferForm } from "@/components/checkout/BankTransferForm";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";
import { useOptimizedCheckout } from "@/hooks/useOptimizedCheckout";
import { useTranslation } from "@/hooks/useTranslation";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { OptimizedContainer } from "@/components/ui/optimized-containers";
import professionalManImage from "@/assets/professional-man.jpg";
import { supabase } from "@/integrations/supabase/client";

// Lazy load componentes pesados apenas quando necessário
const OptimizedCustomBanner = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedCustomBanner }))
);
const OptimizedCountdownTimer = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedCountdownTimer }))
);
const OptimizedFakeReviews = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedFakeReviews }))
);
const OptimizedSocialProof = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedSocialProof }))
);
const OptimizedSpotsCounter = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedSpotsCounter }))
);
const OptimizedOrderBump = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedOrderBump }))
);
const OptimizedProductHeader = lazy(() => 
  import('@/components/checkout/OptimizedCheckoutComponents').then(m => ({ default: m.OptimizedProductHeader }))
);

// Componente StripeCardPayment importado normalmente (mais complexo para otimizar)
const StripeCardPayment = lazy(() => import('@/components/checkout/StripeCardPayment'));
const KambaPayCheckoutOption = lazy(() => 
  import('@/components/KambaPayCheckoutOption').then(module => ({ default: module.KambaPayCheckoutOption }))
);
const ApplePayModal = lazy(() => 
  import('@/components/checkout/ApplePayModal').then(module => ({ default: module.ApplePayModal }))
);

// Componente otimizado do header do produto
const ProductHeader = memo(({ product, formatPrice, userCountry }: any) => {
  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) return cover;
    if (cover.includes('supabase') || cover.startsWith('http')) return cover;
    return `https://images.unsplash.com/${cover}`;
  };

  const getDisplayPrice = (priceInKZ: number): string => {
    // Debug logs para verificar se os preços personalizados estão funcionando
    console.log('🛒 CHECKOUT DEBUG:', {
      priceInKZ,
      userCountry: userCountry?.code,
      userCountryName: userCountry?.name,
      productName: product?.name,
      customPrices: product?.custom_prices,
      customPricesType: typeof product?.custom_prices,
      hasCustomPrices: !!(product?.custom_prices && Object.keys(product?.custom_prices).length > 0),
      productId: product?.id
    });
    
    // Sempre mostrar preço para evitar flash
    return formatPrice(priceInKZ, userCountry, product?.custom_prices);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <img
            src={getProductImage(product.cover)}
            alt={product.name}
            className="w-full h-48 md:h-64 object-cover rounded-lg"
          />
        </div>
        <div className="w-full md:w-2/3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-checkout-secure" />
            <span className="text-xs text-checkout-secure font-medium">100% Seguro</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {product.name}
          </h1>
          <p className="text-gray-600 mb-6 line-clamp-3">
            {product.description}
          </p>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold text-primary">
              {getDisplayPrice(parseFloat(product.price))}
            </span>
            {product.sales && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">{product.sales} vendas</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Componente otimizado dos métodos de pagamento
const PaymentMethods = memo(({ 
  availablePaymentMethods, 
  selectedPayment, 
  setSelectedPayment,
  userCountry,
  t,
  isTranslationReady
}: any) => {
  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="mb-6">
      <Label className="text-base font-semibold mb-4 block">
        {isTranslationReady ? t('payment.title') : 'Método de Pagamento'}
      </Label>
      <div className={`grid ${getPaymentGridClasses()} gap-3`}>
        {availablePaymentMethods.map((method: any) => (
          <div
            key={method.id}
            onClick={() => setSelectedPayment(method.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedPayment === method.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <img
                src={method.image}
                alt={method.name}
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium text-center">
                {method.name}
              </span>
              {method.id === 'express' && (
                <span className="text-xs text-green-600 font-medium">
                  Via AppyPay
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Componente principal otimizado
const OptimizedCheckout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { t, isTranslationReady } = useTranslation();
  
  const [selectedPayment, setSelectedPayment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [kambaPayEmailError, setKambaPayEmailError] = useState<string | null>(null);
  const [bankTransferData, setBankTransferData] = useState<{file: File, bank: string} | null>(null);
  const [applePayModalOpen, setApplePayModalOpen] = useState(false);

  // Hook otimizado centralizado
  const {
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
    userCountry,
    geoLoading,
    geoReady,
    formatPrice,
    convertPrice,
    affiliateCode,
    hasAffiliate,
    markAsValidAffiliate,
    markAsInvalidAffiliate,
    clearAffiliateCode,
    availablePaymentMethods: productPaymentMethods,
    handleInputChange,
    handleCountryChange,
    handlePhoneCountryChange,
    handleProductExtraToggle,
    handleAccessExtensionToggle,
    fetchBalanceByEmail
  } = useOptimizedCheckout({ productId: productId || '' });

  console.log('🔍 HOOK RETORNOU PRODUCT:', {
    productName: product?.name,
    productId: product?.id,
    hasCustomPrices: !!(product?.custom_prices),
    customPricesValue: product?.custom_prices,
    customPricesType: typeof product?.custom_prices,
    customPricesKeys: product?.custom_prices ? Object.keys(product.custom_prices) : 'N/A',
    fullProduct: product
  });

  // Hook para métodos de pagamento específicos por país
  console.log('🚨 ANTES DE CHAMAR usePaymentMethods:', userCountry?.code, productPaymentMethods?.length);
  const { availablePaymentMethods: countryPaymentMethods } = usePaymentMethods(userCountry?.code, productPaymentMethods);
  console.log('🚨 DEPOIS DE CHAMAR usePaymentMethods:', countryPaymentMethods?.length);

  // Usar métodos normais para todos os países suportados
  const finalPaymentMethods = countryPaymentMethods || productPaymentMethods || [];
  
  console.log('🎯 FINAL PAYMENT METHODS:', {
    userCountry: userCountry?.code,
    finalMethods: finalPaymentMethods.map(m => m.id),
    length: finalPaymentMethods.length
  });

  console.log('🛒 Checkout Debug Info:', {
    userCountry: userCountry?.code,
    countryPaymentMethods: countryPaymentMethods?.map(m => m.id) || [],
    productPaymentMethods: productPaymentMethods?.length || 0,
    geoReady,
    selectedPayment
  });

  // FORÇA EXECUÇÃO DO HOOK - SEMPRE
  console.log('🚨 CHECKOUT - País detectado:', userCountry?.code);
  console.log('🚨 CHECKOUT - Product methods length:', productPaymentMethods?.length);
  console.log('🚨 CHECKOUT - Métodos disponíveis:', countryPaymentMethods?.length, countryPaymentMethods?.map(m => m.id));
  console.log('🚨 CHECKOUT - Método selecionado:', selectedPayment);

  // Detectar se estamos no US e forçar cartão se necessário
  const forceCardForUS = userCountry?.code === 'US';
  if (forceCardForUS && countryPaymentMethods.length === 0) {
    console.log('🚨 FORCING CARD METHOD FOR US');
  }

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Abrir modal do Apple Pay quando selecionado
  useEffect(() => {
    if (selectedPayment === 'apple_pay' && formData.fullName && formData.email && formData.phone) {
      setApplePayModalOpen(true);
    }
  }, [selectedPayment, formData.fullName, formData.email, formData.phone]);

  // Auto-selecionar primeiro método de pagamento disponível
  useEffect(() => {
    console.log('🎯 Payment method auto-selection effect triggered');
    console.log('🎯 Available methods:', finalPaymentMethods.length, finalPaymentMethods.map(m => m.id));
    console.log('🎯 Current selected payment:', selectedPayment);
    
    if (finalPaymentMethods.length > 0 && !selectedPayment) {
      console.log('🎯 Auto-selecting first payment method:', finalPaymentMethods[0].id);
      setSelectedPayment(finalPaymentMethods[0].id);
    }
  }, [finalPaymentMethods, selectedPayment]);

  // Mostrar skeleton checkout enquanto carrega - sem tela branca
  const showingSkeleton = loading || !product;

  // Skeleton components para carregamento imediato
  const SkeletonProductHeader = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <div className="w-full h-48 md:h-64 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
        <div className="w-full md:w-2/3">
          <div className="h-4 bg-gray-200 animate-pulse rounded mb-4 w-24"></div>
          <div className="h-8 bg-gray-200 animate-pulse rounded mb-4 w-3/4"></div>
          <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 w-full"></div>
          <div className="h-4 bg-gray-200 animate-pulse rounded mb-6 w-2/3"></div>
          <div className="h-10 bg-gray-200 animate-pulse rounded w-32"></div>
        </div>
      </div>
    </div>
  );

  const SkeletonPaymentMethods = () => (
    <div className="mb-6">
      <div className="h-6 bg-gray-200 animate-pulse rounded mb-4 w-40"></div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="p-4 border-2 border-gray-200 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonForm = () => (
    <div className="space-y-4">
      <div>
        <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 w-24"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 w-16"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 w-12"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 w-20"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded w-full"></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <OptimizedContainer error={error} className="text-center">
            <Button onClick={() => window.location.reload()} className="mt-4">
              {isTranslationReady ? t('button.loading') : 'Tentar novamente'}
            </Button>
          </OptimizedContainer>
        </div>
      </ThemeProvider>
    );
  }

  if (!product && productNotFound) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <OptimizedContainer empty emptyMessage={isTranslationReady ? t('error.load') : 'Produto não encontrado'}>
            <div></div>
          </OptimizedContainer>
        </div>
      </ThemeProvider>
    );
  }

  // Estados especiais do produto
  if (product?.status === 'Inativo') {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Oferta Expirada</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Infelizmente, esta oferta não está mais disponível.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider forceLightMode={true}>
      <div className="min-h-screen bg-gray-50">
        <SEO 
          title={`${product?.name} - Checkout`}
          description={`Finalize sua compra: ${product?.name}`}
        />
        
        <FacebookPixelTracker productId={productId || ''} />

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Banner customizado - lazy load */}
          {checkoutSettings?.banner?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedCustomBanner bannerImage={checkoutSettings.banner.bannerImage} />
            </Suspense>
          )}

          {/* Timer countdown - lazy load */}
          {checkoutSettings?.countdown?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedCountdownTimer 
                minutes={checkoutSettings.countdown.timeInMinutes || 30}
                title={checkoutSettings.countdown.message}
                backgroundColor={checkoutSettings.countdown.backgroundColor}
                textColor={checkoutSettings.countdown.textColor}
              />
            </Suspense>
          )}

          {/* Contador de Vagas - lazy load */}
          {checkoutSettings?.spotsCounter?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedSpotsCounter 
                count={checkoutSettings.spotsCounter.currentCount}
                title={checkoutSettings.spotsCounter.title}
                backgroundColor={checkoutSettings.spotsCounter.backgroundColor}
                textColor={checkoutSettings.spotsCounter.textColor}
                mode={checkoutSettings.spotsCounter.mode}
                decrementInterval={checkoutSettings.spotsCounter.decrementInterval}
              />
            </Suspense>
          )}

          {/* Header do produto */}
          {showingSkeleton ? (
            <SkeletonProductHeader />
          ) : (
            <Suspense fallback={<SkeletonProductHeader />}>
              <OptimizedProductHeader 
                product={product}
                formatPrice={formatPrice}
                userCountry={userCountry}
                t={t}
              />
            </Suspense>
          )}

          {/* Order Bumps ANTES dos métodos de pagamento */}
          {(productExtraBump?.position === 'before_payment_method' || accessExtensionBump?.position === 'before_payment_method') && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Produto Extra Order Bump - Before Payment */}
                  {productExtraBump?.position === 'before_payment_method' && (
                    <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="productExtraBump"
                            onChange={(e) => {
                              console.log(`🔥 CHECKBOX CLICKED - BEFORE:`, e.target.checked);
                              handleProductExtraToggle(e.target.checked, productExtraBump);
                              console.log(`🔥 CHECKBOX CLICKED - AFTER:`, e.target.checked);
                            }}
                            className="mt-1"
                          />
                        <div className="flex-1">
                           <label htmlFor="productExtraBump" className="font-medium text-blue-900 dark:text-blue-100 cursor-pointer">
                             {productExtraBump.title} - {formatPrice(parseFloat(productExtraBump.bump_product_price), userCountry, productExtraBump.bump_product_custom_prices)}
                           </label>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {productExtraBump.bump_product_name}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {productExtraBump.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Extensão de Acesso Order Bump - Before Payment */}
                  {accessExtensionBump?.position === 'before_payment_method' && (
                    <div className="p-4 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="accessExtensionBump"
                          onChange={(e) => handleAccessExtensionToggle(e.target.checked, accessExtensionBump)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                           <label htmlFor="accessExtensionBump" className="font-medium text-orange-900 dark:text-orange-100 cursor-pointer">
                             {accessExtensionBump.bump_product_name} - {formatPrice(parseFloat(accessExtensionBump.bump_product_price))}
                           </label>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            {accessExtensionBump.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* DEBUG: Order Bumps Info */}
          <div className="bg-green-100 p-4 text-sm mb-4 rounded border-2 border-green-400">
            <div className="font-bold text-green-800 mb-2">🔍 DEBUG - Order Bumps:</div>
            <div className="text-green-700 space-y-1">
              <div><strong>Product Extra Bump:</strong> {productExtraBump ? `✅ ${productExtraBump.title}` : '❌ Não encontrado'}</div>
              <div><strong>Access Extension Bump:</strong> {accessExtensionBump ? `✅ ${accessExtensionBump.title}` : '❌ Não encontrado'}</div>
              <div><strong>Product Extra Position:</strong> {productExtraBump?.position || 'N/A'}</div>
              <div><strong>Access Extension Position:</strong> {accessExtensionBump?.position || 'N/A'}</div>
            </div>
          </div>

          {/* Formulário principal */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-6">{isTranslationReady ? t('form.title') : 'Informações de Cobrança'}</h2>
                  
                  {showingSkeleton ? (
                    <SkeletonForm />
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">{isTranslationReady ? t('form.name') : 'Nome Completo'} *</Label>
                        <Input
                          id="fullName"
                          placeholder={isTranslationReady ? t('form.name.placeholder') : 'Digite seu nome completo'}
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">{isTranslationReady ? t('form.email') : 'Email'} *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={isTranslationReady ? t('form.email.placeholder') : 'Digite seu email'}
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label>País</Label>
                        <CountrySelector 
                          selectedCountry={userCountry || { 
                            code: 'AO', 
                            name: 'Angola', 
                            currency: 'KZ', 
                            flag: '🇦🇴',
                            exchangeRate: 1 
                          }}
                          onCountryChange={handleCountryChange}
                          supportedCountries={{
                            AO: { code: 'AO', name: 'Angola', currency: 'KZ', flag: '🇦🇴', exchangeRate: 1 },
                            PT: { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹', exchangeRate: 0.0015 },
                            MZ: { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿', exchangeRate: 0.096 }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">{isTranslationReady ? t('form.phone') : 'Telefone'}</Label>
                        <PhoneInput
                          value={formData.phone}
                          onChange={(value) => handleInputChange('phone', value)}
                          selectedCountry={formData.phoneCountry}
                          onCountryChange={handlePhoneCountryChange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Métodos de pagamento - FORÇADO A APARECER */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">{isTranslationReady ? t('payment.title') : 'Pagamento'}</h2>
                  
                  <PaymentMethods
                    availablePaymentMethods={finalPaymentMethods}
                    selectedPayment={selectedPayment}
                    setSelectedPayment={setSelectedPayment}
                    userCountry={userCountry}
                    t={t}
                    isTranslationReady={isTranslationReady}
                  />
                  
                  {/* DEBUG: Mostrar info dos métodos - SEMPRE VISÍVEL */}
                  <div className="bg-yellow-100 p-4 text-sm mt-4 rounded border-2 border-yellow-400">
                    <div className="font-bold text-yellow-800 mb-2">🔍 DEBUG - Informações de Pagamento:</div>
                    <div className="text-yellow-700 space-y-1">
                      <div><strong>País detectado:</strong> {userCountry?.code || 'Não detectado'}</div>
                      <div><strong>Métodos padrão aplicados</strong></div>
                      <div><strong>Métodos disponíveis:</strong> {finalPaymentMethods?.length || 0}</div>
                      <div><strong>Lista de métodos:</strong> {finalPaymentMethods?.map(m => m.id).join(', ') || 'Nenhum'}</div>
                      <div><strong>Método selecionado:</strong> {selectedPayment || 'Nenhum'}</div>
                      <div><strong>Product methods:</strong> {productPaymentMethods?.length || 0}</div>
                      <div><strong>Geo ready:</strong> {geoReady ? 'SIM' : 'NÃO'}</div>
                      <div><strong>Skeleton?:</strong> {showingSkeleton ? 'SIM' : 'NÃO'}</div>
                      <div><strong>Loading:</strong> {loading ? 'SIM' : 'NÃO'}</div>
                      <div><strong>Product exists:</strong> {product ? 'SIM' : 'NÃO'}</div>
                    </div>
                  </div>

                  {/* Order Bumps DEPOIS dos métodos de pagamento */}
                  {(productExtraBump?.position === 'after_payment_method' || accessExtensionBump?.position === 'after_payment_method') && (
                    <Card className="mt-6 mb-6">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Produto Extra Order Bump - After Payment */}
                          {productExtraBump?.position === 'after_payment_method' && (
                            <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950">
                              <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id="productExtraBumpAfter"
                                    onChange={(e) => {
                                      console.log(`🔥 CHECKBOX AFTER CLICKED - BEFORE:`, e.target.checked);
                                      handleProductExtraToggle(e.target.checked, productExtraBump);
                                      console.log(`🔥 CHECKBOX AFTER CLICKED - AFTER:`, e.target.checked);
                                    }}
                                    className="mt-1"
                                  />
                                <div className="flex-1">
                                  <label htmlFor="productExtraBumpAfter" className="font-medium text-blue-900 dark:text-blue-100 cursor-pointer">
                                    {productExtraBump.title} - {formatPrice(parseFloat(productExtraBump.bump_product_price), userCountry, productExtraBump.bump_product_custom_prices)}
                                  </label>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    {productExtraBump.bump_product_name}
                                  </p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {productExtraBump.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Extensão de Acesso Order Bump - After Payment */}
                          {accessExtensionBump?.position === 'after_payment_method' && (
                            <div className="p-4 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  id="accessExtensionBumpAfter"
                                  onChange={(e) => handleAccessExtensionToggle(e.target.checked, accessExtensionBump)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <label htmlFor="accessExtensionBumpAfter" className="font-medium text-orange-900 dark:text-orange-100 cursor-pointer">
                                    {accessExtensionBump.bump_product_name} - {formatPrice(parseFloat(accessExtensionBump.bump_product_price))}
                                  </label>
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                    {accessExtensionBump.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Renderização condicional dos componentes de pagamento */}
                  {selectedPayment && finalPaymentMethods.find(m => m.id === selectedPayment) && (
                    <div className="mt-6">
                      {/* Métodos tradicionais para Portugal e Moçambique */}
                      {!['AO'].includes(userCountry?.code || '') && ['card', 'klarna', 'multibanco'].includes(selectedPayment) && (
                        <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded"></div>}>
                          <StripeCardPayment
                            paymentMethod={selectedPayment}
                            originalAmountKZ={parseFloat(product?.price || '0')}
                              amount={(() => {
                                console.log(`🔥 CALCULATING FINAL STRIPE AMOUNT:`);
                                
                                // Use custom prices directly instead of converting KZ
                                let productPrice = parseFloat(product?.price || '0');
                                if (product?.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
                                  productPrice = parseFloat(product.custom_prices[userCountry.code]);
                                  console.log(`💰 Using custom product price: ${productPrice} ${userCountry?.currency}`);
                                } else {
                                  productPrice = convertPrice(productPrice, userCountry, product?.custom_prices);
                                  console.log(`💰 Using converted product price: ${productPrice} ${userCountry?.currency}`);
                                }
                                
                                const total = productPrice + productExtraPrice + accessExtensionPrice;
                                
                                   console.log(`🔥 STRIPE AMOUNT CALCULATION - DEBUGGING:`, {
                                     productPriceOriginal: parseFloat(product?.price || '0'),
                                     productPriceFinal: productPrice,
                                     orderBumpPrice: productExtraPrice,
                                     extensionPrice: accessExtensionPrice,
                                     total,
                                     currency: userCountry?.currency,
                                     userCountryCode: userCountry?.code,
                                     productCustomPrices: product?.custom_prices,
                                     productExtraBump: productExtraBump ? {
                                       title: productExtraBump.title,
                                       price: productExtraBump.bump_product_price,
                                       customPrices: productExtraBump.bump_product_custom_prices
                                     } : null,
                                     isOrderBumpSelected: !!productExtraPrice
                                   });
                                 
                                 return total;
                              })()}
                            currency={userCountry?.currency || 'KZ'}
                            customerData={{ 
                              name: formData.fullName,
                              email: formData.email,
                              phone: formData.phone
                            }}
                            onSuccess={() => {/* lógica de sucesso */}}
                            onError={(error) => console.error(error)}
                            productId={productId || ''}
                            processing={processing}
                            setProcessing={setProcessing}
                              displayPrice={(() => {
                                // Calcular o valor total considerando preços personalizados
                                const productPriceInTargetCurrency = convertPrice(parseFloat(product?.price || '0'), userCountry, product?.custom_prices);
                                const total = productPriceInTargetCurrency + productExtraPrice + accessExtensionPrice;
                                
                                console.log(`🔥 DISPLAY PRICE CALCULATION - DEBUGGING:`, {
                                  productPriceOriginal: parseFloat(product?.price || '0'),
                                  productPrice: productPriceInTargetCurrency,
                                  orderBumpPrice: productExtraPrice,
                                  extensionPrice: accessExtensionPrice,
                                  total,
                                  currency: userCountry?.currency,
                                  userCountryCode: userCountry?.code,
                                  productCustomPrices: product?.custom_prices
                                });
                                
                                return formatPrice(total, userCountry);
                              })()}
                              convertedAmount={(() => {
                                console.log(`🔥 CALCULATING STRIPE TOTAL:`);
                                
                                // Use custom prices directly
                                let productPrice = parseFloat(product?.price || '0');
                                if (product?.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
                                  productPrice = parseFloat(product.custom_prices[userCountry.code]);
                                } else {
                                  productPrice = convertPrice(productPrice, userCountry, product?.custom_prices);
                                }
                                
                                const total = productPrice + productExtraPrice + accessExtensionPrice;
                                
                                console.log(`🔥 STRIPE TOTAL CALCULATION - DEBUGGING:`, {
                                  productPriceOriginal: parseFloat(product?.price || '0'),
                                  productPriceFinal: productPrice,
                                  orderBumpPrice: productExtraPrice,
                                  extensionPrice: accessExtensionPrice,
                                  total,
                                  currency: userCountry?.currency,
                                  userCountryCode: userCountry?.code,
                                  productCustomPrices: product?.custom_prices
                                });
                                
                                return total;
                              })()}
                          />
                        </Suspense>
                      )}
                      
                      {/* Formulário para Multicaixa Express */}
                      {selectedPayment === 'express' && (
                        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                          <div className="text-center">
                            <p className="text-sm font-medium text-blue-900">
                              ATENÇÃO: Após clicar no botão <strong>Comprar Agora</strong>
                            </p>
                            <p className="text-sm text-blue-800">
                              → abra o aplicativo Multicaixa Express, e encontre o botão → <span className="text-red-600 font-bold">Operação por Autorizar</span> clica no botão, selecione o pagamento pendente e <strong>finalize o pagamento.</strong>
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Por favor, insira o número de telefone ativo do Multicaixa Express.
                            </label>
                            <PhoneInput
                              value={formData.phone}
                              onChange={(value) => handleInputChange('phone', value)}
                              placeholder="9xxxxxxxx"
                              selectedCountry="AO"
                              className="w-full"
                              formatForMulticaixa={true}
                            />
                            <p className="text-sm text-red-600">Telefone é obrigatório</p>
                          </div>
                          
                          <Button 
                            onClick={async () => {
                              if (processing) return;
                              
                              if (!formData.fullName || !formData.email || !formData.phone) {
                                toast({
                                  title: "Dados obrigatórios",
                                  description: "Por favor, preencha todos os campos obrigatórios.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // First, test AppyPay credentials before showing countdown
                              try {
                                console.log('🔍 Testing AppyPay credentials before payment...');
                                
                                const credentialsTest = await supabase.functions.invoke('create-appypay-charge', {
                                  body: {
                                    amount: 1, // Test with minimal amount
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

                                if (credentialsTest.error || (credentialsTest.data && !credentialsTest.data.success)) {
                                  console.error('❌ AppyPay credentials test failed:', credentialsTest);
                                  
                                  toast({
                                    title: "Sistema indisponível",
                                    description: "O pagamento Multicaixa Express está temporariamente indisponível. Contacte o suporte.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                console.log('✅ AppyPay credentials validated, proceeding with payment...');
                                
                              } catch (credError) {
                                console.error('❌ Credentials test error:', credError);
                                toast({
                                  title: "Sistema indisponível", 
                                  description: "O pagamento Multicaixa Express está temporariamente indisponível. Contacte o suporte.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              setProcessing(true);
                              
                              try {
                                const finalPrice = parseFloat(product?.price || '0') + productExtraPrice + accessExtensionPrice;
                                
                                console.log('🚀 Starting AppyPay payment:', {
                                  finalPrice,
                                  productId: product?.id,
                                  customerData: {
                                    name: formData.fullName,
                                    email: formData.email,
                                    phone: formData.phone
                                  }
                                });
                                
                                const appyPayResponse = await supabase.functions.invoke('create-appypay-charge', {
                                  body: {
                                    amount: finalPrice,
                                    productId: product?.id,
                                    customerData: {
                                      name: formData.fullName,
                                      email: formData.email,
                                      phone: formData.phone
                                    },
                                    originalAmount: finalPrice,
                                    originalCurrency: 'AOA',
                                    paymentMethod: 'express',
                                    phoneNumber: formData.phone
                                  }
                                });

                                console.log('📡 AppyPay response:', appyPayResponse);

                                if (appyPayResponse.error) {
                                  console.error('❌ AppyPay function error:', appyPayResponse.error);
                                  
                                  // Stop processing immediately on function error
                                  setProcessing(false);
                                  
                                  toast({
                                    title: "Erro de configuração",
                                    description: "Sistema de pagamento temporariamente indisponível. Contacte o suporte.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                const result = appyPayResponse.data;
                                console.log('📊 AppyPay result:', result);
                                
                                if (!result) {
                                  console.error('❌ No data in AppyPay response');
                                  setProcessing(false);
                                  toast({
                                    title: "Erro no pagamento",
                                    description: "Resposta inválida do sistema de pagamento.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                if (result.success) {
                                  console.log('✅ AppyPay payment initiated:', result);
                                  
                                  // Start polling for payment status
                                  let pollAttempts = 0;
                                  const maxPollAttempts = 18; // Poll for up to 90 seconds (18 * 5 seconds)
                                  
                                  const pollInterval = setInterval(async () => {
                                    pollAttempts++;
                                    console.log(`🔍 Polling attempt ${pollAttempts}/${maxPollAttempts} for order ${result.order_id}`);
                                    
                                    try {
                                      const { data: orderStatus, error: pollError } = await supabase
                                        .from('orders')
                                        .select('status')
                                        .eq('order_id', result.order_id)
                                        .single();
                                      
                                      if (pollError) {
                                        console.error('❌ Error polling order status:', pollError);
                                        return;
                                      }
                                      
                                      console.log('📊 Current order status:', orderStatus?.status);
                                      
                                      if (orderStatus?.status === 'completed') {
                                        clearInterval(pollInterval);
                                        setProcessing(false);
                                        console.log('✅ Pagamento Express confirmado!');
                                        
                                        toast({
                                          title: "Pagamento Aprovado!",
                                          description: "Seu pagamento foi confirmado com sucesso.",
                                          variant: "default",
                                        });
                                        
                                        // Redirecionar imediatamente com parâmetro indicando confirmação Express
                                        navigate(`/checkout-success/${product?.id}?orderId=${result.order_id}&method=appypay&express_confirmed=true`);
                                      } else if (pollAttempts >= maxPollAttempts) {
                                        clearInterval(pollInterval);
                                        setProcessing(false);
                                        console.log('⏱️ Polling timeout após 90 segundos - pagamento não confirmado');
                                        toast({
                                          title: "Tempo Esgotado",
                                          description: "Não conseguimos confirmar seu pagamento. Por favor, verifique no app Multicaixa Express e aguarde o email de confirmação.",
                                        });
                                      }
                                    } catch (pollError) {
                                      console.error('💥 Polling error:', pollError);
                                    }
                                  }, 5000); // Poll every 5 seconds
                                  
                                  setProcessing(false);
                                } else {
                                  console.error('❌ AppyPay payment failed:', result);
                                  setProcessing(false);
                                  
                                  // Handle specific error codes
                                  let errorMessage = result.error || "Não foi possível processar o pagamento.";
                                  if (result.code === 'INVALID_CREDENTIALS' || result.code === 'MISSING_CREDENTIALS') {
                                    errorMessage = "Sistema de pagamento temporariamente indisponível. Contacte o suporte.";
                                  }
                                  
                                  toast({
                                    title: "Erro no pagamento",
                                    description: errorMessage,
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error('💥 AppyPay processing error:', error);
                                setProcessing(false);
                                toast({
                                  title: "Erro inesperado",
                                  description: "Ocorreu um erro inesperado. Tente novamente.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={processing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {processing ? "Processando..." : "Comprar Agora"}
                          </Button>
                        </div>
                      )}
                      
                      {/* Para outros métodos tradicionais (transfer) */}
                      {['transfer'].includes(selectedPayment) && (
                        <div className="text-center text-sm text-muted-foreground">
                          Método de pagamento selecionado: {finalPaymentMethods.find(m => m.id === selectedPayment)?.name}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* KambaPay para Angola */}
                  {userCountry?.code === 'AO' && selectedPayment === 'kambapay' && (
                    <Suspense fallback={<div />}>
                      <KambaPayCheckoutOption
                        productPrice={parseFloat(product?.price || '0') + productExtraPrice + accessExtensionPrice}
                        currency={userCountry?.currency}
                        onPaymentSuccess={() => {/* lógica de sucesso */}}
                        onSelect={() => {}}
                        selected={true}
                      />
                    </Suspense>
                  )}

                  {/* Apple Pay com Modal do Stripe */}
                  {selectedPayment === 'apple_pay' && (
                    <div className="mt-6">
                      <Card className="border-2 border-blue-500">
                        <CardContent className="p-6">
                          <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-2">
                              <Shield className="w-5 h-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">Pagamento com Apple Pay</h3>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                              Clique no botão abaixo para abrir o formulário de pagamento seguro do Apple Pay
                            </p>

                            <Button
                              onClick={() => {
                                if (!formData.fullName || !formData.email || !formData.phone) {
                                  toast({
                                    title: "Dados obrigatórios",
                                    description: "Por favor, preencha todos os campos obrigatórios antes de prosseguir.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setApplePayModalOpen(true);
                              }}
                              className="w-full"
                              size="lg"
                            >
                              <Wallet className="w-5 h-5 mr-2" />
                              Pagar com Apple Pay
                            </Button>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Pagamento seguro processado pelo Stripe</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews falsas - lazy load */}
          {checkoutSettings?.reviews?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedFakeReviews 
                reviews={checkoutSettings.reviews.fakeReviews || []}
                title={checkoutSettings.reviews.title}
              />
            </Suspense>
          )}

          {/* Social proof - lazy load */}
          {checkoutSettings?.socialProof?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedSocialProof settings={checkoutSettings.socialProof} />
            </Suspense>
          )}

        </div>
      </div>

      {/* Apple Pay Modal */}
      {selectedPayment === 'apple_pay' && (
        <Suspense fallback={<div />}>
          <ApplePayModal
            open={applePayModalOpen}
            onOpenChange={setApplePayModalOpen}
            convertedAmount={(() => {
              let productPrice = parseFloat(product?.price || '0');
              if (product?.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
                productPrice = parseFloat(product.custom_prices[userCountry.code]);
              } else {
                productPrice = convertPrice(productPrice, userCountry, product?.custom_prices);
              }
              return productPrice + productExtraPrice + accessExtensionPrice;
            })()}
            originalAmountKZ={parseFloat(product?.price || '0')}
            currency={userCountry?.currency || 'USD'}
            productId={productId || ''}
            customerData={{
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone
            }}
            onSuccess={(paymentIntent) => {
              console.log('Apple Pay payment successful:', paymentIntent);
              toast({
                title: "Pagamento aprovado!",
                description: "Seu pagamento foi processado com sucesso.",
              });
              navigate(`/checkout-success?order_id=${paymentIntent.id}`);
            }}
            onError={(error) => {
              console.error('Apple Pay error:', error);
              toast({
                title: "Erro no pagamento",
                description: error,
                variant: "destructive",
              });
            }}
          />
        </Suspense>
      )}
    </ThemeProvider>
  );
};

ProductHeader.displayName = 'ProductHeader';
PaymentMethods.displayName = 'PaymentMethods';

export default memo(OptimizedCheckout);