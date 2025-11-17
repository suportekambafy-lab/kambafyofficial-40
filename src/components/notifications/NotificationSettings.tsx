import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOneSignal } from '@/hooks/useOneSignal';

export function NotificationSettings() {
  const { toast } = useToast();
  const { playerId, isInitialized, permissionGranted, updatePlayerId } = useOneSignal();
  const [isReactivating, setIsReactivating] = useState(false);
  const [hasPlayerIdInDb, setHasPlayerIdInDb] = useState<boolean | null>(null);

  useEffect(() => {
    checkPlayerIdInDatabase();
  }, []);

  const checkPlayerIdInDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('user_id', user.id)
        .single();

      setHasPlayerIdInDb(!!profile?.onesignal_player_id);
    } catch (error) {
      console.error('Error checking Player ID:', error);
    }
  };

  const reactivateNotifications = async () => {
    setIsReactivating(true);
    
    try {
      // Tentar atualizar o Player ID
      await updatePlayerId();
      
      // Aguardar um pouco e verificar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkPlayerIdInDatabase();
      
      // Tentar sincronizar via edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.functions.invoke('sync-onesignal-player-ids', {
          body: { user_id: user.id }
        });
        
        if (error) {
          console.error('Error syncing Player ID:', error);
        } else if (data?.player_id) {
          toast({
            title: '✅ Notificações reativadas!',
            description: 'Você receberá alertas de vendas em tempo real.',
          });
          await checkPlayerIdInDatabase();
        }
      }
    } catch (error) {
      console.error('Error reactivating notifications:', error);
      toast({
        title: '❌ Erro ao reativar',
        description: 'Não foi possível reativar as notificações. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const notificationStatus = hasPlayerIdInDb && playerId ? 'active' : 'inactive';

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificações Push</CardTitle>
          </div>
          {notificationStatus === 'active' ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Inativo
            </Badge>
          )}
        </div>
        <CardDescription>
          Receba alertas em tempo real quando fizer uma venda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status da conexão:</span>
            <span className={notificationStatus === 'active' ? 'text-green-500' : 'text-muted-foreground'}>
              {notificationStatus === 'active' ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Permissão concedida:</span>
            <span className={permissionGranted ? 'text-green-500' : 'text-muted-foreground'}>
              {permissionGranted ? 'Sim' : 'Não'}
            </span>
          </div>
          
          {playerId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Player ID:</span>
              <span className="text-xs font-mono text-muted-foreground">
                {playerId.substring(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {notificationStatus === 'inactive' && (
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-start gap-2">
              <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Notificações desativadas</p>
                <p className="text-xs text-muted-foreground">
                  Você não está recebendo alertas de vendas. Clique no botão abaixo para reativar.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={reactivateNotifications}
              disabled={isReactivating}
              className="w-full"
              variant="default"
            >
              {isReactivating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reativando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Reativar Notificações
                </>
              )}
            </Button>
          </div>
        )}

        {notificationStatus === 'active' && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-500">Tudo funcionando!</p>
                <p className="text-xs text-muted-foreground">
                  Você receberá uma notificação sempre que fizer uma venda.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}