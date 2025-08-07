
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { AdminLog } from '@/types/admin';
import { ArrowLeft, Clock, Activity, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminLogWithUser extends AdminLog {
  admin_users?: {
    full_name: string;
    email: string;
  };
}

export default function AdminLogs() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AdminLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) {
      loadLogs();
    }
  }, [admin]);

  const loadLogs = async () => {
    try {
      console.log('Carregando logs administrativos...');
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          *,
          admin_users!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('Resultado dos logs:', { data, error });

      if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; className: string }> = {
      withdrawal_aprovado: { label: 'Saque Aprovado', className: 'bg-green-100 text-green-800 border-green-200' },
      withdrawal_rejeitado: { label: 'Saque Rejeitado', className: 'bg-red-100 text-red-800 border-red-200' },
      product_approved: { label: 'Produto Aprovado', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      product_rejected: { label: 'Produto Rejeitado', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      user_banned: { label: 'Usuário Banido', className: 'bg-red-100 text-red-800 border-red-200' },
      user_unbanned: { label: 'Usuário Desbloqueado', className: 'bg-green-100 text-green-800 border-green-200' }
    };

    const actionInfo = actionMap[action] || { 
      label: action, 
      className: 'bg-gray-100 text-gray-800 border-gray-200' 
    };

    return (
      <Badge className={actionInfo.className}>
        {actionInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando logs administrativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Ações</h1>
            <p className="text-muted-foreground mt-1">Histórico completo de ações administrativas</p>
          </div>
        </div>

        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="shadow-lg border bg-card hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {log.admin_users?.full_name || log.admin_users?.email || 'Administrador'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(log.created_at).toLocaleString('pt-AO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  {getActionBadge(log.action)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-900">Tipo de Alvo:</span>
                    <p className="text-slate-600 capitalize">{log.target_type}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-900">ID do Alvo:</span>
                    <p className="text-slate-600 font-mono text-xs">{log.target_id || 'N/A'}</p>
                  </div>
                  {log.details && (
                    <div className="bg-slate-50 p-3 rounded-lg md:col-span-3">
                      <span className="font-medium text-slate-900">Detalhes:</span>
                      <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {logs.length === 0 && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-16">
                <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum log encontrado</h3>
                <p className="text-slate-600">Não há ações administrativas registradas ainda.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
