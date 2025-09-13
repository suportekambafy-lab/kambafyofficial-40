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
import { AbandonedCartIndicator } from "@/components/AbandonedCartIndicator";
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

// Componente otimizado do header do produto
const ProductHeader = memo(({ product, formatPrice, userCountry }: any) => {
  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) return cover;
    if (cover.includes('supabase') || cover.startsWith('http')) return cover;
    return `https://images.unsplash.com/${cover}`;
  };

  const getDisplayPrice = (priceInKZ: number): string => {
    // Sempre mostrar preço para evitar flash
    return formatPrice(priceInKZ);
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
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">100% Seguro</span>
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

  // Hook otimizado centralizado
  const {
    product,
    loading,
    error,
    productNotFound,
    checkoutSettings,
    orderBump,
    orderBumpPrice,
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
    markAsRecovered,
    hasDetected,
    abandonedPurchaseId,
    availablePaymentMethods: productPaymentMethods,
    handleInputChange,
    handleCountryChange,
    handleOrderBumpToggle,
    fetchBalanceByEmail
  } = useOptimizedCheckout({ productId: productId || '' });

  // Hook para métodos de pagamento específicos por país
  console.log('🚨 ANTES DE CHAMAR usePaymentMethods:', userCountry?.code, productPaymentMethods?.length);
  const { availablePaymentMethods: countryPaymentMethods } = usePaymentMethods(userCountry?.code, productPaymentMethods);
  console.log('🚨 DEPOIS DE CHAMAR usePaymentMethods:', countryPaymentMethods?.length);

  // FORÇA MÉTODOS DE CARTÃO PARA PAÍSES ESPECÍFICOS (Argentina, España, US)
  const cardOnlyCountries = ['AR', 'ES', 'US'];
  const isCardOnlyCountry = cardOnlyCountries.includes(userCountry?.code || '');
  
  const finalPaymentMethods = isCardOnlyCountry ? [{
    id: 'card_international',
    name: 'Cartão Internacional (Stripe)',
    image: '/payment-logos/card-logo.png',
    enabled: true
  }] : (countryPaymentMethods || productPaymentMethods || []);
  
  console.log('🎯 FINAL PAYMENT METHODS:', {
    userCountry: userCountry?.code,
    isCardOnly: isCardOnlyCountry,
    finalMethods: finalPaymentMethods.map(m => m.id),
    length: finalPaymentMethods.length
  });

  console.log('🛒 Checkout Debug Info:', {
    userCountry: userCountry?.code,
    isCardOnlyCountry,
    countryPaymentMethods: countryPaymentMethods?.map(m => m.id) || [],
    productPaymentMethods: productPaymentMethods?.length || 0,
    geoReady,
    selectedPayment
  });

  // FORÇA EXECUÇÃO DO HOOK - SEMPRE
  console.log('🚨 CHECKOUT - País detectado:', userCountry?.code);
  console.log('🚨 CHECKOUT - Product methods length:', productPaymentMethods?.length);
  console.log('🚨 CHECKOUT - É país apenas cartão?', isCardOnlyCountry);
  console.log('🚨 CHECKOUT - Métodos disponíveis:', countryPaymentMethods?.length, countryPaymentMethods?.map(m => m.id));
  console.log('🚨 CHECKOUT - Método selecionado:', selectedPayment);
  
  // FORÇA RE-CALL DO HOOK se necessário
  const forceCardMethods = userCountry?.code === 'US' && (!countryPaymentMethods || countryPaymentMethods.length === 0);
  if (forceCardMethods) {
    console.log('🚨 FORÇANDO CARTÃO PARA US - hook não retornou métodos');
  }

  // Detectar se estamos no US e forçar cartão se necessário
  const forceCardForUS = userCountry?.code === 'US';
  if (forceCardForUS && countryPaymentMethods.length === 0) {
    console.log('🚨 FORCING CARD METHOD FOR US');
  }

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

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

          {/* Order Bump - Antes dos métodos de pagamento */}
          {checkoutSettings?.orderBump?.enabled && (
            <Suspense fallback={<div />}>
              <OptimizedOrderBump
                productId={productId || ''}
                position="before_payment_method"
                onToggle={handleOrderBumpToggle}
                userCountry={userCountry}
                formatPrice={formatPrice}
              />
            </Suspense>
          )}

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
                            MZ: { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿', exchangeRate: 0.096 },
                            AR: { code: 'AR', name: 'Argentina', currency: 'ARS', flag: '🇦🇷', exchangeRate: 0.85 },
                            ES: { code: 'ES', name: 'Espanha', currency: 'EUR', flag: '🇪🇸', exchangeRate: 0.0015 },
                            US: { code: 'US', name: 'Estados Unidos', currency: 'USD', flag: '🇺🇸', exchangeRate: 0.0011 }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">{isTranslationReady ? t('form.phone') : 'Telefone'}</Label>
                        <PhoneInput
                          value={formData.phone}
                          onChange={(value) => handleInputChange('phone', value)}
                          selectedCountry={formData.phoneCountry}
                          onCountryChange={(country) => handleInputChange('phoneCountry', country)}
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
                      <div><strong>É país apenas cartão:</strong> {isCardOnlyCountry ? 'SIM' : 'NÃO'}</div>
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

                  {/* Renderização condicional dos componentes de pagamento */}
                  {selectedPayment && finalPaymentMethods.find(m => m.id === selectedPayment) && (
                    <div className="mt-6">
                      {/* Stripe para países específicos (Argentina, Espanha, Estados Unidos) */}
                      {isCardOnlyCountry && (selectedPayment === 'card_international' || selectedPayment === 'card') && (
                        <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded"></div>}>
                          <StripePaymentForm
                            product={product}
                            customerInfo={formData}
                            amount={convertPrice(parseFloat(product?.price || '0') + orderBumpPrice)}
                            currency={userCountry?.currency || 'KZ'}
                            formatPrice={(amount) => {
                              // Para Stripe, formatear na moeda local
                              if (userCountry?.currency === 'ARS') {
                                return `$${amount.toFixed(2)} ARS`;
                              } else if (userCountry?.currency === 'USD') {
                                return `$${amount.toFixed(2)} USD`;
                              } else if (userCountry?.currency === 'EUR') {
                                return `€${amount.toFixed(2)}`;
                              }
                              return formatPrice(amount);
                            }}
                            isSubmitting={processing}
                            setIsSubmitting={setProcessing}
                            t={isTranslationReady ? t : undefined}
                          />
                        </Suspense>
                      )}

                      {/* Métodos tradicionais para outros países */}
                      {!isCardOnlyCountry && ['card', 'klarna', 'multibanco', 'apple_pay'].includes(selectedPayment) && (
                        <Suspense fallback={<div />}>
                          <StripeCardPayment
                            paymentMethod={selectedPayment}
                            amount={parseFloat(product?.price || '0') + orderBumpPrice}
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
                            displayPrice={formatPrice(parseFloat(product?.price || '0') + orderBumpPrice)}
                            convertedAmount={convertPrice(parseFloat(product?.price || '0') + orderBumpPrice)}
                          />
                        </Suspense>
                      )}

                      {/* KambaPay para Angola */}
                      {!isCardOnlyCountry && selectedPayment === 'kambapay' && (
                        <Suspense fallback={<div />}>
                          <KambaPayCheckoutOption
                            productPrice={parseFloat(product?.price || '0') + orderBumpPrice}
                            currency={userCountry?.currency}
                            onPaymentSuccess={() => {/* lógica de sucesso */}}
                            onSelect={() => {}}
                            selected={true}
                          />
                        </Suspense>
                      )}
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

          {/* Indicador de carrinho abandonado */}
          <AbandonedCartIndicator 
            hasDetected={hasDetected}
            abandonedPurchaseId={abandonedPurchaseId}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};

ProductHeader.displayName = 'ProductHeader';
PaymentMethods.displayName = 'PaymentMethods';

export default memo(OptimizedCheckout);