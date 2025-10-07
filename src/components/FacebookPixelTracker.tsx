
import { useEffect } from 'react';
import { useState } from 'react';
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

  // Buscar configurações do pixel para o produto específico
  useEffect(() => {
    const fetchPixelSettings = async () => {
      try {
        console.log('🎯 FacebookPixelTracker - Fetching settings for productId:', productId);
        
        // Handle both UUID and slug formats for productId
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(productId || '');
        
        // Primeiro buscar o produto para ver quem é o dono
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('user_id')
          .eq(isUUID ? 'id' : 'slug', productId)
          .single();

        if (productError) {
          console.error('❌ Error fetching product:', productError);
          return;
        }

        if (!product) {
          console.log('❌ Product not found:', productId);
          return;
        }

        console.log('📦 Product owner found:', product.user_id);

        // Buscar configurações do pixel do dono do produto
        console.log('🔍 Searching pixel with params:', {
          user_id: product.user_id,
          product_id: productId,
          enabled: true
        });

        const { data, error } = await supabase
          .from('facebook_pixel_settings')
          .select('*')
          .eq('user_id', product.user_id)
          .eq('product_id', productId)
          .eq('enabled', true)
          .maybeSingle();

        console.log('📊 Pixel query result:', { data, error, productId });

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching pixel settings:', error);
          return;
        }

        if (data && data.enabled) {
          console.log('✅ Found active pixel settings:', data);
          setPixelSettings({
            pixelId: data.pixel_id,
            enabled: data.enabled
          });
        } else {
          console.log('❌ No active pixel settings found for product:', productId);
        }
      } catch (error) {
        console.error('❌ Error in fetchPixelSettings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPixelSettings();
  }, [productId]);

  useEffect(() => {
    console.log('🎯 FacebookPixelTracker - Checking pixel load conditions:', {
      loading,
      pixelSettings,
      productId,
      fbqExists: !!window.fbq
    });

    if (loading || !pixelSettings?.enabled || !pixelSettings?.pixelId) {
      console.log('❌ Pixel not loading - conditions not met');
      return;
    }

    console.log('🚀 Loading Facebook Pixel for product:', productId, 'with ID:', pixelSettings.pixelId);

    // Initialize Facebook Pixel - agora o script base JÁ está carregado no index.html
    const initFacebookPixel = () => {
      console.log('🔍 [PIXEL DEBUG] Checking if pixel exists:', {
        fbqExists: !!window.fbq,
        fbqType: typeof window.fbq,
        pixelId: pixelSettings.pixelId
      });

      // O script base já foi carregado no index.html, apenas inicializar o ID específico
      if (window.fbq && typeof window.fbq === 'function') {
        console.log('✅ Facebook Pixel base script already loaded from index.html');
        console.log('🚀 [PIXEL DEBUG] Initializing Pixel ID:', pixelSettings.pixelId);
        
        try {
          window.fbq('init', pixelSettings.pixelId);
          window.fbq('track', 'PageView');
          console.log('✅ Pixel initialized successfully with ID:', pixelSettings.pixelId);
        } catch (e) {
          console.error('❌ Error initializing pixel:', e);
        }
      } else {
        console.error('❌ [PIXEL DEBUG] window.fbq not available! Check if base script loaded from index.html');
      }
    };

    initFacebookPixel();

    // Verificar status do pixel após inicialização
    setTimeout(() => {
      console.log('🔍 [PIXEL VERIFICATION] Checking pixel status after init:', {
        fbqExists: !!window.fbq,
        fbqType: typeof window.fbq,
        pixelId: pixelSettings.pixelId,
        // Try to get pixel queue to verify it's working
        hasQueue: !!(window.fbq as any)?.queue
      });
      
      if (window.fbq) {
        console.log('📤 [PIXEL EVENT] Sending InitiateCheckout event');
        window.fbq('track', 'InitiateCheckout', {
          content_ids: [productId],
          content_type: 'product'
        });
        console.log('✅ [PIXEL EVENT] InitiateCheckout sent successfully');
      }
    }, 1000);

    // Listen for purchase completion events
    const handlePurchaseComplete = (event: any) => {
      console.log('🎯 Facebook Pixel - Purchase event received:', event.detail);
      
      if (window.fbq) {
        const purchaseData = {
          content_ids: [productId],
          content_type: 'product',
          value: event.detail?.amount || 0,
          currency: event.detail?.currency || 'EUR'
        };
        
        console.log('📤 Facebook Pixel - Sending Purchase event:', purchaseData);
        
        window.fbq('track', 'Purchase', purchaseData);
      } else {
        console.log('❌ Facebook Pixel - fbq not available');
      }
    };

    // Add event listener for purchase completion
    window.addEventListener('purchase-completed', handlePurchaseComplete);

    return () => {
      window.removeEventListener('purchase-completed', handlePurchaseComplete);
    };
  }, [pixelSettings, loading, productId]);

  return null;
};
