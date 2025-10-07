
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
  const [pixelSettings, setPixelSettings] = useState<{pixelId: string; enabled: boolean} | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  // Buscar configurações do pixel
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

        // Buscar configurações do pixel
        const { data, error } = await supabase
          .from('facebook_pixel_settings')
          .select('pixel_id, enabled')
          .eq('user_id', product.user_id)
          .eq('product_id', productId)
          .eq('enabled', true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ [FB PIXEL] Error fetching settings:', error);
          setLoading(false);
          return;
        }

        if (data?.pixel_id && data.enabled) {
          console.log('✅ [FB PIXEL] Settings loaded - Pixel ID:', data.pixel_id);
          setPixelSettings({
            pixelId: data.pixel_id,
            enabled: data.enabled
          });
        } else {
          console.log('ℹ️ [FB PIXEL] No active pixel found for this product');
        }
      } catch (error) {
        console.error('❌ [FB PIXEL] Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPixelSettings();
  }, [productId]);

  // Inicializar pixel e enviar eventos
  useEffect(() => {
    if (loading || !pixelSettings?.enabled || !pixelSettings?.pixelId || initRef.current) {
      return;
    }

    const pixelId = pixelSettings.pixelId;
    console.log('🚀 [FB PIXEL] Starting initialization for Pixel ID:', pixelId);

    // Esperar pelo fbq com timeout mais longo
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos no máximo
    
    const checkFbq = setInterval(() => {
      attempts++;

      if (window.fbq && typeof window.fbq === 'function') {
        clearInterval(checkFbq);
        initRef.current = true;

        console.log('✅ [FB PIXEL] fbq function detected, initializing...');

        try {
          // 1. INIT - Sempre primeiro
          window.fbq('init', pixelId);
          console.log('✅ [FB PIXEL] init() called with ID:', pixelId);

          // 2. PAGE VIEW - Imediatamente após init
          window.fbq('track', 'PageView');
          console.log('✅ [FB PIXEL] PageView event tracked');

          // 3. VIEW CONTENT - Visualização do produto
          setTimeout(() => {
            window.fbq('track', 'ViewContent', {
              content_ids: [productId],
              content_type: 'product',
              content_name: 'Product Page'
            });
            console.log('✅ [FB PIXEL] ViewContent event tracked');
          }, 500);

          // 4. INITIATE CHECKOUT - Início do checkout
          setTimeout(() => {
            window.fbq('track', 'InitiateCheckout', {
              content_ids: [productId],
              content_type: 'product'
            });
            console.log('✅ [FB PIXEL] InitiateCheckout event tracked');
          }, 1500);

          // 5. PURCHASE - Listener para compra
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

          // Cleanup
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
        console.error('❌ [FB PIXEL] Check if Facebook Pixel base script is loaded in index.html');
      } else if (attempts % 10 === 0) {
        console.log(`⏳ [FB PIXEL] Waiting for fbq... (${attempts}/${maxAttempts})`);
      }
    }, 100);

    return () => {
      clearInterval(checkFbq);
    };
  }, [pixelSettings, loading, productId]);

  // Noscript fallback para Pixel Helper
  if (!loading && pixelSettings?.enabled && pixelSettings?.pixelId) {
    return (
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelSettings.pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    );
  }

  return null;
};
