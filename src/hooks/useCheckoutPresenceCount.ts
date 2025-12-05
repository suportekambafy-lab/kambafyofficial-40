import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceData {
  productId: string;
  enteredAt: string;
}

export function useCheckoutPresenceCount(productIds: string[]) {
  const [visitorCount, setVisitorCount] = useState(0);
  const [visitorsByProduct, setVisitorsByProduct] = useState<Record<string, number>>({});

  const updateCounts = useCallback((channels: Map<string, ReturnType<typeof supabase.channel>>) => {
    let total = 0;
    const byProduct: Record<string, number> = {};

    channels.forEach((channel, productId) => {
      const state = channel.presenceState();
      console.log('📊 [Presence Count] State for', productId, ':', JSON.stringify(state));
      
      // Count ALL presences in each key
      let count = 0;
      Object.values(state).forEach((presences: any) => {
        count += Array.isArray(presences) ? presences.length : 1;
      });
      
      byProduct[productId] = count;
      total += count;
    });

    console.log('📊 [Presence Count] Total visitors:', total, 'By product:', byProduct);
    setVisitorCount(total);
    setVisitorsByProduct(byProduct);
  }, []);

  useEffect(() => {
    if (productIds.length === 0) return;

    const channels = new Map<string, ReturnType<typeof supabase.channel>>();

    productIds.forEach((productId) => {
      const channelName = `checkout-presence-${productId}`;
      const channel = supabase.channel(channelName);
      channels.set(productId, channel);

      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 [Presence Count] Sync event for product:', productId);
          updateCounts(channels);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('👋 [Presence Count] Join:', productId, newPresences);
          updateCounts(channels);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👋 [Presence Count] Leave:', productId, leftPresences);
          updateCounts(channels);
        })
        .subscribe((status) => {
          console.log(`🔌 [Presence Count] Channel ${productId} status:`, status);
        });
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channels.clear();
    };
  }, [productIds, updateCounts]);

  return { visitorCount, visitorsByProduct };
}
