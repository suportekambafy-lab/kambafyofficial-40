import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
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

  // Gerar event_id único para deduplicação
  const generateEventId = useCallback(() => {
    return uuidv4();
  }, []);

  // Buscar user_id e product UUID do produto se não fornecido
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

  // Injetar script base do Facebook Pixel
  const injectFacebookPixelScript = useCallback((pixelIds: string[]) => {
    // Verifica se o script já existe no DOM
    const existingScript = document.querySelector('script[src*="fbevents.js"]');
    if (existingScript) {
      console.log('ℹ️ [FB PIXEL] Script already exists in DOM');
      return Promise.resolve();
    }

    console.log('🔧 [FB PIXEL] Injecting Facebook SDK script...');

    return new Promise<void>((resolve) => {
      // Código base do Facebook Pixel (exatamente como o Facebook fornece)
      (function(f: any, b: Document, e: string, v: string, n?: any, t?: HTMLScriptElement, s?: Element) {
        if (f.fbq) { 
          console.log('ℹ️ [FB PIXEL] fbq already exists');
          resolve();
          return; 
        }
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e) as HTMLScriptElement;
        t.async = true;
        t.src = v;
        t.onload = () => {
          console.log('✅ [FB PIXEL] Facebook SDK loaded successfully');
          resolve();
        };
        t.onerror = () => {
          console.error('❌ [FB PIXEL] Failed to load Facebook SDK');
          resolve();
        };
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) {
          s.parentNode.insertBefore(t, s);
        } else {
          b.head.appendChild(t);
        }
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    });
  }, []);

  // Buscar e inicializar pixels
  useEffect(() => {
    const initializePixels = async () => {
      if (!productId) {
        console.warn('⚠️ [FB PIXEL] No productId provided');
        return;
      }

      console.log('🔍 [FB PIXEL] Fetching settings for product:', productId);

      const productInfo = await fetchProductInfo();
      if (!productInfo) return;

      const { userId, productUUID } = productInfo;
      userIdRef.current = userId;

      try {
        // Buscar pixels ativos APENAS para este produto específico
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

        // Injetar e aguardar o script do Facebook Pixel
        await injectFacebookPixelScript(pixelIds);

        // Aguardar fbq estar completamente disponível
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const maxAttempts = 50;
          
          const check = setInterval(() => {
            attempts++;
            if (window.fbq && typeof window.fbq === 'function') {
              clearInterval(check);
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(check);
              console.warn('⚠️ [FB PIXEL] fbq not available after timeout');
              resolve();
            }
          }, 100);
        });

        if (!window.fbq || typeof window.fbq !== 'function') {
          console.error('❌ [FB PIXEL] fbq function not available');
          return;
        }

        // Inicializar cada pixel (apenas uma vez)
        if (!initializedRef.current) {
          pixelIds.forEach(pixelId => {
            try {
              window.fbq('init', pixelId);
              console.log('✅ [FB PIXEL] init() called for:', pixelId);
            } catch (e) {
              console.error('❌ [FB PIXEL] Error initializing pixel:', pixelId, e);
            }
          });
          initializedRef.current = true;

          // Gerar event_id único para PageView
          const pageEventId = generateEventId();

          // Track PageView IMEDIATAMENTE após init
          window.fbq('track', 'PageView', {}, { eventID: pageEventId });
          console.log('✅ [FB PIXEL] PageView tracked with eventID:', pageEventId);

          // Track ViewContent após pequeno delay
          setTimeout(() => {
            const viewContentEventId = generateEventId();
            window.fbq('track', 'ViewContent', {
              content_ids: [productId],
              content_type: 'product',
              content_name: 'Product Page'
            }, { eventID: viewContentEventId });
            console.log('✅ [FB PIXEL] ViewContent tracked with eventID:', viewContentEventId);
          }, 300);

          // Track InitiateCheckout após delay maior
          setTimeout(() => {
            const initiateCheckoutEventId = generateEventId();
            window.fbq('track', 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            }, { eventID: initiateCheckoutEventId });
            console.log('✅ [FB PIXEL] InitiateCheckout tracked with eventID:', initiateCheckoutEventId);
          }, 1000);
        }

      } catch (error) {
        console.error('❌ [FB PIXEL] Unexpected error:', error);
      }
    };

    initializePixels();
  }, [productId, fetchProductInfo, generateEventId, injectFacebookPixelScript]);

  // Handler para evento de compra
  useEffect(() => {
    const handlePurchase = async (event: CustomEvent<PurchaseEventDetail>) => {
      const { amount, currency, customer, orderId } = event.detail || {};
      
      // Gerar event_id único para Purchase (CRÍTICO para deduplicação)
      const purchaseEventId = generateEventId();
      
      console.log('🛒 [FB PIXEL] Purchase event received:', {
        amount,
        currency,
        orderId,
        eventId: purchaseEventId
      });

      // 1. Enviar evento client-side (Pixel)
      if (window.fbq && typeof window.fbq === 'function' && pixelIdsRef.current.length > 0) {
        try {
          const purchaseData = {
            content_ids: [productId],
            content_type: 'product',
            value: amount || 0,
            currency: currency || 'KZ'
          };

          // Enviar com event_id para deduplicação
          window.fbq('track', 'Purchase', purchaseData, { eventID: purchaseEventId });
          console.log('✅ [FB PIXEL] Purchase event tracked (client-side):', purchaseData);
        } catch (err) {
          console.error('❌ [FB PIXEL] Error tracking purchase client-side:', err);
        }
      }

      // 2. Enviar evento server-side (Conversions API)
      try {
        const productInfo = await fetchProductInfo();
        const userId = userIdRef.current || productInfo?.userId;
        
        if (!userId) {
          console.error('❌ [FB PIXEL] Cannot send server event: no userId');
          return;
        }

        const payload = {
          productId,
          userId,
          eventId: purchaseEventId, // MESMO event_id para deduplicação
          eventName: 'Purchase',
          value: amount || 0,
          currency: currency || 'KZ',
          orderId: orderId || null,
          customer: customer || {}
        };

        console.log('📤 [FB PIXEL] Sending to Conversions API:', payload);

        const { data, error } = await supabase.functions.invoke('send-facebook-conversion', {
          body: payload
        });

        if (error) {
          console.error('❌ [FB PIXEL] Conversions API error:', error);
        } else {
          console.log('✅ [FB PIXEL] Conversions API response:', data);
        }
      } catch (err) {
        console.error('❌ [FB PIXEL] Error calling Conversions API:', err);
      }
    };

    window.addEventListener('purchase-completed', handlePurchase as EventListener);
    
    return () => {
      window.removeEventListener('purchase-completed', handlePurchase as EventListener);
    };
  }, [productId, generateEventId, fetchProductInfo]);

  // Noscript fallback para SEO/accessibility
  if (pixelIdsRef.current.length > 0) {
    return (
      <>
        {pixelIdsRef.current.map(pixelId => (
          <noscript key={pixelId}>
            <img 
              height="1" 
              width="1" 
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        ))}
      </>
    );
  }

  return null;
};
