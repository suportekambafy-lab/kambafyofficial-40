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
  const isNative = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && !!window.plugins?.OneSignal);
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
            console.log('📲 [OneSignal Push] Enviando notificação push direta via external_user_id');

            const { data: pushData, error: pushError } = await supabase.functions.invoke('send-onesignal-notification', {
              body: {
                external_user_id: userId,
                title: notification.title,
                message: notification.message,
                data: {
                  type: 'sale',
                  order_id: notification.order_id,
                  amount: notification.amount,
                  currency: notification.currency
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

          // Navegador Web: Também atualizar estado para notificação in-app
          if (!isNative) {
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
