import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para escutar notificações de vendas em tempo real
 * Mostra toast quando vendedor recebe uma nova venda
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

          // Mostrar toast de nova venda
          toast.success(notification.title, {
            description: notification.message,
            duration: 8000,
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
