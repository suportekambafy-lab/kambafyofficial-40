import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  productId: string;
  enteredAt: string;
  userAgent?: string;
  country?: string;
  city?: string;
  region?: string;
}

export function useCheckoutPresence(productId: string | undefined, country?: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const countryRef = useRef<string | undefined>(country);
  const [locationData, setLocationData] = useState<{ country: string; city: string; region: string }>({
    country: country || 'Desconhecido',
    city: '',
    region: ''
  });

  // Fetch detailed location data (city, region)
  useEffect(() => {
    const fetchDetailedLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          setLocationData({
            country: data.country_name || country || 'Desconhecido',
            city: data.city || '',
            region: data.region || ''
          });
        }
      } catch (error) {
        console.log('[Checkout Presence] Failed to fetch detailed location:', error);
      }
    };
    
    fetchDetailedLocation();
  }, [country]);

  useEffect(() => {
    if (!productId) return;

    const channelName = `checkout-presence-${productId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;
    countryRef.current = country;

    const presenceState: PresenceState = {
      productId,
      enteredAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      country: locationData.country,
      city: locationData.city,
      region: locationData.region
    };

    channel.subscribe(async (status) => {
      console.log('🔌 [Checkout Presence] Channel status:', status, 'location:', locationData);
      if (status === 'SUBSCRIBED') {
        const trackResult = await channel.track(presenceState);
        console.log('🟢 [Checkout Presence] Track result:', trackResult, 'for product:', productId, 'location:', locationData);
      }
    });

    return () => {
      console.log('🔴 [Checkout Presence] Untracking visitor');
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [productId, locationData]);
}
