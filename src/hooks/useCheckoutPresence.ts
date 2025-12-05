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
  const sessionSavedRef = useRef<boolean>(false);
  const [locationData, setLocationData] = useState<{ country: string; city: string; region: string }>({
    country: country || '',
    city: '',
    region: ''
  });

  // Generate unique session ID
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Fetch detailed location data (city, region) from IP
  useEffect(() => {
    const fetchDetailedLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          setLocationData({
            country: data.country_name || country || '',
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

  // Save session to database (once per visit)
  useEffect(() => {
    if (!productId || !locationData.country || sessionSavedRef.current) return;

    const saveSession = async () => {
      try {
        const { error } = await supabase
          .from('checkout_sessions')
          .insert({
            product_id: productId,
            session_id: sessionId.current,
            country: locationData.country,
            city: locationData.city,
            region: locationData.region,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
          });

        if (error) {
          console.log('[Checkout Presence] Failed to save session:', error);
        } else {
          console.log('🟢 [Checkout Presence] Session saved:', locationData.country);
          sessionSavedRef.current = true;
        }
      } catch (error) {
        console.log('[Checkout Presence] Error saving session:', error);
      }
    };

    saveSession();
  }, [productId, locationData.country]);

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
