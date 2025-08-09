import React, { useState } from 'react';
import { Bell, BellRing, X, DollarSign, Package, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSellerNotifications, type SellerNotification } from '@/hooks/useSellerNotifications';
import { Link } from 'react-router-dom';

export function SellerNotificationCenter({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useSellerNotifications();

  const getNotificationIcon = (type: SellerNotification['type']) => {
    switch (type) {
      case 'sale':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'identity':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'product':
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: SellerNotification['type']) => {
    switch (type) {
      case 'sale':
        return 'bg-green-50 border-green-200';
      case 'withdrawal':
        return 'bg-blue-50 border-blue-200';
      case 'identity':
        return 'bg-purple-50 border-purple-200';
      case 'product':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative h-8 w-8 p-0 text-foreground", className)}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notificações</CardTitle>
               {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markAllAsRead();
                  }}
                  className="text-xs h-6 px-2"
                >
                  Marcar todas lidas
                </Button>
              )}
            </div>
            <CardDescription>
              {unreadCount > 0 
                ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Todas as notificações lidas'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-1 p-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "relative rounded-lg border p-3 transition-colors hover:bg-accent/50",
                        getNotificationColor(notification.type),
                        !notification.read && "ring-1 ring-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              {notification.amount && (
                                <p className="text-xs font-medium text-green-600 mt-1">
                                  {notification.amount.toFixed(0)} KZ
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDistanceToNow(new Date(notification.timestamp), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.read && (
                                <div className="h-2 w-2 bg-primary rounded-full"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearNotification(notification.id);
                                }}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {notification.actionUrl && (
                            <Link
                              to={notification.actionUrl}
                              onClick={() => {
                                markAsRead(notification.id);
                                setIsOpen(false); // Fechar o popover
                              }}
                              className="absolute inset-0 rounded-lg"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}