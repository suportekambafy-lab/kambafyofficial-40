import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SellerNotification {
  id: string;
  type: 'sale' | 'withdrawal' | 'identity' | 'product' | 'general';
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function useSellerNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      // Buscar notificações lidas pelo usuário
      const { data: readNotifications } = await supabase
        .from('read_notifications')
        .select('notification_id')
        .eq('user_id', user.id);

      const readNotificationIds = new Set(readNotifications?.map(n => n.notification_id) || []);

      // Criar notificações baseadas nos dados do vendedor
      const notificationPromises = [
        // Verificar novas vendas
        checkNewSales(),
        // Verificar status de saques
        checkWithdrawalStatus(),
        // Verificar status de verificação de identidade
        checkIdentityVerification(),
        // Verificar produtos aprovados/rejeitados
        checkProductStatus(),
        // Verificar tarefas de configuração inicial
        checkOnboardingTasks(),
      ];

      const results = await Promise.all(notificationPromises);
      const allNotifications = results.flat().filter(Boolean);

      // Marcar notificações como lidas baseado na base de dados
      // Mas manter visíveis as notificações críticas até serem resolvidas
      const notificationsWithReadStatus = allNotifications.map(notification => {
        const isRead = readNotificationIds.has(notification.id);
        
        // Notificações críticas que devem permanecer visíveis até serem resolvidas
        const criticalNotifications = ['setup-profile', 'setup-iban', 'setup-identity'];
        const isCritical = criticalNotifications.includes(notification.id);
        
        return {
          ...notification,
          read: isCritical ? false : isRead // Notificações críticas sempre aparecem como não lidas
        };
      });

      setNotifications(notificationsWithReadStatus);
      setUnreadCount(notificationsWithReadStatus.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNewSales = async (): Promise<SellerNotification[]> => {
    try {
      const { data: recentSales } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24h
        .order('created_at', { ascending: false });

      return (recentSales || []).map(sale => ({
        id: `sale-${sale.id}`,
        type: 'sale' as const,
        title: 'Nova Venda! 🎉',
        message: `Você vendeu para ${sale.customer_name}`,
        amount: parseFloat(sale.amount?.toString() || '0'),
        timestamp: sale.created_at,
        read: false,
        actionUrl: '/vendedor/vendas'
      }));
    } catch (error) {
      console.error('Erro ao verificar vendas:', error);
      return [];
    }
  };

  const checkOnboardingTasks = async (): Promise<SellerNotification[]> => {
    try {
      const notifications: SellerNotification[] = [];
      
      // Verificar se tem perfil configurado
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, iban')
        .eq('user_id', user?.id)
        .single();

      // Verificar verificação de identidade
      const { data: verification } = await supabase
        .from('identity_verification')
        .select('status')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Verificar se tem produtos
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user?.id);

      // Notificação para configurar perfil
      if (!profile?.full_name) {
        notifications.push({
          id: 'setup-profile',
          type: 'general',
          title: 'Complete seu Perfil 👤',
          message: 'Adicione seu nome completo para personalizar sua conta',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/vendedor/configuracoes'
        });
      }

      // Notificação para configurar IBAN
      if (!profile?.iban) {
        notifications.push({
          id: 'setup-iban',
          type: 'general',
          title: 'Configure seu IBAN 💳',
          message: 'Adicione seus dados bancários para receber pagamentos',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/vendedor/financeiro'
        });
      }

      // Notificação para verificar identidade (só aparece se IBAN já estiver configurado)
      if (profile?.iban && (!verification || verification.status === 'pendente' || !verification.status)) {
        notifications.push({
          id: 'setup-identity',
          type: 'identity',
          title: 'Verifique sua Identidade 🛡️',
          message: 'Complete a verificação de identidade para poder sacar seus ganhos',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/identidade'
        });
      }

      // Notificação para adicionar primeiro produto
      if (!products || products.length === 0) {
        notifications.push({
          id: 'add-product',
          type: 'general',
          title: 'Adicione seu Primeiro Produto 📦',
          message: 'Comece a vender adicionando um produto à sua loja',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/vendedor/produtos'
        });
      }

      return notifications;
    } catch (error) {
      console.error('Erro ao verificar tarefas de configuração:', error);
      return [];
    }
  };

  const checkWithdrawalStatus = async (): Promise<SellerNotification[]> => {
    try {
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['aprovado', 'rejeitado'])
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // última semana
        .order('updated_at', { ascending: false });

      return (withdrawals || []).map(withdrawal => ({
        id: `withdrawal-${withdrawal.id}`,
        type: 'withdrawal' as const,
        title: withdrawal.status === 'aprovado' ? 'Saque Aprovado! 💰' : 'Saque Rejeitado ❌',
        message: withdrawal.status === 'aprovado' 
          ? `Seu saque foi aprovado`
          : `Seu saque foi rejeitado. ${withdrawal.admin_notes || 'Entre em contato com o suporte.'}`,
        amount: parseFloat(withdrawal.amount?.toString() || '0'),
        timestamp: withdrawal.updated_at,
        read: false,
        actionUrl: '/vendedor/financeiro'
      }));
    } catch (error) {
      console.error('Erro ao verificar saques:', error);
      return [];
    }
  };

  const checkIdentityVerification = async (): Promise<SellerNotification[]> => {
    try {
      const { data: verification } = await supabase
        .from('identity_verification')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!verification) return [];

      const notifications: SellerNotification[] = [];

      if (verification.status === 'aprovado' && verification.updated_at) {
        // Verificar se foi aprovado recentemente (últimos 7 dias)
        const updatedDate = new Date(verification.updated_at);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (updatedDate > sevenDaysAgo) {
          notifications.push({
            id: `identity-approved-${verification.id}`,
            type: 'identity',
            title: 'Identidade Verificada! ✅',
            message: 'Sua identidade foi aprovada. Agora você pode sacar seus ganhos!',
            timestamp: verification.updated_at,
            read: false,
            actionUrl: '/vendedor/financeiro'
          });
        }
      } else if (verification.status === 'rejeitado' && verification.updated_at) {
        // Verificar se foi rejeitado recentemente
        const updatedDate = new Date(verification.updated_at);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (updatedDate > sevenDaysAgo) {
          notifications.push({
            id: `identity-rejected-${verification.id}`,
            type: 'identity',
            title: 'Verificação de Identidade Rejeitada ❌',
            message: `Sua verificação foi rejeitada. ${verification.rejection_reason || 'Envie novos documentos.'}`,
            timestamp: verification.updated_at,
            read: false,
          actionUrl: '/identidade'
          });
        }
      }

      return notifications;
    } catch (error) {
      console.error('Erro ao verificar identidade:', error);
      return [];
    }
  };

  const checkProductStatus = async (): Promise<SellerNotification[]> => {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // última semana
        .order('updated_at', { ascending: false });

      return (products || []).flatMap(product => {
        const notifications: SellerNotification[] = [];

        if (product.status === 'Banido' && product.ban_reason) {
          notifications.push({
            id: `product-banned-${product.id}`,
            type: 'product',
            title: 'Produto Banido ⚠️',
            message: `Seu produto "${product.name}" foi banido. Motivo: ${product.ban_reason}`,
            timestamp: product.updated_at,
            read: false,
            actionUrl: '/vendedor/produtos'
          });
        } else if (product.admin_approved && product.status === 'Ativo') {
          notifications.push({
            id: `product-approved-${product.id}`,
            type: 'product',
            title: 'Produto Aprovado! ✅',
            message: `Seu produto "${product.name}" foi aprovado e está ativo`,
            timestamp: product.updated_at,
            read: false,
            actionUrl: '/vendedor/produtos'
          });
        }

        return notifications;
      });
    } catch (error) {
      console.error('Erro ao verificar produtos:', error);
      return [];
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      // Persistir no banco de dados
      await supabase
        .from('read_notifications')
        .upsert({ 
          user_id: user.id, 
          notification_id: notificationId 
        });

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
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length > 0) {
        // Persistir todas como lidas no banco de dados
        const readNotificationRecords = unreadNotifications.map(n => ({
          user_id: user.id,
          notification_id: n.id
        }));

        await supabase
          .from('read_notifications')
          .upsert(readNotificationRecords);
      }

      // Atualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      const filtered = prev.filter(n => n.id !== notificationId);
      
      if (notification && !notification.read) {
        setUnreadCount(currentCount => Math.max(0, currentCount - 1));
      }
      
      return filtered;
    });
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // ✅ WebSocket: Escutar mudanças em tempo real nas tabelas relevantes
      console.log('🔔 [Seller Notifications] Conectando ao realtime...');
      
      const ordersChannel = supabase
        .channel(`seller_orders_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('🔔 [Seller Notifications] Nova venda detectada');
            loadNotifications();
          }
        )
        .subscribe();

      const withdrawalsChannel = supabase
        .channel(`seller_withdrawals_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'withdrawal_requests',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('🔔 [Seller Notifications] Mudança em saque detectada');
            loadNotifications();
          }
        )
        .subscribe();
      
      return () => {
        console.log('🔔 [Seller Notifications] Desconectando...');
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(withdrawalsChannel);
      };
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refreshNotifications: loadNotifications
  };
}