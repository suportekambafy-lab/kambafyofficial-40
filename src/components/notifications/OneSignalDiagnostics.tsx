import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiagnosticStatus {
  label: string;
  status: 'success' | 'error' | 'warning';
  details?: string;
}

export function OneSignalDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: DiagnosticStatus[] = [];

    // 1. Check environment
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    results.push({
      label: 'Ambiente Detectado',
      status: isNative ? 'success' : 'warning',
      details: `${platform} (${isNative ? 'Native' : 'Web'})`
    });

    // 2. Check OneSignal plugin
    const hasPlugin = !!(window as any).plugins?.OneSignal;
    results.push({
      label: 'OneSignal Plugin',
      status: hasPlugin ? 'success' : 'error',
      details: hasPlugin ? 'Disponível' : 'Não encontrado'
    });

    // 3. Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    results.push({
      label: 'Autenticação',
      status: user ? 'success' : 'error',
      details: user ? `User ID: ${user.id.slice(0, 8)}...` : 'Não autenticado'
    });

    // 4. Check Player ID in Supabase
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('user_id', user.id)
        .single();

      results.push({
        label: 'Player ID no Supabase',
        status: profile?.onesignal_player_id ? 'success' : 'error',
        details: profile?.onesignal_player_id 
          ? `${profile.onesignal_player_id.slice(0, 8)}...` 
          : 'Não salvo'
      });

      // 5. Check recent sync logs
      const { data: logs, count } = await supabase
        .from('onesignal_sync_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const successCount = logs?.filter(l => l.status === 'success').length || 0;
      const errorCount = logs?.filter(l => l.status === 'error').length || 0;

      results.push({
        label: 'Logs de Sincronização',
        status: successCount > 0 ? 'success' : errorCount > 0 ? 'error' : 'warning',
        details: `${count || 0} tentativas (${successCount} ✓, ${errorCount} ✗)`
      });
    }

    // 6. Check notification permission (web only)
    if (!isNative && 'Notification' in window) {
      const permission = Notification.permission;
      results.push({
        label: 'Permissão de Notificação',
        status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
        details: permission
      });
    }

    setDiagnostics(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getIcon = (status: DiagnosticStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticStatus['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'outline'
    } as const;

    const labels = {
      success: 'OK',
      error: 'Erro',
      warning: 'Atenção'
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Diagnóstico OneSignal</CardTitle>
            <CardDescription>
              Status detalhado da integração de notificações push
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runDiagnostics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {diagnostics.map((diagnostic, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getIcon(diagnostic.status)}
                <div>
                  <p className="font-medium">{diagnostic.label}</p>
                  {diagnostic.details && (
                    <p className="text-sm text-muted-foreground">
                      {diagnostic.details}
                    </p>
                  )}
                </div>
              </div>
              {getStatusBadge(diagnostic.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
