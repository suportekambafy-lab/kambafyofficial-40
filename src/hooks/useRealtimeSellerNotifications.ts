import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface NotificationData {
  title: string;
  message: string;
  order_id?: string;
  amount?: number;
  currency?: string;
}

/**
 * Hook para escutar notificações de vendas em tempo real
 * Quando detecta uma nova venda:
 * - Em apps nativos: envia notificação push via OneSignal
 * - No navegador web: retorna dados para notificação in-app
 */
export function useRealtimeSellerNotifications(userId: string | undefined) {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const isNative = Capacitor.isNativePlatform();
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

          // App Nativo: Enviar via OneSignal
          if (isNative) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('onesignal_player_id')
                .eq('user_id', userId)
                .single();

              if (profile?.onesignal_player_id) {
                console.log('📤 [OneSignal] Enviando notificação para:', profile.onesignal_player_id);

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
          // Navegador Web: Atualizar estado para notificação in-app
          else {
            console.log('💻 [Web] Mostrando notificação in-app');
            setNotification({
              title: notification.title,
              message: notification.message,
              order_id: notification.order_id || undefined,
              amount: notification.amount || undefined,
              currency: notification.currency || undefined
            });
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
  }, [userId, isNative]);

  const clearNotification = () => {
    setNotification(null);
  };

  return { notification, clearNotification };
}
