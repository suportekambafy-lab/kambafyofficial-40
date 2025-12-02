import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/productionLogger';
import { Capacitor } from '@capacitor/core';

interface Notification {
  id: string;
  type: 'sale' | 'withdrawal' | 'system' | 'affiliate';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Buscar notificações do banco de dados
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Converter para o formato do contexto
      const formattedNotifications: Notification[] = (data || []).map(n => ({
        id: n.id,
        type: n.type === 'payment_approved' || n.type === 'new_sale' ? 'sale' : 
              n.type === 'withdrawal_processed' ? 'withdrawal' : 
              n.type === 'affiliate_commission' ? 'affiliate' : 'system',
        title: n.title,
        message: n.message,
        timestamp: new Date(n.created_at),
        read: n.read || false,
        data: { order_id: n.order_id, amount: n.amount, currency: n.currency }
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar notificações quando o usuário logar
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Adicionar notificação (para compatibilidade - recarrega do banco)
  const addNotification = async (_notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // As notificações agora são criadas pelo backend (webhooks)
    // Esta função apenas recarrega as notificações do banco
    await fetchNotifications();
  };

  // Marcar como lida
  const markAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    // Atualizar no banco
    try {
      await supabase
        .from('seller_notifications')
        .update({ read: true })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user) return;
    
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    // Atualizar no banco
    try {
      await supabase
        .from('seller_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Remover notificação
  const clearNotification = async (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // Remover do banco
    try {
      await supabase
        .from('seller_notifications')
        .delete()
        .eq('id', id);
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  // Calcular não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Setup real-time listeners
  useEffect(() => {
    if (!user) return;

    logger.info('Setting up real-time notifications', { 
      component: 'NotificationProvider', 
      data: { userId: user.id } 
    });

    // Listen for new seller_notifications
    const notificationsChannel = supabase
      .channel('seller-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('New seller notification received', { 
            component: 'NotificationProvider', 
            data: payload.new 
          });

          const n = payload.new as any;
          const newNotification: Notification = {
            id: n.id,
            type: n.type === 'payment_approved' || n.type === 'new_sale' ? 'sale' : 
                  n.type === 'withdrawal_processed' ? 'withdrawal' : 
                  n.type === 'affiliate_commission' ? 'affiliate' : 'system',
            title: n.title,
            message: n.message,
            timestamp: new Date(n.created_at),
            read: false,
            data: { order_id: n.order_id, amount: n.amount, currency: n.currency }
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

          // Mostrar toast
          toast({
            title: n.title,
            description: n.message,
          });

          // Enviar notificação nativa se estiver em plataforma nativa
          const isNative = Capacitor.isNativePlatform();
          if (isNative) {
            import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: n.title,
                    body: n.message,
                    id: Date.now(),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'default',
                    smallIcon: 'res://drawable/ic_notification',
                    extra: { order_id: n.order_id }
                  }
                ]
              });
            }).catch(err => console.error('Error sending native notification:', err));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, toast]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};