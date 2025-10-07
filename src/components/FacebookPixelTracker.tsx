
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

        if (data && data.pixel_id && data.enabled) {
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
    if (loading || !pixelSettings?.enabled || !pixelSettings?.pixelId) {
      return;
    }

    // Garantir que o script base do Facebook Pixel está carregado
    const waitForFbq = (callback: () => void, maxAttempts = 20) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.fbq && typeof window.fbq === 'function') {
          clearInterval(checkInterval);
          console.log('✅ Facebook Pixel base script detected');
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('❌ Facebook Pixel base script not loaded after', maxAttempts, 'attempts');
        }
      }, 100);
    };

    waitForFbq(() => {
      try {
        // Inicializar o pixel com o ID específico
        console.log('🚀 Initializing Facebook Pixel with ID:', pixelSettings.pixelId);
        window.fbq('init', pixelSettings.pixelId);
        
        // Enviar PageView
        console.log('📤 Sending PageView event');
        window.fbq('track', 'PageView');
        
        // Enviar InitiateCheckout após um pequeno delay
        setTimeout(() => {
          console.log('📤 Sending InitiateCheckout event');
          window.fbq('track', 'InitiateCheckout', {
            content_ids: [productId],
            content_type: 'product'
          });
        }, 1000);

        // Listener para evento de compra
        const handlePurchaseComplete = (event: any) => {
          console.log('🎯 Purchase event received:', event.detail);
          
          const purchaseData = {
            content_ids: [productId],
            content_type: 'product',
            value: event.detail?.amount || 0,
            currency: event.detail?.currency || 'KZ'
          };
          
          console.log('📤 Sending Purchase event:', purchaseData);
          window.fbq('track', 'Purchase', purchaseData);
        };

        window.addEventListener('purchase-completed', handlePurchaseComplete);

        return () => {
          window.removeEventListener('purchase-completed', handlePurchaseComplete);
        };
      } catch (error) {
        console.error('❌ Error initializing Facebook Pixel:', error);
      }
    });
  }, [pixelSettings, loading, productId]);

  return null;
};
