import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar mudanças em tempo real na tabela orders
 * @param userId - ID do usuário para filtrar pedidos
 * @param onUpdate - Callback chamado quando há mudanças
 */
export function useRealtimeOrders(userId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!userId) return;

    console.log('🔌 [Realtime Orders] Conectando ao canal...');

    const channel = supabase
      .channel(`orders_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📦 [Realtime Orders] Mudança detectada:', payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Realtime Orders] Status da conexão:', status);
      });

    return () => {
      console.log('🔌 [Realtime Orders] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
}
