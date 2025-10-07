
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

    // Initialize Facebook Pixel
    const initFacebookPixel = () => {
      console.log('🔍 [PIXEL DEBUG] Checking if pixel exists:', {
        fbqExists: !!window.fbq,
        fbqType: typeof window.fbq,
        _fbqExists: !!window._fbq,
        pixelId: pixelSettings.pixelId
      });

      // Verificar se o pixel já foi carregado
      if (window.fbq && typeof window.fbq === 'function') {
        console.log('✅ Facebook Pixel already loaded, just initializing new ID:', pixelSettings.pixelId);
        try {
          window.fbq('init', pixelSettings.pixelId);
          window.fbq('track', 'PageView');
          console.log('✅ Pixel initialized successfully');
          console.log('🔍 [PIXEL DEBUG] After init - window.fbq:', typeof window.fbq);
        } catch (e) {
          console.error('❌ Error initializing existing pixel:', e);
        }
        return;
      }

      console.log('📦 Loading Facebook Pixel script for the first time');
      console.log('🔍 [PIXEL DEBUG] Document head children before:', document.head.children.length);
      
      // Remover script existente se houver
      const existingScript = document.getElementById('facebook-pixel-script');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Carregar o script externo primeiro
      const fbScript = document.createElement('script');
      fbScript.async = true;
      fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
      fbScript.id = 'facebook-pixel-base-script';
      
      fbScript.onload = () => {
        console.log('✅ Facebook Pixel base script loaded');
        console.log('🔍 [PIXEL DEBUG] After script load - window.fbq:', typeof window.fbq);
        console.log('🔍 [PIXEL DEBUG] window._fbq:', typeof window._fbq);
        
        // Inicializar após carregar
        if (window.fbq) {
          console.log('🚀 [PIXEL DEBUG] Calling fbq init with ID:', pixelSettings.pixelId);
          window.fbq('init', pixelSettings.pixelId);
          console.log('🚀 [PIXEL DEBUG] Calling fbq track PageView');
          window.fbq('track', 'PageView');
          console.log('✅ Pixel initialized with ID:', pixelSettings.pixelId);
          
          // Verificar se o pixel foi realmente inicializado
          setTimeout(() => {
            console.log('🔍 [PIXEL DEBUG] 1s after init - window.fbq still exists:', typeof window.fbq);
          }, 1000);
        } else {
          console.error('❌ [PIXEL DEBUG] window.fbq not available after script load!');
        }
      };
      
      fbScript.onerror = (error) => {
        console.error('❌ [PIXEL DEBUG] Error loading Facebook Pixel script:', error);
      };
      
      // Inicializar a fila antes de carregar o script
      const initScript = document.createElement('script');
      initScript.id = 'facebook-pixel-script';
      initScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;
      
      document.head.appendChild(initScript);
      console.log('✅ [PIXEL DEBUG] Init script added to head');
      
      document.head.appendChild(fbScript);
      console.log('✅ [PIXEL DEBUG] FB script added to head');
      console.log('🔍 [PIXEL DEBUG] Document head children after:', document.head.children.length);

      // Add noscript fallback
      const existingNoscript = document.getElementById('facebook-pixel-noscript');
      if (existingNoscript) {
        existingNoscript.remove();
      }
      
      const noscript = document.createElement('noscript');
      noscript.id = 'facebook-pixel-noscript';
      noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelSettings.pixelId}&ev=PageView&noscript=1" />
      `;
      document.body.appendChild(noscript);
      console.log('✅ [PIXEL DEBUG] Noscript fallback added');
    };

    initFacebookPixel();
    
    // Verificar após 2 segundos se o pixel foi carregado
    setTimeout(() => {
      console.log('🔍 [PIXEL DEBUG] 2s check - Pixel status:', {
        fbqExists: !!window.fbq,
        fbqType: typeof window.fbq,
        pixelId: pixelSettings.pixelId,
        scriptsInHead: Array.from(document.head.getElementsByTagName('script'))
          .filter(s => s.src.includes('facebook') || s.innerHTML.includes('fbq'))
          .map(s => ({ src: s.src, id: s.id, hasContent: s.innerHTML.length > 0 }))
      });
    }, 2000);

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
