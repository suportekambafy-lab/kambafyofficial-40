import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  productId: string;
  enteredAt: string;
  userAgent?: string;
}

export function useCheckoutPresence(productId: string | undefined) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!productId) return;

    const channelName = `checkout-presence-${productId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    const presenceState: PresenceState = {
      productId,
      enteredAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(presenceState);
        console.log('🟢 [Checkout Presence] Tracking visitor on product:', productId);
      }
    });

    return () => {
      console.log('🔴 [Checkout Presence] Untracking visitor');
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [productId]);
}
