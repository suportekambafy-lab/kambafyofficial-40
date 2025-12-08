import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X, Check, AlertTriangle, Wallet, UserCheck, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SellerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  read: boolean;
  created_at: string;
}

interface SmartAlert {
  id: string;
  type: 'identity' | 'banking' | 'address';
  title: string;
  message: string;
  icon: React.ReactNode;
  action: () => void;
  actionLabel: string;
  priority: number;
}

export function SellerNotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  // Detectar se é mobile/app (não apenas tamanho da tela)
  useEffect(() => {
    const checkMobile = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isCapacitor = !!(window as any).Capacitor;
      // Apenas considera mobile se for app ou dispositivo mobile real
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice || isStandalone || isCapacitor);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Buscar alertas inteligentes (verificações pendentes)
  const fetchSmartAlerts = async () => {
    if (!user) return;
    
    try {
      const alerts: SmartAlert[] = [];
      
      // Verificar identidade
      const { data: verification } = await supabase
        .from('identity_verification')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!verification || verification.status !== 'aprovado') {
        alerts.push({
          id: 'identity',
          type: 'identity',
          title: 'Verificação de Identidade',
          message: verification?.status === 'pendente' 
            ? 'Sua verificação está em análise' 
            : 'Complete sua verificação para solicitar saques',
          icon: <UserCheck className="h-4 w-4 text-yellow-600" />,
          action: () => { navigate('/identidade'); setIsOpen(false); },
          actionLabel: verification?.status === 'pendente' ? 'Ver Status' : 'Verificar',
          priority: 1
        });
      }
      
      // Verificar métodos de recebimento (apenas se já está verificado)
      if (verification?.status === 'aprovado') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('withdrawal_methods, iban, account_holder')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const withdrawalMethods = profile?.withdrawal_methods as any[] | null;
        // Verificar se tem métodos novos válidos
        const hasNewMethods = Array.isArray(withdrawalMethods) && 
          withdrawalMethods.some(method => method && typeof method === 'object' && Object.keys(method).length > 0);
        
        // Verificar se tem IBAN antigo configurado
        const hasLegacyIban = !!(profile?.iban && profile.iban.trim() !== '');
        
        // Só mostrar alerta se não tem nenhum método configurado
        if (!hasNewMethods && !hasLegacyIban) {
          alerts.push({
            id: 'banking',
            type: 'banking',
            title: 'Método de Recebimento',
            message: 'Configure como deseja receber seus pagamentos',
            icon: <Wallet className="h-4 w-4 text-orange-600" />,
            action: () => { navigate('/vendedor/financeiro'); setIsOpen(false); },
            actionLabel: 'Configurar',
            priority: 2
          });
        }
      }
      
      // Verificar endereço
      const { data: verificationData } = await supabase
        .from('identity_verification')
        .select('address_street, address_city')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (verification?.status === 'aprovado' && (!verificationData?.address_street || !verificationData?.address_city)) {
        alerts.push({
          id: 'address',
          type: 'address',
          title: 'Endereço Incompleto',
          message: 'Complete seu endereço para receber correspondências',
          icon: <MapPin className="h-4 w-4 text-blue-600" />,
          action: () => { navigate('/identidade'); setIsOpen(false); },
          actionLabel: 'Completar',
          priority: 3
        });
      }
      
      // Ordenar por prioridade
      alerts.sort((a, b) => a.priority - b.priority);
      setSmartAlerts(alerts);
    } catch (error) {
      console.error('❌ Erro ao buscar alertas inteligentes:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const regularUnread = data?.filter(n => !n.read).length || 0;
      setUnreadCount(regularUnread);
    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Erro ao marcar como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      
      toast({
        title: "Notificações marcadas como lidas",
        description: "Todas as notificações foram marcadas como lidas."
      });
    } catch (error) {
      console.error('❌ Erro ao marcar todas como lidas:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSmartAlerts();

    // Real-time subscription
    const channel = supabase
      .channel('seller-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_notifications'
        },
        (payload) => {
          console.log('📬 Nova notificação recebida:', payload);
          const newNotification = payload.new as SellerNotification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast para nova notificação
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'payment_approved' ? 'default' : 'default'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'EUR') {
      return `€${amount.toFixed(2)}`;
    } else if (currency === 'MZN') {
      return `${amount.toLocaleString()} MT`;
    }
    return `${amount.toLocaleString()} KZ`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_approved':
        return '✓';
      case 'new_sale':
        return '💰';
      case 'withdrawal_processed':
        return '🏦';
      default:
        return '📢';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Total de alertas (smart alerts + notificações não lidas)
  const totalAlerts = smartAlerts.length + unreadCount;

  // Conteúdo das notificações (reutilizado no Card e no Drawer)
  const notificationContent = (
    <>
      {/* Smart Alerts - Alertas Inteligentes */}
      {smartAlerts.length > 0 && (
        <div className="border-b border-border">
          <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Ações Pendentes
            </p>
          </div>
          {smartAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 border-b border-border bg-yellow-50/50 dark:bg-yellow-950/10 hover:bg-yellow-100/50 dark:hover:bg-yellow-950/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5">
                  {alert.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {alert.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alert.message}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-primary"
                    onClick={alert.action}
                  >
                    {alert.actionLabel} →
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notificações Regulares */}
      {loading ? (
        <div className="p-4 text-center text-muted-foreground">
          Carregando notificações...
        </div>
      ) : notifications.length === 0 && smartAlerts.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          Nenhuma notificação
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Nenhuma notificação de vendas ainda
        </div>
      ) : (
        <ScrollArea className="h-80">
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                  !notification.read ? 'bg-muted border-l-4 border-l-accent' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.amount && (
                      <p className="text-sm font-medium text-foreground mt-1">
                        {formatAmount(notification.amount, notification.currency || 'KZ')}
                      </p>
                    )}
                    {notification.order_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pedido: #{notification.order_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5 text-foreground dark:text-white" />
        {totalAlerts > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </Badge>
        )}
      </Button>

      {/* Desktop: Dropdown Card */}
      {!isMobile && isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)]">
          <Card className="w-full sm:w-96 min-w-[320px] shadow-lg bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notificações</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notificationContent}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile: Drawer Full Screen */}
      {isMobile && (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerHeader>
              <div className="flex items-center justify-between">
                <DrawerTitle>Notificações</DrawerTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
              </div>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-hidden">
              {notificationContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}