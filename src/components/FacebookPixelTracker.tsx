
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
        console.log('🎯 [FB PIXEL] Fetching settings for productId:', productId);
        
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
          console.error('❌ [FB PIXEL] Error fetching product:', productError);
          return;
        }

        if (!product) {
          console.log('❌ [FB PIXEL] Product not found:', productId);
          return;
        }

        console.log('📦 [FB PIXEL] Product owner found:', product.user_id);

        // Buscar configurações do pixel do dono do produto
        const { data, error } = await supabase
          .from('facebook_pixel_settings')
          .select('*')
          .eq('user_id', product.user_id)
          .eq('product_id', productId)
          .eq('enabled', true)
          .maybeSingle();

        console.log('📊 [FB PIXEL] Settings query result:', { data, error, productId });

        if (error && error.code !== 'PGRST116') {
          console.error('❌ [FB PIXEL] Error fetching pixel settings:', error);
          return;
        }

        if (data && data.pixel_id && data.enabled) {
          console.log('✅ [FB PIXEL] Found active pixel settings:', {
            pixelId: data.pixel_id,
            enabled: data.enabled,
            productId: data.product_id
          });
          setPixelSettings({
            pixelId: data.pixel_id,
            enabled: data.enabled
          });
        } else {
          console.log('❌ [FB PIXEL] No active pixel settings found for product:', productId);
        }
      } catch (error) {
        console.error('❌ [FB PIXEL] Error in fetchPixelSettings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchPixelSettings();
    } else {
      console.warn('⚠️ [FB PIXEL] No productId provided');
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (loading) {
      console.log('⏳ [FB PIXEL] Still loading settings...');
      return;
    }

    if (!pixelSettings?.enabled || !pixelSettings?.pixelId) {
      console.log('⚠️ [FB PIXEL] Pixel not enabled or no pixel ID:', pixelSettings);
      return;
    }

    console.log('🚀 [FB PIXEL] Starting initialization process...');

    // Garantir que o script base do Facebook Pixel está carregado
    const waitForFbq = (callback: () => void, maxAttempts = 30) => {
      let attempts = 0;
      
      console.log('🔍 [FB PIXEL] Checking for fbq function...');
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.fbq && typeof window.fbq === 'function') {
          clearInterval(checkInterval);
          console.log('✅ [FB PIXEL] Facebook Pixel base script detected after', attempts, 'attempts');
          callback();
        } else {
          if (attempts % 5 === 0) {
            console.log(`⏳ [FB PIXEL] Still waiting for fbq... (attempt ${attempts}/${maxAttempts})`);
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('❌ [FB PIXEL] Facebook Pixel base script not loaded after', maxAttempts, 'attempts');
            console.error('❌ [FB PIXEL] window.fbq:', window.fbq);
            console.error('❌ [FB PIXEL] window._fbq:', window._fbq);
          }
        }
      }, 100);
    };

    waitForFbq(() => {
      try {
        console.log('🎯 [FB PIXEL] Initializing Pixel ID:', pixelSettings.pixelId);
        
        // Inicializar o pixel com o ID específico
        window.fbq('init', pixelSettings.pixelId);
        console.log('✅ [FB PIXEL] Init called successfully');
        
        // Enviar PageView imediatamente
        window.fbq('track', 'PageView');
        console.log('✅ [FB PIXEL] PageView event sent');
        
        // Enviar InitiateCheckout após um pequeno delay
        setTimeout(() => {
          try {
            const checkoutData = {
              content_ids: [productId],
              content_type: 'product'
            };
            
            window.fbq('track', 'InitiateCheckout', checkoutData);
            console.log('✅ [FB PIXEL] InitiateCheckout event sent:', checkoutData);
          } catch (error) {
            console.error('❌ [FB PIXEL] Error sending InitiateCheckout:', error);
          }
        }, 1000);

        // Listener para evento de compra
        const handlePurchaseComplete = (event: any) => {
          try {
            console.log('🎯 [FB PIXEL] Purchase event received:', event.detail);
            
            const purchaseData = {
              content_ids: [productId],
              content_type: 'product',
              value: event.detail?.amount || 0,
              currency: event.detail?.currency || 'KZ'
            };
            
            window.fbq('track', 'Purchase', purchaseData);
            console.log('✅ [FB PIXEL] Purchase event sent:', purchaseData);
          } catch (error) {
            console.error('❌ [FB PIXEL] Error sending Purchase event:', error);
          }
        };

        window.addEventListener('purchase-completed', handlePurchaseComplete);

        return () => {
          console.log('🧹 [FB PIXEL] Cleaning up event listeners');
          window.removeEventListener('purchase-completed', handlePurchaseComplete);
        };
      } catch (error) {
        console.error('❌ [FB PIXEL] Error initializing Facebook Pixel:', error);
      }
    });
  }, [pixelSettings, loading, productId]);

  return null;
};
