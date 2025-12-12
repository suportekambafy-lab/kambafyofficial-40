import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    _fbPixelsInitialized?: Record<string, boolean>;
    _fbEventsTracked?: Record<string, boolean>;
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

// Valida se é um Pixel ID válido (15-16 dígitos numéricos)
const isValidPixelId = (pixelId: string): boolean => {
  if (!pixelId) return false;
  const cleaned = String(pixelId).trim();
  return /^\d{15,16}$/.test(cleaned);
};

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
      // Evitar inicialização duplicada se o SEO loader já fez
      if (!productId || initializedRef.current) return;
      
      // Verificar se já foi inicializado pelo SEO loader
      if (window._fbPixelsInitialized && Object.keys(window._fbPixelsInitialized).length > 0) {
        console.log('ℹ️ [FB PIXEL React] Pixels already initialized by SEO loader');
        initializedRef.current = true;
        
        // Ainda precisamos buscar os pixel IDs para o Purchase event
        const productInfo = await fetchProductInfo();
        if (!productInfo) return;

        const { productUUID } = productInfo;
        
        const { data: pixels } = await supabase
          .from('facebook_pixel_settings')
          .select('pixel_id')
          .eq('product_id', productUUID)
          .eq('enabled', true);

        pixelIdsRef.current = (pixels || [])
          .map(p => p.pixel_id)
          .filter(isValidPixelId);
        
        return;
      }

      console.log('🔍 [FB PIXEL React] Initializing pixels for product:', productId);

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

        // Filtrar apenas Pixel IDs válidos
        const validPixelIds = (pixels || [])
          .map(p => p.pixel_id)
          .filter(isValidPixelId);
        
        pixelIdsRef.current = validPixelIds;

        if (validPixelIds.length === 0) {
          console.log('ℹ️ [FB PIXEL] No valid pixels found for this product');
          return;
        }

        console.log(`✅ [FB PIXEL] ${validPixelIds.length} valid pixel(s) found:`, validPixelIds);

        // Verificar se fbq está disponível
        if (typeof window.fbq !== 'function') {
          console.error('❌ [FB PIXEL] fbq not available');
          return;
        }

        initializedRef.current = true;
        
        if (!window._fbPixelsInitialized) {
          window._fbPixelsInitialized = {};
        }

        // Inicializar cada pixel
        validPixelIds.forEach(pixelId => {
          try {
            if (!window._fbPixelsInitialized![pixelId]) {
              window._fbPixelsInitialized![pixelId] = true;
              window.fbq('init', pixelId);
              console.log('✅ [FB PIXEL] init() called for:', pixelId);
            }
          } catch (e) {
            console.error('❌ [FB PIXEL] Init error:', e);
          }
        });

        // Enviar PageView
        try {
          const pageEventId = generateEventId();
          window.fbq('track', 'PageView', {}, { eventID: pageEventId });
          console.log('✅ [FB PIXEL] PageView tracked with eventID:', pageEventId);
        } catch (e) {
          console.error('❌ [FB PIXEL] PageView error:', e);
        }

        // ViewContent com delay
        setTimeout(() => {
          if (typeof window.fbq !== 'function') return;
          try {
            const eventId = generateEventId();
            window.fbq('track', 'ViewContent', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: eventId });
            console.log('✅ [FB PIXEL] ViewContent tracked with eventID:', eventId);
          } catch (e) {
            console.error('❌ [FB PIXEL] ViewContent error:', e);
          }
        }, 500);

        // InitiateCheckout com delay maior
        setTimeout(() => {
          if (typeof window.fbq !== 'function') return;
          try {
            const eventId = generateEventId();
            window.fbq('track', 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: eventId });
            console.log('✅ [FB PIXEL] InitiateCheckout tracked with eventID:', eventId);
          } catch (e) {
            console.error('❌ [FB PIXEL] InitiateCheckout error:', e);
          }
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
      
      console.log('🛒 [FB PIXEL] Purchase event:', { amount, currency, orderId, pixelCount: pixelIdsRef.current.length });

      if (typeof window.fbq === 'function' && pixelIdsRef.current.length > 0) {
        try {
          window.fbq('track', 'Purchase', {
            content_ids: [productId],
            content_type: 'product',
            value: amount || 0,
            currency: currency || 'AOA'
          }, { eventID: purchaseEventId });
          console.log('✅ [FB PIXEL] Purchase tracked with eventID:', purchaseEventId);
        } catch (e) {
          console.error('❌ [FB PIXEL] Purchase error:', e);
        }
      }

      // Enviar também via Conversions API (server-side)
      try {
        const productInfo = await fetchProductInfo();
        const userId = userIdRef.current || productInfo?.userId;
        
        if (!userId) {
          console.warn('⚠️ [FB PIXEL] No userId for server event');
          return;
        }

        await supabase.functions.invoke('send-facebook-conversion', {
          body: {
            productId,
            userId,
            eventId: purchaseEventId,
            eventName: 'Purchase',
            value: amount || 0,
            currency: currency || 'AOA',
            orderId: orderId || null,
            customer: customer || {}
          }
        });
        console.log('✅ [FB PIXEL] Server event sent with eventID:', purchaseEventId);
      } catch (err) {
        console.error('❌ [FB PIXEL] Server event error:', err);
      }
    };

    window.addEventListener('purchase-completed', handlePurchase as EventListener);
    return () => window.removeEventListener('purchase-completed', handlePurchase as EventListener);
  }, [productId, generateEventId, fetchProductInfo]);

  return null;
};
