import { lazy, Suspense, memo } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/PhoneInput';
import professionalManImage from '@/assets/professional-man.jpg';

// Lazy load apenas componentes pesados que podem não ser necessários
const CustomBanner = lazy(() => import('./CustomBanner'));
const CountdownTimer = lazy(() => import('./CountdownTimer'));
const FakeReviews = lazy(() => import('./FakeReviews'));
const SocialProof = lazy(() => import('./SocialProof'));
const OrderBump = lazy(() => import('./OrderBump').then(module => ({ default: module.OrderBump })));
const StripeCardPayment = lazy(() => import('./StripeCardPayment'));

// Wrapper otimizado com suspense
const OptimizedSuspenseWrapper = memo(({ 
  children, 
  fallback = <div className="h-20 flex items-center justify-center"><LoadingSpinner size="sm" /></div> 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
));

// Componentes otimizados memoizados
export const OptimizedCustomBanner = memo(({ bannerImage }: { bannerImage?: string }) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <CustomBanner bannerImage={bannerImage} />
  </OptimizedSuspenseWrapper>
));

export const OptimizedCountdownTimer = memo(({ 
  minutes, 
  title, 
  backgroundColor, 
  textColor 
}: { 
  minutes: number; 
  title?: string;
  backgroundColor?: string;
  textColor?: string;
}) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <CountdownTimer
      minutes={minutes}
      title={title}
      backgroundColor={backgroundColor}
      textColor={textColor}
    />
  </OptimizedSuspenseWrapper>
));

export const OptimizedFakeReviews = memo(({ reviews, title }: { reviews: any[]; title?: string }) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <FakeReviews reviews={reviews} title={title} />
  </OptimizedSuspenseWrapper>
));

export const OptimizedSocialProof = memo(({ settings }: { settings: any }) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <SocialProof
      totalSales={settings?.totalSales}
      position={settings?.position}
      enabled={settings?.enabled}
    />
  </OptimizedSuspenseWrapper>
));

export const OptimizedOrderBump = memo(({ 
  productId, 
  position, 
  onToggle, 
  userCountry, 
  formatPrice 
}: { 
  productId: string; 
  position: "before_payment_method" | "after_payment_method" | "after_customer_info"; 
  onToggle: (isSelected: boolean, bumpData: any) => void;
  userCountry: any;
  formatPrice: (price: number) => string;
}) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <OrderBump
      productId={productId}
      position={position}
      onToggle={onToggle}
      userCountry={userCountry}
      formatPrice={formatPrice}
    />
  </OptimizedSuspenseWrapper>
));

export const OptimizedStripeCardPayment = memo((props: any) => (
  <OptimizedSuspenseWrapper fallback={<div />}>
    <StripeCardPayment {...props} />
  </OptimizedSuspenseWrapper>
));

// Componentes traduzidos
export const OptimizedProductHeader = memo(({ product, formatPrice, t }: any) => {
  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) return cover;
    if (cover.includes('supabase') || cover.startsWith('http')) return cover;
    return `https://images.unsplash.com/${cover}`;
  };

  const getDisplayPrice = (priceInKZ: number): string => {
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
            <span className="text-xs text-green-600 font-medium">
              {t('payment.secure')}
            </span>
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
                <span className="text-sm text-gray-600">{product.sales} {t('product.sales')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const OptimizedOrderForm = memo(({ customerInfo, setCustomerInfo, isSubmitting, t }: any) => {
  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('form.title')}</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">{t('form.name')} *</Label>
            <Input
              id="fullName"
              placeholder={t('form.name.placeholder')}
              value={customerInfo.fullName || ''}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="email">{t('form.email')} *</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('form.email.placeholder')}
              value={customerInfo.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="phone">{t('form.phone')}</Label>
            <PhoneInput
              value={customerInfo.phone || ''}
              onChange={(value) => handleInputChange('phone', value)}
              selectedCountry={customerInfo.phoneCountry}
              onCountryChange={(country) => handleInputChange('phoneCountry', country)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const OptimizedPaymentMethods = memo(({ 
  product,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  customerInfo,
  isSubmitting,
  onSubmit,
  formatPrice,
  orderBumpSettings,
  includeOrderBump,
  setIncludeOrderBump,
  checkoutCustomizations,
  t
}: any) => {
  const availablePaymentMethods = product?.payment_methods || [];
  
  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.fullName || !customerInfo.email || !selectedPaymentMethod) {
      return;
    }
    onSubmit();
  };

  const calculateTotal = () => {
    let total = parseFloat(product?.price || '0');
    if (includeOrderBump && orderBumpSettings?.bump_product_price) {
      total += parseFloat(orderBumpSettings.bump_product_price);
    }
    return total;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('payment.title')}</h2>
        
        {/* Order Bump */}
        {orderBumpSettings && (
          <div className="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="orderBump"
                checked={includeOrderBump}
                onChange={(e) => setIncludeOrderBump(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="orderBump" className="font-medium text-gray-900 cursor-pointer">
                  {t('orderbump.title')} - {formatPrice(parseFloat(orderBumpSettings.bump_product_price))}
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  {orderBumpSettings.bump_product_name}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Methods */}
        <div className="mb-6">
          <div className={`grid ${getPaymentGridClasses()} gap-3`}>
            {availablePaymentMethods.map((method: any) => (
              <div
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedPaymentMethod === method.id
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

        {/* Total and Submit */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(calculateTotal())}
            </span>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !customerInfo.fullName || !customerInfo.email || !selectedPaymentMethod}
            className="w-full h-12 text-lg font-semibold"
          >
            {isSubmitting ? t('button.loading') : t('button.buy')}
          </Button>
          
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">{t('payment.secure')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedSuspenseWrapper.displayName = 'OptimizedSuspenseWrapper';
OptimizedCustomBanner.displayName = 'OptimizedCustomBanner';
OptimizedCountdownTimer.displayName = 'OptimizedCountdownTimer';
OptimizedFakeReviews.displayName = 'OptimizedFakeReviews';
OptimizedSocialProof.displayName = 'OptimizedSocialProof';
OptimizedOrderBump.displayName = 'OptimizedOrderBump';
OptimizedStripeCardPayment.displayName = 'OptimizedStripeCardPayment';
OptimizedProductHeader.displayName = 'OptimizedProductHeader';
OptimizedOrderForm.displayName = 'OptimizedOrderForm';
OptimizedPaymentMethods.displayName = 'OptimizedPaymentMethods';