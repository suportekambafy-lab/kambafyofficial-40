import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar notificações de vendas em tempo real
 * Quando detecta uma nova venda, dispara notificação push nativa (futuramente via OneSignal)
 */
export function useRealtimeSellerNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 [Seller Notifications] Conectando ao canal de notificações...');

    const channel = supabase
      .channel(`seller_notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🎉 [Seller Notifications] Nova venda detectada:', payload);
          
          const notification = payload.new as {
            type: string;
            title: string;
            message: string;
            data: {
              product_name: string;
              amount: string;
              currency: string;
              customer_name: string;
            };
          };

          // Aqui você pode disparar notificação push nativa via OneSignal
          console.log('📱 [Push] Notificação recebida:', {
            title: notification.title,
            message: notification.message,
            data: notification.data
          });
        }
      )
      .subscribe((status) => {
        console.log('🔔 [Seller Notifications] Status da conexão:', status);
      });

    return () => {
      console.log('🔔 [Seller Notifications] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
