import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar mudanças em tempo real na tabela customer_balances
 * @param userId - ID do usuário para filtrar saldo
 * @param onUpdate - Callback chamado quando há mudanças
 */
export function useRealtimeBalance(userId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!userId) return;

    console.log('💰 [Realtime Balance] Conectando ao canal...');

    const channel = supabase
      .channel(`balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_balances',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('💰 [Realtime Balance] Mudança detectada:', payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('💰 [Realtime Balance] Status da conexão:', status);
      });

    return () => {
      console.log('💰 [Realtime Balance] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
}
