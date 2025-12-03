import { useState, useEffect } from 'react';
import { Bell, MessageCircle, BookOpen, Megaphone, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MemberNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: any;
  created_at: string;
  member_area_id: string;
}

interface MemberNotificationBellProps {
  studentEmail: string;
  memberAreaId?: string; // Se fornecido, filtra por área específica
  onNotificationClick?: (notification: MemberNotification) => void;
}

export function MemberNotificationBell({ 
  studentEmail, 
  memberAreaId,
  onNotificationClick 
}: MemberNotificationBellProps) {
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buscar notificações
  const fetchNotifications = async () => {
    if (!studentEmail) return;
    
    try {
      let query = supabase
        .from('member_area_notifications')
        .select('*')
        .eq('student_email', studentEmail)
        .order('created_at', { ascending: false })
        .limit(50);

      if (memberAreaId) {
        query = query.eq('member_area_id', memberAreaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como lida
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('member_area_notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      let query = supabase
        .from('member_area_notifications')
        .update({ read: true })
        .eq('student_email', studentEmail)
        .eq('read', false);

      if (memberAreaId) {
        query = query.eq('member_area_id', memberAreaId);
      }

      await query;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Remover notificação
  const removeNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from('member_area_notifications')
        .delete()
        .eq('id', id);

      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  };

  // Carregar notificações
  useEffect(() => {
    fetchNotifications();
  }, [studentEmail, memberAreaId]);

  // Configurar realtime
  useEffect(() => {
    if (!studentEmail) return;

    const channel = supabase
      .channel('member-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'member_area_notifications',
          filter: `student_email=eq.${studentEmail}`
        },
        (payload) => {
          const newNotification = payload.new as MemberNotification;
          
          // Se tem filtro de área, verificar se pertence
          if (memberAreaId && newNotification.member_area_id !== memberAreaId) {
            return;
          }

          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentEmail, memberAreaId]);

  // Ícone por tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mentor_reply':
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'new_lesson':
        return <BookOpen className="w-4 h-4 text-green-400" />;
      case 'new_module':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleNotificationClick = (notification: MemberNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-zinc-400 hover:text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[#00A651] text-white text-xs font-bold rounded-full animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Notificações</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs text-[#00A651] hover:text-[#00A651] hover:bg-[#00A651]/10"
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Lista de Notificações */}
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="p-3 rounded-full bg-zinc-800/50 mb-3">
                <Bell className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm">Nenhuma notificação</p>
              <p className="text-zinc-600 text-xs mt-1">
                Você será notificado sobre novas aulas e respostas
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer transition-colors group",
                    notification.read 
                      ? "bg-transparent hover:bg-white/5" 
                      : "bg-[#00A651]/5 hover:bg-[#00A651]/10"
                  )}
                >
                  {/* Ícone */}
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    notification.read ? "bg-zinc-800" : "bg-[#00A651]/10"
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm font-medium line-clamp-1",
                        notification.read ? "text-zinc-400" : "text-white"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-zinc-600 shrink-0">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Botão remover */}
                  <button
                    onClick={(e) => removeNotification(notification.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                  >
                    <X className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                  </button>

                  {/* Indicador de não lida */}
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-[#00A651] shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
