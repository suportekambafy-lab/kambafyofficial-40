import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para escutar notificações de vendas em tempo real
 * Quando detecta uma nova venda, dispara notificação push via OneSignal
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

          // Buscar player_id do perfil do vendedor
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onesignal_player_id')
              .eq('user_id', userId)
              .single();

            if (profile?.onesignal_player_id) {
              console.log('📤 [OneSignal] Enviando notificação para:', profile.onesignal_player_id);

              // Enviar notificação via OneSignal
              const { data, error } = await supabase.functions.invoke('send-onesignal-notification', {
                body: {
                  player_id: profile.onesignal_player_id,
                  title: notification.title,
                  message: notification.message,
                  data: {
                    type: notification.type,
                    order_id: notification.order_id,
                    amount: notification.amount,
                    currency: notification.currency,
                    navigate_to: '/vendedor/vendas'
                  }
                }
              });

              if (error) {
                console.error('❌ [OneSignal] Erro ao enviar notificação:', error);
              } else {
                console.log('✅ [OneSignal] Notificação enviada com sucesso:', data);
              }
            } else {
              console.warn('⚠️ [OneSignal] Player ID não encontrado no perfil');
            }
          } catch (error) {
            console.error('❌ [OneSignal] Erro ao buscar player ID:', error);
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
