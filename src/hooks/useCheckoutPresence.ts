import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectCountryByTimezone } from '@/hooks/useGeoLocation';

interface PresenceState {
  productId: string;
  enteredAt: string;
  userAgent?: string;
  country?: string;
  city?: string;
  region?: string;
}

// APIs rápidas para localização detalhada (cidade/região)
const LOCATION_APIS = [
  {
    url: 'https://ip-api.com/json/?fields=country,city,regionName',
    getLocation: (data: any) => ({
      country: data.country || '',
      city: data.city || '',
      region: data.regionName || ''
    }),
    timeout: 2000
  },
  {
    url: 'https://ipwho.is/',
    getLocation: (data: any) => ({
      country: data.country || '',
      city: data.city || '',
      region: data.region || ''
    }),
    timeout: 2000
  }
];

export function useCheckoutPresence(productId: string | undefined, countryName?: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionSavedRef = useRef<boolean>(false);
  const [locationData, setLocationData] = useState<{ country: string; city: string; region: string }>({
    country: countryName || '',
    city: '',
    region: ''
  });

  // Generate unique session ID
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Fetch detailed location data with race (first response wins)
  useEffect(() => {
    const fetchDetailedLocation = async () => {
      // Usar timezone como fallback imediato para o país
      const timezoneCountry = detectCountryByTimezone();
      
      // Race de APIs - primeira a responder ganha
      const controller = new AbortController();
      
      const promises = LOCATION_APIS.map(async (api) => {
        try {
          const timeoutId = setTimeout(() => controller.abort(), api.timeout);
          const response = await fetch(api.url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            return api.getLocation(data);
          }
        } catch {
          // Ignorar erros individuais
        }
        return null;
      });
      
      // Usar Promise.race para pegar a primeira resposta válida
      try {
        const results = await Promise.all(promises);
        const validResult = results.find(r => r && r.country);
        
        if (validResult) {
          setLocationData({
            country: validResult.country || countryName || '',
            city: validResult.city || '',
            region: validResult.region || ''
          });
        } else if (countryName) {
          setLocationData(prev => ({ ...prev, country: countryName }));
        }
      } catch (error) {
        console.log('[Checkout Presence] Location fetch failed, using fallback');
        if (countryName) {
          setLocationData(prev => ({ ...prev, country: countryName }));
        }
      }
    };
    
    fetchDetailedLocation();
  }, [countryName]);

  // Save session to database (once per visit)
  useEffect(() => {
    if (!productId || sessionSavedRef.current) return;

    const saveSession = async () => {
      const countryToSave = locationData.country || countryName || 'Desconhecido';
      
      try {
        const { error } = await supabase
          .from('checkout_sessions')
          .insert({
            product_id: productId,
            session_id: sessionId.current,
            country: countryToSave,
            city: locationData.city || null,
            region: locationData.region || null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
          });

        if (error) {
          console.log('[Checkout Presence] Failed to save session:', error);
        } else {
          console.log('🟢 [Checkout Presence] Session saved:', countryToSave);
          sessionSavedRef.current = true;
        }
      } catch (error) {
        console.log('[Checkout Presence] Error saving session:', error);
      }
    };

    // Delay menor - 500ms é suficiente para location carregar
    const timeout = setTimeout(saveSession, 500);
    
    return () => clearTimeout(timeout);
  }, [productId, countryName, locationData]);

  // Real-time presence for live tracking
  useEffect(() => {
    if (!productId) return;

    const channelName = `checkout-presence-${productId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    const presenceState: PresenceState = {
      productId,
      enteredAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      country: locationData.country || countryName || 'Desconhecido',
      city: locationData.city,
      region: locationData.region
    };

    channel.subscribe(async (status) => {
      console.log('🔌 [Checkout Presence] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        const trackResult = await channel.track(presenceState);
        console.log('🟢 [Checkout Presence] Tracked:', presenceState.country);
      }
    });

    return () => {
      console.log('🔴 [Checkout Presence] Untracking visitor');
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [productId, locationData, countryName]);
}
