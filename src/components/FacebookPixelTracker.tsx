import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    _fbPixelsInitialized?: Record<string, boolean>;
  }
}

interface FacebookPixelTrackerProps {
  productId: string;
  productUserId?: string;
}

interface PurchaseEventDetail {
  amount: number;
  currency: string;
  customer?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
  orderId?: string;
}

export const FacebookPixelTracker = ({ productId, productUserId }: FacebookPixelTrackerProps) => {
  const pixelIdsRef = useRef<string[]>([]);
  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(productUserId || null);

  const generateEventId = useCallback(() => uuidv4(), []);

  const fetchProductInfo = useCallback(async () => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId);
      
      const { data: product, error } = await supabase
        .from('products')
        .select('id, user_id')
        .eq(isUUID ? 'id' : 'slug', productId)
        .single();

      if (error || !product) {
        console.error('❌ [FB PIXEL] Product not found:', error);
        return null;
      }

      userIdRef.current = product.user_id;
      return { userId: product.user_id, productUUID: product.id };
    } catch (error) {
      console.error('❌ [FB PIXEL] Error fetching product:', error);
      return null;
    }
  }, [productId]);

  useEffect(() => {
    const initializePixels = async () => {
      if (!productId || initializedRef.current) return;

      console.log('🔍 [FB PIXEL] Fetching settings for product:', productId);

      const productInfo = await fetchProductInfo();
      if (!productInfo) return;

      const { userId, productUUID } = productInfo;
      userIdRef.current = userId;

      try {
        const { data: pixels, error } = await supabase
          .from('facebook_pixel_settings')
          .select('pixel_id')
          .eq('product_id', productUUID)
          .eq('enabled', true);

        if (error) {
          console.error('❌ [FB PIXEL] Error fetching pixel settings:', error);
          return;
        }

        const pixelIds = (pixels || []).map(p => p.pixel_id).filter(Boolean);
        pixelIdsRef.current = pixelIds;

        if (pixelIds.length === 0) {
          console.log('ℹ️ [FB PIXEL] No active pixels found for this product');
          return;
        }

        console.log(`✅ [FB PIXEL] ${pixelIds.length} pixel(s) found:`, pixelIds);

        // Aguardar fbq estar disponível
        const waitForFbq = (): Promise<boolean> => {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
              attempts++;
              if (typeof window.fbq === 'function') {
                resolve(true);
                return;
              }
              if (attempts >= maxAttempts) {
                resolve(false);
                return;
              }
              setTimeout(check, 100);
            };
            check();
          });
        };

        const fbqReady = await waitForFbq();
        
        if (!fbqReady) {
          console.error('❌ [FB PIXEL] fbq not available');
          return;
        }

        initializedRef.current = true;
        
        if (!window._fbPixelsInitialized) {
          window._fbPixelsInitialized = {};
        }

        // Inicializar e trackear para cada pixel
        pixelIds.forEach(pixelId => {
          try {
            if (!window._fbPixelsInitialized[pixelId]) {
              window._fbPixelsInitialized[pixelId] = true;
              window.fbq('init', pixelId);
              console.log('✅ [FB PIXEL] init() for:', pixelId);
            }

            // Usar trackSingle para garantir que o evento vai para o pixel específico
            const pageEventId = generateEventId();
            window.fbq('trackSingle', pixelId, 'PageView', {}, { eventID: pageEventId });
            console.log('✅ [FB PIXEL] PageView tracked for pixel:', pixelId);
          } catch (e) {
            console.error('❌ [FB PIXEL] Error:', e);
          }
        });

        // ViewContent com delay
        setTimeout(() => {
          if (typeof window.fbq !== 'function') return;
          pixelIds.forEach(pixelId => {
            const eventId = generateEventId();
            window.fbq('trackSingle', pixelId, 'ViewContent', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: eventId });
          });
          console.log('✅ [FB PIXEL] ViewContent tracked');
        }, 500);

        // InitiateCheckout com delay maior
        setTimeout(() => {
          if (typeof window.fbq !== 'function') return;
          pixelIds.forEach(pixelId => {
            const eventId = generateEventId();
            window.fbq('trackSingle', pixelId, 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: eventId });
          });
          console.log('✅ [FB PIXEL] InitiateCheckout tracked');
        }, 1500);

      } catch (error) {
        console.error('❌ [FB PIXEL] Unexpected error:', error);
      }
    };

    initializePixels();
  }, [productId, fetchProductInfo, generateEventId]);

  useEffect(() => {
    const handlePurchase = async (event: CustomEvent<PurchaseEventDetail>) => {
      const { amount, currency, customer, orderId } = event.detail || {};
      const purchaseEventId = generateEventId();
      
      console.log('🛒 [FB PIXEL] Purchase event:', { amount, currency, orderId });

      if (typeof window.fbq === 'function' && pixelIdsRef.current.length > 0) {
        pixelIdsRef.current.forEach(pixelId => {
          window.fbq('trackSingle', pixelId, 'Purchase', {
            content_ids: [productId],
            content_type: 'product',
            value: amount || 0,
            currency: currency || 'KZ'
          }, { eventID: purchaseEventId });
        });
        console.log('✅ [FB PIXEL] Purchase tracked');
      }

      try {
        const productInfo = await fetchProductInfo();
        const userId = userIdRef.current || productInfo?.userId;
        
        if (!userId) return;

        await supabase.functions.invoke('send-facebook-conversion', {
          body: {
            productId,
            userId,
            eventId: purchaseEventId,
            eventName: 'Purchase',
            value: amount || 0,
            currency: currency || 'KZ',
            orderId: orderId || null,
            customer: customer || {}
          }
        });
        console.log('✅ [FB PIXEL] Server event sent');
      } catch (err) {
        console.error('❌ [FB PIXEL] Server event error:', err);
      }
    };

    window.addEventListener('purchase-completed', handlePurchase as EventListener);
    return () => window.removeEventListener('purchase-completed', handlePurchase as EventListener);
  }, [productId, generateEventId, fetchProductInfo]);

  return null;
};
