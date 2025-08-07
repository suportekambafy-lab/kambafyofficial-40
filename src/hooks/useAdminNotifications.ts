import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminNotification {
  id: string;
  type: 'withdrawal_request' | 'identity_verification' | 'new_product';
  title: string;
  message: string;
  entity_id?: string;
  entity_type?: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const { data: adminNotifications, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao carregar notificações do admin:', error);
        return;
      }

      setNotifications((adminNotifications || []) as AdminNotification[]);
      setUnreadCount((adminNotifications || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return;
      }

      // Atualizar estado local
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
        const newUnreadCount = updated.filter(n => !n.read).length;
        setUnreadCount(newUnreadCount);
        return updated;
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length > 0) {
        const { error } = await supabase
          .from('admin_notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .in('id', unreadNotifications.map(n => n.id));

        if (error) {
          console.error('Erro ao marcar todas como lidas:', error);
          return;
        }
      }

      // Atualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao deletar notificação:', error);
        return;
      }

      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        const filtered = prev.filter(n => n.id !== notificationId);
        
        if (notification && !notification.read) {
          setUnreadCount(currentCount => Math.max(0, currentCount - 1));
        }
        
        return filtered;
      });
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const getActionUrl = (notification: AdminNotification): string => {
    switch (notification.type) {
      case 'withdrawal_request':
        return '/admin/saques';
      case 'identity_verification':
        return '/admin/verificacao-identidade';
      case 'new_product':
        return '/admin/produtos';
      default:
        return '/admin';
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Configurar atualização automática a cada 2 minutos para admin
    const interval = setInterval(loadNotifications, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    getActionUrl,
    refreshNotifications: loadNotifications
  };
}