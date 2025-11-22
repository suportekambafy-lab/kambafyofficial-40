import React, { useState, useEffect } from 'react';
import { Bell, X, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'withdrawal' | 'high_value_sale' | 'product_approval' | 'affiliate_request' | 'affiliate_approved';
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    setupRealtimeSubscriptions();
  }, []);

  const loadNotifications = async () => {
    try {
      // Carregar saques pendentes
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(10);

      // Carregar vendas de alto valor (últimas 24h, acima de 50.000 KZ)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: highValueSales } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed')
        .neq('payment_method', 'member_access')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      const notifications: Notification[] = [];

      // Adicionar notificações de saques
      withdrawals?.forEach(withdrawal => {
        notifications.push({
          id: `withdrawal-${withdrawal.id}`,
          type: 'withdrawal',
          title: 'Novo Saque Pendente',
          message: `Solicitação de saque no valor de ${Number(withdrawal.amount).toLocaleString('pt-AO')} KZ`,
          amount: Number(withdrawal.amount),
          timestamp: withdrawal.created_at,
          read: false,
          actionUrl: '/admin/withdrawals'
        });
      });

      // Adicionar notificações de vendas de alto valor
      highValueSales?.forEach(sale => {
        const amount = parseFloat(sale.amount || '0');
        if (amount >= 50000) {
          notifications.push({
            id: `sale-${sale.id}`,
            type: 'high_value_sale',
            title: 'Venda de Alto Valor! 🎉',
            message: `Venda de ${formatPriceForSeller(amount, sale.currency)} por ${sale.customer_name}`,
            amount,
            timestamp: sale.created_at,
            read: false
          });
        }
      });

      // Carregar produtos aguardando aprovação
      const { data: pendingProducts } = await supabase
        .from('products')
        .select('*')
        .eq('admin_approved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      pendingProducts?.forEach(product => {
        notifications.push({
          id: `product-${product.id}`,
          type: 'product_approval',
          title: 'Produto Aguardando Aprovação',
          message: `"${product.name}" precisa ser aprovado`,
          timestamp: product.created_at,
          read: false,
          actionUrl: '/admin/products'
        });
      });

      // Carregar solicitações de afiliação pendentes
      const { data: affiliateRequests } = await supabase
        .from('affiliates')
        .select('*, products(name)')
        .eq('status', 'pendente')
        .order('requested_at', { ascending: false })
        .limit(10);

      affiliateRequests?.forEach(request => {
        notifications.push({
          id: `affiliate-${request.id}`,
          type: 'affiliate_request',
          title: 'Nova Solicitação de Afiliação',
          message: `${request.affiliate_name} quer ser afiliado de "${request.products?.name}"`,
          timestamp: request.requested_at,
          read: false,
          actionUrl: '/dashboard/afiliados'
        });
      });

      // Ordenar por timestamp
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Escutar novos saques
    const withdrawalChannel = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'withdrawal_requests'
      }, (payload) => {
        const newWithdrawal = payload.new as any;
        const notification: Notification = {
          id: `withdrawal-${newWithdrawal.id}`,
          type: 'withdrawal',
          title: 'Novo Saque Pendente',
          message: `Solicitação de saque no valor de ${Number(newWithdrawal.amount).toLocaleString('pt-AO')} KZ`,
          amount: Number(newWithdrawal.amount),
          timestamp: newWithdrawal.created_at,
          read: false,
          actionUrl: '/admin/withdrawals'
        };

        setNotifications(prev => [notification, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: "💰 Novo Saque Pendente",
          description: `Valor: ${Number(newWithdrawal.amount).toLocaleString('pt-AO')} KZ`,
        });
      })
      .subscribe();

    // Escutar novas vendas
    const ordersChannel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        const newOrder = payload.new as any;
        const amount = parseFloat(newOrder.amount || '0');
        
        if (amount >= 50000) {
          const notification: Notification = {
            id: `sale-${newOrder.id}`,
            type: 'high_value_sale',
            title: 'Venda de Alto Valor! 🎉',
            message: `Venda de ${formatPriceForSeller(amount, newOrder.currency)} por ${newOrder.customer_name}`,
            amount,
            timestamp: newOrder.created_at,
            read: false
          };

          setNotifications(prev => [notification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: "🎉 Venda de Alto Valor!",
            description: `${formatPriceForSeller(amount, newOrder.currency)} por ${newOrder.customer_name}`,
          });
        }
      })
      .subscribe();

    // Escutar novas solicitações de afiliação
    const affiliatesChannel = supabase
      .channel('affiliate-requests')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'affiliates'
      }, (payload) => {
        const newAffiliate = payload.new as any;
        const notification: Notification = {
          id: `affiliate-${newAffiliate.id}`,
          type: 'affiliate_request',
          title: 'Nova Solicitação de Afiliação',
          message: `${newAffiliate.affiliate_name} quer ser afiliado`,
          timestamp: newAffiliate.requested_at,
          read: false,
          actionUrl: '/dashboard/afiliados'
        };

        setNotifications(prev => [notification, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: "🤝 Nova Solicitação de Afiliação",
          description: `${newAffiliate.affiliate_name} solicitou afiliação`,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'affiliates'
      }, (payload) => {
        const updatedAffiliate = payload.new as any;
        const oldAffiliate = payload.old as any;
        
        // Notificar afiliado quando status muda para 'ativo'
        if (oldAffiliate.status !== 'ativo' && updatedAffiliate.status === 'ativo') {
          const notification: Notification = {
            id: `affiliate-approved-${updatedAffiliate.id}`,
            type: 'affiliate_approved',
            title: 'Afiliação Aprovada! 🎉',
            message: `Sua solicitação de afiliação foi aprovada`,
            timestamp: updatedAffiliate.updated_at,
            read: false
          };

          setNotifications(prev => [notification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: "🎉 Afiliação Aprovada!",
            description: "Sua solicitação de afiliação foi aprovada",
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(withdrawalChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(affiliatesChannel);
    };
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <DollarSign className="h-4 w-4 text-orange-500" />;
      case 'high_value_sale':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'product_approval':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'affiliate_request':
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      case 'affiliate_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden z-50">
          <Card className="shadow-lg border-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-slate-900">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar como lidas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-slate-50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/admin/logs';
                  }}
                >
                  Ver todas as atividades
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}