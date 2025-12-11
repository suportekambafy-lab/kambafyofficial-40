import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User, ChevronDown, Menu, X, LogOut, Settings, BookOpen, Home, PlayCircle, Users, MessageCircle, Megaphone, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import kambafyLogo from '@/assets/kambafy-logo-gray.png';

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

interface NetflixHeaderProps {
  logoUrl?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  memberAreaId?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onNotificationClick?: (notification: MemberNotification) => void;
  activeTab?: 'home' | 'courses' | 'community';
}

export function NetflixHeader({
  logoUrl,
  userName,
  userEmail,
  userAvatar,
  memberAreaId,
  onSearch,
  onLogout,
  onProfileClick,
  onNotificationClick,
  activeTab = 'home',
}: NetflixHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userEmail) return;
    
    try {
      let query = supabase
        .from('member_area_notifications')
        .select('*')
        .eq('student_email', userEmail)
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
      setLoadingNotifications(false);
    }
  };

  // Mark as read
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

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      let query = supabase
        .from('member_area_notifications')
        .update({ read: true })
        .eq('student_email', userEmail || '')
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

  // Remove notification
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

  // Load notifications
  useEffect(() => {
    if (userEmail) {
      fetchNotifications();
    }
  }, [userEmail, memberAreaId]);

  // Setup realtime
  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase
      .channel('netflix-header-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'member_area_notifications',
          filter: `student_email=eq.${userEmail}`
        },
        (payload) => {
          const newNotification = payload.new as MemberNotification;
          
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
  }, [userEmail, memberAreaId]);

  // Icon by type
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
        return <Bell className="w-4 h-4 text-stone-400" />;
    }
  };

  // Format date
  const formatNotificationDate = (dateString: string) => {
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

  const handleNotificationItemClick = (notification: MemberNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsNotificationsOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'modules', label: 'Módulos', icon: PlayCircle },
    { id: 'offers', label: 'Ofertas', icon: Users },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'modules') {
      const modulesSection = document.getElementById('modules-section');
      if (modulesSection) {
        modulesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (itemId === 'offers') {
      const offersSection = document.getElementById('offers-section');
      if (offersSection) {
        offersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 netflix-header',
        isScrolled && 'scrolled'
      )}
      style={{ background: 'transparent' }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between h-20 md:h-24 px-6 md:px-12 lg:px-16">
        {/* Left: Kambafy Logo */}
        <div className="flex items-center gap-8">
          <img 
            src={kambafyLogo} 
            alt="Kambafy" 
            className="h-8 md:h-10 w-auto object-contain"
          />

          {/* Desktop Navigation - Netflix Style Pills */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-stone-800/60 backdrop-blur-xl rounded-full p-1.5 border border-amber-900/20">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                    activeTab === item.id
                      ? 'bg-amber-600/30 text-amber-100'
                      : 'text-stone-300 hover:text-amber-100'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Right: Search, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="hidden md:block relative">
            <div className="flex items-center bg-zinc-800/60 backdrop-blur-xl rounded-full px-4 py-2.5 w-[200px] lg:w-[280px] border border-zinc-700/50">
              <Search className="w-4 h-4 text-zinc-400 mr-3" />
              <input
                type="text"
                placeholder="Pesquisar aulas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm placeholder:text-zinc-500 w-full"
              />
            </div>
          </div>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications Popover */}
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full w-10 h-10"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 rounded-full text-[10px] font-bold flex items-center justify-center text-stone-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-80 p-0 bg-stone-900/95 backdrop-blur-xl border border-amber-900/30 rounded-xl shadow-2xl"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-amber-900/20">
                <h3 className="font-semibold text-amber-100">Notificações</h3>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-900/20"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
              </div>

              {/* Notifications List */}
              <ScrollArea className="h-[300px]">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="p-3 rounded-full bg-stone-800/50 mb-3">
                      <Bell className="w-6 h-6 text-stone-500" />
                    </div>
                    <p className="text-stone-400 text-sm">Nenhuma notificação</p>
                    <p className="text-stone-600 text-xs mt-1">
                      Você será notificado sobre novas aulas e respostas do mentor
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-amber-900/10">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationItemClick(notification)}
                        className={cn(
                          "flex items-start gap-3 p-4 cursor-pointer transition-colors group",
                          notification.read 
                            ? "bg-transparent hover:bg-amber-900/10" 
                            : "bg-amber-600/5 hover:bg-amber-600/10"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          notification.read ? "bg-stone-800" : "bg-amber-600/10"
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-sm font-medium line-clamp-1",
                              notification.read ? "text-stone-400" : "text-amber-100"
                            )}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-stone-600 shrink-0">
                              {formatNotificationDate(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={(e) => removeNotification(notification.id, e)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                        >
                          <X className="w-3 h-3 text-stone-500 hover:text-red-400" />
                        </button>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-amber-900/20">
                <Avatar className="w-9 h-9 ring-2 ring-amber-600/40 ring-offset-1 ring-offset-transparent">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-stone-900 text-sm font-semibold">
                    {getInitials(userName, userEmail)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-52 bg-stone-900/95 backdrop-blur-xl border-amber-900/30 text-stone-100 rounded-xl p-1 mt-2"
            >
              <div className="px-3 py-3 border-b border-amber-900/30">
                <p className="font-semibold text-sm text-amber-100">{userName || 'Usuário'}</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">{userEmail}</p>
              </div>
              <DropdownMenuItem 
                onClick={onProfileClick}
                className="cursor-pointer hover:bg-amber-900/20 rounded-lg m-1 text-stone-200"
              >
                <User className="w-4 h-4 mr-3" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-amber-900/20 rounded-lg m-1 text-stone-200">
                <Settings className="w-4 h-4 mr-3" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-amber-900/30 my-1" />
              <DropdownMenuItem 
                onClick={onLogout}
                className="cursor-pointer hover:bg-red-500/20 text-red-400 rounded-lg m-1"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden px-6 pb-4"
        >
          <div className="flex items-center bg-stone-800/60 backdrop-blur-sm rounded-full px-4 py-2 border border-amber-900/20">
            <Search className="w-4 h-4 text-amber-200/50 mr-2" />
            <input
              type="text"
              placeholder="Pesquisar aulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-amber-100 text-sm placeholder:text-stone-400 w-full"
              autoFocus
            />
            <button onClick={() => setIsSearchOpen(false)}>
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-stone-900/95 backdrop-blur-xl border-t border-amber-900/20"
        >
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  handleNavClick(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                  activeTab === item.id
                    ? 'bg-amber-600/20 text-amber-100 font-medium'
                    : 'text-stone-300 hover:bg-amber-900/10'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
