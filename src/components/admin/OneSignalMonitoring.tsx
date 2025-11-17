import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, XCircle, Activity } from 'lucide-react';

interface OneSignalStats {
  total_users: number;
  users_with_player_id: number;
  success_rate: number;
  recent_syncs_count: number;
  failed_syncs_count: number;
}

export function OneSignalMonitoring() {
  const [stats, setStats] = useState<OneSignalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_onesignal_stats');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento OneSignal</CardTitle>
          <CardDescription>Carregando estatísticas...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento OneSignal</CardTitle>
          <CardDescription>Erro ao carregar estatísticas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monitoramento OneSignal
        </CardTitle>
        <CardDescription>
          Estatísticas de sincronização de notificações push (últimas 24h)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Taxa de Sucesso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Taxa de Sucesso</span>
            <span className={`text-2xl font-bold ${getStatusColor(stats.success_rate)}`}>
              {stats.success_rate.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.success_rate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.users_with_player_id} de {stats.total_users} usuários com Player ID configurado
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.recent_syncs_count}</p>
                  <p className="text-xs text-muted-foreground">Sincronizações (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed_syncs_count}</p>
                  <p className="text-xs text-muted-foreground">Falhas (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t">
          {stats.success_rate >= 80 ? (
            <Badge variant="default" className="bg-green-500">
              Sistema Operacional
            </Badge>
          ) : stats.success_rate >= 50 ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
              Atenção Necessária
            </Badge>
          ) : (
            <Badge variant="destructive">
              Ação Urgente Necessária
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
