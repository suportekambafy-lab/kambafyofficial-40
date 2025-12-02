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
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Carregar notificações do localStorage ao iniciar
    try {
      const saved = localStorage.getItem('app_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Converter timestamps de string para Date
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
    } catch (e) {
      console.error('Error loading notifications from localStorage:', e);
    }
    return [];
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Persistir notificações no localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('app_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Gerar ID único para notificações
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Adicionar notificação
  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Manter últimas 50

    // Mostrar toast para notificações importantes
    if (notification.type === 'sale' || notification.type === 'withdrawal') {
      toast({
        title: notification.title,
        description: notification.message,
      });
    }

    // Enviar notificação nativa se estiver em plataforma nativa
    const isNative = Capacitor.isNativePlatform();
    if (isNative && (notification.type === 'sale' || notification.type === 'withdrawal' || notification.type === 'affiliate')) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        await LocalNotifications.schedule({
          notifications: [
            {
              title: notification.title,
              body: notification.message,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'res://drawable/ic_notification',
              extra: notification.data
            }
          ]
        });
      } catch (error) {
        console.error('Error sending native notification:', error);
      }
    }

    logger.info('New notification added', { 
      component: 'NotificationProvider', 
      data: { type: notification.type, title: notification.title } 
    });
  };

  // Marcar como lida
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Marcar todas como lidas
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Remover notificação
  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
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

    // Listen for new orders (sales) - both INSERT and UPDATE to 'completed'
    const ordersChannel = supabase
      .channel('user-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('New order received', { 
            component: 'NotificationProvider', 
            data: payload.new 
          });

          // Só notificar se for pending (outros status serão notificados no UPDATE)
          if (payload.new.status === 'pending') {
            addNotification({
              type: 'sale',
              title: '🎉 Nova Venda Pendente!',
              message: `Aguardando pagamento de ${payload.new.customer_name || 'cliente'} - ${payload.new.amount} ${payload.new.currency || 'KZ'}`,
              actionUrl: '/vendas',
              data: payload.new
            });
          } else if (payload.new.status === 'completed') {
            // Venda já foi paga imediatamente (ex: Stripe)
            addNotification({
              type: 'sale',
              title: '🎉 Nova Venda Aprovada!',
              message: `Vendeu para ${payload.new.customer_name || 'cliente'} - ${payload.new.amount} ${payload.new.currency || 'KZ'}`,
              actionUrl: '/vendas',
              data: payload.new
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('Order status updated', { 
            component: 'NotificationProvider', 
            data: { old: payload.old, new: payload.new } 
          });

          // Só notificar quando status mudar de pending/processing para completed
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;
          
          if (oldStatus !== 'completed' && newStatus === 'completed') {
            addNotification({
              type: 'sale',
              title: '🎉 Venda Aprovada!',
              message: `Pagamento confirmado de ${payload.new.customer_name || 'cliente'} - ${payload.new.amount} ${payload.new.currency || 'KZ'}`,
              actionUrl: '/vendas',
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    // Listen for withdrawal updates
    const withdrawalsChannel = supabase
      .channel('user-withdrawals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawal_requests',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('Withdrawal status updated', { 
            component: 'NotificationProvider', 
            data: payload.new 
          });

          const status = payload.new.status;
          if (status === 'aprovado') {
            addNotification({
              type: 'withdrawal',
              title: '✅ Saque Aprovado',
              message: `Seu saque de ${payload.new.amount} KZ foi aprovado!`,
              actionUrl: '/financeiro',
              data: payload.new
            });
          } else if (status === 'rejeitado') {
            addNotification({
              type: 'withdrawal',
              title: '❌ Saque Rejeitado',
              message: `Seu saque de ${payload.new.amount} KZ foi rejeitado.`,
              actionUrl: '/financeiro',
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    // Listen for affiliate commissions
    const affiliateChannel = supabase
      .channel('user-affiliate-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `affiliate_code=neq.null`
        },
        async (payload) => {
          // Check if this user is the affiliate for this order
          if (payload.new.affiliate_code) {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('affiliate_user_id')
              .eq('affiliate_code', payload.new.affiliate_code)
              .eq('affiliate_user_id', user.id)
              .single();

            if (affiliate) {
              logger.info('New affiliate commission', { 
                component: 'NotificationProvider', 
                data: payload.new 
              });

              addNotification({
                type: 'affiliate',
                title: '💰 Nova Comissão!',
                message: `Recebeu comissão de ${payload.new.affiliate_commission} KZ`,
                actionUrl: '/meus-afiliados',
                data: payload.new
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(affiliateChannel);
    };
  }, [user]);

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