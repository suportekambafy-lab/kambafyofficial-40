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
import { useOptimizedCheckout } from "@/hooks/useOptimizedCheckout";
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

// Componente StripeCardPayment importado normalmente (mais complexo para otimizar)
const StripeCardPayment = lazy(() => import('@/components/checkout/StripeCardPayment'));
const KambaPayCheckoutOption = lazy(() => 
  import('@/components/KambaPayCheckoutOption').then(module => ({ default: module.KambaPayCheckoutOption }))
);

// Componente otimizado do header do produto
const ProductHeader = memo(({ product, formatPrice }: any) => {
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
  userCountry 
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
        Método de Pagamento
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
    availablePaymentMethods,
    handleInputChange,
    handleCountryChange,
    handleOrderBumpToggle,
    fetchBalanceByEmail
  } = useOptimizedCheckout({ productId: productId || '' });

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Estados de carregamento e erro
  if (loading) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner text="Carregando informações do produto..." size="lg" />
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <OptimizedContainer error={error} className="text-center">
            <Button onClick={() => window.location.reload()} className="mt-4">
              Tentar novamente
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
          <OptimizedContainer empty emptyMessage="Produto não encontrado">
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
          <ProductHeader 
            product={product}
            formatPrice={formatPrice}
          />

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
                {/* Informações do cliente */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">Informações de Cobrança</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Nome Completo *</Label>
                      <Input
                        id="fullName"
                        placeholder="Digite seu nome completo"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Digite seu email"
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
                      <Label htmlFor="phone">Telefone</Label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => handleInputChange('phone', value)}
                        selectedCountry={formData.phoneCountry}
                        onCountryChange={(country) => handleInputChange('phoneCountry', country)}
                      />
                    </div>
                  </div>
                </div>

                {/* Métodos de pagamento */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">Pagamento</h2>
                  
                  <PaymentMethods
                    availablePaymentMethods={availablePaymentMethods}
                    selectedPayment={selectedPayment}
                    setSelectedPayment={setSelectedPayment}
                    userCountry={userCountry}
                  />

                  {/* Renderização condicional dos componentes de pagamento */}
                  {selectedPayment && ['card', 'klarna', 'multibanco', 'apple_pay'].includes(selectedPayment) && (
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

                  {selectedPayment === 'kambapay' && (
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