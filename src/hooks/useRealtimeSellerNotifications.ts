import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar notificações de vendas em tempo real
 * Envia notificações push via OneSignal automaticamente
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
        async (payload) => {
          console.log('🎉 [Seller Notifications] Nova venda detectada:', payload);
          
          const notification = payload.new as {
            type: string;
            title: string;
            message: string;
            order_id: string | null;
            amount: number | null;
            currency: string | null;
          };

          console.log('📱 [Push] Notificação recebida:', {
            title: notification.title,
            message: notification.message,
            order_id: notification.order_id,
            amount: notification.amount,
            currency: notification.currency
          });

          // Enviar Custom Event para OneSignal Journey (Native e Web)
          try {
            console.log('📤 [OneSignal Custom Event] Enviando evento new_sale');

            const { data, error } = await supabase.functions.invoke('send-onesignal-custom-event', {
              body: {
                external_id: userId,
                event_name: 'new_sale',
                properties: {
                  order_id: notification.order_id || 'N/A',
                  amount: notification.amount || 0,
                  currency: notification.currency || 'KZ',
                  title: notification.title,
                  message: notification.message
                }
              }
            });

            if (error) {
              console.error('❌ [OneSignal Custom Event] Erro ao enviar:', error);
            } else {
              console.log('✅ [OneSignal Custom Event] Enviado com sucesso:', data);
            }
          } catch (error) {
            console.error('❌ [OneSignal Custom Event] Erro:', error);
          }

          // Enviar notificação push DIRETA via OneSignal usando external_user_id
          try {
            console.log('📲 [OneSignal Push] Preparando notificação push');
            console.log('📲 [OneSignal Push] userId:', userId);

            const { data: pushData, error: pushError } = await supabase.functions.invoke('send-onesignal-notification', {
              body: {
                external_user_id: userId,
                title: notification.title,
                message: notification.message,
                data: {
                  type: 'sale',
                  order_id: notification.order_id,
                  amount: notification.amount,
                  currency: notification.currency,
                  customer_name: (notification as any).customer_name,
                  product_name: (notification as any).product_name,
                  url: '/vendedor#vendas'
                }
              }
            });

            if (pushError) {
              console.error('❌ [OneSignal Push] Erro ao enviar notificação:', pushError);
            } else {
              console.log('✅ [OneSignal Push] Notificação enviada com sucesso:', pushData);
            }
          } catch (error) {
            console.error('❌ [OneSignal Push] Erro:', error);
          }
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
