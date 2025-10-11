import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar mudanças em tempo real na tabela customer_access
 * @param customerEmail - Email do cliente para filtrar acessos
 * @param onUpdate - Callback chamado quando há mudanças
 */
export function useRealtimeCustomerAccess(customerEmail: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!customerEmail) return;

    console.log('🔑 [Realtime Access] Conectando ao canal...');

    const channel = supabase
      .channel(`customer_access_${customerEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_access',
          filter: `customer_email=eq.${customerEmail}`
        },
        (payload) => {
          console.log('🔑 [Realtime Access] Mudança detectada:', payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('🔑 [Realtime Access] Status da conexão:', status);
      });

    return () => {
      console.log('🔑 [Realtime Access] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [customerEmail, onUpdate]);
}
