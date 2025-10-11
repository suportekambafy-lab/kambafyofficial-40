import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar mudanças em tempo real na tabela admin_notifications
 * @param onUpdate - Callback chamado quando há mudanças
 */
export function useRealtimeNotifications(onUpdate: () => void) {
  useEffect(() => {
    console.log('🔔 [Realtime Notifications] Conectando ao canal...');

    const channel = supabase
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('🔔 [Realtime Notifications] Mudança detectada:', payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('🔔 [Realtime Notifications] Status da conexão:', status);
      });

    return () => {
      console.log('🔔 [Realtime Notifications] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
