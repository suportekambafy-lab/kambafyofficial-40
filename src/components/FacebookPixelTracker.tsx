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

        // Aguardar fbq estar disponível (carregado pelo index.html)
        const waitForFbq = (): Promise<boolean> => {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 segundos
            
            const check = () => {
              attempts++;
              // Verificar se fbq existe E se o script foi carregado
              if (typeof window.fbq === 'function' && window.fbq.loaded === true) {
                console.log('✅ [FB PIXEL] fbq is ready and loaded');
                resolve(true);
                return;
              }
              
              if (attempts >= maxAttempts) {
                console.warn('⚠️ [FB PIXEL] fbq not fully loaded after timeout. Attempting anyway...');
                resolve(typeof window.fbq === 'function');
                return;
              }
              
              setTimeout(check, 100);
            };
            
            check();
          });
        };

        const fbqReady = await waitForFbq();
        
        if (!fbqReady || typeof window.fbq !== 'function') {
          console.error('❌ [FB PIXEL] fbq function not available - check if ad blocker is active');
          return;
        }

        // Inicializar cada pixel (apenas uma vez, verificando se já foi inicializado no HTML)
        if (!initializedRef.current) {
          initializedRef.current = true;
          
          // Garantir que o objeto existe
          if (!window._fbPixelsInitialized) {
            window._fbPixelsInitialized = {};
          }
          
          pixelIds.forEach(pixelId => {
            try {
              // Só inicializar se não foi inicializado pelo HTML
              if (!window._fbPixelsInitialized[pixelId]) {
                window._fbPixelsInitialized[pixelId] = true;
                window.fbq('init', pixelId);
                console.log('✅ [FB PIXEL] init() called for:', pixelId);
              } else {
                console.log('ℹ️ [FB PIXEL] Already initialized by HTML:', pixelId);
              }
            } catch (e) {
              console.error('❌ [FB PIXEL] Error initializing pixel:', pixelId, e);
            }
          });

          // Track PageView IMEDIATAMENTE após init
          const pageEventId = generateEventId();
          window.fbq('track', 'PageView', {}, { eventID: pageEventId });
          console.log('✅ [FB PIXEL] PageView tracked with eventID:', pageEventId);

          // Track ViewContent após pequeno delay
          setTimeout(() => {
            if (typeof window.fbq === 'function') {
              const viewContentEventId = generateEventId();
              window.fbq('track', 'ViewContent', {
                content_ids: [productId],
                content_type: 'product',
                content_name: 'Product Page'
              }, { eventID: viewContentEventId });
              console.log('✅ [FB PIXEL] ViewContent tracked with eventID:', viewContentEventId);
            }
          }, 500);

          // Track InitiateCheckout após delay maior
          setTimeout(() => {
            if (typeof window.fbq === 'function') {
              const initiateCheckoutEventId = generateEventId();
              window.fbq('track', 'InitiateCheckout', {
                content_ids: [productId],
                content_type: 'product'
              }, { eventID: initiateCheckoutEventId });
              console.log('✅ [FB PIXEL] InitiateCheckout tracked with eventID:', initiateCheckoutEventId);
            }
          }, 1500);
        }

      } catch (error) {
        console.error('❌ [FB PIXEL] Unexpected error:', error);
      }
    };

    initializePixels();
  }, [productId, fetchProductInfo, generateEventId]);

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
      if (typeof window.fbq === 'function' && pixelIdsRef.current.length > 0) {
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

  // Noscript fallback para SEO/accessibility - renderiza sempre se houver pixels
  const pixelIds = pixelIdsRef.current;
  
  return (
    <>
      {pixelIds.length > 0 && pixelIds.map(pixelId => (
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
};
