import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceData {
  productId: string;
  enteredAt: string;
  country?: string;
  city?: string;
  region?: string;
}

export interface VisitorLocation {
  country: string;
  city: string;
  region: string;
  count: number;
}

export function useCheckoutPresenceCount(productIds: string[]) {
  const [visitorCount, setVisitorCount] = useState(0);
  const [visitorsByProduct, setVisitorsByProduct] = useState<Record<string, number>>({});
  const [visitorLocations, setVisitorLocations] = useState<VisitorLocation[]>([]);

  const updateCounts = useCallback((channels: Map<string, ReturnType<typeof supabase.channel>>) => {
    let total = 0;
    const byProduct: Record<string, number> = {};
    const locationMap: Record<string, VisitorLocation> = {};

    channels.forEach((channel, productId) => {
      const state = channel.presenceState();
      console.log('📊 [Presence Count] State for', productId, ':', JSON.stringify(state));
      
      // Count ALL presences in each key
      let count = 0;
      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          count += presences.length;
          // Collect location data with city
          presences.forEach((p: PresenceData) => {
            const country = p.country || 'Desconhecido';
            const city = p.city || '';
            const region = p.region || '';
            const locationKey = `${country}-${city}-${region}`;
            
            if (!locationMap[locationKey]) {
              locationMap[locationKey] = {
                country,
                city,
                region,
                count: 0
              };
            }
            locationMap[locationKey].count++;
          });
        } else {
          count += 1;
        }
      });
      
      byProduct[productId] = count;
      total += count;
    });

    // Convert location map to array sorted by count
    const locations = Object.values(locationMap).sort((a, b) => b.count - a.count);

    console.log('📊 [Presence Count] Total visitors:', total, 'Locations:', locations);
    setVisitorCount(total);
    setVisitorsByProduct(byProduct);
    setVisitorLocations(locations);
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
          if (status === 'SUBSCRIBED') {
            // Initial count after subscription
            setTimeout(() => updateCounts(channels), 500);
          }
        });
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channels.clear();
    };
  }, [productIds, updateCounts]);

  return { visitorCount, visitorsByProduct, visitorLocations };
}
