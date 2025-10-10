
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface FacebookPixelTrackerProps {
  productId: string;
}

export const FacebookPixelTracker = ({ productId }: FacebookPixelTrackerProps) => {
  const [pixelIds, setPixelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const initRef = useRef<Set<string>>(new Set());

  // Buscar todos os pixels ativos do produto
  useEffect(() => {
    const fetchPixelSettings = async () => {
      try {
        if (!productId) {
          console.warn('⚠️ [FB PIXEL] No productId provided');
          setLoading(false);
          return;
        }

        console.log('🔍 [FB PIXEL] Fetching settings for product:', productId);
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(productId);
        
        // Buscar produto
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('user_id')
          .eq(isUUID ? 'id' : 'slug', productId)
          .single();

        if (productError || !product) {
          console.error('❌ [FB PIXEL] Product not found:', productError);
          setLoading(false);
          return;
        }

        // Buscar TODOS os pixels ativos
        const { data, error } = await supabase
          .from('facebook_pixel_settings')
          .select('pixel_id')
          .eq('user_id', product.user_id)
          .eq('product_id', productId)
          .eq('enabled', true);

        if (error && error.code !== 'PGRST116') {
          console.error('❌ [FB PIXEL] Error fetching settings:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const ids = data.map(d => d.pixel_id);
          console.log(`✅ [FB PIXEL] ${ids.length} pixel(s) loaded:`, ids);
          setPixelIds(ids);
        } else {
          console.log('ℹ️ [FB PIXEL] No active pixels found for this product');
        }
      } catch (error) {
        console.error('❌ [FB PIXEL] Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPixelSettings();
  }, [productId]);

  // Inicializar pixels e enviar eventos
  useEffect(() => {
    if (loading || pixelIds.length === 0) {
      return;
    }

    console.log('🚀 [FB PIXEL] Starting initialization for', pixelIds.length, 'pixel(s):', pixelIds);

    // Esperar pelo fbq com timeout
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkFbq = setInterval(() => {
      attempts++;

      if (window.fbq && typeof window.fbq === 'function') {
        clearInterval(checkFbq);

        console.log('✅ [FB PIXEL] fbq function detected, initializing...');

        try {
          // Inicializar todos os pixels
          pixelIds.forEach(pixelId => {
            if (!initRef.current.has(pixelId)) {
              window.fbq('init', pixelId);
              initRef.current.add(pixelId);
              console.log('✅ [FB PIXEL] init() called with ID:', pixelId);
            }
          });

          // Eventos (trackados para todos os pixels)
          window.fbq('track', 'PageView');
          console.log('✅ [FB PIXEL] PageView event tracked');

          setTimeout(() => {
            window.fbq('track', 'ViewContent', {
              content_ids: [productId],
              content_type: 'product',
              content_name: 'Product Page'
            });
            console.log('✅ [FB PIXEL] ViewContent event tracked');
          }, 500);

          setTimeout(() => {
            window.fbq('track', 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            });
            console.log('✅ [FB PIXEL] InitiateCheckout event tracked');
          }, 1500);

          const handlePurchase = (event: CustomEvent) => {
            const { amount, currency } = event.detail || {};
            
            const purchaseData = {
              content_ids: [productId],
              content_type: 'product',
              value: amount || 0,
              currency: currency || 'KZ'
            };

            window.fbq('track', 'Purchase', purchaseData);
            console.log('✅ [FB PIXEL] Purchase event tracked:', purchaseData);
          };

          window.addEventListener('purchase-completed', handlePurchase as EventListener);

          return () => {
            window.removeEventListener('purchase-completed', handlePurchase as EventListener);
            console.log('🧹 [FB PIXEL] Cleanup completed');
          };

        } catch (error) {
          console.error('❌ [FB PIXEL] Error during initialization:', error);
        }

      } else if (attempts >= maxAttempts) {
        clearInterval(checkFbq);
        console.error('❌ [FB PIXEL] fbq not available after', maxAttempts, 'attempts');
      } else if (attempts % 10 === 0) {
        console.log(`⏳ [FB PIXEL] Waiting for fbq... (${attempts}/${maxAttempts})`);
      }
    }, 100);

    return () => {
      clearInterval(checkFbq);
    };
  }, [pixelIds, loading, productId]);

  // Noscript fallback para todos os pixels
  if (!loading && pixelIds.length > 0) {
    return (
      <>
        {pixelIds.map(pixelId => (
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
