import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  productId: string;
  enteredAt: string;
  userAgent?: string;
  country?: string;
}

export function useCheckoutPresence(productId: string | undefined, country?: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const countryRef = useRef<string | undefined>(country);

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
      country: country || 'Desconhecido',
    };

    channel.subscribe(async (status) => {
      console.log('🔌 [Checkout Presence] Channel status:', status, 'country:', country);
      if (status === 'SUBSCRIBED') {
        const trackResult = await channel.track(presenceState);
        console.log('🟢 [Checkout Presence] Track result:', trackResult, 'for product:', productId, 'country:', country);
      }
    });

    return () => {
      console.log('🔴 [Checkout Presence] Untracking visitor');
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [productId, country]);
}
