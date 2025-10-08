import { useEffect, useRef } from 'react';

interface PaymentMethod {
  id: string;
  icon?: any;
  image?: string;
}

export const usePaymentMethodPrefetch = (
  paymentMethods: PaymentMethod[],
  hoveredMethod: string | null
) => {
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hoveredMethod) return;

    // Prefetch do método em hover se ainda não foi prefetched
    const method = paymentMethods.find(m => m.id === hoveredMethod);
    if (method && !prefetchedRef.current.has(hoveredMethod)) {
      prefetchedRef.current.add(hoveredMethod);

      // Prefetch images
      if (method.image) {
        const img = new Image();
        img.src = method.image;
      }

      // Prefetch specific payment method scripts
      if (hoveredMethod === 'stripe' || hoveredMethod === 'card') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        link.href = 'https://js.stripe.com/v3/';
        document.head.appendChild(link);
      }
    }
  }, [hoveredMethod, paymentMethods]);

  // Prefetch do primeiro método automaticamente
  useEffect(() => {
    if (paymentMethods.length > 0 && !prefetchedRef.current.has(paymentMethods[0].id)) {
      const firstMethod = paymentMethods[0];
      prefetchedRef.current.add(firstMethod.id);

      if (firstMethod.image) {
        const img = new Image();
        img.src = firstMethod.image;
      }
    }
  }, [paymentMethods]);
};
