import { lazy, Suspense, memo } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

OptimizedSuspenseWrapper.displayName = 'OptimizedSuspenseWrapper';
OptimizedCustomBanner.displayName = 'OptimizedCustomBanner';
OptimizedCountdownTimer.displayName = 'OptimizedCountdownTimer';
OptimizedFakeReviews.displayName = 'OptimizedFakeReviews';
OptimizedSocialProof.displayName = 'OptimizedSocialProof';
OptimizedOrderBump.displayName = 'OptimizedOrderBump';
OptimizedStripeCardPayment.displayName = 'OptimizedStripeCardPayment';