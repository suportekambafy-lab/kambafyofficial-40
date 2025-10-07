
import { useEffect } from 'react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq: any;
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

    // Initialize Facebook Pixel ONLY if not already loaded
    const initFacebookPixel = () => {
      // Verificar se o pixel já foi carregado
      if (window.fbq && typeof window.fbq === 'function') {
        console.log('✅ Facebook Pixel already loaded, just initializing new ID:', pixelSettings.pixelId);
        window.fbq('init', pixelSettings.pixelId);
        window.fbq('track', 'PageView');
        return;
      }

      console.log('📦 Loading Facebook Pixel script for the first time');
      
      // Load Facebook Pixel script
      const script = document.createElement('script');
      script.id = 'facebook-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
        fbq('init', '${pixelSettings.pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      // Add noscript fallback
      const noscript = document.createElement('noscript');
      noscript.id = 'facebook-pixel-noscript';
      noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelSettings.pixelId}&ev=PageView&noscript=1" />
      `;
      document.head.appendChild(noscript);
    };

    initFacebookPixel();

    // Track InitiateCheckout immediately when on checkout page
    setTimeout(() => {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: [productId],
          content_type: 'product'
        });
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
